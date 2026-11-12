import { formatCompact, formatDate, formatDuration, formatRelativeTime } from '../../lib/format';
import type {
  CatalogSortDto,
  Category,
  CategoryDto,
  Course,
  CourseDetailDto,
  CourseDto,
  CourseLanguageDto,
  CourseLevel,
  CourseLevelDto,
  CourseReview,
  CourseReviewDto,
  CourseStatus,
  CourseStatusDto,
  CurriculumSection,
  CurriculumSectionDto,
  DurationBucketDto,
  FeaturedInstructorDto,
  InstructorHighlight,
  RatingBreakdownItemDto,
  StudentTestimonial,
  SubcategoryDto,
  SubcategoryItem,
  TestimonialDto,
} from '../dto-types-bridge';

export interface CategoryWithSubcategories extends Category {
  subcategories: SubcategoryItem[];
}

export interface MappedCourseDetail {
  course: Course;
  description: string;
  requirements: string[];
  sections: CurriculumSection[];
  totalSectionsCount: number;
  totalLessonsCount: number;
  totalDurationLabel: string;
  instructorInfo: InstructorHighlight;
  ratingBreakdown: RatingBreakdownItemDto[];
  viewerContext: CourseDetailDto['viewerContext'];
}

export interface MappedCourseReview extends CourseReview {
  markedHelpfulByMe: boolean;
}

export const COURSE_LEVEL_LABELS: Record<CourseLevelDto, CourseLevel> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const LABEL_TO_COURSE_LEVEL: Record<string, CourseLevelDto> = {
  Beginner: 'beginner',
  Intermediate: 'intermediate',
  Advanced: 'advanced',
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
};

export const COURSE_STATUS_LABELS: Record<CourseStatusDto, CourseStatus> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  published: 'Published',
  rejected: 'Rejected',
};

const LABEL_TO_COURSE_STATUS: Record<string, CourseStatusDto> = {
  Draft: 'draft',
  'Pending review': 'pending_review',
  Published: 'published',
  Rejected: 'rejected',
  draft: 'draft',
  pending_review: 'pending_review',
  published: 'published',
  rejected: 'rejected',
};

export const COURSE_LANGUAGE_LABELS: Record<CourseLanguageDto, string> = {
  en: 'English',
  en_ar_cc: 'English & Arabic CC',
  es_cc: 'Spanish CC',
};

const LABEL_TO_COURSE_LANGUAGE: Record<string, CourseLanguageDto> = {
  English: 'en',
  'English & Arabic CC': 'en_ar_cc',
  'Spanish CC': 'es_cc',
  en: 'en',
  en_ar_cc: 'en_ar_cc',
  es_cc: 'es_cc',
};

const UI_DURATION_TO_DTO: Record<string, DurationBucketDto> = {
  '0-2h': '0_2h',
  '2-5h': '2_5h',
  '5-10h': '5_10h',
  '10h+': '10h_plus',
  '0_2h': '0_2h',
  '2_5h': '2_5h',
  '5_10h': '5_10h',
  '10h_plus': '10h_plus',
};

const UI_SORT_TO_DTO: Record<string, CatalogSortDto> = {
  popular: 'popular',
  newest: 'newest',
  rating: 'rating',
  'price-asc': 'price_asc',
  price_asc: 'price_asc',
  'price-desc': 'price_desc',
  price_desc: 'price_desc',
};

/** Converts UI level label to API `CourseLevelDto`. */
export function toCourseLevelDto(label: string): CourseLevelDto | undefined {
  return LABEL_TO_COURSE_LEVEL[label];
}

/** Converts UI language label to API `CourseLanguageDto`. */
export function toCourseLanguageDto(label: string): CourseLanguageDto | undefined {
  return LABEL_TO_COURSE_LANGUAGE[label];
}

/** Converts UI course status label to API `CourseStatusDto`. */
export function toCourseStatusDto(label: string): CourseStatusDto | undefined {
  return LABEL_TO_COURSE_STATUS[label];
}

/** Converts UI duration filter string (`"0-2h"`, etc.) to API `DurationBucketDto`. */
export function toDurationBucketDto(bucket: string): DurationBucketDto | undefined {
  return UI_DURATION_TO_DTO[bucket];
}

/** Converts UI catalog sort option (`"price-asc"`, etc.) to API `CatalogSortDto`. */
export function toCatalogSortDto(sort: string): CatalogSortDto {
  return UI_SORT_TO_DTO[sort] ?? 'popular';
}

/** Maps a backend `SubcategoryDto` to the UI `SubcategoryItem` shape. */
export function mapSubcategoryDtoToItem(dto: SubcategoryDto): SubcategoryItem {
  return {
    id: dto.id,
    name: dto.name,
    count: dto.courseCount,
  };
}

/** Maps a backend `CategoryDto` into UI `Category` + nested subcategories. */
export function mapCategoryDtoToCategory(dto: CategoryDto): CategoryWithSubcategories {
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    description: dto.description,
    courseCount: dto.courseCount,
    iconName: dto.iconName,
    accentColor: dto.accentColor,
    subcategories: (dto.subcategories ?? []).map(mapSubcategoryDtoToItem),
  };
}

