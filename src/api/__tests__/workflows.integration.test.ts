import { describe, expect, it } from 'vitest';
import {
  adminService,
  authService,
  catalogService,
  certificatesService,
  commentsService,
  examsService,
  instructorService,
  learningService,
  meService,
  notificationsService,
  questionsService,
  supervisorService,
  uploadsService,
} from '@/api';

describe('End-to-End Stateful API Workflows', () => {
  it('Workflow 1: register -> OTP 123456 -> login -> update profile & password -> login with new password', async () => {
    const reg = await authService.register({
      name: 'Layla Mahmoud',
      email: 'layla.flow@eduhub.com',
      password: 'Password#2025',
      role: 'student',
    });
    expect(reg.otpRequired).toBe(true);

    const verified = await authService.verifyOtp({
      email: 'layla.flow@eduhub.com',
      code: '123456',
    });
    expect(verified.user.emailVerified).toBe(true);

    await meService.updateMe({
      title: 'Frontend Engineering Fellow',
      bio: 'Preparing for certification.',
    });
    await meService.changePassword({
      currentPassword: 'Password#2025',
      newPassword: 'Password#2026',
    });
    await authService.logout();

    // Old password rejected, new password accepted
    await expect(
      authService.login({ email: 'layla.flow@eduhub.com', password: 'Password#2025' })
    ).rejects.toMatchObject({ status: 401 });

    const reLogged = await authService.login({
      email: 'layla.flow@eduhub.com',
      password: 'Password#2026',
    });
    expect(reLogged.user.title).toBe('Frontend Engineering Fellow');
  });

  it('Workflow 2: enroll -> comment pending moderation -> supervisor approves -> visible publicly', async () => {
    await authService.login({ email: 'sara.ali@eduhub.com', password: 'EduHub#2025' });
    const comment = await commentsService.createComment('lesson-101', {
      content: 'Does Vite tree-shake dynamic MSW imports when VITE_USE_MOCK=false?',
    });
    expect(comment.status).toBe('pending');

    // Peer cannot see pending comment yet
    await authService.login({ email: 'karim.tarek@eduhub.com', password: 'EduHub#2025' });
    const peerBefore = await commentsService.getLessonComments('lesson-101');
    expect(peerBefore.data.some((c) => c.id === comment.id)).toBe(false);

    // Supervisor approves comment
    await authService.login({ email: 'hana.mostafa@eduhub.com', password: 'EduHub#2025' });
    const moderated = await supervisorService.approveComment(comment.id);
    expect(moderated.isSupervisorVerified).toBe(true);

    // Peer now sees approved comment
    await authService.login({ email: 'karim.tarek@eduhub.com', password: 'EduHub#2025' });
    const peerAfter = await commentsService.getLessonComments('lesson-101');
    expect(peerAfter.data.some((c) => c.id === comment.id)).toBe(true);
  });

  it('Workflow 3: exam attempt -> autosave -> submit & pass -> issue certificate -> public verify -> admin revoke & restore', async () => {
    await authService.login({ email: 'sara.ali@eduhub.com', password: 'EduHub#2025' });

    // course-3 has shuffleOptions: false and shuffleQuestions: false, and seeded single/multiple/boolean questions
    // Let's fetch course progress & exam config
    const progress = await learningService.getCourseProgress('course-3');
    expect(progress.overallPercent).toBe(100);

    const started = await examsService.startExamAttempt('course-3');
    expect(started.questions.length).toBeGreaterThan(0);

    // Answer questions matching seed correct patterns (single/boolean -> [0], multiple -> [0, 2])
    const answers: Record<string, number[]> = {};
    for (const q of started.questions) {
      answers[q.id] = q.type === 'multiple' ? [0, 2] : [0];
    }

    await examsService.autosaveExamAnswers(started.attemptId, {
      answers,
      flaggedQuestionIds: [],
    });

    const graded = await examsService.submitExamAttempt(started.attemptId);
    expect(graded.passed).toBe(true);
    expect(graded.certificateEligible).toBe(true);

    const cert = await certificatesService.generateCertificate('course-3');
    expect(cert.status).toBe('valid');

    const publicCheck1 = await certificatesService.verifyCertificate(cert.verificationCode);
    expect(publicCheck1.status).toBe('valid');

    await authService.login({ email: 'nour.khaled@eduhub.com', password: 'EduHub#2025' });
    await adminService.revokeCertificate(cert.id);

    const publicCheck2 = await certificatesService.verifyCertificate(cert.verificationCode);
    expect(publicCheck2.status).toBe('revoked');

    await adminService.restoreCertificate(cert.id);
    const publicCheck3 = await certificatesService.verifyCertificate(cert.verificationCode);
    expect(publicCheck3.status).toBe('valid');
  });

  it('Workflow 4: instructor creates draft course -> uploads cover -> sets curriculum & 6 questions -> submits -> supervisor approves -> visible in catalog', async () => {
    await authService.login({ email: 'ahmed.hassan@eduhub.com', password: 'EduHub#2025' });

    const coverUpload = await uploadsService.uploadFile({
      file: new File([new Uint8Array(512)], 'cover.jpg', { type: 'image/jpeg' }),
      kind: 'course_cover',
    });

    const draft = await instructorService.createCourse({
      title: 'Production TypeScript Architecture',
      subtitle: 'Zero-runtime-overhead types and Zod boundary contracts.',
      categoryId: 'cat-web',
      level: 'advanced',
      language: 'en',
      tags: ['TypeScript', 'Zod'],
      thumbnailUrl: coverUpload.url,
      previewVideoUrl: 'https://cdn.eduhub.com/demo.mp4',
      price: { amount: 49, currency: 'USD' },
      isFree: false,
    });

    const curriculum = await instructorService.putCurriculum(draft.id, {
      sections: [
        {
          title: 'Contracts & Schemas',
          order: 0,
          lessons: [
            { title: 'Why Runtime Schemas', type: 'video', durationSeconds: 480, isPreview: true, order: 0 },
            { title: 'DTO Design', type: 'video', durationSeconds: 540, isPreview: false, order: 1 },
          ],
        },
        {
          title: 'Transport & Mocking',
          order: 1,
          lessons: [
            { title: 'Single-Flight Refresh', type: 'video', durationSeconds: 600, isPreview: false, order: 0 },
          ],
        },
      ],
    });

    const secId = curriculum.sections[0].id;
    for (let i = 0; i < 6; i++) {
      await questionsService.createQuestion(draft.id, {
        sectionId: secId,
        type: 'single',
        prompt: `Architecture question #${i + 1}: which layer parses incoming JSON responses?`,
        options: ['HTTP Client with Zod', 'Raw DOM Event', 'CSS Parser', 'Vite Dev Server'],
        correctIndices: [0],
        difficulty: i < 2 ? 'easy' : i < 4 ? 'medium' : 'hard',
        points: 5,
        explanation: 'All responses pass through Zod runtime schema validation in the HTTP client.',
      });
    }

    const submitted = await instructorService.submitCourse(draft.id);
    expect(submitted.status).toBe('pending_review');

    // Still hidden from public catalog while pending review
    const catalogBefore = await catalogService.getCourses({ q: 'Production TypeScript Architecture' });
    expect(catalogBefore.data).toHaveLength(0);

    // Supervisor sees it in queue, approves it
    await authService.login({ email: 'hana.mostafa@eduhub.com', password: 'EduHub#2025' });
    const supQueue = await supervisorService.getCourseReviews({ status: 'pending_review' });
    expect(supQueue.data.some((s) => s.course.id === draft.id)).toBe(true);

    const approved = await supervisorService.approveCourseReview(draft.id);
    expect(approved.course.status).toBe('published');

    // Now visible in public catalog + instructor received publish notification
    const catalogAfter = await catalogService.getCourses({ q: 'Production TypeScript Architecture' });
    expect(catalogAfter.data).toHaveLength(1);

    await authService.login({ email: 'ahmed.hassan@eduhub.com', password: 'EduHub#2025' });
    const instNotifs = await notificationsService.getNotifications({ status: 'unread' });
    expect(
      instNotifs.data.some((n) => n.message.includes('Production TypeScript Architecture'))
    ).toBe(true);
  });

  it('Workflow 5: admin creates & activates user, then suspends and blocks login', async () => {
    await authService.login({ email: 'nour.khaled@eduhub.com', password: 'EduHub#2025' });

    const created = await adminService.createUser({
      name: 'Rami Adel',
      email: 'rami.adel@eduhub.com',
      role: 'instructor',
      temporaryPassword: 'TempPassword#9',
      sendInvite: false,
    });
    expect(created.status).toBe('active');

    await adminService.updateUser(created.id, { status: 'suspended' });

    await expect(
      authService.login({ email: 'rami.adel@eduhub.com', password: 'TempPassword#9' })
    ).rejects.toMatchObject({ status: 403, code: 'ACCOUNT_SUSPENDED' });
  });
});
