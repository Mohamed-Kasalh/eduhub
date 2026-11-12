const ACCESS_TOKEN_KEY = 'eduhub_access_token';
const REFRESH_TOKEN_KEY = 'eduhub_refresh_token';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenStore {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(tokens: AuthTokens): void;
  clear(): void;
}

function safeReadStorage(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteStorage(key: string, value: string | null): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota or blocked storage errors.
  }
}

/**
 * Isolated token persistence abstraction.
 * Keeping token access behind this interface allows migrating cleanly
 * to HttpOnly cookie sessions without changing services or callers.
 */
class BrowserTokenStore implements TokenStore {
  private memoryAccess: string | null = safeReadStorage(ACCESS_TOKEN_KEY);
  private memoryRefresh: string | null = safeReadStorage(REFRESH_TOKEN_KEY);

  getAccessToken(): string | null {
    return this.memoryAccess ?? safeReadStorage(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.memoryRefresh ?? safeReadStorage(REFRESH_TOKEN_KEY);
  }

  setTokens(tokens: AuthTokens): void {
    this.memoryAccess = tokens.accessToken;
    this.memoryRefresh = tokens.refreshToken;
    safeWriteStorage(ACCESS_TOKEN_KEY, tokens.accessToken);
    safeWriteStorage(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  clear(): void {
    this.memoryAccess = null;
    this.memoryRefresh = null;
    safeWriteStorage(ACCESS_TOKEN_KEY, null);
    safeWriteStorage(REFRESH_TOKEN_KEY, null);
  }
}

export const tokenStore: TokenStore = new BrowserTokenStore();
