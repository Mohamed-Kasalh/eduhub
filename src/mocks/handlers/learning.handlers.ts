import { http } from 'msw';
import {
  UpdateLessonProgressRequestSchema,
  type CourseProgressDto,
  type EnrollmentDto,
  type LessonProgressItemDto,
} from '../../api/dto';
import { getMockDb, nextDbId, nowUtcIso, persistMockDb } from '../db';
import {
  apiEndpoint,
  jsonError,
  jsonOk,
  paginate,
  parseJsonBody,
  requireAuth,
  simulateNetwork,
} from '../helpers';
import type { MockEnrollmentRecord } from '../seed';

function buildEnrollmentDto(enr: MockEnrollmentRecord): EnrollmentDto | null {
  const db = getMockDb();
  const course = db.courses.find((c) => c.id === enr.courseId);
  if (!course) return null;

  const sections = db.curricula[course.id] ?? [];
  const allLessons = sections.flatMap((s) => s.lessons);
  const totalLessons = allLessons.length || course.lessonsCount;
  const completedLessons = allLessons.filter(
    (l) => enr.lessonProgress[l.id]?.completed
  ).length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const watchedDurationSeconds = allLessons.reduce((sum, l) => {
    const pct = enr.lessonProgress[l.id]?.watchPercent ?? 0;
    return sum + Math.round((l.durationSeconds * pct) / 100);
  }, 0);
  const totalDurationSeconds =
    allLessons.reduce((sum, l) => sum + l.durationSeconds, 0) || course.durationSeconds;

  const attempts = db.examAttempts.filter(
    (a) => a.userId === enr.userId && a.courseId === enr.courseId && a.status === 'submitted'
  );
  const bestAttempt = attempts.reduce<number | null>(
    (best, a) => (best === null || a.scorePercent > best ? a.scorePercent : best),
    null
  );
  const examPassed = attempts.some((a) => a.passed);

  const lastLesson = allLessons.find((l) => l.id === enr.lastLessonId);
  const status =
    totalLessons > 0 && completedLessons >= totalLessons ? 'completed' : 'active';

  return {
    id: enr.id,
    userId: enr.userId,
    course: {
      id: course.id,
      title: course.title,
      thumbnailUrl: course.thumbnailUrl,
      level: course.level,
      lessonsCount: totalLessons,
      durationSeconds: totalDurationSeconds,
      instructor: course.instructor,
      category: course.category,
    },
    status,
    enrolledAt: enr.enrolledAt,
    lastAccessedAt: enr.lastAccessedAt,
    lastLessonId: enr.lastLessonId,
    lastLessonTitle: lastLesson?.title ?? null,
    completedLessons,
    totalLessons,
    progressPercent,
    watchedDurationSeconds,
    totalDurationSeconds,
    bestExamScorePercent: bestAttempt,
    passingScorePercent: course.passingScorePercent,
    examPassed,
    certificateId: enr.certificateId,
  };
}

function buildLessonItems(enr: MockEnrollmentRecord): LessonProgressItemDto[] {
  const db = getMockDb();
  const sections = db.curricula[enr.courseId] ?? [];
  const flat: Array<{ sectionTitle: string; lesson: (typeof sections)[0]['lessons'][0] }> = [];
  for (const s of sections) {
    for (const l of s.lessons) {
      flat.push({ sectionTitle: s.title, lesson: l });
    }
  }

  return flat.map(({ sectionTitle, lesson }, idx) => {
    const progress = enr.lessonProgress[lesson.id];
    const completed = Boolean(progress?.completed);
    const watchPercent = progress?.watchPercent ?? 0;
    const lastPositionSeconds = progress?.lastPositionSeconds ?? 0;
    const prevCompleted =
      idx === 0 || Boolean(enr.lessonProgress[flat[idx - 1].lesson.id]?.completed);
    const locked = lesson.requiresPrevious && !prevCompleted && !completed && watchPercent === 0;

    return {
      lessonId: lesson.id,
      sectionId: lesson.sectionId,
      sectionTitle,
      number: lesson.number,
      title: lesson.title,
      type: lesson.type,
      durationSeconds: lesson.durationSeconds,
      watchPercent,
      lastPositionSeconds,
      completed,
      locked,
      status: locked
        ? 'locked'
        : completed
          ? 'completed'
          : watchPercent > 0
            ? 'in_progress'
            : 'not_started',
    };
  });
}

