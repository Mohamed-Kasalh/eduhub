import {
  ActionResultSchema,
  AdminCategoriesResponseSchema,
  AdminDashboardSchema,
  AdminBulkUsersResponseSchema,
  CategorySchema,
  CertificateSchema,
  CourseSchema,
  PaginatedAdminCertificatesResponseSchema,
  PaginatedAdminCoursesResponseSchema,
  PaginatedAdminUsersResponseSchema,
  PlatformSettingsSchema,
  RolePermissionsResponseSchema,
  UserSchema,
  type ActionResultDto,
  type AdminBulkUsersRequestDto,
  type AdminBulkUsersResponseDto,
  type AdminCategoriesResponseDto,
  type AdminCreateCategoryRequestDto,
  type AdminCreateUserRequestDto,
  type AdminDashboardDto,
  type AdminFeatureCourseRequestDto,
  type AdminOverrideCourseStatusRequestDto,
  type AdminRejectCourseRequestDto,
  type AdminReorderCategoriesRequestDto,
  type AdminUpdateCategoryRequestDto,
  type AdminUpdateUserRequestDto,
  type AuthenticatedRoleDto,
  type CategoryDto,
  type CertificateDto,
  type CertificateStatusDto,
  type CourseDto,
  type CourseStatusDto,
  type PaginatedAdminCertificatesResponseDto,
  type PaginatedAdminCoursesResponseDto,
  type PaginatedAdminUsersResponseDto,
  type PlatformSettingsDto,
  type RolePermissionsResponseDto,
  type UpdatePlatformSettingsRequestDto,
  type UserDto,
  type UserStatusDto,
} from '../dto';
import { http } from '../http';

export type AdminUsersQueryParams = {
  q?: string;
  role?: AuthenticatedRoleDto | 'all';
  status?: UserStatusDto | 'all';
  page?: number;
  limit?: number;
};

export type AdminCoursesQueryParams = {
  status?: CourseStatusDto | 'all';
  q?: string;
  page?: number;
  limit?: number;
};

export type AdminCertificatesQueryParams = {
  q?: string;
  status?: CertificateStatusDto | 'all';
  page?: number;
  limit?: number;
};

