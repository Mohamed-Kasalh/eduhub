import type {
  AchievementBadge,
  AchievementBadgeDto,
  CommentDto,
  CommentReplyDto,
  CommentReportReasonDto,
  Course,
  CourseProgressDto,
  CurriculumLessonDto,
  CurriculumSectionDto,
  EnrollmentDto,
  ExamConfig,
  ExamConfigDto,
  LessonAttachmentDto,
  LessonDetailDto,
  LessonProgressItemDto,
  StudentDashboardDto,
  WeeklyActivityDay,
  WeeklyActivityPointDto,
} from '../dto-types-bridge';
import { formatBytes, formatDate, formatDuration, formatRelativeTime } from '../../lib/format';
import { COURSE_LEVEL_LABELS, mapCourseDtoToCourse } from './course.mapper';

export interface MappedEnrollmentCard {
  enrollmentId: string;
  course: Course;
  courseState: 'in-progress' | 'take-exam' | 'completed';
  lastAccessedLabel: string;
  lastLessonId: string;
  lastLessonTitle: string;
  watchedTimeLabel: string;
  totalTimeLabel: string;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  bestExamScorePercent: number | null;
  passingScorePercent: number;
  examPassed: boolean;
  certificateId: string | null;
}

export interface MappedProgressLesson extends LessonProgressItemDto {
  durationLabel: string;
}

export interface MappedProgressSection {
  id: string;
  title: string;
  lessons: MappedProgressLesson[];
  completedCount: number;
}

export interface MappedCourseProgress {
  courseId: string;
  courseTitle: string;
  instructorName: string;
  categoryName: string;
  completedLessons: number;
  inProgressLessons: number;
  notStartedLessons: number;
  totalLessons: number;
  overallPercent: number;
  watchedDurationSeconds: number;
  totalDurationSeconds: number;
  watchedTimeLabel: string;
  totalTimeLabel: string;
  lastLessonId: string;
  bestExamScorePercent: number | null;
  passingScorePercent: number;
  examPassed: boolean;
  certificateUnlocked: boolean;
  certificateId: string | null;
  sections: MappedProgressSection[];
  lessons: MappedProgressLesson[];
}

export interface MappedPlayerAttachment {
  id: string;
  title: string;
  typeLabel: string;
  sizeLabel: string;
  description: string;
  url: string;
}

export interface MappedPlayerLesson {
  id: string;
  sectionId: string;
  sectionTitle: string;
  number: number;
  title: string;
  type: CurriculumLessonDto['type'];
  durationSeconds: number;
  durationLabel: string;
  isPreview: boolean;
  requiresPrevious: boolean;
  videoUrl: string | null;
  summary: string;
  keyTakeaways: string[];
  attachments: MappedPlayerAttachment[];
}

export interface MappedPlayerSection {
  id: string;
  title: string;
  subtitle: string;
  totalDurationLabel: string;
  lessons: MappedPlayerLesson[];
}

export interface MappedLessonDetail {
  courseId: string;
  courseTitle: string;
  courseThumbnailUrl: string;
  activeLesson: MappedPlayerLesson;
  sections: MappedPlayerSection[];
  flatLessons: MappedPlayerLesson[];
  watchPercent: number;
  lastPositionSeconds: number;
  completed: boolean;
  locked: boolean;
  nextLesson: MappedPlayerLesson | null;
  previousLesson: MappedPlayerLesson | null;
  courseProgressPercent: number;
  finalExamUnlocked: boolean;
}

export interface MappedLessonReply {
  id: string;
  commentId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  isInstructor: boolean;
  isSupervisorVerified: boolean;
  createdAt: string;
  content: string;
  likesCount: number;
  likedByMe: boolean;
}

export interface MappedLessonComment {
  id: string;
  courseId: string;
  lessonId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  isInstructor: boolean;
  isSupervisorVerified: boolean;
  status: CommentDto['status'];
  createdAt: string;
  createdAtIso: string;
  content: string;
  likesCount: number;
  likedByMe: boolean;
  repliesCount: number;
  replies: MappedLessonReply[];
}

