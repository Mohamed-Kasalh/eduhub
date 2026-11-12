import { http } from 'msw';
import {
  AutosaveExamAnswersRequestSchema,
  type ExamAttemptQuestionDto,
  type ExamAttemptResultDto,
  type ExamConfigDto,
  type ExamReviewQuestionDto,
  type QuestionDto,
} from '../../api/dto';
import { getMockDb, nextDbId, nowUtcIso, persistMockDb } from '../db';
import {
  apiEndpoint,
  jsonError,
  jsonOk,
  parseJsonBody,
  requireAuth,
  simulateNetwork,
} from '../helpers';
import { buildExamAttemptSummary, type MockExamAttemptRecord } from '../seed';

function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function getCourseExamConfig(courseId: string): ExamConfigDto | null {
  const db = getMockDb();
  const explicit = db.examConfigs[courseId];
  if (explicit) return explicit;
  const course = db.courses.find((c) => c.id === courseId);
  if (!course) return null;
  const sections = db.curricula[courseId] ?? [];
  return {
    id: `exam-${courseId}`,
    courseId,
    courseTitle: course.title,
    title: `${course.title} Final Exam`,
    durationSeconds: 1200,
    passingScorePercent: course.passingScorePercent,
    totalQuestions: 5,
    attemptsAllowed: 3,
    shuffleQuestions: false,
    shuffleOptions: false,
    difficultyMix: { easyPercent: 40, mediumPercent: 40, hardPercent: 20 },
    coveredSectionIds: sections.map((s) => s.id),
  };
}

function drawQuestionsForAttempt(courseId: string, config: ExamConfigDto): QuestionDto[] {
  const db = getMockDb();
  const eligiblePool = db.questions.filter(
    (q) =>
      q.courseId === courseId &&
      (config.coveredSectionIds.length === 0 || config.coveredSectionIds.includes(q.sectionId))
  );

  const easyPool = eligiblePool.filter((q) => q.difficulty === 'easy');
  const medPool = eligiblePool.filter((q) => q.difficulty === 'medium');
  const hardPool = eligiblePool.filter((q) => q.difficulty === 'hard');

  const easyTarget = Math.round((config.totalQuestions * config.difficultyMix.easyPercent) / 100);
  const medTarget = Math.round((config.totalQuestions * config.difficultyMix.mediumPercent) / 100);
  const hardTarget = Math.max(0, config.totalQuestions - easyTarget - medTarget);

  const pick = (pool: QuestionDto[], n: number) =>
    (config.shuffleQuestions ? shuffleArray(pool) : pool).slice(0, n);

  const chosen: QuestionDto[] = [
    ...pick(easyPool, easyTarget),
    ...pick(medPool, medTarget),
    ...pick(hardPool, hardTarget),
  ];

  const chosenIds = new Set(chosen.map((q) => q.id));
  const remaining = eligiblePool.filter((q) => !chosenIds.has(q.id));
  const orderedRemaining = config.shuffleQuestions ? shuffleArray(remaining) : remaining;

  for (const q of orderedRemaining) {
    if (chosen.length >= config.totalQuestions) break;
    chosen.push(q);
  }

  return config.shuffleQuestions ? shuffleArray(chosen) : chosen;
}

function gradeAttempt(attempt: MockExamAttemptRecord): ExamAttemptResultDto {
  const db = getMockDb();
  const config = getCourseExamConfig(attempt.courseId);
  const maxAttempts = config?.attemptsAllowed ?? 3;
  const courseAttempts = db.examAttempts.filter(
    (a) => a.userId === attempt.userId && a.courseId === attempt.courseId
  );

  let earnedPoints = 0;
  let totalPoints = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  const sectionBuckets: Record<
    string,
    { sectionId: string; sectionName: string; correctCount: number; totalCount: number }
  > = {};

  const reviewQuestions: ExamReviewQuestionDto[] = attempt.questions.map((q) => {
    totalPoints += q.points;
    const selected = [...(attempt.answers[q.id] ?? [])].sort((a, b) => a - b);
    const expected = [...q.displayCorrectIndices].sort((a, b) => a - b);

    if (!sectionBuckets[q.sectionId]) {
      sectionBuckets[q.sectionId] = {
        sectionId: q.sectionId,
        sectionName: q.sectionName,
        correctCount: 0,
        totalCount: 0,
      };
    }
    sectionBuckets[q.sectionId].totalCount += 1;

    let outcome: 'correct' | 'wrong' | 'skipped' = 'skipped';
    let pointsAwarded = 0;
    if (selected.length === 0) {
      skippedCount += 1;
      outcome = 'skipped';
    } else if (
      selected.length === expected.length &&
      selected.every((v, idx) => v === expected[idx])
    ) {
      correctCount += 1;
      earnedPoints += q.points;
      pointsAwarded = q.points;
      outcome = 'correct';
      sectionBuckets[q.sectionId].correctCount += 1;
    } else {
      wrongCount += 1;
      outcome = 'wrong';
    }

    return {
      id: q.id,
      number: q.number,
      type: q.type,
      sectionId: q.sectionId,
      sectionName: q.sectionName,
      prompt: q.prompt,
      options: q.displayOptions,
      points: q.points,
      difficulty: q.difficulty,
      imageUrl: q.imageUrl ?? null,
      imageCaption: q.imageCaption ?? null,
      selectedIndices: selected,
      correctIndices: expected,
      outcome,
      pointsAwarded,
      explanation: q.explanation,
    };
  });

  const scorePercent =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = scorePercent >= attempt.passingScorePercent;

  attempt.correctCount = correctCount;
  attempt.wrongCount = wrongCount;
  attempt.skippedCount = skippedCount;
  attempt.scorePercent = scorePercent;
  attempt.passed = passed;

  const summary = buildExamAttemptSummary(attempt);
  const attemptsUsed = courseAttempts.length;

  return {
    ...summary,
    passingScorePercent: attempt.passingScorePercent,
    attemptsUsed,
    attemptsRemaining: Math.max(0, maxAttempts - attemptsUsed),
    sectionBreakdown: Object.values(sectionBuckets).map((b) => ({
      ...b,
      scorePercent:
        b.totalCount > 0 ? Math.round((b.correctCount / b.totalCount) * 100) : 0,
    })),
    reviewQuestions,
    certificateEligible: passed,
  };
}

