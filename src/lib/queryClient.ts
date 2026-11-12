import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import {
  dispatchNetworkIssue,
  dispatchSessionExpired,
  isApiError,
} from '../api/errors';
import { tokenStore } from '../api/tokenStore';

/** Creates a React Query client configured per EduHub's API conventions. */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isApiError(error)) {
          if (
            error.status === 401 &&
            Boolean(tokenStore.getAccessToken() || tokenStore.getRefreshToken())
          ) {
            tokenStore.clear();
            dispatchSessionExpired();
          } else if (error.isNetwork) {
            dispatchNetworkIssue(true);
          }
        }
      },
      onSuccess: () => {
        dispatchNetworkIssue(false);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isApiError(error)) {
          if (
            error.status === 401 &&
            Boolean(tokenStore.getAccessToken() || tokenStore.getRefreshToken())
          ) {
            tokenStore.clear();
            dispatchSessionExpired();
          } else if (error.isNetwork) {
            dispatchNetworkIssue(true);
          }
        }
      },
      onSuccess: () => {
        dispatchNetworkIssue(false);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (failureCount >= 1) return false;
          if (isApiError(error) && error.status >= 400 && error.status < 500) {
            return false;
          }
          return true;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/** Shared singleton QueryClient mounted at the application root. */
export const queryClient = createAppQueryClient();
