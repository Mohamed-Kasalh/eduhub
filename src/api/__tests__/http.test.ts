import { HttpResponse, http as mswHttp } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  apiConfig,
  ApiError,
  buildApiUrl,
  download,
  http,
  isApiError,
  onSessionExpired,
  setSchemaErrorReporter,
  tokenStore,
  upload,
} from '@/api';
import { server } from '@/mocks/server';

const ItemSchema = z.object({
  id: z.string(),
  value: z.number(),
});

describe('HTTP client, auth refresh, retry, timeout, upload & download', () => {
  it('buildApiUrl resolves base path and skips empty/nullish query entries', () => {
    expect(
      buildApiUrl('/courses', {
        q: 'react',
        empty: '',
        nil: null,
        undef: undefined,
        page: 2,
        tags: ['a', 'b'],
      })
    ).toBe('/api/v1/courses?q=react&page=2&tags=a&tags=b');
  });

  it('attaches Authorization Bearer header except when skipAuth is true', async () => {
    const capturedAuthHeaders: Array<string | null> = [];
    server.use(
      mswHttp.get('/api/v1/test-auth-header', ({ request }) => {
        capturedAuthHeaders.push(request.headers.get('authorization'));
        return HttpResponse.json({ id: 'ok', value: 1 });
      })
    );

    tokenStore.setTokens({ accessToken: 'tok-123', refreshToken: 'ref-123' });
    await http.get('/test-auth-header', ItemSchema);
    await http.get('/test-auth-header', ItemSchema, { skipAuth: true });

    expect(capturedAuthHeaders).toEqual(['Bearer tok-123', null]);
  });

  it('performs single-flight 401 refresh across concurrent requests and retries with new token', async () => {
    let refreshCalls = 0;
    server.use(
      mswHttp.get('/api/v1/protected-a', ({ request }) => {
        if (request.headers.get('authorization') === 'Bearer fresh-access') {
          return HttpResponse.json({ id: 'a', value: 1 });
        }
        return HttpResponse.json(
          { error: { code: 'TOKEN_EXPIRED', message: 'Expired' } },
          { status: 401 }
        );
      }),
      mswHttp.get('/api/v1/protected-b', ({ request }) => {
        if (request.headers.get('authorization') === 'Bearer fresh-access') {
          return HttpResponse.json({ id: 'b', value: 2 });
        }
        return HttpResponse.json(
          { error: { code: 'TOKEN_EXPIRED', message: 'Expired' } },
          { status: 401 }
        );
      }),
      mswHttp.post('/api/v1/auth/refresh', () => {
        refreshCalls += 1;
        return HttpResponse.json({
          accessToken: 'fresh-access',
          refreshToken: 'fresh-refresh',
          expiresInSeconds: 900,
        });
      })
    );

    tokenStore.setTokens({ accessToken: 'stale-access', refreshToken: 'valid-refresh' });

    const [resA, resB] = await Promise.all([
      http.get('/protected-a', ItemSchema),
      http.get('/protected-b', ItemSchema),
    ]);

    expect(refreshCalls).toBe(1);
    expect(resA).toEqual({ id: 'a', value: 1 });
    expect(resB).toEqual({ id: 'b', value: 2 });
    expect(tokenStore.getAccessToken()).toBe('fresh-access');
    expect(tokenStore.getRefreshToken()).toBe('fresh-refresh');
  });

  it('clears tokens and emits session-expired event when refresh fails', async () => {
    const expiredListener = vi.fn();
    const unsubscribe = onSessionExpired(expiredListener);

    server.use(
      mswHttp.get('/api/v1/protected-fail', () =>
        HttpResponse.json(
          { error: { code: 'TOKEN_EXPIRED', message: 'Expired' } },
          { status: 401 }
        )
      ),
      mswHttp.post('/api/v1/auth/refresh', () =>
        HttpResponse.json(
          { error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh expired' } },
          { status: 401 }
        )
      )
    );

    tokenStore.setTokens({ accessToken: 'old', refreshToken: 'bad-refresh' });

    await expect(http.get('/protected-fail', ItemSchema)).rejects.toMatchObject({
      status: 401,
    });

    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
    expect(expiredListener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('retries GET once on 5xx but never retries mutating POST requests', async () => {
    let getAttempts = 0;
    let postAttempts = 0;

    server.use(
      mswHttp.get('/api/v1/flaky-get', () => {
        getAttempts += 1;
        if (getAttempts === 1) {
          return HttpResponse.json(
            { error: { code: 'SERVER_ERR', message: 'Temporary glitch' } },
            { status: 503 }
          );
        }
        return HttpResponse.json({ id: 'recovered', value: 42 });
      }),
      mswHttp.post('/api/v1/flaky-post', () => {
        postAttempts += 1;
        return HttpResponse.json(
          { error: { code: 'SERVER_ERR', message: 'Failed' } },
          { status: 500 }
        );
      })
    );

    const getRes = await http.get('/flaky-get', ItemSchema, { retryDelayMs: 5 });
    expect(getAttempts).toBe(2);
    expect(getRes).toEqual({ id: 'recovered', value: 42 });

    await expect(
      http.post('/flaky-post', ItemSchema, { x: 1 }, { retryDelayMs: 5 })
    ).rejects.toMatchObject({ status: 500 });
    expect(postAttempts).toBe(1);
  });

  it('fails with typed TIMEOUT ApiError when request exceeds timeoutMs', async () => {
    server.use(
      mswHttp.post('/api/v1/slow-endpoint', async () => {
        await new Promise((resolve) => setTimeout(resolve, 120));
        return HttpResponse.json({ id: 'late', value: 0 });
      })
    );

    try {
      await http.post('/slow-endpoint', ItemSchema, {}, { timeoutMs: 25 });
      throw new Error('Expected timeout failure');
    } catch (err) {
      expect(isApiError(err)).toBe(true);
      if (isApiError(err)) {
        expect(err.code).toBe('TIMEOUT');
        expect(err.isTimeout).toBe(true);
      }
    }
  });

  it('logs clear schema error in dev and forwards quietly to reporter in production', async () => {
    server.use(
      mswHttp.get('/api/v1/bad-shape', () =>
        HttpResponse.json({ id: 123, value: 'wrong-type' })
      )
    );

    const devSpy = vi.spyOn(apiConfig, 'isDev', 'get').mockReturnValue(true);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(http.get('/bad-shape', ItemSchema)).rejects.toBeInstanceOf(ApiError);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[API Contract Mismatch] GET /bad-shape'),
      expect.any(Array)
    );

    consoleSpy.mockClear();
    devSpy.mockReturnValue(false);

    const prodReports: unknown[] = [];
    setSchemaErrorReporter((report) => {
      prodReports.push(report);
    });

    await expect(http.get('/bad-shape', ItemSchema)).rejects.toMatchObject({
      code: 'SCHEMA_VALIDATION_ERROR',
    });
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(prodReports).toHaveLength(1);

    setSchemaErrorReporter(() => {});
    consoleSpy.mockRestore();
    devSpy.mockRestore();
  });

  it('supports multipart upload progress events, abort signal, and file download', async () => {
    server.use(
      mswHttp.post('/api/v1/custom-upload', () =>
        HttpResponse.json({ id: 'upl-1', value: 99 }, { status: 201 })
      )
    );

    const fd = new FormData();
    fd.append('file', new File(['hello world'], 'sample.txt', { type: 'text/plain' }));

    const progressEvents: number[] = [];
    const uploaded = await upload('/custom-upload', fd, {
      schema: ItemSchema,
      onProgress: (evt) => progressEvents.push(evt.percent),
    });

    expect(uploaded).toEqual({ id: 'upl-1', value: 99 });
    expect(progressEvents[progressEvents.length - 1]).toBe(100);

    const preAborted = new AbortController();
    preAborted.abort();
    await expect(
      upload('/custom-upload', fd, { schema: ItemSchema, signal: preAborted.signal })
    ).rejects.toMatchObject({ code: 'ABORTED' });

    server.use(
      mswHttp.get('/api/v1/custom-download', () =>
        new HttpResponse('binary-pdf-content', {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="test-cert.pdf"',
          },
        })
      )
    );

    const dl = await download('/custom-download');
    expect(dl.filename).toBe('test-cert.pdf');
    expect(dl.contentType).toContain('application/pdf');
    expect(dl.blob.size).toBeGreaterThan(0);
  });
});
