import {
  AutosaveExamAnswersResponseSchema,
  ExamAttemptResultSchema,
  ExamAttemptStartSchema,
  ExamAttemptsListResponseSchema,
  ExamOverviewSchema,
  type AutosaveExamAnswersRequestDto,
  type AutosaveExamAnswersResponseDto,
  type ExamAttemptResultDto,
  type ExamAttemptStartDto,
  type ExamAttemptsListResponseDto,
  type ExamOverviewDto,
} from '../dto';
import { http } from '../http';

/** Student exam eligibility, timed attempt execution, autosave, and review endpoints. */
export const examsService = {
  /** Retrieves exam configuration and current student eligibility/attempts summary. */
  async getCourseExam(courseId: string): Promise<ExamOverviewDto> {
    return http.get(`/courses/${encodeURIComponent(courseId)}/exam`, ExamOverviewSchema);
  },

  /** Starts a new exam attempt (server selects questions and strips correct answers). */
  async startExamAttempt(courseId: string): Promise<ExamAttemptStartDto> {
    return http.post(
      `/courses/${encodeURIComponent(courseId)}/exam/attempts`,
      ExamAttemptStartSchema
    );
  },

  /** Autosaves selected answers and flagged question IDs during an active attempt. */
  async autosaveExamAnswers(
    attemptId: string,
    payload: AutosaveExamAnswersRequestDto
  ): Promise<AutosaveExamAnswersResponseDto> {
    return http.put(
      `/exam-attempts/${encodeURIComponent(attemptId)}/answers`,
      AutosaveExamAnswersResponseSchema,
      payload
    );
  },

  /** Submits an exam attempt for server grading and returns detailed review results. */
  async submitExamAttempt(attemptId: string): Promise<ExamAttemptResultDto> {
    return http.post(
      `/exam-attempts/${encodeURIComponent(attemptId)}/submit`,
      ExamAttemptResultSchema
    );
  },

  /** Retrieves the graded result and question-by-question review for a submitted attempt. */
  async getExamAttemptResult(attemptId: string): Promise<ExamAttemptResultDto> {
    return http.get(`/exam-attempts/${encodeURIComponent(attemptId)}`, ExamAttemptResultSchema);
  },

  /** Lists all submitted attempts for the current student on a course. */
  async getCourseExamAttempts(courseId: string): Promise<ExamAttemptsListResponseDto> {
    return http.get(
      `/courses/${encodeURIComponent(courseId)}/exam/attempts`,
      ExamAttemptsListResponseSchema
    );
  },
};