export interface MappedStudentDashboard {
  raw: StudentDashboardDto;
  kpis: {
    enrolledCount: number;
    inProgressCount: number;
    completedCount: number;
    certificatesCount: number;
    totalWatchSeconds: number;
    totalWatchLabel: string;
    weeklyWatchSeconds: number;
    weeklyWatchHoursLabel: string;
    weeklyCompletedLessons: number;
    dailyGoalHours: number;
  };
  streakDays: number;
  points: number;
  continueLearning: MappedEnrollmentCard | null;
  activeCourses: MappedEnrollmentCard[];
  upcomingExams: ExamConfig[];
  weeklyActivity: WeeklyActivityDay[];
  achievements: AchievementBadge[];
  recommendedCourses: Course[];
}

export const LESSON_REPORT_OPTIONS: ReadonlyArray<{
  reason: CommentReportReasonDto;
  label: string;
}> = [
  { reason: 'spam', label: 'Spam or promotional link' },
  { reason: 'harassment', label: 'Disrespectful or harassment' },
  { reason: 'off_topic', label: 'Off-topic or exam spoilers' },
];

/** Converts an `EnrollmentDto` into a Course card + progress card metadata. */
export function mapEnrollmentDtoToCard(dto: EnrollmentDto): MappedEnrollmentCard {
  const courseState: MappedEnrollmentCard['courseState'] =
    dto.status === 'completed' || (dto.progressPercent >= 100 && dto.examPassed)
      ? 'completed'
      : dto.progressPercent >= 100
        ? 'take-exam'
        : 'in-progress';

  const course: Course = {
    id: dto.course.id,
    title: dto.course.title,
    subtitle: '',
    instructorId: dto.course.instructor.id,
    instructorName: dto.course.instructor.name,
    instructorAvatar: dto.course.instructor.avatarUrl ?? '',
    categoryId: dto.course.category.id,
    categoryName: dto.course.category.name,
    thumbnail: dto.course.thumbnailUrl,
    rating: 0,
    reviewCount: 0,
    studentsCount: 0,
    duration: formatDuration(dto.course.durationSeconds),
    lessonsCount: dto.course.lessonsCount,
    level: COURSE_LEVEL_LABELS[dto.course.level],
    price: 0,
    status: 'Published',
    progress: dto.progressPercent,
    updatedAt: dto.lastAccessedAt ? formatDate(dto.lastAccessedAt, { preset: 'monthYear' }) : '',
    tags: [],
  };

  return {
    enrollmentId: dto.id,
    course,
    courseState,
    lastAccessedLabel: dto.lastAccessedAt
      ? formatRelativeTime(dto.lastAccessedAt)
      : formatRelativeTime(dto.enrolledAt),
    lastLessonId: dto.lastLessonId ?? 'lesson-101',
    lastLessonTitle: dto.lastLessonTitle ?? 'Lesson 1',
    watchedTimeLabel: formatDuration(dto.watchedDurationSeconds),
    totalTimeLabel: formatDuration(dto.totalDurationSeconds),
    completedLessons: dto.completedLessons,
    totalLessons: dto.totalLessons,
    progressPercent: dto.progressPercent,
    bestExamScorePercent: dto.bestExamScorePercent,
    passingScorePercent: dto.passingScorePercent,
    examPassed: dto.examPassed,
    certificateId: dto.certificateId,
  };
}

/** Converts a UTC ISO YYYY-MM-DD point into a bar-chart day entry. */
export function mapWeeklyActivityDtoToDay(dto: WeeklyActivityPointDto): WeeklyActivityDay {
  const dateObj = new Date(`${dto.date}T00:00:00Z`);
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(dateObj);
  const fullDay = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(
    dateObj
  );
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(dateObj);

  return {
    day,
    fullDay,
    hours: Number((dto.watchedSeconds / 3600).toFixed(1)),
    lessonsCompleted: dto.lessonsCompleted,
    dateLabel,
  };
}

/** Converts an `AchievementBadgeDto` to the badge sticker view model. */
export function mapAchievementBadgeDtoToBadge(dto: AchievementBadgeDto): AchievementBadge {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    earned: dto.earned,
    earnedAt: dto.earnedAt ? formatDate(dto.earnedAt, { preset: 'short' }) : '',
    color: dto.color,
  };
}

/** Maps an `ExamConfigDto` to the dashboard card `ExamConfig` view shape. */
export function mapExamConfigDtoToView(
  dto: ExamConfigDto,
  enrollment?: EnrollmentDto
): ExamConfig {
  return {
    id: dto.id,
    courseId: dto.courseId,
    courseTitle: dto.courseTitle,
    title: dto.title,
    durationMinutes: Math.max(1, Math.round(dto.durationSeconds / 60)),
    passingScore: dto.passingScorePercent,
    totalQuestions: dto.totalQuestions,
    attemptsAllowed: dto.attemptsAllowed,
    shuffleQuestions: dto.shuffleQuestions,
    lastScore: enrollment?.bestExamScorePercent ?? undefined,
    passed: enrollment?.examPassed ?? undefined,
  };
}

