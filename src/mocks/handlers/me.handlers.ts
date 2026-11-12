import { http } from 'msw';
import { z } from 'zod';
import {
  AddRecentSearchRequestSchema,
  ChangePasswordRequestSchema,
  NotificationPreferencesSchema,
  UpdateMeRequestSchema,
} from '../../api/dto';
import { getMockDb, persistMockDb } from '../db';
import {
  apiEndpoint,
  jsonError,
  jsonOk,
  parseJsonBody,
  requireAuth,
  simulateNetwork,
} from '../helpers';

const DeleteMeBodySchema = z.object({
  confirmationText: z.string(),
});

export const meHandlers = [
  http.get(apiEndpoint('/me'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    return jsonOk(auth.userRecord.user);
  }),

  http.patch(apiEndpoint('/me'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, UpdateMeRequestSchema);
    if (!parsed.ok) return parsed.response;

    const user = auth.userRecord.user;
    if (parsed.data.name !== undefined) user.name = parsed.data.name;
    if (parsed.data.title !== undefined) user.title = parsed.data.title;
    if (parsed.data.bio !== undefined) user.bio = parsed.data.bio;
    if (parsed.data.phone !== undefined) user.phone = parsed.data.phone;
    if (parsed.data.avatarUrl !== undefined) user.avatarUrl = parsed.data.avatarUrl;
    if (parsed.data.links !== undefined) {
      user.links = { ...user.links, ...parsed.data.links };
    }
    if (parsed.data.expertiseTags !== undefined) {
      user.expertiseTags = parsed.data.expertiseTags;
    }

    persistMockDb();
    return jsonOk(user);
  }),

  http.post(apiEndpoint('/me/password'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, ChangePasswordRequestSchema);
    if (!parsed.ok) return parsed.response;

    if (auth.userRecord.password !== parsed.data.currentPassword) {
      return jsonError(422, 'VALIDATION_ERROR', 'Current password is incorrect.', {
        currentPassword: ['Current password is incorrect.'],
      });
    }

    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return jsonError(
        422,
        'VALIDATION_ERROR',
        'New password must differ from your current password.',
        { newPassword: ['Choose a password you have not just used.'] }
      );
    }

    auth.userRecord.password = parsed.data.newPassword;
    persistMockDb();
    return jsonOk({ success: true, message: 'Password updated successfully.' });
  }),

  http.get(apiEndpoint('/me/sessions'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    return jsonOk({ data: auth.userRecord.sessions });
  }),

  http.delete(apiEndpoint('/me/sessions/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const sessionId = String(params.id);
    const session = auth.userRecord.sessions.find((s) => s.id === sessionId);
    if (!session) {
      return jsonError(404, 'SESSION_NOT_FOUND', 'Session not found.');
    }
    if (session.isCurrent) {
      return jsonError(
        409,
        'CANNOT_REVOKE_CURRENT_SESSION',
        'Use logout to end your current session.'
      );
    }

    auth.userRecord.sessions = auth.userRecord.sessions.filter((s) => s.id !== sessionId);
    persistMockDb();
    return jsonOk({ success: true, message: 'Session revoked.' });
  }),

  http.delete(apiEndpoint('/me/sessions'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    auth.userRecord.sessions = auth.userRecord.sessions.filter((s) => s.isCurrent);
    persistMockDb();
    return jsonOk({ success: true, message: 'All other sessions logged out.' });
  }),

  http.delete(apiEndpoint('/me'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, DeleteMeBodySchema);
    if (!parsed.ok) return parsed.response;

    if (parsed.data.confirmationText !== 'DELETE') {
      return jsonError(
        422,
        'VALIDATION_ERROR',
        'Type DELETE to confirm account deletion.',
        { confirmationText: ['Confirmation must be exact uppercase DELETE.'] }
      );
    }

    const db = getMockDb();
    const userId = auth.userRecord.user.id;
    db.revokedAccessTokens.push(auth.token);
    delete db.users[userId];
    persistMockDb();

    return jsonOk({ success: true, message: 'Account permanently deleted.' });
  }),

  http.get(apiEndpoint('/me/notification-preferences'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    return jsonOk(auth.userRecord.user.notificationPreferences);
  }),

  http.put(apiEndpoint('/me/notification-preferences'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, NotificationPreferencesSchema);
    if (!parsed.ok) return parsed.response;

    auth.userRecord.user.notificationPreferences = parsed.data;
    persistMockDb();
    return jsonOk(auth.userRecord.user.notificationPreferences);
  }),

  http.get(apiEndpoint('/me/recent-searches'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    return jsonOk({ data: auth.userRecord.recentSearches });
  }),

  http.post(apiEndpoint('/me/recent-searches'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, AddRecentSearchRequestSchema);
    if (!parsed.ok) return parsed.response;

    const cleanQuery = parsed.data.query.trim();
    auth.userRecord.recentSearches = [
      cleanQuery,
      ...auth.userRecord.recentSearches.filter(
        (q) => q.toLowerCase() !== cleanQuery.toLowerCase()
      ),
    ].slice(0, 8);
    persistMockDb();
    return jsonOk({ data: auth.userRecord.recentSearches });
  }),

  http.delete(apiEndpoint('/me/recent-searches'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    auth.userRecord.recentSearches = [];
    persistMockDb();
    return jsonOk({ data: [] });
  }),
];
