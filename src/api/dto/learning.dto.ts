import { z } from 'zod';
import {
  CourseLevelSchema,
  CourseRefSchema,
  IdSchema,
  InstructorSummarySchema,
  CategorySummarySchema,
  IsoDateTimeSchema,
  LessonCompletionStatusSchema,
  LessonTypeSchema,
  createPaginatedSchema,
} from './common.dto';
import { CourseSchema, CurriculumLessonSchema, CurriculumSectionSchema } from './course.dto';
import { ExamConfigSchema } from './exam.dto';

export const EnrollmentCourseSummarySchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  thumbnailUrl: z.string(),
  level: CourseLevelSchema,
  lessonsCount: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative(),
  instructor: InstructorSummarySchema,
  category: CategorySummarySchema,
});
export type EnrollmentCourseSummaryDto = z.infer<typeof EnrollmentCourseSummarySchema>;

export const EnrollmentSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  course: EnrollmentCourseSummarySchema,
  status: z.enum(['active', 'completed']),
  enrolledAt: IsoDateTimeSchema,
  lastAccessedAt: IsoDateTimeSchema.nullable(),
  lastLessonId: z.string().nullable(),
  lastLessonTitle: z.string().nullable(),
  completedLessons: z.number().int().nonnegative(),
  totalLessons: z.number().int().nonnegative(),
  progressPercent: z.number().min(0).max(100),
  watchedDurationSeconds: z.number().int().nonnegative(),
  totalDurationSeconds: z.number().int().nonnegative(),
  bestExamScorePercent: z.number().min(0).max(100).nullable(),
  passingScorePercent: z.number().int().min(50).max(100),
  examPassed: z.boolean(),
  certificateId: z.string().nullable(),
});
export type EnrollmentDto = z.infer<typeof EnrollmentSchema>;

export const WishlistItemSchema = z.object({
  courseId: IdSchema,
  addedAt: IsoDateTimeSchema,
  course: CourseSchema,
});
export type WishlistItemDto = z.infer<typeof WishlistItemSchema>;

export const WishlistMutationResponseSchema = z.object({
  courseId: IdSchema,
  wishlisted: z.boolean(),
});
export type WishlistMutationResponseDto = z.infer<typeof WishlistMutationResponseSchema>;

export const WeeklyActivityPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  watchedSeconds: z.number().int().nonnegative(),
  lessonsCompleted: z.number().int().nonnegative(),
});
export type WeeklyActivityPointDto = z.infer<typeof WeeklyActivityPointSchema>;

export const AchievementBadgeSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  earned: z.boolean(),
  earnedAt: IsoDateTimeSchema.nullable(),
  color: z.enum(['purple', 'gold', 'orange', 'green']),
});
export type AchievementBadgeDto = z.infer<typeof AchievementBadgeSchema>;

export const StudentDashboardSchema = z.object({
  kpis: z.object({
    enrolledCount: z.number().int().nonnegative(),
    inProgressCount: z.number().int().nonnegative(),
    completedCount: z.number().int().nonnegative(),
    certificatesCount: z.number().int().nonnegative(),
    totalWatchSeconds: z.number().int().nonnegative(),
    weeklyWatchSeconds: z.number().int().nonnegative(),
    weeklyCompletedLessons: z.number().int().nonnegative(),
  }),
  streakDays: z.number().int().nonnegative(),
  points: z.number().int().nonnegative(),
  weeklyDailyGoalSeconds: z.number().int().positive(),
  continueLearning: EnrollmentSchema.nullable(),
  activeCourses: z.array(EnrollmentSchema),
  upcomingExams: z.array(ExamConfigSchema),
  weeklyActivity: z.array(WeeklyActivityPointSchema),
  achievements: z.array(AchievementBadgeSchema),
  recommendedCourses: z.array(CourseSchema),
});
export type StudentDashboardDto = z.infer<typeof StudentDashboardSchema>;

export const LessonProgressItemSchema = z.object({
  lessonId: IdSchema,
  sectionId: IdSchema,
  sectionTitle: z.string(),
  number: z.number().int().min(1),
  title: z.string().min(1),
  type: LessonTypeSchema,
  durationSeconds: z.number().int().nonnegative(),
  watchPercent: z.number().min(0).max(100),
  lastPositionSeconds: z.number().int().nonnegative(),
  completed: z.boolean(),
  locked: z.boolean(),
  status: LessonCompletionStatusSchema,
});
export type LessonProgressItemDto = z.infer<typeof LessonProgressItemSchema>;

export const CourseProgressSchema = z.object({
  courseId: IdSchema,
  courseTitle: z.string().min(1),
  instructorName: z.string().min(1),
  categoryName: z.string().min(1),
  completedLessons: z.number().int().nonnegative(),
  inProgressLessons: z.number().int().nonnegative(),
  notStartedLessons: z.number().int().nonnegative(),
  totalLessons: z.number().int().nonnegative(),
  overallPercent: z.number().min(0).max(100),
  watchedDurationSeconds: z.number().int().nonnegative(),
  totalDurationSeconds: z.number().int().nonnegative(),
  lastLessonId: z.string().nullable(),
  bestExamScorePercent: z.number().min(0).max(100).nullable(),
  passingScorePercent: z.number().int().min(50).max(100),
  examPassed: z.boolean(),
  certificateUnlocked: z.boolean(),
  certificateId: z.string().nullable(),
  lessons: z.array(LessonProgressItemSchema),
});
export type CourseProgressDto = z.infer<typeof CourseProgressSchema>;

export const LessonDetailSchema = z.object({
  lesson: CurriculumLessonSchema,
  course: CourseRefSchema.extend({ thumbnailUrl: z.string() }),
  sections: z.array(CurriculumSectionSchema),
  watchPercent: z.number().min(0).max(100),
  lastPositionSeconds: z.number().int().nonnegative(),
  completed: z.boolean(),
  locked: z.boolean(),
  nextLessonId: z.string().nullable(),
  previousLessonId: z.string().nullable(),
  courseProgressPercent: z.number().min(0).max(100),
  finalExamUnlocked: z.boolean(),
});
export type LessonDetailDto = z.infer<typeof LessonDetailSchema>;

export const UpdateLessonProgressRequestSchema = z.object({
  positionSeconds: z.number().int().nonnegative(),
  watchPercent: z.number().min(0).max(100),
});
export type UpdateLessonProgressRequestDto = z.infer<
  typeof UpdateLessonProgressRequestSchema
>;

export const LessonProgressMutationResponseSchema = z.object({
  lessonId: IdSchema,
  courseId: IdSchema,
  watchPercent: z.number().min(0).max(100),
  lastPositionSeconds: z.number().int().nonnegative(),
  completed: z.boolean(),
  courseProgressPercent: z.number().min(0).max(100),
});
export type LessonProgressMutationResponseDto = z.infer<
  typeof LessonProgressMutationResponseSchema
>;

export const PaginatedEnrollmentsResponseSchema =
  createPaginatedSchema(EnrollmentSchema);
export type PaginatedEnrollmentsResponseDto = z.infer<
  typeof PaginatedEnrollmentsResponseSchema
>;

export const WishlistListResponseSchema = z.object({
  data: z.array(WishlistItemSchema),
});
export type WishlistListResponseDto = z.infer<typeof WishlistListResponseSchema>;