/** Maps a `StudentDashboardDto` into formatted KPIs, resume card, weekly bars, badges & recommendations. */
export function mapStudentDashboardDtoToView(dto: StudentDashboardDto): MappedStudentDashboard {
  const dailyGoalHours = Number((dto.weeklyDailyGoalSeconds / 3600).toFixed(1));
  const totalWatchHours = (dto.kpis.totalWatchSeconds / 3600).toFixed(1);
  const weeklyHours = (dto.kpis.weeklyWatchSeconds / 3600).toFixed(1);

  return {
    raw: dto,
    kpis: {
      enrolledCount: dto.kpis.enrolledCount,
      inProgressCount: dto.kpis.inProgressCount,
      completedCount: dto.kpis.completedCount,
      certificatesCount: dto.kpis.certificatesCount,
      totalWatchSeconds: dto.kpis.totalWatchSeconds,
      totalWatchLabel: `${totalWatchHours}h`,
      weeklyWatchSeconds: dto.kpis.weeklyWatchSeconds,
      weeklyWatchHoursLabel: weeklyHours,
      weeklyCompletedLessons: dto.kpis.weeklyCompletedLessons,
      dailyGoalHours,
    },
    streakDays: dto.streakDays,
    points: dto.points,
    continueLearning: dto.continueLearning ? mapEnrollmentDtoToCard(dto.continueLearning) : null,
    activeCourses: dto.activeCourses.map(mapEnrollmentDtoToCard),
    upcomingExams: dto.upcomingExams.map((cfg) => {
      const matched =
        dto.activeCourses.find((e) => e.course.id === cfg.courseId) ??
        (dto.continueLearning?.course.id === cfg.courseId ? dto.continueLearning : undefined);
      return mapExamConfigDtoToView(cfg, matched);
    }),
    weeklyActivity: dto.weeklyActivity.map(mapWeeklyActivityDtoToDay),
    achievements: dto.achievements.map(mapAchievementBadgeDtoToBadge),
    recommendedCourses: dto.recommendedCourses.map((c) => mapCourseDtoToCourse(c)),
  };
}

/** Maps a `CourseProgressDto` into section-grouped checklist items + summary labels. */
export function mapCourseProgressDtoToView(dto: CourseProgressDto): MappedCourseProgress {
  const sectionsMap = new Map<string, MappedProgressSection>();
  const mappedLessons: MappedProgressLesson[] = dto.lessons.map((item) => ({
    ...item,
    durationLabel: formatDuration(item.durationSeconds, 'clock'),
  }));

  for (const lesson of mappedLessons) {
    const existing = sectionsMap.get(lesson.sectionId);
    if (existing) {
      existing.lessons.push(lesson);
      if (lesson.completed) existing.completedCount += 1;
    } else {
      sectionsMap.set(lesson.sectionId, {
        id: lesson.sectionId,
        title: lesson.sectionTitle,
        lessons: [lesson],
        completedCount: lesson.completed ? 1 : 0,
      });
    }
  }

  return {
    courseId: dto.courseId,
    courseTitle: dto.courseTitle,
    instructorName: dto.instructorName,
    categoryName: dto.categoryName,
    completedLessons: dto.completedLessons,
    inProgressLessons: dto.inProgressLessons,
    notStartedLessons: dto.notStartedLessons,
    totalLessons: dto.totalLessons,
    overallPercent: dto.overallPercent,
    watchedDurationSeconds: dto.watchedDurationSeconds,
    totalDurationSeconds: dto.totalDurationSeconds,
    watchedTimeLabel: formatDuration(dto.watchedDurationSeconds),
    totalTimeLabel: formatDuration(dto.totalDurationSeconds),
    lastLessonId: dto.lastLessonId ?? mappedLessons[0]?.lessonId ?? 'lesson-101',
    bestExamScorePercent: dto.bestExamScorePercent,
    passingScorePercent: dto.passingScorePercent,
    examPassed: dto.examPassed,
    certificateUnlocked: dto.certificateUnlocked,
    certificateId: dto.certificateId,
    sections: Array.from(sectionsMap.values()),
    lessons: mappedLessons,
  };
}

