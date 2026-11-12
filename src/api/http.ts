import type { z } from 'zod';
import { apiConfig, resolveApiPath } from './config';
import { RefreshTokenResponseSchema, ApiErrorResponseSchema } from './dto';
import {
  ApiError,
  dispatchSessionExpired,
  handleSchemaValidationFailure,
  isApiError,
} from './errors';
import { tokenStore } from './tokenStore';

export type QueryPrimitive = string | number | boolean;
export type QueryParamValue =
  | QueryPrimitive
  | readonly QueryPrimitive[]
  | null
  | undefined;
export type QueryParams = Record<string, QueryParamValue>;

export interface RequestOptions<TOutput> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
  schema: z.ZodType<TOutput>;
  signal?: AbortSignal;
  timeoutMs?: number;
  skipAuth?: boolean;
  retryDelayMs?: number;
}

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadOptions<TOutput> {
  query?: QueryParams;
  headers?: Record<string, string>;
  schema: z.ZodType<TOutput>;
  signal?: AbortSignal;
  timeoutMs?: number;
  onProgress?: (progress: UploadProgressEvent) => void;
}

export interface DownloadOptions {
  query?: QueryParams;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface DownloadResult {
  blob: Blob;
  filename: string | null;
  contentType: string;
}

const AUTH_NO_REFRESH_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/oauth/google',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

let activeRefreshPromise: Promise<boolean> | null = null;

/** Serializes query parameters cleanly, omitting nullish or empty values. */
export function buildApiUrl(path: string, query?: QueryParams): string {
  const baseResolved = resolveApiPath(path);
  if (!query) {
    return baseResolved;
  }

  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue;
    }
    if (Array.isArray(rawValue)) {
      for (const item of rawValue) {
        if (item !== undefined && item !== null && item !== '') {
          params.append(key, String(item));
        }
      }
    } else {
      params.set(key, String(rawValue));
    }
  }

  const qs = params.toString();
  if (!qs) {
    return baseResolved;
  }
  const sep = baseResolved.includes('?') ? '&' : '?';
  return `${baseResolved}${sep}${qs}`;
}

function waitMs(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        new ApiError({
          status: 0,
          code: 'ABORTED',
          message: 'Request aborted.',
        })
      );
      return;
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(
        new ApiError({
          status: 0,
          code: 'ABORTED',
          message: 'Request aborted.',
        })
      );
    };
    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function parseErrorFromResponse(res: Response): Promise<ApiError> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const rawJson: unknown = await res.json();
      const parsed = ApiErrorResponseSchema.safeParse(rawJson);
      if (parsed.success) {
        return new ApiError({
          status: res.status,
          code: parsed.data.error.code,
          message: parsed.data.error.message,
          fieldErrors: parsed.data.error.fieldErrors,
        });
      }
    } catch {
      // Fall back to generic status error below.
    }
  }

  return new ApiError({
    status: res.status,
    code: `HTTP_${res.status}`,
    message: res.statusText || `Request failed with status ${res.status}`,
  });
}

function createTimedSignal(
  timeoutMs: number,
  callerSignal?: AbortSignal
): { signal: AbortSignal; didTimeout: () => boolean; cleanup: () => void } {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onCallerAbort = () => {
    controller.abort();
  };

  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort();
    } else {
      callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    },
  };
}

