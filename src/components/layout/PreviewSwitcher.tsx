import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Users,
  ChevronUp,
  ChevronDown,
  Compass,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useAuth, getRoleDashboardPath, useLoginMutation, useLogoutMutation } from '../../api/hooks/useAuth';
import type { UserRole } from '../../data/mockData';

const DEMO_ACCOUNTS: Array<{
  role: UserRole;
  label: string;
  badgeColor: string;
  person: string;
  email?: string;
  password?: string;
}> = [
  { role: 'guest', label: 'Guest', badgeColor: 'bg-[#5F5B75] text-white', person: 'Public visitor' },
  {
    role: 'student',
    label: 'Student',
    badgeColor: 'bg-[#6D4AE0] text-white',
    person: 'Sara Ali',
    email: 'sara.ali@eduhub.com',
    password: 'EduHub#2025',
  },
  {
    role: 'instructor',
    label: 'Instructor',
    badgeColor: 'bg-[#F59E3B] text-white',
    person: 'Ahmed Hassan',
    email: 'ahmed.hassan@eduhub.com',
    password: 'EduHub#2025',
  },
  {
    role: 'admin',
    label: 'Admin',
    badgeColor: 'bg-[#2563EB] text-white',
    person: 'Nour Khaled',
    email: 'nour.khaled@eduhub.com',
    password: 'EduHub#2025',
  },
  {
    role: 'supervisor',
    label: 'Supervisor',
    badgeColor: 'bg-[#16A34A] text-white',
    person: 'Hana Mostafa',
    email: 'hana.mostafa@eduhub.com',
    password: 'EduHub#2025',
  },
];

const QUICK_ROUTES: Array<{ group: string; items: Array<{ label: string; path: string }> }> = [
  {
    group: 'Public & Auth',
    items: [
      { label: 'Home (/)', path: '/' },
      { label: 'Design system', path: '/design-system' },
      { label: 'Catalog (/courses)', path: '/courses' },
      { label: 'Course details', path: '/courses/course-1' },
      { label: 'Verify certificate', path: '/verify/EDU-2026-000123' },
      { label: 'Log in', path: '/login' },
      { label: 'Sign up', path: '/signup' },
      { label: 'Verify OTP', path: '/verify-otp' },
      { label: 'Forgot password', path: '/forgot-password' },
      { label: 'Reset password', path: '/reset-password' },
    ],
  },
  {
    group: 'Shared Learning & Account',
    items: [
      { label: 'Lesson player', path: '/learn/course-1/lesson-103' },
      { label: 'Course exam', path: '/exam/course-1' },
      { label: 'Exam result', path: '/exam/course-1/result' },
      { label: 'My certificates', path: '/certificates' },
      { label: 'Certificate view', path: '/certificates/cert-101' },
      { label: 'Profile', path: '/profile' },
      { label: 'Notifications', path: '/notifications' },
    ],
  },
  {
    group: 'Student Routes',
    items: [
      { label: 'Student dashboard', path: '/student/dashboard' },
      { label: 'Student courses', path: '/student/courses' },
      { label: 'Student progress', path: '/student/progress/course-1' },
    ],
  },
  {
    group: 'Instructor Routes',
    items: [
      { label: 'Instructor dashboard', path: '/instructor/dashboard' },
      { label: 'Instructor courses', path: '/instructor/courses' },
      { label: 'Create course', path: '/instructor/courses/new' },
      { label: 'Question bank', path: '/instructor/question-bank' },
      { label: 'Exam settings', path: '/instructor/exam-settings' },
      { label: 'Students list', path: '/instructor/students' },
      { label: 'Course comments', path: '/instructor/comments' },
    ],
  },
  {
    group: 'Admin Routes',
    items: [
      { label: 'Admin dashboard', path: '/admin/dashboard' },
      { label: 'Manage users', path: '/admin/users' },
      { label: 'Manage courses', path: '/admin/courses' },
      { label: 'Manage categories', path: '/admin/categories' },
      { label: 'Manage certificates', path: '/admin/certificates' },
      { label: 'Platform settings', path: '/admin/settings' },
    ],
  },
  {
    group: 'Supervisor & Error Routes',
    items: [
      { label: 'Supervisor dashboard', path: '/supervisor/dashboard' },
      { label: 'Comment moderation', path: '/supervisor/comments' },
      { label: 'Course review', path: '/supervisor/course-review' },
      { label: 'Moderation reports', path: '/supervisor/reports' },
      { label: '403 Access denied', path: '/403' },
      { label: '404 Not found', path: '/404' },
      { label: '500 Server error', path: '/500' },
    ],
  },
];

