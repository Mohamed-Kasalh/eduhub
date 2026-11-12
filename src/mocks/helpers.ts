import { delay, HttpResponse } from 'msw';
import type { z } from 'zod';
import { apiConfig, resolveApiPath } from '../api/config';
import type { AuthenticatedRoleDto, PaginationMetaDto } from '../api/dto';
import { getMockDb, nextDbId, nowUtcIso } from './db';
import type { MockUserRecord } from './seed';

interface DecodedDemoToken {
  sub: string;
  role: AuthenticatedRoleDto;
  sid: string;
  jti: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

const ACCESS_TTL_SECONDS = 900; // 15m
const REFRESH_TTL_SECONDS = 7 * 24 * 3600; // 7d

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    const base64 = padded + '='.repeat(padLen);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeDemoJwt(payload: DecodedDemoToken): string {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(payload));
  const sig = toBase64Url(`eduhub-sig-${payload.sub}-${payload.iat}-${payload.jti}`);
  return `${header}.${body}.${sig}`;
}

export function decodeDemoJwt(token: string): DecodedDemoToken | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const json = fromBase64Url(parts[1]);
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'sub' in parsed &&
      'exp' in parsed &&
      'type' in parsed &&
      'role' in parsed &&
      'sid' in parsed
    ) {
      return parsed as DecodedDemoToken;
    }
    return null;
  } catch {
    return null;
  }
}

/** Issues an access + refresh JWT pair and registers the refresh token in the mock DB. */
export function issueSessionTokens(
  userRecord: MockUserRecord,
  sessionId?: string
): { accessToken: string; refreshToken: string; expiresInSeconds: number } {
  const db = getMockDb();
  const sid = sessionId ?? userRecord.sessions[0]?.id ?? `sess-${Date.now()}`;
  const nowSec = Math.floor(Date.now() / 1000);

  const accessToken = encodeDemoJwt({
    sub: userRecord.user.id,
    role: userRecord.user.role,
    sid,
    jti: nextDbId('tok'),
    type: 'access',
    iat: nowSec,
    exp: nowSec + ACCESS_TTL_SECONDS,
  });

  const refreshToken = encodeDemoJwt({
    sub: userRecord.user.id,
    role: userRecord.user.role,
    sid,
    jti: nextDbId('tok'),
    type: 'refresh',
    iat: nowSec,
    exp: nowSec + REFRESH_TTL_SECONDS,
  });

  db.refreshTokens[refreshToken] = {
    userId: userRecord.user.id,
    sessionId: sid,
    revoked: false,
  };

  userRecord.user.lastLoginAt = nowUtcIso();

  return {
    accessToken,
    refreshToken,
    expiresInSeconds: ACCESS_TTL_SECONDS,
  };
}

/** Resolves a canonical API route path using the configured `VITE_API_BASE_URL`. */
export function apiEndpoint(path: string): string {
  return resolveApiPath(path);
}

/** Simulates realistic network delay in browser dev mode and optional chaos failure rate. */
export async function simulateNetwork(allowFault = true): Promise<Response | null> {
  if (import.meta.env.MODE !== 'test') {
    const jitter = 200 + Math.floor(Math.random() * 320);
    await delay(jitter);
  }

  if (
    allowFault &&
    apiConfig.mockErrorRate > 0 &&
    Math.random() < apiConfig.mockErrorRate
  ) {
    return jsonError(500, 'INTERNAL_ERROR', 'Simulated transient backend failure.');
  }
  return null;
}

