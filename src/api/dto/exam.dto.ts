import { z } from 'zod';
import {
  ExamAttemptStatusSchema,
  ExamReviewOutcomeSchema,
  IdSchema,
  IsoDateTimeSchema,
  QuestionDifficultySchema,
  QuestionTypeSchema,
  createPaginatedSchema,
} from './common.dto';

/**
 * Unified canonical Question DTO normalizing ExamQuestion, BankExamQuestion,
 * and InstructorQuestionItem for authoring and review.
 */
export const QuestionSchema = z.object({
  id: IdSchema,
  courseId: IdSchema,
  courseTitle: z.string().min(1),
  sectionId: IdSchema,
  sectionName: z.string().min(1),
  type: QuestionTypeSchema,
  prompt: z.string().trim().min(8),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctIndices: z.array(z.number().int().nonnegative()).min(1),
  difficulty: QuestionDifficultySchema,
  points: z.number().int().min(1).max(25),
  timesUsed: z.number().int().nonnegative(),
  explanation: z.string(),
  imageUrl: z.string().nullable().optional(),
  imageCaption: z.string().nullable().optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type QuestionDto = z.infer<typeof QuestionSchema>;

/**
 * Student-facing question served during an active exam attempt.
 * Security invariant: strictly excludes correctIndices and explanation.
 */
export const ExamAttemptQuestionSchema = z.object({
  id: IdSchema,
  number: z.number().int().min(1),
  type: QuestionTypeSchema,
  sectionId: IdSchema,
  sectionName: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  points: z.number().int().min(1),
  difficulty: QuestionDifficultySchema,
  imageUrl: z.string().nullable().optional(),
  imageCaption: z.string().nullable().optional(),
});
export type ExamAttemptQuestionDto = z.infer<typeof ExamAttemptQuestionSchema>;

export const ExamDifficultyMixSchema = z
  .object({
    easyPercent: z.number().int().min(0).max(100),
    mediumPercent: z.number().int().min(0).max(100),
    hardPercent: z.number().int().min(0).max(100),
  })
  .refine(
    (mix) => mix.easyPercent + mix.mediumPercent + mix.hardPercent === 100,
    'Difficulty mix percentages must sum to 100.'
  );
export type ExamDifficultyMixDto = z.infer<typeof ExamDifficultyMixSchema>;

export const ExamConfigSchema = z.object({
  id: IdSchema,
  courseId: IdSchema,
  courseTitle: z.string().min(1),
  title: z.string().min(1),
  durationSeconds: z.number().int().min(600).max(10800),
  passingScorePercent: z.number().int().min(50).max(100),
  totalQuestions: z.number().int().min(5).max(50),
  attemptsAllowed: z.number().int().min(1).max(10),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  difficultyMix: ExamDifficultyMixSchema,
  coveredSectionIds: z.array(IdSchema).min(1),
});
export type ExamConfigDto = z.infer<typeof ExamConfigSchema>;

export const ExamOverviewSchema = z.object({
  config: ExamConfigSchema,
  eligibility: z.object({
    eligible: z.boolean(),
    lessonsCompleted: z.number().int().nonnegative(),
    totalLessons: z.number().int().nonnegative(),
    courseProgressPercent: z.number().min(0).max(100),
    attemptsUsed: z.number().int().nonnegative(),
    attemptsRemaining: z.number().int().nonnegative(),
    bestScorePercent: z.number().min(0).max(100).nullable(),
    passed: z.boolean(),
    reason: z.string().nullable(),
  }),
});
export type ExamOverviewDto = z.infer<typeof ExamOverviewSchema>;

export const ExamAttemptStartSchema = z.object({
  attemptId: IdSchema,
  attemptNumber: z.number().int().min(1),
  courseId: IdSchema,
  status: z.literal('in_progress'),
  startedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  durationSeconds: z.number().int().positive(),
  remainingSeconds: z.number().int().nonnegative(),
  passingScorePercent: z.number().int().min(50).max(100),
  questions: z.array(ExamAttemptQuestionSchema),
  answers: z.record(z.string(), z.array(z.number().int().nonnegative())),
  flaggedQuestionIds: z.array(IdSchema),
});
export type ExamAttemptStartDto = z.infer<typeof ExamAttemptStartSchema>;

export const AutosaveExamAnswersRequestSchema = z.object({
  answers: z.record(z.string(), z.array(z.number().int().nonnegative())),
  flaggedQuestionIds: z.array(IdSchema),
});
export type AutosaveExamAnswersRequestDto = z.infer<
  typeof AutosaveExamAnswersRequestSchema
>;

export const AutosaveExamAnswersResponseSchema = z.object({
  attemptId: IdSchema,
  savedAt: IsoDateTimeSchema,
  remainingSeconds: z.number().int().nonnegative(),
  status: ExamAttemptStatusSchema,
});
export type AutosaveExamAnswersResponseDto = z.infer<
  typeof AutosaveExamAnswersResponseSchema
>;

export const ExamReviewQuestionSchema = ExamAttemptQuestionSchema.extend({
  selectedIndices: z.array(z.number().int().nonnegative()),
  correctIndices: z.array(z.number().int().nonnegative()),
  outcome: ExamReviewOutcomeSchema,
  pointsAwarded: z.number().nonnegative(),
  explanation: z.string(),
});
export type ExamReviewQuestionDto = z.infer<typeof ExamReviewQuestionSchema>;

export const ExamSectionBreakdownSchema = z.object({
  sectionId: IdSchema,
  sectionName: z.string().min(1),
  correctCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  scorePercent: z.number().min(0).max(100),
});
export type ExamSectionBreakdownDto = z.infer<typeof ExamSectionBreakdownSchema>;

export const ExamAttemptSummarySchema = z.object({
  id: IdSchema,
  attemptNumber: z.number().int().min(1),
  courseId: IdSchema,
  status: ExamAttemptStatusSchema,
  startedAt: IsoDateTimeSchema,
  submittedAt: IsoDateTimeSchema.nullable(),
  durationTakenSeconds: z.number().int().nonnegative(),
  scorePercent: z.number().min(0).max(100),
  correctCount: z.number().int().nonnegative(),
  wrongCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  passed: z.boolean(),
});
export type ExamAttemptSummaryDto = z.infer<typeof ExamAttemptSummarySchema>;

export const ExamAttemptResultSchema = ExamAttemptSummarySchema.extend({
  passingScorePercent: z.number().int().min(50).max(100),
  attemptsUsed: z.number().int().min(1),
  attemptsRemaining: z.number().int().nonnegative(),
  sectionBreakdown: z.array(ExamSectionBreakdownSchema),
  reviewQuestions: z.array(ExamReviewQuestionSchema),
  certificateEligible: z.boolean(),
});
export type ExamAttemptResultDto = z.infer<typeof ExamAttemptResultSchema>;

export const ExamAttemptsListResponseSchema = z.object({
  data: z.array(ExamAttemptSummarySchema),
});
export type ExamAttemptsListResponseDto = z.infer<
  typeof ExamAttemptsListResponseSchema
>;

/* -------------------------------------------------------------------------- */
/*  Instructor Question Bank & Exam Settings Requests                         */
/* -------------------------------------------------------------------------- */

export const CreateQuestionRequestSchema = z
  .object({
    sectionId: IdSchema,
    type: QuestionTypeSchema,
    prompt: z
      .string()
      .trim()
      .min(8, 'Question prompt must be at least 8 characters long.'),
    options: z
      .array(z.string().trim().min(1, 'Options cannot be empty.'))
      .min(2, 'At least 2 options are required.')
      .max(6, 'Maximum 6 options allowed.'),
    correctIndices: z
      .array(z.number().int().nonnegative())
      .min(1, 'Select at least one correct answer.'),
    difficulty: QuestionDifficultySchema,
    points: z.number().int().min(1).max(25),
    explanation: z.string().trim().default('Verified instructor explanation.'),
    imageUrl: z.string().nullable().optional(),
    imageCaption: z.string().nullable().optional(),
  })
  .superRefine((val, ctx) => {
    const outOfRange = val.correctIndices.some((idx) => idx >= val.options.length);
    if (outOfRange) {
      ctx.addIssue({
        code: 'custom',
        path: ['correctIndices'],
        message: 'Correct answer index must reference an existing option.',
      });
    }
    if ((val.type === 'single' || val.type === 'boolean') && val.correctIndices.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['correctIndices'],
        message: 'Single choice and True/False questions must have exactly one correct answer.',
      });
    }
    if (val.type === 'boolean' && val.options.length !== 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'True/False questions must have exactly 2 options.',
      });
    }
  });
