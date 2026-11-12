import { afterAll, afterEach, beforeAll } from 'vitest';
import { tokenStore } from '@/api/tokenStore';
import { resetMockDb } from '@/mocks/db';
import { server } from '@/mocks/server';

beforeAll(() => {
  server.listen({
    onUnhandledFrame: 'error',
  });
});

afterEach(() => {
  server.resetHandlers();
  resetMockDb();
  tokenStore.clear();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});
