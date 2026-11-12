import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { emitToast } from '../../lib/toastBus';
import type {
  ActionResultDto,
  BulkApproveCommentsRequestDto,
  BulkApproveCommentsResponseDto,
  CommentDto,
  CommentStatusDto,
  CourseReviewChecklistDto,
  CourseReviewSubmissionDto,
  ModerationReportDto,
  PaginatedModerationReportsResponseDto,
  PaginatedSupervisorCommentsResponseDto,
  PaginatedSupervisorCourseReviewsResponseDto,
  RejectCommentRequestDto,
  RejectCourseReviewRequestDto,
  RequestCourseChangesRequestDto,
  ResolveReportRequestDto,
  SupervisorCommentItem,
  SupervisorCourseSubmission,
  SupervisorDashboardDto,
} from '../dto-types-bridge';
import { getErrorMessage } from '../errors';
import {
  COMMENT_REJECTION_REASON_LABELS,
  mapCommentDtoToSupervisorItem,
  mapCourseReviewSubmissionDtoToView,
  mapModerationReportDtoToView,
  mapQueueVolumePointDtoToView,
  mapSupervisorAuditActionDtoToView,
  type MappedModerationReport,
  type QueueVolumePointView,
  type SupervisorAuditActionView,
} from '../mappers/supervisor.mapper';
import { queryKeys } from '../queryKeys';
import {
  supervisorService,
  type SupervisorCommentsQueryParams,
  type SupervisorCourseReviewsQueryParams,
  type SupervisorReportsQueryParams,
} from '../services/supervisor.service';

export interface MappedSupervisorDashboardView {
  kpis: SupervisorDashboardDto['kpis'];
  queueVolumeLast7Days: QueueVolumePointView[];
  recentActions: SupervisorAuditActionView[];
}

export interface PaginatedSupervisorCommentsView {
  items: SupervisorCommentItem[];
  meta: PaginatedSupervisorCommentsResponseDto['meta'];
}

export interface PaginatedSupervisorCourseReviewsView {
  items: SupervisorCourseSubmission[];
  meta: PaginatedSupervisorCourseReviewsResponseDto['meta'];
}

export interface PaginatedModerationReportsView {
  items: MappedModerationReport[];
  meta: PaginatedModerationReportsResponseDto['meta'];
}

const COMMENT_COUNT_STATUSES: CommentStatusDto[] = [
  'pending',
  'flagged',
  'approved',
  'rejected',
];

function invalidateCommentModerationQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.supervisor.dashboard });
  void queryClient.invalidateQueries({ queryKey: ['supervisor', 'comments'] });
  void queryClient.invalidateQueries({ queryKey: ['lessons'] });
  void queryClient.invalidateQueries({ queryKey: ['instructor'] });
}

function invalidateCourseReviewQueries(queryClient: QueryClient, courseId?: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.supervisor.dashboard });
  void queryClient.invalidateQueries({ queryKey: ['supervisor', 'courseReviews'] });
  void queryClient.invalidateQueries({ queryKey: ['instructor'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
  if (courseId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.instructor.courseDetail(courseId),
    });
  }
}

/** Loads supervisor overview KPIs, 7-day queue volume bars, and recent audit log. */
export function useSupervisorDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.supervisor.dashboard,
    queryFn: () => supervisorService.getDashboard(),
    enabled,
    select: (dto): MappedSupervisorDashboardView => ({
      kpis: dto.kpis,
      queueVolumeLast7Days: dto.queueVolumeLast7Days.map(mapQueueVolumePointDtoToView),
      recentActions: dto.recentActions.map(mapSupervisorAuditActionDtoToView),
    }),
  });
}

/** Loads paginated comments in a supervisor moderation queue tab. */
export function useSupervisorComments(
  params: SupervisorCommentsQueryParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.supervisor.comments(params),
    queryFn: () => supervisorService.getComments(params),
    enabled,
    placeholderData: keepPreviousData,
    select: (dto): PaginatedSupervisorCommentsView => ({
      items: dto.data.map(mapCommentDtoToSupervisorItem),
      meta: dto.meta,
    }),
  });
}