/** Maps a backend `CourseDto` into the UI `Course` view model. */
export function mapCourseDtoToCourse(dto: CourseDto, progressPercent?: number): Course {
  return {
    id: dto.id,
    title: dto.title,
    subtitle: dto.subtitle,
    instructorId: dto.instructor.id,
    instructorName: dto.instructor.name,
    instructorAvatar: dto.instructor.avatarUrl ?? '',
    categoryId: dto.category.id,
    categoryName: dto.category.name,
    thumbnail: dto.thumbnailUrl,
    rating: dto.rating,
    reviewCount: dto.reviewCount,
    studentsCount: dto.studentsCount,
    price: dto.price.amount,
    originalPrice: dto.originalPrice?.amount,
    level: COURSE_LEVEL_LABELS[dto.level],
    duration: formatDuration(dto.durationSeconds),
    lessonsCount: dto.lessonsCount,
    featured: dto.featured,
    isNew: dto.isNew,
    isFree: dto.isFree,
    subcategory: dto.subcategory?.name,
    durationHours: Math.round((dto.durationSeconds / 3600) * 10) / 10,
    language: COURSE_LANGUAGE_LABELS[dto.language],
    includesCertificate: dto.includesCertificate,
    includesExam: dto.includesExam,
    unavailable: dto.unavailable,
    learningPoints: dto.learningPoints,
    status: COURSE_STATUS_LABELS[dto.status],
    updatedAt: formatDate(dto.updatedAt, { preset: 'monthYear' }),
    progress: progressPercent,
    tags: dto.tags,
  };
}

/** Maps a backend `CurriculumSectionDto` to the UI `CurriculumSection` shape. */
export function mapCurriculumSectionDtoToSection(dto: CurriculumSectionDto): CurriculumSection {
  return {
    id: dto.id,
    title: dto.title,
    lessonsCount: dto.lessonsCount,
    totalDuration: formatDuration(dto.durationSeconds),
    lessons: dto.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      duration: formatDuration(lesson.durationSeconds, 'clock'),
      isPreview: lesson.isPreview,
    })),
  };
}

/** Maps a backend `CourseDetailDto` into the structured detail view model. */
export function mapCourseDetailDtoToDetail(dto: CourseDetailDto): MappedCourseDetail {
  const sections = dto.sections.map(mapCurriculumSectionDtoToSection);
  const totalLessonsCount =
    sections.reduce((sum, sec) => sum + sec.lessonsCount, 0) || dto.lessonsCount;
  const totalDurationSeconds =
    dto.sections.reduce((sum, sec) => sum + sec.durationSeconds, 0) || dto.durationSeconds;

  return {
    course: mapCourseDtoToCourse(dto, dto.viewerContext.progressPercent),
    description: dto.description,
    requirements: dto.requirements,
    sections,
    totalSectionsCount: sections.length || dto.sectionsCount,
    totalLessonsCount,
    totalDurationLabel: formatDuration(totalDurationSeconds),
    instructorInfo: {
      id: dto.instructor.id,
      name: dto.instructor.name,
      field: dto.instructor.title || `${dto.category.name} Lead Instructor`,
      avatar: dto.instructor.avatarUrl ?? '',
      learnersCount: formatCompact(dto.instructorStats.learnersCount),
      rating: dto.instructorStats.averageRating || dto.rating,
      coursesCount: dto.instructorStats.coursesCount,
      bio: dto.instructorStats.bio,
    },
    ratingBreakdown: dto.ratingBreakdown,
    viewerContext: dto.viewerContext,
  };
}

/** Maps a backend `CourseReviewDto` to the UI `CourseReview` shape with helpful vote state. */
export function mapCourseReviewDtoToReview(dto: CourseReviewDto): MappedCourseReview {
  return {
    id: dto.id,
    courseId: dto.courseId,
    authorName: dto.author.name,
    authorAvatar: dto.author.avatarUrl ?? '',
    authorRole: dto.author.title || 'Enrolled Student',
    rating: dto.rating,
    createdAt: formatRelativeTime(dto.createdAt),
    comment: dto.comment,
    helpfulCount: dto.helpfulCount,
    markedHelpfulByMe: dto.markedHelpfulByMe,
  };
}

/** Maps a backend `FeaturedInstructorDto` to the UI `InstructorHighlight` shape. */
export function mapFeaturedInstructorDtoToHighlight(
  dto: FeaturedInstructorDto
): InstructorHighlight {
  return {
    id: dto.id,
    name: dto.name,
    field: dto.field || dto.title,
    avatar: dto.avatarUrl ?? '',
    learnersCount: formatCompact(dto.learnersCount),
    rating: dto.rating,
    coursesCount: dto.coursesCount,
    bio: dto.bio,
  };
}

/** Maps a backend `TestimonialDto` to the UI `StudentTestimonial` shape. */
export function mapTestimonialDtoToTestimonial(dto: TestimonialDto): StudentTestimonial {
  return {
    id: dto.id,
    name: dto.name,
    role: dto.role,
    avatar: dto.avatarUrl ?? '',
    courseTitle: dto.courseTitle,
    rating: dto.rating,
    quote: dto.quote,
  };
}
