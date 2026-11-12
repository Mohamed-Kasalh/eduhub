import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type {
  ActionResultDto,
  ChangePasswordRequestDto,
  NotificationDto,
  NotificationsBulkReadResponseDto,
  NotificationPreferencesDto,
  PaginatedNotificationsResponseDto,
  SessionsListResponseDto,
  UpdateMeRequestDto,
  UploadResponseDto,
  UserDto,
} from '../dto-types-bridge';
import { getErrorMessage } from '../errors';
import {
  mapNotificationDtoToItem,
  mapSessionDtoToView,
  type ActiveSessionView,
} from '../mappers/profileNotifications.mapper';
import { queryKeys } from '../queryKeys';
import { meService } from '../services/me.service';
import {
  notificationsService,
  type NotificationsQueryParams,
} from '../services/notifications.service';
import { uploadsService, type UploadFileParams } from '../services/uploads.service';
import { emitToast } from '../../lib/toastBus';

type NotificationQuerySnapshot = Array<
  [QueryKey, PaginatedNotificationsResponseDto | undefined]
>;

async function applyOptimisticNotificationUpdate(
  queryClient: QueryClient,
  updater: (
    prev: PaginatedNotificationsResponseDto,
    snapshots: NotificationQuerySnapshot
  ) => PaginatedNotificationsResponseDto
): Promise<NotificationQuerySnapshot> {
  await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
  const snapshots = queryClient.getQueriesData<PaginatedNotificationsResponseDto>({
    queryKey: queryKeys.notifications.all,
  });

  queryClient.setQueriesData<PaginatedNotificationsResponseDto>(
    { queryKey: queryKeys.notifications.all },
    (prev) => (prev ? updater(prev, snapshots) : prev)
  );

  return snapshots;
}

function rollbackNotificationQueries(
  queryClient: QueryClient,
  snapshots: NotificationQuerySnapshot | undefined
): void {
  if (!snapshots) return;
  for (const [key, data] of snapshots) {
    queryClient.setQueryData(key, data);
  }
}

function findCachedUnreadState(
  snapshots: NotificationQuerySnapshot,
  notificationId: string
): boolean | undefined {
  for (const [, page] of snapshots) {
    const match = page?.data.find((n) => n.id === notificationId);
    if (match) return !match.read;
  }
  return undefined;
}

/** Loads active device sessions for the signed-in user. */
export function useMySessions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me.sessions,
    queryFn: () => meService.getSessions(),
    enabled,
    select: (res): ActiveSessionView[] => res.data.map(mapSessionDtoToView),
  });
}

export interface UpdateMeMutationVariables {
  payload: UpdateMeRequestDto;
  successTitle?: string;
  successMessage?: string;
}

/** Updates authenticated user profile, avatar URL, or instructor public profile fields. */
export function useUpdateMeMutation() {
  const queryClient = useQueryClient();

  return useMutation<UserDto, unknown, UpdateMeMutationVariables>({
    mutationFn: ({ payload }) => meService.updateMe(payload),
    onSuccess: (updatedUser, variables) => {
      queryClient.setQueryData<UserDto>(queryKeys.me.profile, updatedUser);
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.profile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.publicConfig.instructors(true) });
      emitToast({
        title: variables.successTitle ?? 'Profile changes saved',
        message: variables.successMessage ?? 'Your profile settings have been updated.',
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        variant: 'danger',
        title: 'Unable to update profile',
        message: getErrorMessage(err),
      });
    },
  });
}

/** Changes the authenticated user's password after current-password verification. */
export function useChangePasswordMutation() {
  return useMutation<ActionResultDto, unknown, ChangePasswordRequestDto>({
    mutationFn: (payload) => meService.changePassword(payload),
    onSuccess: () => {
      emitToast({
        title: 'Password updated',
        message: 'Your account password has been changed successfully.',
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        variant: 'danger',
        title: 'Unable to update password',
        message: getErrorMessage(err),
      });
    },
  });
}

