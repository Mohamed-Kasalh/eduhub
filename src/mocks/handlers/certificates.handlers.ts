import { http, HttpResponse } from 'msw';
import {
  getMockDb,
  nextDbId,
  nowUtcIso,
  persistMockDb,
  pushMockNotification,
} from '../db';
import { apiEndpoint, jsonError, jsonOk, requireAuth, simulateNetwork } from '../helpers';

const MINIMAL_PDF_BYTES = new TextEncoder().encode(
  '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer << /Size 4 /Root 1 0 R >>\nstartxref\n182\n%%EOF'
);

// Valid 1x1 transparent PNG
const MINIMAL_PNG_BYTES = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1,
  8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0,
  5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

function computeGrade(scorePercent: number): 'distinction' | 'merit' | 'pass' {
  if (scorePercent >= 85) return 'distinction';
  if (scorePercent >= 75) return 'merit';
  return 'pass';
}

export const certificatesHandlers = [
  http.get(apiEndpoint('/verify/:code'), async ({ params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const code = decodeURIComponent(String(params.code)).trim().toUpperCase();
    const cert = getMockDb().certificates.find(
      (c) => c.verificationCode.toUpperCase() === code
    );
    if (!cert) {
      return jsonError(
        404,
        'CERTIFICATE_NOT_FOUND',
        'No certificate matched that verification code.'
      );
    }

    return jsonOk({
      status: cert.status,
      certificate: cert,
    });
  }),

  http.post(apiEndpoint('/courses/:id/certificate'), async ({ request, params }) => {
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
      return jsonError(409, 'ELIGIBILITY_UNMET', 'You are not enrolled in this course.');
    }

    const existingCert = db.certificates.find(
      (c) => c.student.id === auth.userRecord.user.id && c.course.id === course.id
    );
    if (existingCert) {
      enr.certificateId = existingCert.id;
      persistMockDb();
      return jsonOk(existingCert, 201);
    }

    const allLessons = (db.curricula[course.id] ?? []).flatMap((s) => s.lessons);
    const completedCount = allLessons.filter((l) => enr.lessonProgress[l.id]?.completed).length;
    if (allLessons.length > 0 && completedCount < allLessons.length) {
      return jsonError(
        409,
        'ELIGIBILITY_UNMET',
        `Complete all remaining lessons (${allLessons.length - completedCount} left) to unlock your certificate.`
      );
    }

    const passedAttempt = db.examAttempts
      .filter(
        (a) =>
          a.userId === auth.userRecord.user.id &&
          a.courseId === course.id &&
          a.status === 'submitted' &&
          a.passed
      )
      .sort((a, b) => b.scorePercent - a.scorePercent)[0];

    if (course.includesExam && !passedAttempt) {
      return jsonError(
        409,
        'ELIGIBILITY_UNMET',
        'Pass the final certification exam before generating your certificate.'
      );
    }

    const certId = nextDbId('cert');
    const numericSuffix = String(db.idCounter).padStart(6, '0');
    const code = `EDU-2026-${numericSuffix}`;
    const scorePercent = passedAttempt?.scorePercent ?? 100;

    const cert = {
      id: certId,
      verificationCode: code,
      student: { id: auth.userRecord.user.id, name: auth.userRecord.user.name },
      course: { id: course.id, title: course.title },
      instructorName: course.instructor.name,
      academicDirectorName: 'Nour Khaled',
      issuedAt: nowUtcIso(),
      grade: computeGrade(scorePercent),
      scorePercent,
      status: 'valid' as const,
      verificationUrl: `/verify/${code}`,
    };

    db.certificates.unshift(cert);
    enr.certificateId = cert.id;
    pushMockNotification({
      title: 'Certificate ready to download',
      message: `Your certificate for ${course.title} (${code}) has been issued.`,
      type: 'certificate',
      link: `/certificates/${cert.id}`,
      roles: ['student'],
    });
    persistMockDb();

    return jsonOk(cert, 201);
  }),

  http.get(apiEndpoint('/me/certificates'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const list = getMockDb().certificates.filter(
      (c) => c.student.id === auth.userRecord.user.id
    );
    return jsonOk({ data: list });
  }),

  http.get(apiEndpoint('/certificates/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student', 'admin']);
    if (!auth.ok) return auth.response;

    const key = String(params.id);
    const cert = getMockDb().certificates.find(
      (c) => c.id === key || c.verificationCode.toUpperCase() === key.toUpperCase()
    );
    if (!cert) {
      return jsonError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate not found.');
    }
    if (
      auth.userRecord.user.role === 'student' &&
      cert.student.id !== auth.userRecord.user.id
    ) {
      return jsonError(403, 'FORBIDDEN', 'You do not have access to this certificate.');
    }

    return jsonOk(cert);
  }),

  http.get(apiEndpoint('/certificates/:id/file'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['student', 'admin']);
    if (!auth.ok) return auth.response;

    const key = String(params.id);
    const cert = getMockDb().certificates.find(
      (c) => c.id === key || c.verificationCode.toUpperCase() === key.toUpperCase()
    );
    if (!cert) {
      return jsonError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate not found.');
    }
    if (
      auth.userRecord.user.role === 'student' &&
      cert.student.id !== auth.userRecord.user.id
    ) {
      return jsonError(403, 'FORBIDDEN', 'You do not have access to this certificate.');
    }

    const url = new URL(request.url);
    const format = (url.searchParams.get('format') ?? 'pdf').toLowerCase();
    if (format !== 'pdf' && format !== 'png') {
      return jsonError(400, 'INVALID_FORMAT', 'Supported download formats are pdf and png.');
    }

    const bytes = format === 'png' ? MINIMAL_PNG_BYTES : MINIMAL_PDF_BYTES;
    const contentType = format === 'png' ? 'image/png' : 'application/pdf';
    const filename = `eduhub-certificate-${cert.verificationCode}.${format}`;

    return new HttpResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }),
];
