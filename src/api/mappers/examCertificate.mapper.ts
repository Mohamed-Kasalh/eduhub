import type {
  CertificateDto,
  CertificateGradeDto,
  CertificateRecord,
  ExamAttemptQuestionDto,
  ExamAttemptRecord,
  ExamAttemptResultDto,
  ExamAttemptSummaryDto,
  ExamReviewQuestionDto,
  QuestionDifficultyDto,
  QuestionTypeDto,
} from '../dto-types-bridge';
import { formatDate, formatDuration } from '../../lib/format';

export const DIFFICULTY_LABELS: Record<QuestionDifficultyDto, 'Easy' | 'Medium' | 'Hard'> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const LABEL_TO_DIFFICULTY: Record<string, QuestionDifficultyDto> = {
  Easy: 'easy',
  Medium: 'medium',
  Hard: 'hard',
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
};

/** Converts UI difficulty label to API `QuestionDifficultyDto`. */
export function toQuestionDifficultyDto(label: string): QuestionDifficultyDto | undefined {
  return LABEL_TO_DIFFICULTY[label];
}

const CERTIFICATE_GRADE_LABELS: Record<CertificateGradeDto, 'Distinction' | 'Merit' | 'Pass'> = {
  distinction: 'Distinction',
  merit: 'Merit',
  pass: 'Pass',
};

/**
 * Student-facing active exam question view model.
 * Deliberately excludes `correctIndices` and `explanation` so answer keys
 * cannot leak into active exam state.
 */
export interface StudentExamQuestionView {
  id: string;
  number: number;
  type: QuestionTypeDto;
  sectionId: string;
  sectionName: string;
  question: string;
  options: string[];
  points: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  imageUrl?: string;
  imageCaption?: string;
}

/** Graded review question view model returned only after exam submission. */
export interface StudentExamReviewQuestionView extends StudentExamQuestionView {
  selectedIndices: number[];
  correctIndices: number[];
  outcome: 'correct' | 'wrong' | 'skipped';
  pointsAwarded: number;
  explanation: string;
}

export interface StudentCertificateView extends CertificateRecord {
  academicDirectorName: string;
  issuedAtIso: string;
}

/** Formats raw elapsed exam duration in minutes and seconds (e.g. `"21m 14s"`). */
export function formatExamDurationTaken(rawSeconds: number): string {
  const safe = Number.isFinite(rawSeconds) && rawSeconds > 0 ? Math.floor(rawSeconds) : 0;
  if (safe < 60) {
    return formatDuration(safe, 'human');
  }
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

/** Maps a stripped active-attempt question DTO to the exam player view model. */
export function mapExamAttemptQuestionDtoToView(
  dto: ExamAttemptQuestionDto
): StudentExamQuestionView {
  return {
    id: dto.id,
    number: dto.number,
    type: dto.type,
    sectionId: dto.sectionId,
    sectionName: dto.sectionName,
    question: dto.prompt,
    options: dto.options,
    points: dto.points,
    difficulty: DIFFICULTY_LABELS[dto.difficulty],
    imageUrl: dto.imageUrl ?? undefined,
    imageCaption: dto.imageCaption ?? undefined,
  };
}

/** Maps a submitted attempt summary DTO to the table view model. */
export function mapExamAttemptSummaryDtoToRecord(dto: ExamAttemptSummaryDto): ExamAttemptRecord {
  return {
    id: dto.id,
    attemptNumber: dto.attemptNumber,
    courseId: dto.courseId,
    date: formatDate(dto.submittedAt ?? dto.startedAt, { preset: 'short' }),
    scorePercent: dto.scorePercent,
    correctCount: dto.correctCount,
    wrongCount: dto.wrongCount,
    skippedCount: dto.skippedCount,
    timeTaken: formatExamDurationTaken(dto.durationTakenSeconds),
    passed: dto.passed,
  };
}

/** Maps a graded review question DTO into the exam result breakdown view model. */
export function mapExamReviewQuestionDtoToView(
  dto: ExamReviewQuestionDto
): StudentExamReviewQuestionView {
  return {
    ...mapExamAttemptQuestionDtoToView(dto),
    selectedIndices: dto.selectedIndices,
    correctIndices: dto.correctIndices,
    outcome: dto.outcome,
    pointsAwarded: dto.pointsAwarded,
    explanation: dto.explanation,
  };
}

/** Maps full graded exam result payload including section breakdowns and review questions. */
export function mapExamAttemptResultDtoToView(dto: ExamAttemptResultDto) {
  return {
    summary: mapExamAttemptSummaryDtoToRecord(dto),
    passingScorePercent: dto.passingScorePercent,
    attemptsUsed: dto.attemptsUsed,
    attemptsRemaining: dto.attemptsRemaining,
    certificateEligible: dto.certificateEligible,
    sectionBreakdowns: dto.sectionBreakdown.map((sec) => ({
      id: sec.sectionId,
      name: sec.sectionName,
      correct: sec.correctCount,
      total: sec.totalCount,
      percent: sec.scorePercent,
    })),
    reviewItems: dto.reviewQuestions.map(mapExamReviewQuestionDtoToView),
  };
}

/** Maps a canonical CertificateDto into the frontend CertificateRecord view model. */
export function mapCertificateDtoToRecord(dto: CertificateDto): StudentCertificateView {
  return {
    id: dto.id,
    verificationCode: dto.verificationCode,
    studentId: dto.student.id,
    studentName: dto.student.name,
    courseId: dto.course.id,
    courseTitle: dto.course.title,
    instructorName: dto.instructorName,
    academicDirectorName: dto.academicDirectorName,
    issuedAt: formatDate(dto.issuedAt, { preset: 'long' }),
    issuedAtIso: dto.issuedAt,
    grade: CERTIFICATE_GRADE_LABELS[dto.grade],
    scorePercent: dto.scorePercent,
    status: dto.status === 'revoked' ? 'Revoked' : 'Valid',
  };
}
