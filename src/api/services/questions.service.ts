import {
  ActionResultSchema,
  BulkDeleteQuestionsResponseSchema,
  CsvImportResultSchema,
  ExamConfigSchema,
  ExamPreviewResponseSchema,
  PaginatedQuestionsResponseSchema,
  QuestionSchema,
  type ActionResultDto,
  type BulkDeleteQuestionsRequestDto,
  type BulkDeleteQuestionsResponseDto,
  type CreateQuestionRequestDto,
  type CsvImportResultDto,
  type ExamConfigDto,
  type ExamPreviewResponseDto,
  type PaginatedQuestionsResponseDto,
  type QuestionDifficultyDto,
  type QuestionDto,
  type QuestionTypeDto,
  type UpdateExamSettingsRequestDto,
  type UpdateQuestionRequestDto,
} from '../dto';
import { http, upload, type UploadProgressEvent } from '../http';

export type CourseQuestionsQueryParams = {
  sectionId?: string;
  difficulty?: QuestionDifficultyDto;
  type?: QuestionTypeDto;
  q?: string;
  page?: number;
  limit?: number;
};

/** Instructor question-bank authoring, CSV import, and exam settings configuration endpoints. */
export const questionsService = {
  /** Lists and filters questions in a course's question bank. */
  async getCourseQuestions(
    courseId: string,
    params?: CourseQuestionsQueryParams
  ): Promise<PaginatedQuestionsResponseDto> {
    return http.get(
      `/instructor/courses/${encodeURIComponent(courseId)}/questions`,
      PaginatedQuestionsResponseSchema,
      { query: params ? { ...params } : undefined }
    );
  },

  /** Creates a new question in the specified course's bank. */
  async createQuestion(
    courseId: string,
    payload: CreateQuestionRequestDto
  ): Promise<QuestionDto> {
    return http.post(
      `/instructor/courses/${encodeURIComponent(courseId)}/questions`,
      QuestionSchema,
      payload
    );
  },

  /** Updates an existing question by ID. */
  async updateQuestion(
    questionId: string,
    payload: UpdateQuestionRequestDto
  ): Promise<QuestionDto> {
    return http.patch(
      `/instructor/questions/${encodeURIComponent(questionId)}`,
      QuestionSchema,
      payload
    );
  },

  /** Deletes a single question from the bank. */
  async deleteQuestion(questionId: string): Promise<ActionResultDto> {
    return http.delete(
      `/instructor/questions/${encodeURIComponent(questionId)}`,
      ActionResultSchema
    );
  },

  /** Deletes multiple questions in one batch. */
  async bulkDeleteQuestions(
    payload: BulkDeleteQuestionsRequestDto
  ): Promise<BulkDeleteQuestionsResponseDto> {
    return http.post(
      '/instructor/questions/bulk-delete',
      BulkDeleteQuestionsResponseSchema,
      payload
    );
  },

  /** Imports questions into a course bank from either a CSV File upload or raw CSV text. */
  async importQuestionsCsv(
    courseId: string,
    input: File | { csvText: string },
    options?: {
      signal?: AbortSignal;
      onProgress?: (progress: UploadProgressEvent) => void;
    }
  ): Promise<CsvImportResultDto> {
    const path = `/instructor/courses/${encodeURIComponent(courseId)}/questions/import`;
    if (input instanceof File) {
      const formData = new FormData();
      formData.append('file', input, input.name);
      return upload(path, formData, {
        schema: CsvImportResultSchema,
        signal: options?.signal,
        onProgress: options?.onProgress,
      });
    }

    return http.post(path, CsvImportResultSchema, input);
  },

  /** Fetches the course's final exam settings and difficulty distribution. */
  async getExamSettings(courseId: string): Promise<ExamConfigDto> {
    return http.get(
      `/instructor/courses/${encodeURIComponent(courseId)}/exam-settings`,
      ExamConfigSchema
    );
  },

  /** Updates the course's final exam settings and covered sections. */
  async updateExamSettings(
    courseId: string,
    payload: UpdateExamSettingsRequestDto
  ): Promise<ExamConfigDto> {
    return http.put(
      `/instructor/courses/${encodeURIComponent(courseId)}/exam-settings`,
      ExamConfigSchema,
      payload
    );
  },

  /** Previews a random exam draw against current bank supply and returns any shortfall warnings. */
  async previewExamSettings(
    courseId: string,
    payload?: Partial<UpdateExamSettingsRequestDto>
  ): Promise<ExamPreviewResponseDto> {
    return http.post(
      `/instructor/courses/${encodeURIComponent(courseId)}/exam-settings/preview`,
      ExamPreviewResponseSchema,
      payload ?? {}
    );
  },
};
