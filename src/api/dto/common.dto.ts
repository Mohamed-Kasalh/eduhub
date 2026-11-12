import { z } from 'zod';

/** Non-empty string resource identifier. */
export const IdSchema = z.string().trim().min(1);
export type Id = z.infer<typeof IdSchema>;

/** ISO-8601 UTC timestamp string (e.g. "2026-03-24T16:05:00.000Z"). */
export const IsoDateTimeSchema = z.iso.datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

/** Optional HTTP/HTTPS URL or nullable value. */
export const OptionalHttpUrlSchema = z
  .url({ protocol: /^https?$/ })
  .nullable()
  .optional();

/** Strong password policy: 8+ chars with uppercase, digit, and symbol. */
export const StrongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
  .regex(/\d/, 'Password must include at least one number.')
  .regex(/[^A-Za-z0-9]/, 'Password must include at least one symbol.');

/** Raw money amount paired with ISO-4217 currency code. */
export const MoneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/).default('USD'),
});
export type MoneyDto = z.infer<typeof MoneySchema>;

/* -------------------------------------------------------------------------- */
/*  Canonical Lowercase Snake-Case Enums                                      */
/* -------------------------------------------------------------------------- */

export const UserRoleSchema = z.enum([
  'guest',
  'student',
  'instructor',
  'supervisor',
  'admin',
]);
export type UserRoleDto = z.infer<typeof UserRoleSchema>;

export const AuthenticatedRoleSchema = z.enum([
  'student',
  'instructor',
  'supervisor',
  'admin',
]);
export type AuthenticatedRoleDto = z.infer<typeof AuthenticatedRoleSchema>;

export const PublicSignupRoleSchema = z.enum(['student', 'instructor']);
export type PublicSignupRoleDto = z.infer<typeof PublicSignupRoleSchema>;

export const UserStatusSchema = z.enum(['active', 'suspended', 'pending']);
export type UserStatusDto = z.infer<typeof UserStatusSchema>;

export const CourseLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type CourseLevelDto = z.infer<typeof CourseLevelSchema>;

export const CourseStatusSchema = z.enum([
  'draft',
  'pending_review',
  'published',
  'rejected',
]);
export type CourseStatusDto = z.infer<typeof CourseStatusSchema>;

export const CourseLanguageSchema = z.enum(['en', 'en_ar_cc', 'es_cc']);
export type CourseLanguageDto = z.infer<typeof CourseLanguageSchema>;

export const DurationBucketSchema = z.enum(['0_2h', '2_5h', '5_10h', '10h_plus']);
export type DurationBucketDto = z.infer<typeof DurationBucketSchema>;

export const CatalogSortSchema = z.enum([
  'popular',
  'newest',
  'rating',
  'price_asc',
  'price_desc',
]);
export type CatalogSortDto = z.infer<typeof CatalogSortSchema>;

export const CatalogTabSchema = z.enum(['popular', 'new', 'free']);
export type CatalogTabDto = z.infer<typeof CatalogTabSchema>;

export const LessonTypeSchema = z.enum(['video', 'reading', 'exam']);
export type LessonTypeDto = z.infer<typeof LessonTypeSchema>;

export const LessonCompletionStatusSchema = z.enum([
  'completed',
  'in_progress',
  'not_started',
  'locked',
]);
export type LessonCompletionStatusDto = z.infer<typeof LessonCompletionStatusSchema>;

export const AttachmentFileTypeSchema = z.enum(['pdf', 'zip', 'csv', 'fig', 'other']);
export type AttachmentFileTypeDto = z.infer<typeof AttachmentFileTypeSchema>;

export const CommentStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'flagged',
  'hidden',
]);
export type CommentStatusDto = z.infer<typeof CommentStatusSchema>;

export const CommentRejectionReasonSchema = z.enum([
  'spam',
  'offensive',
  'off_topic',
  'other',
]);
export type CommentRejectionReasonDto = z.infer<typeof CommentRejectionReasonSchema>;

export const CommentReportReasonSchema = z.enum([
  'spam',
  'harassment',
  'off_topic',
  'other',
]);
export type CommentReportReasonDto = z.infer<typeof CommentReportReasonSchema>;

export const TrustStandingSchema = z.enum(['good_standing', 'under_watch']);
export type TrustStandingDto = z.infer<typeof TrustStandingSchema>;

