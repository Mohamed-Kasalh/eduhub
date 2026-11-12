import {
  ActionResultSchema,
  NotificationSchema,
  NotificationsBulkReadResponseSchema,
  PaginatedNotificationsResponseSchema,
  type ActionResultDto,
  type NotificationDto,
  type NotificationTypeDto,
  type NotificationsBulkReadResponseDto,
  type PaginatedNotificationsResponseDto,
} from '../dto';
import { http } from '../http';

export type NotificationsQueryParams = {
  status?: 'all' | 'unread';
  type?: NotificationTypeDto | 'all';
  page?: number;
  limit?: number;
};

/** Role-scoped in-app notifications inbox and read-state endpoints. */
export const notificationsService = {
  /** Lists paginated notifications filtered by status and type, including unread count. */
  async getNotifications(
    params?: NotificationsQueryParams
  ): Promise<PaginatedNotificationsResponseDto> {
    return http.get('/notifications', PaginatedNotificationsResponseSchema, {
      query: params ? { ...params } : undefined,
    });
  },

  /** Marks a single notification as read. */
  async markAsRead(notificationId: string): Promise<NotificationDto> {
    return http.post(
      `/notifications/${encodeURIComponent(notificationId)}/read`,
      NotificationSchema
    );
  },

  /** Marks a single notification as unread. */
  async markAsUnread(notificationId: string): Promise<NotificationDto> {
    return http.post(
      `/notifications/${encodeURIComponent(notificationId)}/unread`,
      NotificationSchema
    );
  },

  /** Marks all notifications for the current user as read. */
  async markAllAsRead(): Promise<NotificationsBulkReadResponseDto> {
    return http.post('/notifications/read-all', NotificationsBulkReadResponseSchema);
  },

  /** Removes a notification from the current user's inbox. */
  async deleteNotification(notificationId: string): Promise<ActionResultDto> {
    return http.delete(`/notifications/${encodeURIComponent(notificationId)}`, ActionResultSchema);
  },
};