function mapAttachmentDto(att: LessonAttachmentDto): MappedPlayerAttachment {
  return {
    id: att.id,
    title: att.title,
    typeLabel: att.fileType.toUpperCase(),
    sizeLabel: formatBytes(att.sizeBytes),
    description: att.description,
    url: att.url,
  };
}

function mapCurriculumLessonToPlayer(
  lesson: CurriculumLessonDto,
  sectionTitle: string
): MappedPlayerLesson {
  return {
    id: lesson.id,
    sectionId: lesson.sectionId,
    sectionTitle,
    number: lesson.number,
    title: lesson.title,
    type: lesson.type,
    durationSeconds: lesson.durationSeconds,
    durationLabel: formatDuration(lesson.durationSeconds, 'clock'),
    isPreview: lesson.isPreview,
    requiresPrevious: lesson.requiresPrevious,
    videoUrl: lesson.videoUrl ?? null,
    summary: lesson.summary,
    keyTakeaways: lesson.keyTakeaways,
    attachments: lesson.attachments.map(mapAttachmentDto),
  };
}

/** Maps a `LessonDetailDto` into the full Lesson Player view model. */
export function mapLessonDetailDtoToPlayer(dto: LessonDetailDto): MappedLessonDetail {
  const sections: MappedPlayerSection[] = dto.sections.map((sec: CurriculumSectionDto) => ({
    id: sec.id,
    title: sec.title,
    subtitle: sec.subtitle ?? `${sec.lessonsCount} lessons`,
    totalDurationLabel: formatDuration(sec.durationSeconds),
    lessons: sec.lessons.map((l) => mapCurriculumLessonToPlayer(l, sec.title)),
  }));

  const flatLessons = sections.flatMap((s) => s.lessons);
  const activeFromSections = flatLessons.find((l) => l.id === dto.lesson.id);
  const activeSectionTitle =
    activeFromSections?.sectionTitle ??
    sections.find((s) => s.id === dto.lesson.sectionId)?.title ??
    'Course curriculum';

  const activeLesson =
    activeFromSections ?? mapCurriculumLessonToPlayer(dto.lesson, activeSectionTitle);

  const nextLesson = dto.nextLessonId
    ? flatLessons.find((l) => l.id === dto.nextLessonId) ?? null
    : null;
  const previousLesson = dto.previousLessonId
    ? flatLessons.find((l) => l.id === dto.previousLessonId) ?? null
    : null;

  return {
    courseId: dto.course.id,
    courseTitle: dto.course.title,
    courseThumbnailUrl: dto.course.thumbnailUrl,
    activeLesson,
    sections,
    flatLessons,
    watchPercent: dto.watchPercent,
    lastPositionSeconds: dto.lastPositionSeconds,
    completed: dto.completed,
    locked: dto.locked,
    nextLesson,
    previousLesson,
    courseProgressPercent: dto.courseProgressPercent,
    finalExamUnlocked: dto.finalExamUnlocked,
  };
}

/** Maps a `CommentReplyDto` into a lesson reply view model. */
export function mapCommentReplyDtoToPlayer(dto: CommentReplyDto): MappedLessonReply {
  return {
    id: dto.id,
    commentId: dto.commentId,
    authorId: dto.author.id,
    authorName: dto.author.name,
    authorAvatar: dto.author.avatarUrl ?? '',
    isInstructor: dto.isInstructor,
    isSupervisorVerified: dto.isSupervisorVerified,
    createdAt: formatRelativeTime(dto.createdAt),
    content: dto.content,
    likesCount: dto.likesCount,
    likedByMe: dto.likedByMe,
  };
}

/** Maps a canonical `CommentDto` into a lesson discussion thread item. */
export function mapCommentDtoToPlayer(dto: CommentDto): MappedLessonComment {
  return {
    id: dto.id,
    courseId: dto.course.id,
    lessonId: dto.lesson.id,
    authorId: dto.author.id,
    authorName: dto.author.name,
    authorAvatar: dto.author.avatarUrl ?? '',
    isInstructor: dto.isInstructor,
    isSupervisorVerified: dto.isSupervisorVerified,
    status: dto.status,
    createdAt: formatRelativeTime(dto.createdAt),
    createdAtIso: dto.createdAt,
    content: dto.content,
    likesCount: dto.likesCount,
    likedByMe: dto.likedByMe,
    repliesCount: dto.repliesCount,
    replies: dto.replies.map(mapCommentReplyDtoToPlayer),
  };
}
