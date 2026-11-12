import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { server } from '@/mocks/server';

const REMOTE_BASE_URL = 'https://api.eduhub.example/api/v1';

const PaginatedCourseSummarySchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      status: z.enum(['draft', 'pending_review', 'published', 'rejected']),
    })
  ),
  meta: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
});

const ActionOkSchema = z.object({
  ok: z.boolean(),
  id: z.string(),
});

function readHeader(headers: HeadersInit | undefined, name: string): string | null {
  return new Headers(headers).get(name);
}

describe('Real backend HTTP integration (VITE_USE_MOCK=false)', () => {
  beforeAll(() => {
    // Bypass MSW completely so requests exercise live fetch + configured remote API origin.
    server.close();
  });

  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK', 'false');
    vi.stubEnv('VITE_API_BASE_URL', REMOTE_BASE_URL);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  afterAll(() => {
    server.listen();
  });

  it('targets VITE_API_BASE_URL directly with Bearer auth and parses canonical { data, meta } envelopes', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      expect(url).toBe(`${REMOTE_BASE_URL}/courses?q=typescript&page=2&limit=12`);
      expect(init?.method).toBe('GET');
      expect(readHeader(init?.headers, 'authorization')).toBe('Bearer real-access-token');
      expect(readHeader(init?.headers, 'accept')).toBe('application/json');

      return new Response(
        JSON.stringify({
          data: [{ id: 'course-42', title: 'Typed Systems', status: 'published' }],
          meta: { page: 2, limit: 12, total: 25, totalPages: 3 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const api = await import('@/api');
    expect(api.apiConfig.useMock).toBe(false);
    expect(api.apiConfig.baseUrl).toBe(REMOTE_BASE_URL);

    api.tokenStore.setTokens({
      accessToken: 'real-access-token',
      refreshToken: 'real-refresh-token',
    });

    const result = await api.http.get('/courses', PaginatedCourseSummarySchema, {
      query: { q: 'typescript', page: 2, limit: 12, empty: '' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({ page: 2, limit: 12, total: 25, totalPages: 3 });
  });

  it('parses standard 422 { error: { code, message, fieldErrors } } payloads into ApiError', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      expect(url).toBe(`${REMOTE_BASE_URL}/admin/categories`);
      expect(init?.method).toBe('POST');
      expect(readHeader(init?.headers, 'content-type')).toBe('application/json');

      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Category validation failed.',
            fieldErrors: {
              name: ['Category name already exists.'],
            },
          },
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const api = await import('@/api');
    let caught: unknown;
    try {
      await api.http.post('/admin/categories', ActionOkSchema, { name: 'Frontend' });
    } catch (err) {
      caught = err;
    }

    expect(api.isApiError(caught)).toBe(true);
    if (api.isApiError(caught)) {
      expect(caught.status).toBe(422);
      expect(caught.code).toBe('VALIDATION_ERROR');
      expect(caught.message).toBe('Category validation failed.');
      expect(caught.fieldErrors).toEqual({
        name: ['Category name already exists.'],
      });
    }
  });

  it('retries GET once on 503 while never auto-retrying POST mutations', async () => {
    let getCalls = 0;
    let postCalls = 0;

    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith('/courses/c1') && init?.method === 'GET') {
        getCalls += 1;
        if (getCalls === 1) {
          return new Response(
            JSON.stringify({
              error: { code: 'SERVICE_UNAVAILABLE', message: 'Upstream busy' },
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(JSON.stringify({ ok: true, id: 'c1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      postCalls += 1;
      return new Response(
        JSON.stringify({
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Mutation failed' },
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const api = await import('@/api');
    const getResult = await api.http.get('/courses/c1', ActionOkSchema, { retryDelayMs: 0 });
    expect(getResult).toEqual({ ok: true, id: 'c1' });
    expect(getCalls).toBe(2);

    await expect(
      api.http.post('/courses/c1/enroll', ActionOkSchema, {}, { retryDelayMs: 0 })
    ).rejects.toMatchObject({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
    });
    expect(postCalls).toBe(1);
  });

  it('handles 401 refresh against remote /auth/refresh and clears session when refresh fails', async () => {
    let refreshMode: 'succeed' | 'fail' = 'succeed';
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url === `${REMOTE_BASE_URL}/auth/refresh`) {
        expect(init?.method).toBe('POST');
        if (refreshMode === 'fail') {
          return new Response(
            JSON.stringify({ error: { code: 'INVALID_REFRESH', message: 'Expired' } }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({
            accessToken: 'rotated-access-token',
            refreshToken: 'rotated-refresh-token',
            expiresInSeconds: 900,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (readHeader(init?.headers, 'authorization') === 'Bearer rotated-access-token') {
        return new Response(JSON.stringify({ ok: true, id: 'me-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Expired access token' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const api = await import('@/api');
    const expiredSpy = vi.fn();
    const unsub = api.onSessionExpired(expiredSpy);

    api.tokenStore.setTokens({
      accessToken: 'stale-token',
      refreshToken: 'valid-refresh',
    });

    const refreshedRes = await api.http.get('/me/profile', ActionOkSchema);
    expect(refreshedRes).toEqual({ ok: true, id: 'me-1' });
    expect(api.tokenStore.getAccessToken()).toBe('rotated-access-token');
    expect(expiredSpy).not.toHaveBeenCalled();

    refreshMode = 'fail';
    api.tokenStore.setTokens({
      accessToken: 'expired-again',
      refreshToken: 'dead-refresh',
    });

    await expect(api.http.get('/me/profile', ActionOkSchema)).rejects.toMatchObject({
      status: 401,
    });
    expect(api.tokenStore.getAccessToken()).toBeNull();
    expect(expiredSpy).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('rejects malformed backend JSON payloads with SCHEMA_VALIDATION_ERROR', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ unexpected: 'shape' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const api = await import('@/api');
    const devSpy = vi.spyOn(api.apiConfig, 'isDev', 'get').mockReturnValue(false);
    const schemaErrors: unknown[] = [];
    api.setSchemaErrorReporter((report) => {
      schemaErrors.push(report);
    });

    await expect(api.http.get('/courses', PaginatedCourseSummarySchema)).rejects.toMatchObject({
      code: 'SCHEMA_VALIDATION_ERROR',
    });
    expect(schemaErrors).toHaveLength(1);
    api.setSchemaErrorReporter(() => {});
    devSpy.mockRestore();
  });
});
