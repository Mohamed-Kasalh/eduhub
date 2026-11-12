import { http } from 'msw';
import {
  CreateCourseReviewRequestSchema,
  NewsletterSubscribeRequestSchema,
  type CourseDto,
  type FeaturedInstructorDto,
} from '../../api/dto';
import { getMockDb, nextDbId, nowUtcIso, persistMockDb, toUserSummary } from '../db';
import {
  apiEndpoint,
  jsonError,
  jsonOk,
  paginate,
  parseJsonBody,
  requireAuth,
  resolveOptionalAuthUser,
  simulateNetwork,
} from '../helpers';

function matchesDurationBucket(seconds: number, bucket: string): boolean {
  const hours = seconds / 3600;
  if (bucket === '0_2h') return hours <= 2;
  if (bucket === '2_5h') return hours > 2 && hours <= 5;
  if (bucket === '5_10h') return hours > 5 && hours <= 10;
  if (bucket === '10h_plus') return hours > 10;
  return true;
}

export const catalogHandlers = [
  http.get(apiEndpoint('/config'), async () => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const db = getMockDb();
    return jsonOk({
      platformName: db.platformSettings.platformName,
      currency: db.platformSettings.currency,
      defaultPassScorePercent: db.platformSettings.defaultPassScorePercent,
      lessonCompleteThresholdPercent: 90,
      uploadLimits: {
        avatarMaxBytes: db.platformSettings.maxAvatarSizeBytes,
        courseCoverMaxBytes: db.platformSettings.maxImageSizeBytes,
        lessonVideoMaxBytes: db.platformSettings.maxVideoSizeBytes,
        attachmentMaxBytes: 52_428_800,
      },
      featureFlags: {
        googleAuthEnabled: true,
        newsletterEnabled: true,
        certificatesEnabled: true,
      },
    });
  }),

  http.get(apiEndpoint('/public/stats'), async () => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const db = getMockDb();
    const published = db.courses.filter((c) => c.status === 'published');
    return jsonOk({
      totalCoursesCount: published.length,
      totalLearnersCount: published.reduce((acc, c) => acc + c.studentsCount, 0),
      averageRating: 4.8,
      popularTopics: [
        'React 19',
        'Python',
        'UI/UX Design',
        'Ethical Hacking',
        'TypeScript',
        'Figma',
      ],
    });
  }),

  http.get(apiEndpoint('/categories'), async () => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const db = getMockDb();
    const sorted = [...db.categories].sort((a, b) => a.order - b.order);
    return jsonOk({ data: sorted });
  }),

  http.get(apiEndpoint('/instructors'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const url = new URL(request.url);
    const featuredParam = url.searchParams.get('featured');
    const db = getMockDb();

    const list: FeaturedInstructorDto[] = Object.values(db.users)
      .filter((r) => r.user.role === 'instructor' && r.user.status === 'active')
      .map((r) => {
        const instCourses = db.courses.filter(
          (c) => c.instructor.id === r.user.id && c.status === 'published'
        );
        const learnersCount = instCourses.reduce((sum, c) => sum + c.studentsCount, 0);
        const avgRating =
          instCourses.length > 0
            ? Number(
                (
                  instCourses.reduce((sum, c) => sum + c.rating, 0) / instCourses.length
                ).toFixed(1)
              )
            : 4.8;
        return {
          id: r.user.id,
          name: r.user.name,
          title: r.user.title,
          field: r.user.expertiseTags[0] ?? 'Software & Design',
          avatarUrl: r.user.avatarUrl,
          bio: r.user.bio,
          learnersCount,
          rating: avgRating,
          coursesCount: instCourses.length,
          expertiseTags: r.user.expertiseTags,
        };
      });

    const filtered = featuredParam === 'true' ? list.slice(0, 4) : list;
    return jsonOk({ data: filtered });
  }),

  http.get(apiEndpoint('/testimonials'), async () => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    return jsonOk({ data: getMockDb().testimonials });
  }),

  http.get(apiEndpoint('/search/suggestions'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const db = getMockDb();

    const categories = db.categories
      .filter(
        (cat) =>
          !q ||
          cat.name.toLowerCase().includes(q) ||
          cat.description.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const courses = db.courses
      .filter(
        (course) =>
          course.status === 'published' &&
          (!q ||
            course.title.toLowerCase().includes(q) ||
            course.subtitle.toLowerCase().includes(q) ||
            course.tags.some((t) => t.toLowerCase().includes(q)))
      )
      .slice(0, 4);

    return jsonOk({ categories, courses });
  }),

  http.post(apiEndpoint('/newsletter/subscribe'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const parsed = await parseJsonBody(request, NewsletterSubscribeRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    const email = parsed.data.email.trim().toLowerCase();
    if (!db.newsletterSubscribers.includes(email)) {
      db.newsletterSubscribers.push(email);
      persistMockDb();
    }

    return jsonOk({ email, subscribed: true });
  }),

  http.get(apiEndpoint('/courses'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const categoryId = url.searchParams.get('categoryId');
    const subcategoryId = url.searchParams.get('subcategoryId');
    const instructorId = url.searchParams.get('instructorId');
    const level = url.searchParams.get('level');
    const minRating = url.searchParams.get('minRating');
    const duration = url.searchParams.get('duration');
    const language = url.searchParams.get('language');
    const price = url.searchParams.get('price');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const hasCertificate = url.searchParams.get('hasCertificate');
    const hasExam = url.searchParams.get('hasExam');
    const tab = url.searchParams.get('tab');
    const sort = url.searchParams.get('sort') ?? 'popular';

    const db = getMockDb();
    let results: CourseDto[] = db.courses.filter((c) => c.status === 'published');

    if (q) {
      results = results.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.subtitle.toLowerCase().includes(q) ||
          c.instructor.name.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (categoryId) results = results.filter((c) => c.category.id === categoryId);
    if (subcategoryId) results = results.filter((c) => c.subcategory?.id === subcategoryId);
    if (instructorId) results = results.filter((c) => c.instructor.id === instructorId);
    if (level) results = results.filter((c) => c.level === level);
    if (minRating !== null && minRating !== '') {
      const val = Number(minRating);
      if (Number.isFinite(val)) results = results.filter((c) => c.rating >= val);
    }
    if (duration) results = results.filter((c) => matchesDurationBucket(c.durationSeconds, duration));
    if (language) results = results.filter((c) => c.language === language);
    if (price === 'free' || tab === 'free') {
      results = results.filter((c) => c.isFree);
    } else if (price === 'paid') {
      results = results.filter((c) => !c.isFree);
    }
    if (minPrice !== null && minPrice !== '') {
      const val = Number(minPrice);
      if (Number.isFinite(val)) results = results.filter((c) => c.price.amount >= val);
    }
    if (maxPrice !== null && maxPrice !== '') {
      const val = Number(maxPrice);
      if (Number.isFinite(val)) results = results.filter((c) => c.price.amount <= val);
    }
    if (hasCertificate === 'true') results = results.filter((c) => c.includesCertificate);
    if (hasExam === 'true') results = results.filter((c) => c.includesExam);
    if (tab === 'new') results = results.filter((c) => c.isNew);
    if (tab === 'popular') results = results.filter((c) => c.featured || c.studentsCount >= 5000);

    results = [...results].sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'rating':
          return b.rating - a.rating;
        case 'price_asc':
          return a.price.amount - b.price.amount;
        case 'price_desc':
          return b.price.amount - a.price.amount;
        case 'popular':
        default:
          return b.studentsCount - a.studentsCount;
      }
    });

    return jsonOk(
      paginate(results, url.searchParams.get('page'), url.searchParams.get('limit'), 12)
    );
  }),

  http.get(apiEndpoint('/courses/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const db = getMockDb();
    const courseId = String(params.id);
    const course = db.courses.find((c) => c.id === courseId);
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const auth = resolveOptionalAuthUser(request);
    if (auth.error) return auth.error;
    const viewer = auth.userRecord;

    const canSeeUnpublished =
      viewer &&
      (viewer.user.role === 'admin' ||
        viewer.user.role === 'supervisor' ||
        (viewer.user.role === 'instructor' && course.instructor.id === viewer.user.id));

    if (course.status !== 'published' && !canSeeUnpublished) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const sections = db.curricula[courseId] ?? [];
    const instructorRec = db.users[course.instructor.id];
    const instructorCourses = db.courses.filter(
      (c) => c.instructor.id === course.instructor.id && c.status === 'published'
    );

    const enrollment = viewer
      ? db.enrollments.find(
          (e) => e.userId === viewer.user.id && e.courseId === course.id
        )
      : undefined;

    const totalLessons = sections.reduce((sum, s) => sum + s.lessonsCount, 0);
    const completedLessons = enrollment
      ? Object.values(enrollment.lessonProgress).filter((l) => l.completed).length
      : 0;
    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const nextLesson =
      sections
        .flatMap((s) => s.lessons)
        .find((l) => !enrollment?.lessonProgress[l.id]?.completed) ??
      sections[0]?.lessons[0] ??
      null;

    const hasReviewed = viewer
      ? db.reviews.some(
          (r) => r.review.courseId === course.id && r.review.author.id === viewer.user.id
        )
      : false;

    return jsonOk({
      ...course,
      description: course.description ?? course.subtitle,
      sections,
      instructorStats: {
        learnersCount: instructorCourses.reduce((s, c) => s + c.studentsCount, 0),
        coursesCount: instructorCourses.length,
        averageRating: course.rating || 4.8,
        bio: instructorRec?.user.bio ?? '',
      },
      ratingBreakdown: [
        { stars: 5, count: Math.round(course.reviewCount * 0.72), percent: 72 },
        { stars: 4, count: Math.round(course.reviewCount * 0.2), percent: 20 },
        { stars: 3, count: Math.round(course.reviewCount * 0.06), percent: 6 },
        { stars: 2, count: Math.round(course.reviewCount * 0.015), percent: 1.5 },
        { stars: 1, count: Math.round(course.reviewCount * 0.005), percent: 0.5 },
      ],
      viewerContext: {
        isEnrolled: Boolean(enrollment),
        isWishlisted: Boolean(viewer?.wishlistCourseIds.includes(course.id)),
        hasReviewed,
        progressPercent,
        nextLessonId: nextLesson ? nextLesson.id : null,
      },
    });
  }),

  http.get(apiEndpoint('/courses/:id/related'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(12, Number(url.searchParams.get('limit') ?? 4)));
    const related = db.courses
      .filter((c) => c.id !== course.id && c.status === 'published')
      .sort((a, b) => {
        const aSame = a.category.id === course.category.id ? 1 : 0;
        const bSame = b.category.id === course.category.id ? 1 : 0;
        if (bSame !== aSame) return bSame - aSame;
        return b.studentsCount - a.studentsCount;
      })
      .slice(0, limit);

    return jsonOk({ data: related });
  }),

  http.get(apiEndpoint('/courses/:id/reviews'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const db = getMockDb();
    const courseId = String(params.id);
    if (!db.courses.some((c) => c.id === courseId)) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const auth = resolveOptionalAuthUser(request);
    const viewerId = auth.userRecord?.user.id;
    const url = new URL(request.url);
    const matching = db.reviews
      .filter((r) => r.review.courseId === courseId)
      .map((r) => ({
        ...r.review,
        markedHelpfulByMe: viewerId ? r.helpfulUserIds.includes(viewerId) : false,
      }));

    return jsonOk(
      paginate(matching, url.searchParams.get('page'), url.searchParams.get('limit'), 8)
    );
  }),

  http.post(apiEndpoint('/courses/:id/reviews'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const enrolled = db.enrollments.some(
      (e) => e.userId === auth.userRecord.user.id && e.courseId === course.id
    );
    if (!enrolled) {
      return jsonError(403, 'NOT_ENROLLED', 'Enroll in this course to submit a review.');
    }

    const duplicate = db.reviews.some(
      (r) => r.review.courseId === course.id && r.review.author.id === auth.userRecord.user.id
    );
    if (duplicate) {
      return jsonError(409, 'ALREADY_REVIEWED', 'You have already reviewed this course.');
    }

    const parsed = await parseJsonBody(request, CreateCourseReviewRequestSchema);
    if (!parsed.ok) return parsed.response;

    const newReview = {
      id: nextDbId('rev'),
      courseId: course.id,
      author: toUserSummary(auth.userRecord),
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      helpfulCount: 0,
      markedHelpfulByMe: false,
      createdAt: nowUtcIso(),
    };

    db.reviews.unshift({ review: newReview, helpfulUserIds: [] });
    course.reviewCount += 1;
    persistMockDb();

    return jsonOk(newReview, 201);
  }),

  http.put(apiEndpoint('/reviews/:id/helpful'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const rec = db.reviews.find((r) => r.review.id === String(params.id));
    if (!rec) {
      return jsonError(404, 'REVIEW_NOT_FOUND', 'Review not found.');
    }

    if (!rec.helpfulUserIds.includes(auth.userRecord.user.id)) {
      rec.helpfulUserIds.push(auth.userRecord.user.id);
      rec.review.helpfulCount += 1;
    }
    rec.review.markedHelpfulByMe = true;
    persistMockDb();

    return jsonOk({
      reviewId: rec.review.id,
      helpfulCount: rec.review.helpfulCount,
      markedHelpfulByMe: true,
    });
  }),

  http.delete(apiEndpoint('/reviews/:id/helpful'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const rec = db.reviews.find((r) => r.review.id === String(params.id));
    if (!rec) {
      return jsonError(404, 'REVIEW_NOT_FOUND', 'Review not found.');
    }

    if (rec.helpfulUserIds.includes(auth.userRecord.user.id)) {
      rec.helpfulUserIds = rec.helpfulUserIds.filter((id) => id !== auth.userRecord.user.id);
      rec.review.helpfulCount = Math.max(0, rec.review.helpfulCount - 1);
    }
    rec.review.markedHelpfulByMe = false;
    persistMockDb();

    return jsonOk({
      reviewId: rec.review.id,
      helpfulCount: rec.review.helpfulCount,
      markedHelpfulByMe: false,
    });
  }),
];
