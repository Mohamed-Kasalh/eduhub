import React, { useState, useMemo } from 'react';
import { Link } from 'react-router';
import {
  Users,
  BookOpen,
  FolderKanban,
  Award,
  Settings,
  PlusCircle,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Search,
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
  ShieldCheck,
  Ban,
  Star,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Clock,
  Check,
  Minus,
  ArrowRight,
  KeyRound,
  Mail,
} from 'lucide-react';
import {
  Button,
  StatusChip,
  FeaturedStickerTag,
  Breadcrumbs,
  Avatar,
  Modal,
  Drawer,
  Pagination,
  EmptyState,
  ConfirmDialog,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { ROLE_USERS, Course, Category } from '../../data/mockData';
import { handleImageError } from '../../utils/imageFallback';
import {
  USER_GROWTH_6_MONTHS,
  CATEGORY_ENROLLMENT_DONUT,
  USERS_BY_ROLE_DISTRIBUTION,
  INITIAL_ADMIN_USERS,
  ROLES_PERMISSIONS_MATRIX,
  AdminUserRecord,
} from '../../data/adminSupervisorMockData';

/**
 * Reusable Course Workflow Callout shown in both Admin and Supervisor areas:
 * Draft -> Pending review (submitted by instructor) -> Published or Rejected (with reason).
 * The Supervisor reviews; the Admin can override any status.
 */
export const CourseWorkflowBanner: React.FC<{ roleMode: 'admin' | 'supervisor' }> = ({
  roleMode,
}) => (
  <div className="rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5] p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#6D4AE0]">
        <span>Course publication workflow</span>
        <span>•</span>
        <span className="text-[#3F2A9E]">
          {roleMode === 'admin'
            ? 'The Supervisor reviews; the Admin can override any status'
            : 'Submitted by Instructor → Reviewed by Supervisor → Admin can override any status'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[13px] font-bold">
        <span className="px-2.5 py-1 rounded-full bg-white border border-[#E6E1F5] text-[#5F5B75]">
          1. Draft
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-[#6D4AE0]" />
        <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#B45309]">
          2. Pending review (Instructor submits)
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-[#6D4AE0]" />
        <span className="px-2.5 py-1 rounded-full bg-[#16A34A]/15 text-[#16A34A]">
          3a. Published
        </span>
        <span className="text-[#5F5B75] font-normal">or</span>
        <span className="px-2.5 py-1 rounded-full bg-[#FEF2F2] text-[#DC2626]">
          3b. Rejected (with reason)
        </span>
      </div>
    </div>
    <StatusChip
      label={roleMode === 'admin' ? 'Admin override active' : 'Supervisor review queue'}
      variant={roleMode === 'admin' ? 'info' : 'success'}
      className="bg-white self-start lg:self-center shrink-0"
    />
  </div>
);

// ============================================================================
// 1. ADMIN DASHBOARD (/admin/dashboard)
// KPI cards (Users, Courses, Enrollments, Certificates issued) with trend %,
// user growth line chart, enrollments by category donut, users by role chart,
// pending approvals widget (courses, instructors), recent activity feed.
// ============================================================================
export const AdminDashboardPage: React.FC = () => {
  const { courses, setCourses, currentUser, addToast } = useApp();
  const admin = currentUser || ROLE_USERS.admin;

  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(
    USER_GROWTH_6_MONTHS.length - 1
  );
  const [pendingInstructorApps, setPendingInstructorApps] = useState([
    {
      id: 'inst-app-1',
      name: 'Dr. Tamer Mansour',
      specialty: 'Distributed AI Systems & PyTorch',
      submitted: '2 hours ago',
      avatar:
        'https://images.unsplash.com/photo-1633625510483-c177f4308f33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    },
    {
      id: 'inst-app-2',
      name: 'Laila Karim',
      specialty: 'Design Systems & Accessibility Research',
      submitted: 'Yesterday',
      avatar:
        'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    },
  ]);

  const pendingCourses = useMemo(
    () => courses.filter((c) => c.status === 'Pending review'),
    [courses]
  );

  // Build SVG line chart for User Growth
  const chartW = 540;
  const chartH = 175;
  const maxUsers = 16500;
  const growthPts = USER_GROWTH_6_MONTHS.map((m, idx) => {
    const x = Math.round((idx / (USER_GROWTH_6_MONTHS.length - 1)) * (chartW - 48) + 24);
    const y = Math.round(chartH - 28 - (m.users / maxUsers) * (chartH - 52));
    return { ...m, x, y, idx };
  });
  const polyStr = growthPts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaStr = `${growthPts[0].x},${chartH - 24} ${polyStr} ${
    growthPts[growthPts.length - 1].x
  },${chartH - 24}`;

  // Build SVG Donut segments for Enrollments by Category
  const donutRadius = 56;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let cumulativePercent = 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <StatusChip label="Platform administration" variant="info" />
          <h1 className="text-[34px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Welcome, {admin.name}
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Monitor global platform growth, approve courses and instructors, and manage
            system policies.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/admin/users">
            <Button variant="primary">Manage users</Button>
          </Link>
          <Link to="/admin/settings">
            <Button variant="secondary" leftIcon={<Settings className="w-4 h-4" />}>
              Settings & permissions
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. 4 KPI CARDS WITH TREND % (Users, Courses, Enrollments, Certificates issued) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Users',
            value: '15,480',
            trend: '+14.2%',
            sub: 'vs. last 30 days',
            icon: <Users className="w-5 h-5 text-[#6D4AE0]" />,
            to: '/admin/users',
          },
          {
            label: 'Courses',
            value: String(courses.length),
            trend: '+8.5%',
            sub: `${pendingCourses.length} awaiting approval`,
            icon: <BookOpen className="w-5 h-5 text-[#2563EB]" />,
            to: '/admin/courses',
          },
          {
            label: 'Enrollments',
            value: '68,920',
            trend: '+21.4%',
            sub: 'Across 8 categories',
            icon: <FolderKanban className="w-5 h-5 text-[#F59E3B]" />,
            to: '/admin/categories',
          },
          {
            label: 'Certificates issued',
            value: '19,340',
            trend: '+17.8%',
            sub: '99.9% valid credentials',
            icon: <Award className="w-5 h-5 text-[#16A34A]" />,
            to: '/admin/certificates',
          },
        ].map((kpi) => (
          <Link
            key={kpi.label}
            to={kpi.to}
            className="rounded-[12px] bg-white border border-[#E6E1F5] hover:border-[#A78BFA] p-5 shadow-purple-sm hover:shadow-purple-md transition-all flex items-start justify-between"
          >
            <div className="space-y-1">
              <p className="text-[14px] text-[#5F5B75] font-medium">{kpi.label}</p>
              <p className="font-display font-bold text-[32px] text-[#1E1B2E] leading-none">
                {kpi.value}
              </p>
              <div className="flex items-center gap-1.5 pt-1 text-[12px]">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#16A34A]/12 text-[#16A34A] font-bold">
                  <TrendingUp className="w-3 h-3" />
                  {kpi.trend}
                </span>
                <span className="text-[#5F5B75]">{kpi.sub}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-[10px] bg-[#F3EFFF] flex items-center justify-center shrink-0">
              {kpi.icon}
            </div>
          </Link>
        ))}
      </div>

      {/* 2. USER GROWTH LINE CHART & ENROLLMENTS BY CATEGORY DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* User Growth Line Chart */}
        <div className="lg:col-span-7 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                User growth (last 6 months)
              </h2>
              <p className="text-[13px] text-[#5F5B75]">
                Registered accounts vs. monthly active learners
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-[10px] bg-[#F3EFFF] border border-[#E6E1F5] text-[13px]">
              <span className="text-[#5F5B75]">
                {growthPts[selectedMonthIdx].month}:{' '}
              </span>
              <strong className="text-[#6D4AE0]">
                {growthPts[selectedMonthIdx].users.toLocaleString()} users
              </strong>
            </div>
          </div>

          <div className="w-full overflow-x-auto pt-2">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-44 overflow-visible"
              role="img"
              aria-label="User growth line chart"
            >
              <defs>
                <linearGradient id="adminGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6D4AE0" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#6D4AE0" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[35, 80, 125].map((yLine) => (
                <line
                  key={yLine}
                  x1="24"
                  y1={yLine}
                  x2={chartW - 24}
                  y2={yLine}
                  stroke="#E6E1F5"
                  strokeDasharray="4 4"
                />
              ))}
              <polygon points={areaStr} fill="url(#adminGrowthGrad)" />
              <polyline
                fill="none"
                stroke="#6D4AE0"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polyStr}
              />
              {growthPts.map((pt) => {
                const active = pt.idx === selectedMonthIdx;
                return (
                  <g
                    key={pt.month}
                    onClick={() => setSelectedMonthIdx(pt.idx)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={active ? 7 : 5}
                      fill={active ? '#6D4AE0' : '#FFFFFF'}
                      stroke="#6D4AE0"
                      strokeWidth="2.5"
                    />
                    <text
                      x={pt.x}
                      y={chartH - 5}
                      textAnchor="middle"
                      className="text-[11px] fill-[#5F5B75] font-bold"
                    >
                      {pt.month}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Enrollments by Category Donut */}
        <div className="lg:col-span-5 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
              Enrollments by category
            </h2>
            <p className="text-[13px] text-[#5F5B75]">
              Distribution across 68,920 total course enrollments
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
                {CATEGORY_ENROLLMENT_DONUT.map((seg) => {
                  const strokeDasharray = `${
                    (seg.percent / 100) * donutCircumference
                  } ${donutCircumference}`;
                  const strokeDashoffset = -(
                    (cumulativePercent / 100) *
                    donutCircumference
                  );
                  cumulativePercent += seg.percent;
                  return (
                    <circle
                      key={seg.name}
                      cx="72"
                      cy="72"
                      r={donutRadius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="18"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-display font-bold text-[20px] text-[#1E1B2E] leading-none">
                  68.9k
                </span>
                <span className="text-[10px] font-semibold text-[#5F5B75]">total</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-2 text-[13px]">
              {CATEGORY_ENROLLMENT_DONUT.map((seg) => (
                <div key={seg.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[#1E1B2E] font-medium">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    {seg.name}
                  </span>
                  <span className="font-bold text-[#1E1B2E]">{seg.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. USERS BY ROLE CHART, PENDING APPROVALS WIDGET & RECENT ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Users by Role Chart */}
        <div className="lg:col-span-4 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
          <div>
            <h2 className="text-[20px] font-display font-bold text-[#1E1B2E]">
              Users by role
            </h2>
            <p className="text-[13px] text-[#5F5B75]">
              Breakdown of 15,480 active accounts
            </p>
          </div>

          <div className="space-y-3.5">
            {USERS_BY_ROLE_DISTRIBUTION.map((r) => (
              <div key={r.role} className="space-y-1.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-bold text-[#1E1B2E]">{r.role}</span>
                  <span className="text-[#5F5B75] font-semibold">{r.badge}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#FAF8FF] border border-[#E6E1F5] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${r.percent}%`, backgroundColor: r.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals Widget (Courses & Instructors) */}
        <div className="lg:col-span-4 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[20px] font-display font-bold text-[#1E1B2E]">
                Pending approvals
              </h2>
              <p className="text-[13px] text-[#5F5B75]">
                Courses & instructor applications
              </p>
            </div>
            <StatusChip
              label={`${pendingCourses.length + pendingInstructorApps.length} pending`}
              variant="warning"
            />
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6D4AE0]">
              Courses awaiting approval ({pendingCourses.length})
            </p>
            {pendingCourses.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#1E1B2E] truncate">{c.title}</p>
                  <p className="text-[11px] text-[#5F5B75]">By {c.instructorName}</p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setCourses((prev) =>
                      prev.map((item) =>
                        item.id === c.id ? { ...item, status: 'Published' } : item
                      )
                    );
                    addToast({
                      title: 'Course approved & published',
                      message: c.title,
                      variant: 'success',
                    });
                  }}
                >
                  Approve
                </Button>
              </div>
            ))}

            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6D4AE0] pt-1">
              Instructor applications ({pendingInstructorApps.length})
            </p>
            {pendingInstructorApps.map((app) => (
              <div
                key={app.id}
                className="p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar src={app.avatar} name={app.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#1E1B2E] truncate">
                      {app.name}
                    </p>
                    <p className="text-[11px] text-[#5F5B75] truncate">{app.specialty}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPendingInstructorApps((prev) =>
                      prev.filter((item) => item.id !== app.id)
                    );
                    addToast({
                      title: `Approved instructor ${app.name}`,
                      variant: 'success',
                    });
                  }}
                >
                  Approve
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-4 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
          <div>
            <h2 className="text-[20px] font-display font-bold text-[#1E1B2E]">
              Recent activity feed
            </h2>
            <p className="text-[13px] text-[#5F5B75]">Live platform audit log</p>
          </div>

          <div className="space-y-3 text-[13px]">
            {[
              {
                title: 'Certificate EDU-2026-000123 issued',
                desc: 'Sara Ali passed Complete React Developer Exam (86%)',
                time: '12 mins ago',
              },
              {
                title: 'Supervisor Hana verified 8 comments',
                desc: 'Green Verified badge applied to approved Q&A threads',
                time: '45 mins ago',
              },
              {
                title: 'New course submitted for review',
                desc: 'Ahmed Hassan submitted GraphQL Federation & Microservices',
                time: '3 hours ago',
              },
              {
                title: 'Account suspended by Admin',
                desc: 'Yasmine Adel suspended for external spam links',
                time: '1 day ago',
              },
            ].map((ev, idx) => (
              <div
                key={idx}
                className="p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1E1B2E]">{ev.title}</span>
                  <span className="text-[11px] text-[#5F5B75]">{ev.time}</span>
                </div>
                <p className="text-[12px] text-[#5F5B75]">{ev.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. ADMIN USERS (/admin/users)
// Table (avatar, name, email, role chip, status Active/Suspended/Pending,
// joined, last login), search, role and status filters, bulk actions, pagination,
// row menu (View, Change role, Suspend or Activate, Delete with confirm modal),
// "Add user" modal, User detail drawer with activity.
// ============================================================================
export const AdminUsersPage: React.FC = () => {
  const { addToast } = useApp();

  const [userRecords, setUserRecords] = useState<AdminUserRecord[]>(INITIAL_ADMIN_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals & Drawers
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AdminUserRecord['role']>('student');
  const [newTempPassword, setNewTempPassword] = useState('EduHub#2026Temp!');
  const [sendInviteToggle, setSendInviteToggle] = useState(true);

  const [userToDelete, setUserToDelete] = useState<AdminUserRecord | null>(null);
  const [suspendConfirmTarget, setSuspendConfirmTarget] =
    useState<AdminUserRecord | null>(null);
  const [bulkSuspendConfirmOpen, setBulkSuspendConfirmOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<AdminUserRecord | null>(null);
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return userRecords.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (
        q &&
        !u.name.toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [userRecords, searchQuery, roleFilter, statusFilter]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    const created: AdminUserRecord = {
      id: `user-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim(),
      avatar: '',
      role: newRole,
      status: sendInviteToggle ? 'Pending' : 'Active',
      joinedAt: 'Just now',
      lastLogin: 'Never',
      coursesCount: 0,
      recentActivity: [
        {
          id: `act-${Date.now()}`,
          action: `Account created by Admin (${
            sendInviteToggle ? 'Invite email sent' : 'Activated directly'
          })`,
          date: 'Just now',
        },
      ],
    };
    setUserRecords((prev) => [created, ...prev]);
    setNewName('');
    setNewEmail('');
    setAddUserModalOpen(false);
    addToast({
      title: `Created ${created.role} account for ${created.name}`,
      message: sendInviteToggle
        ? `Invitation email sent to ${created.email}.`
        : 'Account is immediately active.',
      variant: 'success',
    });
  };

  const handleChangeRole = (id: string, nextRole: AdminUserRecord['role']) => {
    setUserRecords((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: nextRole } : u))
    );
    if (detailUser?.id === id) {
      setDetailUser((prev) => (prev ? { ...prev, role: nextRole } : null));
    }
    setOpenMenuUserId(null);
    addToast({
      title: `Updated role to ${nextRole}`,
      variant: 'info',
    });
  };

  const handleToggleSuspend = (user: AdminUserRecord) => {
    const nextStatus = user.status === 'Suspended' ? 'Active' : 'Suspended';
    setUserRecords((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
    );
    if (detailUser?.id === user.id) {
      setDetailUser((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }
    setOpenMenuUserId(null);
    addToast({
      title: `User ${nextStatus.toLowerCase()}`,
      message: `${user.name} is now ${nextStatus}.`,
      variant: nextStatus === 'Active' ? 'success' : 'warning',
    });
  };

  const handleBulkStatus = (nextStatus: 'Active' | 'Suspended') => {
    setUserRecords((prev) =>
      prev.map((u) => (selectedUserIds.includes(u.id) ? { ...u, status: nextStatus } : u))
    );
    addToast({
      title: `Updated ${selectedUserIds.length} users to ${nextStatus}`,
      variant: 'info',
    });
    setSelectedUserIds([]);
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Admin dashboard', to: '/admin/dashboard' },
          { label: 'Users' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            User management
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Manage student, instructor, supervisor, and administrator accounts.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<PlusCircle className="w-4 h-4" />}
          onClick={() => setAddUserModalOpen(true)}
        >
          Add user
        </Button>
      </div>

      {/* Filters & Bulk Actions Bar */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#5F5B75] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or email..."
              aria-label="Search users by name or email"
              className="w-full h-11 pl-9 pr-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] focus:outline-none focus:border-[#6D4AE0]"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by role"
            className="h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-bold text-[#1E1B2E]"
          >
            <option value="all">All roles</option>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-bold text-[#1E1B2E]"
          >
            <option value="all">All statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        {selectedUserIds.length > 0 && (
          <div className="pt-3 border-t border-[#E6E1F5] flex flex-wrap items-center justify-between gap-3 bg-[#F3EFFF] px-4 py-2.5 rounded-[10px]">
            <span className="text-[13px] font-bold text-[#3F2A9E]">
              {selectedUserIds.length} user(s) selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleBulkStatus('Active')}
              >
                Activate selected
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setBulkSuspendConfirmOpen(true)}
              >
                Suspend selected
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setBulkDeleteConfirmOpen(true)}
              >
                Delete selected
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Horizontally Scrollable Table on Mobile */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[14px] min-w-[780px]">
            <thead>
              <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all visible users"
                    checked={
                      filteredUsers.length > 0 &&
                      filteredUsers.every((u) => selectedUserIds.includes(u.id))
                    }
                    onChange={(e) =>
                      setSelectedUserIds(
                        e.target.checked ? filteredUsers.map((u) => u.id) : []
                      )
                    }
                    className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Joined</th>
                <th className="py-3.5 px-4">Last login</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E1F5]">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAF8FF]">
                  <td className="py-3.5 px-4">
                    <input
                      type="checkbox"
                      aria-label={`Select user ${u.name}`}
                      checked={selectedUserIds.includes(u.id)}
                      onChange={() =>
                        setSelectedUserIds((prev) =>
                          prev.includes(u.id)
                            ? prev.filter((id) => id !== u.id)
                            : [...prev, u.id]
                        )
                      }
                      className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => setDetailUser(u)}
                      className="flex items-center gap-3 text-left cursor-pointer group"
                    >
                      <Avatar src={u.avatar} name={u.name} size="sm" />
                      <div>
                        <p className="font-bold text-[#1E1B2E] group-hover:text-[#6D4AE0]">
                          {u.name}
                        </p>
                        <p className="text-[12px] text-[#5F5B75]">{u.email}</p>
                      </div>
                    </button>
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        handleChangeRole(u.id, e.target.value as AdminUserRecord['role'])
                      }
                      aria-label={`Change role for ${u.name}`}
                      className="h-8 px-2.5 rounded-full bg-[#F3EFFF] border border-[#E6E1F5] text-[12px] font-bold text-[#3F2A9E] capitalize cursor-pointer"
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusChip
                      label={u.status}
                      variant={
                        u.status === 'Active'
                          ? 'success'
                          : u.status === 'Suspended'
                          ? 'danger'
                          : 'warning'
                      }
                    />
                  </td>
                  <td className="py-3.5 px-4 text-[13px] text-[#5F5B75]">{u.joinedAt}</td>
                  <td className="py-3.5 px-4 text-[13px] text-[#5F5B75]">{u.lastLogin}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1 relative">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetailUser(u)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (u.status === 'Suspended') {
                            handleToggleSuspend(u);
                          } else {
                            setSuspendConfirmTarget(u);
                          }
                        }}
                      >
                        {u.status === 'Suspended' ? 'Activate' : 'Suspend'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setUserToDelete(u)}
                        className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[13px] text-[#5F5B75]">
          Showing <strong>1–{filteredUsers.length}</strong> of{' '}
          <strong>{userRecords.length}</strong> accounts
        </p>
        <Pagination
          currentPage={currentPage}
          totalPages={3}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* "ADD USER" MODAL */}
      <Modal
        open={addUserModalOpen}
        onClose={() => setAddUserModalOpen(false)}
        title="Add new platform user"
        description="Create a student, instructor, supervisor, or admin account."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddUserModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateUser}>
              Create user
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-[14px]">
          <div className="space-y-1">
            <label htmlFor="admin-create-name" className="block font-bold text-[#1E1B2E]">Full name *</label>
            <input
              id="admin-create-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Hassan Mahmoud"
              required
              className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5]"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="admin-create-email" className="block font-bold text-[#1E1B2E]">Email address *</label>
            <input
              id="admin-create-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="hassan@eduhub.com"
              required
              className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="admin-create-role" className="block font-bold text-[#1E1B2E]">Role</label>
              <select
                id="admin-create-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminUserRecord['role'])}
                className="w-full h-11 px-3 rounded-[10px] bg-white border border-[#E6E1F5] font-semibold"
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="admin-create-pass" className="block font-bold text-[#1E1B2E]">Temporary password</label>
              <div className="flex items-center gap-1.5">
                <input
                  id="admin-create-pass"
                  type="text"
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  className="w-full h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-mono text-[12px]"
                />
              </div>
            </div>
          </div>
          <label className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[#6D4AE0]" />
              <div>
                <p className="font-bold text-[13px] text-[#1E1B2E]">Send invite email</p>
                <p className="text-[11px] text-[#5F5B75]">
                  Emails a one-click onboarding link & temporary password
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={sendInviteToggle}
              onChange={(e) => setSendInviteToggle(e.target.checked)}
              className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
            />
          </label>
        </form>
      </Modal>

      {/* DELETE USER CONFIRM DIALOG */}
      <ConfirmDialog
        open={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        title="Delete user account?"
        description={
          userToDelete
            ? `Are you sure you want to permanently delete ${userToDelete.name} (${userToDelete.email}) and their session history?`
            : ''
        }
        confirmLabel="Confirm delete"
        tone="danger"
        onConfirm={() => {
          if (!userToDelete) return;
          setUserRecords((prev) => prev.filter((u) => u.id !== userToDelete.id));
          addToast({
            title: `Deleted account ${userToDelete.name}`,
            variant: 'info',
          });
          setUserToDelete(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(suspendConfirmTarget)}
        onClose={() => setSuspendConfirmTarget(null)}
        title="Suspend this user?"
        description={
          suspendConfirmTarget
            ? `${suspendConfirmTarget.name} will be immediately blocked from accessing active courses and sessions until reactivated.`
            : ''
        }
        confirmLabel="Suspend user"
        tone="danger"
        onConfirm={() => {
          if (!suspendConfirmTarget) return;
          handleToggleSuspend(suspendConfirmTarget);
          setSuspendConfirmTarget(null);
        }}
      />

      <ConfirmDialog
        open={bulkSuspendConfirmOpen}
        onClose={() => setBulkSuspendConfirmOpen(false)}
        title={`Suspend ${selectedUserIds.length} selected accounts?`}
        description="Selected users will be paused from signing in until reactivated by an administrator."
        confirmLabel="Suspend selected"
        tone="danger"
        onConfirm={() => {
          handleBulkStatus('Suspended');
          setBulkSuspendConfirmOpen(false);
        }}
      />

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        title={`Delete ${selectedUserIds.length} selected user accounts?`}
        description="This permanently deletes the selected accounts and cannot be undone."
        confirmLabel="Delete selected"
        tone="danger"
        onConfirm={() => {
          const count = selectedUserIds.length;
          setUserRecords((prev) =>
            prev.filter((u) => !selectedUserIds.includes(u.id))
          );
          setSelectedUserIds([]);
          setBulkDeleteConfirmOpen(false);
          addToast({
            title: `Deleted ${count} selected user accounts`,
            variant: 'info',
          });
        }}
      />

      {/* USER DETAIL DRAWER WITH ACTIVITY */}
      <Drawer
        open={Boolean(detailUser)}
        onClose={() => setDetailUser(null)}
        title={detailUser ? `${detailUser.name} — Account` : 'User details'}
        footer={
          <Button variant="primary" fullWidth onClick={() => setDetailUser(null)}>
            Done
          </Button>
        }
      >
        {detailUser && (
          <div className="space-y-6 text-[14px]">
            <div className="p-4 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center gap-4">
              <Avatar src={detailUser.avatar} name={detailUser.name} size="lg" />
              <div>
                <StatusChip
                  label={detailUser.status}
                  variant={detailUser.status === 'Active' ? 'success' : 'danger'}
                />
                <h4 className="font-display font-bold text-[20px] text-[#1E1B2E] mt-1">
                  {detailUser.name}
                </h4>
                <p className="text-[12px] text-[#5F5B75]">{detailUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="p-3 rounded-[10px] bg-white border border-[#E6E1F5]">
                <p className="text-[#5F5B75]">Joined</p>
                <p className="font-bold text-[#1E1B2E]">{detailUser.joinedAt}</p>
              </div>
              <div className="p-3 rounded-[10px] bg-white border border-[#E6E1F5]">
                <p className="text-[#5F5B75]">Last login</p>
                <p className="font-bold text-[#1E1B2E]">{detailUser.lastLogin}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-display font-bold text-[17px] text-[#1E1B2E]">
                Recent user activity
              </h4>
              <div className="space-y-2">
                {detailUser.recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px]"
                  >
                    <p className="font-semibold text-[#1E1B2E]">{act.action}</p>
                    <p className="text-[11px] text-[#5F5B75] mt-0.5">{act.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

// ============================================================================
// 3. ADMIN COURSES (/admin/courses)
// Status tabs (All, Pending, Published, Rejected, Draft), table (instructor,
// category, learners, status), actions: Approve, Reject (reason required, in a
// modal), Feature toggle, Unpublish, Delete; course preview drawer.
// ============================================================================
export const AdminCoursesPage: React.FC = () => {
  const { courses, setCourses, addToast } = useApp();

  const [statusTab, setStatusTab] = useState<
    'All' | 'Pending review' | 'Published' | 'Rejected' | 'Draft'
  >('All');
  const [rejectReasonsMap, setRejectReasonsMap] = useState<Record<string, string>>({
    'course-11': 'Module 2 video resolution is below 1080p HD minimum requirement.',
  });
  const [rejectModalCourse, setRejectModalCourse] = useState<Course | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);
  const [deleteCourseTarget, setDeleteCourseTarget] = useState<Course | null>(null);

  const filteredCourses = useMemo(() => {
    if (statusTab === 'All') return courses;
    return courses.filter((c) => c.status === statusTab);
  }, [courses, statusTab]);

  const handleUpdateCourseStatus = (
    course: Course,
    nextStatus: Course['status']
  ) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === course.id ? { ...c, status: nextStatus } : c))
    );
    if (previewCourse?.id === course.id) {
      setPreviewCourse({ ...course, status: nextStatus });
    }
    addToast({
      title: `Course status overridden to ${nextStatus}`,
      message: course.title,
      variant: nextStatus === 'Published' ? 'success' : 'info',
    });
  };

  const handleConfirmReject = () => {
    if (!rejectModalCourse) return;
    if (rejectReasonInput.trim().length < 8) {
      setRejectError('A clear rejection reason (at least 8 characters) is required.');
      return;
    }
    setRejectReasonsMap((prev) => ({
      ...prev,
      [rejectModalCourse.id]: rejectReasonInput.trim(),
    }));
    handleUpdateCourseStatus(rejectModalCourse, 'Rejected');
    setRejectReasonInput('');
    setRejectError('');
    setRejectModalCourse(null);
  };

  const handleToggleFeatured = (id: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, featured: !c.featured } : c))
    );
    addToast({
      title: 'Featured sticker tag updated',
      variant: 'success',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Admin dashboard', to: '/admin/dashboard' },
          { label: 'Courses' },
        ]}
      />

      <div>
        <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
          Course catalog governance
        </h1>
        <p className="text-[16px] text-[#5F5B75]">
          Approve, reject with a required reason, unpublish, feature, or override any course status.
        </p>
      </div>

      <CourseWorkflowBanner roleMode="admin" />

      {/* Status Tabs: All, Pending, Published, Rejected, Draft */}
      <div className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5]">
        {(
          [
            { id: 'All', label: 'All' },
            { id: 'Pending review', label: 'Pending' },
            { id: 'Published', label: 'Published' },
            { id: 'Rejected', label: 'Rejected' },
            { id: 'Draft', label: 'Draft' },
          ] as const
        ).map((tab) => {
          const count =
            tab.id === 'All'
              ? courses.length
              : courses.filter((c) => c.status === tab.id).length;
          const active = statusTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={`h-9 px-3.5 rounded-[10px] text-[13px] font-bold inline-flex items-center gap-2 cursor-pointer transition-all ${
                active
                  ? 'bg-white text-[#6D4AE0] shadow-purple-sm'
                  : 'text-[#5F5B75] hover:text-[#1E1B2E]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 text-[11px] rounded-full ${
                  active ? 'bg-[#F3EFFF] text-[#6D4AE0]' : 'bg-white text-[#5F5B75]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Horizontally Scrollable Courses Table */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[14px] min-w-[880px]">
            <thead>
              <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Instructor</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Learners</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Featured</th>
                <th className="py-3.5 px-4 text-right">Admin override actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E1F5]">
              {filteredCourses.map((c) => (
                <tr key={c.id} className="hover:bg-[#FAF8FF]">
                  <td className="py-4 px-4">
                    <button
                      type="button"
                      onClick={() => setPreviewCourse(c)}
                      className="flex items-center gap-3 text-left cursor-pointer group"
                    >
                      <img
                        src={c.thumbnail}
                        alt={c.title}
                        onError={handleImageError}
                        className="w-12 h-9 rounded-[6px] object-cover shrink-0 border border-[#E6E1F5]"
                      />
                      <div>
                        <p className="font-bold text-[#1E1B2E] group-hover:text-[#6D4AE0]">
                          {c.title}
                        </p>
                        <p className="text-[12px] text-[#5F5B75]">
                          {c.lessonsCount} lessons • {c.duration}
                        </p>
                        {c.status === 'Rejected' && rejectReasonsMap[c.id] && (
                          <p className="text-[11px] text-[#DC2626] font-semibold mt-0.5">
                            Reason: {rejectReasonsMap[c.id]}
                          </p>
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="py-4 px-4 font-medium text-[#1E1B2E]">
                    {c.instructorName}
                  </td>
                  <td className="py-4 px-4 text-[#5F5B75]">{c.categoryName}</td>
                  <td className="py-4 px-4 font-bold text-[#1E1B2E]">
                    {c.studentsCount.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <StatusChip
                      label={c.status}
                      variant={
                        c.status === 'Published'
                          ? 'success'
                          : c.status === 'Pending review'
                          ? 'warning'
                          : c.status === 'Rejected'
                          ? 'danger'
                          : 'neutral'
                      }
                    />
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(c.id)}
                      className="cursor-pointer"
                    >
                      {c.featured ? (
                        <FeaturedStickerTag label="Featured" />
                      ) : (
                        <span className="text-[12px] font-semibold text-[#5F5B75] hover:text-[#6D4AE0] underline">
                          + Feature
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewCourse(c)}
                      >
                        Preview
                      </Button>
                      {c.status !== 'Published' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleUpdateCourseStatus(c, 'Published')}
                        >
                          Approve
                        </Button>
                      )}
                      {c.status === 'Published' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUpdateCourseStatus(c, 'Draft')}
                        >
                          Unpublish
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setRejectModalCourse(c);
                          setRejectReasonInput(rejectReasonsMap[c.id] || '');
                          setRejectError('');
                        }}
                      >
                        Reject
                      </Button>
                      <button
                        type="button"
                        onClick={() => setDeleteCourseTarget(c)}
                        className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#DC2626] cursor-pointer"
                        title="Delete course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REJECT COURSE MODAL (Reason Required) */}
      <Modal
        open={Boolean(rejectModalCourse)}
        onClose={() => setRejectModalCourse(null)}
        title="Reject course submission"
        description="A rejection reason is required and will be shown to the instructor."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectModalCourse(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmReject}>
              Confirm rejection
            </Button>
          </>
        }
      >
        {rejectModalCourse && (
          <div className="space-y-3 text-[14px]">
            <p className="font-bold text-[#1E1B2E]">
              Course: {rejectModalCourse.title} (by {rejectModalCourse.instructorName})
            </p>
            <textarea
              rows={3}
              aria-label="Course rejection reason"
              value={rejectReasonInput}
              onChange={(e) => {
                setRejectReasonInput(e.target.value);
                setRejectError('');
              }}
              placeholder="Explain what the instructor must fix before re-submitting (e.g. missing captions or fewer than 20 exam questions)..."
              className="w-full p-3 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#DC2626] focus:outline-none"
            />
            {rejectError && (
              <p className="text-[12px] text-[#DC2626] font-bold">{rejectError}</p>
            )}
          </div>
        )}
      </Modal>

      {/* DELETE COURSE CONFIRM DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteCourseTarget)}
        onClose={() => setDeleteCourseTarget(null)}
        title="Delete course permanently?"
        description={
          deleteCourseTarget
            ? `Are you sure you want to permanently delete "${deleteCourseTarget.title}"?`
            : ''
        }
        confirmLabel="Delete course"
        tone="danger"
        onConfirm={() => {
          if (!deleteCourseTarget) return;
          setCourses((prev) => prev.filter((c) => c.id !== deleteCourseTarget.id));
          addToast({
            title: `Deleted ${deleteCourseTarget.title}`,
            variant: 'info',
          });
          setDeleteCourseTarget(null);
        }}
      />

      {/* COURSE PREVIEW DRAWER */}
      <Drawer
        open={Boolean(previewCourse)}
        onClose={() => setPreviewCourse(null)}
        title="Course preview & status override"
        footer={
          <Button variant="primary" fullWidth onClick={() => setPreviewCourse(null)}>
            Close preview
          </Button>
        }
      >
        {previewCourse && (
          <div className="space-y-5 text-[14px]">
            <img
              src={previewCourse.thumbnail}
              alt={previewCourse.title}
              onError={handleImageError}
              className="w-full h-44 rounded-[12px] object-cover border border-[#E6E1F5]"
            />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusChip label={previewCourse.categoryName} variant="primary" />
                <StatusChip label={previewCourse.status} variant="info" />
              </div>
              <h3 className="font-display font-bold text-[22px] text-[#1E1B2E]">
                {previewCourse.title}
              </h3>
              <p className="text-[#5F5B75]">{previewCourse.subtitle}</p>
            </div>

            <div className="p-4 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#5F5B75]">Instructor</span>
                <strong className="text-[#1E1B2E]">{previewCourse.instructorName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F5B75]">Duration & lessons</span>
                <strong className="text-[#1E1B2E]">
                  {previewCourse.duration} ({previewCourse.lessonsCount} lessons)
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F5B75]">Price</span>
                <strong className="text-[#6D4AE0]">
                  {previewCourse.price === 0 ? 'Free' : `$${previewCourse.price.toFixed(2)}`}
                </strong>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E6E1F5]">
              <p className="text-[12px] font-bold text-[#5F5B75]">
                Admin status override:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  ['Published', 'Pending review', 'Draft', 'Rejected'] as const
                ).map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={previewCourse.status === st ? 'primary' : 'secondary'}
                    onClick={() => handleUpdateCourseStatus(previewCourse, st)}
                  >
                    Set {st}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

// ============================================================================
// 4. ADMIN CATEGORIES (/admin/categories)
// List with course counts, add/edit modal, delete confirm, drag to reorder.
// ============================================================================
export const AdminCategoriesPage: React.FC = () => {
  const { categories, setCategories, addToast } = useApp();

  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catColor, setCatColor] = useState('#6D4AE0');
  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleMoveCategory = (from: number, to: number) => {
    if (to < 0 || to >= categories.length) return;
    setCategories((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  };

  const handleOpenAdd = () => {
    setEditingCat(null);
    setCatName('');
    setCatDesc('');
    setCatColor('#6D4AE0');
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatDesc(cat.description);
    setCatColor(cat.accentColor);
    setModalOpen(true);
  };

  const handleSaveCategory = () => {
    if (!catName.trim()) return;
    if (editingCat) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCat.id
            ? {
                ...c,
                name: catName.trim(),
                slug: catName.trim().toLowerCase().replace(/\s+/g, '-'),
                description: catDesc.trim() || c.description,
                accentColor: catColor,
              }
            : c
        )
      );
      addToast({ title: 'Category updated', variant: 'success' });
    } else {
      setCategories((prev) => [
        ...prev,
        {
          id: `cat-${Date.now()}`,
          name: catName.trim(),
          slug: catName.trim().toLowerCase().replace(/\s+/g, '-'),
          description:
            catDesc.trim() || 'Academic subject track managed by platform admin.',
          courseCount: 0,
          iconName: 'BookOpen',
          accentColor: catColor,
        },
      ]);
      addToast({ title: 'Category created', variant: 'success' });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Admin dashboard', to: '/admin/dashboard' },
          { label: 'Categories' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Categories ({categories.length})
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Drag categories to reorder catalog display, or add, edit, and remove tracks.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<PlusCircle className="w-4 h-4" />}
          onClick={handleOpenAdd}
        >
          Add category
        </Button>
      </div>

      <div className="space-y-3">
        {categories.map((cat, idx) => (
          <div
            key={cat.id}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIdx !== null && dragIdx !== idx) {
                handleMoveCategory(dragIdx, idx);
              }
              setDragIdx(null);
            }}
            className="rounded-[12px] bg-white border border-[#E6E1F5] hover:border-[#A78BFA] p-4 sm:p-5 shadow-purple-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <GripVertical className="w-5 h-5 text-[#5F5B75] shrink-0 mt-1 sm:mt-0" />
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-display font-bold shrink-0"
                style={{ backgroundColor: cat.accentColor }}
              >
                {idx + 1}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-display font-bold text-[20px] text-[#1E1B2E]">
                    {cat.name}
                  </h3>
                  <StatusChip label={`${cat.courseCount} courses`} variant="primary" />
                </div>
                <p className="text-[13px] text-[#5F5B75] mt-0.5">{cat.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => handleMoveCategory(idx, idx - 1)}
                className="p-2 rounded-[8px] border border-[#E6E1F5] text-[#5F5B75] hover:text-[#6D4AE0] disabled:opacity-40 cursor-pointer"
                title="Move up"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={idx === categories.length - 1}
                onClick={() => handleMoveCategory(idx, idx + 1)}
                className="p-2 rounded-[8px] border border-[#E6E1F5] text-[#5F5B75] hover:text-[#6D4AE0] disabled:opacity-40 cursor-pointer"
                title="Move down"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                onClick={() => handleOpenEdit(cat)}
              >
                Edit
              </Button>
              <button
                type="button"
                onClick={() => setDeleteCatTarget(cat)}
                className="p-2 rounded-[8px] border border-[#E6E1F5] text-[#5F5B75] hover:text-[#DC2626] cursor-pointer"
                title="Delete category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ADD / EDIT CATEGORY MODAL */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCat ? 'Edit category' : 'Add category'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCategory}>
              Save category
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-[14px]">
          <div className="space-y-1">
            <label htmlFor="admin-cat-name" className="block font-bold text-[#1E1B2E]">Category name *</label>
            <input
              id="admin-cat-name"
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Cloud & DevOps"
              className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5]"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="admin-cat-desc" className="block font-bold text-[#1E1B2E]">Description</label>
            <textarea
              id="admin-cat-desc"
              rows={3}
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              className="w-full p-3 rounded-[10px] bg-white border border-[#E6E1F5]"
            />
          </div>
        </div>
      </Modal>

      {/* DELETE CATEGORY CONFIRM DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteCatTarget)}
        onClose={() => setDeleteCatTarget(null)}
        title="Delete category?"
        description={
          deleteCatTarget
            ? `Are you sure you want to permanently delete category "${deleteCatTarget.name}"?`
            : ''
        }
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (!deleteCatTarget) return;
          setCategories((prev) => prev.filter((c) => c.id !== deleteCatTarget.id));
          addToast({
            title: `Deleted category ${deleteCatTarget.name}`,
            variant: 'info',
          });
          setDeleteCatTarget(null);
        }}
      />
    </div>
  );
};

// ============================================================================
// 5. ADMIN CERTIFICATES (/admin/certificates)
// Issued certificates table (ID, student, course, date, status Valid/Revoked)
// with a Revoke action.
// ============================================================================
export const AdminCertificatesPage: React.FC = () => {
  const { certificates, setCertificates, addToast } = useApp();
  const [revokeCertTarget, setRevokeCertTarget] = useState<
    (typeof certificates)[number] | null
  >(null);

  const handleToggleRevoke = (id: string) => {
    setCertificates((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const nextStatus = c.status === 'Valid' ? 'Revoked' : 'Valid';
        addToast({
          title:
            nextStatus === 'Revoked'
              ? `Certificate ${c.verificationCode} revoked`
              : `Certificate ${c.verificationCode} restored`,
          variant: nextStatus === 'Revoked' ? 'danger' : 'success',
        });
        return { ...c, status: nextStatus };
      })
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Admin dashboard', to: '/admin/dashboard' },
          { label: 'Certificates' },
        ]}
      />

      <div>
        <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
          Issued certificates registry
        </h1>
        <p className="text-[16px] text-[#5F5B75]">
          Audit issued graduate credentials and revoke compromised or invalid certificates.
        </p>
      </div>

      <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[14px] min-w-[740px]">
            <thead>
              <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                <th className="py-3.5 px-4">Certificate ID</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Date issued</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E1F5]">
              {certificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-[#FAF8FF]">
                  <td className="py-4 px-4">
                    <Link
                      to={`/verify/${cert.verificationCode}`}
                      className="font-mono font-bold text-[#6D4AE0] hover:underline"
                    >
                      {cert.verificationCode}
                    </Link>
                  </td>
                  <td className="py-4 px-4 font-bold text-[#1E1B2E]">
                    {cert.studentName}
                  </td>
                  <td className="py-4 px-4 text-[#1E1B2E]">{cert.courseTitle}</td>
                  <td className="py-4 px-4 text-[13px] text-[#5F5B75]">
                    {cert.issuedAt}
                  </td>
                  <td className="py-4 px-4">
                    <StatusChip
                      label={cert.status}
                      variant={cert.status === 'Valid' ? 'success' : 'danger'}
                    />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link to={`/certificates/${cert.id}`}>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant={cert.status === 'Valid' ? 'danger' : 'secondary'}
                        onClick={() => {
                          if (cert.status === 'Valid') {
                            setRevokeCertTarget(cert);
                          } else {
                            handleToggleRevoke(cert.id);
                          }
                        }}
                      >
                        {cert.status === 'Valid' ? 'Revoke' : 'Restore valid'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(revokeCertTarget)}
        onClose={() => setRevokeCertTarget(null)}
        title="Revoke issued certificate?"
        description={
          revokeCertTarget
            ? `Certificate ${revokeCertTarget.verificationCode} for ${revokeCertTarget.studentName} (${revokeCertTarget.courseTitle}) will immediately show as Revoked on public verification links.`
            : ''
        }
        confirmLabel="Revoke certificate"
        tone="danger"
        onConfirm={() => {
          if (!revokeCertTarget) return;
          handleToggleRevoke(revokeCertTarget.id);
          setRevokeCertTarget(null);
        }}
      />
    </div>
  );
};

// ============================================================================
// 6. ADMIN SETTINGS (/admin/settings)
// Platform name, default exam pass score, upload limits, and a read-only
// Roles and permissions matrix (Student, Instructor, Supervisor, Admin vs features)
// with checkmarks.
// ============================================================================
export const AdminSettingsPage: React.FC = () => {
  const { addToast } = useApp();
  const [platformName, setPlatformName] = useState('EduHub');
  const [defaultPassScore, setDefaultPassScore] = useState('60');
  const [maxImageSizeMb, setMaxImageSizeMb] = useState('5');
  const [maxVideoSizeGb, setMaxVideoSizeGb] = useState('2');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      title: 'Platform settings updated',
      message: `${platformName}: Default exam pass score ${defaultPassScore}%, uploads ${maxImageSizeMb}MB JPG/PNG & ${maxVideoSizeGb}GB MP4.`,
      variant: 'success',
    });
  };

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Admin dashboard', to: '/admin/dashboard' },
          { label: 'Settings' },
        ]}
      />

      <div>
        <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
          Platform settings & permissions
        </h1>
        <p className="text-[16px] text-[#5F5B75]">
          Configure global defaults, media upload limits, and review the role-based access control matrix.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-6"
      >
        <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
          Global configuration & upload limits
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="space-y-1.5">
            <label htmlFor="platform-name-input" className="block text-[13px] font-bold text-[#1E1B2E]">
              Platform name
            </label>
            <input
              id="platform-name-input"
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-bold text-[15px]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="platform-pass-score-input" className="block text-[13px] font-bold text-[#1E1B2E]">
              Default exam pass score (%)
            </label>
            <input
              id="platform-pass-score-input"
              type="number"
              min={50}
              max={100}
              value={defaultPassScore}
              onChange={(e) => setDefaultPassScore(e.target.value)}
              className="w-full h-11 px-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-display font-bold text-[18px] text-[#16A34A]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="platform-image-limit-input" className="block text-[13px] font-bold text-[#1E1B2E]">
              Cover image upload limit (MB, JPG/PNG)
            </label>
            <input
              id="platform-image-limit-input"
              type="number"
              min={1}
              max={50}
              value={maxImageSizeMb}
              onChange={(e) => setMaxImageSizeMb(e.target.value)}
              className="w-full h-11 px-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-bold text-[15px]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="platform-video-limit-input" className="block text-[13px] font-bold text-[#1E1B2E]">
              Video upload limit (GB, MP4)
            </label>
            <input
              id="platform-video-limit-input"
              type="number"
              min={1}
              max={10}
              value={maxVideoSizeGb}
              onChange={(e) => setMaxVideoSizeGb(e.target.value)}
              className="w-full h-11 px-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-bold text-[15px]"
            />
          </div>
        </div>
        <div className="flex justify-end pt-2 border-t border-[#E6E1F5]">
          <Button type="submit" variant="primary">
            Save platform settings
          </Button>
        </div>
      </form>

      {/* READ-ONLY ROLES AND PERMISSIONS MATRIX (Student, Instructor, Supervisor, Admin vs features) */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
              Roles and permissions matrix (read-only)
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Enforced role-based access control across Student, Instructor, Supervisor, and Admin workspaces.
            </p>
          </div>
          <StatusChip label="RBAC enforced" variant="primary" />
        </div>

        <div className="overflow-x-auto rounded-[10px] border border-[#E6E1F5]">
          <table className="w-full text-left border-collapse text-[14px] min-w-[680px]">
            <thead>
              <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                <th className="py-3.5 px-4">Platform capability / feature</th>
                <th className="py-3.5 px-4 text-center">Student</th>
                <th className="py-3.5 px-4 text-center">Instructor</th>
                <th className="py-3.5 px-4 text-center">Supervisor</th>
                <th className="py-3.5 px-4 text-center">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E1F5]">
              {ROLES_PERMISSIONS_MATRIX.map((row) => (
                <tr key={row.feature} className="hover:bg-[#FAF8FF]">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-[#1E1B2E]">{row.feature}</p>
                    <p className="text-[11px] text-[#6D4AE0] font-semibold">
                      {row.category}
                    </p>
                  </td>
                  {(['student', 'instructor', 'supervisor', 'admin'] as const).map(
                    (roleKey) => {
                      const allowed = row[roleKey];
                      return (
                        <td key={roleKey} className="py-3.5 px-4 text-center">
                          {allowed ? (
                            <span className="inline-flex w-6 h-6 rounded-full bg-[#16A34A]/15 text-[#16A34A] items-center justify-center">
                              <Check className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="inline-flex w-6 h-6 rounded-full bg-[#FAF8FF] text-[#5F5B75]/40 items-center justify-center">
                              <Minus className="w-4 h-4" />
                            </span>
                          )}
                        </td>
                      );
                    }
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
