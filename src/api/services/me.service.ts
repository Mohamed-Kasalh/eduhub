import {
  ActionResultSchema,
  NotificationPreferencesSchema,
  RecentSearchesResponseSchema,
  SessionsListResponseSchema,
  UserSchema,
  type ActionResultDto,
  type AddRecentSearchRequestDto,
  type ChangePasswordRequestDto,
  type NotificationPreferencesDto,
  type RecentSearchesResponseDto,
  type SessionsListResponseDto,
  type UpdateMeRequestDto,
  type UserDto,
} from '../dto';
import { http } from '../http';
import { tokenStore } from '../tokenStore';

/** Current-user profile, security, sessions, preferences, and search history endpoints. */
export const meService = {
  /** Fetches the authenticated user's full profile. */
  async getMe(): Promise<UserDto> {
    return http.get('/me', UserSchema);
  },

  /** Updates mutable fields on the authenticated user's profile. */
  async updateMe(payload: UpdateMeRequestDto): Promise<UserDto> {
    return http.patch('/me', UserSchema, payload);
  },

  /** Changes the authenticated user's password after verifying current credentials. */
  async changePassword(payload: ChangePasswordRequestDto): Promise<ActionResultDto> {
    return http.post('/me/password', ActionResultSchema, payload);
  },

  /** Lists active device sessions for the authenticated user. */
  async getSessions(): Promise<SessionsListResponseDto> {
    return http.get('/me/sessions', SessionsListResponseSchema);
  },

  /** Revokes a specific non-current device session by ID. */
  async revokeSession(sessionId: string): Promise<ActionResultDto> {
    return http.delete(`/me/sessions/${encodeURIComponent(sessionId)}`, ActionResultSchema);
  },

  /** Revokes all active sessions except the current device. */
  async revokeAllOtherSessions(): Promise<ActionResultDto> {
    return http.delete('/me/sessions', ActionResultSchema);
  },

  /** Permanently deletes the authenticated user's account and clears local tokens. */
  async deleteAccount(payload: { confirmationText: string }): Promise<ActionResultDto> {
    const result = await http.delete('/me', ActionResultSchema, payload);
    tokenStore.clear();
    return result;
  },

  /** Retrieves in-app and email notification channel preferences. */
  async getNotificationPreferences(): Promise<NotificationPreferencesDto> {
    return http.get('/me/notification-preferences', NotificationPreferencesSchema);
  },

  /** Persists updated in-app and email notification channel preferences. */
  async updateNotificationPreferences(
    payload: NotificationPreferencesDto
  ): Promise<NotificationPreferencesDto> {
    return http.put('/me/notification-preferences', NotificationPreferencesSchema, payload);
  },

  /** Retrieves the user's recent search queries. */
  async getRecentSearches(): Promise<RecentSearchesResponseDto> {
    return http.get('/me/recent-searches', RecentSearchesResponseSchema);
  },

  /** Records a new recent search query and returns the updated list. */
  async addRecentSearch(payload: AddRecentSearchRequestDto): Promise<RecentSearchesResponseDto> {
    return http.post('/me/recent-searches', RecentSearchesResponseSchema, payload);
  },

  /** Clears all recent search queries for the current user. */
  async clearRecentSearches(): Promise<RecentSearchesResponseDto> {
    return http.delete('/me/recent-searches', RecentSearchesResponseSchema);
  },
};
