import { z } from 'zod';
import {
  AttachmentFileTypeSchema,
  CatalogSortSchema,
  CatalogTabSchema,
  CategorySummarySchema,
  CourseLanguageSchema,
  CourseLevelSchema,
  CourseStatusSchema,
  DurationBucketSchema,
  IdSchema,
  InstructorSummarySchema,
  IsoDateTimeSchema,
  LessonTypeSchema,
  MoneySchema,
  SubcategorySummarySchema,
  UserSummarySchema,
  createPaginatedSchema,
} from './common.dto';

export const SubcategorySchema = z.object({
  id: IdSchema,
  categoryId: IdSchema,
  name: z.string().min(1),
  courseCount: z.number().int().nonnegative(),
});
export type SubcategoryDto = z.infer<typeof SubcategorySchema>;

export const CategorySchema = z.object({
  id: IdSchema,
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  description: z.string(),
  courseCount: z.number().int().nonnegative(),
  iconName: z.string().min(1),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  order: z.number().int().nonnegative(),
  subcategories: z.array(SubcategorySchema).optional(),
});
export type CategoryDto = z.infer<typeof CategorySchema>;

/**
 * Unified canonical Course DTO normalizing public Course,
 * InstructorCourseRecord, and SupervisorCourseSubmission metadata.
 */
export const CourseSchema = z.object({
  id: IdSchema,
  title: z.string().trim().min(1),
  subtitle: z.string(),
  description: z.string().optional(),
  instructor: InstructorSummarySchema,
  category: CategorySummarySchema,
  subcategory: SubcategorySummarySchema.nullable().optional(),
  thumbnailUrl: z.string(),
  previewVideoUrl: z.string().nullable().optional(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  studentsCount: z.number().int().nonnegative(),
  price: MoneySchema,
  originalPrice: MoneySchema.nullable().optional(),
  isFree: z.boolean(),
  level: CourseLevelSchema,
  language: CourseLanguageSchema,
  durationSeconds: z.number().int().nonnegative(),
  lessonsCount: z.number().int().nonnegative(),
  sectionsCount: z.number().int().nonnegative(),
  featured: z.boolean(),
  isNew: z.boolean(),
  includesCertificate: z.boolean(),
  includesExam: z.boolean(),
  passingScorePercent: z.number().int().min(50).max(100),
  unavailable: z.boolean(),
  status: CourseStatusSchema,
  learningPoints: z.array(z.string()),
  requirements: z.array(z.string()),
  tags: z.array(z.string()),
  completionRatePercent: z.number().min(0).max(100).optional(),
  rejectionReason: z.string().nullable().optional(),
  submittedAt: IsoDateTimeSchema.nullable().optional(),
  updatedAt: IsoDateTimeSchema,
  createdAt: IsoDateTimeSchema,
});
export type CourseDto = z.infer<typeof CourseSchema>;

export const LessonAttachmentSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  fileType: AttachmentFileTypeSchema,
  sizeBytes: z.number().int().nonnegative(),
  description: z.string(),
  url: z.string().min(1),
});
export type LessonAttachmentDto = z.infer<typeof LessonAttachmentSchema>;

export const CurriculumLessonSchema = z.object({
  id: IdSchema,
  sectionId: IdSchema,
  courseId: IdSchema,
  number: z.number().int().min(1),
  title: z.string().min(1),
  type: LessonTypeSchema,
  durationSeconds: z.number().int().nonnegative(),
  isPreview: z.boolean(),
  requiresPrevious: z.boolean(),
  videoUrl: z.string().nullable().optional(),
  summary: z.string(),
  keyTakeaways: z.array(z.string()),
  attachments: z.array(LessonAttachmentSchema),
});
export type CurriculumLessonDto = z.infer<typeof CurriculumLessonSchema>;

export const CurriculumSectionSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  subtitle: z.string().optional(),
  order: z.number().int().nonnegative(),
  lessonsCount: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative(),
  lessons: z.array(CurriculumLessonSchema),
});
export type CurriculumSectionDto = z.infer<typeof CurriculumSectionSchema>;

export const RatingBreakdownItemSchema = z.object({
  stars: z.number().int().min(1).max(5),
  count: z.number().int().nonnegative(),
  percent: z.number().min(0).max(100),
});
export type RatingBreakdownItemDto = z.infer<typeof RatingBreakdownItemSchema>;

export const CourseDetailSchema = CourseSchema.extend({
  description: z.string(),
  sections: z.array(CurriculumSectionSchema),
  instructorStats: z.object({
    learnersCount: z.number().int().nonnegative(),
    coursesCount: z.number().int().nonnegative(),
    averageRating: z.number().min(0).max(5),
    bio: z.string(),
  }),
  ratingBreakdown: z.array(RatingBreakdownItemSchema),
  viewerContext: z.object({
    isEnrolled: z.boolean(),
    isWishlisted: z.boolean(),
    hasReviewed: z.boolean(),
    progressPercent: z.number().min(0).max(100),
    nextLessonId: z.string().nullable(),
  }),
});
export type CourseDetailDto = z.infer<typeof CourseDetailSchema>;

