import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Award,
  BookOpen,
  Check,
  Edit3,
  FolderKanban,
  GripVertical,
  Mail,
  Minus,
  PlusCircle,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { isApiError } from '../../api/errors';
import {
  useAdminApproveCourseMutation,
  useAdminCategories,
  useAdminCertificates,
  useAdminCourses,
  useAdminCourseTabCounts,
  useAdminDashboard,
  useAdminDeleteCourseMutation,
  useDeleteAdminUserMutation,
  useAdminFeatureCourseMutation,
  useAdminOverrideCourseStatusMutation,
  useAdminPermissions,
  useAdminRejectCourseMutation,
  useAdminSettings,
  useAdminUnpublishCourseMutation,
  useAdminUsers,
  useApproveInstructorAppMutation,
  useBulkAdminUsersMutation,
  useCreateAdminCategoryMutation,
  useCreateAdminUserMutation,
  useDeleteAdminCategoryMutation,
  useRejectInstructorAppMutation,
  useReorderAdminCategoriesMutation,
  useRestoreCertificateMutation,
  useRevokeCertificateMutation,
  useUpdateAdminCategoryMutation,
  useUpdateAdminUserMutation,
  useUpdatePlatformSettingsMutation,
} from '../../api/hooks/useAdmin';
import {
  ADMIN_USER_STATUS_TO_DTO,
  formatTrendPercent,
  type MappedAdminCourse,
} from '../../api/mappers/admin.mapper';
import { COURSE_STATUS_LABELS, toCourseStatusDto } from '../../api/mappers/course.mapper';
import type {
  AdminUserRecord,
  AuthenticatedRoleDto,
  Category,
  CertificateStatusDto,
  CourseStatus,
  CourseStatusDto,
} from '../../api/dto-types-bridge';
import {
  Avatar,
  Breadcrumbs,
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  FeaturedStickerTag,
  Modal,
  Pagination,
  QueryErrorState,
  Skeleton,
  StatusChip,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { handleImageError } from '../../utils/imageFallback';

function parsePositivePage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

const ADMIN_COURSE_STATUS_TABS: ReadonlyArray<{
  id: 'All' | CourseStatus;
  dtoStatus: CourseStatusDto | 'all';
  label: string;
}> = [
  { id: 'All', dtoStatus: 'all', label: 'All' },
  { id: 'Pending review', dtoStatus: 'pending_review', label: 'Pending' },
  { id: 'Published', dtoStatus: 'published', label: 'Published' },
  { id: 'Rejected', dtoStatus: 'rejected', label: 'Rejected' },
  { id: 'Draft', dtoStatus: 'draft', label: 'Draft' },
];

const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * 1024 * 1024;

/**
 * Reusable Course Workflow Callout shown in both Admin and Supervisor areas:
 * Draft -> Pending review (submitted by instructor) -> Published or Rejected (with reason).
 * The Supervisor reviews; the Admin can override any status.
 */
export const CourseWorkflowBanner: React.FC<{ roleMode: 'admin' | 'supervisor' }> = ({
  roleMode,
}) => (
  <div className="rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5] p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#6D4AE0]">
        <span>Course publication workflow</span>
        <span>•</span>
        <span className="text-[#3F2A9E]">
          {roleMode === 'admin'
            ? 'The Supervisor reviews; the Admin can override any status'
            : 'Submitted by Instructor → Reviewed by Supervisor → Admin can override any status'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[13px] font-bold">
        <span className="px-2.5 py-1 rounded-full bg-white border border-[#E6E1F5] text-[#5F5B75]">
          1. Draft
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-[#6D4AE0]" />
        <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#B45309]">
          2. Pending review (Instructor submits)
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-[#6D4AE0]" />
        <span className="px-2.5 py-1 rounded-full bg-[#16A34A]/15 text-[#16A34A]">
          3a. Published
        </span>
        <span className="text-[#5F5B75] font-normal">or</span>
        <span className="px-2.5 py-1 rounded-full bg-[#FEF2F2] text-[#DC2626]">
          3b. Rejected (with reason)
        </span>
      </div>
    </div>
    <StatusChip
      label={roleMode === 'admin' ? 'Admin override active' : 'Supervisor review queue'}
      variant={roleMode === 'admin' ? 'info' : 'success'}
      className="bg-white self-start lg:self-center shrink-0"
    />
  </div>
);

// ============================================================================
// 1. ADMIN DASHBOARD (/admin/dashboard)
// ============================================================================
export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const dashboardQuery = useAdminDashboard();
  const approveCourseMutation = useAdminApproveCourseMutation();
  const approveInstructorMutation = useApproveInstructorAppMutation();
  const rejectInstructorMutation = useRejectInstructorAppMutation();

  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(5);
  const [approvingCourseId, setApprovingCourseId] = useState<string | null>(null);
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);

  const adminName = user?.name || 'Admin';
  const dashboard = dashboardQuery.data;

  useEffect(() => {
    if (dashboard && dashboard.userGrowth6Months.length > 0) {
      setSelectedMonthIdx((prev) =>
        prev >= 0 && prev < dashboard.userGrowth6Months.length
          ? prev
          : dashboard.userGrowth6Months.length - 1
      );
    }
  }, [dashboard]);

  const chartW = 540;
  const chartH = 175;
  const growthData = dashboard?.userGrowth6Months ?? [];
  const growthPts = useMemo(() => {
    if (growthData.length === 0) return [];
    const maxVal = Math.max(
      100,
      ...growthData.map((pt) => pt.users)
    );
    const scaleMax = Math.ceil(maxVal * 1.12);
    return growthData.map((m, idx) => {
      const ratio =
        growthData.length > 1 ? idx / (growthData.length - 1) : 0.5;
      const x = Math.round(ratio * (chartW - 48) + 24);
      const y = Math.round(chartH - 28 - (m.users / scaleMax) * (chartH - 52));
      return { ...m, x, y, idx };
    });
  }, [growthData]);

  const polyStr = growthPts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaStr =
    growthPts.length > 0
      ? `${growthPts[0].x},${chartH - 24} ${polyStr} ${
          growthPts[growthPts.length - 1].x
        },${chartH - 24}`
      : '';

  const activePoint =
    growthPts[selectedMonthIdx] ?? growthPts[growthPts.length - 1] ?? null;

  const donutRadius = 56;
  const donutCircumference = 2 * Math.PI * donutRadius;

  const donutSegments = useMemo(() => {
    let cumulative = 0;
    return (dashboard?.categoryDistribution ?? []).map((seg) => {
      const strokeDasharray = `${
        (seg.percent / 100) * donutCircumference
      } ${donutCircumference}`;
      const strokeDashoffset = -((cumulative / 100) * donutCircumference);
      cumulative += seg.percent;
      return {
        ...seg,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [dashboard?.categoryDistribution, donutCircumference]);

  const totalEnrollmentsShort = useMemo(() => {
    const total = dashboard?.kpis.totalEnrollmentsCount ?? 0;
    if (total >= 1000) return `${(total / 1000).toFixed(1)}k`;
    return String(total);
  }, [dashboard?.kpis.totalEnrollmentsCount]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <StatusChip label="Platform administration" variant="info" />
          <h1 className="text-[34px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Welcome, {adminName}
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Monitor global platform growth, approve courses and instructors, and manage
            system policies.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/admin/users">
            <Button variant="primary">Manage users</Button>
          </Link>
          <Link to="/admin/settings">
            <Button variant="secondary" leftIcon={<Settings className="w-4 h-4" />}>
              Settings & permissions
            </Button>
          </Link>
        </div>
      </div>

      {dashboardQuery.isError ? (
        <QueryErrorState
          error={dashboardQuery.error}
          onRetry={() => void dashboardQuery.refetch()}
        />
      ) : dashboardQuery.isLoading || !dashboard ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-[12px] bg-white border border-[#E6E1F5] p-5 shadow-purple-sm space-y-3"
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-36" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Skeleton className="lg:col-span-7 h-72 rounded-[12px]" />
            <Skeleton className="lg:col-span-5 h-72 rounded-[12px]" />
          </div>
        </>
      ) : (
        <>
          {/* 1. 4 KPI CARDS WITH TREND % */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                label: 'Users',
                value: dashboard.kpis.totalUsersCount.toLocaleString(),
                trend: formatTrendPercent(dashboard.kpis.usersGrowthPercent),
                sub: 'vs. last 30 days',
                icon: <Users className="w-5 h-5 text-[#6D4AE0]" />,
                to: '/admin/users',
              },
              {
                label: 'Courses',
                value: dashboard.kpis.totalCoursesCount.toLocaleString(),
                trend: formatTrendPercent(dashboard.kpis.coursesGrowthPercent),
                sub: `${dashboard.kpis.pendingCoursesCount} awaiting approval`,
                icon: <BookOpen className="w-5 h-5 text-[#2563EB]" />,
                to: '/admin/courses',
              },
              {
                label: 'Enrollments',
                value: dashboard.kpis.totalEnrollmentsCount.toLocaleString(),
                trend: formatTrendPercent(dashboard.kpis.enrollmentsGrowthPercent),
                sub: `Across ${dashboard.kpis.categoriesCount} categories`,
                icon: <FolderKanban className="w-5 h-5 text-[#F59E3B]" />,
                to: '/admin/categories',
              },
              {
                label: 'Certificates issued',
                value: dashboard.kpis.certificatesIssuedCount.toLocaleString(),
                trend: formatTrendPercent(dashboard.kpis.certificatesGrowthPercent),
                sub: `${dashboard.kpis.validCertificatesPercent}% valid credentials`,
                icon: <Award className="w-5 h-5 text-[#16A34A]" />,
                to: '/admin/certificates',
              },
            ].map((kpi) => (
              <Link
                key={kpi.label}
                to={kpi.to}
                className="rounded-[12px] bg-white border border-[#E6E1F5] hover:border-[#A78BFA] p-5 shadow-purple-sm hover:shadow-purple-md transition-all flex items-start justify-between"
              >
                <div className="space-y-1">
                  <p className="text-[14px] text-[#5F5B75] font-medium">{kpi.label}</p>
                  <p className="font-display font-bold text-[32px] text-[#1E1B2E] leading-none">
                    {kpi.value}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1 text-[12px]">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#16A34A]/12 text-[#16A34A] font-bold">
                      <TrendingUp className="w-3 h-3" />
                      {kpi.trend}
                    </span>
                    <span className="text-[#5F5B75]">{kpi.sub}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-[10px] bg-[#F3EFFF] flex items-center justify-center shrink-0">
                  {kpi.icon}
                </div>
              </Link>
            ))}
          </div>

          {/* 2. USER GROWTH LINE CHART & ENROLLMENTS BY CATEGORY DONUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* User Growth Line Chart */}
            <div className="lg:col-span-7 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                    User growth (last 6 months)
                  </h2>
                  <p className="text-[13px] text-[#5F5B75]">
                    Registered accounts vs. monthly active learners
                  </p>
                </div>
                {activePoint && (
                  <div className="px-3 py-1.5 rounded-[10px] bg-[#F3EFFF] border border-[#E6E1F5] text-[13px]">
                    <span className="text-[#5F5B75]">{activePoint.month}: </span>
                    <strong className="text-[#6D4AE0]">
                      {activePoint.users.toLocaleString()} users
                    </strong>
                  </div>
                )}
              </div>

              {growthPts.length > 0 && (
                <div className="w-full overflow-x-auto pt-2">
                  <svg
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    className="w-full h-44 overflow-visible"
                    role="img"
                    aria-label="User growth line chart"
                  >
                    <defs>
                      <linearGradient id="adminGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6D4AE0" stopOpacity="0.26" />
                        <stop offset="100%" stopColor="#6D4AE0" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {[35, 80, 125].map((yLine) => (
                      <line
                        key={yLine}
                        x1="24"
                        y1={yLine}
                        x2={chartW - 24}
                        y2={yLine}
                        stroke="#E6E1F5"
                        strokeDasharray="4 4"
                      />
                    ))}
                    <polygon points={areaStr} fill="url(#adminGrowthGrad)" />
                    <polyline
                      fill="none"
                      stroke="#6D4AE0"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polyStr}
                    />
                    {growthPts.map((pt) => {
                      const active = pt.idx === selectedMonthIdx;
                      return (
                        <g
                          key={pt.month}
                          onClick={() => setSelectedMonthIdx(pt.idx)}
                          className="cursor-pointer"
                        >
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={active ? 7 : 5}
                            fill={active ? '#6D4AE0' : '#FFFFFF'}
                            stroke="#6D4AE0"
                            strokeWidth="2.5"
                          />
                          <text
                            x={pt.x}
                            y={chartH - 5}
                            textAnchor="middle"
                            className="text-[11px] fill-[#5F5B75] font-bold"
                          >
                            {pt.month}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>

            {/* Enrollments by Category Donut */}
            <div className="lg:col-span-5 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                  Enrollments by category
                </h2>
                <p className="text-[13px] text-[#5F5B75]">
                  Distribution across{' '}
                  {dashboard.kpis.totalEnrollmentsCount.toLocaleString()} total course
                  enrollments
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                  <svg
                    width="144"
                    height="144"
                    viewBox="0 0 144 144"
                    className="-rotate-90"
                  >
                    {donutSegments.map((seg) => (
                      <circle
                        key={seg.id}
                        cx="72"
                        cy="72"
                        r={donutRadius}
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="18"
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-display font-bold text-[20px] text-[#1E1B2E] leading-none">
                      {totalEnrollmentsShort}
                    </span>
                    <span className="text-[10px] font-semibold text-[#5F5B75]">total</span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-2 text-[13px]">
                  {dashboard.categoryDistribution.map((seg) => (
                    <div
                      key={seg.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2 text-[#1E1B2E] font-medium">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: seg.color }}
                        />
                        {seg.name}
                      </span>
                      <span className="font-bold text-[#1E1B2E]">{seg.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. USERS BY ROLE CHART, PENDING APPROVALS WIDGET & RECENT ACTIVITY FEED */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Users by Role Chart */}
            <div className="lg:col-span-4 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
              <div>
                <h2 className="text-[20px] font-display font-bold text-[#1E1B2E]">
                  Users by role
                </h2>
                <p className="text-[13px] text-[#5F5B75]">
                  Breakdown of {dashboard.kpis.totalUsersCount.toLocaleString()} platform
                  accounts
                </p>
              </div>

              <div className="space-y-3.5">
                {dashboard.usersByRole.map((r) => (
                  <div key={r.role} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold text-[#1E1B2E]">{r.role}</span>
                      <span className="text-[#5F5B75] font-semibold">{r.badge}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[#FAF8FF] border border-[#E6E1F5] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${r.percent}%`, backgroundColor: r.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Approvals Widget */}
            <div className="lg:col-span-4 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[20px] font-display font-bold text-[#1E1B2E]">
                    Pending approvals
                  </h2>
                  <p className="text-[13px] text-[#5F5B75]">
                    Courses & instructor applications
                  </p>
                </div>
                <StatusChip
                  label={`${
                    dashboard.pendingCourses.length +
                    dashboard.pendingInstructorApplications.length
                  } pending`}
                  variant="warning"
                />
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6D4AE0]">
                  Courses awaiting approval ({dashboard.pendingCourses.length})
                </p>
                {dashboard.pendingCourses.length === 0 ? (
                  <p className="text-[12px] text-[#5F5B75]">
                    No pending course submissions.
                  </p>
                ) : (
                  dashboard.pendingCourses.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#1E1B2E] truncate">
                          {c.title}
                        </p>
                        <p className="text-[11px] text-[#5F5B75]">
                          By {c.instructorName}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        loading={
                          approvingCourseId === c.id && approveCourseMutation.isPending
                        }
                        disabled={approveCourseMutation.isPending}
                        onClick={async () => {
                          setApprovingCourseId(c.id);
                          try {
                            await approveCourseMutation.mutateAsync({
                              courseId: c.id,
                              courseTitle: c.title,
                            });
                          } finally {
                            setApprovingCourseId(null);
                          }
                        }}
                      >
                        Approve
                      </Button>
                    </div>
                  ))
                )}

                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6D4AE0] pt-1">
                  Instructor applications (
                  {dashboard.pendingInstructorApplications.length})
                </p>
                {dashboard.pendingInstructorApplications.length === 0 ? (
                  <p className="text-[12px] text-[#5F5B75]">
                    All instructor applications reviewed.
                  </p>
                ) : (
                  dashboard.pendingInstructorApplications.map((app) => (
                    <div
                      key={app.id}
                      className="p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar src={app.avatar} name={app.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[#1E1B2E] truncate">
                            {app.name}
                          </p>
                          <p className="text-[11px] text-[#5F5B75] truncate">
                            {app.specialty}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={
                            approveInstructorMutation.isPending ||
                            rejectInstructorMutation.isPending
                          }
                          onClick={async () => {
                            setProcessingAppId(app.id);
                            try {
                              await rejectInstructorMutation.mutateAsync({
                                applicationId: app.id,
                                name: app.name,
                              });
                            } finally {
                              setProcessingAppId(null);
                            }
                          }}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={
                            processingAppId === app.id &&
                            approveInstructorMutation.isPending
                          }
                          disabled={
                            approveInstructorMutation.isPending ||
                            rejectInstructorMutation.isPending
                          }
                          onClick={async () => {
                            setProcessingAppId(app.id);
                            try {
                              await approveInstructorMutation.mutateAsync({
                                applicationId: app.id,
                                name: app.name,
                              });
                            } finally {
                              setProcessingAppId(null);
                            }
                          }}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="lg:col-span-4 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
              <div>
                <h2 className="text-[20px] font-display font-bold text-[#1E1B2E]">
                  Recent activity feed
                </h2>
                <p className="text-[13px] text-[#5F5B75]">Live platform audit log</p>
              </div>

              {dashboard.recentActivity.length === 0 ? (
                <p className="text-[13px] text-[#5F5B75]">No recent audit events.</p>
              ) : (
                <div className="space-y-3 text-[13px]">
                  {dashboard.recentActivity.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#1E1B2E]">{ev.title}</span>
                        <span className="text-[11px] text-[#5F5B75] shrink-0">
                          {ev.time}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#5F5B75]">{ev.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// 2. ADMIN USERS (/admin/users)
// ============================================================================
export const AdminUsersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get('q') ?? '';
  const roleParam = searchParams.get('role') ?? 'all';
  const statusParam = searchParams.get('status') ?? 'all';
  const page = parsePositivePage(searchParams.get('page'));

  const [searchInput, setSearchInput] = useState(qParam);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  useEffect(() => {
    if (debouncedSearch !== qParam) {
      setSearchParams({
        ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
        ...(roleParam !== 'all' ? { role: roleParam } : {}),
        ...(statusParam !== 'all' ? { status: statusParam } : {}),
        page: '1',
      });
    }
  }, [debouncedSearch, qParam, roleParam, statusParam, setSearchParams]);

  const roleDto: AuthenticatedRoleDto | 'all' =
    roleParam === 'student' ||
    roleParam === 'instructor' ||
    roleParam === 'supervisor' ||
    roleParam === 'admin'
      ? roleParam
      : 'all';

  const statusDto =
    statusParam === 'Active' ||
    statusParam === 'Suspended' ||
    statusParam === 'Pending'
      ? ADMIN_USER_STATUS_TO_DTO[statusParam]
      : 'all';

  const usersQuery = useAdminUsers({
    q: debouncedSearch.trim() || undefined,
    role: roleDto,
    status: statusDto,
    page,
    limit: 12,
  });

  const createUserMutation = useCreateAdminUserMutation();
  const updateUserMutation = useUpdateAdminUserMutation();
  const deleteUserMutation = useDeleteAdminUserMutation();
  const bulkUsersMutation = useBulkAdminUsersMutation();

  const users = useMemo(
    () => usersQuery.data?.items ?? [],
    [usersQuery.data?.items]
  );
  const meta = usersQuery.data?.meta;

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AdminUserRecord['role']>('student');
  const [newTempPassword, setNewTempPassword] = useState('EduHub#2026Temp!');
  const [sendInviteToggle, setSendInviteToggle] = useState(true);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  const [userToDelete, setUserToDelete] = useState<AdminUserRecord | null>(null);
  const [suspendConfirmTarget, setSuspendConfirmTarget] =
    useState<AdminUserRecord | null>(null);
  const [bulkSuspendConfirmOpen, setBulkSuspendConfirmOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const detailUser = useMemo(
    () => (detailUserId ? users.find((u) => u.id === detailUserId) ?? null : null),
    [detailUserId, users]
  );

  useEffect(() => {
    const visibleIds = new Set(users.map((u) => u.id));
    setSelectedUserIds((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) => visibleIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [users]);

  const updateUrlParams = (patch: {
    q?: string;
    role?: string;
    status?: string;
    page?: number;
  }) => {
    const nextQ = patch.q !== undefined ? patch.q : debouncedSearch.trim();
    const nextRole = patch.role !== undefined ? patch.role : roleParam;
    const nextStatus = patch.status !== undefined ? patch.status : statusParam;
    const nextPage = patch.page !== undefined ? patch.page : page;
    setSearchParams({
      ...(nextQ ? { q: nextQ } : {}),
      ...(nextRole !== 'all' ? { role: nextRole } : {}),
      ...(nextStatus !== 'all' ? { status: nextStatus } : {}),
      page: String(nextPage),
    });
  };

  const handleCreateUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = newName.trim();
    const trimmedEmail = newEmail.trim();
    const nextErrors: Record<string, string> = {};

    if (trimmedName.length < 2) {
      nextErrors.name = 'Full name must be at least 2 characters.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (
      newTempPassword.length < 8 ||
      !/[A-Z]/.test(newTempPassword) ||
      !/[0-9]/.test(newTempPassword) ||
      !/[^A-Za-z0-9]/.test(newTempPassword)
    ) {
      nextErrors.temporaryPassword =
        'Password requires 8+ chars with uppercase, number, and symbol.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setCreateErrors(nextErrors);
      return;
    }

    setCreateErrors({});
    try {
      await createUserMutation.mutateAsync({
        name: trimmedName,
        email: trimmedEmail,
        role: newRole,
        temporaryPassword: newTempPassword,
        sendInvite: sendInviteToggle,
      });
      setNewName('');
      setNewEmail('');
      setNewRole('student');
      setAddUserModalOpen(false);
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 409) {
          setCreateErrors({ email: err.message });
        } else if (err.status === 422 && err.fieldErrors) {
          setCreateErrors({
            ...(err.fieldErrors.name?.[0] ? { name: err.fieldErrors.name[0] } : {}),
            ...(err.fieldErrors.email?.[0] ? { email: err.fieldErrors.email[0] } : {}),
            ...(err.fieldErrors.temporaryPassword?.[0]
              ? { temporaryPassword: err.fieldErrors.temporaryPassword[0] }
              : {}),
          });
        }
      }
    }
  };

  const handleChangeRole = async (
    targetUser: AdminUserRecord,
    nextRole: AdminUserRecord['role']
  ) => {
    setUpdatingUserId(targetUser.id);
    try {
      await updateUserMutation.mutateAsync({
        userId: targetUser.id,
        userName: targetUser.name,
        payload: { role: nextRole },
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleSuspend = async (targetUser: AdminUserRecord) => {
    const nextStatus = targetUser.status === 'Suspended' ? 'active' : 'suspended';
    setUpdatingUserId(targetUser.id);
    try {
      await updateUserMutation.mutateAsync({
        userId: targetUser.id,
        userName: targetUser.name,
        payload: { status: nextStatus },
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleBulkAction = async (action: 'activate' | 'suspend' | 'delete') => {
    if (selectedUserIds.length === 0) return;
    await bulkUsersMutation.mutateAsync({ ids: selectedUserIds, action });
    setSelectedUserIds([]);
  };

  const rangeStart = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const rangeEnd = meta ? Math.min(meta.page * meta.limit, meta.total) : users.length;

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Admin dashboard', to: '/admin/dashboard' },
          { label: 'Users' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            User management
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Manage student, instructor, supervisor, and administrator accounts.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<PlusCircle className="w-4 h-4" />}
          onClick={() => {
            setCreateErrors({});
            setAddUserModalOpen(true);
          }}
        >
          Add user
        </Button>
      </div>

      {/* Filters & Bulk Actions Bar */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#5F5B75] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or email..."
              aria-label="Search users by name or email"
              className="w-full h-11 pl-9 pr-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] focus:outline-none focus:border-[#6D4AE0]"
            />
          </div>
          <select
            value={roleParam}
            onChange={(e) => updateUrlParams({ role: e.target.value, page: 1 })}
            aria-label="Filter by role"
            className="h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-bold text-[#1E1B2E]"
          >
            <option value="all">All roles</option>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={statusParam}
            onChange={(e) => updateUrlParams({ status: e.target.value, page: 1 })}
            aria-label="Filter by status"
            className="h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-bold text-[#1E1B2E]"
          >
            <option value="all">All statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        {selectedUserIds.length > 0 && (
          <div className="pt-3 border-t border-[#E6E1F5] flex flex-wrap items-center justify-between gap-3 bg-[#F3EFFF] px-4 py-2.5 rounded-[10px]">
            <span className="text-[13px] font-bold text-[#3F2A9E]">
              {selectedUserIds.length} user(s) selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                loading={bulkUsersMutation.isPending}
                disabled={bulkUsersMutation.isPending}
                onClick={() => void handleBulkAction('activate')}
              >
                Activate selected
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={bulkUsersMutation.isPending}
                onClick={() => setBulkSuspendConfirmOpen(true)}
              >
                Suspend selected
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={bulkUsersMutation.isPending}
                onClick={() => setBulkDeleteConfirmOpen(true)}
              >
                Delete selected
              </Button>
            </div>
          </div>
        )}
      </div>

      {usersQuery.isError ? (
        <QueryErrorState
          error={usersQuery.error}
          onRetry={() => void usersQuery.refetch()}
        />
      ) : usersQuery.isLoading ? (
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-14 w-full rounded-[10px]" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          title="No matching accounts"
          description="No platform users matched the selected filters or search query."
          actionLabel="Clear filters"
          onAction={() => {
            setSearchInput('');
            setSearchParams({ page: '1' });
          }}
        />
      ) : (
        <>
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px] min-w-[780px]">
                <thead>
                  <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all visible users"
                        checked={
                          users.length > 0 &&
                          users.every((u) => selectedUserIds.includes(u.id))
                        }
                        onChange={(e) =>
                          setSelectedUserIds(
                            e.target.checked ? users.map((u) => u.id) : []
                          )
                        }
                        className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Joined</th>
                    <th className="py-3.5 px-4">Last login</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1F5]">
                  {users.map((u) => {
                    const isRowPending =
                      updatingUserId === u.id && updateUserMutation.isPending;
                    return (
                      <tr key={u.id} className="hover:bg-[#FAF8FF]">
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            aria-label={`Select user ${u.name}`}
                            checked={selectedUserIds.includes(u.id)}
                            onChange={() =>
                              setSelectedUserIds((prev) =>
                                prev.includes(u.id)
                                  ? prev.filter((id) => id !== u.id)
                                  : [...prev, u.id]
                              )
                            }
                            className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => setDetailUserId(u.id)}
                            className="flex items-center gap-3 text-left cursor-pointer group"
                          >
                            <Avatar src={u.avatar} name={u.name} size="sm" />
                            <div>
                              <p className="font-bold text-[#1E1B2E] group-hover:text-[#6D4AE0]">
                                {u.name}
                              </p>
                              <p className="text-[12px] text-[#5F5B75]">{u.email}</p>
                            </div>
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={u.role}
                            disabled={isRowPending}
                            onChange={(e) =>
                              void handleChangeRole(
                                u,
                                e.target.value as AdminUserRecord['role']
                              )
                            }
                            aria-label={`Change role for ${u.name}`}
                            className="h-8 px-2.5 rounded-full bg-[#F3EFFF] border border-[#E6E1F5] text-[12px] font-bold text-[#3F2A9E] capitalize cursor-pointer disabled:opacity-60"
                          >
                            <option value="student">Student</option>
                            <option value="instructor">Instructor</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusChip
                            label={u.status}
                            variant={
                              u.status === 'Active'
                                ? 'success'
                                : u.status === 'Suspended'
                                ? 'danger'
                                : 'warning'
                            }
                          />
                        </td>
                        <td className="py-3.5 px-4 text-[13px] text-[#5F5B75]">
                          {u.joinedAt}
                        </td>
                        <td className="py-3.5 px-4 text-[13px] text-[#5F5B75]">
                          {u.lastLogin}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1 relative">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDetailUserId(u.id)}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={isRowPending}
                              disabled={updateUserMutation.isPending}
                              onClick={() => {
                                if (u.status === 'Suspended') {
                                  void handleToggleSuspend(u);
                                } else {
                                  setSuspendConfirmTarget(u);
                                }
                              }}
                            >
                              {u.status === 'Suspended' ? 'Activate' : 'Suspend'}
                            </Button>
                            <button
                              type="button"
                              disabled={deleteUserMutation.isPending}
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-[#5F5B75]">
              Showing <strong>{rangeStart}–{rangeEnd}</strong> of{' '}
              <strong>{meta?.total ?? users.length}</strong> accounts
            </p>
            {meta && meta.totalPages > 1 && (
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPages}
                onPageChange={(nextPage) => updateUrlParams({ page: nextPage })}
              />
            )}
          </div>
        </>
      )}

      {/* ADD USER MODAL */}
      <Modal
        open={addUserModalOpen}
        onClose={() => setAddUserModalOpen(false)}
        title="Add new platform user"
        description="Create a student, instructor, supervisor, or admin account."
        footer={
          <>
            <Button
              variant="ghost"
              disabled={createUserMutation.isPending}
              onClick={() => setAddUserModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createUserMutation.isPending}
              onClick={() => void handleCreateUser()}
            >
              Create user
            </Button>
          </>
        }
      >
        <form onSubmit={(e) => void handleCreateUser(e)} className="space-y-4 text-[14px]">
          <div className="space-y-1">
            <label htmlFor="admin-create-name" className="block font-bold text-[#1E1B2E]">
              Full name *
            </label>
            <input
              id="admin-create-name"
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setCreateErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="e.g. Hassan Mahmoud"
              required
              className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5]"
            />
            {createErrors.name && (
              <p className="text-[12px] text-[#DC2626] font-bold">{createErrors.name}</p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="admin-create-email" className="block font-bold text-[#1E1B2E]">
              Email address *
            </label>
            <input
              id="admin-create-email"
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setCreateErrors((prev) => ({ ...prev, email: '' }));
              }}
              placeholder="hassan@eduhub.com"
              required
              className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5]"
            />
            {createErrors.email && (
              <p className="text-[12px] text-[#DC2626] font-bold">{createErrors.email}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="admin-create-role" className="block font-bold text-[#1E1B2E]">
                Role
              </label>
              <select
                id="admin-create-role"
                value={newRole}
                onChange={(e) =>
                  setNewRole(e.target.value as AdminUserRecord['role'])
                }
                className="w-full h-11 px-3 rounded-[10px] bg-white border border-[#E6E1F5] font-semibold"
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="admin-create-pass" className="block font-bold text-[#1E1B2E]">
                Temporary password
              </label>
              <input
                id="admin-create-pass"
                type="text"
                value={newTempPassword}
                onChange={(e) => {
                  setNewTempPassword(e.target.value);
                  setCreateErrors((prev) => ({ ...prev, temporaryPassword: '' }));
                }}
                className="w-full h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-mono text-[12px]"
              />
              {createErrors.temporaryPassword && (
                <p className="text-[12px] text-[#DC2626] font-bold">
                  {createErrors.temporaryPassword}
                </p>
              )}
            </div>
          </div>
          <label className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[#6D4AE0]" />
              <div>
                <p className="font-bold text-[13px] text-[#1E1B2E]">Send invite email</p>
                <p className="text-[11px] text-[#5F5B75]">
                  Emails a one-click onboarding link & temporary password
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={sendInviteToggle}
              onChange={(e) => setSendInviteToggle(e.target.checked)}
              className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
            />
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        title="Delete user account?"
        description={
          userToDelete
            ? `Are you sure you want to permanently delete ${userToDelete.name} (${userToDelete.email}) and their session history?`
            : ''
        }
        confirmLabel="Confirm delete"
        tone="danger"
        loading={deleteUserMutation.isPending}
        onConfirm={() => {
          if (!userToDelete) return;
          void deleteUserMutation
            .mutateAsync({
              userId: userToDelete.id,
              userName: userToDelete.name,
            })
            .then(() => {
              if (detailUserId === userToDelete.id) setDetailUserId(null);
              setUserToDelete(null);
            });
        }}
      />

      <ConfirmDialog
        open={Boolean(suspendConfirmTarget)}
        onClose={() => setSuspendConfirmTarget(null)}
        title="Suspend this user?"
        description={
          suspendConfirmTarget
            ? `${suspendConfirmTarget.name} will be immediately blocked from accessing active courses and sessions until reactivated.`
            : ''
        }
        confirmLabel="Suspend user"
        tone="danger"
        loading={updateUserMutation.isPending}
        onConfirm={() => {
          if (!suspendConfirmTarget) return;
          void handleToggleSuspend(suspendConfirmTarget).then(() =>
            setSuspendConfirmTarget(null)
          );
        }}
      />

      <ConfirmDialog
        open={bulkSuspendConfirmOpen}
        onClose={() => setBulkSuspendConfirmOpen(false)}
        title={`Suspend ${selectedUserIds.length} selected accounts?`}
        description="Selected users will be paused from signing in until reactivated by an administrator."
        confirmLabel="Suspend selected"
        tone="danger"
        loading={bulkUsersMutation.isPending}
        onConfirm={() => {
          void handleBulkAction('suspend').then(() =>
            setBulkSuspendConfirmOpen(false)
          );
        }}
      />

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        title={`Delete ${selectedUserIds.length} selected user accounts?`}
        description="This permanently deletes the selected accounts and cannot be undone."
        confirmLabel="Delete selected"
        tone="danger"
        loading={bulkUsersMutation.isPending}
        onConfirm={() => {
          void handleBulkAction('delete').then(() =>
            setBulkDeleteConfirmOpen(false)
          );
        }}
      />

      {/* USER DETAIL DRAWER WITH ACTIVITY */}
      <Drawer
        open={Boolean(detailUser)}
        onClose={() => setDetailUserId(null)}
        title={detailUser ? `${detailUser.name} — Account` : 'User details'}
        footer={
          <Button variant="primary" fullWidth onClick={() => setDetailUserId(null)}>
            Done
          </Button>
        }
      >
        {detailUser && (
          <div className="space-y-6 text-[14px]">
            <div className="p-4 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center gap-4">
              <Avatar src={detailUser.avatar} name={detailUser.name} size="lg" />
              <div>
                <StatusChip
                  label={detailUser.status}
                  variant={detailUser.status === 'Active' ? 'success' : 'danger'}
                />
                <h4 className="font-display font-bold text-[20px] text-[#1E1B2E] mt-1">
                  {detailUser.name}
                </h4>
                <p className="text-[12px] text-[#5F5B75]">{detailUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="p-3 rounded-[10px] bg-white border border-[#E6E1F5]">
                <p className="text-[#5F5B75]">Joined</p>
                <p className="font-bold text-[#1E1B2E]">{detailUser.joinedAt}</p>
              </div>
              <div className="p-3 rounded-[10px] bg-white border border-[#E6E1F5]">
                <p className="text-[#5F5B75]">Last login</p>
                <p className="font-bold text-[#1E1B2E]">{detailUser.lastLogin}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-display font-bold text-[17px] text-[#1E1B2E]">
                Recent user activity
              </h4>
              {detailUser.recentActivity.length === 0 ? (
                <p className="text-[13px] text-[#5F5B75]">
                  No recent activity events recorded for this account.
                </p>
              ) : (
                <div className="space-y-2">
                  {detailUser.recentActivity.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px]"
                    >
                      <p className="font-semibold text-[#1E1B2E]">{act.action}</p>
                      <p className="text-[11px] text-[#5F5B75] mt-0.5">{act.date}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

// ============================================================================
// 3. ADMIN COURSES (/admin/courses)
// ============================================================================
export const AdminCoursesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusTabParam = searchParams.get('status') ?? 'All';
  const qParam = searchParams.get('q') ?? '';
  const page = parsePositivePage(searchParams.get('page'));

  const activeTabDef =
    ADMIN_COURSE_STATUS_TABS.find((t) => t.id === statusTabParam) ??
    ADMIN_COURSE_STATUS_TABS[0];

  const [searchInput, setSearchInput] = useState(qParam);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  useEffect(() => {
    if (debouncedSearch !== qParam) {
      setSearchParams({
        ...(activeTabDef.id !== 'All' ? { status: activeTabDef.id } : {}),
        ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
        page: '1',
      });
    }
  }, [debouncedSearch, qParam, activeTabDef.id, setSearchParams]);

  const coursesQuery = useAdminCourses({
    status: activeTabDef.dtoStatus,
    q: debouncedSearch.trim() || undefined,
    page,
    limit: 12,
  });
  const tabCounts = useAdminCourseTabCounts(debouncedSearch);

  const approveMutation = useAdminApproveCourseMutation();
  const rejectMutation = useAdminRejectCourseMutation();
  const unpublishMutation = useAdminUnpublishCourseMutation();
  const featureMutation = useAdminFeatureCourseMutation();
  const overrideStatusMutation = useAdminOverrideCourseStatusMutation();
  const deleteMutation = useAdminDeleteCourseMutation();

  const courses = coursesQuery.data?.items ?? [];
  const meta = coursesQuery.data?.meta;

  const [rejectModalCourse, setRejectModalCourse] =
    useState<MappedAdminCourse | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [previewCourseId, setPreviewCourseId] = useState<string | null>(null);
  const [deleteCourseTarget, setDeleteCourseTarget] =
    useState<MappedAdminCourse | null>(null);
  const [mutatingCourseId, setMutatingCourseId] = useState<string | null>(null);

  const previewCourse = useMemo(
    () =>
      previewCourseId ? courses.find((c) => c.id === previewCourseId) ?? null : null,
    [previewCourseId, courses]
  );

  const updateParams = (patch: { status?: string; q?: string; page?: number }) => {
    const nextStatus = patch.status !== undefined ? patch.status : activeTabDef.id;
    const nextQ = patch.q !== undefined ? patch.q : debouncedSearch.trim();
    const nextPage = patch.page !== undefined ? patch.page : page;
    setSearchParams({
      ...(nextStatus !== 'All' ? { status: nextStatus } : {}),
      ...(nextQ ? { q: nextQ } : {}),
      page: String(nextPage),
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectModalCourse) return;
    const trimmed = rejectReasonInput.trim();
    if (trimmed.length < 8) {
      setRejectError('A clear rejection reason (at least 8 characters) is required.');
      return;
    }

    setRejectError('');
    try {
      await rejectMutation.mutateAsync({
        courseId: rejectModalCourse.id,
        courseTitle: rejectModalCourse.title,
        payload: { reason: trimmed },
      });
      setRejectReasonInput('');
      setRejectModalCourse(null);
    } catch (err) {
      if (isApiError(err) && err.status === 422) {
        setRejectError(err.fieldErrors?.reason?.[0] || err.message);
      }
    }
  };

  const getTabCount = (dtoStatus: CourseStatusDto | 'all') => tabCounts[dtoStatus];

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Admin dashboard', to: '/admin/dashboard' },
          { label: 'Courses' },
        ]}
      />

      <div>
        <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
          Course catalog governance
        </h1>
        <p className="text-[16px] text-[#5F5B75]">
          Approve, reject with a required reason, unpublish, feature, or override any course status.
        </p>
      </div>

      <CourseWorkflowBanner roleMode="admin" />

      {/* Status Tabs & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5]">
          {ADMIN_COURSE_STATUS_TABS.map((tab) => {
            const count =
              tab.dtoStatus === activeTabDef.dtoStatus && meta
                ? meta.total
                : getTabCount(tab.dtoStatus);
            const active = activeTabDef.id === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => updateParams({ status: tab.id, page: 1 })}
                className={`h-9 px-3.5 rounded-[10px] text-[13px] font-bold inline-flex items-center gap-2 cursor-pointer transition-all ${
                  active
                    ? 'bg-white text-[#6D4AE0] shadow-purple-sm'
                    : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                }`}
              >
                <span>{tab.label}</span>
                {typeof count === 'number' && (
                  <span
                    className={`px-2 py-0.5 text-[11px] rounded-full ${
                      active ? 'bg-[#F3EFFF] text-[#6D4AE0]' : 'bg-white text-[#5F5B75]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-[#5F5B75] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search courses or instructors..."
            aria-label="Search platform courses"
            className="w-full h-11 pl-9 pr-3 rounded-[10px] bg-white border border-[#E6E1F5] text-[13px] focus:outline-none focus:border-[#6D4AE0]"
          />
        </div>
      </div>

      {coursesQuery.isError ? (
        <QueryErrorState
          error={coursesQuery.error}
          onRetry={() => void coursesQuery.refetch()}
        />
      ) : coursesQuery.isLoading ? (
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-14 w-full rounded-[10px]" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          title="No courses in this status"
          description="No courses matched your status tab or search query."
          actionLabel="View all courses"
          onAction={() => {
            setSearchInput('');
            setSearchParams({ page: '1' });
          }}
        />
      ) : (
        <>
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px] min-w-[880px]">
                <thead>
                  <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                    <th className="py-3.5 px-4">Course</th>
                    <th className="py-3.5 px-4">Instructor</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Learners</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Featured</th>
                    <th className="py-3.5 px-4 text-right">Admin override actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1F5]">
                  {courses.map((c) => {
                    const rowBusy =
                      mutatingCourseId === c.id &&
                      (approveMutation.isPending || unpublishMutation.isPending);
                    return (
                      <tr key={c.id} className="hover:bg-[#FAF8FF]">
                        <td className="py-4 px-4">
                          <button
                            type="button"
                            onClick={() => setPreviewCourseId(c.id)}
                            className="flex items-center gap-3 text-left cursor-pointer group"
                          >
                            <img
                              src={c.thumbnail}
                              alt={c.title}
                              onError={handleImageError}
                              className="w-12 h-9 rounded-[6px] object-cover shrink-0 border border-[#E6E1F5]"
                            />
                            <div>
                              <p className="font-bold text-[#1E1B2E] group-hover:text-[#6D4AE0]">
                                {c.title}
                              </p>
                              <p className="text-[12px] text-[#5F5B75]">
                                {c.lessonsCount} lessons • {c.duration}
                              </p>
                              {c.status === 'Rejected' && c.rejectionReason && (
                                <p className="text-[11px] text-[#DC2626] font-semibold mt-0.5">
                                  Reason: {c.rejectionReason}
                                </p>
                              )}
                            </div>
                          </button>
                        </td>
                        <td className="py-4 px-4 font-medium text-[#1E1B2E]">
                          {c.instructorName}
                        </td>
                        <td className="py-4 px-4 text-[#5F5B75]">{c.categoryName}</td>
                        <td className="py-4 px-4 font-bold text-[#1E1B2E]">
                          {c.studentsCount.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <StatusChip
                            label={c.status}
                            variant={
                              c.status === 'Published'
                                ? 'success'
                                : c.status === 'Pending review'
                                ? 'warning'
                                : c.status === 'Rejected'
                                ? 'danger'
                                : 'neutral'
                            }
                          />
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={featureMutation.isPending}
                            onClick={() =>
                              featureMutation.mutate({
                                courseId: c.id,
                                payload: { featured: !c.featured },
                              })
                            }
                            className="cursor-pointer disabled:opacity-60"
                          >
                            {c.featured ? (
                              <FeaturedStickerTag label="Featured" />
                            ) : (
                              <span className="text-[12px] font-semibold text-[#5F5B75] hover:text-[#6D4AE0] underline">
                                + Feature
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPreviewCourseId(c.id)}
                            >
                              Preview
                            </Button>
                            {c.status !== 'Published' && (
                              <Button
                                size="sm"
                                variant="primary"
                                loading={rowBusy && approveMutation.isPending}
                                disabled={
                                  approveMutation.isPending ||
                                  unpublishMutation.isPending
                                }
                                onClick={async () => {
                                  setMutatingCourseId(c.id);
                                  try {
                                    await approveMutation.mutateAsync({
                                      courseId: c.id,
                                      courseTitle: c.title,
                                    });
                                  } finally {
                                    setMutatingCourseId(null);
                                  }
                                }}
                              >
                                Approve
                              </Button>
                            )}
                            {c.status === 'Published' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={rowBusy && unpublishMutation.isPending}
                                disabled={
                                  approveMutation.isPending ||
                                  unpublishMutation.isPending
                                }
                                onClick={async () => {
                                  setMutatingCourseId(c.id);
                                  try {
                                    await unpublishMutation.mutateAsync({
                                      courseId: c.id,
                                      courseTitle: c.title,
                                    });
                                  } finally {
                                    setMutatingCourseId(null);
                                  }
                                }}
                              >
                                Unpublish
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setRejectModalCourse(c);
                                setRejectReasonInput(c.rejectionReason || '');
                                setRejectError('');
                              }}
                            >
                              Reject
                            </Button>
                            <button
                              type="button"
                              disabled={deleteMutation.isPending}
                              onClick={() => setDeleteCourseTarget(c)}
                              className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#DC2626] cursor-pointer"
                              title="Delete course"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPages}
                onPageChange={(nextPage) => updateParams({ page: nextPage })}
              />
            </div>
          )}
        </>
      )}

      {/* REJECT COURSE MODAL */}
      <Modal
        open={Boolean(rejectModalCourse)}
        onClose={() => setRejectModalCourse(null)}
        title="Reject course submission"
        description="A rejection reason is required and will be shown to the instructor."
        footer={
          <>
            <Button
              variant="ghost"
              disabled={rejectMutation.isPending}
              onClick={() => setRejectModalCourse(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={rejectMutation.isPending}
              onClick={() => void handleConfirmReject()}
            >
              Confirm rejection
            </Button>
          </>
        }
      >
        {rejectModalCourse && (
          <div className="space-y-3 text-[14px]">
            <p className="font-bold text-[#1E1B2E]">
              Course: {rejectModalCourse.title} (by {rejectModalCourse.instructorName})
            </p>
            <textarea
              rows={3}
              aria-label="Course rejection reason"
              value={rejectReasonInput}
              disabled={rejectMutation.isPending}
              onChange={(e) => {
                setRejectReasonInput(e.target.value);
                setRejectError('');
              }}
              placeholder="Explain what the instructor must fix before re-submitting (e.g. missing captions or fewer than 20 exam questions)..."
              className="w-full p-3 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#DC2626] focus:outline-none"
            />
            {rejectError && (
              <p className="text-[12px] text-[#DC2626] font-bold">{rejectError}</p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteCourseTarget)}
        onClose={() => setDeleteCourseTarget(null)}
        title="Delete course permanently?"
        description={
          deleteCourseTarget
            ? `Are you sure you want to permanently delete "${deleteCourseTarget.title}"?`
            : ''
        }
        confirmLabel="Delete course"
        tone="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteCourseTarget) return;
          void deleteMutation
            .mutateAsync({
              courseId: deleteCourseTarget.id,
              courseTitle: deleteCourseTarget.title,
            })
            .then(() => {
              if (previewCourseId === deleteCourseTarget.id) {
                setPreviewCourseId(null);
              }
              setDeleteCourseTarget(null);
            });
        }}
      />

      {/* COURSE PREVIEW DRAWER */}
      <Drawer
        open={Boolean(previewCourse)}
        onClose={() => setPreviewCourseId(null)}
        title="Course preview & status override"
        footer={
          <Button
            variant="primary"
            fullWidth
            onClick={() => setPreviewCourseId(null)}
          >
            Close preview
          </Button>
        }
      >
        {previewCourse && (
          <div className="space-y-5 text-[14px]">
            <img
              src={previewCourse.thumbnail}
              alt={previewCourse.title}
              onError={handleImageError}
              className="w-full h-44 rounded-[12px] object-cover border border-[#E6E1F5]"
            />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusChip label={previewCourse.categoryName} variant="primary" />
                <StatusChip label={previewCourse.status} variant="info" />
              </div>
              <h3 className="font-display font-bold text-[22px] text-[#1E1B2E]">
                {previewCourse.title}
              </h3>
              <p className="text-[#5F5B75]">{previewCourse.subtitle}</p>
            </div>

            <div className="p-4 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#5F5B75]">Instructor</span>
                <strong className="text-[#1E1B2E]">
                  {previewCourse.instructorName}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F5B75]">Duration & lessons</span>
                <strong className="text-[#1E1B2E]">
                  {previewCourse.duration} ({previewCourse.lessonsCount} lessons)
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F5B75]">Price</span>
                <strong className="text-[#6D4AE0]">
                  {previewCourse.price === 0
                    ? 'Free'
                    : `$${previewCourse.price.toFixed(2)}`}
                </strong>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E6E1F5]">
              <p className="text-[12px] font-bold text-[#5F5B75]">
                Admin status override:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['Published', 'Pending review', 'Draft', 'Rejected'] as const).map(
                  (st) => {
                    const dtoStatus = toCourseStatusDto(st);
                    if (!dtoStatus) return null;
                    return (
                      <Button
                        key={st}
                        size="sm"
                        variant={previewCourse.status === st ? 'primary' : 'secondary'}
                        loading={overrideStatusMutation.isPending}
                        disabled={overrideStatusMutation.isPending}
                        onClick={() =>
                          overrideStatusMutation.mutate({
                            courseId: previewCourse.id,
                            courseTitle: previewCourse.title,
                            payload: { status: dtoStatus },
                          })
                        }
                      >
                        Set {COURSE_STATUS_LABELS[dtoStatus]}
                      </Button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

// ============================================================================
// 4. ADMIN CATEGORIES (/admin/categories)
// ============================================================================
export const AdminCategoriesPage: React.FC = () => {
  const categoriesQuery = useAdminCategories();
  const createCategoryMutation = useCreateAdminCategoryMutation();
  const updateCategoryMutation = useUpdateAdminCategoryMutation();
  const deleteCategoryMutation = useDeleteAdminCategoryMutation();
  const reorderCategoriesMutation = useReorderAdminCategoriesMutation();

  const categories = categoriesQuery.data ?? [];

  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catColor, setCatColor] = useState('#6D4AE0');
  const [formError, setFormError] = useState('');
  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleMoveCategory = (from: number, to: number) => {
    if (to < 0 || to >= categories.length) return;
    const copy = [...categories];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    reorderCategoriesMutation.mutate({
      orderedIds: copy.map((c) => c.id),
    });
  };

  const handleOpenAdd = () => {
    setEditingCat(null);
    setCatName('');
    setCatDesc('');
    setCatColor('#6D4AE0');
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatDesc(cat.description);
    setCatColor(cat.accentColor);
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveCategory = async () => {
    const trimmedName = catName.trim();
    if (trimmedName.length < 2) {
      setFormError('Category name must be at least 2 characters.');
      return;
    }

    setFormError('');
    try {
      if (editingCat) {
        await updateCategoryMutation.mutateAsync({
          categoryId: editingCat.id,
          payload: {
            name: trimmedName,
            slug: trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: catDesc.trim() || editingCat.description,
            accentColor: catColor,
          },
        });
      } else {
        await createCategoryMutation.mutateAsync({
          name: trimmedName,
          description:
            catDesc.trim() || 'Academic subject track managed by platform admin.',
          iconName: 'BookOpen',
          accentColor: catColor,
        });
      }
      setModalOpen(false);
    } catch (err) {
      if (isApiError(err) && err.status === 422) {
        setFormError(err.fieldErrors?.name?.[0] || err.message);
      }
    }
  };

  const isSaving =
    createCategoryMutation.isPending || updateCategoryMutation.isPending;

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Admin dashboard', to: '/admin/dashboard' },
          { label: 'Categories' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Categories ({categories.length})
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Drag categories to reorder catalog display, or add, edit, and remove tracks.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<PlusCircle className="w-4 h-4" />}
          onClick={handleOpenAdd}
        >
          Add category
        </Button>
      </div>

      {categoriesQuery.isError ? (
        <QueryErrorState
          error={categoriesQuery.error}
          onRetry={() => void categoriesQuery.refetch()}
        />
      ) : categoriesQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-20 w-full rounded-[12px]" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories configured"
          description="Create your first academic track to organize courses in the catalog."
          actionLabel="Add category"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="space-y-3">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIdx !== null && dragIdx !== idx) {
                  handleMoveCategory(dragIdx, idx);
                }
                setDragIdx(null);
              }}
              className="rounded-[12px] bg-white border border-[#E6E1F5] hover:border-[#A78BFA] p-4 sm:p-5 shadow-purple-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <GripVertical className="w-5 h-5 text-[#5F5B75] shrink-0 mt-1 sm:mt-0" />
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-display font-bold shrink-0"
                  style={{ backgroundColor: cat.accentColor }}
                >
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-display font-bold text-[20px] text-[#1E1B2E]">
                      {cat.name}
                    </h3>
                    <StatusChip label={`${cat.courseCount} courses`} variant="primary" />
                  </div>
                  <p className="text-[13px] text-[#5F5B75] mt-0.5">{cat.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  disabled={idx === 0 || reorderCategoriesMutation.isPending}
                  onClick={() => handleMoveCategory(idx, idx - 1)}
                  className="p-2 rounded-[8px] border border-[#E6E1F5] text-[#5F5B75] hover:text-[#6D4AE0] disabled:opacity-40 cursor-pointer"
                  title="Move up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={
                    idx === categories.length - 1 || reorderCategoriesMutation.isPending
                  }
                  onClick={() => handleMoveCategory(idx, idx + 1)}
                  className="p-2 rounded-[8px] border border-[#E6E1F5] text-[#5F5B75] hover:text-[#6D4AE0] disabled:opacity-40 cursor-pointer"
                  title="Move down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenEdit(cat)}
                >
                  Edit
                </Button>
                <button
                  type="button"
                  disabled={deleteCategoryMutation.isPending}
                  onClick={() => setDeleteCatTarget(cat)}
                  className="p-2 rounded-[8px] border border-[#E6E1F5] text-[#5F5B75] hover:text-[#DC2626] cursor-pointer"
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT CATEGORY MODAL */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCat ? 'Edit category' : 'Add category'}
        footer={
          <>
            <Button
              variant="ghost"
              disabled={isSaving}
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isSaving}
              onClick={() => void handleSaveCategory()}
            >
              Save category
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-[14px]">
          <div className="space-y-1">
            <label htmlFor="admin-cat-name" className="block font-bold text-[#1E1B2E]">
              Category name *
            </label>
            <input
              id="admin-cat-name"
              type="text"
              value={catName}
              onChange={(e) => {
                setCatName(e.target.value);
                setFormError('');
              }}
              placeholder="e.g. Cloud & DevOps"
              className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5]"
            />
            {formError && (
              <p className="text-[12px] text-[#DC2626] font-bold">{formError}</p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="admin-cat-desc" className="block font-bold text-[#1E1B2E]">
              Description
            </label>
            <textarea
              id="admin-cat-desc"
              rows={3}
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              className="w-full p-3 rounded-[10px] bg-white border border-[#E6E1F5]"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteCatTarget)}
        onClose={() => setDeleteCatTarget(null)}
        title="Delete category?"
        description={
          deleteCatTarget
            ? `Are you sure you want to permanently delete category "${deleteCatTarget.name}"?`
            : ''
        }
        confirmLabel="Delete"
        tone="danger"
        loading={deleteCategoryMutation.isPending}
        onConfirm={() => {
          if (!deleteCatTarget) return;
          void deleteCategoryMutation
            .mutateAsync({
              categoryId: deleteCatTarget.id,
              categoryName: deleteCatTarget.name,
            })
            .catch(() => {
              // Error toast handled by mutation onError
            })
            .finally(() => {
              setDeleteCatTarget(null);
            });
        }}
      />
    </div>
  );
};

// ============================================================================
// 5. ADMIN CERTIFICATES (/admin/certificates)
// ============================================================================
export const AdminCertificatesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status') ?? 'All';
  const qParam = searchParams.get('q') ?? '';
  const page = parsePositivePage(searchParams.get('page'));

  const [searchInput, setSearchInput] = useState(qParam);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  useEffect(() => {
    if (debouncedSearch !== qParam) {
      setSearchParams({
        ...(statusParam !== 'All' ? { status: statusParam } : {}),
        ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
        page: '1',
      });
    }
  }, [debouncedSearch, qParam, statusParam, setSearchParams]);

  const statusDto: CertificateStatusDto | 'all' =
    statusParam === 'Valid'
      ? 'valid'
      : statusParam === 'Revoked'
      ? 'revoked'
      : 'all';

  const certificatesQuery = useAdminCertificates({
    q: debouncedSearch.trim() || undefined,
    status: statusDto,
    page,
    limit: 12,
  });

  const revokeMutation = useRevokeCertificateMutation();
  const restoreMutation = useRestoreCertificateMutation();

  const certificates = certificatesQuery.data?.items ?? [];
  const meta = certificatesQuery.data?.meta;

  const [revokeCertTarget, setRevokeCertTarget] = useState<
    (typeof certificates)[number] | null
  >(null);
  const [restoringCertId, setRestoringCertId] = useState<string | null>(null);

  const updateParams = (patch: { status?: string; page?: number }) => {
    const nextStatus = patch.status !== undefined ? patch.status : statusParam;
    const nextPage = patch.page !== undefined ? patch.page : page;
    setSearchParams({
      ...(nextStatus !== 'All' ? { status: nextStatus } : {}),
      ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
      page: String(nextPage),
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Admin dashboard', to: '/admin/dashboard' },
          { label: 'Certificates' },
        ]}
      />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Issued certificates registry
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Audit issued graduate credentials and revoke compromised or invalid certificates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[#F3EFFF] border border-[#E6E1F5]">
            {(['All', 'Valid', 'Revoked'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => updateParams({ status: tab, page: 1 })}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold cursor-pointer ${
                  statusParam === tab
                    ? 'bg-white text-[#6D4AE0] shadow-2xs'
                    : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#5F5B75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search code, student, course..."
              aria-label="Search issued certificates"
              className="w-full h-10 pl-9 pr-3 rounded-[10px] bg-white border border-[#E6E1F5] text-[13px] focus:outline-none focus:border-[#6D4AE0]"
            />
          </div>
        </div>
      </div>

      {certificatesQuery.isError ? (
        <QueryErrorState
          error={certificatesQuery.error}
          onRetry={() => void certificatesQuery.refetch()}
        />
      ) : certificatesQuery.isLoading ? (
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-14 w-full rounded-[10px]" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <EmptyState
          title="No certificates found"
          description="No issued credentials match the selected status filter or search term."
          actionLabel="Show all certificates"
          onAction={() => {
            setSearchInput('');
            setSearchParams({ page: '1' });
          }}
        />
      ) : (
        <>
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px] min-w-[740px]">
                <thead>
                  <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                    <th className="py-3.5 px-4">Certificate ID</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Course</th>
                    <th className="py-3.5 px-4">Date issued</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1F5]">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-[#FAF8FF]">
                      <td className="py-4 px-4">
                        <Link
                          to={`/verify/${cert.verificationCode}`}
                          className="font-mono font-bold text-[#6D4AE0] hover:underline"
                        >
                          {cert.verificationCode}
                        </Link>
                      </td>
                      <td className="py-4 px-4 font-bold text-[#1E1B2E]">
                        {cert.studentName}
                      </td>
                      <td className="py-4 px-4 text-[#1E1B2E]">{cert.courseTitle}</td>
                      <td className="py-4 px-4 text-[13px] text-[#5F5B75]">
                        {cert.issuedAt}
                      </td>
                      <td className="py-4 px-4">
                        <StatusChip
                          label={cert.status}
                          variant={cert.status === 'Valid' ? 'success' : 'danger'}
                        />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link to={`/certificates/${cert.id}`}>
                            <Button size="sm" variant="ghost">
                              View
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant={cert.status === 'Valid' ? 'danger' : 'secondary'}
                            loading={
                              restoringCertId === cert.id && restoreMutation.isPending
                            }
                            disabled={
                              revokeMutation.isPending || restoreMutation.isPending
                            }
                            onClick={() => {
                              if (cert.status === 'Valid') {
                                setRevokeCertTarget(cert);
                              } else {
                                setRestoringCertId(cert.id);
                                void restoreMutation
                                  .mutateAsync({
                                    certificateId: cert.id,
                                    verificationCode: cert.verificationCode,
                                  })
                                  .finally(() => setRestoringCertId(null));
                              }
                            }}
                          >
                            {cert.status === 'Valid' ? 'Revoke' : 'Restore valid'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPages}
                onPageChange={(nextPage) => updateParams({ page: nextPage })}
              />
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(revokeCertTarget)}
        onClose={() => setRevokeCertTarget(null)}
        title="Revoke issued certificate?"
        description={
          revokeCertTarget
            ? `Certificate ${revokeCertTarget.verificationCode} for ${revokeCertTarget.studentName} (${revokeCertTarget.courseTitle}) will immediately show as Revoked on public verification links.`
            : ''
        }
        confirmLabel="Revoke certificate"
        tone="danger"
        loading={revokeMutation.isPending}
        onConfirm={() => {
          if (!revokeCertTarget) return;
          void revokeMutation
            .mutateAsync({
              certificateId: revokeCertTarget.id,
              verificationCode: revokeCertTarget.verificationCode,
            })
            .then(() => setRevokeCertTarget(null));
        }}
      />
    </div>
  );
};

// ============================================================================
// 6. ADMIN SETTINGS (/admin/settings)
// ============================================================================
export const AdminSettingsPage: React.FC = () => {
  const settingsQuery = useAdminSettings();
  const permissionsQuery = useAdminPermissions();
  const updateSettingsMutation = useUpdatePlatformSettingsMutation();

  const [platformName, setPlatformName] = useState('EduHub');
  const [defaultPassScore, setDefaultPassScore] = useState('60');
  const [maxImageSizeMb, setMaxImageSizeMb] = useState('5');
  const [maxVideoSizeGb, setMaxVideoSizeGb] = useState('2');
  const [settingsErrors, setSettingsErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setPlatformName(s.platformName);
    setDefaultPassScore(String(s.defaultPassScorePercent));
    setMaxImageSizeMb(String(Math.max(1, Math.round(s.maxImageSizeBytes / BYTES_PER_MB))));
    setMaxVideoSizeGb(String(Math.max(1, Math.round(s.maxVideoSizeBytes / BYTES_PER_GB))));
  }, [settingsQuery.data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const passVal = Number(defaultPassScore);
    const imgMb = Number(maxImageSizeMb);
    const vidGb = Number(maxVideoSizeGb);

    const nextErrors: Record<string, string> = {};
    if (platformName.trim().length < 2) {
      nextErrors.platformName = 'Platform name must be at least 2 characters.';
    }
    if (!Number.isInteger(passVal) || passVal < 50 || passVal > 100) {
      nextErrors.defaultPassScorePercent = 'Enter a whole percentage between 50 and 100.';
    }
    if (!Number.isFinite(imgMb) || imgMb < 1 || imgMb > 50) {
      nextErrors.maxImageSizeBytes = 'Cover image limit must be between 1 and 50 MB.';
    }
    if (!Number.isFinite(vidGb) || vidGb < 1 || vidGb > 10) {
      nextErrors.maxVideoSizeBytes = 'Video upload limit must be between 1 and 10 GB.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setSettingsErrors(nextErrors);
      return;
    }

    setSettingsErrors({});
    try {
      await updateSettingsMutation.mutateAsync({
        platformName: platformName.trim(),
        defaultPassScorePercent: passVal,
        maxImageSizeBytes: Math.round(imgMb * BYTES_PER_MB),
        maxVideoSizeBytes: Math.round(vidGb * BYTES_PER_GB),
      });
    } catch (err) {
      if (isApiError(err) && err.status === 422 && err.fieldErrors) {
        setSettingsErrors({
          ...(err.fieldErrors.platformName?.[0]
            ? { platformName: err.fieldErrors.platformName[0] }
            : {}),
          ...(err.fieldErrors.defaultPassScorePercent?.[0]
            ? {
                defaultPassScorePercent: err.fieldErrors.defaultPassScorePercent[0],
              }
            : {}),
          ...(err.fieldErrors.maxImageSizeBytes?.[0]
            ? { maxImageSizeBytes: err.fieldErrors.maxImageSizeBytes[0] }
            : {}),
          ...(err.fieldErrors.maxVideoSizeBytes?.[0]
            ? { maxVideoSizeBytes: err.fieldErrors.maxVideoSizeBytes[0] }
            : {}),
        });
      }
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Admin dashboard', to: '/admin/dashboard' },
          { label: 'Settings' },
        ]}
      />

      <div>
        <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
          Platform settings & permissions
        </h1>
        <p className="text-[16px] text-[#5F5B75]">
          Configure global defaults, media upload limits, and review the role-based access control matrix.
        </p>
      </div>

      {settingsQuery.isError ? (
        <QueryErrorState
          error={settingsQuery.error}
          onRetry={() => void settingsQuery.refetch()}
        />
      ) : settingsQuery.isLoading ? (
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 space-y-4">
          <Skeleton className="h-7 w-72" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-16 rounded-[10px]" />
            ))}
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => void handleSave(e)}
          className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-6"
        >
          <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
            Global configuration & upload limits
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <label
                htmlFor="platform-name-input"
                className="block text-[13px] font-bold text-[#1E1B2E]"
              >
                Platform name
              </label>
              <input
                id="platform-name-input"
                type="text"
                value={platformName}
                onChange={(e) => {
                  setPlatformName(e.target.value);
                  setSettingsErrors((prev) => ({ ...prev, platformName: '' }));
                }}
                className="w-full h-11 px-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-bold text-[15px]"
              />
              {settingsErrors.platformName && (
                <p className="text-[12px] text-[#DC2626] font-bold">
                  {settingsErrors.platformName}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="platform-pass-score-input"
                className="block text-[13px] font-bold text-[#1E1B2E]"
              >
                Default exam pass score (%)
              </label>
              <input
                id="platform-pass-score-input"
                type="number"
                min={50}
                max={100}
                value={defaultPassScore}
                onChange={(e) => {
                  setDefaultPassScore(e.target.value);
                  setSettingsErrors((prev) => ({
                    ...prev,
                    defaultPassScorePercent: '',
                  }));
                }}
                className="w-full h-11 px-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-display font-bold text-[18px] text-[#16A34A]"
              />
              {settingsErrors.defaultPassScorePercent && (
                <p className="text-[12px] text-[#DC2626] font-bold">
                  {settingsErrors.defaultPassScorePercent}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="platform-image-limit-input"
                className="block text-[13px] font-bold text-[#1E1B2E]"
              >
                Cover image upload limit (MB, JPG/PNG)
              </label>
              <input
                id="platform-image-limit-input"
                type="number"
                min={1}
                max={50}
                value={maxImageSizeMb}
                onChange={(e) => {
                  setMaxImageSizeMb(e.target.value);
                  setSettingsErrors((prev) => ({ ...prev, maxImageSizeBytes: '' }));
                }}
                className="w-full h-11 px-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-bold text-[15px]"
              />
              {settingsErrors.maxImageSizeBytes && (
                <p className="text-[12px] text-[#DC2626] font-bold">
                  {settingsErrors.maxImageSizeBytes}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="platform-video-limit-input"
                className="block text-[13px] font-bold text-[#1E1B2E]"
              >
                Video upload limit (GB, MP4)
              </label>
              <input
                id="platform-video-limit-input"
                type="number"
                min={1}
                max={10}
                value={maxVideoSizeGb}
                onChange={(e) => {
                  setMaxVideoSizeGb(e.target.value);
                  setSettingsErrors((prev) => ({ ...prev, maxVideoSizeBytes: '' }));
                }}
                className="w-full h-11 px-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-bold text-[15px]"
              />
              {settingsErrors.maxVideoSizeBytes && (
                <p className="text-[12px] text-[#DC2626] font-bold">
                  {settingsErrors.maxVideoSizeBytes}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-[#E6E1F5]">
            <Button
              type="submit"
              variant="primary"
              loading={updateSettingsMutation.isPending}
            >
              Save platform settings
            </Button>
          </div>
        </form>
      )}

      {/* READ-ONLY ROLES AND PERMISSIONS MATRIX */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
              Roles and permissions matrix (read-only)
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Enforced role-based access control across Student, Instructor, Supervisor, and Admin workspaces.
            </p>
          </div>
          <StatusChip label="RBAC enforced" variant="primary" />
        </div>

        {permissionsQuery.isError ? (
          <QueryErrorState
            error={permissionsQuery.error}
            onRetry={() => void permissionsQuery.refetch()}
            compact
          />
        ) : permissionsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-12 w-full rounded-[10px]" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-[#E6E1F5]">
            <table className="w-full text-left border-collapse text-[14px] min-w-[680px]">
              <thead>
                <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                  <th className="py-3.5 px-4">Platform capability / feature</th>
                  <th className="py-3.5 px-4 text-center">Student</th>
                  <th className="py-3.5 px-4 text-center">Instructor</th>
                  <th className="py-3.5 px-4 text-center">Supervisor</th>
                  <th className="py-3.5 px-4 text-center">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1F5]">
                {(permissionsQuery.data ?? []).map((row) => (
                  <tr key={row.id} className="hover:bg-[#FAF8FF]">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#1E1B2E]">{row.feature}</p>
                      <p className="text-[11px] text-[#6D4AE0] font-semibold">
                        {row.category}
                      </p>
                    </td>
                    {(['student', 'instructor', 'supervisor', 'admin'] as const).map(
                      (roleKey) => {
                        const allowed = row[roleKey];
                        return (
                          <td key={roleKey} className="py-3.5 px-4 text-center">
                            {allowed ? (
                              <span className="inline-flex w-6 h-6 rounded-full bg-[#16A34A]/15 text-[#16A34A] items-center justify-center">
                                <Check className="w-4 h-4" />
                              </span>
                            ) : (
                              <span className="inline-flex w-6 h-6 rounded-full bg-[#FAF8FF] text-[#5F5B75]/40 items-center justify-center">
                                <Minus className="w-4 h-4" />
                              </span>
                            )}
                          </td>
                        );
                      }
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
