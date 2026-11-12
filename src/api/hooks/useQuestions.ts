import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { emitToast } from '../../lib/toastBus';
import type {
  ActionResultDto,
  BulkDeleteQuestionsResponseDto,
  CreateQuestionRequestDto,
  CsvImportResultDto,
  ExamConfigDto,
  ExamPreviewResponseDto,
  PaginatedQuestionsResponseDto,
  QuestionDto,
  UpdateExamSettingsRequestDto,
  UpdateQuestionRequestDto,
} from '../dto-types-bridge';
import { getErrorMessage } from '../errors';
import type { UploadProgressEvent } from '../http';
import { mapQuestionDtoToInstructorItem } from '../mappers/instructor.mapper';
import { queryKeys } from '../queryKeys';
import {
  questionsService,
  type CourseQuestionsQueryParams,
} from '../services/questions.service';

function invalidateQuestionBank(
  queryClient: QueryClient,
  courseId?: string
): void {
  void queryClient.invalidateQueries({ queryKey: ['instructor', 'questions'] });
  if (courseId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.instructor.examSettings(courseId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.instructor.courseDetail(courseId),
    });
  }
}

/** Loads filtered, paginated questions for a specific instructor course. */
export function useCourseQuestions(
  courseId: string,
  params: CourseQuestionsQueryParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.instructor.questions(courseId, params),
    queryFn: () => questionsService.getCourseQuestions(courseId, params),
    enabled: Boolean(courseId) && courseId !== 'all' && enabled,
    placeholderData: keepPreviousData,
    select: (res: PaginatedQuestionsResponseDto) => ({
      items: res.data.map(mapQuestionDtoToInstructorItem),
      raw: res.data,
      meta: res.meta,
    }),
  });
}

/**
 * Aggregates question bank results across multiple instructor courses when
 * the UI filter is set to `"All courses"`.
 */
