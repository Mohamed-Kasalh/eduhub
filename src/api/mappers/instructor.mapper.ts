import {
  formatDate,
  formatDuration,
  formatRelativeTime,
} from '../../lib/format';
import type {
  CommentDto,
  CourseDto,
  EnrolledStudentProgressDetailDto,
  EnrolledStudentRecord,
  EnrolledStudentSummaryDto,
  EnrollmentChartPoint,
  InstructorCommentThread,
  InstructorCourseRecord,
  InstructorEnrollmentChartPointDto,
  InstructorQuestionItem,
  LessonProgressItemDto,
  QuestionDto,
  QuestionTypeDto,
} from '../dto-types-bridge';
import { mapCourseDtoToCourse } from './course.mapper';
import {
  DIFFICULTY_LABELS,
  mapExamAttemptSummaryDtoToRecord,
} from './examCertificate.mapper';

export interface EnrolledStudentDetailView extends EnrolledStudentRecord {
  maxAttemptsAllowed: number;
}

export interface MappedInstructorCommentThread extends InstructorCommentThread {
  replies: Array<
    InstructorCommentThread['replies'][number] & {
      isInstructor: boolean;
    }
  >;
}

const LESSON_STATUS_LABELS: Record<
  LessonProgressItemDto['status'],
  'Completed' | 'In progress' | 'Not started'
> = {
  completed: 'Completed',
  in_progress: 'In progress',
  not_started: 'Not started',
  locked: 'Not started',
};

const LABEL_TO_QUESTION_TYPE: Record<string, QuestionTypeDto> = {
  single: 'single',
  multiple: 'multiple',
  boolean: 'boolean',
};

/** Converts UI question type value to API `QuestionTypeDto`. */
export function toQuestionTypeDto(type: string): QuestionTypeDto | undefined {
  return LABEL_TO_QUESTION_TYPE[type];
}

/** Formats an ISO date (`YYYY-MM-DD`) into compact `"Mar 01"` chart tooltip labels. */
function formatChartDateLabel(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(parsed);
}

/** Maps a backend enrollment time-series DTO point into chart view data. */
export function mapEnrollmentChartPointDtoToView(
  dto: InstructorEnrollmentChartPointDto,
  index: number
): EnrollmentChartPoint {
  return {
    dayLabel: `Day ${index + 1}`,
    dateFull: formatChartDateLabel(dto.date),
    enrollments: dto.enrollments,
    completions: dto.completions,
  };
}

/** Maps an instructor `CourseDto` into `InstructorCourseRecord`. */
export function mapInstructorCourseDtoToRecord(
  dto: CourseDto
): InstructorCourseRecord {
  return {
    ...mapCourseDtoToCourse(dto),
    completionRate: dto.completionRatePercent ?? 0,
    rejectionReason: dto.rejectionReason ?? undefined,
    submittedAt: dto.submittedAt
      ? formatDate(dto.submittedAt, { preset: 'short' })
      : undefined,
  };
}

/** Maps a paginated enrolled student summary row to the table record shape. */
export function mapEnrolledStudentDtoToRecord(
  dto: EnrolledStudentSummaryDto
): EnrolledStudentRecord {
  return {
    id: dto.student.id,
    name: dto.student.name,
    email: dto.student.email,
    avatar: dto.student.avatarUrl ?? '',
    courseId: dto.course.id,
    courseTitle: dto.course.title,
    progressPercent: dto.progressPercent,
    completedLessons: dto.completedLessons,
    totalLessons: dto.totalLessons,
    lastActive: formatRelativeTime(dto.lastActiveAt),
    examScore: dto.bestExamScorePercent,
    examPassed: dto.examPassed,
    certificateIssued: dto.certificateIssued,
    certificateId: dto.certificateId ?? undefined,
    lessonBreakdown: [],
    examAttempts: [],
  };
}

/** Maps full student progress detail DTO for the instructor inspection drawer. */
export function mapStudentProgressDetailDtoToRecord(
  dto: EnrolledStudentProgressDetailDto
): EnrolledStudentDetailView {
  return {
    ...mapEnrolledStudentDtoToRecord(dto),
    maxAttemptsAllowed: dto.maxAttemptsAllowed,
    lessonBreakdown: dto.lessonBreakdown.map((item) => ({
      id: item.lessonId,
      title: item.title,
      duration: formatDuration(item.durationSeconds, 'clock'),
      watchedPercent: item.watchPercent,
      status: LESSON_STATUS_LABELS[item.status],
    })),
    examAttempts: dto.examAttempts.map((attempt) => {
      const mapped = mapExamAttemptSummaryDtoToRecord(attempt);
      return {
        attemptNumber: mapped.attemptNumber,
        date: mapped.date,
        scorePercent: mapped.scorePercent,
        timeTaken: mapped.timeTaken,
        passed: mapped.passed,
      };
    }),
  };
}

/** Maps canonical `CommentDto` into an instructor Q&A inbox thread view model. */
export function mapCommentDtoToInstructorThread(
  dto: CommentDto
): MappedInstructorCommentThread {
  return {
    id: dto.id,
    courseId: dto.course.id,
    courseTitle: dto.course.title,
    lessonId: dto.lesson.id,
    lessonTitle: dto.lesson.title,
    studentName: dto.author.name,
    studentAvatar: dto.author.avatarUrl ?? '',
    createdAt: formatRelativeTime(dto.createdAt),
    content: dto.content,
    likesCount: dto.likesCount,
    likedByInstructor: dto.likedByMe,
    resolved: dto.resolved,
    replies: dto.replies.map((reply) => ({
      id: reply.id,
      authorName: reply.author.name,
      authorAvatar: reply.author.avatarUrl ?? '',
      createdAt: formatRelativeTime(reply.createdAt),
      content: reply.content,
      isInstructor: reply.isInstructor,
    })),
  };
}

/** Maps canonical `QuestionDto` into the instructor question bank row model. */
export function mapQuestionDtoToInstructorItem(
  dto: QuestionDto
): InstructorQuestionItem {
  return {
    id: dto.id,
    courseId: dto.courseId,
    courseTitle: dto.courseTitle,
    sectionId: dto.sectionId,
    sectionName: dto.sectionName,
    type: dto.type,
    question: dto.prompt,
    options: dto.options,
    correctIndices: dto.correctIndices,
    difficulty: DIFFICULTY_LABELS[dto.difficulty],
    points: dto.points,
    timesUsed: dto.timesUsed,
    explanation: dto.explanation,
    imageUrl: dto.imageUrl ?? undefined,
  };
}