async function performSingleFlightRefresh(): Promise<boolean> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) {
    tokenStore.clear();
    dispatchSessionExpired();
    return false;
  }

  activeRefreshPromise = (async () => {
    const timed = createTimedSignal(apiConfig.timeoutMs);
    try {
      const res = await fetch(resolveApiPath('/auth/refresh'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        signal: timed.signal,
      });

      if (!res.ok) {
        tokenStore.clear();
        dispatchSessionExpired();
        return false;
      }

      const rawJson: unknown = await res.json();
      const parsed = RefreshTokenResponseSchema.safeParse(rawJson);
      if (!parsed.success) {
        tokenStore.clear();
        dispatchSessionExpired();
        return false;
      }

      tokenStore.setTokens({
        accessToken: parsed.data.accessToken,
        refreshToken: parsed.data.refreshToken,
      });
      return true;
    } catch {
      tokenStore.clear();
      dispatchSessionExpired();
      return false;
    } finally {
      timed.cleanup();
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

function shouldAttemptRefresh(path: string, skipAuth?: boolean): boolean {
  if (skipAuth) return false;
  const cleanPath = path.split('?')[0];
  return !AUTH_NO_REFRESH_PATHS.has(cleanPath);
}

interface InternalAttemptFlags {
  retriedGet?: boolean;
  retriedAuth?: boolean;
}

async function executeRequest<TOutput>(
  path: string,
  options: RequestOptions<TOutput>,
  flags: InternalAttemptFlags = {}
): Promise<TOutput> {
  const method = options.method ?? 'GET';
  const url = buildApiUrl(path, options.query);
  const timeoutMs = options.timeoutMs ?? apiConfig.timeoutMs;
  const retryDelayMs = options.retryDelayMs ?? 150;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  let bodyPayload: BodyInit | undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
    bodyPayload = JSON.stringify(options.body);
  }

  if (!options.skipAuth) {
    const accessToken = tokenStore.getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const timed = createTimedSignal(timeoutMs, options.signal);
  let res: Response;

  try {
    res = await fetch(url, {
      method,
      headers,
      body: bodyPayload,
      signal: timed.signal,
    });
  } catch (err) {
    timed.cleanup();
    if (timed.didTimeout()) {
      const timeoutError = new ApiError({
        status: 0,
        code: 'TIMEOUT',
        message: `Request to ${path} timed out after ${timeoutMs}ms.`,
        isTimeout: true,
        cause: err,
      });
      if (method === 'GET' && !flags.retriedGet) {
        await waitMs(retryDelayMs, options.signal);
        return executeRequest(path, options, { ...flags, retriedGet: true });
      }
      throw timeoutError;
    }

    if (options.signal?.aborted) {
      throw new ApiError({
        status: 0,
        code: 'ABORTED',
        message: 'Request aborted.',
        cause: err,
      });
    }

    const networkError = new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: `Network error calling ${path}. Check your connection and try again.`,
      isNetwork: true,
      cause: err,
    });

    if (method === 'GET' && !flags.retriedGet) {
      await waitMs(retryDelayMs, options.signal);
      return executeRequest(path, options, { ...flags, retriedGet: true });
    }
    throw networkError;
  } finally {
    timed.cleanup();
  }

  if (res.status === 401 && shouldAttemptRefresh(path, options.skipAuth)) {
    if (!flags.retriedAuth) {
      const refreshed = await performSingleFlightRefresh();
      if (refreshed) {
        return executeRequest(path, options, { ...flags, retriedAuth: true });
      }
    } else {
      tokenStore.clear();
      dispatchSessionExpired();
    }
    throw await parseErrorFromResponse(res);
  }

  if (res.status >= 500 && method === 'GET' && !flags.retriedGet) {
    await waitMs(retryDelayMs, options.signal);
    return executeRequest(path, options, { ...flags, retriedGet: true });
  }

  if (!res.ok) {
    throw await parseErrorFromResponse(res);
  }

  let rawJson: unknown = undefined;
  if (res.status !== 204) {
    const text = await res.text();
    rawJson = text ? (JSON.parse(text) as unknown) : undefined;
  }

  const parsed = options.schema.safeParse(rawJson);
  if (!parsed.success) {
    throw handleSchemaValidationFailure(method, path, parsed.error);
  }

  return parsed.data;
}

export async function httpRequest<TOutput>(
  path: string,
  options: RequestOptions<TOutput>
): Promise<TOutput> {
  return executeRequest(path, options, {});
}

export const http = {
  get<TOutput>(
    path: string,
    schema: z.ZodType<TOutput>,
    options?: Omit<RequestOptions<TOutput>, 'method' | 'schema' | 'body'>
  ): Promise<TOutput> {
    return httpRequest(path, { ...options, method: 'GET', schema });
  },

  post<TOutput>(
    path: string,
    schema: z.ZodType<TOutput>,
    body?: unknown,
    options?: Omit<RequestOptions<TOutput>, 'method' | 'schema' | 'body'>
  ): Promise<TOutput> {
    return httpRequest(path, { ...options, method: 'POST', schema, body });
  },

  put<TOutput>(
    path: string,
    schema: z.ZodType<TOutput>,
    body?: unknown,
    options?: Omit<RequestOptions<TOutput>, 'method' | 'schema' | 'body'>
  ): Promise<TOutput> {
    return httpRequest(path, { ...options, method: 'PUT', schema, body });
  },

  patch<TOutput>(
    path: string,
    schema: z.ZodType<TOutput>,
    body?: unknown,
    options?: Omit<RequestOptions<TOutput>, 'method' | 'schema' | 'body'>
  ): Promise<TOutput> {
    return httpRequest(path, { ...options, method: 'PATCH', schema, body });
  },

  delete<TOutput>(
    path: string,
    schema: z.ZodType<TOutput>,
    body?: unknown,
    options?: Omit<RequestOptions<TOutput>, 'method' | 'schema' | 'body'>
  ): Promise<TOutput> {
    return httpRequest(path, { ...options, method: 'DELETE', schema, body });
  },
};

function sendXhrUpload<TOutput>(
  path: string,
  formData: FormData,
  options: UploadOptions<TOutput>,
  url: string
): Promise<TOutput> {
  return new Promise<TOutput>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(
        new ApiError({
          status: 0,
          code: 'ABORTED',
          message: 'Upload aborted.',
        })
      );
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.timeout = options.timeoutMs ?? apiConfig.timeoutMs;

    const accessToken = tokenStore.getAccessToken();
    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    }
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        xhr.setRequestHeader(k, v);
      }
    }

    const cleanup = () => {
      options.signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      xhr.abort();
      cleanup();
      reject(
        new ApiError({
          status: 0,
          code: 'ABORTED',
          message: 'Upload aborted.',
        })
      );
    };

    options.signal?.addEventListener('abort', onAbort, { once: true });

    xhr.upload.onprogress = (event) => {
      if (!options.onProgress) return;
      const total = event.lengthComputable && event.total > 0 ? event.total : 0;
      const percent = total > 0 ? Math.min(100, Math.round((event.loaded / total) * 100)) : 0;
      options.onProgress({ loaded: event.loaded, total, percent });
    };

    xhr.ontimeout = () => {
      cleanup();
      reject(
        new ApiError({
          status: 0,
          code: 'TIMEOUT',
          message: `Upload to ${path} timed out.`,
          isTimeout: true,
        })
      );
    };

    xhr.onerror = () => {
      cleanup();
      reject(
        new ApiError({
          status: 0,
          code: 'NETWORK_ERROR',
          message: `Network error uploading to ${path}.`,
          isNetwork: true,
        })
      );
    };

    xhr.onload = () => {
      cleanup();
      let rawJson: unknown = undefined;
      try {
        rawJson = xhr.responseText ? (JSON.parse(xhr.responseText) as unknown) : undefined;
      } catch {
        // Non-JSON response fallback handled below.
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.({ loaded: 1, total: 1, percent: 100 });
        const parsed = options.schema.safeParse(rawJson);
        if (!parsed.success) {
          reject(handleSchemaValidationFailure('POST', path, parsed.error));
          return;
        }
        resolve(parsed.data);
        return;
      }

      const errorEnvelope = ApiErrorResponseSchema.safeParse(rawJson);
      if (errorEnvelope.success) {
        reject(
          new ApiError({
            status: xhr.status,
            code: errorEnvelope.data.error.code,
            message: errorEnvelope.data.error.message,
            fieldErrors: errorEnvelope.data.error.fieldErrors,
          })
        );
        return;
      }

      reject(
        new ApiError({
          status: xhr.status,
          code: `HTTP_${xhr.status}`,
          message: xhr.statusText || `Upload failed with status ${xhr.status}`,
        })
      );
    };

    xhr.send(formData);
  });
}

