import type { z } from 'zod';
import { apiConfig } from './config';

export interface ApiErrorOptions {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  isNetwork?: boolean;
  isTimeout?: boolean;
  cause?: unknown;
}

/** Typed API failure returned across all HTTP, upload, and download helpers. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;
  readonly isNetwork: boolean;
  readonly isTimeout: boolean;
  readonly cause?: unknown;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
    this.isNetwork = Boolean(options.isNetwork);
    this.isTimeout = Boolean(options.isTimeout);
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export const SESSION_EXPIRED_EVENT = 'eduhub:session-expired';
export const NETWORK_ISSUE_EVENT = 'eduhub:network-issue';

export function dispatchSessionExpired(): void {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

export function onSessionExpired(handler: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => {
    window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  };
}

export function dispatchNetworkIssue(offline: boolean): void {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent<boolean>(NETWORK_ISSUE_EVENT, { detail: offline }));
}

export function onNetworkIssue(handler: (offline: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<boolean>;
    handler(Boolean(customEvent.detail));
  };
  window.addEventListener(NETWORK_ISSUE_EVENT, listener);
  return () => {
    window.removeEventListener(NETWORK_ISSUE_EVENT, listener);
  };
}

export function isNotFoundError(error: unknown): boolean {
  return isApiError(error) && error.status === 404;
}

export function isForbiddenError(error: unknown): boolean {
  return isApiError(error) && error.status === 403;
}

export function isNetworkError(error: unknown): boolean {
  return isApiError(error) && (error.isNetwork || error.isTimeout);
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (isApiError(error)) {
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export interface SchemaValidationReport {
  endpoint: string;
  method: string;
  issues: Array<{ path: string; message: string }>;
}

export type SchemaErrorReporter = (report: SchemaValidationReport) => void;

let productionReporter: SchemaErrorReporter = () => {
  // Default no-op sink; real error telemetry (e.g. Sentry) plugs in here in production.
};

export function setSchemaErrorReporter(reporter: SchemaErrorReporter): void {
  productionReporter = reporter;
}

/**
 * Reports response schema mismatches:
 * - In development: logs a human-readable error with endpoint & field path.
 * - In production: forwards telemetry quietly without polluting user console.
 */
export function handleSchemaValidationFailure(
  method: string,
  endpoint: string,
  zodError: z.core.$ZodError
): ApiError {
  const formattedIssues = zodError.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join('.') : '<root>',
    message: issue.message,
  }));

  const first = formattedIssues[0];
  const summary = first
    ? `${method} ${endpoint} failed response validation at "${first.path}": ${first.message}`
    : `${method} ${endpoint} failed response validation.`;

  if (apiConfig.isDev) {
    console.error(`[API Contract Mismatch] ${summary}`, formattedIssues);
  } else {
    productionReporter({ endpoint, method, issues: formattedIssues });
  }

  const fieldErrors: Record<string, string[]> = {};
  for (const item of formattedIssues) {
    if (!fieldErrors[item.path]) {
      fieldErrors[item.path] = [];
    }
    fieldErrors[item.path].push(item.message);
  }

  return new ApiError({
    status: 500,
    code: 'SCHEMA_VALIDATION_ERROR',
    message: summary,
    fieldErrors,
  });
}
