import { z } from 'zod';
import {
  AuthenticatedRoleSchema,
  CourseStatusSchema,
  IdSchema,
  IsoDateTimeSchema,
  StrongPasswordSchema,
  UserStatusSchema,
  createPaginatedSchema,
} from './common.dto';
import { CertificateSchema } from './certificate.dto';
import { CategorySchema, CourseSchema } from './course.dto';
import { UserSchema } from './user.dto';

export const UserGrowthPointSchema = z.object({
  month: z.string().min(1),
  totalUsers: z.number().int().nonnegative(),
  activeUsers: z.number().int().nonnegative(),
});
export type UserGrowthPointDto = z.infer<typeof UserGrowthPointSchema>;

export const CategoryEnrollmentShareSchema = z.object({
  categoryId: IdSchema,
  categoryName: z.string().min(1),
  enrollmentsCount: z.number().int().nonnegative(),
  percent: z.number().min(0).max(100),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
export type CategoryEnrollmentShareDto = z.infer<
  typeof CategoryEnrollmentShareSchema
>;

export const RoleDistributionItemSchema = z.object({
  role: AuthenticatedRoleSchema,
  count: z.number().int().nonnegative(),
  percent: z.number().min(0).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
export type RoleDistributionItemDto = z.infer<typeof RoleDistributionItemSchema>;

export const PendingInstructorApplicationSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  name: z.string().min(1),
  email: z.email(),
  specialty: z.string().min(1),
  avatarUrl: z.string().nullable(),
  submittedAt: IsoDateTimeSchema,
});
export type PendingInstructorApplicationDto = z.infer<
  typeof PendingInstructorApplicationSchema
>;

export const AdminActivityItemSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  occurredAt: IsoDateTimeSchema,
});
export type AdminActivityItemDto = z.infer<typeof AdminActivityItemSchema>;

export const AdminDashboardSchema = z.object({
  kpis: z.object({
    totalUsersCount: z.number().int().nonnegative(),
    usersGrowthPercent: z.number(),
    totalCoursesCount: z.number().int().nonnegative(),
    pendingCoursesCount: z.number().int().nonnegative(),
    coursesGrowthPercent: z.number(),
    totalEnrollmentsCount: z.number().int().nonnegative(),
    categoriesCount: z.number().int().nonnegative(),
    enrollmentsGrowthPercent: z.number(),
    certificatesIssuedCount: z.number().int().nonnegative(),
    validCertificatesPercent: z.number().min(0).max(100),
    certificatesGrowthPercent: z.number(),
  }),
  userGrowth6Months: z.array(UserGrowthPointSchema),
  categoryDistribution: z.array(CategoryEnrollmentShareSchema),
  usersByRole: z.array(RoleDistributionItemSchema),
  pendingCourses: z.array(CourseSchema),
  pendingInstructorApplications: z.array(PendingInstructorApplicationSchema),
  recentActivity: z.array(AdminActivityItemSchema),
});
export type AdminDashboardDto = z.infer<typeof AdminDashboardSchema>;

/* -------------------------------------------------------------------------- */
/*  User Administration Requests & Responses                                  */
/* -------------------------------------------------------------------------- */

export const AdminCreateUserRequestSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
  email: z.email('Enter a valid email address.'),
  role: AuthenticatedRoleSchema,
  temporaryPassword: StrongPasswordSchema,
  sendInvite: z.boolean().default(true),
});
export type AdminCreateUserRequestDto = z.infer<
  typeof AdminCreateUserRequestSchema
>;

export const AdminUpdateUserRequestSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: AuthenticatedRoleSchema.optional(),
  status: UserStatusSchema.optional(),
});
export type AdminUpdateUserRequestDto = z.infer<
  typeof AdminUpdateUserRequestSchema
>;

export const AdminBulkUsersRequestSchema = z.object({
  ids: z.array(IdSchema).min(1, 'Select at least one user account.'),
  action: z.enum(['activate', 'suspend', 'delete']),
});
export type AdminBulkUsersRequestDto = z.infer<
  typeof AdminBulkUsersRequestSchema
>;

export const AdminBulkUsersResponseSchema = z.object({
  affectedCount: z.number().int().nonnegative(),
  affectedIds: z.array(IdSchema),
  action: z.enum(['activate', 'suspend', 'delete']),
});
export type AdminBulkUsersResponseDto = z.infer<
  typeof AdminBulkUsersResponseSchema
