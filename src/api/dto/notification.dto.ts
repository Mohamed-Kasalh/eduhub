import { z } from 'zod';
import {
  AuthenticatedRoleSchema,
  IdSchema,
  IsoDateTimeSchema,
  NotificationTypeSchema,
  PaginationMetaSchema,
} from './common.dto';

export const NotificationSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  createdAt: IsoDateTimeSchema,
  read: z.boolean(),
  type: NotificationTypeSchema,
  link: z.string().min(1),
  roles: z.array(AuthenticatedRoleSchema).optional(),
});
export type NotificationDto = z.infer<typeof NotificationSchema>;

export const NotificationsMetaSchema = PaginationMetaSchema.extend({
  unreadCount: z.number().int().nonnegative(),
});
export type NotificationsMetaDto = z.infer<typeof NotificationsMetaSchema>;

export const PaginatedNotificationsResponseSchema = z.object({
  data: z.array(NotificationSchema),
  meta: NotificationsMetaSchema,
});
export type PaginatedNotificationsResponseDto = z.infer<
  typeof PaginatedNotificationsResponseSchema
>;

export const NotificationsBulkReadResponseSchema = z.object({
  markedCount: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative(),
});
export type NotificationsBulkReadResponseDto = z.infer<
  typeof NotificationsBulkReadResponseSchema
>;