export const PreviewSwitcher: React.FC = () => {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_ROLE_SWITCHER !== 'true') {
    return null;
  }

  const { role, isAuthenticated } = useAuth();
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const [expanded, setExpanded] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [autoNavigate, setAutoNavigate] = useState(true);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const activeMeta = DEMO_ACCOUNTS.find((r) => r.role === role) || DEMO_ACCOUNTS[0];
  const isBusy = loginMutation.isPending || logoutMutation.isPending;

  const handleSelectRole = async (item: (typeof DEMO_ACCOUNTS)[number]) => {
    if (isBusy) return;
    setPendingRole(item.role);
    try {
      if (item.role === 'guest') {
        if (isAuthenticated) {
          await logoutMutation.mutateAsync();
        }
        if (autoNavigate) {
          navigate('/');
        }
        return;
      }
      if (item.email && item.password) {
        const session = await loginMutation.mutateAsync({
          email: item.email,
          password: item.password,
          rememberMe: true,
        });
        if (autoNavigate) {
          navigate(getRoleDashboardPath(session.user.role));
        }
      }
    } catch {
      // Danger toast handled in auth mutation hooks.
    } finally {
      setPendingRole(null);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-[calc(100vw-2rem)]">
      {expanded ? (
        <div className="w-80 sm:w-88 rounded-[12px] bg-white border-2 border-[#6D4AE0] shadow-purple-lg overflow-hidden">
          <div className="px-4 py-3 bg-[#1E1B2E] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#A78BFA]" />
              <span className="font-display font-bold text-[15px]">Preview as role</span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="p-1 rounded-[8px] text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Collapse role switcher"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-2 bg-white">
            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_ACCOUNTS.map((item) => {
                const isCurrent = item.role === role;
                const isSwitchingThis = pendingRole === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleSelectRole(item)}
                    className={`w-full px-3 py-2 rounded-[10px] text-left flex items-center justify-between transition-all cursor-pointer border disabled:opacity-60 ${
                      isCurrent
                        ? 'bg-[#F3EFFF] border-[#6D4AE0] text-[#1E1B2E] shadow-purple-sm'
                        : 'bg-white border-[#E6E1F5] text-[#1E1B2E] hover:bg-[#FAF8FF] hover:border-[#A78BFA]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isCurrent ? 'bg-[#6D4AE0]' : 'bg-[#E6E1F5]'
                        }`}
                      />
                      <div>
                        <p className="text-[14px] font-bold leading-tight">{item.label}</p>
                        <p className="text-[12px] text-[#5F5B75]">{item.person}</p>
                      </div>
                    </div>
                    {isSwitchingThis ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#6D4AE0]" />
                    ) : isCurrent ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#6D4AE0] text-white text-[11px] font-semibold">
                        Active
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <label className="flex items-center justify-between gap-2 pt-2 px-1 text-[12px] text-[#5F5B75] cursor-pointer select-none border-t border-[#E6E1F5]">
              <span>Jump to role dashboard on switch</span>
              <input
                type="checkbox"
                checked={autoNavigate}
                onChange={(e) => setAutoNavigate(e.target.checked)}
                className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
              />
            </label>

            <div className="pt-2 border-t border-[#E6E1F5] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRoutes((v) => !v)}
                className="flex-1 h-9 px-3 rounded-[10px] bg-[#F3EFFF] text-[#6D4AE0] text-[12px] font-bold inline-flex items-center justify-center gap-1.5 hover:bg-[#E6E1F5] cursor-pointer transition-colors"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{showRoutes ? 'Hide all 38 routes' : 'Browse all 38 routes'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const forbiddenTarget =
                    role === 'guest'
                      ? '/403'
                      : role === 'admin'
                      ? '/student/dashboard'
                      : '/admin/users';
                  navigate(forbiddenTarget);
                }}
                className="h-9 px-2.5 rounded-[10px] bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/25 text-[12px] font-bold inline-flex items-center gap-1 hover:bg-[#FEE2E2] cursor-pointer"
                title="Test role-based 403 guard"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Test 403</span>
              </button>
            </div>

            {showRoutes && (
              <div className="max-h-60 overflow-y-auto border border-[#E6E1F5] rounded-[10px] p-2.5 bg-[#FAF8FF] space-y-3 mt-2">
                {QUICK_ROUTES.map((group) => (
                  <div key={group.group} className="space-y-1">
                    <p className="text-[11px] font-bold text-[#6D4AE0] px-1">{group.group}</p>
                    <div className="grid grid-cols-1 gap-1">
                      {group.items.map((r) => (
                        <button
                          key={r.path}
                          type="button"
                          onClick={() => navigate(r.path)}
                          className={`w-full px-2.5 py-1.5 rounded-[8px] text-left text-[12px] flex items-center justify-between cursor-pointer ${
                            location.pathname === r.path
                              ? 'bg-[#6D4AE0] text-white font-semibold'
                              : 'hover:bg-[#F3EFFF] text-[#1E1B2E]'
                          }`}
                        >
                          <span>{r.label}</span>
                          <ArrowRight className="w-3 h-3 opacity-70" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-[#1E1B2E] text-white shadow-purple-lg border border-[#6D4AE0]/50">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-[#F5B82E] animate-pulse" />
            <span className="text-[13px] font-semibold text-white/85">Preview as:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold ${activeMeta.badgeColor}`}>
              {activeMeta.label}
            </span>
            <ChevronUp className="w-4 h-4 text-white/75" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/design-system')}
            className="p-2 rounded-full bg-[#6D4AE0] hover:bg-[#5A3AC7] text-white cursor-pointer"
            title="Open Design System page"
            aria-label="Open Design System page"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
