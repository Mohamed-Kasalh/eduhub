import {
  CourseProgressSchema,
  EnrollmentSchema,
  LessonDetailSchema,
  LessonProgressMutationResponseSchema,
  PaginatedEnrollmentsResponseSchema,
  StudentDashboardSchema,
  WishlistListResponseSchema,
  WishlistMutationResponseSchema,
  type CourseProgressDto,
  type EnrollmentDto,
  type LessonDetailDto,
  type LessonProgressMutationResponseDto,
  type PaginatedEnrollmentsResponseDto,
  type StudentDashboardDto,
  type UpdateLessonProgressRequestDto,
  type WishlistListResponseDto,
  type WishlistMutationResponseDto,
} from '../dto';
import { http } from '../http';

export type EnrollmentsQueryParams = {
  status?: 'all' | 'in_progress' | 'completed';
  q?: string;
  sort?: 'recent' | 'progress_desc' | 'progress_asc' | 'title';
  page?: number;
  limit?: number;
};

/** Student enrollment, wishlist, dashboard, lesson playback, and progress endpoints. */
export const learningService = {
  /** Enrolls the authenticated student in a published course. */
  async enrollInCourse(courseId: string): Promise<EnrollmentDto> {
    return http.post(`/courses/${encodeURIComponent(courseId)}/enroll`, EnrollmentSchema);
  },

  /** Lists and filters the authenticated student's enrolled courses. */
  async getMyEnrollments(
    params?: EnrollmentsQueryParams
  ): Promise<PaginatedEnrollmentsResponseDto> {
    return http.get('/me/enrollments', PaginatedEnrollmentsResponseSchema, {
      query: params ? { ...params } : undefined,
    });
  },

  /** Lists all courses in the authenticated user's wishlist. */
  async getWishlist(): Promise<WishlistListResponseDto> {
    return http.get('/me/wishlist', WishlistListResponseSchema);
  },

  /** Adds a course to the authenticated user's wishlist. */
  async addToWishlist(courseId: string): Promise<WishlistMutationResponseDto> {
    return http.put(
      `/me/wishlist/${encodeURIComponent(courseId)}`,
      WishlistMutationResponseSchema
    );
  },

  /** Removes a course from the authenticated user's wishlist. */
  async removeFromWishlist(courseId: string): Promise<WishlistMutationResponseDto> {
    return http.delete(
      `/me/wishlist/${encodeURIComponent(courseId)}`,
      WishlistMutationResponseSchema
    );
  },

  /** Retrieves KPIs, weekly activity, achievements, and active courses for the student dashboard. */
  async getStudentDashboard(): Promise<StudentDashboardDto> {
    return http.get('/me/dashboard', StudentDashboardSchema);
  },

  /** Retrieves overall progress, lesson breakdown, and certificate eligibility for an enrolled course. */
  async getCourseProgress(courseId: string): Promise<CourseProgressDto> {
    return http.get(`/courses/${encodeURIComponent(courseId)}/progress`, CourseProgressSchema);
  },

  /** Loads lesson content, video URL, attachments, and sequential unlock flags. */
  async getLessonDetail(courseId: string, lessonId: string): Promise<LessonDetailDto> {
    return http.get(
      `/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`,
      LessonDetailSchema
    );
  },

  /** Persists playback position and watch percentage (auto-completes at >= 90%). */
  async updateLessonProgress(
    courseId: string,
    lessonId: string,
    payload: UpdateLessonProgressRequestDto
  ): Promise<LessonProgressMutationResponseDto> {
    return http.put(
      `/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/progress`,
      LessonProgressMutationResponseSchema,
      payload
    );
  },

  /** Explicitly marks a lesson as completed. */
  async markLessonComplete(
    courseId: string,
    lessonId: string
  ): Promise<LessonProgressMutationResponseDto> {
    return http.post(
      `/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/complete`,
      LessonProgressMutationResponseSchema
    );
  },

  /** Clears completion state for a lesson. */
  async unmarkLessonComplete(
    courseId: string,
    lessonId: string
  ): Promise<LessonProgressMutationResponseDto> {
    return http.delete(
      `/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/complete`,
      LessonProgressMutationResponseSchema
    );
  },
};