export const examsHandlers = [
  http.get(apiEndpoint('/courses/:id/exam'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const courseId = String(params.id);
    const config = getCourseExamConfig(courseId);
    if (!config) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const db = getMockDb();
    const enr = db.enrollments.find(
      (e) => e.userId === auth.userRecord.user.id && e.courseId === courseId
    );
    if (!enr) {
      return jsonError(403, 'NOT_ENROLLED', 'Enroll in this course to access the exam.');
    }

    const allLessons = (db.curricula[courseId] ?? []).flatMap((s) => s.lessons);
    const lessonsCompleted = allLessons.filter((l) => enr.lessonProgress[l.id]?.completed).length;
    const totalLessons = allLessons.length;
    const courseProgressPercent =
      totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 100;

    const attempts = db.examAttempts.filter(
      (a) => a.userId === auth.userRecord.user.id && a.courseId === courseId
    );
    const submitted = attempts.filter((a) => a.status === 'submitted' || a.status === 'expired');
    const attemptsUsed = submitted.length;
    const attemptsRemaining = Math.max(0, config.attemptsAllowed - attemptsUsed);
    const bestScorePercent = submitted.reduce<number | null>(
      (best, a) => (best === null || a.scorePercent > best ? a.scorePercent : best),
      null
    );
    const passed = submitted.some((a) => a.passed);

    let reason: string | null = null;
    if (courseProgressPercent < 100) {
      reason = 'Complete all lessons before taking the certification exam.';
    } else if (attemptsRemaining === 0 && !passed) {
      reason = 'Maximum exam attempts reached.';
    }

    return jsonOk({
      config,
      eligibility: {
        eligible: courseProgressPercent >= 100 && attemptsRemaining > 0,
        lessonsCompleted,
        totalLessons,
        courseProgressPercent,
        attemptsUsed,
        attemptsRemaining,
        bestScorePercent,
        passed,
        reason,
      },
    });
  }),

  http.post(apiEndpoint('/courses/:id/exam/attempts'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const courseId = String(params.id);
    const config = getCourseExamConfig(courseId);
    if (!config) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const db = getMockDb();
    const enr = db.enrollments.find(
      (e) => e.userId === auth.userRecord.user.id && e.courseId === courseId
    );
    if (!enr) {
      return jsonError(403, 'NOT_ENROLLED', 'Enroll in this course to start an exam attempt.');
    }

    const allLessons = (db.curricula[courseId] ?? []).flatMap((s) => s.lessons);
    const completedLessons = allLessons.filter((l) => enr.lessonProgress[l.id]?.completed).length;
    if (allLessons.length > 0 && completedLessons < allLessons.length) {
      return jsonError(
        409,
        'ELIGIBILITY_UNMET',
        'All lessons must be completed before starting the final exam.'
      );
    }

    const existingAttempts = db.examAttempts.filter(
      (a) => a.userId === auth.userRecord.user.id && a.courseId === courseId
    );
    if (existingAttempts.length >= config.attemptsAllowed) {
      return jsonError(409, 'MAX_ATTEMPTS_REACHED', 'Maximum exam attempts reached.');
    }

    const drawn = drawQuestionsForAttempt(courseId, config);
    const attemptQuestions = drawn.map((q, idx) => {
      let displayOptions = [...q.options];
      let displayCorrectIndices = [...q.correctIndices];

      if (config.shuffleOptions && q.type !== 'boolean') {
        const indexed = q.options.map((opt, oldIdx) => ({
          opt,
          isCorrect: q.correctIndices.includes(oldIdx),
        }));
        const shuffled = shuffleArray(indexed);
        displayOptions = shuffled.map((item) => item.opt);
        displayCorrectIndices = shuffled
          .map((item, newIdx) => (item.isCorrect ? newIdx : -1))
          .filter((idxVal) => idxVal >= 0);
      }

      return {
        ...q,
        number: idx + 1,
        displayOptions,
        displayCorrectIndices,
      };
    });

    const startedMs = Date.now();
    const expiresMs = startedMs + config.durationSeconds * 1000;
    const record: MockExamAttemptRecord = {
      id: nextDbId('att'),
      attemptNumber: existingAttempts.length + 1,
      userId: auth.userRecord.user.id,
      courseId,
      status: 'in_progress',
      startedAt: new Date(startedMs).toISOString(),
      expiresAt: new Date(expiresMs).toISOString(),
      submittedAt: null,
      durationSeconds: config.durationSeconds,
      passingScorePercent: config.passingScorePercent,
      questions: attemptQuestions,
      answers: {},
      flaggedQuestionIds: [],
      scorePercent: 0,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: attemptQuestions.length,
      passed: false,
    };

    db.examAttempts.push(record);
    persistMockDb();

    // SECURITY: strip correctIndices & explanation strictly from student response
    const studentQuestions: ExamAttemptQuestionDto[] = record.questions.map((q) => ({
      id: q.id,
      number: q.number,
      type: q.type,
      sectionId: q.sectionId,
      sectionName: q.sectionName,
      prompt: q.prompt,
      options: q.displayOptions,
      points: q.points,
      difficulty: q.difficulty,
      imageUrl: q.imageUrl ?? null,
      imageCaption: q.imageCaption ?? null,
    }));

    return jsonOk(
      {
        attemptId: record.id,
        attemptNumber: record.attemptNumber,
        courseId,
        status: 'in_progress' as const,
        startedAt: record.startedAt,
        expiresAt: record.expiresAt,
        durationSeconds: record.durationSeconds,
        remainingSeconds: record.durationSeconds,
        passingScorePercent: record.passingScorePercent,
        questions: studentQuestions,
        answers: {},
        flaggedQuestionIds: [],
      },
      201
    );
  }),

  http.put(apiEndpoint('/exam-attempts/:id/answers'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const attempt = db.examAttempts.find((a) => a.id === String(params.id));
    if (!attempt) {
      return jsonError(404, 'ATTEMPT_NOT_FOUND', 'Exam attempt not found.');
    }
    if (attempt.userId !== auth.userRecord.user.id) {
      return jsonError(403, 'FORBIDDEN', 'You do not own this exam attempt.');
    }
    if (attempt.status !== 'in_progress') {
      return jsonError(409, 'ATTEMPT_LOCKED', 'This exam attempt has already ended.');
    }

    const parsed = await parseJsonBody(request, AutosaveExamAnswersRequestSchema);
    if (!parsed.ok) return parsed.response;

    const remainingMs = new Date(attempt.expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      attempt.status = 'expired';
      attempt.submittedAt = nowUtcIso();
      gradeAttempt(attempt);
      persistMockDb();
      return jsonError(409, 'ATTEMPT_EXPIRED', 'Exam attempt timer has expired.');
    }

    attempt.answers = parsed.data.answers;
    attempt.flaggedQuestionIds = parsed.data.flaggedQuestionIds;
    persistMockDb();

    return jsonOk({
      attemptId: attempt.id,
      savedAt: nowUtcIso(),
      remainingSeconds: Math.max(0, Math.round(remainingMs / 1000)),
      status: attempt.status,
    });
  }),

  http.post(apiEndpoint('/exam-attempts/:id/submit'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const attempt = db.examAttempts.find((a) => a.id === String(params.id));
    if (!attempt) {
      return jsonError(404, 'ATTEMPT_NOT_FOUND', 'Exam attempt not found.');
    }
    if (attempt.userId !== auth.userRecord.user.id) {
      return jsonError(403, 'FORBIDDEN', 'You do not own this exam attempt.');
    }
    if (attempt.status !== 'in_progress') {
      return jsonError(409, 'ALREADY_SUBMITTED', 'Exam attempt has already been submitted.');
    }

    const isExpired = new Date(attempt.expiresAt).getTime() <= Date.now();
    attempt.status = isExpired ? 'expired' : 'submitted';
    attempt.submittedAt = nowUtcIso();
    const result = gradeAttempt(attempt);
    persistMockDb();

    return jsonOk(result);
  }),

  http.get(apiEndpoint('/exam-attempts/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student', 'instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const attempt = db.examAttempts.find((a) => a.id === String(params.id));
    if (!attempt) {
      return jsonError(404, 'ATTEMPT_NOT_FOUND', 'Exam attempt not found.');
    }
    if (auth.userRecord.user.role === 'student' && attempt.userId !== auth.userRecord.user.id) {
      return jsonError(403, 'FORBIDDEN', 'You do not own this exam attempt.');
    }

    return jsonOk(gradeAttempt(attempt));
  }),

  http.get(apiEndpoint('/courses/:id/exam/attempts'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const courseId = String(params.id);
    const db = getMockDb();
    if (!db.courses.some((c) => c.id === courseId)) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const list = db.examAttempts
      .filter((a) => a.userId === auth.userRecord.user.id && a.courseId === courseId)
      .map(buildExamAttemptSummary);

    return jsonOk({ data: list });
  }),
];