export const CourseReviewSchema = z.object({
  id: IdSchema,
  courseId: IdSchema,
  author: UserSummarySchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
  helpfulCount: z.number().int().nonnegative(),
  markedHelpfulByMe: z.boolean(),
  createdAt: IsoDateTimeSchema,
});
export type CourseReviewDto = z.infer<typeof CourseReviewSchema>;

export const CreateCourseReviewRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .min(10, 'Review must be at least 10 characters long.')
    .max(2000),
});
export type CreateCourseReviewRequestDto = z.infer<
  typeof CreateCourseReviewRequestSchema
>;

export const ReviewHelpfulResponseSchema = z.object({
  reviewId: IdSchema,
  helpfulCount: z.number().int().nonnegative(),
  markedHelpfulByMe: z.boolean(),
});
export type ReviewHelpfulResponseDto = z.infer<typeof ReviewHelpfulResponseSchema>;

export const FeaturedInstructorSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  title: z.string(),
  field: z.string(),
  avatarUrl: z.string().nullable(),
  bio: z.string(),
  learnersCount: z.number().int().nonnegative(),
  rating: z.number().min(0).max(5),
  coursesCount: z.number().int().nonnegative(),
  expertiseTags: z.array(z.string()),
});
export type FeaturedInstructorDto = z.infer<typeof FeaturedInstructorSchema>;

export const TestimonialSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  role: z.string().min(1),
  avatarUrl: z.string().nullable(),
  courseTitle: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  quote: z.string().min(1),
});
export type TestimonialDto = z.infer<typeof TestimonialSchema>;

export const PublicConfigSchema = z.object({
  platformName: z.string().min(1),
  currency: z.string().regex(/^[A-Z]{3}$/),
  defaultPassScorePercent: z.number().int().min(50).max(100),
  lessonCompleteThresholdPercent: z.number().int().min(50).max(100),
  uploadLimits: z.object({
    avatarMaxBytes: z.number().int().positive(),
    courseCoverMaxBytes: z.number().int().positive(),
    lessonVideoMaxBytes: z.number().int().positive(),
    attachmentMaxBytes: z.number().int().positive(),
  }),
  featureFlags: z.object({
    googleAuthEnabled: z.boolean(),
    newsletterEnabled: z.boolean(),
    certificatesEnabled: z.boolean(),
  }),
});
export type PublicConfigDto = z.infer<typeof PublicConfigSchema>;

export const PublicStatsSchema = z.object({
  totalCoursesCount: z.number().int().nonnegative(),
  totalLearnersCount: z.number().int().nonnegative(),
  averageRating: z.number().min(0).max(5),
  popularTopics: z.array(z.string()),
});
export type PublicStatsDto = z.infer<typeof PublicStatsSchema>;

export const SearchSuggestionsSchema = z.object({
  categories: z.array(CategorySchema),
  courses: z.array(CourseSchema),
});
export type SearchSuggestionsDto = z.infer<typeof SearchSuggestionsSchema>;

export const NewsletterSubscribeRequestSchema = z.object({
  email: z.email('Enter a valid email address.'),
});
export type NewsletterSubscribeRequestDto = z.infer<
  typeof NewsletterSubscribeRequestSchema
>;

export const NewsletterSubscribeResponseSchema = z.object({
  email: z.email(),
  subscribed: z.boolean(),
});
export type NewsletterSubscribeResponseDto = z.infer<
  typeof NewsletterSubscribeResponseSchema
>;

export const CourseQueryParamsSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  instructorId: z.string().optional(),
  level: CourseLevelSchema.optional(),
  minRating: z.number().min(0).max(5).optional(),
  duration: DurationBucketSchema.optional(),
  language: CourseLanguageSchema.optional(),
  price: z.enum(['free', 'paid']).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  hasCertificate: z.boolean().optional(),
  hasExam: z.boolean().optional(),
  sort: CatalogSortSchema.optional(),
  tab: CatalogTabSchema.optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type CourseQueryParamsDto = z.infer<typeof CourseQueryParamsSchema>;

export const PaginatedCoursesResponseSchema = createPaginatedSchema(CourseSchema);
export type PaginatedCoursesResponseDto = z.infer<
  typeof PaginatedCoursesResponseSchema
>;

export const PaginatedCourseReviewsResponseSchema =
  createPaginatedSchema(CourseReviewSchema);
export type PaginatedCourseReviewsResponseDto = z.infer<
  typeof PaginatedCourseReviewsResponseSchema
>;

export const CategoriesResponseSchema = z.object({
  data: z.array(CategorySchema),
});
export type CategoriesResponseDto = z.infer<typeof CategoriesResponseSchema>;

export const InstructorsResponseSchema = z.object({
  data: z.array(FeaturedInstructorSchema),
});
export type InstructorsResponseDto = z.infer<typeof InstructorsResponseSchema>;

export const TestimonialsResponseSchema = z.object({
  data: z.array(TestimonialSchema),
});
export type TestimonialsResponseDto = z.infer<typeof TestimonialsResponseSchema>;