/** Platform-wide administration endpoints for users, courses, categories, certificates, settings, and RBAC matrix. */
export const adminService = {
  /** Retrieves executive KPIs, growth metrics, category/role shares, and pending queues. */
  async getDashboard(): Promise<AdminDashboardDto> {
    return http.get('/admin/dashboard', AdminDashboardSchema);
  },

  /** Lists and filters platform user accounts. */
  async getUsers(params?: AdminUsersQueryParams): Promise<PaginatedAdminUsersResponseDto> {
    return http.get('/admin/users', PaginatedAdminUsersResponseSchema, {
      query: params ? { ...params } : undefined,
    });
  },

  /** Creates a new user account with an assigned role and temporary password. */
  async createUser(payload: AdminCreateUserRequestDto): Promise<UserDto> {
    return http.post('/admin/users', UserSchema, payload);
  },

  /** Updates a user's display name, role, or account status. */
  async updateUser(userId: string, payload: AdminUpdateUserRequestDto): Promise<UserDto> {
    return http.patch(`/admin/users/${encodeURIComponent(userId)}`, UserSchema, payload);
  },

  /** Permanently deletes a user account by ID. */
  async deleteUser(userId: string): Promise<ActionResultDto> {
    return http.delete(`/admin/users/${encodeURIComponent(userId)}`, ActionResultSchema);
  },

  /** Applies an `activate`, `suspend`, or `delete` action to multiple user IDs. */
  async bulkUsersAction(payload: AdminBulkUsersRequestDto): Promise<AdminBulkUsersResponseDto> {
    return http.post('/admin/users/bulk', AdminBulkUsersResponseSchema, payload);
  },

  /** Approves a pending instructor application. */
  async approveInstructorApplication(applicationId: string): Promise<ActionResultDto> {
    return http.post(
      `/admin/instructor-applications/${encodeURIComponent(applicationId)}/approve`,
      ActionResultSchema
    );
  },

  /** Rejects a pending instructor application. */
  async rejectInstructorApplication(applicationId: string): Promise<ActionResultDto> {
    return http.post(
      `/admin/instructor-applications/${encodeURIComponent(applicationId)}/reject`,
      ActionResultSchema
    );
  },

  /** Lists all platform courses across all lifecycle statuses. */
  async getCourses(
    params?: AdminCoursesQueryParams
  ): Promise<PaginatedAdminCoursesResponseDto> {
    return http.get('/admin/courses', PaginatedAdminCoursesResponseSchema, {
      query: params ? { ...params } : undefined,
    });
  },

  /** Approves and publishes a course directly as administrator. */
  async approveCourse(courseId: string): Promise<CourseDto> {
    return http.post(`/admin/courses/${encodeURIComponent(courseId)}/approve`, CourseSchema);
  },

  /** Rejects a course with a mandatory reason and notifies its instructor. */
  async rejectCourse(
    courseId: string,
    payload: AdminRejectCourseRequestDto
  ): Promise<CourseDto> {
    return http.post(
      `/admin/courses/${encodeURIComponent(courseId)}/reject`,
      CourseSchema,
      payload
    );
  },

  /** Unpublishes a live course back to `draft`. */
  async unpublishCourse(courseId: string): Promise<CourseDto> {
    return http.post(`/admin/courses/${encodeURIComponent(courseId)}/unpublish`, CourseSchema);
  },

  /** Toggles whether a course is featured on the home page. */
  async featureCourse(
    courseId: string,
    payload: AdminFeatureCourseRequestDto
  ): Promise<CourseDto> {
    return http.patch(
      `/admin/courses/${encodeURIComponent(courseId)}/feature`,
      CourseSchema,
      payload
    );
  },

  /** Overrides a course's lifecycle status to any canonical status value. */
  async overrideCourseStatus(
    courseId: string,
    payload: AdminOverrideCourseStatusRequestDto
  ): Promise<CourseDto> {
    return http.patch(
      `/admin/courses/${encodeURIComponent(courseId)}/status`,
      CourseSchema,
      payload
    );
  },

  /** Permanently deletes a course from the platform. */
  async deleteCourse(courseId: string): Promise<ActionResultDto> {
    return http.delete(`/admin/courses/${encodeURIComponent(courseId)}`, ActionResultSchema);
  },

  /** Lists all ordered course categories. */
  async getCategories(): Promise<AdminCategoriesResponseDto> {
    return http.get('/admin/categories', AdminCategoriesResponseSchema);
  },

  /** Creates a new course category. */
  async createCategory(payload: AdminCreateCategoryRequestDto): Promise<CategoryDto> {
    return http.post('/admin/categories', CategorySchema, payload);
  },

  /** Updates an existing category's metadata or styling. */
  async updateCategory(
    categoryId: string,
    payload: AdminUpdateCategoryRequestDto
  ): Promise<CategoryDto> {
    return http.patch(
      `/admin/categories/${encodeURIComponent(categoryId)}`,
      CategorySchema,
      payload
    );
  },

  /** Deletes a category (fails with 409 if active courses remain attached). */
  async deleteCategory(categoryId: string): Promise<ActionResultDto> {
    return http.delete(`/admin/categories/${encodeURIComponent(categoryId)}`, ActionResultSchema);
  },

  /** Reorders all platform categories cleanly. */
  async reorderCategories(
    payload: AdminReorderCategoriesRequestDto
  ): Promise<AdminCategoriesResponseDto> {
    return http.put('/admin/categories/order', AdminCategoriesResponseSchema, payload);
  },

  /** Lists issued certificates for admin audit and revocation management. */
  async getCertificates(
    params?: AdminCertificatesQueryParams
  ): Promise<PaginatedAdminCertificatesResponseDto> {
    return http.get('/admin/certificates', PaginatedAdminCertificatesResponseSchema, {
      query: params ? { ...params } : undefined,
    });
  },

  /** Revokes a previously issued certificate. */
  async revokeCertificate(certificateId: string): Promise<CertificateDto> {
    return http.post(
      `/admin/certificates/${encodeURIComponent(certificateId)}/revoke`,
      CertificateSchema
    );
  },

  /** Restores a previously revoked certificate back to valid. */
  async restoreCertificate(certificateId: string): Promise<CertificateDto> {
    return http.post(
      `/admin/certificates/${encodeURIComponent(certificateId)}/restore`,
      CertificateSchema
    );
  },

  /** Reads global platform defaults and upload limits. */
  async getSettings(): Promise<PlatformSettingsDto> {
    return http.get('/admin/settings', PlatformSettingsSchema);
  },

  /** Updates global platform defaults and upload limits. */
  async updateSettings(
    payload: UpdatePlatformSettingsRequestDto
  ): Promise<PlatformSettingsDto> {
    return http.put('/admin/settings', PlatformSettingsSchema, payload);
  },

  /** Retrieves the read-only role permissions matrix. */
  async getPermissions(): Promise<RolePermissionsResponseDto> {
    return http.get('/admin/permissions', RolePermissionsResponseSchema);
  },
};
