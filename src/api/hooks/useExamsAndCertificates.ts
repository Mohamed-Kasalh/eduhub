import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AutosaveExamAnswersRequestDto,
  CertificateDto,
  ExamAttemptResultDto,
  ExamAttemptStartDto,
} from '../dto-types-bridge';
import { getErrorMessage } from '../errors';
import { queryKeys } from '../queryKeys';
import { certificatesService } from '../services/certificates.service';
import { examsService } from '../services/exams.service';
import { emitToast } from '../../lib/toastBus';

/** Loads course exam configuration and current student eligibility/attempts summary. */
export function useCourseExamOverview(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.exams.config(courseId ?? ''),
    queryFn: () => examsService.getCourseExam(courseId!),
    enabled: Boolean(courseId),
  });
}

/** Lists all exam attempts recorded for the current student on a course. */
export function useCourseExamAttempts(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.exams.attempts(courseId ?? ''),
    queryFn: () => examsService.getCourseExamAttempts(courseId!),
    enabled: Boolean(courseId),
  });
}

/** Loads detailed graded exam results and question-by-question review for an attempt. */
export function useExamAttemptResult(attemptId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.exams.result(attemptId ?? ''),
    queryFn: () => examsService.getExamAttemptResult(attemptId!),
    enabled: Boolean(attemptId),
  });
}

/** Starts a new timed exam attempt for a course. */
export function useStartExamAttemptMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation<ExamAttemptStartDto, unknown, void>({
    mutationFn: () => examsService.startExamAttempt(courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.exams.config(courseId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.exams.attempts(courseId) });
    },
    onError: (err) => {
      emitToast({
        variant: 'danger',
        title: 'Unable to start exam',
        message: getErrorMessage(err),
      });
    },
  });
}

/** Autosaves active exam answers and flagged questions. */
export function useAutosaveExamAnswersMutation() {
  return useMutation({
    mutationFn: ({
      attemptId,
      payload,
    }: {
      attemptId: string;
      payload: AutosaveExamAnswersRequestDto;
    }) => examsService.autosaveExamAnswers(attemptId, payload),
  });
}

/** Submits a completed or expired exam attempt for server grading. */
export function useSubmitExamAttemptMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation<ExamAttemptResultDto, unknown, { attemptId: string }>({
    mutationFn: ({ attemptId }) => examsService.submitExamAttempt(attemptId),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.exams.result(result.id), result);
      void queryClient.invalidateQueries({ queryKey: queryKeys.exams.config(courseId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.exams.attempts(courseId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.enrollmentsPrefix });
      emitToast({
        variant: result.passed ? 'success' : 'warning',
        title: 'Exam submitted and graded!',
        message: `You scored ${result.scorePercent}% (${result.correctCount} of ${result.reviewQuestions.length} correct).`,
      });
    },
    onError: (err) => {
      emitToast({
        variant: 'danger',
        title: 'Exam submission failed',
        message: getErrorMessage(err),
      });
    },
  });
}

/** Lists all certificates earned by the authenticated student. */
export function useMyCertificates() {
  return useQuery({
    queryKey: queryKeys.certificates.all,
    queryFn: () => certificatesService.getMyCertificates(),
  });
}

/** Fetches a single certificate by ID or verification code. */
export function useCertificateDetail(certificateId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.certificates.detail(certificateId ?? ''),
    queryFn: () => certificatesService.getCertificate(certificateId!),
    enabled: Boolean(certificateId),
  });
}

/** Publicly verifies a certificate credential code. Does not retry 404 lookups. */
export function useVerifyCertificate(code: string) {
  const trimmed = code.trim();
  return useQuery({
    queryKey: queryKeys.certificates.verify(trimmed.toUpperCase()),
    queryFn: () => certificatesService.verifyCertificate(trimmed),
    enabled: trimmed.length > 0,
    retry: false,
  });
}

/** Generates/issues a verified certificate for a completed and passed course. */
export function useGenerateCertificateMutation() {
  const queryClient = useQueryClient();

  return useMutation<CertificateDto, unknown, { courseId: string }>({
    mutationFn: ({ courseId }) => certificatesService.generateCertificate(courseId),
    onSuccess: (cert, vars) => {
      queryClient.setQueryData(queryKeys.certificates.detail(cert.id), cert);
      void queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.enrollmentsPrefix });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.courseProgress(vars.courseId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      emitToast({
        variant: 'success',
        title: 'Certificate generated!',
        message: `Official credential ${cert.verificationCode} has been issued and verified.`,
      });
    },
    onError: (err) => {
      emitToast({
        variant: 'danger',
        title: 'Could not generate certificate',
        message: getErrorMessage(err),
      });
    },
  });
}

/** Downloads a PDF or PNG certificate binary file from the API. */
export function useDownloadCertificateFileMutation() {
  return useMutation({
    mutationFn: ({
      certificateId,
      format,
    }: {
      certificateId: string;
      format: 'pdf' | 'png';
    }) => certificatesService.downloadCertificateFile(certificateId, format),
    onError: (err) => {
      emitToast({
        variant: 'danger',
        title: 'Certificate download failed',
        message: getErrorMessage(err),
      });
    },
  });
}
