import { formatDate, formatRelativeTime } from '../../lib/format';
import type {
  AdminActivityItemDto,
  AdminDashboardDto,
  AdminUserRecord,
  AuthenticatedRoleDto,
  CategoryEnrollmentShareDto,
  Course,
  CourseDto,
  PendingInstructorApplicationDto,
  RoleDistributionItemDto,
  RolePermissionItemDto,
  UserDto,
  UserGrowthPointDto,
  UserStatusDto,
} from '../dto-types-bridge';
import { mapCourseDtoToCourse } from './course.mapper';

export const ADMIN_USER_STATUS_LABELS: Record<UserStatusDto, AdminUserRecord['status']> =
  {
    active: 'Active',
    suspended: 'Suspended',
    pending: 'Pending',
  };

export const ADMIN_USER_STATUS_TO_DTO: Record<AdminUserRecord['status'], UserStatusDto> =
  {
    Active: 'active',
    Suspended: 'suspended',
    Pending: 'pending',
  };

const ROLE_DISPLAY_LABELS: Record<AuthenticatedRoleDto, string> = {
  student: 'Students',
  instructor: 'Instructors',
  supervisor: 'Supervisors',
  admin: 'Admins',
};

const PERMISSION_CATEGORY_LABELS: Record<RolePermissionItemDto['category'], string> = {
  learning: 'Learning',
  teaching: 'Teaching',
  moderation: 'Moderation',
  administration: 'Administration',
};

export interface MappedAdminCourse extends Course {
  rejectionReason: string | null;
}

export interface UserGrowthPointView {
  month: string;
  users: number;
  active: number;
}

export interface CategoryShareView {
  id: string;
  name: string;
  enrollmentsCount: number;
  percent: number;
  color: string;
}

export interface RoleDistributionView {
  role: string;
  count: number;
  percent: number;
  color: string;
  badge: string;
}

export interface PendingInstructorApplicationView {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialty: string;
  avatar: string;
  submitted: string;
}

export interface AdminActivityView {
  id: string;
  title: string;
  desc: string;
  time: string;
}

export interface RolePermissionView {
  id: string;
  feature: string;
  category: string;
  student: boolean;
  instructor: boolean;
  supervisor: boolean;
  admin: boolean;
}

export interface MappedAdminDashboardView {
  kpis: AdminDashboardDto['kpis'];
  userGrowth6Months: UserGrowthPointView[];
  categoryDistribution: CategoryShareView[];
  usersByRole: RoleDistributionView[];
  pendingCourses: MappedAdminCourse[];
  pendingInstructorApplications: PendingInstructorApplicationView[];
  recentActivity: AdminActivityView[];
}

/** Formats signed percentage delta cleanly (e.g. +18.4%). */
export function formatTrendPercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

/** Maps canonical `CourseDto` into an Admin table row retaining rejection reason. */
export function mapAdminCourseDtoToCourse(dto: CourseDto): MappedAdminCourse {
  return {
    ...mapCourseDtoToCourse(dto),
    rejectionReason: dto.rejectionReason ?? null,
  };
}

/** Maps canonical `UserDto` into an `AdminUserRecord` for management views. */
export function mapUserDtoToAdminRecord(dto: UserDto): AdminUserRecord {
  const joinedFormatted = formatDate(dto.joinedAt, { preset: 'short' });
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    avatar: dto.avatarUrl ?? '',
    role: dto.role,
    status: ADMIN_USER_STATUS_LABELS[dto.status],
    joinedAt: joinedFormatted === '—' ? 'Recently' : joinedFormatted,
    lastLogin: dto.lastLoginAt ? formatRelativeTime(dto.lastLoginAt) : 'Never',
    coursesCount: dto.coursesCount,
    recentActivity: (dto.recentActivity ?? []).map((item) => ({
      id: item.id,
      action: item.action,
      date: formatRelativeTime(item.occurredAt),
    })),
  };
}

function mapUserGrowthPointDtoToView(dto: UserGrowthPointDto): UserGrowthPointView {
  return {
    month: dto.month,
    users: dto.totalUsers,
    active: dto.activeUsers,
  };
}

function mapCategoryShareDtoToView(
  dto: CategoryEnrollmentShareDto
): CategoryShareView {
  return {
    id: dto.categoryId,
    name: dto.categoryName,
    enrollmentsCount: dto.enrollmentsCount,
    percent: dto.percent,
    color: dto.accentColor,
  };
}

function mapRoleDistributionDtoToView(
  dto: RoleDistributionItemDto
): RoleDistributionView {
  return {
    role: ROLE_DISPLAY_LABELS[dto.role],
    count: dto.count,
    percent: dto.percent,
    color: dto.color,
    badge: `${dto.count.toLocaleString()} (${dto.percent}%)`,
  };
}

function mapPendingInstructorAppDtoToView(
  dto: PendingInstructorApplicationDto
): PendingInstructorApplicationView {
  return {
    id: dto.id,
    userId: dto.userId,
    name: dto.name,
    email: dto.email,
    specialty: dto.specialty,
    avatar: dto.avatarUrl ?? '',
    submitted: formatRelativeTime(dto.submittedAt),
  };
}

function mapAdminActivityDtoToView(dto: AdminActivityItemDto): AdminActivityView {
  return {
    id: dto.id,
    title: dto.title,
    desc: dto.description,
    time: formatRelativeTime(dto.occurredAt),
  };
}

/** Maps a canonical RBAC feature row DTO into table display fields. */
export function mapRolePermissionItemDtoToView(
  dto: RolePermissionItemDto
): RolePermissionView {
  return {
    id: dto.id,
    feature: dto.feature,
    category: PERMISSION_CATEGORY_LABELS[dto.category],
    student: dto.student,
    instructor: dto.instructor,
    supervisor: dto.supervisor,
    admin: dto.admin,
  };
}

/** Maps `AdminDashboardDto` into formatted KPIs, SVG chart datasets, and queues. */
export function mapAdminDashboardDtoToView(
  dto: AdminDashboardDto
): MappedAdminDashboardView {
  return {
    kpis: dto.kpis,
    userGrowth6Months: dto.userGrowth6Months.map(mapUserGrowthPointDtoToView),
    categoryDistribution: dto.categoryDistribution.map(mapCategoryShareDtoToView),
    usersByRole: dto.usersByRole.map(mapRoleDistributionDtoToView),
    pendingCourses: dto.pendingCourses.map(mapAdminCourseDtoToCourse),
    pendingInstructorApplications: dto.pendingInstructorApplications.map(
      mapPendingInstructorAppDtoToView
    ),
    recentActivity: dto.recentActivity.map(mapAdminActivityDtoToView),
  };
}
