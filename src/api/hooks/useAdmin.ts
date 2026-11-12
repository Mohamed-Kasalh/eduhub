import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { emitToast } from '../../lib/toastBus';
import type {
  ActionResultDto,
  AdminBulkUsersRequestDto,
  AdminBulkUsersResponseDto,
  AdminCategoriesResponseDto,
  AdminCreateCategoryRequestDto,
  AdminCreateUserRequestDto,
  AdminFeatureCourseRequestDto,
  AdminOverrideCourseStatusRequestDto,
  AdminRejectCourseRequestDto,
  AdminReorderCategoriesRequestDto,
  AdminUpdateCategoryRequestDto,
  AdminUpdateUserRequestDto,
  AdminUserRecord,
  CategoryDto,
  CertificateDto,
  CourseDto,
  CourseStatusDto,
  PaginatedAdminCertificatesResponseDto,
  PaginatedAdminCoursesResponseDto,
  PaginatedAdminUsersResponseDto,
  PlatformSettingsDto,
  UpdatePlatformSettingsRequestDto,
  UserDto,
} from '../dto-types-bridge';
import { getErrorMessage } from '../errors';
import {
  mapAdminCourseDtoToCourse,
  mapAdminDashboardDtoToView,
  mapRolePermissionItemDtoToView,
  mapUserDtoToAdminRecord,
  type MappedAdminCourse,
  type MappedAdminDashboardView,
  type RolePermissionView,
} from '../mappers/admin.mapper';
import {
  COURSE_STATUS_LABELS,
  mapCategoryDtoToCategory,
  type CategoryWithSubcategories,
} from '../mappers/course.mapper';
import {
  mapCertificateDtoToRecord,
  type StudentCertificateView,
} from '../mappers/examCertificate.mapper';
import { queryKeys } from '../queryKeys';
import {
  adminService,
  type AdminCertificatesQueryParams,
  type AdminCoursesQueryParams,
  type AdminUsersQueryParams,
} from '../services/admin.service';

export interface PaginatedAdminUsersView {
  items: AdminUserRecord[];
  meta: PaginatedAdminUsersResponseDto['meta'];
}

export interface PaginatedAdminCoursesView {
  items: MappedAdminCourse[];
  meta: PaginatedAdminCoursesResponseDto['meta'];
}

export interface PaginatedAdminCertificatesView {
  items: StudentCertificateView[];
  meta: PaginatedAdminCertificatesResponseDto['meta'];
}

const ADMIN_COURSE_STATUS_COUNT_KEYS: ReadonlyArray<CourseStatusDto | 'all'> = [
  'all',
  'pending_review',
  'published',
  'rejected',
  'draft',
];

function invalidateAdminUsersGraph(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
  void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
}

function invalidateAdminCoursesGraph(
  queryClient: QueryClient,
  courseId?: string
): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
  void queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
  void queryClient.invalidateQueries({ queryKey: ['public'] });
  void queryClient.invalidateQueries({ queryKey: ['instructor'] });
  void queryClient.invalidateQueries({ queryKey: ['supervisor'] });
  if (courseId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.instructor.courseDetail(courseId),
    });
  }
}

function invalidateAdminCategoriesGraph(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories });
  void queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
  void queryClient.invalidateQueries({ queryKey: queryKeys.publicConfig.categories });
  void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
  void queryClient.invalidateQueries({ queryKey: ['public'] });
}

function invalidateAdminCertificatesGraph(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
  void queryClient.invalidateQueries({ queryKey: ['admin', 'certificates'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
}

/** Loads admin executive KPIs, 6-month growth, charts, and pending approval queues. */
export function useAdminDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.dashboard,
    queryFn: () => adminService.getDashboard(),
    enabled,
    select: (dto): MappedAdminDashboardView => mapAdminDashboardDtoToView(dto),
  });
}