/** Loads per-status total comment counts across all 4 moderation queue tabs. */
export function useSupervisorCommentCounts(enabled = true) {
  const results = useQueries({
    queries: COMMENT_COUNT_STATUSES.map((status) => ({
      queryKey: queryKeys.supervisor.comments({ status, page: 1, limit: 1 }),
      queryFn: () => supervisorService.getComments({ status, page: 1, limit: 1 }),
      enabled,
      staleTime: 30_000,
    })),
  });

  const counts: Record<'Pending' | 'Flagged' | 'Approved' | 'Rejected', number | undefined> = {
    Pending: results[0]?.data?.meta.total,
    Flagged: results[1]?.data?.meta.total,
    Approved: results[2]?.data?.meta.total,
    Rejected: results[3]?.data?.meta.total,
  };

  return counts;
}

/** Approves a moderated comment and applies the green Verified badge. */
export function useApproveCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<CommentDto, unknown, { commentId: string; authorName: string }>({
    mutationFn: ({ commentId }) => supervisorService.approveComment(commentId),
    onSuccess: (_data, variables) => {
      invalidateCommentModerationQueries(queryClient);
      emitToast({
        title: `Approved comment by ${variables.authorName}`,
        message: 'Verified badge applied and comment is visible to learners.',
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not approve comment',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Rejects a moderated comment with a structured reason. */
export function useRejectCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CommentDto,
    unknown,
    { commentId: string; authorName: string; payload: RejectCommentRequestDto }
  >({
    mutationFn: ({ commentId, payload }) =>
      supervisorService.rejectComment(commentId, payload),
    onSuccess: (_data, variables) => {
      invalidateCommentModerationQueries(queryClient);
      const reasonLabel = COMMENT_REJECTION_REASON_LABELS[variables.payload.reason];
      emitToast({
        title: `Rejected comment (${reasonLabel}) by ${variables.authorName}`,
        message: 'Use the Undo button in the moderation bar to revert this action.',
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not reject comment',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Restores a previously rejected comment back into approved state. */
export function useRestoreCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<CommentDto, unknown, { commentId: string; label?: string }>({
    mutationFn: ({ commentId }) => supervisorService.restoreComment(commentId),
    onSuccess: (_data, variables) => {
      invalidateCommentModerationQueries(queryClient);
      emitToast({
        title: 'Action undone',
        message: variables.label
          ? `Restored comment (${variables.label})`
          : 'Comment restored to Approved status.',
        variant: 'info',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not undo rejection',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Permanently deletes a moderated comment. */
export function useDeleteCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<ActionResultDto, unknown, { commentId: string; authorName: string }>({
    mutationFn: ({ commentId }) => supervisorService.deleteComment(commentId),
    onSuccess: (_data, variables) => {
      invalidateCommentModerationQueries(queryClient);
      emitToast({
        title: `Deleted comment by ${variables.authorName}`,
        message: 'The comment has been permanently removed.',
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not delete comment',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Approves multiple selected comments in one batch request. */
export function useBulkApproveCommentsMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    BulkApproveCommentsResponseDto,
    unknown,
    BulkApproveCommentsRequestDto
  >({
    mutationFn: (payload) => supervisorService.bulkApproveComments(payload),
    onSuccess: (res) => {
      invalidateCommentModerationQueries(queryClient);
      emitToast({
        title: `Approved ${res.approvedCount} selected ${
          res.approvedCount === 1 ? 'comment' : 'comments'
        }`,
        message: 'Verified badges applied to all approved comments.',
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Bulk approval failed',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Loads paginated course submissions awaiting or having completed review. */
export function useSupervisorCourseReviews(
  params: SupervisorCourseReviewsQueryParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.supervisor.courseReviews(params),
    queryFn: () => supervisorService.getCourseReviews(params),
    enabled,
    placeholderData: keepPreviousData,
    select: (dto): PaginatedSupervisorCourseReviewsView => ({
      items: dto.data.map(mapCourseReviewSubmissionDtoToView),
      meta: dto.meta,
    }),
  });
}

/** Loads a single course review submission detail by course ID. */
export function useSupervisorCourseReviewDetail(courseId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.supervisor.courseReviews({ courseId }),
    queryFn: () => supervisorService.getCourseReviewDetail(courseId ?? ''),
    enabled: Boolean(courseId) && enabled,
    select: mapCourseReviewSubmissionDtoToView,
  });
}

/** Persists updates to the 5-point course review verification checklist. */
export function useUpdateCourseReviewChecklistMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CourseReviewSubmissionDto,
    unknown,
    { courseId: string; checklist: CourseReviewChecklistDto },
    {
      previousLists: Array<
        [readonly unknown[], PaginatedSupervisorCourseReviewsResponseDto | undefined]
      >;
    }
  >({
    mutationFn: ({ courseId, checklist }) =>
      supervisorService.updateCourseReviewChecklist(courseId, checklist),
    onMutate: async ({ courseId, checklist }) => {
      await queryClient.cancelQueries({ queryKey: ['supervisor', 'courseReviews'] });
      const previousLists =
        queryClient.getQueriesData<PaginatedSupervisorCourseReviewsResponseDto>({
          queryKey: ['supervisor', 'courseReviews'],
        });

      for (const [key, snapshot] of previousLists) {
        if (!snapshot || !('data' in snapshot)) continue;
        queryClient.setQueryData<PaginatedSupervisorCourseReviewsResponseDto>(key, {
          ...snapshot,
          data: snapshot.data.map((item) =>
            item.course.id === courseId ? { ...item, checklist } : item
          ),
        });
      }

      return { previousLists };
    },
    onError: (err, _variables, context) => {
      if (context?.previousLists) {
        for (const [key, snapshot] of context.previousLists) {
          queryClient.setQueryData(key, snapshot);
        }
      }
      emitToast({
        title: 'Failed to save checklist item',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['supervisor', 'courseReviews'] });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supervisor.courseReviews({ courseId: variables.courseId }),
      });
    },
  });
}

/** Approves and publishes a submitted course to the catalog. */
export function useApproveCourseReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CourseReviewSubmissionDto,
    unknown,
    { courseId: string; courseTitle: string; instructorName: string }
  >({
    mutationFn: ({ courseId }) => supervisorService.approveCourseReview(courseId),
    onSuccess: (_data, variables) => {
      invalidateCourseReviewQueries(queryClient, variables.courseId);
      emitToast({
        title: `Approved & published "${variables.courseTitle}"`,
        message: `Instructor ${variables.instructorName} has been notified.`,
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not approve course',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Requests specific changes on a submitted course with reviewer notes. */
export function useRequestCourseChangesMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CourseReviewSubmissionDto,
    unknown,
    {
      courseId: string;
      courseTitle: string;
      instructorName: string;
      payload: RequestCourseChangesRequestDto;
    }
  >({
    mutationFn: ({ courseId, payload }) =>
      supervisorService.requestCourseChanges(courseId, payload),
    onSuccess: (_data, variables) => {
      invalidateCourseReviewQueries(queryClient, variables.courseId);
      emitToast({
        title: `Requested syllabus changes on "${variables.courseTitle}"`,
        message: `Instructor ${variables.instructorName} has been notified.`,
        variant: 'warning',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not request course changes',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Rejects a submitted course with a mandatory reason. */
export function useRejectCourseReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CourseReviewSubmissionDto,
    unknown,
    {
      courseId: string;
      courseTitle: string;
      instructorName: string;
      payload: RejectCourseReviewRequestDto;
    }
  >({
    mutationFn: ({ courseId, payload }) =>
      supervisorService.rejectCourseReview(courseId, payload),
    onSuccess: (_data, variables) => {
      invalidateCourseReviewQueries(queryClient, variables.courseId);
      emitToast({
        title: `Rejected "${variables.courseTitle}"`,
        message: `Instructor ${variables.instructorName} has been notified.`,
        variant: 'warning',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not reject course',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Loads paginated moderation abuse reports filtered by status. */
export function useSupervisorReports(
  params: SupervisorReportsQueryParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.supervisor.reports(params),
    queryFn: () => supervisorService.getReports(params),
    enabled,
    placeholderData: keepPreviousData,
    select: (dto): PaginatedModerationReportsView => ({
      items: dto.data.map(mapModerationReportDtoToView),
      meta: dto.meta,
    }),
  });
}

/** Marks an open or investigating moderation report as resolved. */
export function useResolveModerationReportMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ModerationReportDto,
    unknown,
    { reportId: string; payload?: ResolveReportRequestDto }
  >({
    mutationFn: ({ reportId, payload }) =>
      supervisorService.resolveReport(reportId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supervisor.dashboard });
      void queryClient.invalidateQueries({ queryKey: ['supervisor', 'reports'] });
      emitToast({
        title: 'Report marked as Resolved',
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not resolve report',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}
