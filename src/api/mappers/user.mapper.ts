import { formatDate, formatRelativeTime } from '../../lib/format';
import type { UserProfile, UserStatusDto, UserDto } from '../dto-types-bridge';

const USER_STATUS_LABELS: Record<UserStatusDto, UserProfile['status']> = {
  active: 'Active',
  suspended: 'Suspended',
  pending: 'Pending',
};

/** Maps a backend `UserDto` into the existing UI `UserProfile` view model. */
export function mapUserDtoToProfile(dto: UserDto): UserProfile {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    role: dto.role,
    avatar: dto.avatarUrl ?? '',
    title: dto.title,
    bio: dto.bio,
    phone: dto.phone ?? undefined,
    links: {
      website: dto.links.website ?? undefined,
      linkedin: dto.links.linkedin ?? undefined,
      github: dto.links.github ?? undefined,
    },
    expertiseTags: dto.expertiseTags,
    notificationPreferences: {
      courseReplies: { ...dto.notificationPreferences.courseReplies },
      examResults: { ...dto.notificationPreferences.examResults },
      certificates: { ...dto.notificationPreferences.certificates },
      moderation: { ...dto.notificationPreferences.moderation },
      announcements: { ...dto.notificationPreferences.announcements },
    },
    joinedAt: formatDate(dto.joinedAt, { preset: 'monthYear' }),
    status: USER_STATUS_LABELS[dto.status] ?? 'Pending',
    streakDays: dto.streakDays,
    points: dto.points,
  };
}

/** Formats user recent activity items for display. */
export function mapUserRecentActivity(dto: UserDto): Array<{ id: string; action: string; time: string }> {
  return (dto.recentActivity ?? []).map((item) => ({
    id: item.id,
    action: item.action,
    time: formatRelativeTime(item.occurredAt),
  }));
}
