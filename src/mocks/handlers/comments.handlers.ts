import { http } from 'msw';
import {
  CreateCommentReplyRequestSchema,
  CreateCommentRequestSchema,
  ReportCommentRequestSchema,
  UpdateCommentRequestSchema,
} from '../../api/dto';
import {
  findLessonContext,
  getMockDb,
  nextDbId,
  nowUtcIso,
  persistMockDb,
  pushMockNotification,
  toUserSummary,
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

export const commentsHandlers = [
  http.get(apiEndpoint('/lessons/:id/comments'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const lessonId = String(params.id);
    const lessonCtx = findLessonContext(lessonId);
    if (!lessonCtx) {
      return jsonError(404, 'LESSON_NOT_FOUND', 'Lesson not found.');
    }

    const db = getMockDb();
    const url = new URL(request.url);
    const sort = url.searchParams.get('sort') ?? 'newest';
    const userId = auth.userRecord.user.id;

    const visible = db.comments
      .filter(
        (c) =>
          c.lesson.id === lessonId &&
          (c.status === 'approved' || (c.status === 'pending' && c.author.id === userId))
      )
      .map((c) => {
        const commentLiked = (db.commentLikes.commentLikedUserIds[c.id] ?? []).includes(
          userId
        );
        return {
          ...c,
          likedByMe: commentLiked,
          replies: c.replies.map((r) => ({
            ...r,
            likedByMe: (db.commentLikes.replyLikedUserIds[r.id] ?? []).includes(userId),
          })),
        };
      });

    visible.sort((a, b) => {
      if (sort === 'top') {
        return b.likesCount - a.likesCount;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return jsonOk(
      paginate(visible, url.searchParams.get('page'), url.searchParams.get('limit'), 10)
    );
  }),

  http.post(apiEndpoint('/lessons/:id/comments'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const lessonId = String(params.id);
    const lessonCtx = findLessonContext(lessonId);
    if (!lessonCtx) {
      return jsonError(404, 'LESSON_NOT_FOUND', 'Lesson not found.');
    }

    const parsed = await parseJsonBody(request, CreateCommentRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === lessonCtx.courseId);
    const now = nowUtcIso();
    const newComment = {
      id: nextDbId('comment'),
      course: {
        id: lessonCtx.courseId,
        title: course?.title ?? 'EduHub Course',
      },
      lesson: {
        id: lessonId,
        title: lessonCtx.lesson.title,
      },
      author: toUserSummary(auth.userRecord),
      content: parsed.data.content,
      status: 'pending' as const,
      isInstructor: course?.instructor.id === auth.userRecord.user.id,
      isSupervisorVerified: false,
      resolved: false,
      likesCount: 0,
      likedByMe: false,
      repliesCount: 0,
      replies: [],
      flagReasons: [],
      rejectionReason: null,
      rejectionNotes: null,
      parentThreadPrompt: null,
      authorHistory: {
        joinedAt: auth.userRecord.user.joinedAt,
        totalComments: 1,
        approvedComments: 0,
        priorFlags: 0,
        trustStanding: 'good_standing' as const,
      },
      createdAt: now,
      updatedAt: now,
    };

    db.comments.unshift(newComment);
    persistMockDb();
    return jsonOk(newComment, 201);
  }),

  http.post(apiEndpoint('/comments/:id/replies'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const comment = db.comments.find((c) => c.id === String(params.id));
    if (!comment) {
      return jsonError(404, 'COMMENT_NOT_FOUND', 'Comment not found.');
    }

    const parsed = await parseJsonBody(request, CreateCommentReplyRequestSchema);
    if (!parsed.ok) return parsed.response;

    const course = db.courses.find((c) => c.id === comment.course.id);
    const isCourseInstructor =
      auth.userRecord.user.role === 'instructor' &&
      course?.instructor.id === auth.userRecord.user.id;

    const reply = {
      id: nextDbId('reply'),
      commentId: comment.id,
      author: toUserSummary(auth.userRecord),
      isInstructor: isCourseInstructor,
      isSupervisorVerified: isCourseInstructor || auth.userRecord.user.role === 'supervisor',
      content: parsed.data.content,
      likesCount: 0,
      likedByMe: false,
      createdAt: nowUtcIso(),
    };

    comment.replies.push(reply);
    comment.repliesCount = comment.replies.length;
    if (isCourseInstructor) {
      comment.resolved = true;
    }
    comment.updatedAt = nowUtcIso();
    persistMockDb();

    return jsonOk(reply, 201);
  }),

  http.patch(apiEndpoint('/comments/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const comment = db.comments.find((c) => c.id === String(params.id));
    if (!comment) {
      return jsonError(404, 'COMMENT_NOT_FOUND', 'Comment not found.');
    }

    if (comment.author.id !== auth.userRecord.user.id) {
      return jsonError(403, 'NOT_OWNER', 'You can only edit your own comments.');
    }

    const parsed = await parseJsonBody(request, UpdateCommentRequestSchema);
    if (!parsed.ok) return parsed.response;

    comment.content = parsed.data.content;
    comment.updatedAt = nowUtcIso();
    persistMockDb();
    return jsonOk(comment);
  }),

  http.delete(apiEndpoint('/comments/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const comment = db.comments.find((c) => c.id === String(params.id));
    if (!comment) {
      return jsonError(404, 'COMMENT_NOT_FOUND', 'Comment not found.');
    }

    const canDelete =
      comment.author.id === auth.userRecord.user.id ||
      auth.userRecord.user.role === 'supervisor' ||
      auth.userRecord.user.role === 'admin';

    if (!canDelete) {
      return jsonError(403, 'NOT_OWNER', 'You cannot delete another user comment.');
    }

    db.comments = db.comments.filter((c) => c.id !== comment.id);
    persistMockDb();
    return jsonOk({ success: true, message: 'Comment deleted.' });
  }),

  http.put(apiEndpoint('/comments/:id/like'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const comment = db.comments.find((c) => c.id === String(params.id));
    if (!comment) {
      return jsonError(404, 'COMMENT_NOT_FOUND', 'Comment not found.');
    }

    const userId = auth.userRecord.user.id;
    const likedUsers = db.commentLikes.commentLikedUserIds[comment.id] ?? [];
    if (!likedUsers.includes(userId)) {
      likedUsers.push(userId);
      db.commentLikes.commentLikedUserIds[comment.id] = likedUsers;
      comment.likesCount += 1;
    }
    comment.likedByMe = true;
    persistMockDb();

    return jsonOk({ id: comment.id, likesCount: comment.likesCount, likedByMe: true });
  }),

  http.delete(apiEndpoint('/comments/:id/like'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const comment = db.comments.find((c) => c.id === String(params.id));
    if (!comment) {
      return jsonError(404, 'COMMENT_NOT_FOUND', 'Comment not found.');
    }

    const userId = auth.userRecord.user.id;
    const likedUsers = db.commentLikes.commentLikedUserIds[comment.id] ?? [];
    if (likedUsers.includes(userId)) {
      db.commentLikes.commentLikedUserIds[comment.id] = likedUsers.filter((id) => id !== userId);
      comment.likesCount = Math.max(0, comment.likesCount - 1);
    }
    comment.likedByMe = false;
    persistMockDb();

    return jsonOk({ id: comment.id, likesCount: comment.likesCount, likedByMe: false });
  }),

  http.put(apiEndpoint('/replies/:id/like'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const replyId = String(params.id);
    let targetReply: (typeof db.comments)[0]['replies'][0] | undefined;
    for (const c of db.comments) {
      const found = c.replies.find((r) => r.id === replyId);
      if (found) {
        targetReply = found;
        break;
      }
    }
    if (!targetReply) {
      return jsonError(404, 'REPLY_NOT_FOUND', 'Reply not found.');
    }

    const userId = auth.userRecord.user.id;
    const likedUsers = db.commentLikes.replyLikedUserIds[replyId] ?? [];
    if (!likedUsers.includes(userId)) {
      likedUsers.push(userId);
      db.commentLikes.replyLikedUserIds[replyId] = likedUsers;
      targetReply.likesCount += 1;
    }
    targetReply.likedByMe = true;
    persistMockDb();

    return jsonOk({ id: replyId, likesCount: targetReply.likesCount, likedByMe: true });
  }),

  http.delete(apiEndpoint('/replies/:id/like'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const replyId = String(params.id);
    let targetReply: (typeof db.comments)[0]['replies'][0] | undefined;
    for (const c of db.comments) {
      const found = c.replies.find((r) => r.id === replyId);
      if (found) {
        targetReply = found;
        break;
      }
    }
    if (!targetReply) {
      return jsonError(404, 'REPLY_NOT_FOUND', 'Reply not found.');
    }

    const userId = auth.userRecord.user.id;
    const likedUsers = db.commentLikes.replyLikedUserIds[replyId] ?? [];
    if (likedUsers.includes(userId)) {
      db.commentLikes.replyLikedUserIds[replyId] = likedUsers.filter((id) => id !== userId);
      targetReply.likesCount = Math.max(0, targetReply.likesCount - 1);
    }
    targetReply.likedByMe = false;
    persistMockDb();

    return jsonOk({ id: replyId, likesCount: targetReply.likesCount, likedByMe: false });
  }),

  http.post(apiEndpoint('/comments/:id/report'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const comment = db.comments.find((c) => c.id === String(params.id));
    if (!comment) {
      return jsonError(404, 'COMMENT_NOT_FOUND', 'Comment not found.');
    }

    const parsed = await parseJsonBody(request, ReportCommentRequestSchema);
    if (!parsed.ok) return parsed.response;

    comment.status = 'flagged';
    if (!comment.flagReasons.includes(parsed.data.reason)) {
      comment.flagReasons.push(parsed.data.reason);
    }

    db.reports.unshift({
      id: nextDbId('rep'),
      targetType: 'comment',
      targetId: comment.id,
      targetTitle: `Reported comment on ${comment.lesson.title}`,
      reportedBy: auth.userRecord.user.name,
      reason: parsed.data.details
        ? `${parsed.data.reason}: ${parsed.data.details}`
        : parsed.data.reason,
      severity: parsed.data.reason === 'harassment' ? 'high' : 'medium',
      status: 'open',
      resolutionNotes: null,
      createdAt: nowUtcIso(),
      resolvedAt: null,
    });

    pushMockNotification({
      title: 'Comment reported for review',
      message: `${auth.userRecord.user.name} flagged comment ${comment.id} as ${parsed.data.reason}.`,
      type: 'moderation',
      link: '/supervisor/comments',
      roles: ['supervisor', 'admin'],
    });

    persistMockDb();
    return jsonOk(
      { success: true, message: 'Report submitted to moderation team.' },
      201
    );
  }),
];
