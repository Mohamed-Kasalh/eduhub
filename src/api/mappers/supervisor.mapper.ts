import { formatDate, formatDuration, formatRelativeTime } from '../../lib/format';
import type {
  CommentDto,
  CommentRejectionReasonDto,
  CommentStatusDto,
  CourseReviewDecisionDto,
  CourseReviewSubmissionDto,
  ModerationReport,
  ModerationReportDto,
  ModerationReportStatusDto,
  ModerationSeverityDto,
  ModerationTargetTypeDto,
  QueueVolumePointDto,
  SupervisorAuditActionDto,
  SupervisorCommentItem,
  SupervisorCourseSubmission,
} from '../dto-types-bridge';

export type SupervisorCommentTab = 'Pending' | 'Flagged' | 'Approved' | 'Rejected';
export type SupervisorRejectReasonLabel = 'Spam' | 'Offensive' | 'Off-topic' | 'Other';
export type SupervisorReportTab = 'All' | 'Open' | 'Investigating' | 'Resolved';

export interface QueueVolumePointView {
  date: string;
  day: string;
  incoming: number;
  resolved: number;
}

export interface SupervisorAuditActionView {
  id: string;
  badge: string;
  variant: 'success' | 'danger' | 'warning' | 'info';
  summary: string;
  actorName: string;
  timeLabel: string;
}

export interface MappedModerationReport extends ModerationReport {
  targetId: string;
  resolutionNotes: string | null;
}

export const SUPERVISOR_COMMENT_TAB_TO_DTO: Record<
  SupervisorCommentTab,
  CommentStatusDto
> = {
  Pending: 'pending',
  Flagged: 'flagged',
  Approved: 'approved',
  Rejected: 'rejected',
};

export const COMMENT_STATUS_LABELS: Record<
  CommentStatusDto,
  SupervisorCommentItem['status']
> = {
  pending: 'Pending',
  flagged: 'Flagged',
  approved: 'Approved',
  rejected: 'Rejected',
  hidden: 'Rejected',
};

export const COMMENT_REJECTION_REASON_LABELS: Record<
  CommentRejectionReasonDto,
  SupervisorRejectReasonLabel
> = {
  spam: 'Spam',
  offensive: 'Offensive',
  off_topic: 'Off-topic',
  other: 'Other',
};

export const COMMENT_REJECTION_REASON_TO_DTO: Record<
  SupervisorRejectReasonLabel,
  CommentRejectionReasonDto
> = {
  Spam: 'spam',
  Offensive: 'offensive',
  'Off-topic': 'off_topic',
  Other: 'other',
};

const COURSE_REVIEW_DECISION_LABELS: Record<
  CourseReviewDecisionDto,
  SupervisorCourseSubmission['status']
> = {
  pending_review: 'Pending review',
  approved: 'Published',
  changes_requested: 'Changes requested',
  rejected: 'Rejected',
};

const REPORT_TARGET_TYPE_LABELS: Record<
  ModerationTargetTypeDto,
  ModerationReport['targetType']
> = {
  comment: 'Comment',
  course: 'Course',
  user: 'User',
};

const REPORT_SEVERITY_LABELS: Record<
  ModerationSeverityDto,
  ModerationReport['severity']
> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const REPORT_STATUS_LABELS: Record<
  ModerationReportStatusDto,
  ModerationReport['status']
> = {
  open: 'Open',
  investigating: 'Investigating',
  resolved: 'Resolved',
};

export const REPORT_TAB_TO_DTO: Record<
  SupervisorReportTab,
  ModerationReportStatusDto | 'all'
> = {
  All: 'all',
  Open: 'open',
  Investigating: 'investigating',
  Resolved: 'resolved',
};

const AUDIT_ACTION_BADGES: Record<
  SupervisorAuditActionDto['actionType'],
  { badge: string; variant: SupervisorAuditActionView['variant'] }
> = {
  approved: { badge: 'Approved', variant: 'success' },
  rejected: { badge: 'Rejected', variant: 'danger' },
  restored: { badge: 'Restored', variant: 'info' },
  resolved: { badge: 'Resolved', variant: 'success' },
};

function formatFlagReasonLabel(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'spam') return 'Spam';
  if (normalized === 'offensive') return 'Offensive';
  if (normalized === 'off_topic' || normalized === 'off-topic') return 'Off-topic';
  if (normalized === 'harassment') return 'Harassment';
  if (normalized === 'other') return 'Other';
  return raw;
}

