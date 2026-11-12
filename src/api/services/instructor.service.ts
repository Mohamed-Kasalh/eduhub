import {
  ActionResultSchema,
  CommentSchema,
  CourseSchema,
  EnrolledStudentProgressDetailSchema,
  InstructorCourseDetailSchema,
  InstructorDashboardSchema,
  PaginatedEnrolledStudentsResponseSchema,
  PaginatedInstructorCommentsResponseSchema,
  PaginatedInstructorCoursesResponseSchema,
  PutCurriculumResponseSchema,
  type ActionResultDto,
  type CommentDto,
  type CourseDto,
  type CourseStatusDto,
  type CreateInstructorCourseRequestDto,
  type EnrolledStudentProgressDetailDto,
  type InstructorCourseDetailDto,
  type InstructorDashboardDto,
  type PaginatedEnrolledStudentsResponseDto,
  type PaginatedInstructorCommentsResponseDto,
  type PaginatedInstructorCoursesResponseDto,
  type PutCurriculumRequestDto,
  type PutCurriculumResponseDto,
  type ResolveInstructorCommentRequestDto,
  type UpdateInstructorCourseRequestDto,
} from '../dto';
import { http } from '../http';

export type InstructorCoursesQueryParams = {
  status?: CourseStatusDto | 'all';
  q?: string;
  page?: number;
  limit?: number;
};

export type InstructorStudentsQueryParams = {
  courseId?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export type InstructorCommentsQueryParams = {
  status?: 'unanswered' | 'all';
  courseId?: string;
  page?: number;
  limit?: number;
};

/** Instructor course authoring, curriculum management, student analytics, and Q&A endpoints. */
export const instructorService = {
  /** Retrieves instructor KPIs, 30-day enrollment trend, recent comments, and notices. */
  async getDashboard(): Promise<InstructorDashboardDto> {
    return http.get('/instructor/dashboard', InstructorDashboardSchema);
  },

  /** Lists and filters courses owned by the instructor. */
  async getCourses(
    params?: InstructorCoursesQueryParams
  ): Promise<PaginatedInstructorCoursesResponseDto> {
    return http.get('/instructor/courses', PaginatedInstructorCoursesResponseSchema, {
      query: params ? { ...params } : undefined,
    });
  },

  /** Creates a new draft course owned by the instructor. */
  async createCourse(payload: CreateInstructorCourseRequestDto): Promise<CourseDto> {
    return http.post('/instructor/courses', CourseSchema, payload);
  },

  /** Loads full instructor editing detail (curriculum + exam stats) for a course. */
  async getCourseDetail(courseId: string): Promise<InstructorCourseDetailDto> {
    return http.get(
      `/instructor/courses/${encodeURIComponent(courseId)}`,
      InstructorCourseDetailSchema
    );
  },

  /** Updates metadata or pricing fields on an instructor-owned course. */
  async updateCourse(
    courseId: string,
    payload: UpdateInstructorCourseRequestDto
  ): Promise<CourseDto> {
    return http.patch(
      `/instructor/courses/${encodeURIComponent(courseId)}`,
      CourseSchema,
      payload
    );
  },

  /** Deletes an instructor-owned course. */
  async deleteCourse(courseId: string): Promise<ActionResultDto> {
    return http.delete(
      `/instructor/courses/${encodeURIComponent(courseId)}`,
      ActionResultSchema
    );
  },

  /** Replaces the full ordered curriculum tree (sections + lessons) for a course. */
  async putCurriculum(
    courseId: string,
    payload: PutCurriculumRequestDto
  ): Promise<PutCurriculumResponseDto> {
    return http.put(
      `/instructor/courses/${encodeURIComponent(courseId)}/curriculum`,
      PutCurriculumResponseSchema,
      payload
    );
  },

  /** Validates wizard readiness and submits the course for supervisor review. */
  async submitCourse(courseId: string): Promise<CourseDto> {
    return http.post(
      `/instructor/courses/${encodeURIComponent(courseId)}/submit`,
      CourseSchema
    );
  },

  /** Lists students enrolled in the instructor's courses. */
  async getEnrolledStudents(
    params?: InstructorStudentsQueryParams
  ): Promise<PaginatedEnrolledStudentsResponseDto> {
    return http.get('/instructor/students', PaginatedEnrolledStudentsResponseSchema, {
      query: params ? { ...params } : undefined,
    });
  },

  /** Retrieves lesson-by-lesson and exam attempt progress for one enrolled student. */
  async getStudentProgress(
    studentId: string,
    courseId?: string
  ): Promise<EnrolledStudentProgressDetailDto> {
    return http.get(
      `/instructor/students/${encodeURIComponent(studentId)}/progress`,
      EnrolledStudentProgressDetailSchema,
      { query: courseId ? { courseId } : undefined }
    );
  },

  /** Lists student questions/comments across the instructor's courses. */
  async getComments(
    params?: InstructorCommentsQueryParams
  ): Promise<PaginatedInstructorCommentsResponseDto> {
    return http.get('/instructor/comments', PaginatedInstructorCommentsResponseSchema, {
      query: params ? { ...params } : undefined,
    });
  },

  /** Marks an instructor comment thread resolved or unresolved. */
  async resolveComment(
    commentId: string,
    payload: ResolveInstructorCommentRequestDto
  ): Promise<CommentDto> {
    return http.patch(
      `/instructor/comments/${encodeURIComponent(commentId)}`,
      CommentSchema,
      payload
    );
  },
};
