function normalizeBaseUrl(raw?: string): string {
  const value = raw?.trim();
  if (!value) return '/api/v1';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function parseErrorRate(raw?: string): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(1, parsed);
}

export interface ApiConfig {
  readonly baseUrl: string;
  readonly useMock: boolean;
  readonly mockPersist: boolean;
  readonly mockErrorRate: number;
  readonly timeoutMs: number;
  readonly isDev: boolean;
}

export const apiConfig: ApiConfig = {
  baseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  useMock: import.meta.env.VITE_USE_MOCK === 'true',
  mockPersist: import.meta.env.VITE_MOCK_PERSIST === 'true',
  mockErrorRate: parseErrorRate(import.meta.env.VITE_MOCK_ERROR_RATE),
  timeoutMs: 15_000,
  isDev: Boolean(import.meta.env.DEV),
};

/** Joins a relative API endpoint path onto the configured base URL. */
export function resolveApiPath(path: string, baseUrl = apiConfig.baseUrl): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizeBaseUrl(baseUrl)}${normalizedPath}`;
}
