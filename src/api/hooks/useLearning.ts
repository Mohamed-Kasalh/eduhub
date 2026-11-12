import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { getErrorMessage } from '../errors';
import {
  mapCourseProgressDtoToView,
  mapEnrollmentDtoToCard,
  mapLessonDetailDtoToPlayer,
  mapStudentDashboardDtoToView,
  type MappedLessonDetail,
} from '../mappers';
import { queryKeys } from '../queryKeys';
import { learningService, type EnrollmentsQueryParams } from '../services';
import { emitToast } from '../../lib/toastBus';

/** Enrolls the authenticated student in a published course. */
export function useEnrollCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) => learningService.enrollInCourse(courseId),
    onSuccess: (enrollment, courseId) => {
      emitToast({
        title: `Enrolled in ${enrollment.course.title}`,
        message: 'You now have full lifetime access to all lessons and final exams.',
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.enrollmentsPrefix });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.dashboard });
    },
    onError: (error) => {
      emitToast({
        title: 'Enrollment failed',
        message: getErrorMessage(error, 'Could not complete enrollment right now.'),
        variant: 'danger',
      });
    },
  });
}

/** Fetches the authenticated student's KPIs, continue-learning card, weekly chart & recommendations. */
export function useStudentDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me.dashboard,
    queryFn: async () => {
      const dto = await learningService.getStudentDashboard();
      return mapStudentDashboardDtoToView(dto);
    },
    enabled,
  });
}

/** Lists and filters the authenticated student's enrollments without pagination flicker. */
export function useMyEnrollments(params?: EnrollmentsQueryParams, enabled = true) {
  const normalized = params ?? {};
  return useQuery({
    queryKey: queryKeys.me.enrollments(normalized),
    queryFn: async () => {
      const response = await learningService.getMyEnrollments(normalized);
      return {
        items: response.data.map(mapEnrollmentDtoToCard),
        rawItems: response.data,
        meta: response.meta,
      };
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Fetches full lesson-by-lesson completion breakdown and certificate readiness for a course. */
export function useCourseProgress(courseId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.me.courseProgress(courseId ?? ''),
    queryFn: async () => {
      if (!courseId) {
        throw new Error('Course ID is required.');
      }
      const dto = await learningService.getCourseProgress(courseId);
      return mapCourseProgressDtoToView(dto);
    },
    enabled: enabled && Boolean(courseId),
  });
}

/** Fetches full video/player metadata, curriculum sections, and resume timestamp for a lesson. */
export function useLessonDetail(
  courseId: string | undefined,
  lessonId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.me.lessonDetail(courseId ?? '', lessonId ?? ''),
    queryFn: async () => {
      if (!courseId || !lessonId) {
        throw new Error('Course ID and Lesson ID are required.');
      }
      const dto = await learningService.getLessonDetail(courseId, lessonId);
      return mapLessonDetailDtoToPlayer(dto);
    },
    enabled: enabled && Boolean(courseId && lessonId),
  });
}

/** Saves debounced video playback position & watch percentage to the backend. */
export function useSaveLessonProgressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      courseId,
      lessonId,
      positionSeconds,
      watchPercent,
    }: {
      courseId: string;
      lessonId: string;
      positionSeconds: number;
      watchPercent: number;
    }) =>
      learningService.updateLessonProgress(courseId, lessonId, {
        positionSeconds: Math.max(0, Math.round(positionSeconds)),
        watchPercent: Math.max(0, Math.min(100, Math.round(watchPercent))),
      }),
    onSuccess: (res) => {
      queryClient.setQueryData<MappedLessonDetail | undefined>(
        queryKeys.me.lessonDetail(res.courseId, res.lessonId),
        (prev) =>
          prev
            ? {
                ...prev,
                watchPercent: res.watchPercent,
                lastPositionSeconds: res.lastPositionSeconds,
                completed: res.completed,
                courseProgressPercent: res.courseProgressPercent,
              }
            : prev
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.me.courseProgress(res.courseId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.enrollmentsPrefix });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.dashboard });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not save progress',
        message: getErrorMessage(error, 'Playback progress will retry on your next interaction.'),
        variant: 'danger',
      });
    },
  });
}

/** Marks a lesson as complete (manual toggle or automatic 90% threshold completion). */
export function useCompleteLessonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      courseId,
      lessonId,
    }: {
      courseId: string;
      lessonId: string;
      lessonTitle?: string;
      isAutoComplete?: boolean;
    }) => learningService.markLessonComplete(courseId, lessonId),
    onSuccess: (res, variables) => {
      queryClient.setQueryData<MappedLessonDetail | undefined>(
        queryKeys.me.lessonDetail(res.courseId, res.lessonId),
        (prev) =>
          prev
            ? {
                ...prev,
                watchPercent: res.watchPercent,
                lastPositionSeconds: res.lastPositionSeconds,
                completed: true,
                courseProgressPercent: res.courseProgressPercent,
              }
            : prev
      );
      emitToast({
        title: variables.isAutoComplete ? 'Lesson completed' : 'Lesson marked complete (100%)',
        message: variables.lessonTitle
          ? variables.isAutoComplete
            ? `You reached 90%+ watched on "${variables.lessonTitle}". Course progress updated!`
            : variables.lessonTitle
          : 'Course completion progress has been updated.',
        variant: 'success',
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.me.courseProgress(res.courseId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.me.lessonDetail(res.courseId, res.lessonId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.enrollmentsPrefix });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.dashboard });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not update lesson status',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}

/** Resets lesson completion status back to in-progress/incomplete. */
export function useUncompleteLessonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      courseId,
      lessonId,
    }: {
      courseId: string;
      lessonId: string;
      lessonTitle?: string;
    }) => learningService.unmarkLessonComplete(courseId, lessonId),
    onSuccess: (res, variables) => {
      queryClient.setQueryData<MappedLessonDetail | undefined>(
        queryKeys.me.lessonDetail(res.courseId, res.lessonId),
        (prev) =>
          prev
            ? {
                ...prev,
                watchPercent: res.watchPercent,
                lastPositionSeconds: res.lastPositionSeconds,
                completed: false,
                courseProgressPercent: res.courseProgressPercent,
              }
            : prev
      );
      emitToast({
        title: 'Lesson reset to 0%',
        message: variables.lessonTitle
          ? `"${variables.lessonTitle}" marked as incomplete so you can review again.`
          : 'Lesson progress reset.',
        variant: 'info',
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.me.courseProgress(res.courseId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.me.lessonDetail(res.courseId, res.lessonId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.enrollmentsPrefix });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.dashboard });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not reset lesson',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}