/** Uploads multipart FormData via XHR so callers receive real progress events and abort support. */
export async function upload<TOutput>(
  path: string,
  formData: FormData,
  options: UploadOptions<TOutput>
): Promise<TOutput> {
  const url = buildApiUrl(path, options.query);
  try {
    return await sendXhrUpload(path, formData, options, url);
  } catch (err) {
    if (isApiError(err) && err.status === 401 && shouldAttemptRefresh(path, false)) {
      const refreshed = await performSingleFlightRefresh();
      if (refreshed) {
        return sendXhrUpload(path, formData, options, url);
      }
    }
    throw err;
  }
}

function extractFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(
    contentDisposition
  );
  return match?.[1] ? decodeURIComponent(match[1].trim()) : null;
}

/** Downloads binary resources (PDF/PNG/files) with Bearer auth and single-flight 401 refresh. */
export async function download(
  path: string,
  options: DownloadOptions = {},
  retriedAuth = false
): Promise<DownloadResult> {
  const url = buildApiUrl(path, options.query);
  const timeoutMs = options.timeoutMs ?? apiConfig.timeoutMs;
  const timed = createTimedSignal(timeoutMs, options.signal);

  const headers: Record<string, string> = {
    ...options.headers,
  };
  const accessToken = tokenStore.getAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers,
      signal: timed.signal,
    });
  } catch (err) {
    timed.cleanup();
    if (timed.didTimeout()) {
      throw new ApiError({
        status: 0,
        code: 'TIMEOUT',
        message: `Download from ${path} timed out.`,
        isTimeout: true,
        cause: err,
      });
    }
    if (options.signal?.aborted) {
      throw new ApiError({
        status: 0,
        code: 'ABORTED',
        message: 'Download aborted.',
        cause: err,
      });
    }
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: `Network error downloading ${path}.`,
      isNetwork: true,
      cause: err,
    });
  } finally {
    timed.cleanup();
  }

  if (res.status === 401 && shouldAttemptRefresh(path, false)) {
    if (!retriedAuth) {
      const refreshed = await performSingleFlightRefresh();
      if (refreshed) {
        return download(path, options, true);
      }
    } else {
      tokenStore.clear();
      dispatchSessionExpired();
    }
    throw await parseErrorFromResponse(res);
  }

  if (!res.ok) {
    throw await parseErrorFromResponse(res);
  }

  const blob = await res.blob();
  return {
    blob,
    filename: extractFilename(res.headers.get('content-disposition')),
    contentType: res.headers.get('content-type') || blob.type || 'application/octet-stream',
  };
}
