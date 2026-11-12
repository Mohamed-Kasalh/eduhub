import { http } from 'msw';
import {
  BulkApproveCommentsRequestSchema,
  CourseReviewChecklistSchema,
  RejectCommentRequestSchema,
  RejectCourseReviewRequestSchema,
  RequestCourseChangesRequestSchema,
  ResolveReportRequestSchema,
} from '../../api/dto';
import {
  getMockDb,
  nextDbId,
  nowUtcIso,
  persistMockDb,
  pushMockNotification,
} from '../db';
import {
  apiEndpoint,
  jsonError,
  jsonOk,
  paginate,
  parseJsonBody,
  requireAuth,
  simulateNetwork,
} from '../helpers';

export const supervisorHandlers = [
  http.get(apiEndpoint('/supervisor/dashboard'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['supervisor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const pendingCommentsCount = db.comments.filter((c) => c.status === 'pending').length;
    const flaggedCommentsCount = db.comments.filter((c) => c.status === 'flagged').length;
    const coursesAwaitingReviewCount = db.courseReviewSubmissions.filter(
      (s) => s.reviewDecision === 'pending_review'
    ).length;

    return jsonOk({
      kpis: {
        pendingCommentsCount,
        flaggedCommentsCount,
        coursesAwaitingReviewCount,
        resolvedTodayCount: db.supervisorAuditActions.length,
        slaCompliancePercent: 96,
      },
      queueVolumeLast7Days: [
        { date: '2026-03-19', incoming: 18, resolved: 17 },
        { date: '2026-03-20', incoming: 24, resolved: 23 },
        { date: '2026-03-21', incoming: 15, resolved: 15 },
        { date: '2026-03-22', incoming: 21, resolved: 20 },
        { date: '2026-03-23', incoming: 29, resolved: 28 },
        { date: '2026-03-24', incoming: 22, resolved: 21 },
        { date: '2026-03-25', incoming: 16, resolved: 14 },
      ],
      recentActions: db.supervisorAuditActions.slice(0, 8),
    });
  }),

  http.get(apiEndpoint('/supervisor/comments'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['supervisor', 'admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'all';
    const db = getMockDb();

    const list =
      status === 'all'
        ? db.comments
        : db.comments.filter((c) => c.status === status);

    return jsonOk(
      paginate(list, url.searchParams.get('page'), url.searchParams.get('limit'), 12)
    );
  }),

  http.post(apiEndpoint('/supervisor/comments/:id/approve'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['supervisor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const comment = db.comments.find((c) => c.id === String(params.id));
    if (!comment) {
      return jsonError(404, 'COMMENT_NOT_FOUND', 'Comment not found.');
    }

    comment.status = 'approved';
    comment.isSupervisorVerified = true;
    comment.rejectionReason = null;
    comment.rejectionNotes = null;
    comment.updatedAt = nowUtcIso();

    db.supervisorAuditActions.unshift({
      id: nextDbId('sa'),
      actionType: 'approved',
      summary: `Approved comment ${comment.id} on ${comment.course.title}`,
      actorName: auth.userRecord.user.name,
      occurredAt: nowUtcIso(),
    });

    pushMockNotification({
      title: 'Comment approved',
      message: `Your comment on "${comment.lesson.title}" has been published.`,
      type: 'moderation',
      link: `/courses/${comment.course.id}/learn/${comment.lesson.id}`,
      roles: ['student', 'instructor'],
    });

    persistMockDb();
    return jsonOk(comment);
  }),

  http.post(apiEndpoint('/supervisor/comments/:id/reject'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['supervisor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const comment = db.comments.find((c) => c.id === String(params.id));
    if (!comment) {
      return jsonError(404, 'COMMENT_NOT_FOUND', 'Comment not found.');
    }

    const parsed = await parseJsonBody(request, RejectCommentRequestSchema);
    if (!parsed.ok) return parsed.response;

    comment.status = 'rejected';
    comment.isSupervisorVerified = false;
    comment.rejectionReason = parsed.data.reason;
    comment.rejectionNotes = parsed.data.notes ?? null;
    comment.updatedAt = nowUtcIso();

    db.supervisorAuditActions.unshift({
      id: nextDbId('sa'),
      actionType: 'rejected',
      summary: `Rejected comment ${comment.id} (${parsed.data.reason})`,
      actorName: auth.userRecord.user.name,
      occurredAt: nowUtcIso(),
    });

    persistMockDb();
    return jsonOk(comment);
  }),

  http.post(apiEndpoint('/supervisor/comments/:id/restore'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['supervisor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const comment = db.comments.find((c) => c.id === String(params.id));
    if (!comment) {
      return jsonError(404, 'COMMENT_NOT_FOUND', 'Comment not found.');
    }

    comment.status = 'approved';
    comment.isSupervisorVerified = true;
    comment.rejectionReason = null;
    comment.rejectionNotes = null;
    comment.updatedAt = nowUtcIso();

    db.supervisorAuditActions.unshift({
      id: nextDbId('sa'),
      actionType: 'restored',
      summary: `Restored comment ${comment.id} back to approved`,
      actorName: auth.userRecord.user.name,
      occurredAt: nowUtcIso(),
    });

    persistMockDb();
    return jsonOk(comment);
  }),

  http.delete(apiEndpoint('/supervisor/comments/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['supervisor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const idx = db.comments.findIndex((c) => c.id === String(params.id));
    if (idx === -1) {
      return jsonError(404, 'COMMENT_NOT_FOUND', 'Comment not found.');
    }

    db.comments.splice(idx, 1);
    persistMockDb();
    return jsonOk({ success: true, message: 'Comment permanently deleted.' });
  }),

  http.post(apiEndpoint('/supervisor/comments/bulk-approve'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['supervisor', 'admin']);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, BulkApproveCommentsRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    const approvedIds: string[] = [];
    for (const id of parsed.data.ids) {
      const comment = db.comments.find((c) => c.id === id);
      if (comment) {
        comment.status = 'approved';
        comment.isSupervisorVerified = true;
        comment.updatedAt = nowUtcIso();
        approvedIds.push(id);
      }
    }

    persistMockDb();
    return jsonOk({ approvedCount: approvedIds.length, approvedIds });
  }),

  http.get(apiEndpoint('/supervisor/course-reviews'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['supervisor', 'admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'all';
    const db = getMockDb();

    let list = db.courseReviewSubmissions;
    if (status !== 'all') {
      list = list.filter(
        (s) => s.reviewDecision === status || s.course.status === status
      );
    }

    return jsonOk(
      paginate(list, url.searchParams.get('page'), url.searchParams.get('limit'), 12)
    );
  }),

  http.get(apiEndpoint('/supervisor/course-reviews/:courseId'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['supervisor', 'admin']);
    if (!auth.ok) return auth.response;

    const sub = getMockDb().courseReviewSubmissions.find(
      (s) => s.course.id === String(params.courseId)
    );
    if (!sub) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course submission not found.');
    }
    return jsonOk(sub);
  }),

  http.put(
    apiEndpoint('/supervisor/course-reviews/:courseId/checklist'),
    async ({ request, params }) => {
      const fault = await simulateNetwork();
      if (fault) return fault;

      const auth = requireAuth(request, ['supervisor', 'admin']);
      if (!auth.ok) return auth.response;

      const sub = getMockDb().courseReviewSubmissions.find(
        (s) => s.course.id === String(params.courseId)
      );
      if (!sub) {
        return jsonError(404, 'COURSE_NOT_FOUND', 'Course submission not found.');
      }

      const parsed = await parseJsonBody(request, CourseReviewChecklistSchema);
      if (!parsed.ok) return parsed.response;

      sub.checklist = parsed.data;
      persistMockDb();
      return jsonOk(sub);
    }
  ),

  http.post(
    apiEndpoint('/supervisor/course-reviews/:courseId/approve'),
    async ({ request, params }) => {
      const fault = await simulateNetwork();
      if (fault) return fault;

      const auth = requireAuth(request, ['supervisor', 'admin']);
      if (!auth.ok) return auth.response;

      const db = getMockDb();
      const courseId = String(params.courseId);
      const sub = db.courseReviewSubmissions.find((s) => s.course.id === courseId);
      const course = db.courses.find((c) => c.id === courseId);
      if (!sub || !course) {
        return jsonError(404, 'COURSE_NOT_FOUND', 'Course submission not found.');
      }

      const now = nowUtcIso();
      course.status = 'published';
      course.rejectionReason = null;
      course.updatedAt = now;

      sub.course = course;
      sub.reviewDecision = 'approved';
      sub.reviewNotes = 'Approved and published to catalog.';

      db.supervisorAuditActions.unshift({
        id: nextDbId('sa'),
        actionType: 'approved',
        summary: `Approved course submission "${course.title}"`,
        actorName: auth.userRecord.user.name,
        occurredAt: now,
      });

      pushMockNotification({
        title: 'Course published!',
        message: `Your course "${course.title}" passed quality review and is now live.`,
        type: 'course',
        link: `/courses/${course.id}`,
        roles: ['instructor'],
      });

      persistMockDb();
      return jsonOk(sub);
    }
  ),

  http.post(
    apiEndpoint('/supervisor/course-reviews/:courseId/request-changes'),
    async ({ request, params }) => {
      const fault = await simulateNetwork();
      if (fault) return fault;

      const auth = requireAuth(request, ['supervisor', 'admin']);
      if (!auth.ok) return auth.response;

      const db = getMockDb();
      const courseId = String(params.courseId);
      const sub = db.courseReviewSubmissions.find((s) => s.course.id === courseId);
      const course = db.courses.find((c) => c.id === courseId);
      if (!sub || !course) {
        return jsonError(404, 'COURSE_NOT_FOUND', 'Course submission not found.');
      }

      const parsed = await parseJsonBody(request, RequestCourseChangesRequestSchema);
      if (!parsed.ok) return parsed.response;

      course.status = 'rejected';
      course.rejectionReason = parsed.data.notes;
      course.updatedAt = nowUtcIso();

      sub.course = course;
      sub.reviewDecision = 'changes_requested';
      sub.reviewNotes = parsed.data.notes;

      pushMockNotification({
        title: 'Course changes requested',
        message: `Reviewer requested updates for "${course.title}".`,
        type: 'moderation',
        link: `/instructor/courses/${course.id}/edit`,
        roles: ['instructor'],
      });

      persistMockDb();
      return jsonOk(sub);
    }
  ),

  http.post(
    apiEndpoint('/supervisor/course-reviews/:courseId/reject'),
    async ({ request, params }) => {
      const fault = await simulateNetwork();
      if (fault) return fault;

      const auth = requireAuth(request, ['supervisor', 'admin']);
      if (!auth.ok) return auth.response;

      const db = getMockDb();
      const courseId = String(params.courseId);
      const sub = db.courseReviewSubmissions.find((s) => s.course.id === courseId);
      const course = db.courses.find((c) => c.id === courseId);
      if (!sub || !course) {
        return jsonError(404, 'COURSE_NOT_FOUND', 'Course submission not found.');
      }

      const parsed = await parseJsonBody(request, RejectCourseReviewRequestSchema);
      if (!parsed.ok) return parsed.response;

      course.status = 'rejected';
      course.rejectionReason = parsed.data.reason;
      course.updatedAt = nowUtcIso();

      sub.course = course;
      sub.reviewDecision = 'rejected';
      sub.reviewNotes = parsed.data.reason;

      pushMockNotification({
        title: 'Course submission rejected',
        message: `"${course.title}" was rejected: ${parsed.data.reason}`,
        type: 'moderation',
        link: `/instructor/courses/${course.id}/edit`,
        roles: ['instructor'],
      });

      persistMockDb();
      return jsonOk(sub);
    }
  ),

  http.get(apiEndpoint('/supervisor/reports'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['supervisor', 'admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'all';
    const db = getMockDb();

    const list =
      status === 'all' ? db.reports : db.reports.filter((r) => r.status === status);

    return jsonOk(
      paginate(list, url.searchParams.get('page'), url.searchParams.get('limit'), 12)
    );
  }),

  http.post(apiEndpoint('/supervisor/reports/:id/resolve'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['supervisor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const report = db.reports.find((r) => r.id === String(params.id));
    if (!report) {
      return jsonError(404, 'REPORT_NOT_FOUND', 'Moderation report not found.');
    }

    const parsed = await parseJsonBody(request, ResolveReportRequestSchema);
    if (!parsed.ok) return parsed.response;

    const now = nowUtcIso();
    report.status = 'resolved';
    report.resolutionNotes = parsed.data.resolutionNotes ?? 'Resolved by moderation team.';
    report.resolvedAt = now;

    db.supervisorAuditActions.unshift({
      id: nextDbId('sa'),
      actionType: 'resolved',
      summary: `Resolved moderation report ${report.id}`,
      actorName: auth.userRecord.user.name,
      occurredAt: now,
    });

    persistMockDb();
    return jsonOk(report);
  }),
];
