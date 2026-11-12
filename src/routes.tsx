import React, { Suspense, lazy } from 'react';
import {
  createBrowserRouter,
  Outlet,
  ScrollRestoration,
  type RouteObject,
} from 'react-router';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { PublicShell, RoleGuard } from './components/layout/RoleGuard';
import { DashboardShell } from './components/layout/DashboardShell';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { Skeleton, ToastViewport } from './components/ui';
import { usePageTitle } from './hooks/usePageTitle';
import {
  Forbidden403Page,
  NotFound404Page,
  Server500Page,
  RouteErrorBoundary,
} from './pages/ErrorPages';

const DesignSystemPage = lazy(() =>
  import('./pages/DesignSystemPage').then((m) => ({ default: m.DesignSystemPage }))
);
const HomePage = lazy(() =>
  import('./pages/public/PublicPages').then((m) => ({ default: m.HomePage }))
);
const CoursesCatalogPage = lazy(() =>
  import('./pages/public/CoursesCatalogPage').then((m) => ({ default: m.CoursesCatalogPage }))
);
const CourseDetailPage = lazy(() =>
  import('./pages/public/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage }))
);
const VerifyCertificatePage = lazy(() =>
  import('./pages/student/CertificatePages').then((m) => ({ default: m.VerifyCertificatePage }))
);

const LoginPage = lazy(() =>
  import('./pages/auth/AuthPages').then((m) => ({ default: m.LoginPage }))
);
const SignupPage = lazy(() =>
  import('./pages/auth/AuthPages').then((m) => ({ default: m.SignupPage }))
);
const VerifyOtpPage = lazy(() =>
  import('./pages/auth/AuthPages').then((m) => ({ default: m.VerifyOtpPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/AuthPages').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/AuthPages').then((m) => ({ default: m.ResetPasswordPage }))
);

const LessonPlayerPage = lazy(() =>
  import('./pages/student/LessonPlayerPage').then((m) => ({ default: m.LessonPlayerPage }))
);
const ExamPage = lazy(() =>
  import('./pages/student/ExamPages').then((m) => ({ default: m.ExamPage }))
);
const ExamResultPage = lazy(() =>
  import('./pages/student/ExamPages').then((m) => ({ default: m.ExamResultPage }))
);
const CertificatesListPage = lazy(() =>
  import('./pages/student/CertificatePages').then((m) => ({ default: m.CertificatesListPage }))
);
const CertificateDetailPage = lazy(() =>
  import('./pages/student/CertificatePages').then((m) => ({ default: m.CertificateDetailPage }))
);
const StudentDashboardPage = lazy(() =>
  import('./pages/student/StudentPages').then((m) => ({ default: m.StudentDashboardPage }))
);
const StudentCoursesPage = lazy(() =>
  import('./pages/student/StudentPages').then((m) => ({ default: m.StudentCoursesPage }))
);
const StudentCourseProgressPage = lazy(() =>
  import('./pages/student/StudentPages').then((m) => ({ default: m.StudentCourseProgressPage }))
);

const ProfilePage = lazy(() =>
  import('./pages/shared/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const NotificationsPage = lazy(() =>
  import('./pages/shared/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);

const InstructorDashboardPage = lazy(() =>
  import('./pages/instructor/InstructorPages').then((m) => ({
    default: m.InstructorDashboardPage,
  }))
);
const InstructorCoursesPage = lazy(() =>
  import('./pages/instructor/InstructorPages').then((m) => ({
    default: m.InstructorCoursesPage,
  }))
);
const InstructorCreateCoursePage = lazy(() =>
  import('./pages/instructor/InstructorCourseWizard').then((m) => ({
    default: m.InstructorCreateCoursePage,
  }))
);
const InstructorQuestionBankPage = lazy(() =>
  import('./pages/instructor/InstructorQuestionBankAndExam').then((m) => ({
    default: m.InstructorQuestionBankPage,
  }))
);
const InstructorExamSettingsPage = lazy(() =>
  import('./pages/instructor/InstructorQuestionBankAndExam').then((m) => ({
    default: m.InstructorExamSettingsPage,
  }))
);
const InstructorStudentsPage = lazy(() =>
  import('./pages/instructor/InstructorPages').then((m) => ({
    default: m.InstructorStudentsPage,
  }))
);
const InstructorCommentsPage = lazy(() =>
  import('./pages/instructor/InstructorPages').then((m) => ({
    default: m.InstructorCommentsPage,
  }))
);

const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminUsersPage = lazy(() =>
  import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminUsersPage }))
);
const AdminCoursesPage = lazy(() =>
  import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminCoursesPage }))
);
const AdminCategoriesPage = lazy(() =>
  import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminCategoriesPage }))
);
const AdminCertificatesPage = lazy(() =>
  import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminCertificatesPage }))
);
const AdminSettingsPage = lazy(() =>
  import('./pages/admin/AdminPages').then((m) => ({ default: m.AdminSettingsPage }))
);

