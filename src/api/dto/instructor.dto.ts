import { z } from 'zod';
import {
  CourseLanguageSchema,
  CourseLevelSchema,
  CourseRefSchema,
  IdSchema,
  IsoDateTimeSchema,
  LessonTypeSchema,
  MoneySchema,
  UserSummarySchema,
  createPaginatedSchema,
} from './common.dto';
import { CommentSchema } from './comment.dto';
import { CourseSchema, CurriculumSectionSchema } from './course.dto';
import { ExamAttemptSummarySchema } from './exam.dto';
import { LessonProgressItemSchema } from './learning.dto';

export const InstructorEnrollmentChartPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  enrollments: z.number().int().nonnegative(),
  completions: z.number().int().nonnegative(),
});
export type InstructorEnrollmentChartPointDto = z.infer<
  typeof InstructorEnrollmentChartPointSchema
>;

export const InstructorDashboardSchema = z.object({
  kpis: z.object({
    totalCoursesCount: z.number().int().nonnegative(),
    publishedCount: z.number().int().nonnegative(),
    pendingReviewCount: z.number().int().nonnegative(),
    draftCount: z.number().int().nonnegative(),
    rejectedCount: z.number().int().nonnegative(),
    totalLearnersCount: z.number().int().nonnegative(),
    newLearnersLast30Days: z.number().int().nonnegative(),
    averageRating: z.number().min(0).max(5),
    totalReviewsCount: z.number().int().nonnegative(),
    averageCompletionRatePercent: z.number().min(0).max(100),
  }),
  enrollmentChart: z.array(InstructorEnrollmentChartPointSchema),
  recentComments: z.array(CommentSchema),
  unansweredCommentsCount: z.number().int().nonnegative(),
  topPerformingCourses: z.array(CourseSchema),
  notices: z.object({
    pendingCourses: z.array(CourseSchema),
    rejectedCourses: z.array(CourseSchema),
  }),
});
export type InstructorDashboardDto = z.infer<typeof InstructorDashboardSchema>;

export const InstructorCourseDetailSchema = CourseSchema.extend({
  description: z.string(),
  sections: z.array(CurriculumSectionSchema),
  linkedQuestionBankCourseId: z.string().nullable().optional(),
  examQuestionsCount: z.number().int().nonnegative(),
  examPassScorePercent: z.number().int().min(50).max(100),
  examDurationSeconds: z.number().int().min(600).max(10800),
});
export type InstructorCourseDetailDto = z.infer<
  typeof InstructorCourseDetailSchema
>;

export const CreateInstructorCourseRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(6, 'Course title must be at least 6 characters long.')
    .max(180),
  subtitle: z.string().trim().max(300).optional(),
  description: z
    .string()
    .trim()
    .min(20, 'Full course description must be at least 20 characters.')
    .optional(),
  categoryId: IdSchema,
  subcategoryId: IdSchema.nullable().optional(),
  level: CourseLevelSchema.default('intermediate'),
  language: CourseLanguageSchema.default('en'),
  tags: z.array(z.string().trim().min(1)).max(15).default([]),
  thumbnailUrl: z.string().optional(),
  previewVideoUrl: z.string().nullable().optional(),
  price: MoneySchema.default({ amount: 0, currency: 'USD' }),
  originalPrice: MoneySchema.nullable().optional(),
  isFree: z.boolean().default(false),
  learningPoints: z.array(z.string().trim().min(1)).optional(),
  requirements: z.array(z.string().trim().min(1)).optional(),
});
export type CreateInstructorCourseRequestDto = z.infer<
  typeof CreateInstructorCourseRequestSchema
>;

export const UpdateInstructorCourseRequestSchema =
  CreateInstructorCourseRequestSchema.partial();
export type UpdateInstructorCourseRequestDto = z.infer<
  typeof UpdateInstructorCourseRequestSchema
>;

export const PutCurriculumLessonSchema = z.object({
  id: IdSchema.optional(),
  title: z.string().trim().min(1, 'Lesson title is required.'),
  type: LessonTypeSchema.default('video'),
  durationSeconds: z.number().int().min(60).max(10800),
  videoUrl: z.string().nullable().optional(),
  attachmentUrl: z.string().nullable().optional(),
  attachmentName: z.string().nullable().optional(),
  isPreview: z.boolean().default(false),
  order: z.number().int().min(0),
});
export type PutCurriculumLessonDto = z.infer<typeof PutCurriculumLessonSchema>;

export const PutCurriculumSectionSchema = z.object({
  id: IdSchema.optional(),
  title: z.string().trim().min(1, 'Section title is required.'),
  order: z.number().int().min(0),
  lessons: z.array(PutCurriculumLessonSchema),
});
export type PutCurriculumSectionDto = z.infer<typeof PutCurriculumSectionSchema>;

export const PutCurriculumRequestSchema = z.object({
  sections: z.array(PutCurriculumSectionSchema).min(1),
});
export type PutCurriculumRequestDto = z.infer<typeof PutCurriculumRequestSchema>;

export const PutCurriculumResponseSchema = z.object({
  courseId: IdSchema,
  sections: z.array(CurriculumSectionSchema),
  totalLessonsCount: z.number().int().nonnegative(),
  totalDurationSeconds: z.number().int().nonnegative(),
});
export type PutCurriculumResponseDto = z.infer<typeof PutCurriculumResponseSchema>;

export const EnrolledStudentSummarySchema = z.object({
  enrollmentId: IdSchema,
  student: UserSummarySchema.extend({ email: z.email() }),
  course: CourseRefSchema,
  progressPercent: z.number().min(0).max(100),
  completedLessons: z.number().int().nonnegative(),
  totalLessons: z.number().int().nonnegative(),
  lastActiveAt: IsoDateTimeSchema,
  bestExamScorePercent: z.number().min(0).max(100).nullable(),
  examPassed: z.boolean(),
  certificateIssued: z.boolean(),
  certificateId: z.string().nullable(),
});
export type EnrolledStudentSummaryDto = z.infer<
  typeof EnrolledStudentSummarySchema
>;

export const EnrolledStudentProgressDetailSchema =
  EnrolledStudentSummarySchema.extend({
    maxAttemptsAllowed: z.number().int().positive(),
    lessonBreakdown: z.array(LessonProgressItemSchema),
    examAttempts: z.array(ExamAttemptSummarySchema),
  });
export type EnrolledStudentProgressDetailDto = z.infer<
  typeof EnrolledStudentProgressDetailSchema
>;

export const ResolveInstructorCommentRequestSchema = z.object({
  resolved: z.boolean(),
});
export type ResolveInstructorCommentRequestDto = z.infer<
  typeof ResolveInstructorCommentRequestSchema
>;

export const PaginatedInstructorCoursesResponseSchema =
  createPaginatedSchema(CourseSchema);
export type PaginatedInstructorCoursesResponseDto = z.infer<
  typeof PaginatedInstructorCoursesResponseSchema
>;

export const PaginatedEnrolledStudentsResponseSchema = createPaginatedSchema(
  EnrolledStudentSummarySchema
);
export type PaginatedEnrolledStudentsResponseDto = z.infer<
  typeof PaginatedEnrolledStudentsResponseSchema
>;

export const PaginatedInstructorCommentsResponseSchema =
  createPaginatedSchema(CommentSchema);
export type PaginatedInstructorCommentsResponseDto = z.infer<
  typeof PaginatedInstructorCommentsResponseSchema
>;
