import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Lock,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { isApiError } from '../../api/errors';
import {
  useApproveCommentMutation,
  useApproveCourseReviewMutation,
  useBulkApproveCommentsMutation,
  useDeleteCommentMutation,
  useRejectCommentMutation,
  useRejectCourseReviewMutation,
  useRequestCourseChangesMutation,
  useResolveModerationReportMutation,
  useRestoreCommentMutation,
  useSupervisorCommentCounts,
  useSupervisorComments,
  useSupervisorCourseReviewDetail,
  useSupervisorCourseReviews,
  useSupervisorDashboard,
  useSupervisorReports,
  useUpdateCourseReviewChecklistMutation,
} from '../../api/hooks/useSupervisor';
import {
  COMMENT_REJECTION_REASON_TO_DTO,
  REPORT_TAB_TO_DTO,
  SUPERVISOR_COMMENT_TAB_TO_DTO,
  type SupervisorCommentTab,
  type SupervisorRejectReasonLabel,
  type SupervisorReportTab,
} from '../../api/mappers/supervisor.mapper';
import type {
  SupervisorCommentItem,
  SupervisorCourseSubmission,
} from '../../api/dto-types-bridge';
import {
  Avatar,
  Breadcrumbs,
  Button,
  ConfirmDialog,
  EmptyState,
  Pagination,
  QueryErrorState,
  Skeleton,
  StatusChip,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { handleImageError } from '../../utils/imageFallback';
import { CourseWorkflowBanner } from '../admin/AdminPages';

const COMMENT_TABS: SupervisorCommentTab[] = [
  'Pending',
  'Flagged',
  'Approved',
  'Rejected',
];
const REPORT_TABS: SupervisorReportTab[] = ['All', 'Open', 'Investigating', 'Resolved'];

function parseCommentTab(raw: string | null): SupervisorCommentTab {
  if (raw && (COMMENT_TABS as string[]).includes(raw)) {
    return raw as SupervisorCommentTab;
  }
  return 'Pending';
}

function parseReportTab(raw: string | null): SupervisorReportTab {
  if (raw && (REPORT_TABS as string[]).includes(raw)) {
    return raw as SupervisorReportTab;
  }
  return 'All';
}

function parsePositivePage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

// ============================================================================
// 1. SUPERVISOR DASHBOARD (/supervisor/dashboard)
// Counters (Pending comments, Flagged, Courses awaiting review, Resolved today),
// queue chart, recent moderation actions.
// ============================================================================
export const SupervisorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dashboardQuery = useSupervisorDashboard();

  const supervisorName = user?.name || 'Supervisor';
  const dashboard = dashboardQuery.data;

  const queueVolume = dashboard?.queueVolumeLast7Days ?? [];
  const maxQueueCount = useMemo(() => {
    const peak = queueVolume.reduce(
      (acc, point) => Math.max(acc, point.incoming, point.resolved),
      0
    );
    return Math.max(35, peak);
  }, [queueVolume]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip label="Content moderator & academic supervisor" variant="success" />
            <span className="text-[12px] font-semibold text-[#5F5B75]">
              Cannot manage users or platform settings (Admin routes enforce 403)
            </span>
          </div>
          <h1 className="text-[34px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Welcome, {supervisorName}
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Verify student lesson comments, review submitted instructor courses, and resolve
            community reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/supervisor/comments">
            <Button variant="primary">Moderate comments</Button>
          </Link>
          <Link to="/supervisor/course-review">
            <Button variant="secondary">Review courses</Button>
          </Link>
          <Button
            variant="ghost"
            size="md"
            className="border border-[#E6E1F5]"
            leftIcon={<Lock className="w-4 h-4 text-[#DC2626]" />}
            onClick={() => navigate('/admin/users')}
          >
            Test /admin 403 guard
          </Button>
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
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-16" />
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
          {/* 4 COUNTERS: Pending comments, Flagged, Courses awaiting review, Resolved today */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                label: 'Pending comments',
                value: String(dashboard.kpis.pendingCommentsCount),
                sub: 'Awaiting Verified badge',
                icon: <Clock className="w-5 h-5 text-[#6D4AE0]" />,
                to: '/supervisor/comments?tab=Pending',
              },
              {
                label: 'Flagged',
                value: String(dashboard.kpis.flaggedCommentsCount),
                sub: 'Spam & off-topic reports',
                icon: <ShieldAlert className="w-5 h-5 text-[#DC2626]" />,
                to: '/supervisor/comments?tab=Flagged',
              },
              {
                label: 'Courses awaiting review',
                value: String(dashboard.kpis.coursesAwaitingReviewCount),
                sub: 'Submitted by instructors',
                icon: <ClipboardCheck className="w-5 h-5 text-[#F59E3B]" />,
                to: '/supervisor/course-review',
              },
              {
                label: 'Resolved today',
                value: String(dashboard.kpis.resolvedTodayCount),
                sub: `${dashboard.kpis.slaCompliancePercent}% SLA compliance`,
                icon: <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />,
                to: '/supervisor/reports',
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

          {/* QUEUE CHART & RECENT MODERATION ACTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Queue Chart (7-day incoming vs resolved) */}
            <div className="lg:col-span-7 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#6D4AE0]" />
                    <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                      Moderation queue volume (7 days)
                    </h2>
                  </div>
                  <p className="text-[13px] text-[#5F5B75]">
                    Incoming items vs. resolved decisions per day
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[12px] font-bold">
                  <span className="flex items-center gap-1.5 text-[#6D4AE0]">
                    <span className="w-3 h-3 rounded-xs bg-[#6D4AE0]" /> Incoming
                  </span>
                  <span className="flex items-center gap-1.5 text-[#16A34A]">
                    <span className="w-3 h-3 rounded-xs bg-[#16A34A]" /> Resolved
                  </span>
                </div>
              </div>

              <div className="h-44 flex items-end justify-between gap-3 pt-4 border-b border-[#E6E1F5] pb-2">
                {queueVolume.map((point) => (
                  <div
                    key={point.date}
                    className="flex-1 h-full flex flex-col items-center justify-end gap-1.5"
                  >
                    <div className="w-full flex items-end justify-center gap-1 h-full">
                      <div
                        className="w-3 sm:w-4 rounded-t-[4px] bg-[#6D4AE0]"
                        style={{
                          height: `${Math.round((point.incoming / maxQueueCount) * 100)}%`,
                        }}
                        title={`${point.day} incoming: ${point.incoming}`}
                      />
                      <div
                        className="w-3 sm:w-4 rounded-t-[4px] bg-[#16A34A]"
                        style={{
                          height: `${Math.round((point.resolved / maxQueueCount) * 100)}%`,
                        }}
                        title={`${point.day} resolved: ${point.resolved}`}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#5F5B75]">
                      {point.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Moderation Actions */}
            <div className="lg:col-span-5 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                  Recent moderation actions
                </h2>
                <p className="text-[13px] text-[#5F5B75]">
                  Audit trail of your latest decisions
                </p>
              </div>

              {dashboard.recentActions.length === 0 ? (
                <p className="text-[13px] text-[#5F5B75] py-6">
                  No moderation decisions recorded yet.
                </p>
              ) : (
                <div className="space-y-3 text-[13px] flex-1">
                  {dashboard.recentActions.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <StatusChip label={act.badge} variant={act.variant} dot={false} />
                        <span className="text-[11px] text-[#5F5B75]">
                          {act.timeLabel}
                        </span>
                      </div>
                      <p className="font-semibold text-[#1E1B2E]">{act.summary}</p>
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
// 2. COMMENT MODERATION (/supervisor/comments)
// Tabs (Pending, Flagged, Approved, Rejected) with counts. Split view: left list
// (author + role badge, excerpt, course/lesson link, time, report reason chips);
// right detail panel with the full comment, parent thread context and author history.
// Actions: Approve, Reject with reason select (Spam, Offensive, Off-topic, Other),
// Delete. Bulk select + "Approve selected", Undo restore bar, empty state.
// ============================================================================
export const SupervisorCommentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseCommentTab(searchParams.get('tab'));
  const page = parsePositivePage(searchParams.get('page'));

  const [selectedId, setSelectedId] = useState<string>('');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState<SupervisorRejectReasonLabel>('Spam');
  const [mobileShowDetail, setMobileShowDetail] = useState<boolean>(false);
  const [commentToDelete, setCommentToDelete] = useState<SupervisorCommentItem | null>(
    null
  );
  const [undoAction, setUndoAction] = useState<{
    commentId: string;
    label: string;
  } | null>(null);

  const commentsQuery = useSupervisorComments({
    status: SUPERVISOR_COMMENT_TAB_TO_DTO[activeTab],
    page,
    limit: 12,
  });
  const tabCounts = useSupervisorCommentCounts();

  const approveMutation = useApproveCommentMutation();
  const rejectMutation = useRejectCommentMutation();
  const restoreMutation = useRestoreCommentMutation();
  const deleteMutation = useDeleteCommentMutation();
  const bulkApproveMutation = useBulkApproveCommentsMutation();

  const tabItems = useMemo(
    () => commentsQuery.data?.items ?? [],
    [commentsQuery.data?.items]
  );
  const meta = commentsQuery.data?.meta;

  const activeComment = useMemo(() => {
    return tabItems.find((i) => i.id === selectedId) || tabItems[0] || null;
  }, [tabItems, selectedId]);

  useEffect(() => {
    const visibleIds = new Set(tabItems.map((item) => item.id));
    setCheckedIds((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) => visibleIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [tabItems]);

  const isAnyCommentMutationPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    restoreMutation.isPending ||
    deleteMutation.isPending ||
    bulkApproveMutation.isPending;

  const handleSelectTab = (tab: SupervisorCommentTab) => {
    setSearchParams({ tab, page: '1' });
    setCheckedIds([]);
    setSelectedId('');
    setMobileShowDetail(false);
  };

  const handlePageChange = (nextPage: number) => {
    setSearchParams({ tab: activeTab, page: String(nextPage) });
    setCheckedIds([]);
    setMobileShowDetail(false);
  };

  const handleApproveComment = async (comment: SupervisorCommentItem) => {
    setUndoAction(null);
    await approveMutation.mutateAsync({
      commentId: comment.id,
      authorName: comment.authorName,
    });
  };

  const handleRejectComment = async (comment: SupervisorCommentItem) => {
    const reasonDto = COMMENT_REJECTION_REASON_TO_DTO[rejectReason];
    await rejectMutation.mutateAsync({
      commentId: comment.id,
      authorName: comment.authorName,
      payload: { reason: reasonDto },
    });
    setUndoAction({
      commentId: comment.id,
      label: `Rejected comment (${rejectReason}) by ${comment.authorName}`,
    });
  };

  const handleDeleteComment = async (comment: SupervisorCommentItem) => {
    await deleteMutation.mutateAsync({
      commentId: comment.id,
      authorName: comment.authorName,
    });
    if (undoAction?.commentId === comment.id) {
      setUndoAction(null);
    }
    setCommentToDelete(null);
    setMobileShowDetail(false);
  };

  const handleBulkApproveSelected = async () => {
    if (checkedIds.length === 0) return;
    await bulkApproveMutation.mutateAsync({ ids: checkedIds });
    setCheckedIds([]);
  };

  const handleUndo = async () => {
    if (!undoAction) return;
    await restoreMutation.mutateAsync({
      commentId: undoAction.commentId,
      label: undoAction.label,
    });
    setUndoAction(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Supervisor dashboard', to: '/supervisor/dashboard' },
          { label: 'Comment moderation' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Comment moderation
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Verify student lesson comments to apply the green Verified badge, or reject spam and off-topic posts.
          </p>
        </div>
      </div>

      {/* Undo Bar when a comment was just rejected */}
      {undoAction && (
        <div className="rounded-[12px] bg-[#1E1B2E] text-white px-4 py-3 shadow-purple-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[13px]">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>{undoAction.label}</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="primary"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            loading={restoreMutation.isPending}
            onClick={() => void handleUndo()}
          >
            Undo
          </Button>
        </div>
      )}

      {/* Toolbar: Tabs (Pending, Flagged, Approved, Rejected) with counts + Bulk "Approve selected" */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          role="tablist"
          className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5]"
        >
          {COMMENT_TABS.map((tab) => {
            const count =
              tab === activeTab && meta ? meta.total : tabCounts[tab];
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleSelectTab(tab)}
                className={`h-9 px-3.5 rounded-[10px] text-[13px] font-bold inline-flex items-center gap-2 cursor-pointer transition-all ${
                  active
                    ? 'bg-white text-[#6D4AE0] shadow-purple-sm'
                    : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                }`}
              >
                <span>{tab}</span>
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

        {checkedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-[#6D4AE0]">
              {checkedIds.length} selected
            </span>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              loading={bulkApproveMutation.isPending}
              disabled={isAnyCommentMutationPending}
              onClick={() => void handleBulkApproveSelected()}
            >
              Approve selected
            </Button>
          </div>
        )}
      </div>

      {commentsQuery.isError ? (
        <QueryErrorState
          error={commentsQuery.error}
          onRetry={() => void commentsQuery.refetch()}
        />
      ) : commentsQuery.isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 rounded-[12px] bg-white border border-[#E6E1F5] p-4 space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="space-y-2 pb-3 border-b border-[#E6E1F5] last:border-b-0">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-52" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-7 rounded-[12px] bg-white border border-[#E6E1F5] p-6 space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-24 w-full rounded-[10px]" />
            <Skeleton className="h-28 w-full rounded-[10px]" />
            <Skeleton className="h-10 w-full rounded-[10px]" />
          </div>
        </div>
      ) : tabItems.length === 0 ? (
        <EmptyState
          title="All caught up"
          description={`There are no ${activeTab.toLowerCase()} comments waiting in this queue right now. Great job keeping the learning community safe and helpful!`}
          actionLabel={activeTab !== 'Approved' ? 'View Approved comments' : undefined}
          onAction={
            activeTab !== 'Approved' ? () => handleSelectTab('Approved') : undefined
          }
          mood="success"
        />
      ) : (
        /* RESPONSIVE SPLIT VIEW (On desktop: Left list 5 cols + Right detail 7 cols; On mobile: list first, then detail) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT LIST PANEL */}
          <div
            className={`lg:col-span-5 space-y-4 ${
              mobileShowDetail ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
              <div className="px-4 py-3 bg-[#FAF8FF] border-b border-[#E6E1F5] flex items-center justify-between text-[12px] font-bold text-[#5F5B75]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      tabItems.length > 0 &&
                      tabItems.every((i) => checkedIds.includes(i.id))
                    }
                    onChange={(e) =>
                      setCheckedIds(e.target.checked ? tabItems.map((i) => i.id) : [])
                    }
                    className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                  />
                  <span>Select all ({tabItems.length})</span>
                </label>
                <span>Click a comment to inspect</span>
              </div>

              <div className="divide-y divide-[#E6E1F5]">
                {tabItems.map((cm) => {
                  const isSelected = activeComment?.id === cm.id;
                  const isChecked = checkedIds.includes(cm.id);
                  return (
                    <div
                      key={cm.id}
                      onClick={() => {
                        setSelectedId(cm.id);
                        setMobileShowDetail(true);
                      }}
                      className={`p-4 cursor-pointer transition-colors space-y-2 ${
                        isSelected
                          ? 'bg-[#F3EFFF] border-l-4 border-l-[#6D4AE0]'
                          : 'hover:bg-[#FAF8FF]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            aria-label={`Select comment by ${cm.authorName}`}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() =>
                              setCheckedIds((prev) =>
                                prev.includes(cm.id)
                                  ? prev.filter((id) => id !== cm.id)
                                  : [...prev, cm.id]
                              )
                            }
                            className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                          />
                          <Avatar src={cm.authorAvatar} name={cm.authorName} size="sm" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[14px] text-[#1E1B2E]">
                                {cm.authorName}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-white border border-[#E6E1F5] text-[10px] font-bold text-[#6D4AE0]">
                                {cm.authorRole}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#5F5B75]">{cm.createdAt}</p>
                          </div>
                        </div>

                        {cm.reportReasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-end">
                            {cm.reportReasons.map((r) => (
                              <span
                                key={r}
                                className="px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] text-[10px] font-bold"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="text-[13px] text-[#1E1B2E] line-clamp-2">{cm.content}</p>

                      <Link
                        to={`/learn/${cm.courseId}/${cm.lessonId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-bold text-[#6D4AE0] hover:underline inline-flex items-center gap-1"
                      >
                        <span>
                          {cm.courseTitle} • {cm.lessonTitle}
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>

          {/* RIGHT DETAIL PANEL */}
          <div
            className={`lg:col-span-7 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-6 ${
              mobileShowDetail ? 'block' : 'hidden lg:block'
            }`}
          >
            {activeComment && (
              <>
                <button
                  type="button"
                  onClick={() => setMobileShowDetail(false)}
                  className="lg:hidden inline-flex items-center gap-1.5 text-[13px] font-bold text-[#6D4AE0] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to comment list</span>
                </button>

                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6E1F5]">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={activeComment.authorAvatar}
                      name={activeComment.authorName}
                      size="lg"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display font-bold text-[20px] text-[#1E1B2E]">
                          {activeComment.authorName}
                        </h2>
                        <StatusChip
                          label={activeComment.authorRole}
                          variant="primary"
                          dot={false}
                        />
                      </div>
                      <Link
                        to={`/learn/${activeComment.courseId}/${activeComment.lessonId}`}
                        className="text-[12px] font-bold text-[#6D4AE0] hover:underline inline-flex items-center gap-1"
                      >
                        <span>
                          {activeComment.courseTitle} — {activeComment.lessonTitle}
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                  <StatusChip
                    label={activeComment.status}
                    variant={
                      activeComment.status === 'Approved'
                        ? 'success'
                        : activeComment.status === 'Flagged' ||
                          activeComment.status === 'Rejected'
                        ? 'danger'
                        : 'warning'
                    }
                  />
                </div>

                {/* Parent Thread Context */}
                <div className="p-4 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6D4AE0]">
                    Parent thread context ({activeComment.parentThreadContext.promptTime})
                  </p>
                  <p className="text-[13px] font-bold text-[#1E1B2E]">
                    {activeComment.parentThreadContext.promptAuthor}
                  </p>
                  <p className="text-[13px] text-[#5F5B75]">
                    “{activeComment.parentThreadContext.promptText}”
                  </p>
                </div>

                {/* Full Comment Body */}
                <div className="space-y-2">
                  <p className="text-[12px] font-bold text-[#5F5B75]">
                    Submitted comment ({activeComment.createdAt}):
                  </p>
                  <div className="p-4 rounded-[12px] bg-[#F3EFFF]/50 border border-[#E6E1F5] text-[15px] text-[#1E1B2E] leading-relaxed">
                    {activeComment.content}
                  </div>
                </div>

                {/* Author History */}
                <div className="p-4 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#1E1B2E] inline-flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-[#6D4AE0]" />
                      Author moderation history
                    </span>
                    <StatusChip
                      label={activeComment.authorHistory.trustStanding}
                      variant={
                        activeComment.authorHistory.trustStanding === 'Good standing'
                          ? 'success'
                          : 'warning'
                      }
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-[12px]">
                    <div className="p-2.5 rounded-[8px] bg-white border border-[#E6E1F5]">
                      <p className="text-[#5F5B75]">Joined</p>
                      <p className="font-bold text-[#1E1B2E]">
                        {activeComment.authorHistory.joinedAt}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-[8px] bg-white border border-[#E6E1F5]">
                      <p className="text-[#5F5B75]">Approved posts</p>
                      <p className="font-bold text-[#16A34A]">
                        {activeComment.authorHistory.approvedComments} /{' '}
                        {activeComment.authorHistory.totalComments}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-[8px] bg-white border border-[#E6E1F5]">
                      <p className="text-[#5F5B75]">Prior flags</p>
                      <p className="font-bold text-[#DC2626]">
                        {activeComment.authorHistory.priorFlags}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-[#E6E1F5] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    loading={approveMutation.isPending}
                    disabled={isAnyCommentMutationPending}
                    onClick={() => void handleApproveComment(activeComment)}
                  >
                    Approve & apply Verified badge
                  </Button>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={rejectReason}
                      onChange={(e) =>
                        setRejectReason(e.target.value as SupervisorRejectReasonLabel)
                      }
                      disabled={isAnyCommentMutationPending}
                      aria-label="Rejection reason"
                      className="h-10 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-bold text-[#1E1B2E]"
                    >
                      <option value="Spam">Reason: Spam</option>
                      <option value="Offensive">Reason: Offensive</option>
                      <option value="Off-topic">Reason: Off-topic</option>
                      <option value="Other">Reason: Other</option>
                    </select>
                    <Button
                      variant="secondary"
                      size="md"
                      loading={rejectMutation.isPending}
                      disabled={isAnyCommentMutationPending}
                      onClick={() => void handleRejectComment(activeComment)}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      disabled={isAnyCommentMutationPending}
                      onClick={() => setCommentToDelete(activeComment)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(commentToDelete)}
        onClose={() => setCommentToDelete(null)}
        title="Delete moderated comment?"
        description={
          commentToDelete
            ? `Permanently delete the comment by ${commentToDelete.authorName}? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete comment"
        tone="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!commentToDelete) return;
          void handleDeleteComment(commentToDelete);
        }}
      />
    </div>
  );
};

// ============================================================================
// 3. COURSE REVIEW (/supervisor/course-review)
// Queue table (course, instructor, submitted date, status). Review page: course
// preview, 5-point quality checklist with pass/fail toggles, notes box, buttons
// "Approve", "Request changes", "Reject" (reason required).
// ============================================================================
export const SupervisorCourseReviewPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositivePage(searchParams.get('page'));
  const selectedCourseIdParam = searchParams.get('courseId') || '';

  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [notesError, setNotesError] = useState<string>('');

  const reviewsQuery = useSupervisorCourseReviews({ status: 'all', page, limit: 12 });
  const submissions = useMemo(
    () => reviewsQuery.data?.items ?? [],
    [reviewsQuery.data?.items]
  );
  const meta = reviewsQuery.data?.meta;

  const listedSub = useMemo(
    () =>
      submissions.find(
        (s) => s.courseId === selectedCourseIdParam || s.id === selectedCourseIdParam
      ) ?? null,
    [submissions, selectedCourseIdParam]
  );

  const shouldFetchDetail = Boolean(selectedCourseIdParam) && !listedSub;
  const detailQuery = useSupervisorCourseReviewDetail(
    selectedCourseIdParam,
    shouldFetchDetail
  );

  const activeSub: SupervisorCourseSubmission | undefined =
    listedSub || detailQuery.data || submissions[0];

  useEffect(() => {
    if (!activeSub) return;
    setReviewNotes(activeSub.rejectionReason || '');
    setNotesError('');
  }, [activeSub?.id, activeSub?.rejectionReason]);

  const checklistMutation = useUpdateCourseReviewChecklistMutation();
  const approveMutation = useApproveCourseReviewMutation();
  const requestChangesMutation = useRequestCourseChangesMutation();
  const rejectMutation = useRejectCourseReviewMutation();

  const isDecisionPending =
    approveMutation.isPending ||
    requestChangesMutation.isPending ||
    rejectMutation.isPending;

  const handleSelectSubmission = (sub: SupervisorCourseSubmission) => {
    setSearchParams({
      page: String(page),
      courseId: sub.courseId,
    });
  };

  const handleToggleChecklist = (
    key: keyof SupervisorCourseSubmission['checklist'],
    val: 'pass' | 'fail'
  ) => {
    if (!activeSub || checklistMutation.isPending) return;
    checklistMutation.mutate({
      courseId: activeSub.courseId,
      checklist: {
        ...activeSub.checklist,
        [key]: val,
      },
    });
  };

  const handleDecision = async (
    decision: 'Published' | 'Changes requested' | 'Rejected'
  ) => {
    if (!activeSub) return;
    const trimmedNotes = reviewNotes.trim();
    if (
      (decision === 'Rejected' || decision === 'Changes requested') &&
      trimmedNotes.length < 8
    ) {
      setNotesError(
        'Reviewer notes / reason (at least 8 characters) are required when requesting changes or rejecting.'
      );
      return;
    }

    setNotesError('');

    try {
      if (decision === 'Published') {
        await approveMutation.mutateAsync({
          courseId: activeSub.courseId,
          courseTitle: activeSub.title,
          instructorName: activeSub.instructorName,
        });
      } else if (decision === 'Changes requested') {
        await requestChangesMutation.mutateAsync({
          courseId: activeSub.courseId,
          courseTitle: activeSub.title,
          instructorName: activeSub.instructorName,
          payload: { notes: trimmedNotes },
        });
      } else {
        await rejectMutation.mutateAsync({
          courseId: activeSub.courseId,
          courseTitle: activeSub.title,
          instructorName: activeSub.instructorName,
          payload: { reason: trimmedNotes },
        });
      }
    } catch (err) {
      if (isApiError(err) && err.status === 422) {
        const inlineErr =
          err.fieldErrors?.reason?.[0] ||
          err.fieldErrors?.notes?.[0] ||
          err.message;
        setNotesError(inlineErr);
      }
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Supervisor dashboard', to: '/supervisor/dashboard' },
          { label: 'Course review' },
        ]}
      />

      <div>
        <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
          Course review queue
        </h1>
        <p className="text-[16px] text-[#5F5B75]">
          Audit submitted instructor courses against the 5-point academic quality checklist.
        </p>
      </div>

      <CourseWorkflowBanner roleMode="supervisor" />

      {reviewsQuery.isError ? (
        <QueryErrorState
          error={reviewsQuery.error}
          onRetry={() => void reviewsQuery.refetch()}
        />
      ) : reviewsQuery.isLoading ? (
        <div className="space-y-6">
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="h-14 w-full rounded-[10px]" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Skeleton className="lg:col-span-5 h-96 rounded-[12px]" />
            <Skeleton className="lg:col-span-7 h-96 rounded-[12px]" />
          </div>
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState
          title="No courses in review queue"
          description="There are no submitted courses awaiting quality verification right now."
          mood="success"
        />
      ) : (
        <>
          {/* 1. QUEUE TABLE */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px] min-w-[680px]">
                <thead>
                  <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                    <th className="py-3.5 px-4">Course</th>
                    <th className="py-3.5 px-4">Instructor</th>
                    <th className="py-3.5 px-4">Submitted date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1F5]">
                  {submissions.map((sub) => {
                    const isSelected = activeSub?.id === sub.id;
                    return (
                      <tr
                        key={sub.id}
                        onClick={() => handleSelectSubmission(sub)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#F3EFFF]/60' : 'hover:bg-[#FAF8FF]'
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={sub.thumbnail}
                              alt={sub.title}
                              onError={handleImageError}
                              className="w-12 h-9 rounded-[6px] object-cover shrink-0 border border-[#E6E1F5]"
                            />
                            <div>
                              <p className="font-bold text-[#1E1B2E]">{sub.title}</p>
                              <p className="text-[12px] text-[#5F5B75]">
                                {sub.categoryName} • {sub.lessonsCount} lessons (
                                {sub.totalDuration})
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-medium text-[#1E1B2E]">
                          {sub.instructorName}
                        </td>
                        <td className="py-4 px-4 text-[13px] text-[#5F5B75]">
                          {sub.submittedDate}
                        </td>
                        <td className="py-4 px-4">
                          <StatusChip
                            label={sub.status}
                            variant={
                              sub.status === 'Published'
                                ? 'success'
                                : sub.status === 'Pending review'
                                ? 'warning'
                                : 'danger'
                            }
                          />
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button
                            size="sm"
                            variant={isSelected ? 'primary' : 'secondary'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectSubmission(sub);
                            }}
                          >
                            {isSelected ? 'Reviewing below' : 'Open review'}
                          </Button>
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
                onPageChange={(nextPage) =>
                  setSearchParams({
                    page: String(nextPage),
                    ...(selectedCourseIdParam ? { courseId: selectedCourseIdParam } : {}),
                  })
                }
              />
            </div>
          )}

          {/* 2. COURSE REVIEW WORKSPACE */}
          {activeSub && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 5 Cols: Course Preview Card */}
              <div className="lg:col-span-5 rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
                <img
                  src={activeSub.thumbnail}
                  alt={activeSub.title}
                  onError={handleImageError}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <StatusChip label={activeSub.categoryName} variant="primary" />
                    <span className="font-display font-bold text-[22px] text-[#6D4AE0]">
                      {activeSub.isFree || activeSub.price === 0
                        ? 'Free'
                        : `$${activeSub.price.toFixed(2)}`}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                      {activeSub.title}
                    </h2>
                    <p className="text-[13px] text-[#5F5B75] mt-1">{activeSub.subtitle}</p>
                  </div>

                  <div className="p-4 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-2 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-[#5F5B75]">Instructor</span>
                      <strong className="text-[#1E1B2E]">{activeSub.instructorName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5F5B75]">Curriculum</span>
                      <strong className="text-[#1E1B2E]">
                        {activeSub.sectionsCount} sections • {activeSub.lessonsCount}{' '}
                        lessons ({activeSub.totalDuration})
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5F5B75]">Question Bank size</span>
                      <strong
                        className={
                          activeSub.questionBankCount >= activeSub.requiredQuestionsCount
                            ? 'text-[#16A34A]'
                            : 'text-[#DC2626]'
                        }
                      >
                        {activeSub.questionBankCount} / {activeSub.requiredQuestionsCount}{' '}
                        required
                      </strong>
                    </div>
                  </div>

                  <Link to={`/courses/${activeSub.courseId}`} className="block">
                    <Button variant="secondary" fullWidth size="sm">
                      Open full public preview
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right 7 Cols: 5-Item Quality Checklist + Notes + Decision Buttons */}
              <div className="lg:col-span-7 rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-7 shadow-purple-sm space-y-6">
                <div>
                  <h3 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                    Quality verification checklist
                  </h3>
                  <p className="text-[14px] text-[#5F5B75]">
                    Toggle Pass or Fail on each criterion while reviewing {activeSub.title}.
                  </p>
                </div>

                <div className="space-y-3">
                  {(
                    [
                      {
                        key: 'titleAndDescription',
                        label: '1. Title and description',
                        desc: 'Clear learning outcomes, accurate level tag, and grammar verified',
                      },
                      {
                        key: 'coverAndDemoVideo',
                        label: '2. Cover and demo video',
                        desc: '16:9 cover image (under 5MB) and 1080p MP4 demo video with captions',
                      },
                      {
                        key: 'curriculumComplete',
                        label: '3. Curriculum complete',
                        desc: `${activeSub.sectionsCount} structured sections and ${activeSub.lessonsCount} video lessons uploaded`,
                      },
                      {
                        key: 'enoughQuestionsInBank',
                        label: '4. Enough questions in the bank',
                        desc: `Has ${activeSub.questionBankCount} of ${activeSub.requiredQuestionsCount} minimum required exam questions`,
                      },
                      {
                        key: 'pricingSet',
                        label: '5. Pricing set',
                        desc: `Enrollment price ($${activeSub.price.toFixed(2)}) complies with catalog tiers`,
                      },
                    ] as const
                  ).map((item) => {
                    const currentVal = activeSub.checklist[item.key];
                    return (
                      <div
                        key={item.key}
                        className={`p-4 rounded-[10px] border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          currentVal === 'pass'
                            ? 'bg-[#FAF8FF] border-[#E6E1F5]'
                            : 'bg-[#FEF2F2]/60 border-[#DC2626]/40'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-[14px] text-[#1E1B2E]">
                            {item.label}
                          </p>
                          <p className="text-[12px] text-[#5F5B75]">{item.desc}</p>
                        </div>

                        <div className="inline-flex items-center gap-1 p-1 rounded-[8px] bg-white border border-[#E6E1F5] shrink-0 self-start sm:self-center">
                          <button
                            type="button"
                            disabled={checklistMutation.isPending}
                            onClick={() => handleToggleChecklist(item.key, 'pass')}
                            className={`px-3 py-1 rounded-[6px] text-[12px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                              currentVal === 'pass'
                                ? 'bg-[#16A34A] text-white'
                                : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Pass</span>
                          </button>
                          <button
                            type="button"
                            disabled={checklistMutation.isPending}
                            onClick={() => handleToggleChecklist(item.key, 'fail')}
                            className={`px-3 py-1 rounded-[6px] text-[12px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                              currentVal === 'fail'
                                ? 'bg-[#DC2626] text-white'
                                : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Fail</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Supervisor Notes / Required Rejection Reason Box */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="supervisor-review-notes"
                    className="block text-[14px] font-bold text-[#1E1B2E]"
                  >
                    Supervisor review notes / rejection reason (required for Request changes or Reject)
                  </label>
                  <textarea
                    id="supervisor-review-notes"
                    rows={3}
                    value={reviewNotes}
                    disabled={isDecisionPending}
                    onChange={(e) => {
                      setReviewNotes(e.target.value);
                      setNotesError('');
                    }}
                    placeholder="Write feedback for the instructor (e.g. 'Please add 11 more questions to the Question Bank to meet the 20-question minimum')..."
                    className="w-full p-3.5 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[14px]"
                  />
                  {notesError && (
                    <p className="text-[12px] text-[#DC2626] font-bold">{notesError}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-[#E6E1F5] flex flex-wrap items-center justify-end gap-3">
                  <Button
                    variant="danger"
                    size="md"
                    loading={rejectMutation.isPending}
                    disabled={isDecisionPending}
                    onClick={() => void handleDecision('Rejected')}
                  >
                    Reject (reason required)
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    loading={requestChangesMutation.isPending}
                    disabled={isDecisionPending}
                    onClick={() => void handleDecision('Changes requested')}
                  >
                    Request changes
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    loading={approveMutation.isPending}
                    disabled={isDecisionPending}
                    onClick={() => void handleDecision('Published')}
                  >
                    Approve & publish
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================================
// 4. REPORTS (/supervisor/reports)
// Table of flagged content (reporter, reason, status Open/Investigating/Resolved)
// with a "Resolve" action.
// ============================================================================
export const SupervisorReportsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = parseReportTab(searchParams.get('status'));
  const page = parsePositivePage(searchParams.get('page'));

  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);

  const reportsQuery = useSupervisorReports({
    status: REPORT_TAB_TO_DTO[statusFilter],
    page,
    limit: 12,
  });
  const resolveMutation = useResolveModerationReportMutation();

  const reports = useMemo(
    () => reportsQuery.data?.items ?? [],
    [reportsQuery.data?.items]
  );
  const meta = reportsQuery.data?.meta;

  const handleSelectFilter = (tab: SupervisorReportTab) => {
    setSearchParams({ status: tab, page: '1' });
  };

  const handleResolveReport = async (reportId: string) => {
    setResolvingReportId(reportId);
    try {
      await resolveMutation.mutateAsync({ reportId });
    } finally {
      setResolvingReportId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Supervisor dashboard', to: '/supervisor/dashboard' },
          { label: 'Reports' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Flagged content reports
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Review community-reported comments, courses, and users and mark incidents resolved.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-[10px] bg-[#F3EFFF] border border-[#E6E1F5]">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleSelectFilter(tab)}
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold cursor-pointer ${
                statusFilter === tab
                  ? 'bg-white text-[#6D4AE0] shadow-2xs'
                  : 'text-[#5F5B75] hover:text-[#1E1B2E]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {reportsQuery.isError ? (
        <QueryErrorState
          error={reportsQuery.error}
          onRetry={() => void reportsQuery.refetch()}
        />
      ) : reportsQuery.isLoading ? (
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-14 w-full rounded-[10px]" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          title="No reports in this filter"
          description="There are no flagged reports matching the selected status filter."
          actionLabel={statusFilter !== 'All' ? 'View all reports' : undefined}
          onAction={statusFilter !== 'All' ? () => handleSelectFilter('All') : undefined}
          mood="success"
        />
      ) : (
        <>
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px] min-w-[740px]">
                <thead>
                  <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                    <th className="py-3.5 px-4">Flagged content</th>
                    <th className="py-3.5 px-4">Reporter</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E1F5]">
                  {reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-[#FAF8FF]">
                      <td className="py-4 px-4">
                        <p className="font-bold text-[#1E1B2E]">{rep.targetTitle}</p>
                        <p className="text-[12px] text-[#5F5B75]">
                          {rep.targetType} • {rep.createdAt}
                        </p>
                      </td>
                      <td className="py-4 px-4 font-medium text-[#1E1B2E]">
                        {rep.reportedBy}
                      </td>
                      <td className="py-4 px-4 text-[#5F5B75] max-w-xs">{rep.reason}</td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusChip
                          label={rep.status}
                          variant={
                            rep.status === 'Resolved'
                              ? 'success'
                              : rep.status === 'Investigating'
                              ? 'info'
                              : 'warning'
                          }
                        />
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant={rep.status === 'Resolved' ? 'ghost' : 'primary'}
                          loading={
                            resolvingReportId === rep.id && resolveMutation.isPending
                          }
                          disabled={
                            rep.status === 'Resolved' || resolveMutation.isPending
                          }
                          onClick={() => void handleResolveReport(rep.id)}
                        >
                          {rep.status === 'Resolved' ? 'Resolved' : 'Resolve'}
                        </Button>
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
                onPageChange={(nextPage) =>
                  setSearchParams({ status: statusFilter, page: String(nextPage) })
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
