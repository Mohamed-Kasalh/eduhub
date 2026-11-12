import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onSessionExpired } from '../api/errors';
import { mapUserDtoToProfile } from '../api/mappers';
import { queryKeys } from '../api/queryKeys';
import { meService } from '../api/services';
import { tokenStore } from '../api/tokenStore';
import type { AuthSessionResponseDto, UserDto, UserRole, UserProfile } from '../api/dto-types-bridge';
import { emitToast } from '../lib/toastBus';

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case 'student':
      return '/student/dashboard';
    case 'instructor':
      return '/instructor/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'supervisor':
      return '/supervisor/dashboard';
    case 'guest':
    default:
      return '/';
  }
}

export interface AuthContextValue {
  user: UserProfile | null;
  rawUser: UserDto | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionError: unknown;
  refetchSession: () => Promise<void>;
  applyAuthSession: (session: AuthSessionResponseDto) => void;
  clearAuthSession: () => void;
  getDashboardPath: (targetRole?: UserRole) => string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [hasTokens, setHasTokens] = useState<boolean>(() =>
    Boolean(tokenStore.getAccessToken() || tokenStore.getRefreshToken())
  );

  const meQuery = useQuery({
    queryKey: queryKeys.me.profile,
    queryFn: () => meService.getMe(),
    enabled: hasTokens,
    staleTime: 30_000,
  });

  const rawUser: UserDto | null = hasTokens ? (meQuery.data ?? null) : null;
  const user: UserProfile | null = useMemo(
    () => (rawUser ? mapUserDtoToProfile(rawUser) : null),
    [rawUser]
  );
  const role: UserRole = rawUser ? rawUser.role : 'guest';
  const isAuthenticated = Boolean(rawUser);
  const wasAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    wasAuthenticatedRef.current = isAuthenticated || hasTokens;
  }, [isAuthenticated, hasTokens]);

  const clearPrivateCaches = useCallback(() => {
    queryClient.setQueryData(queryKeys.me.profile, null);
    queryClient.removeQueries({ queryKey: queryKeys.me.all });
    queryClient.removeQueries({ queryKey: queryKeys.notifications.all });
    queryClient.removeQueries({ queryKey: queryKeys.certificates.all });
    queryClient.removeQueries({ queryKey: ['instructor'] });
    queryClient.removeQueries({ queryKey: ['supervisor'] });
    queryClient.removeQueries({ queryKey: ['admin'] });
    queryClient.removeQueries({ queryKey: ['exams'] });
  }, [queryClient]);

  const clearAuthSession = useCallback(() => {
    tokenStore.clear();
    setHasTokens(false);
    clearPrivateCaches();
  }, [clearPrivateCaches]);

  const applyAuthSession = useCallback(
    (session: AuthSessionResponseDto) => {
      tokenStore.setTokens({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
      setHasTokens(true);
      queryClient.setQueryData(queryKeys.me.profile, session.user);
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    [queryClient]
  );

  useEffect(() => {
    return onSessionExpired(() => {
      const hadSession = wasAuthenticatedRef.current;
      clearAuthSession();
      if (hadSession) {
        emitToast({
          title: 'Session expired',
          message: 'Please sign in again to continue.',
          variant: 'warning',
        });
      }
    });
  }, [clearAuthSession]);

  const refetchSession = useCallback(async () => {
    if (!tokenStore.getAccessToken() && !tokenStore.getRefreshToken()) return;
    await meQuery.refetch();
  }, [meQuery]);

  const getDashboardPath = useCallback(
    (targetRole?: UserRole) => getRoleDashboardPath(targetRole ?? role),
    [role]
  );

  const isLoading = hasTokens && meQuery.isPending && !meQuery.data;
  const sessionError = hasTokens && meQuery.isError ? meQuery.error : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      rawUser,
      role,
      isAuthenticated,
      isLoading,
      sessionError,
      refetchSession,
      applyAuthSession,
      clearAuthSession,
      getDashboardPath,
    }),
    [
      user,
      rawUser,
      role,
      isAuthenticated,
      isLoading,
      sessionError,
      refetchSession,
      applyAuthSession,
      clearAuthSession,
      getDashboardPath,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