/** Revokes a specific non-current device session with optimistic removal and rollback. */
export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ActionResultDto,
    unknown,
    { sessionId: string; device?: string; browser?: string },
    { previous?: SessionsListResponseDto }
  >({
    mutationFn: ({ sessionId }) => meService.revokeSession(sessionId),
    onMutate: async ({ sessionId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.me.sessions });
      const previous = queryClient.getQueryData<SessionsListResponseDto>(queryKeys.me.sessions);
      if (previous) {
        queryClient.setQueryData<SessionsListResponseDto>(queryKeys.me.sessions, {
          data: previous.data.filter((s) => s.id !== sessionId),
        });
      }
      return { previous };
    },
    onSuccess: (_data, variables) => {
      const deviceDesc = variables.device
        ? `Signed out from ${variables.device}${variables.browser ? ` (${variables.browser})` : ''}.`
        : 'Device session ended.';
      emitToast({
        title: 'Session logged out',
        message: deviceDesc,
        variant: 'info',
      });
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.me.sessions, context.previous);
      }
      emitToast({
        variant: 'danger',
        title: 'Unable to log out session',
        message: getErrorMessage(err),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.sessions });
    },
  });
}

/** Revokes all active sessions except the current device. */
export function useRevokeAllOtherSessionsMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ActionResultDto,
    unknown,
    { otherCount: number },
    { previous?: SessionsListResponseDto }
  >({
    mutationFn: () => meService.revokeAllOtherSessions(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.me.sessions });
      const previous = queryClient.getQueryData<SessionsListResponseDto>(queryKeys.me.sessions);
      if (previous) {
        queryClient.setQueryData<SessionsListResponseDto>(queryKeys.me.sessions, {
          data: previous.data.filter((s) => s.isCurrent),
        });
      }
      return { previous };
    },
    onSuccess: (_data, { otherCount }) => {
      emitToast({
        title: `Signed out of ${otherCount} other ${otherCount === 1 ? 'device' : 'devices'}`,
        message: 'Only this device remains active.',
        variant: 'success',
      });
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.me.sessions, context.previous);
      }
      emitToast({
        variant: 'danger',
        title: 'Unable to revoke other sessions',
        message: getErrorMessage(err),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.sessions });
    },
  });
}

/** Permanently deletes the current user's account after confirmation verification. */
export function useDeleteAccountMutation() {
  return useMutation<ActionResultDto, unknown, { confirmationText: string }>({
    mutationFn: (payload) => meService.deleteAccount(payload),
    onSuccess: () => {
      emitToast({
        title: 'Account deleted',
        message: 'Your account has been removed from this session.',
        variant: 'danger',
      });
    },
    onError: (err) => {
      emitToast({
        variant: 'danger',
        title: 'Unable to delete account',
        message: getErrorMessage(err),
      });
    },
  });
}

/** Persists in-app and email notification channel preferences. */
export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation<NotificationPreferencesDto, unknown, NotificationPreferencesDto>({
    mutationFn: (payload) => meService.updateNotificationPreferences(payload),
    onSuccess: (savedPrefs) => {
      queryClient.setQueryData<UserDto>(queryKeys.me.profile, (prev) =>
        prev ? { ...prev, notificationPreferences: savedPrefs } : prev
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.profile });
      emitToast({
        title: 'Notification preferences saved',
        message: 'Your in-app and email alert settings are up to date.',
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        variant: 'danger',
        title: 'Unable to save preferences',
        message: getErrorMessage(err),
      });
    },
  });
}

/** Lists paginated role-scoped notifications with keepPreviousData enabled. */
export function useNotifications(params?: NotificationsQueryParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => notificationsService.getNotifications(params),
    placeholderData: keepPreviousData,
    enabled,
    select: (res) => ({
      items: res.data.map(mapNotificationDtoToItem),
      raw: res.data,
      meta: res.meta,
    }),
  });
}

