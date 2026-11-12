import { http } from 'msw';
import {
  AdminBulkUsersRequestSchema,
  AdminCreateCategoryRequestSchema,
  AdminCreateUserRequestSchema,
  AdminFeatureCourseRequestSchema,
  AdminOverrideCourseStatusRequestSchema,
  AdminRejectCourseRequestSchema,
  AdminReorderCategoriesRequestSchema,
  AdminUpdateCategoryRequestSchema,
  AdminUpdateUserRequestSchema,
  UpdatePlatformSettingsRequestSchema,
  type AuthenticatedRoleDto,
  type CategoryDto,
} from '../../api/dto';
import {
  findUserRecordByEmail,
  getMockDb,
  nextDbId,
  normalizeEmail,
  nowUtcIso,
  persistMockDb,
  pushMockNotification,
} from '../db';
import {
  apiEndpoint,
  jsonError,
  jsonOk,
  paginate,
  parseJsonBody,
  requireAuth,
  simulateNetwork,
} from '../helpers';
import type { MockUserRecord } from '../seed';

const DEFAULT_PREFS = {
  courseReplies: { inApp: true, email: true },
  examResults: { inApp: true, email: true },
  certificates: { inApp: true, email: true },
  moderation: { inApp: true, email: false },
  announcements: { inApp: true, email: false },
};

const ROLE_COLORS: Record<AuthenticatedRoleDto, string> = {
  student: '#6D4AE0',
  instructor: '#0EA5E9',
  supervisor: '#F59E0B',
  admin: '#10B981',
};

