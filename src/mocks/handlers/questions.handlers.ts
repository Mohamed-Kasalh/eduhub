import { http } from 'msw';
import { z } from 'zod';
import {
  BulkDeleteQuestionsRequestSchema,
  CreateQuestionRequestSchema,
  UpdateExamSettingsRequestSchema,
  UpdateQuestionRequestSchema,
  type QuestionDto,
} from '../../api/dto';
import { getMockDb, nextDbId, nowUtcIso, persistMockDb } from '../db';
import {
  apiEndpoint,
  isUploadedBlobLike,
  jsonError,
  jsonOk,
  paginate,
  parseJsonBody,
  requireAuth,
  simulateNetwork,
} from '../helpers';

const CsvTextSchema = z.object({
  csvText: z.string().min(1, 'CSV content cannot be empty.'),
});

function canManageCourse(userId: string, role: string, courseInstructorId: string): boolean {
  return role === 'admin' || userId === courseInstructorId;
}

export const questionsHandlers = [
  http.get(apiEndpoint('/instructor/courses/:id/questions'), async ({ request, params }) => {
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

    const url = new URL(request.url);
    const sectionId = url.searchParams.get('sectionId');
    const difficulty = url.searchParams.get('difficulty');
    const type = url.searchParams.get('type');
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();

    let list = db.questions.filter((item) => item.courseId === course.id);
    if (sectionId) list = list.filter((item) => item.sectionId === sectionId);
    if (difficulty) list = list.filter((item) => item.difficulty === difficulty);
    if (type) list = list.filter((item) => item.type === type);
    if (q) {
      list = list.filter(
        (item) =>
          item.prompt.toLowerCase().includes(q) ||
          item.sectionName.toLowerCase().includes(q)
      );
    }

    return jsonOk(
      paginate(list, url.searchParams.get('page'), url.searchParams.get('limit'), 15)
    );
  }),

  http.post(apiEndpoint('/instructor/courses/:id/questions'), async ({ request, params }) => {
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

    const parsed = await parseJsonBody(request, CreateQuestionRequestSchema);
    if (!parsed.ok) return parsed.response;

    const sections = db.curricula[course.id] ?? [];
    const section = sections.find((s) => s.id === parsed.data.sectionId);
    const now = nowUtcIso();

    const created: QuestionDto = {
      id: nextDbId('iq'),
      courseId: course.id,
      courseTitle: course.title,
      sectionId: parsed.data.sectionId,
      sectionName: section?.title ?? 'General Module',
      type: parsed.data.type,
      prompt: parsed.data.prompt,
      options: parsed.data.options,
      correctIndices: parsed.data.correctIndices,
      difficulty: parsed.data.difficulty,
      points: parsed.data.points,
      timesUsed: 0,
      explanation: parsed.data.explanation,
      imageUrl: parsed.data.imageUrl ?? null,
      imageCaption: parsed.data.imageCaption ?? null,
      createdAt: now,
      updatedAt: now,
    };

    db.questions.unshift(created);
    persistMockDb();
    return jsonOk(created, 201);
  }),

  http.patch(apiEndpoint('/instructor/questions/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const question = db.questions.find((q) => q.id === String(params.id));
    if (!question) {
      return jsonError(404, 'QUESTION_NOT_FOUND', 'Question not found.');
    }
    const course = db.courses.find((c) => c.id === question.courseId);
    if (
      course &&
      !canManageCourse(auth.userRecord.user.id, auth.userRecord.user.role, course.instructor.id)
    ) {
      return jsonError(403, 'NOT_OWNER', 'You do not own this course.');
    }

    const parsed = await parseJsonBody(request, UpdateQuestionRequestSchema);
    if (!parsed.ok) return parsed.response;

    if (parsed.data.sectionId !== undefined) {
      question.sectionId = parsed.data.sectionId;
      const section = (db.curricula[question.courseId] ?? []).find(
        (s) => s.id === parsed.data.sectionId
      );
      if (section) question.sectionName = section.title;
    }
    if (parsed.data.type !== undefined) question.type = parsed.data.type;
    if (parsed.data.prompt !== undefined) question.prompt = parsed.data.prompt;
    if (parsed.data.options !== undefined) question.options = parsed.data.options;
    if (parsed.data.correctIndices !== undefined) {
      question.correctIndices = parsed.data.correctIndices;
    }
    if (parsed.data.difficulty !== undefined) question.difficulty = parsed.data.difficulty;
    if (parsed.data.points !== undefined) question.points = parsed.data.points;
    if (parsed.data.explanation !== undefined) question.explanation = parsed.data.explanation;
    if (parsed.data.imageUrl !== undefined) question.imageUrl = parsed.data.imageUrl;
    if (parsed.data.imageCaption !== undefined) {
      question.imageCaption = parsed.data.imageCaption;
    }
    question.updatedAt = nowUtcIso();
    persistMockDb();

    return jsonOk(question);
  }),

  http.delete(apiEndpoint('/instructor/questions/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const question = db.questions.find((q) => q.id === String(params.id));
    if (!question) {
      return jsonError(404, 'QUESTION_NOT_FOUND', 'Question not found.');
    }
    const course = db.courses.find((c) => c.id === question.courseId);
    if (
      course &&
      !canManageCourse(auth.userRecord.user.id, auth.userRecord.user.role, course.instructor.id)
    ) {
      return jsonError(403, 'NOT_OWNER', 'You do not own this course.');
    }

    db.questions = db.questions.filter((q) => q.id !== question.id);
    persistMockDb();
    return jsonOk({ success: true, message: 'Question deleted.' });
  }),

  http.post(apiEndpoint('/instructor/questions/bulk-delete'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['instructor', 'admin']);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, BulkDeleteQuestionsRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    const targetIds = new Set(parsed.data.ids);
    const deletedIds: string[] = [];

    db.questions = db.questions.filter((q) => {
      if (!targetIds.has(q.id)) return true;
      const course = db.courses.find((c) => c.id === q.courseId);
      if (
        !course ||
        canManageCourse(auth.userRecord.user.id, auth.userRecord.user.role, course.instructor.id)
      ) {
        deletedIds.push(q.id);
        return false;
      }
      return true;
    });

    persistMockDb();
    return jsonOk({ deletedCount: deletedIds.length, deletedIds });
  }),

  http.post(
    apiEndpoint('/instructor/courses/:id/questions/import'),
    async ({ request, params }) => {
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

      let csvText = '';
      const contentType = request.headers.get('content-type') ?? '';
      if (contentType.includes('multipart/form-data')) {
        const fd = await request.formData();
        const file = fd.get('file');
        if (!isUploadedBlobLike(file)) {
          return jsonError(400, 'BAD_REQUEST', 'Missing CSV file.');
        }
        csvText = await file.text();
      } else {
        const parsed = await parseJsonBody(request, CsvTextSchema);
        if (!parsed.ok) return parsed.response;
        csvText = parsed.data.csvText;
      }

      const lines = csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      const startIndex =
        lines[0]?.toLowerCase().startsWith('question,') ? 1 : 0;
      const defaultSection = (db.curricula[course.id] ?? [])[0] ?? {
        id: 'sec-1',
        title: 'Foundations & Architecture',
      };

      const importedQuestions: QuestionDto[] = [];
      const errors: Array<{ row: number; message: string }> = [];
      const now = nowUtcIso();

      for (let i = startIndex; i < lines.length; i++) {
        const rowNum = i + 1;
        const cols = lines[i].split(',').map((c) => c.trim());
        const [prompt, rawType, optA, optB, optC, optD, rawCorrect, rawDiff, rawPts, sectionRef] =
          cols;

        if (!prompt || prompt.length < 8) {
          errors.push({
            row: rowNum,
            message: 'Prompt must be at least 8 characters.',
          });
          continue;
        }

        const qType =
          rawType === 'multiple' || rawType === 'boolean' ? rawType : 'single';
        const options =
          qType === 'boolean'
            ? [optA || 'True', optB || 'False']
            : [optA, optB, optC, optD].filter((o): o is string => Boolean(o && o.length > 0));

        if (options.length < 2) {
          errors.push({ row: rowNum, message: 'At least 2 options are required.' });
          continue;
        }

        const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
        const correctIndices = (rawCorrect ?? 'A')
          .split('|')
          .map((token) => {
            const upper = token.trim().toUpperCase();
            if (upper in letterMap) return letterMap[upper];
            const num = Number(token.trim());
            return Number.isInteger(num) ? num : 0;
          })
          .filter((idx) => idx >= 0 && idx < options.length);

        const diff =
          rawDiff === 'medium' || rawDiff === 'hard' ? rawDiff : 'easy';
        const pts = Math.max(1, Math.min(25, Number(rawPts) || 5));

        const matchedSection =
          (db.curricula[course.id] ?? []).find(
            (s) => s.id === sectionRef || s.title.toLowerCase() === (sectionRef ?? '').toLowerCase()
          ) ?? defaultSection;

        const q: QuestionDto = {
          id: nextDbId('iq'),
          courseId: course.id,
          courseTitle: course.title,
          sectionId: matchedSection.id,
          sectionName: matchedSection.title,
          type: qType,
          prompt,
          options,
          correctIndices: correctIndices.length > 0 ? correctIndices : [0],
          difficulty: diff,
          points: pts,
          timesUsed: 0,
          explanation: 'Imported from instructor CSV question bank.',
          createdAt: now,
          updatedAt: now,
        };
        db.questions.unshift(q);
        importedQuestions.push(q);
      }

      persistMockDb();
      return jsonOk({
        importedCount: importedQuestions.length,
        importedQuestions,
        errors,
      });
    }
  ),

  http.get(
    apiEndpoint('/instructor/courses/:id/exam-settings'),
    async ({ request, params }) => {
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

      const existing = db.examConfigs[course.id];
      if (existing) {
        return jsonOk(existing);
      }

      const sections = db.curricula[course.id] ?? [];
      const fallback = {
        id: nextDbId('exam'),
        courseId: course.id,
        courseTitle: course.title,
        title: `${course.title} Final Exam`,
        durationSeconds: 1800,
        passingScorePercent: course.passingScorePercent,
        totalQuestions: 10,
        attemptsAllowed: 3,
        shuffleQuestions: true,
        shuffleOptions: true,
        difficultyMix: { easyPercent: 40, mediumPercent: 40, hardPercent: 20 },
        coveredSectionIds: sections.map((s) => s.id),
      };
      db.examConfigs[course.id] = fallback;
      persistMockDb();
      return jsonOk(fallback);
    }
  ),

  http.put(
    apiEndpoint('/instructor/courses/:id/exam-settings'),
    async ({ request, params }) => {
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

      const parsed = await parseJsonBody(request, UpdateExamSettingsRequestSchema);
      if (!parsed.ok) return parsed.response;

      const prev = db.examConfigs[course.id];
      const updated = {
        id: prev?.id ?? nextDbId('exam'),
        courseId: course.id,
        courseTitle: course.title,
        title: parsed.data.title ?? prev?.title ?? `${course.title} Final Exam`,
        durationSeconds: parsed.data.durationSeconds,
        passingScorePercent: parsed.data.passingScorePercent,
        totalQuestions: parsed.data.totalQuestions,
        attemptsAllowed: parsed.data.attemptsAllowed,
        shuffleQuestions: parsed.data.shuffleQuestions,
        shuffleOptions: parsed.data.shuffleOptions,
        difficultyMix: parsed.data.difficultyMix,
        coveredSectionIds: parsed.data.coveredSectionIds,
      };
      db.examConfigs[course.id] = updated;
      course.passingScorePercent = updated.passingScorePercent;
      persistMockDb();

      return jsonOk(updated);
    }
  ),

  http.post(
    apiEndpoint('/instructor/courses/:id/exam-settings/preview'),
    async ({ request, params }) => {
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

      const bodySchema = UpdateExamSettingsRequestSchema.partial();
      const parsed = await parseJsonBody(request, bodySchema);
      if (!parsed.ok) return parsed.response;

      const cfg = db.examConfigs[course.id];
      const needed = parsed.data.totalQuestions ?? cfg?.totalQuestions ?? 10;
      const covered = parsed.data.coveredSectionIds ?? cfg?.coveredSectionIds ?? [];
      const availablePool = db.questions.filter(
        (q) =>
          q.courseId === course.id &&
          (covered.length === 0 || covered.includes(q.sectionId))
      );

      const sampleQuestions = availablePool.slice(0, needed);
      const shortfallWarning =
        availablePool.length < needed
          ? { needed, available: availablePool.length }
          : null;

      return jsonOk({ sampleQuestions, shortfallWarning });
    }
  ),
];
