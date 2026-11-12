import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../data/mockData';
import { Skeleton } from '../ui';
import { DashboardShell } from './DashboardShell';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { Forbidden403Page, Server500Page } from '../../pages/ErrorPages';
import { getErrorMessage } from '../../api/errors';

export const PublicShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8FF] text-[#1E1B2E]">
      <PublicNavbar />
      <main id="main-content" tabIndex={-1} className="flex-1 w-full focus:outline-none">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
};

const AuthLoadingSkeleton: React.FC = () => (
  <div
    className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6"
    aria-busy="true"
    aria-label="Verifying session"
  >
    <Skeleton className="h-8 w-56" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Skeleton className="h-36 rounded-[12px]" />
      <Skeleton className="h-36 rounded-[12px]" />
      <Skeleton className="h-36 rounded-[12px]" />
    </div>
  </div>
);

export const RoleGuard: React.FC<{
  allowedRoles: UserRole[];
  children: React.ReactNode;
  focusedLayout?: boolean;
}> = ({ allowedRoles, children, focusedLayout = false }) => {
  const { role, isAuthenticated, isLoading, sessionError, refetchSession } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <PublicShell>
        <AuthLoadingSkeleton />
      </PublicShell>
    );
  }

  if (sessionError && !isAuthenticated) {
    return (
      <PublicShell>
        <Server500Page
          errorMessage={getErrorMessage(sessionError, 'Unable to verify your session right now.')}
          onRetry={() => void refetchSession()}
        />
      </PublicShell>
    );
  }

  if (!isAuthenticated || role === 'guest') {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  if (!allowedRoles.includes(role)) {
    return (
      <DashboardShell>
        <Forbidden403Page requiredRoles={allowedRoles} />
      </DashboardShell>
    );
  }

  if (focusedLayout) {
    return <div className="min-h-screen bg-[#FAF8FF] text-[#1E1B2E]">{children}</div>;
  }

  return <DashboardShell>{children}</DashboardShell>;
};
