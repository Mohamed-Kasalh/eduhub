import {
  ActionResultSchema,
  BulkApproveCommentsResponseSchema,
  CommentSchema,
  CourseReviewSubmissionSchema,
  ModerationReportSchema,
  PaginatedModerationReportsResponseSchema,
  PaginatedSupervisorCommentsResponseSchema,
  PaginatedSupervisorCourseReviewsResponseSchema,
  SupervisorDashboardSchema,
  type ActionResultDto,
  type BulkApproveCommentsRequestDto,
  type BulkApproveCommentsResponseDto,
  type CommentDto,
  type CommentStatusDto,
  type CourseReviewChecklistDto,
  type CourseReviewDecisionDto,
  type CourseReviewSubmissionDto,
  type ModerationReportDto,
  type ModerationReportStatusDto,
  type PaginatedModerationReportsResponseDto,
  type PaginatedSupervisorCommentsResponseDto,
  type PaginatedSupervisorCourseReviewsResponseDto,
  type RejectCommentRequestDto,
  type RejectCourseReviewRequestDto,
  type RequestCourseChangesRequestDto,
  type ResolveReportRequestDto,
  type SupervisorDashboardDto,
} from '../dto';
import { http } from '../http';

export type SupervisorCommentsQueryParams = {
  status?: CommentStatusDto | 'all';
  page?: number;
  limit?: number;
};

export type SupervisorCourseReviewsQueryParams = {
  status?: CourseReviewDecisionDto | 'all' | 'published';
  page?: number;
  limit?: number;
};

export type SupervisorReportsQueryParams = {
  status?: ModerationReportStatusDto | 'all';
  page?: number;
  limit?: number;
};

/** Supervisor moderation queue, course review checklist, and report resolution endpoints. */
export const supervisorService = {
  /** Retrieves moderation KPIs, 7-day queue volume, and audit trail actions. */
  async getDashboard(): Promise<SupervisorDashboardDto> {
    return http.get('/supervisor/dashboard', SupervisorDashboardSchema);
  },

  /** Lists comments in the moderation queue filtered by status. */
  async getComments(
    params?: SupervisorCommentsQueryParams
  ): Promise<PaginatedSupervisorCommentsResponseDto> {
    return http.get('/supervisor/comments', PaginatedSupervisorCommentsResponseSchema, {
      query: params ? { ...params } : undefined,
    });
  },

  /** Approves a pending/flagged comment and notifies the author. */
  async approveComment(commentId: string): Promise<CommentDto> {
    return http.post(
      `/supervisor/comments/${encodeURIComponent(commentId)}/approve`,
      CommentSchema
    );
  },

  /** Rejects a comment with a structured moderation reason and optional notes. */
  async rejectComment(
    commentId: string,
    payload: RejectCommentRequestDto
  ): Promise<CommentDto> {
    return http.post(
      `/supervisor/comments/${encodeURIComponent(commentId)}/reject`,
      CommentSchema,
      payload
    );
  },

  /** Restores a previously rejected/flagged comment back to `approved`. */
  async restoreComment(commentId: string): Promise<CommentDto> {
    return http.post(
      `/supervisor/comments/${encodeURIComponent(commentId)}/restore`,
      CommentSchema
    );
  },

  /** Permanently deletes a comment from moderation. */
  async deleteComment(commentId: string): Promise<ActionResultDto> {
    return http.delete(
      `/supervisor/comments/${encodeURIComponent(commentId)}`,
      ActionResultSchema
    );
  },

  /** Approves multiple pending/flagged comments in a single request. */
  async bulkApproveComments(
    payload: BulkApproveCommentsRequestDto
  ): Promise<BulkApproveCommentsResponseDto> {
    return http.post(
      '/supervisor/comments/bulk-approve',
      BulkApproveCommentsResponseSchema,
      payload
    );
  },

  /** Lists course submissions awaiting or having completed supervisor review. */
  async getCourseReviews(
    params?: SupervisorCourseReviewsQueryParams
  ): Promise<PaginatedSupervisorCourseReviewsResponseDto> {
    return http.get(
      '/supervisor/course-reviews',
      PaginatedSupervisorCourseReviewsResponseSchema,
      { query: params ? { ...params } : undefined }
    );
  },

  /** Retrieves checklist and course details for one submission under review. */
  async getCourseReviewDetail(courseId: string): Promise<CourseReviewSubmissionDto> {
    return http.get(
      `/supervisor/course-reviews/${encodeURIComponent(courseId)}`,
      CourseReviewSubmissionSchema
    );
  },

  /** Updates the 5-item verification checklist for a submitted course. */
  async updateCourseReviewChecklist(
    courseId: string,
    payload: CourseReviewChecklistDto
  ): Promise<CourseReviewSubmissionDto> {
    return http.put(
      `/supervisor/course-reviews/${encodeURIComponent(courseId)}/checklist`,
      CourseReviewSubmissionSchema,
      payload
    );
  },

  /** Approves and publishes a submitted course and notifies the instructor. */
  async approveCourseReview(courseId: string): Promise<CourseReviewSubmissionDto> {
    return http.post(
      `/supervisor/course-reviews/${encodeURIComponent(courseId)}/approve`,
      CourseReviewSubmissionSchema
    );
  },

  /** Requests specific changes on a submitted course and notifies the instructor. */
  async requestCourseChanges(
    courseId: string,
    payload: RequestCourseChangesRequestDto
  ): Promise<CourseReviewSubmissionDto> {
    return http.post(
      `/supervisor/course-reviews/${encodeURIComponent(courseId)}/request-changes`,
      CourseReviewSubmissionSchema,
      payload
    );
  },

  /** Rejects a submitted course with a mandatory reason and notifies the instructor. */
  async rejectCourseReview(
    courseId: string,
    payload: RejectCourseReviewRequestDto
  ): Promise<CourseReviewSubmissionDto> {
    return http.post(
      `/supervisor/course-reviews/${encodeURIComponent(courseId)}/reject`,
      CourseReviewSubmissionSchema,
      payload
    );
  },

  /** Lists moderation abuse reports across comments, courses, and users. */
  async getReports(
    params?: SupervisorReportsQueryParams
  ): Promise<PaginatedModerationReportsResponseDto> {
    return http.get('/supervisor/reports', PaginatedModerationReportsResponseSchema, {
      query: params ? { ...params } : undefined,
    });
  },

  /** Resolves an open or investigating moderation report. */
  async resolveReport(
    reportId: string,
    payload?: ResolveReportRequestDto
  ): Promise<ModerationReportDto> {
    return http.post(
      `/supervisor/reports/${encodeURIComponent(reportId)}/resolve`,
      ModerationReportSchema,
      payload ?? {}
    );
  },
};
