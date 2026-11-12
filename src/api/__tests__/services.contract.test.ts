import { describe, expect, it } from 'vitest';
import {
  adminService,
  authService,
  catalogService,
  certificatesService,
  commentsService,
  examsService,
  instructorService,
  isApiError,
  learningService,
  meService,
  notificationsService,
  questionsService,
  supervisorService,
  tokenStore,
  uploadsService,
} from '@/api';

async function loginAs(email: string, password = 'EduHub#2025') {
  return authService.login({ email, password });
}

describe('API Contract Tests across all 13 services', () => {
  it('covers authService endpoints, validation errors, cooldown, and token lifecycle', async () => {
    await expect(
      authService.register({
        name: 'A',
        email: 'bad-email',
        password: 'weak',
        role: 'student',
      })
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });

    const reg = await authService.register({
      name: 'Nadia Samir',
      email: 'nadia.contract@eduhub.com',
      password: 'Password#2026',
      role: 'student',
    });
    expect(reg.otpRequired).toBe(true);

    // Resend immediately triggers 60s cooldown (429)
    await expect(
      authService.resendOtp({ email: 'nadia.contract@eduhub.com' })
    ).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' });

    const session = await authService.verifyOtp({
      email: 'nadia.contract@eduhub.com',
      code: '123456',
    });
    expect(session.user.email).toBe('nadia.contract@eduhub.com');

    const refreshed = await authService.refresh({ refreshToken: session.refreshToken });
    expect(refreshed.accessToken).not.toBe(session.accessToken);

    const googleSession = await authService.loginWithGoogle({ role: 'instructor' });
    expect(googleSession.user.role).toBe('instructor');

    const forgot = await authService.forgotPassword({ email: 'sara.ali@eduhub.com' });
    expect(forgot.success).toBe(true);

    const validated = await authService.validateResetToken({
      email: 'sara.ali@eduhub.com',
      code: '123456',
    });
    expect(validated.success).toBe(true);

    const reset = await authService.resetPassword({
      email: 'sara.ali@eduhub.com',
      code: '123456',
      newPassword: 'ResetPassword#2026',
    });
    expect(reset.success).toBe(true);

    await expect(
      authService.login({ email: 'yasmine.adel@eduhub.com', password: 'EduHub#2025' })
    ).rejects.toMatchObject({ status: 403, code: 'ACCOUNT_SUSPENDED' });

    const logoutRes = await authService.logout();
    expect(logoutRes.success).toBe(true);
    expect(tokenStore.getAccessToken()).toBeNull();
  });

  it('covers meService profile, security, sessions, preferences, search history, and deletion', async () => {
    await expect(meService.getMe()).rejects.toMatchObject({ status: 401 });

    await loginAs('sara.ali@eduhub.com');
    const me = await meService.getMe();
    expect(me.email).toBe('sara.ali@eduhub.com');

    const updated = await meService.updateMe({
      title: 'Senior Frontend Engineer',
      bio: 'Updated bio within limit',
    });
    expect(updated.title).toBe('Senior Frontend Engineer');

    await expect(
      meService.updateMe({ bio: 'x'.repeat(305) })
    ).rejects.toMatchObject({ status: 422 });

    await expect(
      meService.changePassword({
        currentPassword: 'Wrong#Password1',
        newPassword: 'NewPassword#2026',
      })
    ).rejects.toMatchObject({ status: 422 });

    const sessions = await meService.getSessions();
    const currentSession = sessions.data.find((s) => s.isCurrent)!;
    const otherSession = sessions.data.find((s) => !s.isCurrent)!;

    await expect(meService.revokeSession(currentSession.id)).rejects.toMatchObject({
      status: 409,
    });
    await expect(meService.revokeSession(otherSession.id)).resolves.toMatchObject({
      success: true,
    });
    await expect(meService.revokeAllOtherSessions()).resolves.toMatchObject({
      success: true,
    });

    const prefs = await meService.getNotificationPreferences();
    const savedPrefs = await meService.updateNotificationPreferences({
      ...prefs,
      announcements: { inApp: true, email: true },
    });
    expect(savedPrefs.announcements.email).toBe(true);

    const searches = await meService.addRecentSearch({ query: 'MSW Testing' });
    expect(searches.data[0]).toBe('MSW Testing');
    await expect(meService.getRecentSearches()).resolves.toMatchObject({
      data: expect.arrayContaining(['MSW Testing']),
    });
    await expect(meService.clearRecentSearches()).resolves.toEqual({ data: [] });

    await expect(
      meService.deleteAccount({ confirmationText: 'wrong' })
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      meService.deleteAccount({ confirmationText: 'DELETE' })
    ).resolves.toMatchObject({ success: true });
    expect(tokenStore.getAccessToken()).toBeNull();
  });

  it('covers catalogService public discovery, filtering, detail privacy, reviews & helpful toggle', async () => {
    const config = await catalogService.getPublicConfig();
    expect(config.currency).toBe('USD');
    expect(config.defaultPassScorePercent).toBe(60);

    const stats = await catalogService.getPublicStats();
    expect(stats.totalCoursesCount).toBeGreaterThan(0);

    const categories = await catalogService.getCategories();
    expect(categories.data.length).toBe(8);

    const featuredInstructors = await catalogService.getInstructors({ featured: true });
    expect(featuredInstructors.data.length).toBeGreaterThan(0);

    const testimonials = await catalogService.getTestimonials();
    expect(testimonials.data.length).toBeGreaterThan(0);

    const suggestions = await catalogService.getSearchSuggestions('react');
    expect(suggestions.courses.some((c) => c.id === 'course-1')).toBe(true);

    const newsletter = await catalogService.subscribeNewsletter({
      email: 'digest@eduhub.com',
    });
    expect(newsletter.subscribed).toBe(true);

    const freeCourses = await catalogService.getCourses({ price: 'free', sort: 'rating' });
    expect(freeCourses.data.every((c) => c.isFree)).toBe(true);

    // Draft course hidden for guest
    await expect(catalogService.getCourseDetail('course-inst-draft')).rejects.toMatchObject({
      status: 404,
    });

    const detail = await catalogService.getCourseDetail('course-1');
    expect(detail.sections.length).toBeGreaterThan(0);

    const related = await catalogService.getRelatedCourses('course-1', 3);
    expect(related.data).toHaveLength(3);

    const reviewsPage = await catalogService.getCourseReviews('course-1');
    expect(reviewsPage.data.length).toBeGreaterThan(0);

    await loginAs('sara.ali@eduhub.com');
    const createdReview = await catalogService.createCourseReview('course-3', {
      rating: 5,
      comment: 'Super helpful walkthrough of TypeScript Zod contracts and HTTP architecture.',
    });
    expect(createdReview.rating).toBe(5);

    await expect(
      catalogService.createCourseReview('course-3', {
        rating: 5,
        comment: 'Duplicate review attempt should fail.',
      })
    ).rejects.toMatchObject({ status: 409, code: 'ALREADY_REVIEWED' });

    const liked = await catalogService.markReviewHelpful(createdReview.id);
    expect(liked.markedHelpfulByMe).toBe(true);
    const unliked = await catalogService.unmarkReviewHelpful(createdReview.id);
    expect(unliked.markedHelpfulByMe).toBe(false);
  });

  it('covers learningService enrollments, wishlist, sequential unlock, progress, and dashboard', async () => {
    await loginAs('sara.ali@eduhub.com');

    await expect(learningService.enrollInCourse('course-1')).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_ENROLLED',
    });

    const enrolled = await learningService.enrollInCourse('course-6');
    expect(enrolled.course.id).toBe('course-6');

    const myEnrollments = await learningService.getMyEnrollments({ status: 'all' });
    expect(myEnrollments.data.some((e) => e.course.id === 'course-6')).toBe(true);

    await learningService.addToWishlist('course-7');
    const wishlist = await learningService.getWishlist();
    expect(wishlist.data.some((w) => w.courseId === 'course-7')).toBe(true);
    await learningService.removeFromWishlist('course-7');

    const dashboard = await learningService.getStudentDashboard();
    expect(dashboard.kpis.enrolledCount).toBeGreaterThan(0);

    // course-6 lesson-1002 is locked until lesson-1001 completes
    const c6Detail = await catalogService.getCourseDetail('course-6');
    const firstLesson = c6Detail.sections[0].lessons[0];
    const secondLesson = c6Detail.sections[0].lessons[1];

    await expect(
      learningService.getLessonDetail('course-6', secondLesson.id)
    ).rejects.toMatchObject({ status: 403, code: 'LESSON_LOCKED' });

    const firstLessonView = await learningService.getLessonDetail('course-6', firstLesson.id);
    expect(firstLessonView.lesson.id).toBe(firstLesson.id);

    const progressUpdate = await learningService.updateLessonProgress(
      'course-6',
      firstLesson.id,
      { positionSeconds: 450, watchPercent: 92 }
    );
    expect(progressUpdate.completed).toBe(true);

    const uncompleted = await learningService.unmarkLessonComplete('course-6', firstLesson.id);
    expect(uncompleted.completed).toBe(false);
    const recompleted = await learningService.markLessonComplete('course-6', firstLesson.id);
    expect(recompleted.completed).toBe(true);

    const progressSummary = await learningService.getCourseProgress('course-6');
    expect(progressSummary.completedLessons).toBe(1);
  });

  it('covers commentsService moderation visibility rules, replies, likes, edits & reports', async () => {
    await loginAs('sara.ali@eduhub.com');

    const created = await commentsService.createComment('lesson-103', {
      content: 'Could we export field error utilities directly?',
    });
    expect(created.status).toBe('pending');

    // Author sees her own pending comment
    const authorView = await commentsService.getLessonComments('lesson-103');
    expect(authorView.data.some((c) => c.id === created.id)).toBe(true);

    // Another student does NOT see pending comment
    await loginAs('karim.tarek@eduhub.com');
    const peerView = await commentsService.getLessonComments('lesson-103');
    expect(peerView.data.some((c) => c.id === created.id)).toBe(false);

    // Other student cannot edit Sara's comment
    await expect(
      commentsService.updateComment(created.id, { content: 'Unauthorized edit' })
    ).rejects.toMatchObject({ status: 403 });

    // Owner edits, likes, reports; instructor replies
    await loginAs('sara.ali@eduhub.com');
    const edited = await commentsService.updateComment(created.id, {
      content: 'Updated question text about field error exports.',
    });
    expect(edited.content).toContain('Updated question');

    const likedComment = await commentsService.likeComment('tcomment-1');
    expect(likedComment.likedByMe).toBe(true);
    await commentsService.unlikeComment('tcomment-1');

    const reply = await commentsService.replyToComment('tcomment-1', {
      content: 'Thanks, that helped clarify!',
    });
    const likedReply = await commentsService.likeReply(reply.id);
    expect(likedReply.likesCount).toBe(1);
    await commentsService.unlikeReply(reply.id);

    const reported = await commentsService.reportComment('tcomment-2', {
      reason: 'off_topic',
      details: 'Off topic thread check',
    });
    expect(reported.success).toBe(true);

    await expect(commentsService.deleteComment(created.id)).resolves.toMatchObject({
      success: true,
    });
  });

  it('covers examsService security invariant (no answers in start attempt), autosave & grading', async () => {
    await loginAs('sara.ali@eduhub.com');

    const overview = await examsService.getCourseExam('course-3');
    expect(overview.eligibility.eligible).toBe(true);

    const started = await examsService.startExamAttempt('course-3');
    expect(started.questions.length).toBeGreaterThan(0);

    // Strict exam security invariant: correctIndices & explanation must never exist on attempt start
    const serialized = JSON.stringify(started);
    expect(serialized).not.toContain('correctIndices');
    expect(serialized).not.toContain('displayCorrectIndices');
    expect(serialized).not.toContain('explanation');

    const saved = await examsService.autosaveExamAnswers(started.attemptId, {
      answers: { [started.questions[0].id]: [0] },
      flaggedQuestionIds: [started.questions[0].id],
    });
    expect(saved.status).toBe('in_progress');

    const result = await examsService.submitExamAttempt(started.attemptId);
    expect(result.reviewQuestions.length).toBe(started.questions.length);
    expect(result.reviewQuestions[0].explanation.length).toBeGreaterThan(0);

    const fetched = await examsService.getExamAttemptResult(started.attemptId);
    expect(fetched.id).toBe(started.attemptId);

    const history = await examsService.getCourseExamAttempts('course-1');
    expect(history.data.length).toBe(2);
  });

  it('covers certificatesService public verification, generation guards, and binary downloads', async () => {
    const validVerify = await certificatesService.verifyCertificate('EDU-2026-000123');
    expect(validVerify.status).toBe('valid');

    const revokedVerify = await certificatesService.verifyCertificate('EDU-2026-000125');
    expect(revokedVerify.status).toBe('revoked');

    await expect(certificatesService.verifyCertificate('NO-SUCH-CODE')).rejects.toMatchObject({
      status: 404,
    });

    await loginAs('sara.ali@eduhub.com');
    await expect(certificatesService.generateCertificate('course-2')).rejects.toMatchObject({
      status: 409,
      code: 'ELIGIBILITY_UNMET',
    });

    const certs = await certificatesService.getMyCertificates();
    expect(certs.data.some((c) => c.id === 'cert-101')).toBe(true);

    const single = await certificatesService.getCertificate('cert-101');
    expect(single.verificationCode).toBe('EDU-2026-000123');

    const pdfDownload = await certificatesService.downloadCertificateFile('cert-101', 'pdf');
    expect(pdfDownload.contentType).toContain('application/pdf');
    expect(pdfDownload.filename).toContain('EDU-2026-000123');

    const pngDownload = await certificatesService.downloadCertificateFile('cert-101', 'png');
    expect(pngDownload.contentType).toContain('image/png');
  });

  it('covers notificationsService and uploadsService validation/RBAC', async () => {
    await loginAs('sara.ali@eduhub.com');

    const list = await notificationsService.getNotifications({ status: 'all' });
    expect(list.meta.unreadCount).toBeGreaterThan(0);

    const firstId = list.data[0].id;
    const readItem = await notificationsService.markAsRead(firstId);
    expect(readItem.read).toBe(true);

    const unreadItem = await notificationsService.markAsUnread(firstId);
    expect(unreadItem.read).toBe(false);

    const readAll = await notificationsService.markAllAsRead();
    expect(readAll.unreadCount).toBe(0);

    await expect(notificationsService.deleteNotification(firstId)).resolves.toMatchObject({
      success: true,
    });

    // Student cannot upload course_cover or lesson_video
    const videoFile = new File(['mp4'], 'lesson.mp4', { type: 'video/mp4' });
    await expect(
      uploadsService.uploadFile({ file: videoFile, kind: 'lesson_video' })
    ).rejects.toMatchObject({ status: 403 });

    // Valid avatar upload
    const avatarPng = new File([new Uint8Array(1024)], 'avatar.png', { type: 'image/png' });
    const uploaded = await uploadsService.uploadFile({
      file: avatarPng,
      kind: 'avatar',
    });
    expect(uploaded.kind).toBe('avatar');

    // Wrong MIME type fails 422
    const badMime = new File(['text'], 'notes.txt', { type: 'text/plain' });
    await expect(
      uploadsService.uploadFile({ file: badMime, kind: 'avatar' })
    ).rejects.toMatchObject({ status: 422 });
  });

  it('covers instructorService and questionsService full authoring contract & RBAC', async () => {
    // Student blocked from instructor API
    await loginAs('sara.ali@eduhub.com');
    await expect(instructorService.getDashboard()).rejects.toMatchObject({ status: 403 });

    await loginAs('ahmed.hassan@eduhub.com');
    const dash = await instructorService.getDashboard();
    expect(dash.kpis.totalCoursesCount).toBeGreaterThan(0);

    const courses = await instructorService.getCourses({ status: 'all' });
    expect(courses.data.length).toBeGreaterThan(0);

    const created = await instructorService.createCourse({
      title: 'Edge Rendering Patterns',
      categoryId: 'cat-web',
      level: 'intermediate',
      language: 'en',
      tags: ['React'],
      price: { amount: 39, currency: 'USD' },
      isFree: false,
    });
    expect(created.status).toBe('draft');

    // Too few sections fails submit with 422 fieldErrors
    await expect(instructorService.submitCourse(created.id)).rejects.toSatisfy(
      (err: unknown) =>
        isApiError(err) && err.status === 422 && Boolean(err.fieldErrors?.sections)
    );

    const updated = await instructorService.updateCourse(created.id, {
      subtitle: 'Streaming and partial hydration patterns',
    });
    expect(updated.subtitle).toContain('Streaming');

    const curriculumRes = await instructorService.putCurriculum(created.id, {
      sections: [
        {
          title: 'Section One',
          order: 0,
          lessons: [
            { title: 'Intro', type: 'video', durationSeconds: 300, isPreview: true, order: 0 },
            { title: 'Setup', type: 'video', durationSeconds: 420, isPreview: false, order: 1 },
          ],
        },
        {
          title: 'Section Two',
          order: 1,
          lessons: [
            { title: 'Streaming', type: 'video', durationSeconds: 600, isPreview: false, order: 0 },
          ],
        },
      ],
    });
    expect(curriculumRes.totalLessonsCount).toBe(3);

    const courseDetail = await instructorService.getCourseDetail(created.id);
    expect(courseDetail.sections).toHaveLength(2);

    // Question bank + CSV import + Exam settings + preview
    const secId = courseDetail.sections[0].id;
    const newQ = await questionsService.createQuestion(created.id, {
      sectionId: secId,
      type: 'single',
      prompt: 'Which streaming API enables selective hydration in React 19?',
      options: ['Suspense', 'setInterval', 'document.write', 'localStorage'],
      correctIndices: [0],
      difficulty: 'easy',
      points: 5,
      explanation: 'Suspense boundaries allow selective streaming.',
    });
    const patchedQ = await questionsService.updateQuestion(newQ.id, { points: 8 });
    expect(patchedQ.points).toBe(8);

    const csvImport = await questionsService.importQuestionsCsv(created.id, {
      csvText:
        'question,type,option_a,option_b,option_c,option_d,correct,difficulty,points,section\n' +
        'Valid prompt over eight chars,single,AnsA,AnsB,AnsC,AnsD,A,easy,5,Section One\n' +
        'short,single,A,B,C,D,A,easy,5,Section One',
    });
    expect(csvImport.importedCount).toBe(1);
    expect(csvImport.errors).toHaveLength(1);

    const csvFile = new File(
      [
        'question,type,option_a,option_b,option_c,option_d,correct,difficulty,points,section\n' +
          'Multipart CSV valid question,single,OptA,OptB,OptC,OptD,B,medium,5,Section One\n',
      ],
      'questions-import.csv',
      { type: 'text/csv' }
    );
    const csvFileImport = await questionsService.importQuestionsCsv(created.id, csvFile);
    expect(csvFileImport.importedCount).toBe(1);
    expect(csvFileImport.errors).toHaveLength(0);

    const qList = await questionsService.getCourseQuestions(created.id);
    expect(qList.data.length).toBeGreaterThanOrEqual(2);

    const settings = await questionsService.getExamSettings(created.id);
    const updatedSettings = await questionsService.updateExamSettings(created.id, {
      ...settings,
      totalQuestions: 10,
      coveredSectionIds: [secId],
    });
    expect(updatedSettings.totalQuestions).toBe(10);

    const preview = await questionsService.previewExamSettings(created.id);
    expect(preview.shortfallWarning).not.toBeNull();

    await questionsService.bulkDeleteQuestions({ ids: [newQ.id] });
    const students = await instructorService.getEnrolledStudents();
    expect(students.data.length).toBeGreaterThan(0);

    const stuProgress = await instructorService.getStudentProgress('user-student-1', 'course-1');
    expect(stuProgress.lessonBreakdown.length).toBeGreaterThan(0);

    const instComments = await instructorService.getComments({ status: 'unanswered' });
    expect(instComments.data.length).toBeGreaterThan(0);
    const resolvedComment = await instructorService.resolveComment(instComments.data[0].id, {
      resolved: true,
    });
    expect(resolvedComment.resolved).toBe(true);

    await expect(instructorService.deleteCourse(created.id)).resolves.toMatchObject({
      success: true,
    });
  });

  it('covers supervisorService moderation queues, checklists, reviews & reports', async () => {
    await loginAs('hana.mostafa@eduhub.com');

    const dash = await supervisorService.getDashboard();
    expect(dash.kpis.slaCompliancePercent).toBeGreaterThan(0);

    const pendingComments = await supervisorService.getComments({ status: 'pending' });
    expect(pendingComments.data.some((c) => c.id === 'scm-1')).toBe(true);

    const approved = await supervisorService.approveComment('scm-1');
    expect(approved.status).toBe('approved');

    const rejected = await supervisorService.rejectComment('scm-2', {
      reason: 'spam',
      notes: 'Off-platform spam link',
    });
    expect(rejected.status).toBe('rejected');

    const restored = await supervisorService.restoreComment('scm-2');
    expect(restored.status).toBe('approved');

    const bulk = await supervisorService.bulkApproveComments({ ids: ['tcomment-2'] });
    expect(bulk.approvedCount).toBe(1);

    await expect(supervisorService.deleteComment('scm-3')).resolves.toMatchObject({
      success: true,
    });

    const reviews = await supervisorService.getCourseReviews({ status: 'pending_review' });
    expect(reviews.data.some((s) => s.course.id === 'course-inst-pending')).toBe(true);

    const reviewDetail = await supervisorService.getCourseReviewDetail('course-inst-pending');
    const updatedChecklist = await supervisorService.updateCourseReviewChecklist(
      'course-inst-pending',
      { ...reviewDetail.checklist, coverAndDemoVideo: 'pass' }
    );
    expect(updatedChecklist.checklist.coverAndDemoVideo).toBe('pass');

    const changesReq = await supervisorService.requestCourseChanges('course-inst-pending', {
      notes: 'Add subtitles to lesson 4 video before launch.',
    });
    expect(changesReq.reviewDecision).toBe('changes_requested');

    const approvedCourse = await supervisorService.approveCourseReview('course-inst-pending');
    expect(approvedCourse.course.status).toBe('published');

    const reports = await supervisorService.getReports({ status: 'open' });
    const resolvedReport = await supervisorService.resolveReport(reports.data[0].id, {
      resolutionNotes: 'Handled and closed.',
    });
    expect(resolvedReport.status).toBe('resolved');
  });

  it('covers adminService governance, user/category/course/certificate CRUD & RBAC matrix', async () => {
    await loginAs('hana.mostafa@eduhub.com');
    await expect(adminService.getDashboard()).rejects.toMatchObject({ status: 403 });

    await loginAs('nour.khaled@eduhub.com');
    const dash = await adminService.getDashboard();
    expect(dash.kpis.totalUsersCount).toBeGreaterThan(0);

    const users = await adminService.getUsers({ q: 'sara' });
    expect(users.data[0].id).toBe('user-student-1');

    const createdUser = await adminService.createUser({
      name: 'Tariq Nassar',
      email: 'tariq@eduhub.com',
      role: 'instructor',
      temporaryPassword: 'TempPassword#1',
      sendInvite: true,
    });
    expect(createdUser.status).toBe('pending');

    const updatedUser = await adminService.updateUser(createdUser.id, { status: 'active' });
    expect(updatedUser.status).toBe('active');

    const bulkUsers = await adminService.bulkUsersAction({
      ids: [createdUser.id],
      action: 'suspend',
    });
    expect(bulkUsers.affectedCount).toBe(1);
    await expect(adminService.deleteUser(createdUser.id)).resolves.toMatchObject({
      success: true,
    });

    await expect(adminService.approveInstructorApplication('app-1')).resolves.toMatchObject({
      success: true,
    });

    const courses = await adminService.getCourses({ status: 'all' });
    expect(courses.data.length).toBeGreaterThan(0);

    const featured = await adminService.featureCourse('course-4', { featured: true });
    expect(featured.featured).toBe(true);

    const overridden = await adminService.overrideCourseStatus('course-4', {
      status: 'draft',
    });
    expect(overridden.status).toBe('draft');
    await adminService.approveCourse('course-4');
    await adminService.unpublishCourse('course-4');
    await adminService.rejectCourse('course-4', {
      reason: 'Administrative hold for syllabus refresh.',
    });

    // Category in use cannot be deleted (409)
    await expect(adminService.deleteCategory('cat-web')).rejects.toMatchObject({
      status: 409,
      code: 'CATEGORY_IN_USE',
    });

    const newCat = await adminService.createCategory({
      name: 'DevOps',
      description: 'CI/CD and containers',
      iconName: 'Server',
      accentColor: '#6D4AE0',
    });
    const patchedCat = await adminService.updateCategory(newCat.id, { name: 'DevOps & Cloud' });
    expect(patchedCat.name).toBe('DevOps & Cloud');
    await adminService.reorderCategories({ orderedIds: [newCat.id, 'cat-web'] });
    await adminService.deleteCategory(newCat.id);

    const certs = await adminService.getCertificates({ q: 'EDU-2026' });
    expect(certs.data.length).toBeGreaterThan(0);
    const revokedCert = await adminService.revokeCertificate('cert-101');
    expect(revokedCert.status).toBe('revoked');
    const restoredCert = await adminService.restoreCertificate('cert-101');
    expect(restoredCert.status).toBe('valid');

    const settings = await adminService.getSettings();
    const updatedSettings = await adminService.updateSettings({
      defaultPassScorePercent: settings.defaultPassScorePercent + 5,
    });
    expect(updatedSettings.defaultPassScorePercent).toBe(settings.defaultPassScorePercent + 5);

    const perms = await adminService.getPermissions();
    expect(perms.data.length).toBeGreaterThan(0);
  });
});