export type CreateQuestionRequestDto = z.infer<typeof CreateQuestionRequestSchema>;

export const UpdateQuestionRequestSchema = CreateQuestionRequestSchema.partial();
export type UpdateQuestionRequestDto = z.infer<typeof UpdateQuestionRequestSchema>;

export const BulkDeleteQuestionsRequestSchema = z.object({
  ids: z.array(IdSchema).min(1, 'Select at least one question to delete.'),
});
export type BulkDeleteQuestionsRequestDto = z.infer<
  typeof BulkDeleteQuestionsRequestSchema
>;

export const BulkDeleteQuestionsResponseSchema = z.object({
  deletedCount: z.number().int().nonnegative(),
  deletedIds: z.array(IdSchema),
});
export type BulkDeleteQuestionsResponseDto = z.infer<
  typeof BulkDeleteQuestionsResponseSchema
>;

export const CsvImportErrorSchema = z.object({
  row: z.number().int().min(1),
  message: z.string().min(1),
});
export type CsvImportErrorDto = z.infer<typeof CsvImportErrorSchema>;

export const CsvImportResultSchema = z.object({
  importedCount: z.number().int().nonnegative(),
  importedQuestions: z.array(QuestionSchema),
  errors: z.array(CsvImportErrorSchema),
});
export type CsvImportResultDto = z.infer<typeof CsvImportResultSchema>;

export const UpdateExamSettingsRequestSchema = z.object({
  title: z.string().trim().min(3).optional(),
  durationSeconds: z.number().int().min(600).max(10800),
  passingScorePercent: z.number().int().min(50).max(100),
  totalQuestions: z.number().int().min(5).max(50),
  attemptsAllowed: z.number().int().min(1).max(10),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  difficultyMix: ExamDifficultyMixSchema,
  coveredSectionIds: z.array(IdSchema).min(1, 'Select at least one section.'),
});
export type UpdateExamSettingsRequestDto = z.infer<
  typeof UpdateExamSettingsRequestSchema
>;

export const ExamPreviewResponseSchema = z.object({
  sampleQuestions: z.array(QuestionSchema),
  shortfallWarning: z
    .object({
      needed: z.number().int().nonnegative(),
      available: z.number().int().nonnegative(),
    })
    .nullable(),
});
export type ExamPreviewResponseDto = z.infer<typeof ExamPreviewResponseSchema>;

export const PaginatedQuestionsResponseSchema = createPaginatedSchema(QuestionSchema);
export type PaginatedQuestionsResponseDto = z.infer<
  typeof PaginatedQuestionsResponseSchema
>;