const SupervisorDashboardPage = lazy(() =>
  import('./pages/supervisor/SupervisorPages').then((m) => ({
    default: m.SupervisorDashboardPage,
  }))
);
const SupervisorCommentsPage = lazy(() =>
  import('./pages/supervisor/SupervisorPages').then((m) => ({
    default: m.SupervisorCommentsPage,
  }))
);
const SupervisorCourseReviewPage = lazy(() =>
  import('./pages/supervisor/SupervisorPages').then((m) => ({
    default: m.SupervisorCourseReviewPage,
  }))
);
const SupervisorReportsPage = lazy(() =>
  import('./pages/supervisor/SupervisorPages').then((m) => ({
    default: m.SupervisorReportsPage,
  }))
);

const PageRouteSkeleton: React.FC = () => (
  <div
    className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6"
    aria-busy="true"
    aria-label="Loading page content"
  >
    <div className="space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-80 max-w-full" />
      <Skeleton className="h-5 w-96 max-w-full" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Skeleton className="h-48 rounded-[12px]" />
      <Skeleton className="h-48 rounded-[12px]" />
      <Skeleton className="h-48 rounded-[12px]" />
    </div>
    <Skeleton className="h-64 rounded-[12px]" />
  </div>
);

const TitledRoute: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  usePageTitle(title);
  return <Suspense fallback={<PageRouteSkeleton />}>{children}</Suspense>;
};

const DevPreviewSwitcher =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_ROLE_SWITCHER === 'true'
    ? lazy(() =>
        import('./components/layout/PreviewSwitcher').then((m) => ({
          default: m.PreviewSwitcher,
        }))
      )
    : null;

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
      {DevPreviewSwitcher ? (
        <Suspense fallback={null}>
          <DevPreviewSwitcher />
        </Suspense>
      ) : null}
    </>
  );
};

/**
 * Wraps pages that can be viewed either in PublicShell (when Guest)
 * or inside the logged-in DashboardShell (when Student/Instructor/Admin/Supervisor).
 */
const AdaptiveShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();
  if (role === 'guest') {
    return <PublicShell>{children}</PublicShell>;
  }
  return <DashboardShell>{children}</DashboardShell>;
};

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        index: true,
        element: (
          <PublicShell>
            <TitledRoute title="Learn New Skills Online">
              <HomePage />
            </TitledRoute>
          </PublicShell>
        ),
      },
      {
        path: 'design-system',
        element: (
          <PublicShell>
            <TitledRoute title="Design System">
              <DesignSystemPage />
            </TitledRoute>
          </PublicShell>
        ),
      },
      {
        path: 'login',
        element: (
          <PublicShell>
            <TitledRoute title="Log in">
              <LoginPage />
            </TitledRoute>
          </PublicShell>
        ),
      },
      {
        path: 'signup',
        element: (
          <PublicShell>
            <TitledRoute title="Sign up">
              <SignupPage />
            </TitledRoute>
          </PublicShell>
        ),
      },
      {
        path: 'verify-otp',
        element: (
          <PublicShell>
            <TitledRoute title="Verify Email">
              <VerifyOtpPage />
            </TitledRoute>
          </PublicShell>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <PublicShell>
            <TitledRoute title="Forgot Password">
              <ForgotPasswordPage />
            </TitledRoute>
          </PublicShell>
        ),
      },
      {
        path: 'reset-password',
        element: (
          <PublicShell>
            <TitledRoute title="Reset Password">
              <ResetPasswordPage />
            </TitledRoute>
          </PublicShell>
        ),
      },
      {
        path: 'courses',
        element: (
          <AdaptiveShell>
            <TitledRoute title="Courses">
              <CoursesCatalogPage />
            </TitledRoute>
          </AdaptiveShell>
        ),
      },
      {
        path: 'courses/:id',
        element: (
          <AdaptiveShell>
            <TitledRoute title="Course Details">
              <CourseDetailPage />
            </TitledRoute>
          </AdaptiveShell>
        ),
      },
      {
        path: 'verify/:id',
        element: (
          <PublicShell>
            <TitledRoute title="Verify Certificate">
              <VerifyCertificatePage />
            </TitledRoute>
          </PublicShell>
        ),
      },

      /* Student & Learning Routes */
      {
        path: 'learn/:courseId/:lessonId',
        element: (
          <RoleGuard allowedRoles={['student']} focusedLayout>
            <TitledRoute title="Lesson Player">
              <LessonPlayerPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'exam/:courseId',
        element: (
          <RoleGuard allowedRoles={['student']} focusedLayout>
            <TitledRoute title="Final Exam">
              <ExamPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'exam/:courseId/result',
        element: (
          <RoleGuard allowedRoles={['student']}>
            <TitledRoute title="Exam Results">
              <ExamResultPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'certificates',
        element: (
          <RoleGuard allowedRoles={['student']}>
            <TitledRoute title="My Certificates">
              <CertificatesListPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'certificates/:id',
        element: (
          <RoleGuard allowedRoles={['student']}>
            <TitledRoute title="Certificate Preview">
              <CertificateDetailPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'student/dashboard',
        element: (
          <RoleGuard allowedRoles={['student']}>
            <TitledRoute title="Student Dashboard">
              <StudentDashboardPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'student/courses',
        element: (
          <RoleGuard allowedRoles={['student']}>
            <TitledRoute title="My Courses">
              <StudentCoursesPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'student/progress/:courseId',
        element: (
          <RoleGuard allowedRoles={['student']}>
            <TitledRoute title="Course Progress">
              <StudentCourseProgressPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },

      /* Shared Logged-In Account Routes */
      {
        path: 'profile',
        element: (
          <RoleGuard allowedRoles={['student', 'instructor', 'admin', 'supervisor']}>
            <TitledRoute title="Profile & Settings">
              <ProfilePage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'notifications',
        element: (
          <RoleGuard allowedRoles={['student', 'instructor', 'admin', 'supervisor']}>
            <TitledRoute title="Notifications">
              <NotificationsPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },

      /* Instructor Routes */
      {
        path: 'instructor/dashboard',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <TitledRoute title="Instructor Dashboard">
              <InstructorDashboardPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'instructor/courses',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <TitledRoute title="My Taught Courses">
              <InstructorCoursesPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'instructor/courses/new',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <TitledRoute title="Course Builder">
              <InstructorCreateCoursePage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'instructor/question-bank',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <TitledRoute title="Question Bank">
              <InstructorQuestionBankPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'instructor/exam-settings',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <TitledRoute title="Exam Settings">
              <InstructorExamSettingsPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'instructor/students',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <TitledRoute title="Enrolled Students">
              <InstructorStudentsPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'instructor/comments',
        element: (
          <RoleGuard allowedRoles={['instructor']}>
            <TitledRoute title="Comments Inbox">
              <InstructorCommentsPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },

      /* Admin Routes */
      {
        path: 'admin/dashboard',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <TitledRoute title="Admin Dashboard">
              <AdminDashboardPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <TitledRoute title="User Management">
              <AdminUsersPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'admin/courses',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <TitledRoute title="Course Oversight">
              <AdminCoursesPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'admin/categories',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <TitledRoute title="Categories Management">
              <AdminCategoriesPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'admin/certificates',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <TitledRoute title="Issued Certificates">
              <AdminCertificatesPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'admin/settings',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <TitledRoute title="Platform Settings">
              <AdminSettingsPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },

      /* Supervisor Routes */
      {
        path: 'supervisor/dashboard',
        element: (
          <RoleGuard allowedRoles={['supervisor']}>
            <TitledRoute title="Supervisor Dashboard">
              <SupervisorDashboardPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'supervisor/comments',
        element: (
          <RoleGuard allowedRoles={['supervisor']}>
            <TitledRoute title="Comment Moderation">
              <SupervisorCommentsPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'supervisor/course-review',
        element: (
          <RoleGuard allowedRoles={['supervisor']}>
            <TitledRoute title="Course Review Queue">
              <SupervisorCourseReviewPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },
      {
        path: 'supervisor/reports',
        element: (
          <RoleGuard allowedRoles={['supervisor']}>
            <TitledRoute title="Flagged Content & Reports">
              <SupervisorReportsPage />
            </TitledRoute>
          </RoleGuard>
        ),
      },

      /* Explicit Error Routes */
      {
        path: '403',
        element: (
          <AdaptiveShell>
            <TitledRoute title="Access Denied (403)">
              <Forbidden403Page />
            </TitledRoute>
          </AdaptiveShell>
        ),
      },
      {
        path: '404',
        element: (
          <AdaptiveShell>
            <TitledRoute title="Page Not Found (404)">
              <NotFound404Page />
            </TitledRoute>
          </AdaptiveShell>
        ),
      },
      {
        path: '500',
        element: (
          <AdaptiveShell>
            <TitledRoute title="Something Went Wrong (500)">
              <Server500Page />
            </TitledRoute>
          </AdaptiveShell>
        ),
      },
      {
        path: '*',
        element: (
          <AdaptiveShell>
            <TitledRoute title="Page Not Found (404)">
              <NotFound404Page />
            </TitledRoute>
          </AdaptiveShell>
        ),
      },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