export function jsonOk<T>(data: T, status = 200): Response {
  return HttpResponse.json(data as Record<string, unknown>, { status });
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>
): Response {
  return HttpResponse.json(
    {
      error: {
        code,
        message,
        ...(fieldErrors && Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
      },
    },
    { status }
  );
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

export function resolveOptionalAuthUser(request: Request): {
  userRecord: MockUserRecord | null;
  token: string | null;
  error?: Response;
} {
  const token = extractBearerToken(request);
  if (!token) {
    return { userRecord: null, token: null };
  }

  const db = getMockDb();
  if (db.revokedAccessTokens.includes(token)) {
    return {
      userRecord: null,
      token,
      error: jsonError(401, 'UNAUTHORIZED', 'Session token has been revoked.'),
    };
  }

  const decoded = decodeDemoJwt(token);
  if (!decoded || decoded.type !== 'access') {
    return {
      userRecord: null,
      token,
      error: jsonError(401, 'UNAUTHORIZED', 'Invalid access token.'),
    };
  }

  if (decoded.exp * 1000 < Date.now()) {
    return {
      userRecord: null,
      token,
      error: jsonError(401, 'TOKEN_EXPIRED', 'Access token has expired.'),
    };
  }

  const userRecord = db.users[decoded.sub] ?? null;
  if (!userRecord) {
    return {
      userRecord: null,
      token,
      error: jsonError(401, 'UNAUTHORIZED', 'User account no longer exists.'),
    };
  }

  if (userRecord.user.status === 'suspended') {
    return {
      userRecord: null,
      token,
      error: jsonError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended.'),
    };
  }

  return { userRecord, token };
}

export type AuthCheckResult =
  | { ok: true; userRecord: MockUserRecord; token: string }
  | { ok: false; response: Response };

/** Enforces authenticated access and optional RBAC role allow-list. */
export function requireAuth(
  request: Request,
  allowedRoles?: AuthenticatedRoleDto[]
): AuthCheckResult {
  const resolved = resolveOptionalAuthUser(request);
  if (resolved.error) {
    return { ok: false, response: resolved.error };
  }
  if (!resolved.userRecord || !resolved.token) {
    return {
      ok: false,
      response: jsonError(401, 'UNAUTHORIZED', 'Authentication credentials are required.'),
    };
  }
  if (allowedRoles && !allowedRoles.includes(resolved.userRecord.user.role)) {
    return {
      ok: false,
      response: jsonError(
        403,
        'FORBIDDEN',
        'You do not have permission to perform this action.'
      ),
    };
  }
  return { ok: true, userRecord: resolved.userRecord, token: resolved.token };
}

export type JsonParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

/** Parses JSON request payload and validates against a Zod schema, returning 422 fieldErrors on failure. */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<JsonParseResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: jsonError(400, 'BAD_REQUEST', 'Malformed JSON request body.'),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
      if (!fieldErrors[key]) {
        fieldErrors[key] = [];
      }
      fieldErrors[key].push(issue.message);
    }
    return {
      ok: false,
      response: jsonError(
        422,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Validation failed.',
        fieldErrors
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

export function paginate<T>(
  items: readonly T[],
  pageParam: string | null,
  limitParam: string | null,
  defaultLimit = 12
): { data: T[]; meta: PaginationMetaDto } {
  const parsedPage = Number(pageParam);
  const parsedLimit = Number(limitParam);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 100
      ? Math.floor(parsedLimit)
      : defaultLimit;
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const rawPage =
    Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;
  const page = totalPages > 0 ? Math.min(rawPage, totalPages) : 1;
  const offset = (page - 1) * limit;
  return {
    data: items.slice(offset, offset + limit),
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/** Cross-realm representation of a Blob/File extracted from `request.formData()`. */
export interface UploadedBlobLike {
  readonly size: number;
  readonly type: string;
  readonly name?: string;
  text(): Promise<string>;
}

/** Checks whether a `FormData` entry behaves like a Blob/File across jsdom and Node realms. */
export function isUploadedBlobLike(entry: unknown): entry is UploadedBlobLike {
  if (entry === null || typeof entry !== 'object') {
    return false;
  }
  const candidate = entry as Partial<UploadedBlobLike>;
  return (
    typeof candidate.size === 'number' &&
    typeof candidate.type === 'string' &&
    typeof candidate.text === 'function'
  );
}