export function useMultiCourseQuestions(
  courseIds: string[],
  params: CourseQuestionsQueryParams = {},
  enabled = true
) {
  const results = useQueries({
    queries: courseIds.map((courseId) => ({
      queryKey: queryKeys.instructor.questions(courseId, { ...params, page: 1, limit: 100 }),
      queryFn: () =>
        questionsService.getCourseQuestions(courseId, {
          ...params,
          page: 1,
          limit: 100,
        }),
      enabled: enabled && courseIds.length > 0,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const isFetching = results.some((r) => r.isFetching);
  const firstError = results.find((r) => r.isError)?.error ?? null;
  const isError = Boolean(firstError) && results.every((r) => r.isError || !r.data);

  const items = results.flatMap((r) =>
    (r.data?.data ?? []).map(mapQuestionDtoToInstructorItem)
  );
  const total = results.reduce(
    (sum, r) => sum + (r.data?.meta.total ?? 0),
    0
  );

  const refetchAll = async () => {
    await Promise.all(results.map((r) => r.refetch()));
  };

  return {
    items,
    total,
    isLoading,
    isFetching,
    isError,
    error: firstError,
    refetchAll,
  };
}

/** Creates a new question in the target course's bank. */
export function useCreateQuestionMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    QuestionDto,
    unknown,
    { courseId: string; payload: CreateQuestionRequestDto }
  >({
    mutationFn: ({ courseId, payload }) =>
      questionsService.createQuestion(courseId, payload),
    onSuccess: (created) => {
      invalidateQuestionBank(queryClient, created.courseId);
      emitToast({
        title: 'Question added',
        message: `Added to "${created.sectionName}".`,
        variant: 'success',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not create question',
        message: getErrorMessage(error, 'Review the question form and retry.'),
        variant: 'danger',
      });
    },
  });
}

/** Updates an existing question bank item. */
export function useUpdateQuestionMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    QuestionDto,
    unknown,
    { questionId: string; courseId?: string; payload: UpdateQuestionRequestDto }
  >({
    mutationFn: ({ questionId, payload }) =>
      questionsService.updateQuestion(questionId, payload),
    onSuccess: (updated, variables) => {
      invalidateQuestionBank(queryClient, updated.courseId ?? variables.courseId);
      emitToast({
        title: 'Question updated',
        message: 'Changes saved to your question bank.',
        variant: 'success',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not update question',
        message: getErrorMessage(error, 'Review your edits and retry.'),
        variant: 'danger',
      });
    },
  });
}

/** Deletes a single question from the bank. */
export function useDeleteQuestionMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ActionResultDto,
    unknown,
    { questionId: string; courseId?: string }
  >({
    mutationFn: ({ questionId }) => questionsService.deleteQuestion(questionId),
    onSuccess: (_res, variables) => {
      invalidateQuestionBank(queryClient, variables.courseId);
      emitToast({
        title: 'Question deleted',
        message: 'Removed from your question bank.',
        variant: 'success',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not delete question',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}

/** Deletes multiple selected questions from the bank. */
export function useBulkDeleteQuestionsMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    BulkDeleteQuestionsResponseDto,
    unknown,
    { ids: string[]; courseId?: string }
  >({
    mutationFn: ({ ids }) => questionsService.bulkDeleteQuestions({ ids }),
    onSuccess: (res, variables) => {
      invalidateQuestionBank(queryClient, variables.courseId);
      emitToast({
        title: 'Questions removed',
        message: `${res.deletedCount} questions deleted from the bank.`,
        variant: 'info',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not delete selected questions',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}

/** Imports CSV rows (`File` upload or inline CSV text) into a course question bank. */
export function useImportQuestionsCsvMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CsvImportResultDto,
    unknown,
    {
      courseId: string;
      input: File | { csvText: string };
      signal?: AbortSignal;
      onProgress?: (event: UploadProgressEvent) => void;
    }
  >({
    mutationFn: ({ courseId, input, signal, onProgress }) =>
      questionsService.importQuestionsCsv(courseId, input, { signal, onProgress }),
    onSuccess: (result, variables) => {
      invalidateQuestionBank(queryClient, variables.courseId);
      if (result.importedCount > 0) {
        emitToast({
          title: `Imported ${result.importedCount} question${result.importedCount === 1 ? '' : 's'}`,
          message:
            result.errors.length > 0
              ? `${result.errors.length} row(s) had formatting issues.`
              : 'All parsed rows were added to your question bank.',
          variant: result.errors.length > 0 ? 'warning' : 'success',
        });
      }
    },
    onError: (error) => {
      emitToast({
        title: 'CSV import failed',
        message: getErrorMessage(error, 'Check the CSV columns and retry.'),
        variant: 'danger',
      });
    },
  });
}

/** Loads exam rule settings for an authored course. */
export function useExamSettings(courseId: string, enabled = true) {
  return useQuery<ExamConfigDto>({
    queryKey: queryKeys.instructor.examSettings(courseId),
    queryFn: () => questionsService.getExamSettings(courseId),
    enabled: Boolean(courseId) && enabled,
  });
}

/** Saves instructor exam blueprint settings (`PUT /instructor/courses/:id/exam-settings`). */
export function useUpdateExamSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ExamConfigDto,
    unknown,
    {
      courseId: string;
      payload: UpdateExamSettingsRequestDto;
      silent?: boolean;
    }
  >({
    mutationFn: ({ courseId, payload }) =>
      questionsService.updateExamSettings(courseId, payload),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData<ExamConfigDto>(
        queryKeys.instructor.examSettings(updated.courseId),
        updated
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.instructor.courseDetail(updated.courseId),
      });
      void queryClient.invalidateQueries({
        queryKey: ['exams', updated.courseId],
      });
      if (!variables.silent) {
        emitToast({
          title: 'Exam settings saved',
          message: `Passing threshold set to ${updated.passingScorePercent}% (${updated.totalQuestions} questions).`,
          variant: 'success',
        });
      }
    },
    onError: (error, variables) => {
      if (!variables.silent) {
        emitToast({
          title: 'Could not save exam settings',
          message: getErrorMessage(error, 'Check percentages and sections.'),
          variant: 'danger',
        });
      }
    },
  });
}

/** Draws a simulated exam sample & detects bank shortfalls (`POST .../preview`). */
export function usePreviewExamSettingsMutation() {
  return useMutation<
    ExamPreviewResponseDto,
    unknown,
    { courseId: string; payload?: Partial<UpdateExamSettingsRequestDto> }
  >({
    mutationFn: ({ courseId, payload }) =>
      questionsService.previewExamSettings(courseId, payload),
    onError: (error) => {
      emitToast({
        title: 'Could not generate preview draw',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}