export const QuestionTypeSchema = z.enum(['single', 'multiple', 'boolean']);
export type QuestionTypeDto = z.infer<typeof QuestionTypeSchema>;

export const QuestionDifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type QuestionDifficultyDto = z.infer<typeof QuestionDifficultySchema>;

export const ExamAttemptStatusSchema = z.enum(['in_progress', 'submitted', 'expired']);
export type ExamAttemptStatusDto = z.infer<typeof ExamAttemptStatusSchema>;

export const ExamReviewOutcomeSchema = z.enum(['correct', 'wrong', 'skipped']);
export type ExamReviewOutcomeDto = z.infer<typeof ExamReviewOutcomeSchema>;

export const CertificateStatusSchema = z.enum(['valid', 'revoked']);
export type CertificateStatusDto = z.infer<typeof CertificateStatusSchema>;

export const CertificateGradeSchema = z.enum(['distinction', 'merit', 'pass']);
export type CertificateGradeDto = z.infer<typeof CertificateGradeSchema>;

export const NotificationTypeSchema = z.enum([
  'course',
  'exam',
  'certificate',
  'moderation',
  'system',
]);
export type NotificationTypeDto = z.infer<typeof NotificationTypeSchema>;

export const ModerationTargetTypeSchema = z.enum(['comment', 'course', 'user']);
export type ModerationTargetTypeDto = z.infer<typeof ModerationTargetTypeSchema>;

export const ModerationSeveritySchema = z.enum(['high', 'medium', 'low']);
export type ModerationSeverityDto = z.infer<typeof ModerationSeveritySchema>;

export const ModerationReportStatusSchema = z.enum([
  'open',
  'investigating',
  'resolved',
]);
export type ModerationReportStatusDto = z.infer<typeof ModerationReportStatusSchema>;

export const UploadKindSchema = z.enum([
  'avatar',
  'course_cover',
  'demo_video',
  'lesson_video',
  'attachment',
  'csv',
]);
export type UploadKindDto = z.infer<typeof UploadKindSchema>;

export const DeviceTypeSchema = z.enum(['desktop', 'mobile', 'tablet']);
export type DeviceTypeDto = z.infer<typeof DeviceTypeSchema>;

export const ChecklistStatusSchema = z.enum(['pass', 'fail']);
export type ChecklistStatusDto = z.infer<typeof ChecklistStatusSchema>;

export const CourseReviewDecisionSchema = z.enum([
  'pending_review',
  'approved',
  'changes_requested',
  'rejected',
]);
export type CourseReviewDecisionDto = z.infer<typeof CourseReviewDecisionSchema>;

/* -------------------------------------------------------------------------- */
/*  Embedded Entity Summaries (Avoid Denormalized Duplicate Fields)           */
/* -------------------------------------------------------------------------- */

export const InstructorSummarySchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  title: z.string(),
  avatarUrl: z.string().nullable(),
});
export type InstructorSummaryDto = z.infer<typeof InstructorSummarySchema>;

export const UserSummarySchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  title: z.string(),
  role: AuthenticatedRoleSchema,
  avatarUrl: z.string().nullable(),
});
export type UserSummaryDto = z.infer<typeof UserSummarySchema>;

export const CategorySummarySchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
});
export type CategorySummaryDto = z.infer<typeof CategorySummarySchema>;

export const SubcategorySummarySchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
});
export type SubcategorySummaryDto = z.infer<typeof SubcategorySummarySchema>;

export const CourseRefSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
});
export type CourseRefDto = z.infer<typeof CourseRefSchema>;

export const LessonRefSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
});
export type LessonRefDto = z.infer<typeof LessonRefSchema>;

/* -------------------------------------------------------------------------- */
/*  Standard Envelopes                                                        */
/* -------------------------------------------------------------------------- */

export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type PaginationMetaDto = z.infer<typeof PaginationMetaSchema>;

/** Builds a Zod schema for standard paginated list responses `{ data, meta }`. */
export function createPaginatedSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
}

export const ApiErrorDetailSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
export type ApiErrorDetailDto = z.infer<typeof ApiErrorDetailSchema>;

export const ApiErrorResponseSchema = z.object({
  error: ApiErrorDetailSchema,
});
export type ApiErrorResponseDto = z.infer<typeof ApiErrorResponseSchema>;

export const ActionResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type ActionResultDto = z.infer<typeof ActionResultSchema>;
