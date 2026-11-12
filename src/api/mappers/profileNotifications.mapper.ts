import type {
  ActiveSessionDto,
  NotificationDto,
  NotificationPreferenceMap,
  NotificationItem,
} from '../dto-types-bridge';
import { formatRelativeTime } from '../../lib/format';

/** Default notification channel matrix used when profile preferences are not yet populated. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceMap = {
  courseReplies: { inApp: true, email: true },
  examResults: { inApp: true, email: true },
  certificates: { inApp: true, email: true },
  moderation: { inApp: true, email: false },
  announcements: { inApp: true, email: false },
};

/** UI view model for an authenticated device session entry on the Security tab. */
export interface ActiveSessionView {
  id: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

/** Maps an API device session DTO into the Security tab display shape. */
export function mapSessionDtoToView(dto: ActiveSessionDto): ActiveSessionView {
  return {
    id: dto.id,
    device: dto.deviceName,
    deviceType: dto.deviceType,
    browser: dto.browser,
    location: dto.location,
    lastActive: dto.isCurrent ? 'Active now' : formatRelativeTime(dto.lastActiveAt),
    isCurrent: dto.isCurrent,
  };
}

/** Maps a server Notification DTO to the UI NotificationItem view model with relative time. */
export function mapNotificationDtoToItem(dto: NotificationDto): NotificationItem {
  return {
    id: dto.id,
    title: dto.title,
    message: dto.message,
    createdAt: formatRelativeTime(dto.createdAt),
    read: dto.read,
    type: dto.type,
    link: dto.link,
    roles: dto.roles,
  };
}

/** Converts optional blank form strings to null for PATCH /me validation compatibility. */
export function toNullableTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