/** Loads paginated platform user accounts with search, role, and status filters. */
export function useAdminUsers(params: AdminUsersQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.users(params),
    queryFn: () => adminService.getUsers(params),
    enabled,
    placeholderData: keepPreviousData,
    select: (dto): PaginatedAdminUsersView => ({
      items: dto.data.map(mapUserDtoToAdminRecord),
      meta: dto.meta,
    }),
  });
}

/** Creates a new user account on the platform. */
export function useCreateAdminUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<UserDto, unknown, AdminCreateUserRequestDto>({
    mutationFn: (payload) => adminService.createUser(payload),
    onSuccess: (created, variables) => {
      invalidateAdminUsersGraph(queryClient);
      emitToast({
        title: `Created ${created.role} account for ${created.name}`,
        message: variables.sendInvite
          ? `Invitation email sent to ${created.email}.`
          : 'Account is immediately active.',
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not create user',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Updates a user's display name, role, or account status. */
export function useUpdateAdminUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    UserDto,
    unknown,
    { userId: string; userName: string; payload: AdminUpdateUserRequestDto }
  >({
    mutationFn: ({ userId, payload }) => adminService.updateUser(userId, payload),
    onSuccess: (updated, variables) => {
      invalidateAdminUsersGraph(queryClient);
      if (variables.payload.status && !variables.payload.role) {
        const label =
          updated.status === 'active'
            ? 'Active'
            : updated.status === 'suspended'
            ? 'Suspended'
            : 'Pending';
        emitToast({
          title: `User ${label.toLowerCase()}`,
          message: `${variables.userName} is now ${label}.`,
          variant: updated.status === 'active' ? 'success' : 'warning',
        });
      } else if (variables.payload.role) {
        emitToast({
          title: `Updated role to ${updated.role}`,
          message: variables.userName,
          variant: 'info',
        });
      } else {
        emitToast({
          title: `Updated account for ${updated.name}`,
          variant: 'success',
        });
      }
    },
    onError: (err) => {
      emitToast({
        title: 'Failed to update user account',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Permanently deletes a platform user account. */
export function useDeleteAdminUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<ActionResultDto, unknown, { userId: string; userName: string }>({
    mutationFn: ({ userId }) => adminService.deleteUser(userId),
    onSuccess: (_res, variables) => {
      invalidateAdminUsersGraph(queryClient);
      emitToast({
        title: `Deleted account ${variables.userName}`,
        variant: 'info',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not delete user',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Executes a bulk activate, suspend, or delete action across selected users. */
export function useBulkAdminUsersMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdminBulkUsersResponseDto, unknown, AdminBulkUsersRequestDto>({
    mutationFn: (payload) => adminService.bulkUsersAction(payload),
    onSuccess: (res) => {
      invalidateAdminUsersGraph(queryClient);
      const actionVerb =
        res.action === 'activate'
          ? 'Activated'
          : res.action === 'suspend'
          ? 'Suspended'
          : 'Deleted';
      emitToast({
        title: `${actionVerb} ${res.affectedCount} selected ${
          res.affectedCount === 1 ? 'account' : 'accounts'
        }`,
        variant: res.action === 'activate' ? 'success' : 'info',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Bulk user action failed',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Approves a pending instructor onboarding application. */
export function useApproveInstructorAppMutation() {
  const queryClient = useQueryClient();

  return useMutation<ActionResultDto, unknown, { applicationId: string; name: string }>({
    mutationFn: ({ applicationId }) =>
      adminService.approveInstructorApplication(applicationId),
    onSuccess: (_res, variables) => {
      invalidateAdminUsersGraph(queryClient);
      emitToast({
        title: `Approved instructor ${variables.name}`,
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not approve instructor application',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Rejects a pending instructor onboarding application. */
export function useRejectInstructorAppMutation() {
  const queryClient = useQueryClient();

  return useMutation<ActionResultDto, unknown, { applicationId: string; name: string }>({
    mutationFn: ({ applicationId }) =>
      adminService.rejectInstructorApplication(applicationId),
    onSuccess: (_res, variables) => {
      invalidateAdminUsersGraph(queryClient);
      emitToast({
        title: `Declined instructor application for ${variables.name}`,
        variant: 'info',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not decline instructor application',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Loads paginated platform courses filtered by lifecycle status and search query. */
export function useAdminCourses(params: AdminCoursesQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.courses(params),
    queryFn: () => adminService.getCourses(params),
    enabled,
    placeholderData: keepPreviousData,
    select: (dto): PaginatedAdminCoursesView => ({
      items: dto.data.map(mapAdminCourseDtoToCourse),
      meta: dto.meta,
    }),
  });
}

/** Loads per-status course counts across admin tabs. */
export function useAdminCourseTabCounts(q = '', enabled = true) {
  const normalizedQ = q.trim() || undefined;
  const results = useQueries({
    queries: ADMIN_COURSE_STATUS_COUNT_KEYS.map((status) => ({
      queryKey: queryKeys.admin.courses({
        status,
        q: normalizedQ,
        page: 1,
        limit: 1,
      }),
      queryFn: () =>
        adminService.getCourses({
          status,
          q: normalizedQ,
          page: 1,
          limit: 1,
        }),
      enabled,
      staleTime: 30_000,
    })),
  });

  return {
    all: results[0]?.data?.meta.total,
    pending_review: results[1]?.data?.meta.total,
    published: results[2]?.data?.meta.total,
    rejected: results[3]?.data?.meta.total,
    draft: results[4]?.data?.meta.total,
  };
}

/** Approves and publishes a course directly as administrator. */
export function useAdminApproveCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation<CourseDto, unknown, { courseId: string; courseTitle: string }>({
    mutationFn: ({ courseId }) => adminService.approveCourse(courseId),
    onSuccess: (_res, variables) => {
      invalidateAdminCoursesGraph(queryClient, variables.courseId);
      emitToast({
        title: 'Course approved & published',
        message: variables.courseTitle,
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not approve course',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Rejects a course with a mandatory reason and notifies the instructor. */
export function useAdminRejectCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CourseDto,
    unknown,
    { courseId: string; courseTitle: string; payload: AdminRejectCourseRequestDto }
  >({
    mutationFn: ({ courseId, payload }) =>
      adminService.rejectCourse(courseId, payload),
    onSuccess: (_res, variables) => {
      invalidateAdminCoursesGraph(queryClient, variables.courseId);
      emitToast({
        title: 'Course status overridden to Rejected',
        message: variables.courseTitle,
        variant: 'warning',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not reject course',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Unpublishes a live course back into Draft status. */
export function useAdminUnpublishCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation<CourseDto, unknown, { courseId: string; courseTitle: string }>({
    mutationFn: ({ courseId }) => adminService.unpublishCourse(courseId),
    onSuccess: (_res, variables) => {
      invalidateAdminCoursesGraph(queryClient, variables.courseId);
      emitToast({
        title: 'Course status overridden to Draft',
        message: variables.courseTitle,
        variant: 'info',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not unpublish course',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Toggles featured placement on a course card with optimistic UI update. */
export function useAdminFeatureCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CourseDto,
    unknown,
    { courseId: string; payload: AdminFeatureCourseRequestDto },
    {
      previousLists: Array<
        [readonly unknown[], PaginatedAdminCoursesResponseDto | undefined]
      >;
    }
  >({
    mutationFn: ({ courseId, payload }) =>
      adminService.featureCourse(courseId, payload),
    onMutate: async ({ courseId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'courses'] });
      const previousLists =
        queryClient.getQueriesData<PaginatedAdminCoursesResponseDto>({
          queryKey: ['admin', 'courses'],
        });

      for (const [key, snapshot] of previousLists) {
        if (!snapshot || !('data' in snapshot)) continue;
        queryClient.setQueryData<PaginatedAdminCoursesResponseDto>(key, {
          ...snapshot,
          data: snapshot.data.map((item) =>
            item.id === courseId ? { ...item, featured: payload.featured } : item
          ),
        });
      }

      return { previousLists };
    },
    onError: (err, _variables, context) => {
      if (context?.previousLists) {
        for (const [key, snapshot] of context.previousLists) {
          queryClient.setQueryData(key, snapshot);
        }
      }
      emitToast({
        title: 'Could not update featured tag',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
    onSuccess: (_res, variables) => {
      invalidateAdminCoursesGraph(queryClient, variables.courseId);
      emitToast({
        title: 'Featured sticker tag updated',
        variant: 'success',
      });
    },
  });
}

/** Overrides a course status directly to any canonical lifecycle state. */
export function useAdminOverrideCourseStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CourseDto,
    unknown,
    {
      courseId: string;
      courseTitle: string;
      payload: AdminOverrideCourseStatusRequestDto;
    }
  >({
    mutationFn: ({ courseId, payload }) =>
      adminService.overrideCourseStatus(courseId, payload),
    onSuccess: (updated, variables) => {
      invalidateAdminCoursesGraph(queryClient, variables.courseId);
      const label = COURSE_STATUS_LABELS[updated.status];
      emitToast({
        title: `Course status overridden to ${label}`,
        message: variables.courseTitle,
        variant: updated.status === 'published' ? 'success' : 'info',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not override course status',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Permanently deletes a course from the platform catalog. */
export function useAdminDeleteCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation<ActionResultDto, unknown, { courseId: string; courseTitle: string }>({
    mutationFn: ({ courseId }) => adminService.deleteCourse(courseId),
    onSuccess: (_res, variables) => {
      invalidateAdminCoursesGraph(queryClient, variables.courseId);
      emitToast({
        title: `Deleted ${variables.courseTitle}`,
        variant: 'info',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not delete course',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Loads ordered course categories for admin management. */
export function useAdminCategories(enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: () => adminService.getCategories(),
    enabled,
    select: (dto): CategoryWithSubcategories[] => dto.data.map(mapCategoryDtoToCategory),
  });
}

/** Creates a new platform course category. */
export function useCreateAdminCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation<CategoryDto, unknown, AdminCreateCategoryRequestDto>({
    mutationFn: (payload) => adminService.createCategory(payload),
    onSuccess: () => {
      invalidateAdminCategoriesGraph(queryClient);
      emitToast({ title: 'Category created', variant: 'success' });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not create category',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Updates an existing category's name, description, or styling. */
export function useUpdateAdminCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CategoryDto,
    unknown,
    { categoryId: string; payload: AdminUpdateCategoryRequestDto }
  >({
    mutationFn: ({ categoryId, payload }) =>
      adminService.updateCategory(categoryId, payload),
    onSuccess: () => {
      invalidateAdminCategoriesGraph(queryClient);
      emitToast({ title: 'Category updated', variant: 'success' });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not update category',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Deletes a category (surfaces 409 conflict cleanly if courses remain attached). */
export function useDeleteAdminCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ActionResultDto,
    unknown,
    { categoryId: string; categoryName: string }
  >({
    mutationFn: ({ categoryId }) => adminService.deleteCategory(categoryId),
    onSuccess: (_res, variables) => {
      invalidateAdminCategoriesGraph(queryClient);
      emitToast({
        title: `Deleted category ${variables.categoryName}`,
        variant: 'info',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Cannot delete category',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Reorders categories across catalog views with optimistic UI update. */
export function useReorderAdminCategoriesMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    AdminCategoriesResponseDto,
    unknown,
    AdminReorderCategoriesRequestDto,
    { previousCategories: AdminCategoriesResponseDto | undefined }
  >({
    mutationFn: (payload) => adminService.reorderCategories(payload),
    onMutate: async ({ orderedIds }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.admin.categories });
      const previousCategories = queryClient.getQueryData<AdminCategoriesResponseDto>(
        queryKeys.admin.categories
      );

      if (previousCategories) {
        const byId = new Map(previousCategories.data.map((cat) => [cat.id, cat]));
        const nextList: CategoryDto[] = [];
        for (const id of orderedIds) {
          const found = byId.get(id);
          if (found) {
            nextList.push(found);
            byId.delete(id);
          }
        }
        for (const rest of byId.values()) {
          nextList.push(rest);
        }
        queryClient.setQueryData<AdminCategoriesResponseDto>(
          queryKeys.admin.categories,
          { data: nextList }
        );
      }

      return { previousCategories };
    },
    onError: (err, _variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(
          queryKeys.admin.categories,
          context.previousCategories
        );
      }
      emitToast({
        title: 'Could not reorder categories',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
    onSuccess: () => {
      invalidateAdminCategoriesGraph(queryClient);
    },
  });
}

/** Loads paginated issued certificates for admin audit and revocation. */
export function useAdminCertificates(
  params: AdminCertificatesQueryParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.admin.certificates(params),
    queryFn: () => adminService.getCertificates(params),
    enabled,
    placeholderData: keepPreviousData,
    select: (dto): PaginatedAdminCertificatesView => ({
      items: dto.data.map(mapCertificateDtoToRecord),
      meta: dto.meta,
    }),
  });
}

/** Revokes a previously issued certificate. */
export function useRevokeCertificateMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CertificateDto,
    unknown,
    { certificateId: string; verificationCode: string }
  >({
    mutationFn: ({ certificateId }) =>
      adminService.revokeCertificate(certificateId),
    onSuccess: (_res, variables) => {
      invalidateAdminCertificatesGraph(queryClient);
      emitToast({
        title: `Certificate ${variables.verificationCode} revoked`,
        variant: 'danger',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not revoke certificate',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Restores a revoked certificate back to Valid status. */
export function useRestoreCertificateMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CertificateDto,
    unknown,
    { certificateId: string; verificationCode: string }
  >({
    mutationFn: ({ certificateId }) =>
      adminService.restoreCertificate(certificateId),
    onSuccess: (_res, variables) => {
      invalidateAdminCertificatesGraph(queryClient);
      emitToast({
        title: `Certificate ${variables.verificationCode} restored`,
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Could not restore certificate',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Reads global platform defaults and media upload limits. */
export function useAdminSettings(enabled = true) {
  return useQuery<PlatformSettingsDto>({
    queryKey: queryKeys.admin.settings,
    queryFn: () => adminService.getSettings(),
    enabled,
  });
}

/** Updates global platform settings and invalidates public config. */
export function useUpdatePlatformSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation<PlatformSettingsDto, unknown, UpdatePlatformSettingsRequestDto>({
    mutationFn: (payload) => adminService.updateSettings(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.admin.settings, updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings });
      void queryClient.invalidateQueries({ queryKey: queryKeys.publicConfig.config });
      const imgMb = Math.round(updated.maxImageSizeBytes / (1024 * 1024));
      const vidGb = Math.round(updated.maxVideoSizeBytes / (1024 * 1024 * 1024));
      emitToast({
        title: 'Platform settings updated',
        message: `${updated.platformName}: Default exam pass score ${updated.defaultPassScorePercent}%, uploads ${imgMb}MB JPG/PNG & ${vidGb}GB MP4.`,
        variant: 'success',
      });
    },
    onError: (err) => {
      emitToast({
        title: 'Failed to update settings',
        message: getErrorMessage(err),
        variant: 'danger',
      });
    },
  });
}

/** Retrieves the read-only role permissions matrix from backend config. */
export function useAdminPermissions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.permissions,
    queryFn: () => adminService.getPermissions(),
    enabled,
    select: (dto): RolePermissionView[] =>
      dto.data.map(mapRolePermissionItemDtoToView),
  });
}
