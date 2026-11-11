import React from 'react';
import { createBrowserRouter, Outlet, ScrollRestoration } from 'react-router';
import { useApp } from './context/AppContext';
import { PublicShell, RoleGuard } from './components/layout/RoleGuard';
import { DashboardShell } from './components/layout/DashboardShell';
import { PreviewSwitcher } from './components/layout/PreviewSwitcher';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { ToastViewport } from './components/ui';
import { DesignSystemPage } from './pages/DesignSystemPage';
import {
  HomePage,
  VerifyCertificatePage,
} from './pages/public/PublicPages';
import { CoursesCatalogPage } from './pages/public/CoursesCatalogPage';
import { CourseDetailPage } from './pages/public/CourseDetailPage';
import {
  LoginPage,
  SignupPage,
  VerifyOtpPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from './pages/auth/AuthPages';
import {
  StudentDashboardPage,
  StudentCoursesPage,
  StudentCourseProgressPage,
  LessonPlayerPage,
  ExamPage,
  ExamResultPage,
  CertificatesListPage,
  CertificateDetailPage,
} from './pages/student/StudentPages';
import { ProfilePage } from './pages/shared/ProfilePage';
import { NotificationsPage } from './pages/shared/NotificationsPage';
import {
  InstructorDashboardPage,
  InstructorCoursesPage,
  InstructorCreateCoursePage,
  InstructorQuestionBankPage,
  InstructorExamSettingsPage,
  InstructorStudentsPage,
  InstructorCommentsPage,
} from './pages/instructor/InstructorPages';
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminCoursesPage,
  AdminCategoriesPage,
  AdminCertificatesPage,
  AdminSettingsPage,
} from './pages/admin/AdminPages';
import {
  SupervisorDashboardPage,
  SupervisorCommentsPage,
  SupervisorCourseReviewPage,
  SupervisorReportsPage,
} from './pages/supervisor/SupervisorPages';
import {
  Forbidden403Page,
  NotFound404Page,
  Server500Page,
  RouteErrorBoundary,
} from './pages/ErrorPages';

const RootLayout: React.FC = () => {
  const { toasts, removeToast } = useApp();
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-[10px] focus:bg-[#1E1B2E] focus:text-white focus:font-semibold focus:text-[14px] focus:shadow-purple-lg focus:outline-none focus:ring-2 focus:ring-[#A78BFA]"
      >
        Skip to content
      </a>
      <OfflineBanner />
      <ScrollRestoration />
      <Outlet />
      <ToastViewport toasts={toasts} onDismiss={removeToast} />
      <PreviewSwitcher />
    </>
  );
};

/**
 * Wraps pages that can be viewed either in PublicShell (when Guest)
 * or inside the logged-in DashboardShell (when Student/Instructor/Admin/Supervisor).
 */
const AdaptiveShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useApp();
  if (role === 'guest') {
    return <PublicShell>{children}</PublicShell>;
  }
  return <DashboardShell>{children}</DashboardShell>;
};

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        index: true,
        element: (
          <PublicShell>
            <HomePage />
          </PublicShell>
        ),
      },
      {
        path: 'design-system',
        element: (
          <PublicShell>
            <DesignSystemPage />
          </PublicShell>
        ),
      },
      {
        path: 'login',
        element: (
          <PublicShell>
            <LoginPage />
          </PublicShell>
        ),
      },
      {
        path: 'signup',
        element: (
          <PublicShell>
            <SignupPage />
          </PublicShell>
        ),
      },
      {
        path: 'verify-otp',
        element: (
          <PublicShell>
            <VerifyOtpPage />
          </PublicShell>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <PublicShell>
            <ForgotPasswordPage />
          </PublicShell>
        ),
      },
      {
        path: 'reset-password',
        element: (
          <PublicShell>
            <ResetPasswordPage />
          </PublicShell>
        ),
      },
      {
        path: 'courses',
        element: (
          <AdaptiveShell>
            <CoursesCatalogPage />
          </AdaptiveShell>
        ),
      },
      {
        path: 'courses/:id',
        element: (
          <AdaptiveShell>
            <CourseDetailPage />
          </AdaptiveShell>
        ),
      },
      {
        path: 'verify/:id',
        element: (
          <PublicShell>
            <VerifyCertificatePage />
          </PublicShell>
        ),
      },

      /* Student & Learning Routes */
      {
        path: 'learn/:courseId/:lessonId',
        element: (
          <RoleGuard allowedRoles={['student']} focusedLayout>
            <LessonPlayerPage />
          </RoleGuard>
        ),
      },
      {
        path: 'exam/:courseId',
        element: (
          <RoleGuard allowedRoles={['student']} focusedLayout>
            <ExamPage />
          </RoleGuard>
        ),
      },
      {
        path: 'exam/:courseId/result',
        element: (
          <RoleGuard allowedRoles={['student']}>
            <ExamResultPage />
          </RoleGuard>
        ),
      },
      {
        path: 'certificates',
        element: (
          <RoleGuard allowedRoles={['student']}>
            <CertificatesListPage />
          </RoleGuard>
        ),
      },
      {
        path: 'certificates/:id',
        element: (
          <RoleGuard allowedRoles={['student']}>
            <CertificateDetailPage />
          </RoleGuard>
        ),
      },
      {
        path: 'student/dashboard',
        element: (
          <RoleGuard allowedRoles={['student']}>
            <StudentDashboardPage />
          </RoleGuard>
        ),
      },
      {
        path: 'student/courses',
        element: (
          <RoleGuard allowedRoles={['student']}>
            <StudentCoursesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'student/progress/:courseId',
        element: (
          <RoleGuard allowedRoles={['student']}>
            <StudentCourseProgressPage />
          </RoleGuard>
        ),
      },

      /* Shared Logged-In Account Routes */
      {
        path: 'profile',
        element: (
          <RoleGuard allowedRoles={['student', 'instructor', 'admin', 'supervisor']}>
            <ProfilePage />
          </RoleGuard>
        ),
      },
      {
        path: 'notifications',
        element: (
          <RoleGuard allowedRoles={['student', 'instructor', 'admin', 'supervisor']}>
            <NotificationsPage />
          </RoleGuard>
        ),
      },

      /* Instructor Routes */
      {
        path: 'instructor/dashboard',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <InstructorDashboardPage />
          </RoleGuard>
        ),
      },
      {
        path: 'instructor/courses',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <InstructorCoursesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'instructor/courses/new',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <InstructorCreateCoursePage />
          </RoleGuard>
        ),
      },
      {
        path: 'instructor/question-bank',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <InstructorQuestionBankPage />
          </RoleGuard>
        ),
      },
      {
        path: 'instructor/exam-settings',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <InstructorExamSettingsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'instructor/students',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <InstructorStudentsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'instructor/comments',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <InstructorCommentsPage />
          </RoleGuard>
        ),
      },

      /* Admin Routes */
      {
        path: 'admin/dashboard',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <AdminDashboardPage />
          </RoleGuard>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <AdminUsersPage />
          </RoleGuard>
        ),
      },
      {
        path: 'admin/courses',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <AdminCoursesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'admin/categories',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <AdminCategoriesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'admin/certificates',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <AdminCertificatesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'admin/settings',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <AdminSettingsPage />
          </RoleGuard>
        ),
      },

      /* Supervisor Routes */
      {
        path: 'supervisor/dashboard',
        element: (
          <RoleGuard allowedRoles={['supervisor']}>
            <SupervisorDashboardPage />
          </RoleGuard>
        ),
      },
      {
        path: 'supervisor/comments',
        element: (
          <RoleGuard allowedRoles={['supervisor']}>
            <SupervisorCommentsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'supervisor/course-review',
        element: (
          <RoleGuard allowedRoles={['supervisor']}>
            <SupervisorCourseReviewPage />
          </RoleGuard>
        ),
      },
      {
        path: 'supervisor/reports',
        element: (
          <RoleGuard allowedRoles={['supervisor']}>
            <SupervisorReportsPage />
          </RoleGuard>
        ),
      },

      /* Explicit Error Routes */
      {
        path: '403',
        element: (
          <AdaptiveShell>
            <Forbidden403Page />
          </AdaptiveShell>
        ),
      },
      {
        path: '404',
        element: (
          <AdaptiveShell>
            <NotFound404Page />
          </AdaptiveShell>
        ),
      },
      {
        path: '500',
        element: (
          <AdaptiveShell>
            <Server500Page />
          </AdaptiveShell>
        ),
      },
      {
        path: '*',
        element: (
          <AdaptiveShell>
            <NotFound404Page />
          </AdaptiveShell>
        ),
      },
    ],
  },
]);
