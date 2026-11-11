import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../data/mockData';
import { DashboardShell } from './DashboardShell';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { Forbidden403Page } from '../../pages/ErrorPages';

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

export const RoleGuard: React.FC<{
  allowedRoles: UserRole[];
  children: React.ReactNode;
  focusedLayout?: boolean;
}> = ({ allowedRoles, children, focusedLayout = false }) => {
  const { role } = useApp();

  if (!allowedRoles.includes(role)) {
    // Render 403 inside the appropriate shell so navigation never dead-ends
    if (role === 'guest') {
      return (
        <PublicShell>
          <Forbidden403Page requiredRoles={allowedRoles} />
        </PublicShell>
      );
    }
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
