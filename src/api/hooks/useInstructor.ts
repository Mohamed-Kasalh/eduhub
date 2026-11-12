import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { emitToast } from '../../lib/toastBus';
import type {
  ActionResultDto,
  CommentDto,
  CommentReplyDto,
  CourseDto,
  CreateInstructorCourseRequestDto,
  InstructorCourseDetailDto,
  InstructorDashboardDto,
  LikeToggleResponseDto,
  PaginatedEnrolledStudentsResponseDto,
  PaginatedInstructorCommentsResponseDto,
  PaginatedInstructorCoursesResponseDto,
  PutCurriculumRequestDto,
  PutCurriculumResponseDto,
  UpdateInstructorCourseRequestDto,
} from '../dto-types-bridge';
import { getErrorMessage } from '../errors';
import {
  mapCommentDtoToInstructorThread,
  mapEnrolledStudentDtoToRecord,
  mapEnrollmentChartPointDtoToView,
  mapInstructorCourseDtoToRecord,
  mapStudentProgressDetailDtoToRecord,
} from '../mappers/instructor.mapper';
import { queryKeys } from '../queryKeys';
import { commentsService } from '../services/comments.service';
import {
  instructorService,
  type InstructorCommentsQueryParams,
  type InstructorCoursesQueryParams,
  type InstructorStudentsQueryParams,
} from '../services/instructor.service';

export interface MappedInstructorDashboardView {
  kpis: InstructorDashboardDto['kpis'];
  enrollmentChart: ReturnType<typeof mapEnrollmentChartPointDtoToView>[];
  recentComments: ReturnType<typeof mapCommentDtoToInstructorThread>[];
  unansweredCommentsCount: number;
  topPerformingCourses: ReturnType<typeof mapInstructorCourseDtoToRecord>[];
  pendingCourses: ReturnType<typeof mapInstructorCourseDtoToRecord>[];
  rejectedCourses: ReturnType<typeof mapInstructorCourseDtoToRecord>[];
}

function invalidateInstructorCourseGraph(
  queryClient: QueryClient,
  courseId?: string
): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.instructor.dashboard });
  void queryClient.invalidateQueries({ queryKey: ['instructor', 'courses'] });
  if (courseId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.instructor.courseDetail(courseId),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
}

/** Loads instructor overview KPIs, 30-day chart, top courses, and unanswered comments. */
export function useInstructorDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.instructor.dashboard,
    queryFn: () => instructorService.getDashboard(),
    enabled,
    select: (dto): MappedInstructorDashboardView => ({
      kpis: dto.kpis,
      enrollmentChart: dto.enrollmentChart.map(mapEnrollmentChartPointDtoToView),
      recentComments: dto.recentComments.map(mapCommentDtoToInstructorThread),
      unansweredCommentsCount: dto.unansweredCommentsCount,
      topPerformingCourses: dto.topPerformingCourses.map(mapInstructorCourseDtoToRecord),
      pendingCourses: dto.notices.pendingCourses.map(mapInstructorCourseDtoToRecord),
      rejectedCourses: dto.notices.rejectedCourses.map(mapInstructorCourseDtoToRecord),
    }),
  });
}

/** Loads paginated courses authored by the signed-in instructor. */
export function useInstructorCourses(
  params: InstructorCoursesQueryParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.instructor.courses(params),
    queryFn: () => instructorService.getCourses(params),
    enabled,
    placeholderData: keepPreviousData,
    select: (res: PaginatedInstructorCoursesResponseDto) => ({
      items: res.data.map(mapInstructorCourseDtoToRecord),
      raw: res.data,
      meta: res.meta,
    }),
  });
}

/** Loads full editable detail (curriculum, exam settings, pricing) for an instructor course. */
export function useInstructorCourseDetail(courseId: string, enabled = true) {
  return useQuery<InstructorCourseDetailDto>({
    queryKey: queryKeys.instructor.courseDetail(courseId),
    queryFn: () => instructorService.getCourseDetail(courseId),
    enabled: Boolean(courseId) && enabled,
  });
}

/** Creates a new instructor course draft (`POST /instructor/courses`). */
export function useCreateInstructorCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation<CourseDto, unknown, CreateInstructorCourseRequestDto>({
    mutationFn: (payload) => instructorService.createCourse(payload),
    onSuccess: (created) => {
      invalidateInstructorCourseGraph(queryClient, created.id);
    },
    onError: (error) => {
      emitToast({
        title: 'Could not create course draft',
        message: getErrorMessage(error, 'Please review the course fields and retry.'),
        variant: 'danger',
      });
    },
  });
}

