import { z } from 'zod';
import {
  CategoriesResponseSchema,
  CourseDetailSchema,
  CourseReviewSchema,
  CourseSchema,
  InstructorsResponseSchema,
  NewsletterSubscribeResponseSchema,
  PaginatedCourseReviewsResponseSchema,
  PaginatedCoursesResponseSchema,
  PublicConfigSchema,
  PublicStatsSchema,
  ReviewHelpfulResponseSchema,
  SearchSuggestionsSchema,
  TestimonialsResponseSchema,
  type CategoriesResponseDto,
  type CourseDetailDto,
  type CourseDto,
  type CourseQueryParamsDto,
  type CourseReviewDto,
  type CreateCourseReviewRequestDto,
  type InstructorsResponseDto,
  type NewsletterSubscribeRequestDto,
  type NewsletterSubscribeResponseDto,
  type PaginatedCourseReviewsResponseDto,
  type PaginatedCoursesResponseDto,
  type PublicConfigDto,
  type PublicStatsDto,
  type ReviewHelpfulResponseDto,
  type SearchSuggestionsDto,
  type TestimonialsResponseDto,
} from '../dto';
import { http } from '../http';

const RelatedCoursesResponseSchema = z.object({
  data: z.array(CourseSchema),
});

/** Public discovery, catalog filtering, course detail, and course review endpoints. */
export const catalogService = {
  /** Retrieves global public platform configuration and feature flags. */
  async getPublicConfig(): Promise<PublicConfigDto> {
    return http.get('/config', PublicConfigSchema, { skipAuth: true });
  },

  /** Retrieves landing-page statistics and popular topics. */
  async getPublicStats(): Promise<PublicStatsDto> {
    return http.get('/public/stats', PublicStatsSchema, { skipAuth: true });
  },

  /** Lists active categories and nested subcategories. */
  async getCategories(): Promise<CategoriesResponseDto> {
    return http.get('/categories', CategoriesResponseSchema, { skipAuth: true });
  },

  /** Lists instructors (optionally filtered to featured instructors). */
  async getInstructors(params?: { featured?: boolean }): Promise<InstructorsResponseDto> {
    return http.get('/instructors', InstructorsResponseSchema, {
      query: params ? { ...params } : undefined,
      skipAuth: true,
    });
  },

  /** Lists landing-page student testimonials. */
  async getTestimonials(): Promise<TestimonialsResponseDto> {
    return http.get('/testimonials', TestimonialsResponseSchema, { skipAuth: true });
  },

  /** Fetches search autocomplete suggestions matching a query string. */
  async getSearchSuggestions(q: string): Promise<SearchSuggestionsDto> {
    return http.get('/search/suggestions', SearchSuggestionsSchema, {
      query: { q },
      skipAuth: true,
    });
  },

  /** Subscribes an email address to the footer newsletter. */
  async subscribeNewsletter(
    payload: NewsletterSubscribeRequestDto
  ): Promise<NewsletterSubscribeResponseDto> {
    return http.post('/newsletter/subscribe', NewsletterSubscribeResponseSchema, payload, {
      skipAuth: true,
    });
  },

  /** Searches, filters, sorts, and paginates public catalog courses. */
  async getCourses(params?: CourseQueryParamsDto): Promise<PaginatedCoursesResponseDto> {
    return http.get('/courses', PaginatedCoursesResponseSchema, {
      query: params ? { ...params } : undefined,
    });
  },

  /** Retrieves full course detail including curriculum, breakdown, and viewer context. */
  async getCourseDetail(courseId: string): Promise<CourseDetailDto> {
    return http.get(`/courses/${encodeURIComponent(courseId)}`, CourseDetailSchema);
  },

  /** Fetches related courses for a course detail page. */
  async getRelatedCourses(courseId: string, limit?: number): Promise<{ data: CourseDto[] }> {
    return http.get(
      `/courses/${encodeURIComponent(courseId)}/related`,
      RelatedCoursesResponseSchema,
      { query: limit !== undefined ? { limit } : undefined }
    );
  },

  /** Lists paginated reviews for a course. */
  async getCourseReviews(
    courseId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedCourseReviewsResponseDto> {
    return http.get(
      `/courses/${encodeURIComponent(courseId)}/reviews`,
      PaginatedCourseReviewsResponseSchema,
      { query: params ? { ...params } : undefined }
    );
  },

  /** Submits a new student review for an enrolled course. */
  async createCourseReview(
    courseId: string,
    payload: CreateCourseReviewRequestDto
  ): Promise<CourseReviewDto> {
    return http.post(
      `/courses/${encodeURIComponent(courseId)}/reviews`,
      CourseReviewSchema,
      payload
    );
  },

  /** Marks a course review as helpful for the current user. */
  async markReviewHelpful(reviewId: string): Promise<ReviewHelpfulResponseDto> {
    return http.put(
      `/reviews/${encodeURIComponent(reviewId)}/helpful`,
      ReviewHelpfulResponseSchema
    );
  },

  /** Removes the current user's helpful vote on a course review. */
  async unmarkReviewHelpful(reviewId: string): Promise<ReviewHelpfulResponseDto> {
    return http.delete(
      `/reviews/${encodeURIComponent(reviewId)}/helpful`,
      ReviewHelpfulResponseSchema
    );
  },
};