/** Marks a single notification as read with optimistic unread badge update. */
export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    NotificationDto,
    unknown,
    string,
    { snapshots: NotificationQuerySnapshot }
  >({
    mutationFn: (notificationId) => notificationsService.markAsRead(notificationId),
    onMutate: async (notificationId) => {
      const snapshots = await applyOptimisticNotificationUpdate(queryClient, (prev, allSnapshots) => {
        const wasUnread = findCachedUnreadState(allSnapshots, notificationId);
        return {
          ...prev,
          data: prev.data.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
          meta: {
            ...prev.meta,
            unreadCount: wasUnread ? Math.max(0, prev.meta.unreadCount - 1) : prev.meta.unreadCount,
          },
        };
      });
      return { snapshots };
    },
    onError: (err, _id, context) => {
      rollbackNotificationQueries(queryClient, context?.snapshots);
      emitToast({
        variant: 'danger',
        title: 'Unable to update notification',
        message: getErrorMessage(err),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/** Toggles a notification between read and unread states. */
export function useToggleNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    NotificationDto,
    unknown,
    { notificationId: string; currentlyRead: boolean },
    { snapshots: NotificationQuerySnapshot }
  >({
    mutationFn: ({ notificationId, currentlyRead }) =>
      currentlyRead
        ? notificationsService.markAsUnread(notificationId)
        : notificationsService.markAsRead(notificationId),
    onMutate: async ({ notificationId, currentlyRead }) => {
      const nextRead = !currentlyRead;
      const snapshots = await applyOptimisticNotificationUpdate(queryClient, (prev) => ({
        ...prev,
        data: prev.data.map((n) => (n.id === notificationId ? { ...n, read: nextRead } : n)),
        meta: {
          ...prev.meta,
          unreadCount: Math.max(0, prev.meta.unreadCount + (currentlyRead ? 1 : -1)),
        },
      }));
      return { snapshots };
    },
    onError: (err, _variables, context) => {
      rollbackNotificationQueries(queryClient, context?.snapshots);
      emitToast({
        variant: 'danger',
        title: 'Unable to update notification',
        message: getErrorMessage(err),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/** Marks all notifications for the current user as read. */
export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    NotificationsBulkReadResponseDto,
    unknown,
    void,
    { snapshots: NotificationQuerySnapshot }
  >({
    mutationFn: () => notificationsService.markAllAsRead(),
    onMutate: async () => {
      const snapshots = await applyOptimisticNotificationUpdate(queryClient, (prev) => ({
        ...prev,
        data: prev.data.map((n) => ({ ...n, read: true })),
        meta: {
          ...prev.meta,
          unreadCount: 0,
        },
      }));
      return { snapshots };
    },
    onSuccess: () => {
      emitToast({
        title: 'All notifications marked as read',
        variant: 'success',
      });
    },
    onError: (err, _variables, context) => {
      rollbackNotificationQueries(queryClient, context?.snapshots);
      emitToast({
        variant: 'danger',
        title: 'Unable to mark notifications as read',
        message: getErrorMessage(err),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/** Deletes a notification from the current user's inbox. */
export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ActionResultDto,
    unknown,
    { notificationId: string; title: string },
    { snapshots: NotificationQuerySnapshot }
  >({
    mutationFn: ({ notificationId }) => notificationsService.deleteNotification(notificationId),
    onMutate: async ({ notificationId }) => {
      const snapshots = await applyOptimisticNotificationUpdate(queryClient, (prev, allSnapshots) => {
        const wasUnread = findCachedUnreadState(allSnapshots, notificationId);
        return {
          ...prev,
          data: prev.data.filter((n) => n.id !== notificationId),
          meta: {
            ...prev.meta,
            total: Math.max(0, prev.meta.total - 1),
            unreadCount: wasUnread ? Math.max(0, prev.meta.unreadCount - 1) : prev.meta.unreadCount,
          },
        };
      });
      return { snapshots };
    },
    onSuccess: (_data, { title }) => {
      emitToast({
        title: 'Notification removed',
        message: title,
        variant: 'info',
      });
    },
    onError: (err, _variables, context) => {
      rollbackNotificationQueries(queryClient, context?.snapshots);
      emitToast({
        variant: 'danger',
        title: 'Unable to remove notification',
        message: getErrorMessage(err),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/** Uploads a validated media or document asset via multipart POST /uploads with progress callback. */
export function useUploadFileMutation() {
  return useMutation<UploadResponseDto, unknown, UploadFileParams>({
    mutationFn: (params) => uploadsService.uploadFile(params),
    onError: (err) => {
      emitToast({
        variant: 'danger',
        title: 'Upload failed',
        message: getErrorMessage(err),
      });
    },
  });
}
