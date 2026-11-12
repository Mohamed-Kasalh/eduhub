import { http } from 'msw';
import { z } from 'zod';
import {
  ForgotPasswordRequestSchema,
  GoogleOAuthRequestSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  RegisterRequestSchema,
  ResendOtpRequestSchema,
  ResetPasswordRequestSchema,
  VerifyOtpRequestSchema,
} from '../../api/dto';
import {
  findUserRecordByEmail,
  getMockDb,
  nextDbId,
  normalizeEmail,
  nowUtcIso,
  persistMockDb,
} from '../db';
import {
  apiEndpoint,
  decodeDemoJwt,
  issueSessionTokens,
  jsonError,
  jsonOk,
  parseJsonBody,
  requireAuth,
  simulateNetwork,
} from '../helpers';
import type { MockUserRecord } from '../seed';

const DEFAULT_NOTIFICATION_PREFS = {
  courseReplies: { inApp: true, email: true },
  examResults: { inApp: true, email: true },
  certificates: { inApp: true, email: true },
  moderation: { inApp: true, email: false },
  announcements: { inApp: true, email: false },
};

const LogoutBodySchema = z.object({
  refreshToken: z.string().optional(),
});

export const authHandlers = [
  http.post(apiEndpoint('/auth/register'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const parsed = await parseJsonBody(request, RegisterRequestSchema);
    if (!parsed.ok) return parsed.response;

    const email = normalizeEmail(parsed.data.email);
    if (findUserRecordByEmail(email)) {
      return jsonError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
    }

    const db = getMockDb();
    db.pendingRegistrations[email] = {
      name: parsed.data.name,
      email,
      password: parsed.data.password,
      role: parsed.data.role,
      code: '123456',
      otpSentAtMs: Date.now(),
    };
    persistMockDb();

    return jsonOk(
      {
        email,
        otpRequired: true,
        resendAvailableAfterSeconds: 60,
      },
      201
    );
  }),

  http.post(apiEndpoint('/auth/verify-otp'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const parsed = await parseJsonBody(request, VerifyOtpRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    const email = normalizeEmail(parsed.data.email);
    const pending = db.pendingRegistrations[email];

    if (!pending) {
      const existing = findUserRecordByEmail(email);
      if (!existing || (parsed.data.code !== '123456' && existing.user.emailVerified)) {
        return jsonError(
          422,
          'INVALID_OTP',
          'Verification code is invalid or has expired.',
          { code: ['Verification code is invalid or expired.'] }
        );
      }
      existing.user.emailVerified = true;
      existing.user.status = 'active';
      const tokens = issueSessionTokens(existing);
      persistMockDb();
      return jsonOk({ ...tokens, user: existing.user });
    }

    if (parsed.data.code !== pending.code && parsed.data.code !== '123456') {
      return jsonError(422, 'INVALID_OTP', 'Incorrect 6-digit verification code.', {
        code: ['Incorrect verification code. Try 123456 in demo mode.'],
      });
    }

    const newUserId = nextDbId('user');
    const sessionId = nextDbId('sess');
    const now = nowUtcIso();
    const record: MockUserRecord = {
      password: pending.password,
      wishlistCourseIds: [],
      recentSearches: [],
      sessions: [
        {
          id: sessionId,
          deviceName: 'Web Browser',
          deviceType: 'desktop',
          browser: 'Chrome',
          location: 'Cairo, Egypt',
          lastActiveAt: now,
          isCurrent: true,
        },
      ],
      user: {
        id: newUserId,
        name: pending.name,
        email: pending.email,
        emailVerified: true,
        role: pending.role,
        status: 'active',
        avatarUrl: null,
        title: pending.role === 'instructor' ? 'New EduHub Instructor' : 'EduHub Learner',
        bio: '',
        phone: null,
        links: { website: null, linkedin: null, github: null },
        expertiseTags: [],
        notificationPreferences: DEFAULT_NOTIFICATION_PREFS,
        joinedAt: now,
        lastLoginAt: now,
        coursesCount: 0,
        streakDays: 0,
        points: 0,
      },
    };

    db.users[newUserId] = record;
    delete db.pendingRegistrations[email];
    const tokens = issueSessionTokens(record, sessionId);
    persistMockDb();

    return jsonOk({ ...tokens, user: record.user });
  }),

  http.post(apiEndpoint('/auth/resend-otp'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const parsed = await parseJsonBody(request, ResendOtpRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    const email = normalizeEmail(parsed.data.email);
    const pending = db.pendingRegistrations[email];
    if (pending) {
      const elapsedSeconds = Math.floor((Date.now() - pending.otpSentAtMs) / 1000);
      if (elapsedSeconds < 60) {
        return jsonError(
          429,
          'RATE_LIMITED',
          `Please wait ${60 - elapsedSeconds}s before requesting another code.`
        );
      }
      pending.otpSentAtMs = Date.now();
      persistMockDb();
    }

    return jsonOk({
      email,
      resendAvailableAfterSeconds: 60,
    });
  }),

  http.post(apiEndpoint('/auth/login'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const parsed = await parseJsonBody(request, LoginRequestSchema);
    if (!parsed.ok) return parsed.response;

    const record = findUserRecordByEmail(parsed.data.email);
    if (!record || record.password !== parsed.data.password) {
      return jsonError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    if (record.user.status === 'suspended') {
      return jsonError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended.');
    }

    if (!record.user.emailVerified) {
      return jsonError(403, 'EMAIL_UNVERIFIED', 'Please verify your email address first.');
    }

    if (record.sessions.length === 0) {
      record.sessions.push({
        id: nextDbId('sess'),
        deviceName: 'Web Browser',
        deviceType: 'desktop',
        browser: 'Chrome',
        location: 'Cairo, Egypt',
        lastActiveAt: nowUtcIso(),
        isCurrent: true,
      });
    }

    const tokens = issueSessionTokens(record);
    persistMockDb();
    return jsonOk({ ...tokens, user: record.user });
  }),

  http.post(apiEndpoint('/auth/oauth/google'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const parsed = await parseJsonBody(request, GoogleOAuthRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    let record: MockUserRecord | null = null;
    if (parsed.data.email) {
      record = findUserRecordByEmail(parsed.data.email);
    } else if (parsed.data.role === 'instructor') {
      record = db.users['user-instructor-1'];
    } else {
      record = db.users['user-student-1'];
    }

    if (!record) {
      return jsonError(401, 'INVALID_OAUTH_TOKEN', 'Google account could not be matched.');
    }

    if (record.user.status === 'suspended') {
      return jsonError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended.');
    }

    const tokens = issueSessionTokens(record);
    persistMockDb();
    return jsonOk({ ...tokens, user: record.user });
  }),

  http.post(apiEndpoint('/auth/refresh'), async ({ request }) => {
    const fault = await simulateNetwork(false);
    if (fault) return fault;

    const parsed = await parseJsonBody(request, RefreshTokenRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    const recordEntry = db.refreshTokens[parsed.data.refreshToken];
    const decoded = decodeDemoJwt(parsed.data.refreshToken);

    if (
      !recordEntry ||
      recordEntry.revoked ||
      !decoded ||
      decoded.type !== 'refresh' ||
      decoded.exp * 1000 < Date.now()
    ) {
      return jsonError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
    }

    const userRecord = db.users[recordEntry.userId];
    if (!userRecord || userRecord.user.status === 'suspended') {
      return jsonError(401, 'INVALID_REFRESH_TOKEN', 'User session is no longer valid.');
    }

    recordEntry.revoked = true;
    const nextTokens = issueSessionTokens(userRecord, recordEntry.sessionId);
    persistMockDb();
    return jsonOk(nextTokens);
  }),

  http.post(apiEndpoint('/auth/logout'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    db.revokedAccessTokens.push(auth.token);

    try {
      const raw: unknown = await request.json();
      const bodyParsed = LogoutBodySchema.safeParse(raw);
      if (bodyParsed.success && bodyParsed.data.refreshToken) {
        const entry = db.refreshTokens[bodyParsed.data.refreshToken];
        if (entry) entry.revoked = true;
      }
    } catch {
      // Optional body
    }

    for (const entry of Object.values(db.refreshTokens)) {
      if (entry.userId === auth.userRecord.user.id) {
        entry.revoked = true;
      }
    }

    persistMockDb();
    return jsonOk({ success: true, message: 'Signed out.' });
  }),

  http.post(apiEndpoint('/auth/forgot-password'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const parsed = await parseJsonBody(request, ForgotPasswordRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    const email = normalizeEmail(parsed.data.email);
    if (findUserRecordByEmail(email)) {
      db.passwordResets[email] = {
        email,
        code: '123456',
        expiresAtMs: Date.now() + 15 * 60 * 1000,
      };
      persistMockDb();
    }

    return jsonOk({
      success: true,
      message: 'If an account exists, a reset code has been sent.',
    });
  }),

  http.get(apiEndpoint('/auth/reset-password/validate'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const url = new URL(request.url);
    const code = url.searchParams.get('code') ?? url.searchParams.get('token') ?? '';
    const email = url.searchParams.get('email');

    const db = getMockDb();
    const isStoredValid = email
      ? (() => {
          const rec = db.passwordResets[normalizeEmail(email)];
          return Boolean(rec && rec.code === code && rec.expiresAtMs > Date.now());
        })()
      : code === '123456';

    if (!isStoredValid && code !== '123456') {
      return jsonError(
        422,
        'INVALID_OR_EXPIRED_TOKEN',
        'Reset code or token is invalid or has expired.'
      );
    }

    return jsonOk({ success: true, message: 'Reset token is valid.' });
  }),

  http.post(apiEndpoint('/auth/reset-password'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const parsed = await parseJsonBody(request, ResetPasswordRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    const email = normalizeEmail(parsed.data.email);
    const resetRec = db.passwordResets[email];

    const codeMatches =
      parsed.data.code === '123456' ||
      (resetRec && resetRec.code === parsed.data.code && resetRec.expiresAtMs > Date.now());

    if (!codeMatches) {
      return jsonError(422, 'INVALID_OTP', 'Invalid or expired reset code.', {
        code: ['Reset code is invalid or expired.'],
      });
    }

    const userRecord = findUserRecordByEmail(email);
    if (!userRecord) {
      return jsonError(404, 'USER_NOT_FOUND', 'No account found for that email.');
    }

    userRecord.password = parsed.data.newPassword;
    delete db.passwordResets[email];
    persistMockDb();

    return jsonOk({ success: true, message: 'Password has been reset.' });
  }),
];