export const adminHandlers = [
  http.get(apiEndpoint('/admin/dashboard'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const allUsers = Object.values(db.users).map((r) => r.user);
    const totalUsersCount = allUsers.length;
    const totalCoursesCount = db.courses.length;
    const pendingCourses = db.courses.filter((c) => c.status === 'pending_review');
    const validCerts = db.certificates.filter((c) => c.status === 'valid').length;
    const totalCerts = db.certificates.length;
    const validPercent = totalCerts > 0 ? Math.round((validCerts / totalCerts) * 100) : 100;

    const roles: AuthenticatedRoleDto[] = ['student', 'instructor', 'supervisor', 'admin'];
    const usersByRole = roles.map((role) => {
      const count = allUsers.filter((u) => u.role === role).length;
      return {
        role,
        count,
        percent: totalUsersCount > 0 ? Math.round((count / totalUsersCount) * 100) : 0,
        color: ROLE_COLORS[role],
      };
    });

    const totalStudentsAcrossCourses = Math.max(
      1,
      db.courses.reduce((s, c) => s + c.studentsCount, 0)
    );
    const categoryDistribution = db.categories.slice(0, 5).map((cat) => {
      const enrollmentsCount = db.courses
        .filter((c) => c.category.id === cat.id)
        .reduce((s, c) => s + c.studentsCount, 0);
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        enrollmentsCount,
        percent: Math.round((enrollmentsCount / totalStudentsAcrossCourses) * 100),
        accentColor: cat.accentColor,
      };
    });

    return jsonOk({
      kpis: {
        totalUsersCount,
        usersGrowthPercent: 18.4,
        totalCoursesCount,
        pendingCoursesCount: pendingCourses.length,
        coursesGrowthPercent: 12.1,
        totalEnrollmentsCount: totalStudentsAcrossCourses,
        categoriesCount: db.categories.length,
        enrollmentsGrowthPercent: 24.5,
        certificatesIssuedCount: totalCerts,
        validCertificatesPercent: validPercent,
        certificatesGrowthPercent: 15.2,
      },
      userGrowth6Months: [
        { month: 'Oct', totalUsers: 4100, activeUsers: 2890 },
        { month: 'Nov', totalUsers: 4620, activeUsers: 3250 },
        { month: 'Dec', totalUsers: 5180, activeUsers: 3680 },
        { month: 'Jan', totalUsers: 5940, activeUsers: 4190 },
        { month: 'Feb', totalUsers: 6620, activeUsers: 4720 },
        { month: 'Mar', totalUsers: 7350, activeUsers: 5280 },
      ],
      categoryDistribution,
      usersByRole,
      pendingCourses,
      pendingInstructorApplications: db.instructorApplications,
      recentActivity: db.adminActivity.slice(0, 8),
    });
  }),

  http.get(apiEndpoint('/admin/users'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const role = url.searchParams.get('role') ?? 'all';
    const status = url.searchParams.get('status') ?? 'all';

    let users = Object.values(getMockDb().users).map((r) => r.user);
    if (role !== 'all') users = users.filter((u) => u.role === role);
    if (status !== 'all') users = users.filter((u) => u.status === status);
    if (q) {
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    return jsonOk(
      paginate(users, url.searchParams.get('page'), url.searchParams.get('limit'), 12)
    );
  }),

  http.post(apiEndpoint('/admin/users'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, AdminCreateUserRequestSchema);
    if (!parsed.ok) return parsed.response;

    const email = normalizeEmail(parsed.data.email);
    if (findUserRecordByEmail(email)) {
      return jsonError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
    }

    const db = getMockDb();
    const userId = nextDbId('user');
    const now = nowUtcIso();
    const record: MockUserRecord = {
      password: parsed.data.temporaryPassword,
      wishlistCourseIds: [],
      recentSearches: [],
      sessions: [],
      user: {
        id: userId,
        name: parsed.data.name,
        email,
        emailVerified: !parsed.data.sendInvite,
        role: parsed.data.role,
        status: parsed.data.sendInvite ? 'pending' : 'active',
        avatarUrl: null,
        title: `EduHub ${parsed.data.role}`,
        bio: '',
        phone: null,
        links: { website: null, linkedin: null, github: null },
        expertiseTags: [],
        notificationPreferences: DEFAULT_PREFS,
        joinedAt: now,
        lastLoginAt: null,
        coursesCount: 0,
        streakDays: 0,
        points: 0,
      },
    };

    db.users[userId] = record;
    db.adminActivity.unshift({
      id: nextDbId('adm-act'),
      title: 'User Created',
      description: `${auth.userRecord.user.name} created account ${email} (${parsed.data.role})`,
      occurredAt: now,
    });
    persistMockDb();

    return jsonOk(record.user, 201);
  }),

  http.patch(apiEndpoint('/admin/users/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const rec = db.users[String(params.id)];
    if (!rec) {
      return jsonError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    const parsed = await parseJsonBody(request, AdminUpdateUserRequestSchema);
    if (!parsed.ok) return parsed.response;

    if (parsed.data.name !== undefined) rec.user.name = parsed.data.name;
    if (parsed.data.role !== undefined) rec.user.role = parsed.data.role;
    if (parsed.data.status !== undefined) rec.user.status = parsed.data.status;

    persistMockDb();
    return jsonOk(rec.user);
  }),

  http.delete(apiEndpoint('/admin/users/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const userId = String(params.id);
    if (!db.users[userId]) {
      return jsonError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    delete db.users[userId];
    persistMockDb();
    return jsonOk({ success: true, message: 'User account deleted.' });
  }),

  http.post(apiEndpoint('/admin/users/bulk'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, AdminBulkUsersRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    const affectedIds: string[] = [];

    for (const id of parsed.data.ids) {
      const rec = db.users[id];
      if (!rec) continue;
      if (parsed.data.action === 'activate') {
        rec.user.status = 'active';
      } else if (parsed.data.action === 'suspend') {
        rec.user.status = 'suspended';
      } else if (parsed.data.action === 'delete') {
        delete db.users[id];
      }
      affectedIds.push(id);
    }

    persistMockDb();
    return jsonOk({
      affectedCount: affectedIds.length,
      affectedIds,
      action: parsed.data.action,
    });
  }),

  http.post(
    apiEndpoint('/admin/instructor-applications/:id/approve'),
    async ({ request, params }) => {
      const fault = await simulateNetwork();
      if (fault) return fault;

      const auth = requireAuth(request, ['admin']);
      if (!auth.ok) return auth.response;

      const db = getMockDb();
      const idx = db.instructorApplications.findIndex((a) => a.id === String(params.id));
      if (idx === -1) {
        return jsonError(404, 'APPLICATION_NOT_FOUND', 'Instructor application not found.');
      }

      const app = db.instructorApplications[idx];
      const userRec = db.users[app.userId];
      if (userRec) {
        userRec.user.status = 'active';
        userRec.user.role = 'instructor';
      }
      db.instructorApplications.splice(idx, 1);
      persistMockDb();

      return jsonOk({ success: true, message: 'Instructor application approved.' });
    }
  ),

  http.post(
    apiEndpoint('/admin/instructor-applications/:id/reject'),
    async ({ request, params }) => {
      const fault = await simulateNetwork();
      if (fault) return fault;

      const auth = requireAuth(request, ['admin']);
      if (!auth.ok) return auth.response;

      const db = getMockDb();
      const idx = db.instructorApplications.findIndex((a) => a.id === String(params.id));
      if (idx === -1) {
        return jsonError(404, 'APPLICATION_NOT_FOUND', 'Instructor application not found.');
      }

      db.instructorApplications.splice(idx, 1);
      persistMockDb();

      return jsonOk({ success: true, message: 'Instructor application rejected.' });
    }
  ),

  http.get(apiEndpoint('/admin/courses'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'all';
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();

    let list = [...getMockDb().courses];
    if (status !== 'all') list = list.filter((c) => c.status === status);
    if (q) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.instructor.name.toLowerCase().includes(q)
      );
    }

    return jsonOk(
      paginate(list, url.searchParams.get('page'), url.searchParams.get('limit'), 12)
    );
  }),

  http.post(apiEndpoint('/admin/courses/:id/approve'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    course.status = 'published';
    course.rejectionReason = null;
    course.updatedAt = nowUtcIso();
    pushMockNotification({
      title: 'Course approved by Admin',
      message: `"${course.title}" is now published in the EduHub catalog.`,
      type: 'course',
      link: `/courses/${course.id}`,
      roles: ['instructor'],
    });
    persistMockDb();
    return jsonOk(course);
  }),

  http.post(apiEndpoint('/admin/courses/:id/reject'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const parsed = await parseJsonBody(request, AdminRejectCourseRequestSchema);
    if (!parsed.ok) return parsed.response;

    course.status = 'rejected';
    course.rejectionReason = parsed.data.reason;
    course.updatedAt = nowUtcIso();
    persistMockDb();
    return jsonOk(course);
  }),

  http.post(apiEndpoint('/admin/courses/:id/unpublish'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    course.status = 'draft';
    course.updatedAt = nowUtcIso();
    persistMockDb();
    return jsonOk(course);
  }),

  http.patch(apiEndpoint('/admin/courses/:id/feature'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const parsed = await parseJsonBody(request, AdminFeatureCourseRequestSchema);
    if (!parsed.ok) return parsed.response;

    course.featured = parsed.data.featured;
    course.updatedAt = nowUtcIso();
    persistMockDb();
    return jsonOk(course);
  }),

  http.patch(apiEndpoint('/admin/courses/:id/status'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const course = db.courses.find((c) => c.id === String(params.id));
    if (!course) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const parsed = await parseJsonBody(request, AdminOverrideCourseStatusRequestSchema);
    if (!parsed.ok) return parsed.response;

    course.status = parsed.data.status;
    if (parsed.data.reason !== undefined) {
      course.rejectionReason = parsed.data.reason;
    } else if (parsed.data.status === 'published') {
      course.rejectionReason = null;
    }
    course.updatedAt = nowUtcIso();
    persistMockDb();
    return jsonOk(course);
  }),

  http.delete(apiEndpoint('/admin/courses/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const idx = db.courses.findIndex((c) => c.id === String(params.id));
    if (idx === -1) {
      return jsonError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    db.courses.splice(idx, 1);
    persistMockDb();
    return jsonOk({ success: true, message: 'Course permanently deleted.' });
  }),

  http.get(apiEndpoint('/admin/categories'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const sorted = [...getMockDb().categories].sort((a, b) => a.order - b.order);
    return jsonOk({ data: sorted });
  }),

  http.post(apiEndpoint('/admin/categories'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, AdminCreateCategoryRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    const slug =
      parsed.data.slug ??
      parsed.data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const category: CategoryDto = {
      id: nextDbId('cat'),
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      courseCount: 0,
      iconName: parsed.data.iconName,
      accentColor: parsed.data.accentColor,
      order: db.categories.length,
      subcategories: [],
    };
    db.categories.push(category);
    persistMockDb();
    return jsonOk(category, 201);
  }),

  http.patch(apiEndpoint('/admin/categories/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const cat = db.categories.find((c) => c.id === String(params.id));
    if (!cat) {
      return jsonError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
    }

    const parsed = await parseJsonBody(request, AdminUpdateCategoryRequestSchema);
    if (!parsed.ok) return parsed.response;

    if (parsed.data.name !== undefined) cat.name = parsed.data.name;
    if (parsed.data.slug !== undefined) cat.slug = parsed.data.slug;
    if (parsed.data.description !== undefined) cat.description = parsed.data.description;
    if (parsed.data.iconName !== undefined) cat.iconName = parsed.data.iconName;
    if (parsed.data.accentColor !== undefined) cat.accentColor = parsed.data.accentColor;
    persistMockDb();
    return jsonOk(cat);
  }),

  http.delete(apiEndpoint('/admin/categories/:id'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const db = getMockDb();
    const catId = String(params.id);
    const idx = db.categories.findIndex((c) => c.id === catId);
    if (idx === -1) {
      return jsonError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
    }

    if (db.courses.some((c) => c.category.id === catId)) {
      return jsonError(
        409,
        'CATEGORY_IN_USE',
        'Cannot delete a category that still has courses assigned to it.'
      );
    }

    db.categories.splice(idx, 1);
    persistMockDb();
    return jsonOk({ success: true, message: 'Category deleted.' });
  }),

  http.put(apiEndpoint('/admin/categories/order'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, AdminReorderCategoriesRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    const byId = new Map(db.categories.map((c) => [c.id, c]));
    const reordered: CategoryDto[] = [];
    parsed.data.orderedIds.forEach((id) => {
      const cat = byId.get(id);
      if (cat) {
        cat.order = reordered.length;
        reordered.push(cat);
        byId.delete(id);
      }
    });
    for (const remaining of byId.values()) {
      remaining.order = reordered.length;
      reordered.push(remaining);
    }
    db.categories = reordered;
    persistMockDb();
    return jsonOk({ data: db.categories });
  }),

  http.get(apiEndpoint('/admin/certificates'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const status = url.searchParams.get('status') ?? 'all';

    let list = [...getMockDb().certificates];
    if (status !== 'all') list = list.filter((c) => c.status === status);
    if (q) {
      list = list.filter(
        (c) =>
          c.verificationCode.toLowerCase().includes(q) ||
          c.student.name.toLowerCase().includes(q) ||
          c.course.title.toLowerCase().includes(q)
      );
    }

    return jsonOk(
      paginate(list, url.searchParams.get('page'), url.searchParams.get('limit'), 12)
    );
  }),

  http.post(apiEndpoint('/admin/certificates/:id/revoke'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const cert = getMockDb().certificates.find((c) => c.id === String(params.id));
    if (!cert) {
      return jsonError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate not found.');
    }

    cert.status = 'revoked';
    persistMockDb();
    return jsonOk(cert);
  }),

  http.post(apiEndpoint('/admin/certificates/:id/restore'), async ({ request, params }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const cert = getMockDb().certificates.find((c) => c.id === String(params.id));
    if (!cert) {
      return jsonError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate not found.');
    }

    cert.status = 'valid';
    persistMockDb();
    return jsonOk(cert);
  }),

  http.get(apiEndpoint('/admin/settings'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    return jsonOk(getMockDb().platformSettings);
  }),

  http.put(apiEndpoint('/admin/settings'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonBody(request, UpdatePlatformSettingsRequestSchema);
    if (!parsed.ok) return parsed.response;

    const db = getMockDb();
    db.platformSettings = {
      ...db.platformSettings,
      ...parsed.data,
    };
    persistMockDb();
    return jsonOk(db.platformSettings);
  }),

  http.get(apiEndpoint('/admin/permissions'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request, ['admin']);
    if (!auth.ok) return auth.response;

    return jsonOk({ data: getMockDb().permissionsMatrix });
  }),
];
