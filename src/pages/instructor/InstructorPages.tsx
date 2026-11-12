import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  PlusCircle,
  Users,
  Star,
  BookOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  Trash2,
  Search,
  LayoutGrid,
  List,
  ThumbsUp,
  Award,
  ExternalLink,
  Sparkles,
  Send,
} from 'lucide-react';
import {
  Button,
  StatusChip,
  Breadcrumbs,
  Avatar,
  ProgressBar,
  ProgressRing,
  Modal,
  Drawer,
  EmptyState,
  ConfirmDialog,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { handleImageError } from '../../utils/imageFallback';
import {
  ENROLLMENTS_30_DAYS,
  INITIAL_INSTRUCTOR_COURSES,
  ENROLLED_STUDENTS_DATA,
  INITIAL_INSTRUCTOR_COMMENTS,
  InstructorCourseRecord,
  EnrolledStudentRecord,
  InstructorCommentThread,
} from '../../data/instructorMockData';

export { InstructorCreateCoursePage } from './InstructorCourseWizard';
export {
  InstructorQuestionBankPage,
  InstructorExamSettingsPage,
} from './InstructorQuestionBankAndExam';

// ============================================================================
// 1. INSTRUCTOR DASHBOARD (/instructor/dashboard)
// Stat cards (Courses, Learners, Average rating, Completion rate), enrollments
// line chart (last 30 days), top courses table, recent comments to reply to,
// notices for courses pending review or rejected.
// ============================================================================
export const InstructorDashboardPage: React.FC = () => {
  const { addToast } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const instructor = {
    name: user?.name || 'Instructor',
    avatar: user?.avatar || '',
  };

  const [selectedPointIdx, setSelectedPointIdx] = useState<number>(
    ENROLLMENTS_30_DAYS.length - 1
  );
  const [quickReplies, setQuickReplies] = useState<Record<string, string>>({});
  const [recentThreads, setRecentThreads] = useState<InstructorCommentThread[]>(
    INITIAL_INSTRUCTOR_COMMENTS
  );

  const publishedCourses = INITIAL_INSTRUCTOR_COURSES.filter(
    (c) => c.status === 'Published'
  );
  const pendingCourse = INITIAL_INSTRUCTOR_COURSES.find(
    (c) => c.status === 'Pending review'
  );
  const rejectedCourse = INITIAL_INSTRUCTOR_COURSES.find((c) => c.status === 'Rejected');

  const chartWidth = 640;
  const chartHeight = 180;
  const maxEnrollment = 140;
  const svgPoints = ENROLLMENTS_30_DAYS.map((pt, idx) => {
    const x = Math.round((idx / (ENROLLMENTS_30_DAYS.length - 1)) * (chartWidth - 40) + 20);
    const y = Math.round(
      chartHeight - 24 - (pt.enrollments / maxEnrollment) * (chartHeight - 48)
    );
    return { ...pt, x, y, idx };
  });
  const polylineString = svgPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const areaString = `${svgPoints[0].x},${chartHeight - 20} ${polylineString} ${
    svgPoints[svgPoints.length - 1].x
  },${chartHeight - 20}`;

  const activePoint = svgPoints[selectedPointIdx] || svgPoints[svgPoints.length - 1];

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <StatusChip label="Instructor studio" variant="orange" />
          <h1 className="text-[34px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Welcome, {instructor.name}
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Track your 30-day student enrollments, reply to lesson Q&A, and manage course
            approvals.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/instructor/courses/new">
            <Button variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />}>
              New course
            </Button>
          </Link>
          <Link to="/instructor/question-bank">
            <Button variant="secondary">Question bank</Button>
          </Link>
        </div>
      </div>

      {/* NOTICES FOR COURSES PENDING REVIEW OR REJECTED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pendingCourse && (
          <div className="rounded-[12px] bg-[#FFFBEB] border border-[#F59E0B]/50 p-4 sm:p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-[13px]">
                <div className="flex items-center gap-2">
                  <StatusChip label="Pending review" variant="warning" />
                  <span className="text-[#5F5B75]">Submitted {pendingCourse.submittedAt}</span>
                </div>
                <p className="font-display font-bold text-[17px] text-[#1E1B2E]">
                  {pendingCourse.title}
                </p>
                <p className="text-[#5F5B75]">
                  Currently in Supervisor Hana Mostafa’s syllabus review queue (est. 24h).
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white shrink-0"
              onClick={() => navigate('/instructor/courses')}
            >
              View status
            </Button>
          </div>
        )}

        {rejectedCourse && (
          <div className="rounded-[12px] bg-[#FEF2F2] border border-[#DC2626]/40 p-4 sm:p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-white text-[#DC2626] border border-[#DC2626]/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-[13px]">
                <StatusChip label="Rejected — Action required" variant="danger" />
                <p className="font-display font-bold text-[17px] text-[#1E1B2E]">
                  {rejectedCourse.title}
                </p>
                <p className="text-[#DC2626] font-medium line-clamp-2">
                  {rejectedCourse.rejectionReason}
                </p>
              </div>
            </div>
            <Link
              to={`/instructor/courses/new?edit=${rejectedCourse.id}`}
              className="shrink-0"
            >
              <Button size="sm" variant="danger">
                Fix & resubmit
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 4 STAT CARDS (Courses, Learners, Average rating, Completion rate) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Courses',
            value: INITIAL_INSTRUCTOR_COURSES.length,
            sub: '4 published • 1 pending • 1 draft',
            icon: <BookOpen className="w-5 h-5 text-[#6D4AE0]" />,
            to: '/instructor/courses',
          },
          {
            label: 'Learners',
            value: '37,390',
            sub: '+1,096 in last 30 days',
            icon: <Users className="w-5 h-5 text-[#6D4AE0]" />,
            to: '/instructor/students',
          },
          {
            label: 'Average rating',
            value: '4.88',
            sub: 'Across 2,805 student reviews',
            icon: <Star className="w-5 h-5 fill-[#F5B82E] text-[#F5B82E]" />,
            to: '/instructor/courses',
          },
          {
            label: 'Completion rate',
            value: '81%',
            sub: 'Students finishing 100% lessons',
            icon: <TrendingUp className="w-5 h-5 text-[#16A34A]" />,
            to: '/instructor/students',
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="rounded-[12px] bg-white border border-[#E6E1F5] hover:border-[#A78BFA] p-5 shadow-purple-sm hover:shadow-purple-md transition-all flex items-start justify-between"
          >
            <div>
              <p className="text-[14px] text-[#5F5B75] font-medium">{stat.label}</p>
              <p className="font-display font-bold text-[32px] text-[#1E1B2E] mt-1 leading-none">
                {stat.value}
              </p>
              <p className="text-[12px] text-[#5F5B75] mt-1.5">{stat.sub}</p>
            </div>
            <div className="w-10 h-10 rounded-[10px] bg-[#F3EFFF] flex items-center justify-center shrink-0">
              {stat.icon}
            </div>
          </Link>
        ))}
      </div>

      {/* ENROLLMENTS LINE CHART (LAST 30 DAYS) & RECENT COMMENTS TO REPLY TO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Enrollments Line Chart (Last 30 Days) */}
        <div className="lg:col-span-7 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                Enrollments (last 30 days)
              </h2>
              <p className="text-[13px] text-[#5F5B75]">
                1,096 new student enrollments • Click any data point to inspect
              </p>
            </div>
            <div className="px-3.5 py-1.5 rounded-[10px] bg-[#F3EFFF] border border-[#E6E1F5] text-[13px]">
              <span className="text-[#5F5B75]">{activePoint.dateFull}: </span>
              <strong className="text-[#6D4AE0]">{activePoint.enrollments} enrollments</strong>
            </div>
          </div>

          <div className="w-full overflow-x-auto pt-2">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-48 overflow-visible"
              role="img"
              aria-label="Enrollments line chart over the last 30 days"
            >
              <defs>
                <linearGradient id="enrollAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6D4AE0" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#6D4AE0" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {[40, 85, 130].map((yLine) => (
                <line
                  key={yLine}
                  x1="20"
                  y1={yLine}
                  x2={chartWidth - 20}
                  y2={yLine}
                  stroke="#E6E1F5"
                  strokeDasharray="4 4"
                />
              ))}

              <polygon points={areaString} fill="url(#enrollAreaGrad)" />

              <polyline
                fill="none"
                stroke="#6D4AE0"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylineString}
              />

              {svgPoints.map((pt) => {
                const isSelected = pt.idx === selectedPointIdx;
                return (
                  <g
                    key={pt.dayLabel}
                    onClick={() => setSelectedPointIdx(pt.idx)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 7 : 4.5}
                      fill={isSelected ? '#6D4AE0' : '#FFFFFF'}
                      stroke="#6D4AE0"
                      strokeWidth="2.5"
                    />
                    {pt.idx % 3 === 0 && (
                      <text
                        x={pt.x}
                        y={chartHeight - 4}
                        textAnchor="middle"
                        className="text-[10px] fill-[#5F5B75] font-semibold"
                      >
                        {pt.dateFull}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Recent Comments to Reply To */}
        <div className="lg:col-span-5 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                Recent comments to reply to
              </h2>
              <p className="text-[13px] text-[#5F5B75]">
                Unanswered student questions from your lessons
              </p>
            </div>
            <Link to="/instructor/comments">
              <Button size="sm" variant="ghost">
                Inbox ({recentThreads.filter((t) => !t.resolved).length})
              </Button>
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {recentThreads.slice(0, 2).map((th) => (
              <div
                key={th.id}
                className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar src={th.studentAvatar} name={th.studentName} size="sm" />
                    <div>
                      <p className="text-[13px] font-bold text-[#1E1B2E]">{th.studentName}</p>
                      <Link
                        to={`/learn/${th.courseId}/${th.lessonId}`}
                        className="text-[11px] font-semibold text-[#6D4AE0] hover:underline block truncate max-w-[220px]"
                      >
                        {th.lessonTitle}
                      </Link>
                    </div>
                  </div>
                  <StatusChip
                    label={th.resolved ? 'Resolved' : 'Unanswered'}
                    variant={th.resolved ? 'success' : 'orange'}
                  />
                </div>

                <p className="text-[13px] text-[#1E1B2E] line-clamp-2">{th.content}</p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={quickReplies[th.id] || ''}
                    onChange={(e) =>
                      setQuickReplies((prev) => ({ ...prev, [th.id]: e.target.value }))
                    }
                    placeholder="Write a quick reply..."
                    aria-label={`Quick reply to ${th.studentName}`}
                    className="flex-1 h-10 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px] focus:outline-none focus:border-[#6D4AE0]"
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      if (!quickReplies[th.id]?.trim()) return;
                      setRecentThreads((prev) =>
                        prev.map((item) =>
                          item.id === th.id ? { ...item, resolved: true } : item
                        )
                      );
                      setQuickReplies((prev) => ({ ...prev, [th.id]: '' }));
                      addToast({
                        title: `Replied to ${th.studentName}`,
                        message: 'Thread marked as answered.',
                        variant: 'success',
                      });
                    }}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOP COURSES TABLE */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
              Top performing courses
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Enrollment volume, ratings, and completion rates across your published catalog.
            </p>
          </div>
          <Link to="/instructor/courses">
            <Button variant="secondary" size="sm">
              Manage all courses
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto rounded-[10px] border border-[#E6E1F5]">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr className="bg-[#FAF8FF] border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Learners</th>
                <th className="py-3.5 px-4">Rating</th>
                <th className="py-3.5 px-4">Completion rate</th>
                <th className="py-3.5 px-4">Updated</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E1F5]">
              {publishedCourses.map((c) => (
                <tr key={c.id} className="hover:bg-[#FAF8FF]">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={c.thumbnail}
                        alt={c.title}
                        onError={handleImageError}
                        className="w-12 h-9 rounded-[6px] object-cover shrink-0 border border-[#E6E1F5]"
                      />
                      <div>
                        <Link
                          to={`/courses/${c.id}`}
                          className="font-bold text-[#1E1B2E] hover:text-[#6D4AE0]"
                        >
                          {c.title}
                        </Link>
                        <p className="text-[12px] text-[#5F5B75]">
                          {c.lessonsCount} lessons • {c.duration}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#1E1B2E]">
                    {c.studentsCount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 font-bold text-[#1E1B2E]">
                      <Star className="w-4 h-4 fill-[#F5B82E] text-[#F5B82E]" />
                      {c.rating.toFixed(1)}{' '}
                      <span className="text-[#5F5B75] font-normal">({c.reviewCount})</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 w-44">
                    <ProgressBar value={c.completionRate} size="sm" color="success" />
                  </td>
                  <td className="py-3.5 px-4 text-[13px] text-[#5F5B75]">{c.updatedAt}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Link to={`/instructor/courses/new?edit=${c.id}`}>
                        <Button size="sm" variant="secondary">
                          Edit
                        </Button>
                      </Link>
                      <Link to={`/courses/${c.id}`}>
                        <Button size="sm" variant="ghost">
                          Preview
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. MY COURSES (/instructor/courses)
// Status tabs (All, Draft, Pending review, Published, Rejected with reason),
// table or grid (cover, title, status chip, learners, rating, updated), search,
// actions (Edit, Preview, Delete with confirm modal), "New course" button, empty state.
// ============================================================================
export const InstructorCoursesPage: React.FC = () => {
  const { addToast } = useApp();
  const navigate = useNavigate();

  const [courseList, setCourseList] = useState<InstructorCourseRecord[]>(
    INITIAL_INSTRUCTOR_COURSES
  );
  const [statusTab, setStatusTab] = useState<
    'All' | 'Draft' | 'Pending review' | 'Published' | 'Rejected'
  >('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [courseToDelete, setCourseToDelete] = useState<InstructorCourseRecord | null>(null);
  const [previewEmpty, setPreviewEmpty] = useState(false);

  const filtered = useMemo(() => {
    if (previewEmpty) return [];
    const q = searchQuery.trim().toLowerCase();
    return courseList.filter((c) => {
      if (statusTab !== 'All' && c.status !== statusTab) return false;
      if (
        q &&
        !c.title.toLowerCase().includes(q) &&
        !c.categoryName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [courseList, statusTab, searchQuery, previewEmpty]);

  const getStatusVariant = (status: InstructorCourseRecord['status']) => {
    if (status === 'Published') return 'success';
    if (status === 'Pending review') return 'warning';
    if (status === 'Rejected') return 'danger';
    return 'neutral';
  };

  const handleConfirmDelete = () => {
    if (!courseToDelete) return;
    setCourseList((prev) => prev.filter((c) => c.id !== courseToDelete.id));
    addToast({
      title: 'Course deleted',
      message: `"${courseToDelete.title}" has been removed.`,
      variant: 'info',
    });
    setCourseToDelete(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Instructor dashboard', to: '/instructor/dashboard' },
          { label: 'My courses' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            My courses
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Manage drafts, supervisor review submissions, and published courses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setPreviewEmpty((v) => !v)}
            className="px-3 py-1.5 rounded-[10px] bg-white border border-[#E6E1F5] text-[12px] font-semibold text-[#6D4AE0] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F59E3B]" />
            <span>{previewEmpty ? 'Restore courses' : 'Preview empty state'}</span>
          </button>
          <Link to="/instructor/courses/new">
            <Button variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />}>
              New course
            </Button>
          </Link>
        </div>
      </div>

      {/* Toolbar: Status Tabs + Search + Table/Grid Toggle */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div
          role="tablist"
          className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5]"
        >
          {(['All', 'Published', 'Pending review', 'Draft', 'Rejected'] as const).map(
            (tab) => {
              const count =
                tab === 'All'
                  ? courseList.length
                  : courseList.filter((c) => c.status === tab).length;
              const active = statusTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setStatusTab(tab);
                    setPreviewEmpty(false);
                  }}
                  className={`h-9 px-3.5 rounded-[10px] text-[13px] font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-[#6D4AE0] shadow-purple-sm'
                      : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`px-2 py-0.5 text-[11px] rounded-full ${
                      active ? 'bg-[#F3EFFF] text-[#6D4AE0]' : 'bg-white text-[#5F5B75]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#5F5B75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              aria-label="Search instructor courses"
              className="w-full h-11 pl-9 pr-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] focus:outline-none focus:border-[#6D4AE0]"
            />
          </div>

          <div className="inline-flex items-center p-1 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5]">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`w-10 h-10 flex items-center justify-center rounded-[8px] cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#6D4AE0] text-white'
                  : 'text-[#5F5B75] hover:text-[#1E1B2E]'
              }`}
              aria-label="Table view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`w-10 h-10 flex items-center justify-center rounded-[8px] cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#6D4AE0] text-white'
                  : 'text-[#5F5B75] hover:text-[#1E1B2E]'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No courses match this filter"
          description="Start building a new video course with our 6-step Course Builder Wizard or reset your filter."
          actionLabel="New course"
          actionTo="/instructor/courses/new"
          mood="empty"
        />
      ) : viewMode === 'table' ? (
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[14px]">
              <thead>
                <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Learners</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1F5]">
                {filtered.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr className="hover:bg-[#FAF8FF]">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={c.thumbnail}
                            alt={c.title}
                            onError={handleImageError}
                            className="w-14 h-10 rounded-[8px] object-cover shrink-0 border border-[#E6E1F5]"
                          />
                          <div>
                            <p className="font-display font-bold text-[16px] text-[#1E1B2E]">
                              {c.title}
                            </p>
                            <p className="text-[12px] text-[#5F5B75]">
                              {c.categoryName} • {c.level} • {c.lessonsCount} lessons
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusChip
                          label={c.status}
                          variant={getStatusVariant(c.status)}
                        />
                      </td>
                      <td className="py-4 px-4 font-bold text-[#1E1B2E]">
                        {c.studentsCount > 0 ? c.studentsCount.toLocaleString() : '—'}
                      </td>
                      <td className="py-4 px-4">
                        {c.rating > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#1E1B2E]">
                            <Star className="w-4 h-4 fill-[#F5B82E] text-[#F5B82E]" />
                            {c.rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[#5F5B75]">No ratings yet</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-[13px] text-[#5F5B75]">
                        {c.updatedAt}
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                            onClick={() =>
                              navigate(`/instructor/courses/new?edit=${c.id}`)
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/courses/${c.id}`)}
                          >
                            Preview
                          </Button>
                          <button
                            type="button"
                            onClick={() => setCourseToDelete(c)}
                            className="w-11 h-11 inline-flex items-center justify-center rounded-[8px] text-[#5F5B75] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                            title="Delete course"
                            aria-label={`Delete ${c.title}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {c.status === 'Rejected' && c.rejectionReason && (
                      <tr className="bg-[#FEF2F2]/60">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px] text-[#DC2626]">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>
                                <strong>Rejection reason:</strong> {c.rejectionReason}
                              </span>
                            </div>
                            <Link to={`/instructor/courses/new?edit=${c.id}`}>
                              <Button size="sm" variant="danger">
                                Fix & resubmit
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <article
              key={c.id}
              className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm flex flex-col justify-between overflow-hidden"
            >
              <div className="relative h-44 bg-[#F3EFFF]">
                <img
                  src={c.thumbnail}
                  alt={c.title}
                  onError={handleImageError}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  <StatusChip
                    label={c.status}
                    variant={getStatusVariant(c.status)}
                    className="bg-white/95"
                  />
                </div>
              </div>
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <p className="text-[12px] font-bold text-[#6D4AE0]">
                    {c.categoryName} • Updated {c.updatedAt}
                  </p>
                  <h3 className="font-display font-bold text-[20px] text-[#1E1B2E]">
                    {c.title}
                  </h3>
                  {c.status === 'Rejected' && c.rejectionReason && (
                    <div className="p-3 rounded-[8px] bg-[#FEF2F2] border border-[#DC2626]/30 text-[12px] text-[#DC2626]">
                      {c.rejectionReason}
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-[#E6E1F5] flex items-center justify-between gap-2">
                  <div className="text-[13px] text-[#5F5B75]">
                    <strong>{c.studentsCount.toLocaleString()}</strong> learners
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/instructor/courses/new?edit=${c.id}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/courses/${c.id}`)}
                    >
                      Preview
                    </Button>
                    <button
                      type="button"
                      onClick={() => setCourseToDelete(c)}
                      className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#DC2626] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* CONFIRM DELETE COURSE MODAL */}
      <ConfirmDialog
        open={Boolean(courseToDelete)}
        onClose={() => setCourseToDelete(null)}
        title="Delete this course?"
        description={
          courseToDelete
            ? `Are you sure you want to permanently delete "${courseToDelete.title}" (${courseToDelete.status})? This action cannot be undone.`
            : ''
        }
        confirmLabel="Confirm delete"
        tone="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

// ============================================================================
// 6. STUDENTS (/instructor/students)
// Course filter, table (avatar, name, email, progress bar, last active, exam score,
// certificate yes/no), search, detail drawer with lesson-by-lesson progress and exam attempts.
// ============================================================================
export const InstructorStudentsPage: React.FC = () => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeStudent, setActiveStudent] = useState<EnrolledStudentRecord | null>(null);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ENROLLED_STUDENTS_DATA.filter((stu) => {
      if (selectedCourseId !== 'all' && stu.courseId !== selectedCourseId) return false;
      if (
        q &&
        !stu.name.toLowerCase().includes(q) &&
        !stu.email.toLowerCase().includes(q) &&
        !stu.courseTitle.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [selectedCourseId, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Instructor dashboard', to: '/instructor/dashboard' },
          { label: 'Enrolled students' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Enrolled students
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Inspect student lesson progress, exam scores, and issued certificates.
          </p>
        </div>
        <StatusChip
          label={`${filteredStudents.length} active learners shown`}
          variant="primary"
        />
      </div>

      {/* Course Filter & Search */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#5F5B75] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name or email..."
            aria-label="Search enrolled students"
            className="w-full h-11 pl-9 pr-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] focus:outline-none focus:border-[#6D4AE0]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#5F5B75]">Course:</span>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            aria-label="Filter enrolled students by course"
            className="h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-bold text-[#1E1B2E]"
          >
            <option value="all">All taught courses</option>
            <option value="course-1">Complete React Developer Course</option>
            <option value="course-5">Full-Stack TypeScript Bootcamp</option>
            <option value="course-9">Web Accessibility Engineering</option>
            <option value="course-10">SQL & PostgreSQL Performance</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Progress</th>
                <th className="py-3.5 px-4">Last active</th>
                <th className="py-3.5 px-4">Exam score</th>
                <th className="py-3.5 px-4">Certificate</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E1F5]">
              {filteredStudents.map((stu) => (
                <tr
                  key={stu.id}
                  onClick={() => setActiveStudent(stu)}
                  className="hover:bg-[#FAF8FF] cursor-pointer transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={stu.avatar} name={stu.name} size="sm" status="online" />
                      <div>
                        <p className="font-bold text-[#1E1B2E]">{stu.name}</p>
                        <p className="text-[12px] text-[#5F5B75]">{stu.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-[13px] font-semibold text-[#1E1B2E]">
                    {stu.courseTitle}
                  </td>
                  <td className="py-4 px-4 w-44">
                    <ProgressBar
                      value={stu.progressPercent}
                      size="sm"
                      color={stu.progressPercent === 100 ? 'success' : 'primary'}
                    />
                  </td>
                  <td className="py-4 px-4 text-[13px] text-[#5F5B75] whitespace-nowrap">
                    {stu.lastActive}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    {stu.examScore !== null ? (
                      <StatusChip
                        label={`${stu.examScore}% (${stu.examPassed ? 'Passed' : 'Failed'})`}
                        variant={stu.examPassed ? 'success' : 'danger'}
                      />
                    ) : (
                      <span className="text-[12px] text-[#5F5B75]">Not taken</span>
                    )}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    {stu.certificateIssued ? (
                      <StatusChip label="Yes" variant="success" />
                    ) : (
                      <StatusChip label="No" variant="neutral" dot={false} />
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveStudent(stu);
                      }}
                    >
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT DETAIL DRAWER WITH LESSON-BY-LESSON PROGRESS AND EXAM ATTEMPTS */}
      <Drawer
        open={Boolean(activeStudent)}
        onClose={() => setActiveStudent(null)}
        title={activeStudent ? `${activeStudent.name} — Progress` : 'Student progress'}
        footer={
          <Button variant="primary" fullWidth onClick={() => setActiveStudent(null)}>
            Close student inspector
          </Button>
        }
      >
        {activeStudent && (
          <div className="space-y-6 text-[14px]">
            <div className="p-4 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar src={activeStudent.avatar} name={activeStudent.name} size="lg" />
                <div>
                  <p className="font-display font-bold text-[18px] text-[#1E1B2E]">
                    {activeStudent.name}
                  </p>
                  <p className="text-[12px] text-[#5F5B75]">{activeStudent.email}</p>
                  <p className="text-[12px] font-bold text-[#6D4AE0] mt-0.5">
                    {activeStudent.courseTitle}
                  </p>
                </div>
              </div>
              <ProgressRing value={activeStudent.progressPercent} size={64} strokeWidth={6} />
            </div>

            {/* Lesson-by-lesson progress */}
            <div className="space-y-2.5">
              <h4 className="font-display font-bold text-[17px] text-[#1E1B2E]">
                Lesson-by-lesson watch progress ({activeStudent.completedLessons}/
                {activeStudent.totalLessons})
              </h4>
              <div className="divide-y divide-[#E6E1F5] rounded-[10px] border border-[#E6E1F5] overflow-hidden">
                {activeStudent.lessonBreakdown.map((ls) => (
                  <div
                    key={ls.id}
                    className="p-3 bg-white flex items-center justify-between gap-3 text-[13px]"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#1E1B2E] truncate">{ls.title}</p>
                      <p className="text-[11px] text-[#5F5B75]">
                        Duration: {ls.duration} • Watched {ls.watchedPercent}%
                      </p>
                    </div>
                    <StatusChip
                      label={ls.status}
                      variant={
                        ls.status === 'Completed'
                          ? 'success'
                          : ls.status === 'In progress'
                          ? 'orange'
                          : 'neutral'
                      }
                      dot={false}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Exam attempts history */}
            <div className="space-y-2.5">
              <h4 className="font-display font-bold text-[17px] text-[#1E1B2E]">
                Certification exam attempts ({activeStudent.examAttempts.length}/3)
              </h4>
              {activeStudent.examAttempts.length === 0 ? (
                <p className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] text-[#5F5B75]">
                  Student has not attempted the final certification exam yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {activeStudent.examAttempts.map((att) => (
                    <div
                      key={att.attemptNumber}
                      className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-[#1E1B2E]">
                          Attempt #{att.attemptNumber} • {att.scorePercent}%
                        </p>
                        <p className="text-[12px] text-[#5F5B75]">
                          {att.date} • Time taken: {att.timeTaken}
                        </p>
                      </div>
                      <StatusChip
                        label={att.passed ? 'Passed' : 'Failed'}
                        variant={att.passed ? 'success' : 'danger'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certificate status */}
            {activeStudent.certificateIssued && activeStudent.certificateId && (
              <div className="p-4 rounded-[10px] bg-[#16A34A]/10 border border-[#16A34A]/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-[#16A34A]" />
                  <div>
                    <p className="font-bold text-[13px] text-[#1E1B2E]">
                      Certificate issued ({activeStudent.certificateId})
                    </p>
                    <p className="text-[11px] text-[#5F5B75]">
                      100% lessons & passing exam verified
                    </p>
                  </div>
                </div>
                <Link to={`/verify/${activeStudent.certificateId}`}>
                  <Button size="sm" variant="secondary" className="bg-white">
                    Verify
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

// ============================================================================
// 7. COMMENTS INBOX (/instructor/comments)
// Tabs (Unanswered, All), comment with lesson link, inline reply box, like,
// "Mark as resolved", empty state.
// ============================================================================
export const InstructorCommentsPage: React.FC = () => {
  const { addToast } = useApp();
  const { user } = useAuth();
  const instructor = {
    name: user?.name || 'Instructor',
    avatar: user?.avatar || '',
  };

  const [threads, setThreads] = useState<InstructorCommentThread[]>(
    INITIAL_INSTRUCTOR_COMMENTS
  );
  const [activeTab, setActiveTab] = useState<'unanswered' | 'all'>('unanswered');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [previewEmpty, setPreviewEmpty] = useState(false);

  const unansweredCount = threads.filter((t) => !t.resolved).length;

  const displayedThreads = useMemo(() => {
    if (previewEmpty) return [];
    if (activeTab === 'unanswered') return threads.filter((t) => !t.resolved);
    return threads;
  }, [threads, activeTab, previewEmpty]);

  const handlePostReply = (threadId: string) => {
    const text = replyInputs[threadId]?.trim();
    if (!text) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              resolved: true,
              replies: [
                ...t.replies,
                {
                  id: `rep-${Date.now()}`,
                  authorName: `${instructor.name} (Instructor)`,
                  authorAvatar: instructor.avatar,
                  createdAt: 'Just now',
                  content: text,
                },
              ],
            }
          : t
      )
    );
    setReplyInputs((prev) => ({ ...prev, [threadId]: '' }));
    addToast({
      title: 'Instructor reply posted & marked resolved',
      variant: 'success',
    });
  };

  const handleToggleResolved = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, resolved: !t.resolved } : t))
    );
    addToast({
      title: 'Thread resolution status updated',
      variant: 'info',
    });
  };

  const handleToggleLike = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        const next = !t.likedByInstructor;
        return {
          ...t,
          likedByInstructor: next,
          likesCount: next ? t.likesCount + 1 : Math.max(0, t.likesCount - 1),
        };
      })
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Instructor dashboard', to: '/instructor/dashboard' },
          { label: 'Comments inbox' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Comments inbox
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Reply to student questions across your video lessons and mark threads as resolved.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPreviewEmpty((v) => !v)}
          className="self-start sm:self-auto px-3 py-1.5 rounded-[10px] bg-white border border-[#E6E1F5] text-[12px] font-semibold text-[#6D4AE0] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#F59E3B]" />
          <span>{previewEmpty ? 'Restore comments' : 'Preview empty state'}</span>
        </button>
      </div>

      {/* Tabs: Unanswered, All */}
      <div className="inline-flex items-center gap-1.5 p-1.5 rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5]">
        {(
          [
            { id: 'unanswered', label: 'Unanswered', count: unansweredCount },
            { id: 'all', label: 'All comments', count: threads.length },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPreviewEmpty(false);
              }}
              className={`h-9 px-4 rounded-[10px] text-[14px] font-bold inline-flex items-center gap-2 cursor-pointer transition-all ${
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
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {displayedThreads.length === 0 ? (
        <EmptyState
          title="Inbox zero — all student questions answered!"
          description="You have replied to all unanswered student questions. Switch to the 'All comments' tab to review past discussions."
          actionLabel="View all comments"
          onAction={() => {
            setActiveTab('all');
            setPreviewEmpty(false);
          }}
          mood="success"
        />
      ) : (
        <div className="space-y-4">
          {displayedThreads.map((th) => (
            <div
              key={th.id}
              className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar src={th.studentAvatar} name={th.studentName} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display font-bold text-[17px] text-[#1E1B2E]">
                        {th.studentName}
                      </p>
                      <span className="text-[12px] text-[#5F5B75]">• {th.createdAt}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                      <span className="text-[#5F5B75]">{th.courseTitle} •</span>
                      <Link
                        to={`/learn/${th.courseId}/${th.lessonId}`}
                        className="font-bold text-[#6D4AE0] hover:underline inline-flex items-center gap-1"
                      >
                        <span>{th.lessonTitle}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusChip
                    label={th.resolved ? 'Resolved' : 'Unanswered'}
                    variant={th.resolved ? 'success' : 'orange'}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => handleToggleResolved(th.id)}
                  >
                    {th.resolved ? 'Reopen' : 'Mark as resolved'}
                  </Button>
                </div>
              </div>

              <p className="text-[15px] text-[#1E1B2E] leading-relaxed">{th.content}</p>

              {/* Existing Replies */}
              {th.replies.length > 0 && (
                <div className="pl-5 border-l-2 border-[#6D4AE0] space-y-2.5">
                  {th.replies.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar src={rep.authorAvatar} name={rep.authorName} size="sm" />
                        <span className="font-bold text-[13px] text-[#1E1B2E]">
                          {rep.authorName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#6D4AE0] text-white text-[10px] font-bold">
                          Instructor
                        </span>
                        <span className="text-[11px] text-[#5F5B75]">• {rep.createdAt}</span>
                      </div>
                      <p className="text-[13px] text-[#1E1B2E]">{rep.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Like + Inline Reply Box */}
              <div className="pt-3 border-t border-[#E6E1F5] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleLike(th.id)}
                  className={`h-10 px-3.5 rounded-[10px] border text-[13px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                    th.likedByInstructor
                      ? 'bg-[#F3EFFF] border-[#6D4AE0] text-[#6D4AE0]'
                      : 'bg-white border-[#E6E1F5] text-[#5F5B75] hover:text-[#1E1B2E]'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Like ({th.likesCount})</span>
                </button>

                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={replyInputs[th.id] || ''}
                    onChange={(e) =>
                      setReplyInputs((prev) => ({ ...prev, [th.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handlePostReply(th.id);
                      }
                    }}
                    placeholder={`Write an instructor reply to ${th.studentName}...`}
                    aria-label={`Write an instructor reply to ${th.studentName}`}
                    className="flex-1 h-11 px-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] focus:bg-white focus:border-[#6D4AE0] focus:outline-none text-[13px] text-[#1E1B2E]"
                  />
                  <Button
                    size="md"
                    variant="primary"
                    leftIcon={<Send className="w-4 h-4" />}
                    onClick={() => handlePostReply(th.id)}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
