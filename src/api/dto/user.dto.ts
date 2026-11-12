import { z } from 'zod';
import {
  AuthenticatedRoleSchema,
  DeviceTypeSchema,
  IdSchema,
  IsoDateTimeSchema,
  OptionalHttpUrlSchema,
  PublicSignupRoleSchema,
  StrongPasswordSchema,
  UserStatusSchema,
} from './common.dto';

export const UserLinksSchema = z.object({
  website: OptionalHttpUrlSchema,
  linkedin: OptionalHttpUrlSchema,
  github: OptionalHttpUrlSchema,
});
export type UserLinksDto = z.infer<typeof UserLinksSchema>;

export const NotificationChannelPreferenceSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
});
export type NotificationChannelPreferenceDto = z.infer<
  typeof NotificationChannelPreferenceSchema
>;

export const NotificationPreferencesSchema = z.object({
  courseReplies: NotificationChannelPreferenceSchema,
  examResults: NotificationChannelPreferenceSchema,
  certificates: NotificationChannelPreferenceSchema,
  moderation: NotificationChannelPreferenceSchema,
  announcements: NotificationChannelPreferenceSchema,
});
export type NotificationPreferencesDto = z.infer<typeof NotificationPreferencesSchema>;

export const UserActivityItemSchema = z.object({
  id: IdSchema,
  action: z.string().min(1),
  occurredAt: IsoDateTimeSchema,
});
export type UserActivityItemDto = z.infer<typeof UserActivityItemSchema>;

/**
 * Unified canonical User DTO normalizing UserProfile, AdminUserRecord,
 * and Student/Instructor account attributes.
 */
export const UserSchema = z.object({
  id: IdSchema,
  name: z.string().trim().min(2),
  email: z.email(),
  emailVerified: z.boolean(),
  role: AuthenticatedRoleSchema,
  status: UserStatusSchema,
  avatarUrl: z.string().nullable(),
  title: z.string(),
  bio: z.string().max(300),
  phone: z.string().nullable(),
  links: UserLinksSchema,
  expertiseTags: z.array(z.string()),
  notificationPreferences: NotificationPreferencesSchema,
  joinedAt: IsoDateTimeSchema,
  lastLoginAt: IsoDateTimeSchema.nullable(),
  coursesCount: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
  points: z.number().int().nonnegative(),
  recentActivity: z.array(UserActivityItemSchema).optional(),
});
export type UserDto = z.infer<typeof UserSchema>;

export const ActiveSessionSchema = z.object({
  id: IdSchema,
  deviceName: z.string().min(1),
  deviceType: DeviceTypeSchema,
  browser: z.string().min(1),
  location: z.string().min(1),
  lastActiveAt: IsoDateTimeSchema,
  isCurrent: z.boolean(),
});
export type ActiveSessionDto = z.infer<typeof ActiveSessionSchema>;

/* -------------------------------------------------------------------------- */
/*  Auth Requests & Responses                                                 */
/* -------------------------------------------------------------------------- */

export const RegisterRequestSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
  email: z.email('Enter a valid email address.'),
  password: StrongPasswordSchema,
  role: PublicSignupRoleSchema,
});
export type RegisterRequestDto = z.infer<typeof RegisterRequestSchema>;

export const RegisterResponseSchema = z.object({
  email: z.email(),
  otpRequired: z.boolean(),
  resendAvailableAfterSeconds: z.number().int().nonnegative(),
});
export type RegisterResponseDto = z.infer<typeof RegisterResponseSchema>;

export const VerifyOtpRequestSchema = z.object({
  email: z.email('Enter a valid email address.'),
  code: z.string().regex(/^\d{6}$/, 'Verification code must be 6 digits.'),
});
export type VerifyOtpRequestDto = z.infer<typeof VerifyOtpRequestSchema>;

export const ResendOtpRequestSchema = z.object({
  email: z.email('Enter a valid email address.'),
});
export type ResendOtpRequestDto = z.infer<typeof ResendOtpRequestSchema>;

export const ResendOtpResponseSchema = z.object({
  email: z.email(),
  resendAvailableAfterSeconds: z.number().int().nonnegative(),
});
export type ResendOtpResponseDto = z.infer<typeof ResendOtpResponseSchema>;

export const LoginRequestSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean().optional(),
});
export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;

export const GoogleOAuthRequestSchema = z.object({
  idToken: z.string().min(1).optional(),
  email: z.email().optional(),
  role: PublicSignupRoleSchema.optional(),
});
export type GoogleOAuthRequestDto = z.infer<typeof GoogleOAuthRequestSchema>;

export const AuthSessionResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
  user: UserSchema,
});
export type AuthSessionResponseDto = z.infer<typeof AuthSessionResponseSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenRequestDto = z.infer<typeof RefreshTokenRequestSchema>;

export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
});
export type RefreshTokenResponseDto = z.infer<typeof RefreshTokenResponseSchema>;

export const ForgotPasswordRequestSchema = z.object({
  email: z.email('Enter a valid email address.'),
});
export type ForgotPasswordRequestDto = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  email: z.email('Enter a valid email address.'),
  code: z.string().regex(/^\d{6}$/, 'Reset code must be 6 digits.'),
  newPassword: StrongPasswordSchema,
});
export type ResetPasswordRequestDto = z.infer<typeof ResetPasswordRequestSchema>;

/* -------------------------------------------------------------------------- */
/*  /me Requests                                                              */
/* -------------------------------------------------------------------------- */

export const UpdateMeRequestSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').optional(),
  title: z.string().trim().max(100, 'Headline must be 100 characters or fewer.').optional(),
  bio: z.string().max(300, 'Bio must be 300 characters or fewer.').optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d\s()-]{7,20}$/, 'Enter a valid phone number (7–20 characters).')
    .nullable()
    .optional(),
  links: UserLinksSchema.optional(),
  avatarUrl: z.string().nullable().optional(),
  expertiseTags: z.array(z.string().trim().min(1)).max(20).optional(),
});
export type UpdateMeRequestDto = z.infer<typeof UpdateMeRequestSchema>;

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: StrongPasswordSchema,
});
export type ChangePasswordRequestDto = z.infer<typeof ChangePasswordRequestSchema>;

export const SessionsListResponseSchema = z.object({
  data: z.array(ActiveSessionSchema),
});
export type SessionsListResponseDto = z.infer<typeof SessionsListResponseSchema>;

export const RecentSearchesResponseSchema = z.object({
  data: z.array(z.string()),
});
export type RecentSearchesResponseDto = z.infer<typeof RecentSearchesResponseSchema>;

export const AddRecentSearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(120),
});
export type AddRecentSearchRequestDto = z.infer<typeof AddRecentSearchRequestSchema>;
