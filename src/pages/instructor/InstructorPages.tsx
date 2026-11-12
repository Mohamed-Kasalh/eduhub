import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  LayoutGrid,
  List,
  PlusCircle,
  Search,
  Send,
  Star,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  useDeleteInstructorCourseMutation,
  useInstructorComments,
  useInstructorCourses,
  useInstructorDashboard,
  useInstructorStudentProgress,
  useInstructorStudents,
  useReplyInstructorCommentMutation,
  useResolveInstructorCommentMutation,
  useToggleInstructorCommentLikeMutation,
} from '../../api/hooks/useInstructor';
import { toCourseStatusDto } from '../../api/mappers/course.mapper';
import {
  Avatar,
  Breadcrumbs,
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Pagination,
  ProgressBar,
  ProgressRing,
  QueryErrorState,
  Skeleton,
  StatusChip,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import type {
  EnrolledStudentRecord,
  InstructorCourseRecord,
} from '../../data/instructorMockData';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { handleImageError } from '../../utils/imageFallback';

export { InstructorCreateCoursePage } from './InstructorCourseWizard';
export {
  InstructorExamSettingsPage,
  InstructorQuestionBankPage,
} from './InstructorQuestionBankAndExam';

type CourseStatusTab = 'All' | 'Published' | 'Pending review' | 'Draft' | 'Rejected';

const COURSE_STATUS_TABS: CourseStatusTab[] = [
  'All',
  'Published',
  'Pending review',
  'Draft',
  'Rejected',
];

function parseCourseStatusTab(value: string | null): CourseStatusTab {
  if (
    value === 'Published' ||
    value === 'Pending review' ||
    value === 'Draft' ||
    value === 'Rejected'
  ) {
    return value;
  }
  return 'All';
}

function parsePositivePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

// ============================================================================
// 1. INSTRUCTOR DASHBOARD (/instructor/dashboard)
// ============================================================================
export const InstructorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dashboardQuery = useInstructorDashboard();
  const replyMutation = useReplyInstructorCommentMutation();
  const resolveMutation = useResolveInstructorCommentMutation();

  const instructorName = user?.name || 'Instructor';
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const [quickReplies, setQuickReplies] = useState<Record<string, string>>({});
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);

  const dashboard = dashboardQuery.data;
  const chartPoints = dashboard?.enrollmentChart ?? [];
  const chartWidth = 640;
  const chartHeight = 180;

  const svgModel = useMemo(() => {
    if (chartPoints.length === 0) {
      return {
        svgPoints: [] as Array<{
          dayLabel: string;
          dateFull: string;
          enrollments: number;
          completions: number;
          x: number;
          y: number;
          idx: number;
        }>,
        polylineString: '',
        areaString: '',
      };
    }
    const maxEnrollment = Math.max(
      10,
      Math.ceil(Math.max(...chartPoints.map((pt) => pt.enrollments)) * 1.15)
    );
    const divisor = Math.max(1, chartPoints.length - 1);
    const svgPoints = chartPoints.map((pt, idx) => {
      const x =
        chartPoints.length === 1
          ? Math.round(chartWidth / 2)
          : Math.round((idx / divisor) * (chartWidth - 40) + 20);
      const y = Math.round(
        chartHeight - 24 - (pt.enrollments / maxEnrollment) * (chartHeight - 48)
      );
      return { ...pt, x, y, idx };
    });
    const polylineString = svgPoints.map((p) => `${p.x},${p.y}`).join(' ');
    const areaString = `${svgPoints[0].x},${chartHeight - 20} ${polylineString} ${
      svgPoints[svgPoints.length - 1].x
    },${chartHeight - 20}`;
    return { svgPoints, polylineString, areaString };
  }, [chartPoints]);

  const resolvedPointIdx =
    selectedPointIdx !== null && selectedPointIdx < svgModel.svgPoints.length
      ? selectedPointIdx
      : Math.max(0, svgModel.svgPoints.length - 1);
  const activePoint = svgModel.svgPoints[resolvedPointIdx];

  const handleQuickReply = async (commentId: string, alreadyResolved: boolean) => {
    const text = quickReplies[commentId]?.trim();
    if (!text) return;
    setReplyingCommentId(commentId);
    try {
      await replyMutation.mutateAsync({ commentId, content: text });
      if (!alreadyResolved) {
        await resolveMutation.mutateAsync({
          commentId,
          resolved: true,
          silent: true,
        });
      }
      setQuickReplies((prev) => ({ ...prev, [commentId]: '' }));
    } catch {
      // Mutation hooks display API error toasts
    } finally {
      setReplyingCommentId(null);
    }
  };

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-8 pb-12">
        <Skeleton className="h-36 w-full rounded-[12px]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-32 w-full rounded-[12px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-7 h-72 w-full rounded-[12px]" />
          <Skeleton className="lg:col-span-5 h-72 w-full rounded-[12px]" />
        </div>
        <Skeleton className="h-64 w-full rounded-[12px]" />
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboard) {
    return (
      <div className="space-y-6 pb-12">
        <QueryErrorState
          title="Could not load instructor studio"
          error={dashboardQuery.error}
          onRetry={() => void dashboardQuery.refetch()}
        />
      </div>
    );
  }

  const { kpis } = dashboard;
  const pendingCourse = dashboard.pendingCourses[0];
  const rejectedCourse = dashboard.rejectedCourses[0];

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <StatusChip label="Instructor studio" variant="orange" />
          <h1 className="text-[34px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Welcome, {instructorName}
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Track your 30-day student enrollments, reply to lesson Q&A, and manage course
            approvals.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/instructor/courses/new">
            <Button variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />}>
              New course
            </Button>
          </Link>
          <Link to="/instructor/question-bank">
            <Button variant="secondary">Question bank</Button>
          </Link>
        </div>
      </div>

      {/* NOTICES FOR COURSES PENDING REVIEW OR REJECTED */}
      {(pendingCourse || rejectedCourse) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pendingCourse && (
            <div className="rounded-[12px] bg-[#FFFBEB] border border-[#F59E0B]/50 p-4 sm:p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-[13px]">
                  <div className="flex items-center gap-2">
                    <StatusChip label="Pending review" variant="warning" />
                    <span className="text-[#5F5B75]">
                      Submitted {pendingCourse.submittedAt || 'recently'}
                    </span>
                  </div>
                  <p className="font-display font-bold text-[17px] text-[#1E1B2E]">
                    {pendingCourse.title}
                  </p>
                  <p className="text-[#5F5B75]">
                    Currently in Supervisor Hana Mostafa’s syllabus review queue (est. 24h).
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white shrink-0"
                onClick={() => navigate('/instructor/courses?status=Pending+review')}
              >
                View status
              </Button>
            </div>
          )}

          {rejectedCourse && (
            <div className="rounded-[12px] bg-[#FEF2F2] border border-[#DC2626]/40 p-4 sm:p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-white text-[#DC2626] border border-[#DC2626]/30 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-[13px]">
                  <StatusChip label="Rejected — Action required" variant="danger" />
                  <p className="font-display font-bold text-[17px] text-[#1E1B2E]">
                    {rejectedCourse.title}
                  </p>
                  {rejectedCourse.rejectionReason && (
                    <p className="text-[#DC2626] font-medium line-clamp-2">
                      {rejectedCourse.rejectionReason}
                    </p>
                  )}
                </div>
              </div>
              <Link
                to={`/instructor/courses/new?edit=${rejectedCourse.id}`}
                className="shrink-0"
              >
                <Button size="sm" variant="danger">
                  Fix & resubmit
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 4 STAT CARDS (Courses, Learners, Average rating, Completion rate) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Courses',
            value: kpis.totalCoursesCount,
            sub: `${kpis.publishedCount} published • ${kpis.pendingReviewCount} pending • ${kpis.draftCount} draft`,
            icon: <BookOpen className="w-5 h-5 text-[#6D4AE0]" />,
            to: '/instructor/courses',
          },
          {
            label: 'Learners',
            value: kpis.totalLearnersCount.toLocaleString(),
            sub: `+${kpis.newLearnersLast30Days.toLocaleString()} in last 30 days`,
            icon: <Users className="w-5 h-5 text-[#6D4AE0]" />,
            to: '/instructor/students',
          },
          {
            label: 'Average rating',
            value: kpis.averageRating.toFixed(2),
            sub: `Across ${kpis.totalReviewsCount.toLocaleString()} student reviews`,
            icon: <Star className="w-5 h-5 fill-[#F5B82E] text-[#F5B82E]" />,
            to: '/instructor/courses',
          },
          {
            label: 'Completion rate',
            value: `${Math.round(kpis.averageCompletionRatePercent)}%`,
            sub: 'Students finishing 100% lessons',
            icon: <TrendingUp className="w-5 h-5 text-[#16A34A]" />,
            to: '/instructor/students',
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="rounded-[12px] bg-white border border-[#E6E1F5] hover:border-[#A78BFA] p-5 shadow-purple-sm hover:shadow-purple-md transition-all flex items-start justify-between"
          >
            <div>
              <p className="text-[14px] text-[#5F5B75] font-medium">{stat.label}</p>
              <p className="font-display font-bold text-[32px] text-[#1E1B2E] mt-1 leading-none">
                {stat.value}
              </p>
              <p className="text-[12px] text-[#5F5B75] mt-1.5">{stat.sub}</p>
            </div>
            <div className="w-10 h-10 rounded-[10px] bg-[#F3EFFF] flex items-center justify-center shrink-0">
              {stat.icon}
            </div>
          </Link>
        ))}
      </div>

      {/* ENROLLMENTS LINE CHART (LAST 30 DAYS) & RECENT COMMENTS TO REPLY TO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Enrollments Line Chart */}
        <div className="lg:col-span-7 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                Enrollments (last 30 days)
              </h2>
              <p className="text-[13px] text-[#5F5B75]">
                {kpis.newLearnersLast30Days.toLocaleString()} new student enrollments • Click any
                data point to inspect
              </p>
            </div>
            {activePoint && (
              <div className="px-3.5 py-1.5 rounded-[10px] bg-[#F3EFFF] border border-[#E6E1F5] text-[13px]">
                <span className="text-[#5F5B75]">{activePoint.dateFull}: </span>
                <strong className="text-[#6D4AE0]">{activePoint.enrollments} enrollments</strong>
              </div>
            )}
          </div>

          {svgModel.svgPoints.length === 0 ? (
            <EmptyState
              title="No enrollment data yet"
              description="Student enrollment trends will populate here once learners join your courses."
              mood="empty"
            />
          ) : (
            <div className="w-full overflow-x-auto pt-2">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-48 overflow-visible"
                role="img"
                aria-label="Enrollments line chart over the last 30 days"
              >
                <defs>
                  <linearGradient id="enrollAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6D4AE0" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#6D4AE0" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {[40, 85, 130].map((yLine) => (
                  <line
                    key={yLine}
                    x1="20"
                    y1={yLine}
                    x2={chartWidth - 20}
                    y2={yLine}
                    stroke="#E6E1F5"
                    strokeDasharray="4 4"
                  />
                ))}

                {svgModel.svgPoints.length > 1 && (
                  <>
                    <polygon points={svgModel.areaString} fill="url(#enrollAreaGrad)" />
                    <polyline
                      fill="none"
                      stroke="#6D4AE0"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={svgModel.polylineString}
                    />
                  </>
                )}

                {svgModel.svgPoints.map((pt) => {
                  const isSelected = pt.idx === resolvedPointIdx;
                  return (
                    <g
                      key={pt.dayLabel}
                      onClick={() => setSelectedPointIdx(pt.idx)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isSelected ? 7 : 4.5}
                        fill={isSelected ? '#6D4AE0' : '#FFFFFF'}
                        stroke="#6D4AE0"
                        strokeWidth="2.5"
                      />
                      {pt.idx % 3 === 0 && (
                        <text
                          x={pt.x}
                          y={chartHeight - 4}
                          textAnchor="middle"
                          className="text-[10px] fill-[#5F5B75] font-semibold"
                        >
                          {pt.dateFull}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Recent Comments to Reply To */}
        <div className="lg:col-span-5 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                Recent comments to reply to
              </h2>
              <p className="text-[13px] text-[#5F5B75]">
                Unanswered student questions from your lessons
              </p>
            </div>
            <Link to="/instructor/comments">
              <Button size="sm" variant="ghost">
                Inbox ({dashboard.unansweredCommentsCount})
              </Button>
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {dashboard.recentComments.length === 0 ? (
              <div className="p-5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-center space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-[#16A34A] mx-auto" />
                <p className="font-bold text-[14px] text-[#1E1B2E]">
                  All student questions answered
                </p>
                <p className="text-[12px] text-[#5F5B75]">
                  Check your comments inbox anytime to review past lesson discussions.
                </p>
              </div>
            ) : (
              dashboard.recentComments.slice(0, 2).map((th) => {
                const isSubmitting = replyingCommentId === th.id;
                return (
                  <div
                    key={th.id}
                    className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar src={th.studentAvatar} name={th.studentName} size="sm" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[#1E1B2E] truncate">
                            {th.studentName}
                          </p>
                          <Link
                            to={`/learn/${th.courseId}/${th.lessonId}`}
                            className="text-[11px] font-semibold text-[#6D4AE0] hover:underline block truncate max-w-[220px]"
                          >
                            {th.lessonTitle}
                          </Link>
                        </div>
                      </div>
                      <StatusChip
                        label={th.resolved ? 'Resolved' : 'Unanswered'}
                        variant={th.resolved ? 'success' : 'orange'}
                      />
                    </div>

                    <p className="text-[13px] text-[#1E1B2E] line-clamp-2">{th.content}</p>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={quickReplies[th.id] || ''}
                        onChange={(e) =>
                          setQuickReplies((prev) => ({
                            ...prev,
                            [th.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleQuickReply(th.id, th.resolved);
                          }
                        }}
                        disabled={isSubmitting}
                        placeholder="Write a quick reply..."
                        aria-label={`Quick reply to ${th.studentName}`}
                        className="flex-1 h-10 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px] focus:outline-none focus:border-[#6D4AE0] disabled:opacity-60"
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        loading={isSubmitting}
                        disabled={isSubmitting || !(quickReplies[th.id] || '').trim()}
                        onClick={() => void handleQuickReply(th.id, th.resolved)}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* TOP COURSES TABLE */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
              Top performing courses
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Enrollment volume, ratings, and completion rates across your published catalog.
            </p>
          </div>
          <Link to="/instructor/courses">
            <Button variant="secondary" size="sm">
              Manage all courses
            </Button>
          </Link>
        </div>

        {dashboard.topPerformingCourses.length === 0 ? (
          <EmptyState
            title="No published courses yet"
            description="Create and publish your first course to track learners, ratings, and completion rates."
            actionLabel="Create course"
            actionTo="/instructor/courses/new"
            mood="empty"
          />
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-[#E6E1F5]">
            <table className="w-full text-left border-collapse text-[14px]">
              <thead>
                <tr className="bg-[#FAF8FF] border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4">Learners</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Completion rate</th>
                  <th className="py-3.5 px-4">Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1F5]">
                {dashboard.topPerformingCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAF8FF]">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.thumbnail}
                          alt={c.title}
                          onError={handleImageError}
                          className="w-12 h-9 rounded-[6px] object-cover shrink-0 border border-[#E6E1F5]"
                        />
                        <div>
                          <Link
                            to={`/courses/${c.id}`}
                            className="font-bold text-[#1E1B2E] hover:text-[#6D4AE0]"
                          >
                            {c.title}
                          </Link>
                          <p className="text-[12px] text-[#5F5B75]">
                            {c.lessonsCount} lessons • {c.duration}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1E1B2E]">
                      {c.studentsCount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-[#1E1B2E]">
                        <Star className="w-4 h-4 fill-[#F5B82E] text-[#F5B82E]" />
                        {c.rating.toFixed(1)}{' '}
                        <span className="text-[#5F5B75] font-normal">({c.reviewCount})</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 w-44">
                      <ProgressBar value={c.completionRate} size="sm" color="success" />
                    </td>
                    <td className="py-3.5 px-4 text-[13px] text-[#5F5B75]">{c.updatedAt}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link to={`/instructor/courses/new?edit=${c.id}`}>
                          <Button size="sm" variant="secondary">
                            Edit
                          </Button>
                        </Link>
                        <Link to={`/courses/${c.id}`}>
                          <Button size="sm" variant="ghost">
                            Preview
                          </Button>
                        </Link>
                      </div>
                    </td>
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

// ============================================================================
// 2. MY COURSES (/instructor/courses)
// ============================================================================
export const InstructorCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusTab = parseCourseStatusTab(searchParams.get('status'));
  const urlQuery = searchParams.get('q') ?? '';
  const page = parsePositivePage(searchParams.get('page'));
  const viewMode: 'table' | 'grid' =
    searchParams.get('view') === 'grid' ? 'grid' : 'table';

  const [searchInput, setSearchInput] = useState(urlQuery);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const [courseToDelete, setCourseToDelete] = useState<InstructorCourseRecord | null>(null);

  useEffect(() => {
    setSearchInput(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (debouncedSearch === urlQuery) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch) {
          next.set('q', debouncedSearch);
        } else {
          next.delete('q');
        }
        next.delete('page');
        return next;
      },
      { replace: true }
    );
  }, [debouncedSearch, urlQuery, setSearchParams]);

  const updateParams = (patch: {
    status?: CourseStatusTab;
    q?: string;
    page?: number;
    view?: 'table' | 'grid';
  }) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (patch.status !== undefined) {
          if (patch.status === 'All') next.delete('status');
          else next.set('status', patch.status);
        }
        if (patch.q !== undefined) {
          if (patch.q) next.set('q', patch.q);
          else next.delete('q');
        }
        if (patch.page !== undefined) {
          if (patch.page <= 1) next.delete('page');
          else next.set('page', String(patch.page));
        }
        if (patch.view !== undefined) {
          if (patch.view === 'table') next.delete('view');
          else next.set('view', patch.view);
        }
        return next;
      },
      { replace: true }
    );
  };

  const coursesQuery = useInstructorCourses({
    status: statusTab === 'All' ? 'all' : (toCourseStatusDto(statusTab) ?? 'all'),
    q: debouncedSearch || undefined,
    page,
    limit: 10,
  });
  const dashboardQuery = useInstructorDashboard();
  const deleteCourseMutation = useDeleteInstructorCourseMutation();

  const courseList = coursesQuery.data?.items ?? [];
  const meta = coursesQuery.data?.meta;
  const kpis = dashboardQuery.data?.kpis;

  const getTabCount = (tab: CourseStatusTab): number | undefined => {
    if (!kpis) return undefined;
    if (tab === 'All') return kpis.totalCoursesCount;
    if (tab === 'Published') return kpis.publishedCount;
    if (tab === 'Pending review') return kpis.pendingReviewCount;
    if (tab === 'Draft') return kpis.draftCount;
    return kpis.rejectedCount;
  };

  const getStatusVariant = (status: InstructorCourseRecord['status']) => {
    if (status === 'Published') return 'success';
    if (status === 'Pending review') return 'warning';
    if (status === 'Rejected') return 'danger';
    return 'neutral';
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    try {
      await deleteCourseMutation.mutateAsync({
        courseId: courseToDelete.id,
        title: courseToDelete.title,
      });
      setCourseToDelete(null);
    } catch {
      // Mutation hook shows danger toast
    }
  };

  const hasActiveFilters = statusTab !== 'All' || Boolean(debouncedSearch);

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Instructor dashboard', to: '/instructor/dashboard' },
          { label: 'My courses' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            My courses
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Manage drafts, supervisor review submissions, and published courses.
          </p>
        </div>

        <Link to="/instructor/courses/new">
          <Button variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />}>
            New course
          </Button>
        </Link>
      </div>

      {/* Toolbar: Status Tabs + Search + Table/Grid Toggle */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div
          role="tablist"
          className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5]"
        >
          {COURSE_STATUS_TABS.map((tab) => {
            const count = getTabCount(tab);
            const active = statusTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => updateParams({ status: tab, page: 1 })}
                className={`h-9 px-3.5 rounded-[10px] text-[13px] font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-[#6D4AE0] shadow-purple-sm'
                    : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                }`}
              >
                <span>{tab}</span>
                {count !== undefined && (
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

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#5F5B75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search courses..."
              aria-label="Search instructor courses"
              className="w-full h-11 pl-9 pr-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] focus:outline-none focus:border-[#6D4AE0]"
            />
          </div>

          <div className="inline-flex items-center p-1 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5]">
            <button
              type="button"
              onClick={() => updateParams({ view: 'table' })}
              className={`w-10 h-10 flex items-center justify-center rounded-[8px] cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#6D4AE0] text-white'
                  : 'text-[#5F5B75] hover:text-[#1E1B2E]'
              }`}
              aria-label="Table view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => updateParams({ view: 'grid' })}
              className={`w-10 h-10 flex items-center justify-center rounded-[8px] cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#6D4AE0] text-white'
                  : 'text-[#5F5B75] hover:text-[#1E1B2E]'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {coursesQuery.isFetching && !coursesQuery.isLoading && (
        <p className="text-[12px] font-semibold text-[#6D4AE0]">Updating courses…</p>
      )}

      {coursesQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-20 w-full rounded-[12px]" />
          ))}
        </div>
      ) : coursesQuery.isError ? (
        <QueryErrorState
          title="Could not load your courses"
          error={coursesQuery.error}
          onRetry={() => void coursesQuery.refetch()}
        />
      ) : courseList.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? 'No courses match this filter' : 'No authored courses yet'}
          description={
            hasActiveFilters
              ? 'Reset your status filter or search query, or start a brand-new course.'
              : 'Start building a new video course with our 6-step Course Builder Wizard.'
          }
          actionLabel={hasActiveFilters ? 'Reset filters' : 'New course'}
          onAction={
            hasActiveFilters
              ? () => {
                  setSearchInput('');
                  updateParams({ status: 'All', q: '', page: 1 });
                }
              : undefined
          }
          actionTo={hasActiveFilters ? undefined : '/instructor/courses/new'}
          mood="empty"
        />
      ) : viewMode === 'table' ? (
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[14px]">
              <thead>
                <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Learners</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1F5]">
                {courseList.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr className="hover:bg-[#FAF8FF]">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={c.thumbnail}
                            alt={c.title}
                            onError={handleImageError}
                            className="w-14 h-10 rounded-[8px] object-cover shrink-0 border border-[#E6E1F5]"
                          />
                          <div>
                            <p className="font-display font-bold text-[16px] text-[#1E1B2E]">
                              {c.title}
                            </p>
                            <p className="text-[12px] text-[#5F5B75]">
                              {c.categoryName} • {c.level} • {c.lessonsCount} lessons
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusChip label={c.status} variant={getStatusVariant(c.status)} />
                      </td>
                      <td className="py-4 px-4 font-bold text-[#1E1B2E]">
                        {c.studentsCount > 0 ? c.studentsCount.toLocaleString() : '—'}
                      </td>
                      <td className="py-4 px-4">
                        {c.rating > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#1E1B2E]">
                            <Star className="w-4 h-4 fill-[#F5B82E] text-[#F5B82E]" />
                            {c.rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[#5F5B75]">No ratings yet</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-[13px] text-[#5F5B75]">{c.updatedAt}</td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/instructor/courses/new?edit=${c.id}`)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/courses/${c.id}`)}
                          >
                            Preview
                          </Button>
                          <button
                            type="button"
                            onClick={() => setCourseToDelete(c)}
                            className="w-11 h-11 inline-flex items-center justify-center rounded-[8px] text-[#5F5B75] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                            title="Delete course"
                            aria-label={`Delete ${c.title}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {c.status === 'Rejected' && c.rejectionReason && (
                      <tr className="bg-[#FEF2F2]/60">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px] text-[#DC2626]">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>
                                <strong>Rejection reason:</strong> {c.rejectionReason}
                              </span>
                            </div>
                            <Link to={`/instructor/courses/new?edit=${c.id}`}>
                              <Button size="sm" variant="danger">
                                Fix & resubmit
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courseList.map((c) => (
            <article
              key={c.id}
              className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm flex flex-col justify-between overflow-hidden"
            >
              <div className="relative h-44 bg-[#F3EFFF]">
                <img
                  src={c.thumbnail}
                  alt={c.title}
                  onError={handleImageError}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  <StatusChip
                    label={c.status}
                    variant={getStatusVariant(c.status)}
                    className="bg-white/95"
                  />
                </div>
              </div>
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <p className="text-[12px] font-bold text-[#6D4AE0]">
                    {c.categoryName} • Updated {c.updatedAt}
                  </p>
                  <h3 className="font-display font-bold text-[20px] text-[#1E1B2E]">
                    {c.title}
                  </h3>
                  {c.status === 'Rejected' && c.rejectionReason && (
                    <div className="p-3 rounded-[8px] bg-[#FEF2F2] border border-[#DC2626]/30 text-[12px] text-[#DC2626]">
                      {c.rejectionReason}
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-[#E6E1F5] flex items-center justify-between gap-2">
                  <div className="text-[13px] text-[#5F5B75]">
                    <strong>{c.studentsCount.toLocaleString()}</strong> learners
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/instructor/courses/new?edit=${c.id}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/courses/${c.id}`)}
                    >
                      Preview
                    </Button>
                    <button
                      type="button"
                      onClick={() => setCourseToDelete(c)}
                      aria-label={`Delete ${c.title}`}
                      className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#DC2626] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={(nextPage) => updateParams({ page: nextPage })}
          />
        </div>
      )}

      {/* CONFIRM DELETE COURSE MODAL */}
      <ConfirmDialog
        open={Boolean(courseToDelete)}
        onClose={() => {
          if (!deleteCourseMutation.isPending) setCourseToDelete(null);
        }}
        title="Delete this course?"
        description={
          courseToDelete
            ? `Are you sure you want to permanently delete "${courseToDelete.title}" (${courseToDelete.status})? This action cannot be undone.`
            : ''
        }
        confirmLabel="Confirm delete"
        tone="danger"
        loading={deleteCourseMutation.isPending}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
};

// ============================================================================
// 6. STUDENTS (/instructor/students)
// ============================================================================
export const InstructorStudentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCourseId = searchParams.get('courseId') || 'all';
  const urlQuery = searchParams.get('q') ?? '';
  const page = parsePositivePage(searchParams.get('page'));

  const [searchInput, setSearchInput] = useState(urlQuery);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const [selectedStudentRef, setSelectedStudentRef] =
    useState<EnrolledStudentRecord | null>(null);

  useEffect(() => {
    setSearchInput(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (debouncedSearch === urlQuery) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch) next.set('q', debouncedSearch);
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true }
    );
  }, [debouncedSearch, urlQuery, setSearchParams]);

  const updateParams = (patch: { courseId?: string; q?: string; page?: number }) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (patch.courseId !== undefined) {
          if (!patch.courseId || patch.courseId === 'all') next.delete('courseId');
          else next.set('courseId', patch.courseId);
        }
        if (patch.q !== undefined) {
          if (patch.q) next.set('q', patch.q);
          else next.delete('q');
        }
        if (patch.page !== undefined) {
          if (patch.page <= 1) next.delete('page');
          else next.set('page', String(patch.page));
        }
        return next;
      },
      { replace: true }
    );
  };

  const coursesFilterQuery = useInstructorCourses({ status: 'all', limit: 50 });
  const studentsQuery = useInstructorStudents({
    courseId: selectedCourseId === 'all' ? undefined : selectedCourseId,
    q: debouncedSearch || undefined,
    page,
    limit: 10,
  });

  const studentDetailQuery = useInstructorStudentProgress(
    selectedStudentRef?.id ?? '',
    selectedStudentRef?.courseId ?? '',
    Boolean(selectedStudentRef)
  );

  const students = studentsQuery.data?.items ?? [];
  const meta = studentsQuery.data?.meta;
  const taughtCourses = coursesFilterQuery.data?.items ?? [];
  const activeDetail = studentDetailQuery.data;

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Instructor dashboard', to: '/instructor/dashboard' },
          { label: 'Enrolled students' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Enrolled students
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Inspect student lesson progress, exam scores, and issued certificates.
          </p>
        </div>
        <StatusChip
          label={`${meta?.total ?? students.length} active learners shown`}
          variant="primary"
        />
      </div>

      {/* Course Filter & Search */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#5F5B75] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by student name or email..."
            aria-label="Search enrolled students"
            className="w-full h-11 pl-9 pr-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] focus:outline-none focus:border-[#6D4AE0]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#5F5B75]">Course:</span>
          <select
            value={selectedCourseId}
            onChange={(e) => updateParams({ courseId: e.target.value, page: 1 })}
            aria-label="Filter enrolled students by course"
            className="h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-bold text-[#1E1B2E] max-w-[260px]"
          >
            <option value="all">All taught courses</option>
            {taughtCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {studentsQuery.isFetching && !studentsQuery.isLoading && (
        <p className="text-[12px] font-semibold text-[#6D4AE0]">Updating student roster…</p>
      )}

      {studentsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-16 w-full rounded-[12px]" />
          ))}
        </div>
      ) : studentsQuery.isError ? (
        <QueryErrorState
          title="Could not load enrolled students"
          error={studentsQuery.error}
          onRetry={() => void studentsQuery.refetch()}
        />
      ) : students.length === 0 ? (
        <EmptyState
          title="No enrolled students match"
          description="Try clearing your course filter or search terms."
          actionLabel={selectedCourseId !== 'all' || debouncedSearch ? 'Reset filters' : undefined}
          onAction={
            selectedCourseId !== 'all' || debouncedSearch
              ? () => {
                  setSearchInput('');
                  updateParams({ courseId: 'all', q: '', page: 1 });
                }
              : undefined
          }
          mood="empty"
        />
      ) : (
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[14px]">
              <thead>
                <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4">Progress</th>
                  <th className="py-3.5 px-4">Last active</th>
                  <th className="py-3.5 px-4">Exam score</th>
                  <th className="py-3.5 px-4">Certificate</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1F5]">
                {students.map((stu) => (
                  <tr
                    key={`${stu.id}-${stu.courseId}`}
                    onClick={() => setSelectedStudentRef(stu)}
                    className="hover:bg-[#FAF8FF] cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={stu.avatar} name={stu.name} size="sm" status="online" />
                        <div>
                          <p className="font-bold text-[#1E1B2E]">{stu.name}</p>
                          <p className="text-[12px] text-[#5F5B75]">{stu.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-[13px] font-semibold text-[#1E1B2E]">
                      {stu.courseTitle}
                    </td>
                    <td className="py-4 px-4 w-44">
                      <ProgressBar
                        value={stu.progressPercent}
                        size="sm"
                        color={stu.progressPercent === 100 ? 'success' : 'primary'}
                      />
                    </td>
                    <td className="py-4 px-4 text-[13px] text-[#5F5B75] whitespace-nowrap">
                      {stu.lastActive}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {stu.examScore !== null ? (
                        <StatusChip
                          label={`${stu.examScore}% (${stu.examPassed ? 'Passed' : 'Failed'})`}
                          variant={stu.examPassed ? 'success' : 'danger'}
                        />
                      ) : (
                        <span className="text-[12px] text-[#5F5B75]">Not taken</span>
                      )}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {stu.certificateIssued ? (
                        <StatusChip label="Yes" variant="success" />
                      ) : (
                        <StatusChip label="No" variant="neutral" dot={false} />
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudentRef(stu);
                        }}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={(nextPage) => updateParams({ page: nextPage })}
          />
        </div>
      )}

      {/* STUDENT DETAIL DRAWER */}
      <Drawer
        open={Boolean(selectedStudentRef)}
        onClose={() => setSelectedStudentRef(null)}
        title={
          selectedStudentRef ? `${selectedStudentRef.name} — Progress` : 'Student progress'
        }
        footer={
          <Button
            variant="primary"
            fullWidth
            onClick={() => setSelectedStudentRef(null)}
          >
            Close student inspector
          </Button>
        }
      >
        {selectedStudentRef && (
          <div className="space-y-6 text-[14px]">
            <div className="p-4 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar
                  src={selectedStudentRef.avatar}
                  name={selectedStudentRef.name}
                  size="lg"
                />
                <div>
                  <p className="font-display font-bold text-[18px] text-[#1E1B2E]">
                    {selectedStudentRef.name}
                  </p>
                  <p className="text-[12px] text-[#5F5B75]">{selectedStudentRef.email}</p>
                  <p className="text-[12px] font-bold text-[#6D4AE0] mt-0.5">
                    {selectedStudentRef.courseTitle}
                  </p>
                </div>
              </div>
              <ProgressRing
                value={activeDetail?.progressPercent ?? selectedStudentRef.progressPercent}
                size={64}
                strokeWidth={6}
              />
            </div>

            {studentDetailQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-[10px]" />
                <Skeleton className="h-36 w-full rounded-[10px]" />
                <Skeleton className="h-24 w-full rounded-[10px]" />
              </div>
            ) : studentDetailQuery.isError || !activeDetail ? (
              <QueryErrorState
                title="Could not load student breakdown"
                error={studentDetailQuery.error}
                onRetry={() => void studentDetailQuery.refetch()}
              />
            ) : (
              <>
                {/* Lesson-by-lesson progress */}
                <div className="space-y-2.5">
                  <h4 className="font-display font-bold text-[17px] text-[#1E1B2E]">
                    Lesson-by-lesson watch progress ({activeDetail.completedLessons}/
                    {activeDetail.totalLessons})
                  </h4>
                  <div className="divide-y divide-[#E6E1F5] rounded-[10px] border border-[#E6E1F5] overflow-hidden">
                    {activeDetail.lessonBreakdown.map((ls) => (
                      <div
                        key={ls.id}
                        className="p-3 bg-white flex items-center justify-between gap-3 text-[13px]"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-[#1E1B2E] truncate">{ls.title}</p>
                          <p className="text-[11px] text-[#5F5B75]">
                            Duration: {ls.duration} • Watched {ls.watchedPercent}%
                          </p>
                        </div>
                        <StatusChip
                          label={ls.status}
                          variant={
                            ls.status === 'Completed'
                              ? 'success'
                              : ls.status === 'In progress'
                                ? 'orange'
                                : 'neutral'
                          }
                          dot={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exam attempts history */}
                <div className="space-y-2.5">
                  <h4 className="font-display font-bold text-[17px] text-[#1E1B2E]">
                    Certification exam attempts ({activeDetail.examAttempts.length}/
                    {activeDetail.maxAttemptsAllowed})
                  </h4>
                  {activeDetail.examAttempts.length === 0 ? (
                    <p className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] text-[#5F5B75]">
                      Student has not attempted the final certification exam yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {activeDetail.examAttempts.map((att) => (
                        <div
                          key={att.attemptNumber}
                          className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-[#1E1B2E]">
                              Attempt #{att.attemptNumber} • {att.scorePercent}%
                            </p>
                            <p className="text-[12px] text-[#5F5B75]">
                              {att.date} • Time taken: {att.timeTaken}
                            </p>
                          </div>
                          <StatusChip
                            label={att.passed ? 'Passed' : 'Failed'}
                            variant={att.passed ? 'success' : 'danger'}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Certificate status */}
                {activeDetail.certificateIssued && activeDetail.certificateId && (
                  <div className="p-4 rounded-[10px] bg-[#16A34A]/10 border border-[#16A34A]/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Award className="w-5 h-5 text-[#16A34A]" />
                      <div>
                        <p className="font-bold text-[13px] text-[#1E1B2E]">
                          Certificate issued ({activeDetail.certificateId})
                        </p>
                        <p className="text-[11px] text-[#5F5B75]">
                          100% lessons & passing exam verified
                        </p>
                      </div>
                    </div>
                    <Link to={`/verify/${activeDetail.certificateId}`}>
                      <Button size="sm" variant="secondary" className="bg-white">
                        Verify
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

// ============================================================================
// 7. COMMENTS INBOX (/instructor/comments)
// ============================================================================
export const InstructorCommentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: 'unanswered' | 'all' =
    searchParams.get('tab') === 'all' ? 'all' : 'unanswered';
  const page = parsePositivePage(searchParams.get('page'));

  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);

  const commentsQuery = useInstructorComments({ status: activeTab, page, limit: 10 });
  const dashboardQuery = useInstructorDashboard();
  const allCountQuery = useInstructorComments({ status: 'all', page: 1, limit: 1 });

  const replyMutation = useReplyInstructorCommentMutation();
  const resolveMutation = useResolveInstructorCommentMutation();
  const likeMutation = useToggleInstructorCommentLikeMutation();

  const updateParams = (patch: { tab?: 'unanswered' | 'all'; page?: number }) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (patch.tab !== undefined) {
          if (patch.tab === 'unanswered') next.delete('tab');
          else next.set('tab', patch.tab);
        }
        if (patch.page !== undefined) {
          if (patch.page <= 1) next.delete('page');
          else next.set('page', String(patch.page));
        }
        return next;
      },
      { replace: true }
    );
  };

  const displayedThreads = commentsQuery.data?.items ?? [];
  const meta = commentsQuery.data?.meta;
  const unansweredCount = dashboardQuery.data?.unansweredCommentsCount;
  const allCommentsCount = allCountQuery.data?.meta.total;

  const handlePostReply = async (threadId: string, alreadyResolved: boolean) => {
    const text = replyInputs[threadId]?.trim();
    if (!text) return;
    setReplyingId(threadId);
    try {
      await replyMutation.mutateAsync({ commentId: threadId, content: text });
      if (!alreadyResolved) {
        await resolveMutation.mutateAsync({
          commentId: threadId,
          resolved: true,
          silent: true,
        });
      }
      setReplyInputs((prev) => ({ ...prev, [threadId]: '' }));
    } catch {
      // Handled via mutation error toast
    } finally {
      setReplyingId(null);
    }
  };

  const handleToggleResolved = async (threadId: string, currentlyResolved: boolean) => {
    setResolvingId(threadId);
    try {
      await resolveMutation.mutateAsync({
        commentId: threadId,
        resolved: !currentlyResolved,
      });
    } catch {
      // Handled via mutation error toast
    } finally {
      setResolvingId(null);
    }
  };

  const handleToggleLike = async (threadId: string, currentlyLiked: boolean) => {
    setLikingId(threadId);
    try {
      await likeMutation.mutateAsync({ commentId: threadId, currentlyLiked });
    } catch {
      // Handled via mutation error toast
    } finally {
      setLikingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Instructor dashboard', to: '/instructor/dashboard' },
          { label: 'Comments inbox' },
        ]}
      />

      <div>
        <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
          Comments inbox
        </h1>
        <p className="text-[16px] text-[#5F5B75]">
          Reply to student questions across your video lessons and mark threads as resolved.
        </p>
      </div>

      {/* Tabs: Unanswered, All */}
      <div
        role="tablist"
        className="inline-flex items-center gap-1.5 p-1.5 rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5]"
      >
        {(
          [
            { id: 'unanswered', label: 'Unanswered', count: unansweredCount },
            { id: 'all', label: 'All comments', count: allCommentsCount },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => updateParams({ tab: tab.id, page: 1 })}
              className={`h-9 px-4 rounded-[10px] text-[14px] font-bold inline-flex items-center gap-2 cursor-pointer transition-all ${
                active
                  ? 'bg-white text-[#6D4AE0] shadow-purple-sm'
                  : 'text-[#5F5B75] hover:text-[#1E1B2E]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-2 py-0.5 text-[11px] rounded-full ${
                    active ? 'bg-[#F3EFFF] text-[#6D4AE0]' : 'bg-white text-[#5F5B75]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {commentsQuery.isFetching && !commentsQuery.isLoading && (
        <p className="text-[12px] font-semibold text-[#6D4AE0]">Refreshing threads…</p>
      )}

      {commentsQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-44 w-full rounded-[12px]" />
          ))}
        </div>
      ) : commentsQuery.isError ? (
        <QueryErrorState
          title="Could not load comments inbox"
          error={commentsQuery.error}
          onRetry={() => void commentsQuery.refetch()}
        />
      ) : displayedThreads.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'unanswered'
              ? 'Inbox zero — all student questions answered!'
              : 'No lesson comments yet'
          }
          description={
            activeTab === 'unanswered'
              ? "You have replied to all unanswered student questions. Switch to the 'All comments' tab to review past discussions."
              : 'Student questions from your course lessons will appear here.'
          }
          actionLabel={activeTab === 'unanswered' ? 'View all comments' : undefined}
          onAction={
            activeTab === 'unanswered'
              ? () => updateParams({ tab: 'all', page: 1 })
              : undefined
          }
          mood={activeTab === 'unanswered' ? 'success' : 'empty'}
        />
      ) : (
        <div className="space-y-4">
          {displayedThreads.map((th) => {
            const isReplying = replyingId === th.id;
            const isResolving = resolvingId === th.id;
            const isLiking = likingId === th.id;
            return (
              <div
                key={th.id}
                className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={th.studentAvatar} name={th.studentName} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-display font-bold text-[17px] text-[#1E1B2E]">
                          {th.studentName}
                        </p>
                        <span className="text-[12px] text-[#5F5B75]">• {th.createdAt}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                        <span className="text-[#5F5B75]">{th.courseTitle} •</span>
                        <Link
                          to={`/learn/${th.courseId}/${th.lessonId}`}
                          className="font-bold text-[#6D4AE0] hover:underline inline-flex items-center gap-1"
                        >
                          <span>{th.lessonTitle}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusChip
                      label={th.resolved ? 'Resolved' : 'Unanswered'}
                      variant={th.resolved ? 'success' : 'orange'}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={isResolving}
                      disabled={isResolving}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      onClick={() => void handleToggleResolved(th.id, th.resolved)}
                    >
                      {th.resolved ? 'Reopen' : 'Mark as resolved'}
                    </Button>
                  </div>
                </div>

                <p className="text-[15px] text-[#1E1B2E] leading-relaxed">{th.content}</p>

                {/* Existing Replies */}
                {th.replies.length > 0 && (
                  <div className="pl-5 border-l-2 border-[#6D4AE0] space-y-2.5">
                    {th.replies.map((rep) => (
                      <div
                        key={rep.id}
                        className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar src={rep.authorAvatar} name={rep.authorName} size="sm" />
                          <span className="font-bold text-[13px] text-[#1E1B2E]">
                            {rep.authorName}
                          </span>
                          {rep.isInstructor && (
                            <span className="px-2 py-0.5 rounded-full bg-[#6D4AE0] text-white text-[10px] font-bold">
                              Instructor
                            </span>
                          )}
                          <span className="text-[11px] text-[#5F5B75]">• {rep.createdAt}</span>
                        </div>
                        <p className="text-[13px] text-[#1E1B2E]">{rep.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Like + Inline Reply Box */}
                <div className="pt-3 border-t border-[#E6E1F5] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    disabled={isLiking}
                    onClick={() => void handleToggleLike(th.id, th.likedByInstructor)}
                    className={`h-10 px-3.5 rounded-[10px] border text-[13px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60 ${
                      th.likedByInstructor
                        ? 'bg-[#F3EFFF] border-[#6D4AE0] text-[#6D4AE0]'
                        : 'bg-white border-[#E6E1F5] text-[#5F5B75] hover:text-[#1E1B2E]'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Like ({th.likesCount})</span>
                  </button>

                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={replyInputs[th.id] || ''}
                      onChange={(e) =>
                        setReplyInputs((prev) => ({ ...prev, [th.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handlePostReply(th.id, th.resolved);
                        }
                      }}
                      disabled={isReplying}
                      placeholder={`Write an instructor reply to ${th.studentName}...`}
                      aria-label={`Write an instructor reply to ${th.studentName}`}
                      className="flex-1 h-11 px-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] focus:bg-white focus:border-[#6D4AE0] focus:outline-none text-[13px] text-[#1E1B2E] disabled:opacity-60"
                    />
                    <Button
                      size="md"
                      variant="primary"
                      loading={isReplying}
                      disabled={isReplying || !(replyInputs[th.id] || '').trim()}
                      leftIcon={<Send className="w-4 h-4" />}
                      onClick={() => void handlePostReply(th.id, th.resolved)}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={(nextPage) => updateParams({ page: nextPage })}
          />
        </div>
      )}
    </div>
  );
};