>;

/* -------------------------------------------------------------------------- */
/*  Course & Category Administration                                          */
/* -------------------------------------------------------------------------- */

export const AdminRejectCourseRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(8, 'Rejection reason (at least 8 characters) is required.'),
});
export type AdminRejectCourseRequestDto = z.infer<
  typeof AdminRejectCourseRequestSchema
>;

export const AdminFeatureCourseRequestSchema = z.object({
  featured: z.boolean(),
});
export type AdminFeatureCourseRequestDto = z.infer<
  typeof AdminFeatureCourseRequestSchema
>;

export const AdminOverrideCourseStatusRequestSchema = z.object({
  status: CourseStatusSchema,
  reason: z.string().trim().optional(),
});
export type AdminOverrideCourseStatusRequestDto = z.infer<
  typeof AdminOverrideCourseStatusRequestSchema
>;

export const AdminCreateCategoryRequestSchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters.'),
  slug: z.string().trim().min(2).optional(),
  description: z.string().trim().max(300).default(''),
  iconName: z.string().trim().min(1).default('BookOpen'),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#6D4AE0'),
});
export type AdminCreateCategoryRequestDto = z.infer<
  typeof AdminCreateCategoryRequestSchema
>;

export const AdminUpdateCategoryRequestSchema =
  AdminCreateCategoryRequestSchema.partial();
export type AdminUpdateCategoryRequestDto = z.infer<
  typeof AdminUpdateCategoryRequestSchema
>;

export const AdminReorderCategoriesRequestSchema = z.object({
  orderedIds: z.array(IdSchema).min(1),
});
export type AdminReorderCategoriesRequestDto = z.infer<
  typeof AdminReorderCategoriesRequestSchema
>;

/* -------------------------------------------------------------------------- */
/*  Settings & Role Permissions Matrix                                        */
/* -------------------------------------------------------------------------- */

export const PlatformSettingsSchema = z.object({
  platformName: z.string().trim().min(2, 'Platform name is required.').max(80),
  currency: z.string().regex(/^[A-Z]{3}$/).default('USD'),
  defaultPassScorePercent: z.number().int().min(50).max(100),
  maxAvatarSizeBytes: z.number().int().positive(),
  maxImageSizeBytes: z.number().int().positive(),
  maxVideoSizeBytes: z.number().int().positive(),
});
export type PlatformSettingsDto = z.infer<typeof PlatformSettingsSchema>;

export const UpdatePlatformSettingsRequestSchema = PlatformSettingsSchema.partial();
export type UpdatePlatformSettingsRequestDto = z.infer<
  typeof UpdatePlatformSettingsRequestSchema
>;

export const RolePermissionItemSchema = z.object({
  id: IdSchema,
  feature: z.string().min(1),
  category: z.enum(['learning', 'teaching', 'moderation', 'administration']),
  student: z.boolean(),
  instructor: z.boolean(),
  supervisor: z.boolean(),
  admin: z.boolean(),
});
export type RolePermissionItemDto = z.infer<typeof RolePermissionItemSchema>;

export const RolePermissionsResponseSchema = z.object({
  data: z.array(RolePermissionItemSchema),
});
export type RolePermissionsResponseDto = z.infer<
  typeof RolePermissionsResponseSchema
>;

export const PaginatedAdminUsersResponseSchema = createPaginatedSchema(UserSchema);
export type PaginatedAdminUsersResponseDto = z.infer<
  typeof PaginatedAdminUsersResponseSchema
>;

export const PaginatedAdminCoursesResponseSchema = createPaginatedSchema(CourseSchema);
export type PaginatedAdminCoursesResponseDto = z.infer<
  typeof PaginatedAdminCoursesResponseSchema
>;

export const PaginatedAdminCertificatesResponseSchema =
  createPaginatedSchema(CertificateSchema);
export type PaginatedAdminCertificatesResponseDto = z.infer<
  typeof PaginatedAdminCertificatesResponseSchema
>;

export const AdminCategoriesResponseSchema = z.object({
  data: z.array(CategorySchema),
});
export type AdminCategoriesResponseDto = z.infer<
  typeof AdminCategoriesResponseSchema
>;