export interface UpdateInstructorCourseVariables {
  courseId: string;
  payload: UpdateInstructorCourseRequestDto;
  silent?: boolean;
  successTitle?: string;
}

/** Updates course metadata, pricing, media, or tags (`PATCH /instructor/courses/:id`). */
export function useUpdateInstructorCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation<CourseDto, unknown, UpdateInstructorCourseVariables>({
    mutationFn: ({ courseId, payload }) =>
      instructorService.updateCourse(courseId, payload),
    onSuccess: (updated, variables) => {
      invalidateInstructorCourseGraph(queryClient, updated.id);
      if (!variables.silent) {
        emitToast({
          title: variables.successTitle ?? 'Course updated',
          message: `"${updated.title}" changes have been saved.`,
          variant: 'success',
        });
      }
    },
    onError: (error, variables) => {
      if (!variables.silent) {
        emitToast({
          title: 'Could not save course changes',
          message: getErrorMessage(error, 'Please verify your course inputs.'),
          variant: 'danger',
        });
      }
    },
  });
}

/** Deletes an authored course (`DELETE /instructor/courses/:id`). */
export function useDeleteInstructorCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ActionResultDto,
    unknown,
    { courseId: string; title?: string }
  >({
    mutationFn: ({ courseId }) => instructorService.deleteCourse(courseId),
    onSuccess: (_res, variables) => {
      invalidateInstructorCourseGraph(queryClient, variables.courseId);
      emitToast({
        title: 'Course deleted',
        message: variables.title
          ? `"${variables.title}" was removed from your courses.`
          : 'The course was permanently removed.',
        variant: 'success',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not delete course',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}

export interface PutCurriculumVariables {
  courseId: string;
  payload: PutCurriculumRequestDto;
  silent?: boolean;
}

/** Replaces section & lesson structure (`PUT /instructor/courses/:id/curriculum`). */
export function usePutCurriculumMutation() {
  const queryClient = useQueryClient();

  return useMutation<PutCurriculumResponseDto, unknown, PutCurriculumVariables>({
    mutationFn: ({ courseId, payload }) =>
      instructorService.putCurriculum(courseId, payload),
    onSuccess: (res, variables) => {
      invalidateInstructorCourseGraph(queryClient, res.courseId);
      if (!variables.silent) {
        emitToast({
          title: 'Curriculum saved',
          message: `${res.totalLessonsCount} lessons synced cleanly.`,
          variant: 'success',
        });
      }
    },
    onError: (error, variables) => {
      if (!variables.silent) {
        emitToast({
          title: 'Could not save curriculum',
          message: getErrorMessage(error, 'Review section and lesson fields.'),
          variant: 'danger',
        });
      }
    },
  });
}

/** Submits a course for supervisor moderation review (`POST /instructor/courses/:id/submit`). */
export function useSubmitCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation<CourseDto, unknown, { courseId: string }>({
    mutationFn: ({ courseId }) => instructorService.submitCourse(courseId),
    onSuccess: (updated) => {
      invalidateInstructorCourseGraph(queryClient, updated.id);
      void queryClient.invalidateQueries({ queryKey: ['supervisor'] });
      emitToast({
        title: 'Submitted for review',
        message: `"${updated.title}" has been sent to academic supervisors.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Submission incomplete',
        message: getErrorMessage(
          error,
          'Please resolve the submission checklist items before submitting.'
        ),
        variant: 'danger',
      });
    },
  });
}

/** Loads paginated students enrolled in the instructor's courses. */
export function useInstructorStudents(
  params: InstructorStudentsQueryParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.instructor.students(params),
    queryFn: () => instructorService.getEnrolledStudents(params),
    enabled,
    placeholderData: keepPreviousData,
    select: (res: PaginatedEnrolledStudentsResponseDto) => ({
      items: res.data.map(mapEnrolledStudentDtoToRecord),
      meta: res.meta,
    }),
  });
}

/** Loads lesson-by-lesson & exam attempt breakdown for a single enrolled student. */
export function useInstructorStudentProgress(
  studentId: string,
  courseId: string,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.instructor.studentProgress(studentId, courseId),
    queryFn: () => instructorService.getStudentProgress(studentId, courseId),
    enabled: Boolean(studentId && courseId) && enabled,
    select: mapStudentProgressDetailDtoToRecord,
  });
}

/** Loads Q&A threads across instructor's courses (`unanswered` | `all`). */
export function useInstructorComments(
  params: InstructorCommentsQueryParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.instructor.comments(params),
    queryFn: () => instructorService.getComments(params),
    enabled,
    placeholderData: keepPreviousData,
    select: (res: PaginatedInstructorCommentsResponseDto) => ({
      items: res.data.map(mapCommentDtoToInstructorThread),
      meta: res.meta,
    }),
  });
}

type InstructorCommentSnapshots = Array<
  [QueryKey, PaginatedInstructorCommentsResponseDto | undefined]
>;

/** Toggles resolved state on an instructor Q&A thread with optimistic cache update. */
export function useResolveInstructorCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CommentDto,
    unknown,
    { commentId: string; resolved: boolean; silent?: boolean },
    { snapshots: InstructorCommentSnapshots }
  >({
    mutationFn: ({ commentId, resolved }) =>
      instructorService.resolveComment(commentId, { resolved }),
    onMutate: async ({ commentId, resolved }) => {
      await queryClient.cancelQueries({ queryKey: ['instructor', 'comments'] });
      const snapshots =
        queryClient.getQueriesData<PaginatedInstructorCommentsResponseDto>({
          queryKey: ['instructor', 'comments'],
        });

      queryClient.setQueriesData<PaginatedInstructorCommentsResponseDto>(
        { queryKey: ['instructor', 'comments'] },
        (prev) =>
          prev
            ? {
                ...prev,
                data: prev.data.map((item) =>
                  item.id === commentId ? { ...item, resolved } : item
                ),
              }
            : prev
      );

      return { snapshots };
    },
    onSuccess: (updated, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['instructor', 'comments'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.instructor.dashboard });
      if (!variables.silent) {
        emitToast({
          title: updated.resolved ? 'Marked as resolved' : 'Thread reopened',
          message: updated.resolved
            ? 'The discussion thread has been resolved.'
            : 'Moved back to your unanswered queue.',
          variant: 'info',
        });
      }
    },
    onError: (error, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(key, data);
        }
      }
      emitToast({
        title: 'Could not update thread status',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}

/** Sends an instructor reply to a student lesson question. */
export function useReplyInstructorCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<CommentReplyDto, unknown, { commentId: string; content: string }>({
    mutationFn: ({ commentId, content }) =>
      commentsService.replyToComment(commentId, { content }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['instructor', 'comments'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.instructor.dashboard });
      void queryClient.invalidateQueries({ queryKey: ['comments'] });
      emitToast({
        title: 'Reply posted',
        message: 'Your answer is now visible to the student.',
        variant: 'success',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not post reply',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}

/** Toggles instructor upvote/like on a student comment thread. */
export function useToggleInstructorCommentLikeMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    LikeToggleResponseDto,
    unknown,
    { commentId: string; currentlyLiked: boolean },
    { snapshots: InstructorCommentSnapshots }
  >({
    mutationFn: ({ commentId, currentlyLiked }) =>
      currentlyLiked
        ? commentsService.unlikeComment(commentId)
        : commentsService.likeComment(commentId),
    onMutate: async ({ commentId, currentlyLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['instructor', 'comments'] });
      const snapshots =
        queryClient.getQueriesData<PaginatedInstructorCommentsResponseDto>({
          queryKey: ['instructor', 'comments'],
        });

      const nextLiked = !currentlyLiked;
      queryClient.setQueriesData<PaginatedInstructorCommentsResponseDto>(
        { queryKey: ['instructor', 'comments'] },
        (prev) =>
          prev
            ? {
                ...prev,
                data: prev.data.map((item) => {
                  if (item.id !== commentId) return item;
                  return {
                    ...item,
                    likedByMe: nextLiked,
                    likesCount: Math.max(
                      0,
                      item.likesCount + (nextLiked ? 1 : -1)
                    ),
                  };
                }),
              }
            : prev
      );

      return { snapshots };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['instructor', 'comments'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.instructor.dashboard });
    },
    onError: (error, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(key, data);
        }
      }
      emitToast({
        title: 'Could not update reaction',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}