export const learningHandlers = [
  http.post(apiEndpoint('/courses/:id/enroll'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }
    if (course.unavailable || course.status !== 'published') {
      return jsonError(409, 'COURSE_UNAVAILABLE', 'Course is not available for enrollment.');
    }

    const existing = db.enrollments.find(
      (e) => e.userId === auth.userRecord.user.id && e.courseId === course.id
    );
    if (existing) {
      return jsonError(409, 'ALREADY_ENROLLED', 'You are already enrolled in this course.');
    }

    const firstLesson = (db.curricula[course.id] ?? [])[0]?.lessons[0]?.id ?? null;
    const now = nowUtcIso();
    const record: MockEnrollmentRecord = {
      id: nextDbId('enr'),
      userId: auth.userRecord.user.id,
      courseId: course.id,
      enrolledAt: now,
      lastAccessedAt: now,
      lastLessonId: firstLesson,
      lessonProgress: {},
      certificateId: null,
    };
    db.enrollments.push(record);
    course.studentsCount += 1;
    auth.userRecord.user.coursesCount += 1;
    persistMockDb();

    return jsonOk(buildEnrollmentDto(record)!, 201);
  }),

  http.get(apiEndpoint('/me/enrollments'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'all';
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const sort = url.searchParams.get('sort') ?? 'recent';

    let items = db.enrollments
      .filter((e) => e.userId === auth.userRecord.user.id)
      .map(buildEnrollmentDto)
      .filter((item): item is EnrollmentDto => item !== null);

    if (status === 'in_progress') {
      items = items.filter((e) => e.status === 'active');
    } else if (status === 'completed') {
      items = items.filter((e) => e.status === 'completed');
    }

    if (q) {
      items = items.filter(
        (e) =>
          e.course.title.toLowerCase().includes(q) ||
          e.course.instructor.name.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      switch (sort) {
        case 'progress_desc':
          return b.progressPercent - a.progressPercent;
        case 'progress_asc':
          return a.progressPercent - b.progressPercent;
        case 'title':
          return a.course.title.localeCompare(b.course.title);
        case 'recent':
        default:
          return (
            new Date(b.lastAccessedAt ?? b.enrolledAt).getTime() -
            new Date(a.lastAccessedAt ?? a.enrolledAt).getTime()
          );
      }
    });

    return jsonOk(
      paginate(items, url.searchParams.get('page'), url.searchParams.get('limit'), 12)
    );
  }),

  http.get(apiEndpoint('/me/wishlist'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const data = auth.userRecord.wishlistCourseIds
      .map((courseId) => db.courses.find((c) => c.id === courseId))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((course) => ({
        courseId: course.id,
        addedAt: nowUtcIso(),
        course,
      }));

    return jsonOk({ data });
  }),

  http.put(apiEndpoint('/me/wishlist/:courseId'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const courseId = String(params.courseId);
    const db = getMockDb();
    if (!db.courses.some((c) => c.id === courseId)) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    if (!auth.userRecord.wishlistCourseIds.includes(courseId)) {
      auth.userRecord.wishlistCourseIds.push(courseId);
      persistMockDb();
    }

    return jsonOk({ courseId, wishlisted: true });
  }),

  http.delete(apiEndpoint('/me/wishlist/:courseId'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const courseId = String(params.courseId);
    const db = getMockDb();
    if (!db.courses.some((c) => c.id === courseId)) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    auth.userRecord.wishlistCourseIds = auth.userRecord.wishlistCourseIds.filter(
      (id) => id !== courseId
    );
    persistMockDb();
    return jsonOk({ courseId, wishlisted: false });
  }),

  http.get(apiEndpoint('/me/dashboard'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const enrollments = db.enrollments
      .filter((e) => e.userId === auth.userRecord.user.id)
      .map(buildEnrollmentDto)
      .filter((item): item is EnrollmentDto => item !== null);

    const completedCount = enrollments.filter((e) => e.status === 'completed').length;
    const inProgressCount = enrollments.filter((e) => e.status === 'active').length;
    const myCertificates = db.certificates.filter(
      (c) => c.student.id === auth.userRecord.user.id && c.status === 'valid'
    );
    const totalWatchSeconds = enrollments.reduce(
      (sum, e) => sum + e.watchedDurationSeconds,
      0
    );

    const activeCourses = enrollments.filter((e) => e.status === 'active');
    const continueLearning = activeCourses[0] ?? enrollments[0] ?? null;

    const enrolledIds = new Set(enrollments.map((e) => e.course.id));
    const upcomingExams = enrollments
      .map((e) => db.examConfigs[e.course.id])
      .filter((cfg): cfg is NonNullable<typeof cfg> => Boolean(cfg));

    const recommendedCourses = db.courses
      .filter((c) => c.status === 'published' && !enrolledIds.has(c.id))
      .slice(0, 4);

    return jsonOk({
      kpis: {
        enrolledCount: enrollments.length,
        inProgressCount,
        completedCount,
        certificatesCount: myCertificates.length,
        totalWatchSeconds,
        weeklyWatchSeconds: 18420,
        weeklyCompletedLessons: 9,
      },
      streakDays: auth.userRecord.user.streakDays,
      points: auth.userRecord.user.points,
      weeklyDailyGoalSeconds: 7200,
      continueLearning,
      activeCourses,
      upcomingExams,
      weeklyActivity: [
        { date: '2026-03-19', watchedSeconds: 2400, lessonsCompleted: 1 },
        { date: '2026-03-20', watchedSeconds: 3600, lessonsCompleted: 2 },
        { date: '2026-03-21', watchedSeconds: 1800, lessonsCompleted: 1 },
        { date: '2026-03-22', watchedSeconds: 4200, lessonsCompleted: 2 },
        { date: '2026-03-23', watchedSeconds: 2100, lessonsCompleted: 1 },
        { date: '2026-03-24', watchedSeconds: 3120, lessonsCompleted: 1 },
        { date: '2026-03-25', watchedSeconds: 1200, lessonsCompleted: 1 },
      ],
      achievements: [
        {
          id: 'ach-1',
          title: 'First Course Completed',
          description: 'Finish every lesson and assessment in a course.',
          earned: completedCount > 0,
          earnedAt: completedCount > 0 ? '2026-02-12T16:00:00.000Z' : null,
          color: 'purple',
        },
        {
          id: 'ach-2',
          title: '7-Day Study Streak',
          description: 'Complete learning sessions across 7 consecutive days.',
          earned: auth.userRecord.user.streakDays >= 7,
          earnedAt: auth.userRecord.user.streakDays >= 7 ? '2026-03-18T12:00:00.000Z' : null,
          color: 'orange',
        },
      ],
      recommendedCourses,
    });
  }),

  http.get(apiEndpoint('/courses/:id/progress'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const enr = db.enrollments.find(
      (e) => e.userId === auth.userRecord.user.id && e.courseId === course.id
    );
    if (!enr) {
      return jsonError(403, 'NOT_ENROLLED', 'You are not enrolled in this course.');
    }

    const lessons = buildLessonItems(enr);
    const completedLessons = lessons.filter((l) => l.completed).length;
    const inProgressLessons = lessons.filter((l) => l.status === 'in_progress').length;
    const notStartedLessons = lessons.length - completedLessons - inProgressLessons;
    const overallPercent =
      lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;

    const watchedDurationSeconds = lessons.reduce(
      (sum, l) => sum + Math.round((l.durationSeconds * l.watchPercent) / 100),
      0
    );
    const totalDurationSeconds = lessons.reduce((sum, l) => sum + l.durationSeconds, 0);

    const attempts = db.examAttempts.filter(
      (a) => a.userId === enr.userId && a.courseId === enr.courseId && a.status === 'submitted'
    );
    const bestExamScorePercent = attempts.reduce<number | null>(
      (best, a) => (best === null || a.scorePercent > best ? a.scorePercent : best),
      null
    );
    const examPassed = attempts.some((a) => a.passed);

    const payload: CourseProgressDto = {
      courseId: course.id,
      courseTitle: course.title,
      instructorName: course.instructor.name,
      categoryName: course.category.name,
      completedLessons,
      inProgressLessons,
      notStartedLessons,
      totalLessons: lessons.length,
      overallPercent,
      watchedDurationSeconds,
      totalDurationSeconds,
      lastLessonId: enr.lastLessonId,
      bestExamScorePercent,
      passingScorePercent: course.passingScorePercent,
      examPassed,
      certificateUnlocked: overallPercent === 100 && examPassed,
      certificateId: enr.certificateId,
      lessons,
    };

    return jsonOk(payload);
  }),

  http.get(
    apiEndpoint('/courses/:id/lessons/:lessonId'),
    async ({ request, params }) => {
      const fault = await simulateNetwork();
      if (fault) return fault;

      const auth = requireAuth(request, ['student', 'instructor', 'supervisor', 'admin']);
      if (!auth.ok) return auth.response;

      const db = getMockDb();
      const course = db.courses.find((c) => c.id === String(params.id));
      if (!course) {
        return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
      }

      const sections = db.curricula[course.id] ?? [];
      const flatLessons = sections.flatMap((s) => s.lessons);
      const lessonIdx = flatLessons.findIndex((l) => l.id === String(params.lessonId));
      if (lessonIdx === -1) {
        return jsonError(404, 'LESSON_NOT_FOUND', 'Lesson not found.');
      }

      const lesson = flatLessons[lessonIdx];
      const enr = db.enrollments.find(
        (e) => e.userId === auth.userRecord.user.id && e.courseId === course.id
      );

      if (!enr && !lesson.isPreview && auth.userRecord.user.role === 'student') {
        return jsonError(403, 'NOT_ENROLLED', 'Enroll in the course to access this lesson.');
      }

      const progress = enr?.lessonProgress[lesson.id];
      const prevLesson = lessonIdx > 0 ? flatLessons[lessonIdx - 1] : null;
      const nextLesson = lessonIdx < flatLessons.length - 1 ? flatLessons[lessonIdx + 1] : null;
      const prevCompleted = prevLesson
        ? Boolean(enr?.lessonProgress[prevLesson.id]?.completed)
        : true;
      const locked =
        auth.userRecord.user.role === 'student' &&
        lesson.requiresPrevious &&
        !prevCompleted &&
        !progress?.completed &&
        (progress?.watchPercent ?? 0) === 0;

      if (locked) {
        return jsonError(
          403,
          'LESSON_LOCKED',
          'Complete the previous lesson before unlocking this one.'
        );
      }

      if (enr) {
        enr.lastAccessedAt = nowUtcIso();
        enr.lastLessonId = lesson.id;
        persistMockDb();
      }

      const completedCount = flatLessons.filter((l) => enr?.lessonProgress[l.id]?.completed).length;
      const courseProgressPercent =
        flatLessons.length > 0 ? Math.round((completedCount / flatLessons.length) * 100) : 0;

      return jsonOk({
        lesson,
        course: {
          id: course.id,
          title: course.title,
          thumbnailUrl: course.thumbnailUrl,
        },
        sections,
        watchPercent: progress?.watchPercent ?? 0,
        lastPositionSeconds: progress?.lastPositionSeconds ?? 0,
        completed: Boolean(progress?.completed),
        locked: false,
        nextLessonId: nextLesson ? nextLesson.id : null,
        previousLessonId: prevLesson ? prevLesson.id : null,
        courseProgressPercent,
        finalExamUnlocked: courseProgressPercent >= 100,
      });
    }
  ),

  http.put(
    apiEndpoint('/courses/:id/lessons/:lessonId/progress'),
    async ({ request, params }) => {
      const fault = await simulateNetwork();
      if (fault) return fault;

      const auth = requireAuth(request, ['student']);
      if (!auth.ok) return auth.response;

      const parsed = await parseJsonBody(request, UpdateLessonProgressRequestSchema);
      if (!parsed.ok) return parsed.response;

      const db = getMockDb();
      const courseId = String(params.id);
      const lessonId = String(params.lessonId);
      const enr = db.enrollments.find(
        (e) => e.userId === auth.userRecord.user.id && e.courseId === courseId
      );
      if (!enr) {
        return jsonError(403, 'NOT_ENROLLED', 'You are not enrolled in this course.');
      }

      const allLessons = (db.curricula[courseId] ?? []).flatMap((s) => s.lessons);
      if (!allLessons.some((l) => l.id === lessonId)) {
        return jsonError(404, 'LESSON_NOT_FOUND', 'Lesson not found.');
      }

      const prev = enr.lessonProgress[lessonId];
      const watchPercent = Math.max(prev?.watchPercent ?? 0, parsed.data.watchPercent);
      const completed = Boolean(prev?.completed) || watchPercent >= 90;
      enr.lessonProgress[lessonId] = {
        watchPercent,
        lastPositionSeconds: parsed.data.positionSeconds,
        completed,
      };
      enr.lastAccessedAt = nowUtcIso();
      enr.lastLessonId = lessonId;
      persistMockDb();

      const completedCount = allLessons.filter((l) => enr.lessonProgress[l.id]?.completed).length;
      const courseProgressPercent = Math.round((completedCount / allLessons.length) * 100);

      return jsonOk({
        lessonId,
        courseId,
        watchPercent,
        lastPositionSeconds: parsed.data.positionSeconds,
        completed,
        courseProgressPercent,
      });
    }
  ),

  http.post(
    apiEndpoint('/courses/:id/lessons/:lessonId/complete'),
    async ({ request, params }) => {
      const fault = await simulateNetwork();
      if (fault) return fault;

      const auth = requireAuth(request, ['student']);
      if (!auth.ok) return auth.response;

      const db = getMockDb();
      const courseId = String(params.id);
      const lessonId = String(params.lessonId);
      const enr = db.enrollments.find(
        (e) => e.userId === auth.userRecord.user.id && e.courseId === courseId
      );
      if (!enr) {
        return jsonError(403, 'NOT_ENROLLED', 'You are not enrolled in this course.');
      }

      const allLessons = (db.curricula[courseId] ?? []).flatMap((s) => s.lessons);
      const lesson = allLessons.find((l) => l.id === lessonId);
      if (!lesson) {
        return jsonError(404, 'LESSON_NOT_FOUND', 'Lesson not found.');
      }

      enr.lessonProgress[lessonId] = {
        watchPercent: 100,
        lastPositionSeconds: lesson.durationSeconds,
        completed: true,
      };
      enr.lastAccessedAt = nowUtcIso();
      enr.lastLessonId = lessonId;
      persistMockDb();

      const completedCount = allLessons.filter((l) => enr.lessonProgress[l.id]?.completed).length;
      const courseProgressPercent = Math.round((completedCount / allLessons.length) * 100);

      return jsonOk({
        lessonId,
        courseId,
        watchPercent: 100,
        lastPositionSeconds: lesson.durationSeconds,
        completed: true,
        courseProgressPercent,
      });
    }
  ),

  http.delete(
    apiEndpoint('/courses/:id/lessons/:lessonId/complete'),
    async ({ request, params }) => {
      const fault = await simulateNetwork();
      if (fault) return fault;

      const auth = requireAuth(request, ['student']);
      if (!auth.ok) return auth.response;

      const db = getMockDb();
      const courseId = String(params.id);
      const lessonId = String(params.lessonId);
      const enr = db.enrollments.find(
        (e) => e.userId === auth.userRecord.user.id && e.courseId === courseId
      );
      if (!enr) {
        return jsonError(403, 'NOT_ENROLLED', 'You are not enrolled in this course.');
      }

      const allLessons = (db.curricula[courseId] ?? []).flatMap((s) => s.lessons);
      if (!allLessons.some((l) => l.id === lessonId)) {
        return jsonError(404, 'LESSON_NOT_FOUND', 'Lesson not found.');
      }

      enr.lessonProgress[lessonId] = {
        watchPercent: 0,
        lastPositionSeconds: 0,
        completed: false,
      };
      persistMockDb();

      const completedCount = allLessons.filter((l) => enr.lessonProgress[l.id]?.completed).length;
      const courseProgressPercent = Math.round((completedCount / allLessons.length) * 100);

      return jsonOk({
        lessonId,
        courseId,
        watchPercent: 0,
        lastPositionSeconds: 0,
        completed: false,
        courseProgressPercent,
      });
    }
  ),
];
