import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '../errors';
import { queryKeys } from '../queryKeys';
import { learningService } from '../services';
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
      void queryClient.invalidateQueries({ queryKey: ['me', 'enrollments'] });
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
