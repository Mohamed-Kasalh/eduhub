import { http } from 'msw';
import { getMockDb, persistMockDb } from '../db';
import { apiEndpoint, jsonError, jsonOk, paginate, requireAuth, simulateNetwork } from '../helpers';

export const notificationsHandlers = [
  http.get(apiEndpoint('/notifications'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'all';
    const type = url.searchParams.get('type') ?? 'all';
    const role = auth.userRecord.user.role;

    const db = getMockDb();
    const roleScoped = db.notifications
      .filter((n) => !n.roles || n.roles.length === 0 || n.roles.includes(role))
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const unreadCount = roleScoped.filter((n) => !n.read).length;

    let filtered = roleScoped;
    if (status === 'unread') {
      filtered = filtered.filter((n) => !n.read);
    }
    if (type !== 'all') {
      filtered = filtered.filter((n) => n.type === type);
    }

    const paginated = paginate(
      filtered,
      url.searchParams.get('page'),
      url.searchParams.get('limit'),
      8
    );

    return jsonOk({
      data: paginated.data,
      meta: {
        ...paginated.meta,
        unreadCount,
      },
    });
  }),

  http.post(apiEndpoint('/notifications/:id/read'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const notif = db.notifications.find((n) => n.id === String(params.id));
    if (!notif) {
      return jsonError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
    }

    notif.read = true;
    persistMockDb();
    return jsonOk(notif);
  }),

  http.post(apiEndpoint('/notifications/:id/unread'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const notif = db.notifications.find((n) => n.id === String(params.id));
    if (!notif) {
      return jsonError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
    }

    notif.read = false;
    persistMockDb();
    return jsonOk(notif);
  }),

  http.post(apiEndpoint('/notifications/read-all'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const role = auth.userRecord.user.role;
    let markedCount = 0;
    for (const notif of db.notifications) {
      const belongs =
        !notif.roles || notif.roles.length === 0 || notif.roles.includes(role);
      if (belongs && !notif.read) {
        notif.read = true;
        markedCount += 1;
      }
    }
    persistMockDb();

    return jsonOk({ markedCount, unreadCount: 0 });
  }),

  http.delete(apiEndpoint('/notifications/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const idx = db.notifications.findIndex((n) => n.id === String(params.id));
    if (idx === -1) {
      return jsonError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
    }

    db.notifications.splice(idx, 1);
    persistMockDb();
    return jsonOk({ success: true, message: 'Notification deleted.' });
  }),
];
