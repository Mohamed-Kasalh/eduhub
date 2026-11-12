import { z } from 'zod';
import {
  ChecklistStatusSchema,
  CommentRejectionReasonSchema,
  CourseReviewDecisionSchema,
  IdSchema,
  IsoDateTimeSchema,
  ModerationReportStatusSchema,
  ModerationSeveritySchema,
  ModerationTargetTypeSchema,
  createPaginatedSchema,
} from './common.dto';
import { CommentSchema } from './comment.dto';
import { CourseSchema } from './course.dto';

export const QueueVolumePointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  incoming: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});
export type QueueVolumePointDto = z.infer<typeof QueueVolumePointSchema>;

export const SupervisorAuditActionSchema = z.object({
  id: IdSchema,
  actionType: z.enum(['approved', 'rejected', 'restored', 'resolved']),
  summary: z.string().min(1),
  actorName: z.string().min(1),
  occurredAt: IsoDateTimeSchema,
});
export type SupervisorAuditActionDto = z.infer<typeof SupervisorAuditActionSchema>;

export const SupervisorDashboardSchema = z.object({
  kpis: z.object({
    pendingCommentsCount: z.number().int().nonnegative(),
    flaggedCommentsCount: z.number().int().nonnegative(),
    coursesAwaitingReviewCount: z.number().int().nonnegative(),
    resolvedTodayCount: z.number().int().nonnegative(),
    slaCompliancePercent: z.number().min(0).max(100),
  }),
  queueVolumeLast7Days: z.array(QueueVolumePointSchema),
  recentActions: z.array(SupervisorAuditActionSchema),
});
export type SupervisorDashboardDto = z.infer<typeof SupervisorDashboardSchema>;

export const RejectCommentRequestSchema = z.object({
  reason: CommentRejectionReasonSchema,
  notes: z.string().trim().max(500).optional(),
});
export type RejectCommentRequestDto = z.infer<typeof RejectCommentRequestSchema>;

export const BulkApproveCommentsRequestSchema = z.object({
  ids: z.array(IdSchema).min(1, 'Select at least one comment to approve.'),
});
export type BulkApproveCommentsRequestDto = z.infer<
  typeof BulkApproveCommentsRequestSchema
>;

export const BulkApproveCommentsResponseSchema = z.object({
  approvedCount: z.number().int().nonnegative(),
  approvedIds: z.array(IdSchema),
});
export type BulkApproveCommentsResponseDto = z.infer<
  typeof BulkApproveCommentsResponseSchema
>;

export const CourseReviewChecklistSchema = z.object({
  titleAndDescription: ChecklistStatusSchema,
  coverAndDemoVideo: ChecklistStatusSchema,
  curriculumComplete: ChecklistStatusSchema,
  enoughQuestionsInBank: ChecklistStatusSchema,
  pricingSet: ChecklistStatusSchema,
});
export type CourseReviewChecklistDto = z.infer<typeof CourseReviewChecklistSchema>;

/**
 * Normalized Course Review Submission wrapping canonical Course DTO
 * plus supervisor checklist and decision metadata.
 */
export const CourseReviewSubmissionSchema = z.object({
  id: IdSchema,
  course: CourseSchema,
  submittedAt: IsoDateTimeSchema,
  sectionsCount: z.number().int().nonnegative(),
  lessonsCount: z.number().int().nonnegative(),
  totalDurationSeconds: z.number().int().nonnegative(),
  questionBankCount: z.number().int().nonnegative(),
  requiredQuestionsCount: z.number().int().positive(),
  reviewDecision: CourseReviewDecisionSchema,
  reviewNotes: z.string().nullable().optional(),
  checklist: CourseReviewChecklistSchema,
});
export type CourseReviewSubmissionDto = z.infer<
  typeof CourseReviewSubmissionSchema
>;

export const RequestCourseChangesRequestSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(8, 'Reviewer notes (at least 8 characters) are required.'),
});
export type RequestCourseChangesRequestDto = z.infer<
  typeof RequestCourseChangesRequestSchema
>;

export const RejectCourseReviewRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(8, 'Rejection reason (at least 8 characters) is required.'),
});
export type RejectCourseReviewRequestDto = z.infer<
  typeof RejectCourseReviewRequestSchema
>;

export const ModerationReportSchema = z.object({
  id: IdSchema,
  targetType: ModerationTargetTypeSchema,
  targetId: IdSchema,
  targetTitle: z.string().min(1),
  reportedBy: z.string().min(1),
  reason: z.string().min(1),
  severity: ModerationSeveritySchema,
  status: ModerationReportStatusSchema,
  resolutionNotes: z.string().nullable().optional(),
  createdAt: IsoDateTimeSchema,
  resolvedAt: IsoDateTimeSchema.nullable().optional(),
});
export type ModerationReportDto = z.infer<typeof ModerationReportSchema>;

export const ResolveReportRequestSchema = z.object({
  resolutionNotes: z.string().trim().max(1000).optional(),
});
export type ResolveReportRequestDto = z.infer<typeof ResolveReportRequestSchema>;

export const PaginatedSupervisorCommentsResponseSchema =
  createPaginatedSchema(CommentSchema);
export type PaginatedSupervisorCommentsResponseDto = z.infer<
  typeof PaginatedSupervisorCommentsResponseSchema
>;

export const PaginatedSupervisorCourseReviewsResponseSchema = createPaginatedSchema(
  CourseReviewSubmissionSchema
);
export type PaginatedSupervisorCourseReviewsResponseDto = z.infer<
  typeof PaginatedSupervisorCourseReviewsResponseSchema
>;

export const PaginatedModerationReportsResponseSchema = createPaginatedSchema(
  ModerationReportSchema
);
export type PaginatedModerationReportsResponseDto = z.infer<
  typeof PaginatedModerationReportsResponseSchema
>;
