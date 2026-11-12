import { z } from 'zod';
import {
  CommentRejectionReasonSchema,
  CommentReportReasonSchema,
  CommentStatusSchema,
  CourseRefSchema,
  IdSchema,
  IsoDateTimeSchema,
  LessonRefSchema,
  TrustStandingSchema,
  UserSummarySchema,
  createPaginatedSchema,
} from './common.dto';

export const CommentReplySchema = z.object({
  id: IdSchema,
  commentId: IdSchema,
  author: UserSummarySchema,
  isInstructor: z.boolean(),
  isSupervisorVerified: z.boolean(),
  content: z.string().min(1),
  likesCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
  createdAt: IsoDateTimeSchema,
});
export type CommentReplyDto = z.infer<typeof CommentReplySchema>;

export const ModerationAuthorHistorySchema = z.object({
  joinedAt: IsoDateTimeSchema,
  totalComments: z.number().int().nonnegative(),
  approvedComments: z.number().int().nonnegative(),
  priorFlags: z.number().int().nonnegative(),
  trustStanding: TrustStandingSchema,
});
export type ModerationAuthorHistoryDto = z.infer<typeof ModerationAuthorHistorySchema>;

export const ParentThreadPromptSchema = z.object({
  authorName: z.string().min(1),
  promptText: z.string().min(1),
});
export type ParentThreadPromptDto = z.infer<typeof ParentThreadPromptSchema>;

/**
 * Unified canonical Comment DTO normalizing CourseComment, ThreadedLessonComment,
 * SupervisorCommentItem, and InstructorCommentThread.
 */
export const CommentSchema = z.object({
  id: IdSchema,
  course: CourseRefSchema,
  lesson: LessonRefSchema,
  author: UserSummarySchema,
  content: z.string().min(1),
  status: CommentStatusSchema,
  isInstructor: z.boolean(),
  isSupervisorVerified: z.boolean(),
  resolved: z.boolean(),
  likesCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
  repliesCount: z.number().int().nonnegative(),
  replies: z.array(CommentReplySchema),
  flagReasons: z.array(z.string()),
  rejectionReason: CommentRejectionReasonSchema.nullable().optional(),
  rejectionNotes: z.string().nullable().optional(),
  parentThreadPrompt: ParentThreadPromptSchema.nullable().optional(),
  authorHistory: ModerationAuthorHistorySchema.optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type CommentDto = z.infer<typeof CommentSchema>;

export const CreateCommentRequestSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty.').max(2000),
});
export type CreateCommentRequestDto = z.infer<typeof CreateCommentRequestSchema>;

export const UpdateCommentRequestSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty.').max(2000),
});
export type UpdateCommentRequestDto = z.infer<typeof UpdateCommentRequestSchema>;

export const CreateCommentReplyRequestSchema = z.object({
  content: z.string().trim().min(1, 'Reply cannot be empty.').max(2000),
});
export type CreateCommentReplyRequestDto = z.infer<
  typeof CreateCommentReplyRequestSchema
>;

export const LikeToggleResponseSchema = z.object({
  id: IdSchema,
  likesCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
});
export type LikeToggleResponseDto = z.infer<typeof LikeToggleResponseSchema>;

export const ReportCommentRequestSchema = z.object({
  reason: CommentReportReasonSchema,
  details: z.string().trim().max(500).optional(),
});
export type ReportCommentRequestDto = z.infer<typeof ReportCommentRequestSchema>;

export const PaginatedCommentsResponseSchema = createPaginatedSchema(CommentSchema);
export type PaginatedCommentsResponseDto = z.infer<
  typeof PaginatedCommentsResponseSchema
>;
