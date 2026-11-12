import { http } from 'msw';
import {
  CreateInstructorCourseRequestSchema,
  PutCurriculumRequestSchema,
  ResolveInstructorCommentRequestSchema,
  UpdateInstructorCourseRequestSchema,
  type CourseDto,
  type CurriculumSectionDto,
  type EnrolledStudentProgressDetailDto,
  type EnrolledStudentSummaryDto,
} from '../../api/dto';
import {
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
import { buildExamAttemptSummary } from '../seed';

function canManageCourse(userId: string, role: string, instructorId: string): boolean {
  return role === 'admin' || userId === instructorId;
}

export const instructorHandlers = [
  http.get(apiEndpoint('/instructor/dashboard'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const myCourses =
      auth.userRecord.user.role === 'admin'
        ? db.courses
        : db.courses.filter((c) => c.instructor.id === auth.userRecord.user.id);

    const published = myCourses.filter((c) => c.status === 'published');
    const pending = myCourses.filter((c) => c.status === 'pending_review');
    const draft = myCourses.filter((c) => c.status === 'draft');
    const rejected = myCourses.filter((c) => c.status === 'rejected');

    const totalLearners = published.reduce((sum, c) => sum + c.studentsCount, 0);
    const totalReviews = published.reduce((sum, c) => sum + c.reviewCount, 0);
    const avgRating =
      published.length > 0
        ? Number((published.reduce((s, c) => s + c.rating, 0) / published.length).toFixed(1))
        : 0;
    const avgCompletion =
      published.length > 0
        ? Math.round(
            published.reduce((s, c) => s + (c.completionRatePercent ?? 75), 0) /
              published.length
          )
        : 0;

    const myCourseIds = new Set(myCourses.map((c) => c.id));
    const relatedComments = db.comments.filter((c) => myCourseIds.has(c.course.id));
    const unansweredCount = relatedComments.filter((c) => !c.resolved).length;

    return jsonOk({
      kpis: {
        totalCoursesCount: myCourses.length,
        publishedCount: published.length,
        pendingReviewCount: pending.length,
        draftCount: draft.length,
        rejectedCount: rejected.length,
        totalLearnersCount: totalLearners,
        newLearnersLast30Days: Math.round(totalLearners * 0.08),
        averageRating: avgRating,
        totalReviewsCount: totalReviews,
        averageCompletionRatePercent: avgCompletion,
      },
      enrollmentChart: [
        { date: '2026-03-19', enrollments: 42, completions: 14 },
        { date: '2026-03-20', enrollments: 58, completions: 19 },
        { date: '2026-03-21', enrollments: 49, completions: 16 },
        { date: '2026-03-22', enrollments: 64, completions: 22 },
        { date: '2026-03-23', enrollments: 71, completions: 25 },
        { date: '2026-03-24', enrollments: 83, completions: 29 },
        { date: '2026-03-25', enrollments: 77, completions: 26 },
      ],
      recentComments: relatedComments.slice(0, 5),
      unansweredCommentsCount: unansweredCount,
      topPerformingCourses: [...published]
        .sort((a, b) => b.studentsCount - a.studentsCount)
        .slice(0, 4),
      notices: {
        pendingCourses: pending,
        rejectedCourses: rejected,
      },
    });
  }),

  http.get(apiEndpoint('/instructor/courses'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'all';
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();

    const db = getMockDb();
    let list =
      auth.userRecord.user.role === 'admin'
        ? [...db.courses]
        : db.courses.filter((c) => c.instructor.id === auth.userRecord.user.id);

    if (status !== 'all') {
      list = list.filter((c) => c.status === status);
    }
    if (q) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.name.toLowerCase().includes(q)
      );
    }

    return jsonOk(
      paginate(list, url.searchParams.get('page'), url.searchParams.get('limit'), 12)
    );
  }),

  http.post(apiEndpoint('/instructor/courses'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, CreateInstructorCourseRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    const category = db.categories.find((c) => c.id === parsed.data.categoryId);
    if (!category) {
      return jsonError(422, 'VALIDATION_ERROR', 'Selected category does not exist.', {
        categoryId: ['Category not found.'],
      });
    }

    const subcategory = parsed.data.subcategoryId
      ? category.subcategories?.find((s) => s.id === parsed.data.subcategoryId) ?? null
      : null;

    const courseId = nextDbId('course');
    const now = nowUtcIso();
    const user = auth.userRecord.user;

    const created: CourseDto = {
      id: courseId,
      title: parsed.data.title,
      subtitle: parsed.data.subtitle ?? parsed.data.title,
      description:
        parsed.data.description ??
        'Complete instructor syllabus covering practical theory, guided projects, and certification assessments.',
      instructor: {
        id: user.id,
        name: user.name,
        title: user.title,
        avatarUrl: user.avatarUrl,
      },
      category: { id: category.id, name: category.name },
      subcategory: subcategory ? { id: subcategory.id, name: subcategory.name } : null,
      thumbnailUrl:
        parsed.data.thumbnailUrl ??
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1080',
      previewVideoUrl: parsed.data.previewVideoUrl ?? null,
      rating: 0,
      reviewCount: 0,
      studentsCount: 0,
      price: parsed.data.price,
      originalPrice: parsed.data.originalPrice ?? null,
      isFree: parsed.data.isFree || parsed.data.price.amount === 0,
      level: parsed.data.level,
      language: parsed.data.language,
      durationSeconds: 0,
      lessonsCount: 0,
      sectionsCount: 0,
      featured: false,
      isNew: true,
      includesCertificate: true,
      includesExam: true,
      passingScorePercent: db.platformSettings.defaultPassScorePercent,
      unavailable: false,
      status: 'draft',
      learningPoints: parsed.data.learningPoints ?? [],
      requirements: parsed.data.requirements ?? [],
      tags: parsed.data.tags,
      completionRatePercent: 0,
      rejectionReason: null,
      submittedAt: null,
      updatedAt: now,
      createdAt: now,
    };

    db.courses.unshift(created);
    db.curricula[courseId] = [];
    user.coursesCount += 1;
    persistMockDb();

    return jsonOk(created, 201);
  }),

  http.get(apiEndpoint('/instructor/courses/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }
    if (!canManageCourse(auth.userRecord.user.id, auth.userRecord.user.role, course.instructor.id)) {
      return jsonError(403, 'NOT_OWNER', 'You do not own this course.');
    }

    const sections = db.curricula[course.id] ?? [];
    const examConfig = db.examConfigs[course.id];
    const bankCount = db.questions.filter((q) => q.courseId === course.id).length;

    return jsonOk({
      ...course,
      description: course.description ?? course.subtitle,
      sections,
      linkedQuestionBankCourseId: course.id,
      examQuestionsCount: examConfig?.totalQuestions ?? bankCount,
      examPassScorePercent: examConfig?.passingScorePercent ?? course.passingScorePercent,
      examDurationSeconds: examConfig?.durationSeconds ?? 1800,
    });
  }),

  http.patch(apiEndpoint('/instructor/courses/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }
    if (!canManageCourse(auth.userRecord.user.id, auth.userRecord.user.role, course.instructor.id)) {
      return jsonError(403, 'NOT_OWNER', 'You do not own this course.');
    }

    const parsed = await parseJsonBody(request, UpdateInstructorCourseRequestSchema);
    if (!parsed.ok) return parsed.response;

    if (parsed.data.title !== undefined) course.title = parsed.data.title;
    if (parsed.data.subtitle !== undefined) course.subtitle = parsed.data.subtitle;
    if (parsed.data.description !== undefined) course.description = parsed.data.description;
    if (parsed.data.level !== undefined) course.level = parsed.data.level;
    if (parsed.data.language !== undefined) course.language = parsed.data.language;
    if (parsed.data.tags !== undefined) course.tags = parsed.data.tags;
    if (parsed.data.thumbnailUrl !== undefined) course.thumbnailUrl = parsed.data.thumbnailUrl;
    if (parsed.data.previewVideoUrl !== undefined) {
      course.previewVideoUrl = parsed.data.previewVideoUrl;
    }
    if (parsed.data.price !== undefined) course.price = parsed.data.price;
    if (parsed.data.originalPrice !== undefined) {
      course.originalPrice = parsed.data.originalPrice;
    }
    if (parsed.data.isFree !== undefined) course.isFree = parsed.data.isFree;
    if (parsed.data.learningPoints !== undefined) {
      course.learningPoints = parsed.data.learningPoints;
    }
    if (parsed.data.requirements !== undefined) {
      course.requirements = parsed.data.requirements;
    }
    if (parsed.data.categoryId !== undefined) {
      const cat = db.categories.find((c) => c.id === parsed.data.categoryId);
      if (cat) course.category = { id: cat.id, name: cat.name };
    }

    course.updatedAt = nowUtcIso();
    persistMockDb();
    return jsonOk(course);
  }),

  http.delete(apiEndpoint('/instructor/courses/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }
    if (!canManageCourse(auth.userRecord.user.id, auth.userRecord.user.role, course.instructor.id)) {
      return jsonError(403, 'NOT_OWNER', 'You do not own this course.');
    }

    db.courses = db.courses.filter((c) => c.id !== course.id);
    delete db.curricula[course.id];
    persistMockDb();
    return jsonOk({ success: true, message: 'Course deleted.' });
  }),

  http.put(apiEndpoint('/instructor/courses/:id/curriculum'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }
    if (!canManageCourse(auth.userRecord.user.id, auth.userRecord.user.role, course.instructor.id)) {
      return jsonError(403, 'NOT_OWNER', 'You do not own this course.');
    }

    const parsed = await parseJsonBody(request, PutCurriculumRequestSchema);
    if (!parsed.ok) return parsed.response;

    let runningLessonNum = 0;
    const normalizedSections: CurriculumSectionDto[] = parsed.data.sections
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((sec, sIdx) => {
        const secId = sec.id ?? nextDbId('sec');
        const lessons = sec.lessons
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((les) => {
            runningLessonNum += 1;
            return {
              id: les.id ?? nextDbId('lesson'),
              sectionId: secId,
              courseId: course.id,
              number: runningLessonNum,
              title: les.title,
              type: les.type,
              durationSeconds: les.durationSeconds,
              isPreview: les.isPreview,
              requiresPrevious: runningLessonNum > 1 && !les.isPreview,
              videoUrl: les.videoUrl ?? null,
              summary: `${les.title} — guided walkthrough and exercises.`,
              keyTakeaways: [`Master key concepts from ${les.title}`],
              attachments: les.attachmentUrl
                ? [
                    {
                      id: nextDbId('att'),
                      title: les.attachmentName ?? `${les.title}.pdf`,
                      fileType: 'pdf' as const,
                      sizeBytes: 1_024_000,
                      description: 'Lesson workbook attachment',
                      url: les.attachmentUrl,
                    },
                  ]
                : [],
            };
          });

        return {
          id: secId,
          title: sec.title,
          order: sIdx,
          lessonsCount: lessons.length,
          durationSeconds: lessons.reduce((acc, l) => acc + l.durationSeconds, 0),
          lessons,
        };
      });

    db.curricula[course.id] = normalizedSections;
    const totalLessonsCount = normalizedSections.reduce((s, sec) => s + sec.lessonsCount, 0);
    const totalDurationSeconds = normalizedSections.reduce((s, sec) => s + sec.durationSeconds, 0);

    course.sectionsCount = normalizedSections.length;
    course.lessonsCount = totalLessonsCount;
    course.durationSeconds = totalDurationSeconds;
    course.updatedAt = nowUtcIso();
    persistMockDb();

    return jsonOk({
      courseId: course.id,
      sections: normalizedSections,
      totalLessonsCount,
      totalDurationSeconds,
    });
  }),

  http.post(apiEndpoint('/instructor/courses/:id/submit'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }
    if (!canManageCourse(auth.userRecord.user.id, auth.userRecord.user.role, course.instructor.id)) {
      return jsonError(403, 'NOT_OWNER', 'You do not own this course.');
    }

    const sections = db.curricula[course.id] ?? [];
    const lessonsCount = sections.reduce((sum, s) => sum + s.lessonsCount, 0);
    const bankCount = db.questions.filter((q) => q.courseId === course.id).length;
    const requiredBank = db.examConfigs[course.id]?.totalQuestions ?? 5;

    const fieldErrors: Record<string, string[]> = {};
    if (sections.length < 2) {
      fieldErrors.sections = ['Course must contain at least 2 curriculum sections.'];
    }
    if (lessonsCount < 3) {
      fieldErrors.lessons = ['Course must include at least 3 lessons before submission.'];
    }
    if (!course.thumbnailUrl) {
      fieldErrors.thumbnailUrl = ['Upload a course cover image before submitting.'];
    }
    if (course.includesExam && bankCount < requiredBank) {
      fieldErrors.questions = [
        `Question bank needs at least ${requiredBank} questions (found ${bankCount}).`,
      ];
    }

    if (Object.keys(fieldErrors).length > 0) {
      return jsonError(
        422,
        'VALIDATION_ERROR',
        'Course does not meet all publishing checklist requirements.',
        fieldErrors
      );
    }

    const now = nowUtcIso();
    course.status = 'pending_review';
    course.rejectionReason = null;
    course.submittedAt = now;
    course.updatedAt = now;

    const totalDuration = sections.reduce((sum, s) => sum + s.durationSeconds, 0);
    const existingSub = db.courseReviewSubmissions.find((s) => s.course.id === course.id);
    if (existingSub) {
      existingSub.course = course;
      existingSub.submittedAt = now;
      existingSub.sectionsCount = sections.length;
      existingSub.lessonsCount = lessonsCount;
      existingSub.totalDurationSeconds = totalDuration;
      existingSub.questionBankCount = bankCount;
      existingSub.requiredQuestionsCount = requiredBank;
      existingSub.reviewDecision = 'pending_review';
      existingSub.reviewNotes = null;
    } else {
      db.courseReviewSubmissions.unshift({
        id: nextDbId('sub'),
        course,
        submittedAt: now,
        sectionsCount: sections.length,
        lessonsCount,
        totalDurationSeconds: totalDuration,
        questionBankCount: bankCount,
        requiredQuestionsCount: requiredBank,
        reviewDecision: 'pending_review',
        reviewNotes: null,
        checklist: {
          titleAndDescription: 'pass',
          coverAndDemoVideo: course.previewVideoUrl ? 'pass' : 'fail',
          curriculumComplete: 'pass',
          enoughQuestionsInBank: 'pass',
          pricingSet: 'pass',
        },
      });
    }

    pushMockNotification({
      title: 'New course submitted for review',
      message: `${course.instructor.name} submitted "${course.title}" for quality approval.`,
      type: 'moderation',
      link: `/supervisor/course-reviews/${course.id}`,
      roles: ['supervisor', 'admin'],
    });

    persistMockDb();
    return jsonOk(course);
  }),

  http.get(apiEndpoint('/instructor/students'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const courseIdFilter = url.searchParams.get('courseId');
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();

    const db = getMockDb();
    const myCourseIds = new Set(
      (auth.userRecord.user.role === 'admin'
        ? db.courses
        : db.courses.filter((c) => c.instructor.id === auth.userRecord.user.id)
      ).map((c) => c.id)
    );

    const rows: EnrolledStudentSummaryDto[] = [];
    for (const enr of db.enrollments) {
      if (!myCourseIds.has(enr.courseId)) continue;
      if (courseIdFilter && enr.courseId !== courseIdFilter) continue;

      const userRec = db.users[enr.userId];
      const course = db.courses.find((c) => c.id === enr.courseId);
      if (!userRec || !course) continue;

      const allLessons = (db.curricula[course.id] ?? []).flatMap((s) => s.lessons);
      const totalLessons = allLessons.length || course.lessonsCount;
      const completedLessons = allLessons.filter(
        (l) => enr.lessonProgress[l.id]?.completed
      ).length;
      const progressPercent =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      const attempts = db.examAttempts.filter(
        (a) => a.userId === enr.userId && a.courseId === course.id && a.status === 'submitted'
      );
      const bestScore = attempts.reduce<number | null>(
        (best, a) => (best === null || a.scorePercent > best ? a.scorePercent : best),
        null
      );
      const examPassed = attempts.some((a) => a.passed);

      rows.push({
        enrollmentId: enr.id,
        student: { ...toUserSummary(userRec), email: userRec.user.email },
        course: { id: course.id, title: course.title },
        progressPercent,
        completedLessons,
        totalLessons,
        lastActiveAt: enr.lastAccessedAt ?? enr.enrolledAt,
        bestExamScorePercent: bestScore,
        examPassed,
        certificateIssued: Boolean(enr.certificateId),
        certificateId: enr.certificateId,
      });
    }

    const filtered = q
      ? rows.filter(
          (r) =>
            r.student.name.toLowerCase().includes(q) ||
            r.student.email.toLowerCase().includes(q) ||
            r.course.title.toLowerCase().includes(q)
        )
      : rows;

    return jsonOk(
      paginate(filtered, url.searchParams.get('page'), url.searchParams.get('limit'), 12)
    );
  }),

  http.get(apiEndpoint('/instructor/students/:id/progress'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const studentId = String(params.id);
    const url = new URL(request.url);
    const courseIdParam = url.searchParams.get('courseId');

    const db = getMockDb();
    const userRec = db.users[studentId];
    if (!userRec) {
      return jsonError(404, 'STUDENT_NOT_FOUND', 'Student not found.');
    }

    const enr = db.enrollments.find(
      (e) => e.userId === studentId && (!courseIdParam || e.courseId === courseIdParam)
    );
    if (!enr) {
      return jsonError(404, 'STUDENT_NOT_FOUND', 'Student enrollment not found.');
    }

    const course = db.courses.find((c) => c.id === enr.courseId);
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const sections = db.curricula[course.id] ?? [];
    const flatLessons = sections.flatMap((sec) =>
      sec.lessons.map((l) => ({ secTitle: sec.title, lesson: l }))
    );
    const lessonBreakdown = flatLessons.map(({ secTitle, lesson }) => {
      const p = enr.lessonProgress[lesson.id];
      const completed = Boolean(p?.completed);
      const watchPercent = p?.watchPercent ?? 0;
      return {
        lessonId: lesson.id,
        sectionId: lesson.sectionId,
        sectionTitle: secTitle,
        number: lesson.number,
        title: lesson.title,
        type: lesson.type,
        durationSeconds: lesson.durationSeconds,
        watchPercent,
        lastPositionSeconds: p?.lastPositionSeconds ?? 0,
        completed,
        locked: false,
        status: completed
          ? ('completed' as const)
          : watchPercent > 0
            ? ('in_progress' as const)
            : ('not_started' as const),
      };
    });

    const completedLessons = lessonBreakdown.filter((l) => l.completed).length;
    const totalLessons = lessonBreakdown.length || 1;
    const progressPercent = Math.round((completedLessons / totalLessons) * 100);
    const examAttempts = db.examAttempts
      .filter((a) => a.userId === studentId && a.courseId === course.id)
      .map(buildExamAttemptSummary);
    const bestScore = examAttempts.reduce<number | null>(
      (best, a) => (best === null || a.scorePercent > best ? a.scorePercent : best),
      null
    );

    const detail: EnrolledStudentProgressDetailDto = {
      enrollmentId: enr.id,
      student: { ...toUserSummary(userRec), email: userRec.user.email },
      course: { id: course.id, title: course.title },
      progressPercent,
      completedLessons,
      totalLessons: lessonBreakdown.length,
      lastActiveAt: enr.lastAccessedAt ?? enr.enrolledAt,
      bestExamScorePercent: bestScore,
      examPassed: examAttempts.some((a) => a.passed),
      certificateIssued: Boolean(enr.certificateId),
      certificateId: enr.certificateId,
      maxAttemptsAllowed: db.examConfigs[course.id]?.attemptsAllowed ?? 3,
      lessonBreakdown,
      examAttempts,
    };

    return jsonOk(detail);
  }),

  http.get(apiEndpoint('/instructor/comments'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'unanswered';
    const courseIdFilter = url.searchParams.get('courseId');

    const myCourseIds = new Set(
      (auth.userRecord.user.role === 'admin'
        ? db.courses
        : db.courses.filter((c) => c.instructor.id === auth.userRecord.user.id)
      ).map((c) => c.id)
    );

    let list = db.comments.filter((c) => myCourseIds.has(c.course.id));
    if (courseIdFilter) {
      list = list.filter((c) => c.course.id === courseIdFilter);
    }
    if (status === 'unanswered') {
      list = list.filter((c) => !c.resolved);
    }

    return jsonOk(
      paginate(list, url.searchParams.get('page'), url.searchParams.get('limit'), 12)
    );
  }),

  http.patch(apiEndpoint('/instructor/comments/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const comment = db.comments.find((c) => c.id === String(params.id));
    if (!comment) {
      return jsonError(404, 'COMMENT_NOT_FOUND', 'Comment not found.');
    }

    const parsed = await parseJsonBody(request, ResolveInstructorCommentRequestSchema);
    if (!parsed.ok) return parsed.response;

    comment.resolved = parsed.data.resolved;
    comment.updatedAt = nowUtcIso();
    persistMockDb();
    return jsonOk(comment);
  }),
];