function formatQueueWeekdayLabel(dateIso: string): string {
  const parsed = new Date(`${dateIso}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return dateIso;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(parsed);
}

/** Maps a 7-day moderation queue data point DTO to chart bar display shape. */
export function mapQueueVolumePointDtoToView(
  dto: QueueVolumePointDto
): QueueVolumePointView {
  return {
    date: dto.date,
    day: formatQueueWeekdayLabel(dto.date),
    incoming: dto.incoming,
    resolved: dto.resolved,
  };
}

/** Maps a recent supervisor audit entry DTO into a formatted activity card row. */
export function mapSupervisorAuditActionDtoToView(
  dto: SupervisorAuditActionDto
): SupervisorAuditActionView {
  const meta = AUDIT_ACTION_BADGES[dto.actionType] ?? {
    badge: dto.actionType,
    variant: 'info' as const,
  };
  return {
    id: dto.id,
    badge: meta.badge,
    variant: meta.variant,
    summary: dto.summary,
    actorName: dto.actorName,
    timeLabel: formatRelativeTime(dto.occurredAt),
  };
}

/** Maps canonical `CommentDto` into the supervisor comment moderation view model. */
export function mapCommentDtoToSupervisorItem(
  dto: CommentDto
): SupervisorCommentItem {
  const authorHistory = dto.authorHistory;
  const parentPrompt = dto.parentThreadPrompt;

  return {
    id: dto.id,
    authorName: dto.author.name,
    authorAvatar: dto.author.avatarUrl ?? '',
    authorRole: dto.author.role === 'instructor' ? 'Instructor' : 'Student',
    courseId: dto.course.id,
    courseTitle: dto.course.title,
    lessonId: dto.lesson.id,
    lessonTitle: dto.lesson.title,
    createdAt: formatRelativeTime(dto.createdAt),
    status: COMMENT_STATUS_LABELS[dto.status],
    reportReasons: dto.flagReasons.map(formatFlagReasonLabel),
    rejectionReason: dto.rejectionReason
      ? COMMENT_REJECTION_REASON_LABELS[dto.rejectionReason]
      : undefined,
    content: dto.content,
    parentThreadContext: parentPrompt
      ? {
          promptAuthor: parentPrompt.authorName,
          promptText: parentPrompt.promptText,
          promptTime: 'Pinned lesson topic',
        }
      : {
          promptAuthor: dto.lesson.title,
          promptText: 'Direct student post in lesson Q&A discussion',
          promptTime: formatRelativeTime(dto.createdAt),
        },
    authorHistory: authorHistory
      ? {
          joinedAt: formatDate(authorHistory.joinedAt, { preset: 'monthYear' }),
          totalComments: authorHistory.totalComments,
          approvedComments: authorHistory.approvedComments,
          priorFlags: authorHistory.priorFlags,
          trustStanding:
            authorHistory.trustStanding === 'under_watch'
              ? 'Under watch'
              : 'Good standing',
        }
      : {
          joinedAt: formatDate(dto.createdAt, { preset: 'monthYear' }),
          totalComments: 1,
          approvedComments: dto.status === 'approved' ? 1 : 0,
          priorFlags: dto.flagReasons.length,
          trustStanding:
            dto.flagReasons.length > 0 || dto.status === 'rejected'
              ? 'Under watch'
              : 'Good standing',
        },
  };
}

/** Maps `CourseReviewSubmissionDto` into the supervisor course review queue item. */
export function mapCourseReviewSubmissionDtoToView(
  dto: CourseReviewSubmissionDto
): SupervisorCourseSubmission {
  const fallbackStatus =
    dto.course.status === 'published'
      ? 'Published'
      : dto.course.status === 'rejected'
      ? 'Rejected'
      : 'Pending review';

  return {
    id: dto.id,
    courseId: dto.course.id,
    title: dto.course.title,
    subtitle: dto.course.subtitle,
    instructorName: dto.course.instructor.name,
    instructorAvatar: dto.course.instructor.avatarUrl ?? '',
    categoryName: dto.course.category.name,
    thumbnail: dto.course.thumbnailUrl,
    submittedDate: formatDate(dto.submittedAt, { preset: 'long' }),
    price: dto.course.price.amount,
    isFree: dto.course.isFree,
    sectionsCount: dto.sectionsCount,
    lessonsCount: dto.lessonsCount,
    totalDuration: formatDuration(dto.totalDurationSeconds, 'human'),
    questionBankCount: dto.questionBankCount,
    requiredQuestionsCount: dto.requiredQuestionsCount,
    status: COURSE_REVIEW_DECISION_LABELS[dto.reviewDecision] ?? fallbackStatus,
    rejectionReason: dto.reviewNotes ?? dto.course.rejectionReason ?? undefined,
    checklist: dto.checklist,
  };
}

/** Maps canonical `ModerationReportDto` into the supervisor reports table row model. */
export function mapModerationReportDtoToView(
  dto: ModerationReportDto
): MappedModerationReport {
  return {
    id: dto.id,
    targetId: dto.targetId,
    targetType: REPORT_TARGET_TYPE_LABELS[dto.targetType],
    targetTitle: dto.targetTitle,
    reportedBy: dto.reportedBy,
    reason: dto.reason,
    severity: REPORT_SEVERITY_LABELS[dto.severity],
    createdAt: formatRelativeTime(dto.createdAt),
    status: REPORT_STATUS_LABELS[dto.status],
    resolutionNotes: dto.resolutionNotes ?? null,
  };
}
