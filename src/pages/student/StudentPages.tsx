import React, { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import {
  BookOpen,
  Award,
  Flame,
  PlayCircle,
  CheckCircle2,
  Clock,
  FileCheck2,
  Download,
  ExternalLink,
  Bell,
  CheckCheck,
  BarChart3,
  ArrowRight,
  Lock,
  Sparkles,
  Search,
  Heart,
  Info,
  Check,
} from 'lucide-react';
import {
  Button,
  CourseCard,
  ProgressBar,
  ProgressRing,
  StatusChip,
  AchievementStickerBadge,
  Breadcrumbs,
  TextInput,
  PasswordInput,
  TextareaInput,
  Avatar,
  EmptyState,
} from '../../components/ui';
import { BrandLogo, CatMascot } from '../../components/brand/BrandLogo';
import { useApp } from '../../context/AppContext';
import { ACHIEVEMENT_BADGES, ROLE_USERS, Course } from '../../data/mockData';
import {
  WEEKLY_LEARNING_ACTIVITY,
  COURSE_LAST_ACCESSED,
  STUDENT_COURSE_SECTIONS,
  ALL_STUDENT_LESSONS,
  StudentLessonItem,
} from '../../data/studentLearningData';

export { LessonPlayerPage } from './LessonPlayerPage';
export { ExamPage, ExamResultPage } from './ExamPages';
export { CertificatesListPage, CertificateDetailPage } from './CertificatePages';

export const StudentDashboardPage: React.FC = () => {
  const {
    courses,
    exams,
    certificates,
    enrolledCourseIds,
    getCourseProgressStats,
    examBestScores,
  } = useApp();
  const navigate = useNavigate();
  const student = ROLE_USERS.student;

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(5);

  const enrolledCourses = useMemo(
    () => courses.filter((c) => enrolledCourseIds.includes(c.id)),
    [courses, enrolledCourseIds]
  );

  const completedCoursesCount = useMemo(
    () =>
      enrolledCourses.filter((c) => {
        const stats = getCourseProgressStats(c.id);
        const bestScore = examBestScores[c.id] ?? 0;
        return stats.overallPercent === 100 && bestScore >= 60;
      }).length,
    [enrolledCourses, getCourseProgressStats, examBestScores]
  );

  const inProgressCoursesCount = enrolledCourses.length - completedCoursesCount;
  const myCertificatesCount = certificates.filter((c) => c.studentName === 'Sara Ali').length;

  const primaryCourse = courses.find((c) => c.id === 'course-1') || enrolledCourses[0] || courses[0];
  const primaryStats = getCourseProgressStats(primaryCourse.id);
  const primaryMeta = COURSE_LAST_ACCESSED[primaryCourse.id] || COURSE_LAST_ACCESSED['course-1'];

  const threeProgressCourses = enrolledCourses.slice(0, 3);

  const recommendedCourses = useMemo(
    () => courses.filter((c) => !enrolledCourseIds.includes(c.id)).slice(0, 4),
    [courses, enrolledCourseIds]
  );

  const totalWeeklyHours = WEEKLY_LEARNING_ACTIVITY.reduce((acc, d) => acc + d.hours, 0).toFixed(1);
  const maxBarHours = 4.0;

  return (
    <div className="space-y-8">
      {/* 1. GREETING HEADER */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip label="Student workspace" variant="primary" />
            <StatusChip label={`${student.streakDays}-day learning streak`} variant="gold" />
          </div>
          <h1 className="text-[34px] sm:text-[40px] font-display font-bold text-[#1E1B2E] leading-tight">
            Welcome back, Sara
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            You have completed {primaryStats.completedLessons} of {primaryStats.totalLessons}{' '}
            lessons ({primaryStats.overallPercent}%) in {primaryCourse.title}. Keep your streak
            going!
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            leftIcon={<PlayCircle className="w-4 h-4" />}
            onClick={() => navigate(`/learn/${primaryCourse.id}/${primaryMeta.lastLessonId}`)}
          >
            Resume learning
          </Button>
          <Link to="/courses">
            <Button variant="secondary">Browse catalog</Button>
          </Link>
        </div>
      </div>

      {/* 2. STAT CARDS (Enrolled, In progress, Completed, Certificates, Learning hours) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Enrolled',
            value: enrolledCourses.length,
            sub: 'Active library',
            icon: <BookOpen className="w-5 h-5 text-[#6D4AE0]" />,
            to: '/student/courses',
          },
          {
            label: 'In progress',
            value: inProgressCoursesCount,
            sub: 'Active tracks',
            icon: <Flame className="w-5 h-5 text-[#F59E3B]" />,
            to: '/student/courses',
          },
          {
            label: 'Completed',
            value: completedCoursesCount,
            sub: '100% lessons & exam',
            icon: <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />,
            to: '/student/courses',
          },
          {
            label: 'Certificates',
            value: myCertificatesCount,
            sub: 'Verified credentials',
            icon: <Award className="w-5 h-5 text-[#F5B82E]" />,
            to: '/certificates',
          },
          {
            label: 'Learning hours',
            value: '48.5h',
            sub: `+${totalWeeklyHours}h this week`,
            icon: <Clock className="w-5 h-5 text-[#2563EB]" />,
            to: `/student/progress/${primaryCourse.id}`,
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="rounded-[12px] bg-white border border-[#E6E1F5] hover:border-[#A78BFA] p-5 shadow-purple-sm hover:shadow-purple-md transition-all flex items-start justify-between"
          >
            <div>
              <p className="text-[14px] text-[#5F5B75] font-medium">{stat.label}</p>
              <p className="font-display font-bold text-[30px] text-[#1E1B2E] mt-1 leading-none">
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

      {/* 3. LARGE "CONTINUE LEARNING" CARD (thumbnail, last lesson, progress ring, "Resume" button) */}
      <div className="rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5] p-6 sm:p-7 shadow-purple-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 flex-1 min-w-0">
            <Link
              to={`/learn/${primaryCourse.id}/${primaryMeta.lastLessonId}`}
              className="relative w-full sm:w-56 h-36 rounded-[12px] overflow-hidden bg-[#1E1B2E] shrink-0 group border border-[#E6E1F5]"
            >
              <img
                src={primaryCourse.thumbnail}
                alt={primaryCourse.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-[#1E1B2E]/35 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white text-[#6D4AE0] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <PlayCircle className="w-6 h-6" />
                </div>
              </div>
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-[#1E1B2E]/85 text-white text-[11px] font-semibold">
                04:12 / 24:10
              </span>
            </Link>

            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip
                  label="Continue learning"
                  variant="primary"
                  className="bg-white"
                />
                <span className="text-[12px] font-semibold text-[#5F5B75]">
                  Last accessed {primaryMeta.lastAccessed}
                </span>
              </div>
              <Link
                to={`/student/progress/${primaryCourse.id}`}
                className="block font-display font-bold text-[24px] text-[#1E1B2E] hover:text-[#6D4AE0] transition-colors truncate"
              >
                {primaryCourse.title}
              </Link>
              <p className="text-[14px] font-semibold text-[#3F2A9E]">
                {primaryMeta.lastLessonTitle}
              </p>
              <p className="text-[13px] text-[#5F5B75]">
                {primaryStats.completedLessons} of {primaryStats.totalLessons} lessons completed •{' '}
                {primaryMeta.watchedTime} watched
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#E6E1F5]">
            <ProgressRing
              value={primaryStats.overallPercent}
              size={88}
              strokeWidth={8}
              label="Course progress"
            />
            <div className="flex flex-col gap-2.5 w-full sm:w-auto">
              <Link to={`/learn/${primaryCourse.id}/${primaryMeta.lastLessonId}`}>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  leftIcon={<PlayCircle className="w-5 h-5" />}
                >
                  Resume
                </Button>
              </Link>
              <Link to={`/student/progress/${primaryCourse.id}`}>
                <Button variant="secondary" size="sm" fullWidth className="bg-white">
                  Course progress
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 3 COURSE PROGRESS CARDS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-[28px] font-display font-bold text-[#1E1B2E]">
              Your active course progress
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Track lesson completion and jump directly into your next module.
            </p>
          </div>
          <Link to="/student/courses">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View all {enrolledCourses.length} courses
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {threeProgressCourses.map((c) => {
            const st = getCourseProgressStats(c.id);
            const meta = COURSE_LAST_ACCESSED[c.id] || COURSE_LAST_ACCESSED['course-1'];
            return (
              <div
                key={c.id}
                className="rounded-[12px] bg-white border border-[#E6E1F5] p-5 shadow-purple-sm hover:shadow-purple-md hover:border-[#A78BFA] transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="relative h-36 rounded-[10px] overflow-hidden bg-[#F3EFFF]">
                    <img
                      src={c.thumbnail}
                      alt={c.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/95 text-[#6D4AE0] text-[11px] font-bold">
                      {c.categoryName}
                    </span>
                  </div>
                  <div>
                    <Link
                      to={`/student/progress/${c.id}`}
                      className="font-display font-bold text-[19px] text-[#1E1B2E] hover:text-[#6D4AE0] line-clamp-1"
                    >
                      {c.title}
                    </Link>
                    <p className="text-[12px] text-[#5F5B75] mt-0.5">
                      Instructor: {c.instructorName} • {meta.watchedTime} watched
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-[#E6E1F5]">
                  <ProgressBar
                    value={st.overallPercent}
                    label={`${st.completedLessons} of ${st.totalLessons} lessons`}
                    color={st.overallPercent === 100 ? 'success' : 'primary'}
                    size="sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Link to={`/learn/${c.id}/${meta.lastLessonId}`}>
                      <Button variant="primary" size="sm" fullWidth>
                        {st.overallPercent === 100 ? 'Review' : 'Resume'}
                      </Button>
                    </Link>
                    <Link to={`/student/progress/${c.id}`}>
                      <Button variant="secondary" size="sm" fullWidth>
                        Progress
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. UPCOMING EXAMS LIST & WEEKLY LEARNING ACTIVITY BAR CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                Upcoming exams
              </h2>
              <StatusChip label="60%+ required to pass" variant="primary" />
            </div>
            <p className="text-[14px] text-[#5F5B75]">
              Timed multiple-choice certification exams for your enrolled courses.
            </p>
          </div>

          <div className="space-y-3 flex-1">
            {exams.map((ex) => {
              const bestScore = examBestScores[ex.courseId];
              return (
                <div
                  key={ex.id}
                  className="p-4 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-[17px] text-[#1E1B2E]">
                        {ex.courseTitle}
                      </span>
                      {typeof bestScore === 'number' && (
                        <StatusChip
                          label={`Best: ${bestScore}%`}
                          variant={bestScore >= 60 ? 'success' : 'warning'}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#5F5B75]">
                      <span className="inline-flex items-center gap-1">
                        <FileCheck2 className="w-3.5 h-3.5 text-[#6D4AE0]" />
                        {ex.totalQuestions} questions
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#6D4AE0]" />
                        {ex.durationMinutes} mins
                      </span>
                    </div>
                  </div>
                  <Link to={`/exam/${ex.courseId}`} className="shrink-0">
                    <Button variant="primary" size="sm">
                      Start exam
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#6D4AE0]" />
                <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                  Weekly learning activity
                </h2>
              </div>
              <p className="text-[14px] text-[#5F5B75]">
                {totalWeeklyHours} hours studied across 19 completed lessons this week
              </p>
            </div>
            <StatusChip label="Daily goal: 2.0h" variant="success" />
          </div>

          <div className="px-4 py-2.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between text-[13px]">
            <span className="font-semibold text-[#1E1B2E]">
              {WEEKLY_LEARNING_ACTIVITY[selectedDayIndex].fullDay} (
              {WEEKLY_LEARNING_ACTIVITY[selectedDayIndex].dateLabel})
            </span>
            <span className="font-bold text-[#6D4AE0]">
              {WEEKLY_LEARNING_ACTIVITY[selectedDayIndex].hours}h watched •{' '}
              {WEEKLY_LEARNING_ACTIVITY[selectedDayIndex].lessonsCompleted} lessons completed
            </span>
          </div>

          <div className="pt-4 pb-1 px-2">
            <div className="relative h-44 flex items-end justify-between gap-3 border-b border-[#E6E1F5] pb-2">
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-[#16A34A]/45 pointer-events-none flex justify-end"
                style={{ bottom: `${(2.0 / maxBarHours) * 100}%` }}
              >
                <span className="text-[10px] font-bold text-[#16A34A] bg-white px-1.5 -mt-2.5">
                  2.0h goal
                </span>
              </div>

              {WEEKLY_LEARNING_ACTIVITY.map((item, idx) => {
                const heightPct = Math.round((item.hours / maxBarHours) * 100);
                const isSelected = idx === selectedDayIndex;
                const metGoal = item.hours >= 2.0;

                return (
                  <button
                    key={item.day}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group cursor-pointer focus:outline-none"
                    aria-label={`${item.fullDay}: ${item.hours} hours`}
                  >
                    <span
                      className={`text-[11px] font-bold transition-colors ${
                        isSelected
                          ? 'text-[#6D4AE0]'
                          : 'text-[#5F5B75] group-hover:text-[#1E1B2E]'
                      }`}
                    >
                      {item.hours}h
                    </span>
                    <div
                      className={`w-full max-w-[38px] rounded-t-[8px] transition-all duration-300 ${
                        isSelected
                          ? 'bg-[#6D4AE0] ring-3 ring-[#A78BFA]/50'
                          : metGoal
                          ? 'bg-[#A78BFA] group-hover:bg-[#6D4AE0]'
                          : 'bg-[#E6E1F5] group-hover:bg-[#A78BFA]'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3 pt-2 text-[12px] font-bold text-[#5F5B75]">
              {WEEKLY_LEARNING_ACTIVITY.map((item, idx) => (
                <div
                  key={item.day}
                  className={`flex-1 text-center ${
                    idx === selectedDayIndex ? 'text-[#6D4AE0]' : ''
                  }`}
                >
                  {item.day}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Sticker Badges */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
              Your achievement badges
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Signature die-cut stickers unlocked by completing lessons and exams.
            </p>
          </div>
          <Link to="/certificates">
            <Button size="sm" variant="ghost">
              View certificates
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {ACHIEVEMENT_BADGES.map((b) => (
            <AchievementStickerBadge
              key={b.id}
              title={b.title}
              subtitle={b.earnedAt || 'Locked'}
              color={b.color}
              earned={b.earned}
            />
          ))}
        </div>
      </div>

      {/* 6. RECOMMENDED COURSES ROW */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-[28px] font-display font-bold text-[#1E1B2E]">
              Recommended for you
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Picked based on your progress in Development and Design tracks.
            </p>
          </div>
          <Link to="/courses">
            <Button variant="secondary" size="sm">
              Explore full catalog
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendedCourses.map((course) => (
            <CourseCard key={course.id} course={course} showHoverPreview />
          ))}
        </div>
      </div>
    </div>
  );
};

export const StudentCoursesPage: React.FC = () => {
  const {
    courses,
    enrolledCourseIds,
    wishlistIds,
    toggleWishlist,
    getCourseProgressStats,
    examBestScores,
  } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed' | 'wishlist'>(
    'all'
  );
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'progress-desc' | 'progress-asc' | 'title'>(
    'recent'
  );
  const [previewEmptyState, setPreviewEmptyState] = useState(false);

  const enrolledCourses = useMemo(
    () => courses.filter((c) => enrolledCourseIds.includes(c.id)),
    [courses, enrolledCourseIds]
  );

  const getCourseState = (
    course: Course
  ): 'in-progress' | 'take-exam' | 'completed' => {
    const stats = getCourseProgressStats(course.id);
    const bestScore = examBestScores[course.id] ?? 0;
    if (stats.overallPercent === 100 && bestScore >= 60) {
      return 'completed';
    }
    if (stats.overallPercent === 100 && bestScore < 60) {
      return 'take-exam';
    }
    return 'in-progress';
  };

  const inProgressCourses = useMemo(
    () => enrolledCourses.filter((c) => getCourseState(c) !== 'completed'),
    [enrolledCourses, getCourseProgressStats, examBestScores]
  );

  const completedCourses = useMemo(
    () => enrolledCourses.filter((c) => getCourseState(c) === 'completed'),
    [enrolledCourses, getCourseProgressStats, examBestScores]
  );

  const wishlistCourses = useMemo(
    () => courses.filter((c) => wishlistIds.includes(c.id)),
    [courses, wishlistIds]
  );

  const filteredCourses = useMemo(() => {
    if (previewEmptyState) return [];
    const base =
      activeTab === 'all'
        ? enrolledCourses
        : activeTab === 'in-progress'
        ? inProgressCourses
        : activeTab === 'completed'
        ? completedCourses
        : wishlistCourses;

    const q = searchText.trim().toLowerCase();
    const searched = q
      ? base.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.instructorName.toLowerCase().includes(q) ||
            c.categoryName.toLowerCase().includes(q)
        )
      : base;

    return [...searched].sort((a, b) => {
      const progA = getCourseProgressStats(a.id).overallPercent;
      const progB = getCourseProgressStats(b.id).overallPercent;
      if (sortBy === 'progress-desc') return progB - progA;
      if (sortBy === 'progress-asc') return progA - progB;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [
    previewEmptyState,
    activeTab,
    enrolledCourses,
    inProgressCourses,
    completedCourses,
    wishlistCourses,
    searchText,
    sortBy,
    getCourseProgressStats,
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Student dashboard', to: '/student/dashboard' },
          { label: 'My courses' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            My courses
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Resume your lessons, take final certification exams, or download verified certificates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPreviewEmptyState((v) => !v)}
          className="self-start sm:self-auto px-3 py-1.5 rounded-[10px] bg-white border border-[#E6E1F5] hover:border-[#A78BFA] text-[12px] font-semibold text-[#6D4AE0] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#F59E3B]" />
          <span>{previewEmptyState ? 'Show my courses' : 'Preview empty state'}</span>
        </button>
      </div>

      {/* Toolbar: Tabs (All, In progress, Completed, Wishlist) + Search and Sort */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="My courses filter tabs"
          className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5]"
        >
          {(
            [
              { id: 'all', label: 'All', count: enrolledCourses.length },
              { id: 'in-progress', label: 'In progress', count: inProgressCourses.length },
              { id: 'completed', label: 'Completed', count: completedCourses.length },
              { id: 'wishlist', label: 'Wishlist', count: wishlistCourses.length },
            ] as const
          ).map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => {
                  setActiveTab(t.id);
                  setPreviewEmptyState(false);
                }}
                className={`h-9 px-3.5 rounded-[10px] text-[14px] font-semibold inline-flex items-center gap-2 transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-[#6D4AE0] shadow-purple-sm'
                    : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`px-2 py-0.5 text-[12px] rounded-full ${
                    active ? 'bg-[#F3EFFF] text-[#6D4AE0]' : 'bg-white text-[#5F5B75]'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#5F5B75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search my courses..."
              className="w-full h-10 pl-9 pr-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[14px] text-[#1E1B2E] focus:outline-none focus:border-[#6D4AE0]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sort my courses"
            className="h-10 pl-3 pr-8 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[14px] font-semibold text-[#1E1B2E] focus:outline-none focus:border-[#6D4AE0] cursor-pointer"
          >
            <option value="recent">Sort: Recently accessed</option>
            <option value="progress-desc">Progress: High to low</option>
            <option value="progress-asc">Progress: Low to high</option>
            <option value="title">Title: A–Z</option>
          </select>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'wishlist'
              ? 'Your wishlist is empty'
              : searchText
              ? 'No matching courses found'
              : 'No courses in this tab yet'
          }
          description="Explore our catalog of 120+ hands-on video courses to start learning a new skill and earn your verified certificate."
          actionLabel="Browse courses"
          actionTo="/courses"
          mood="empty"
        />
      ) : activeTab === 'wishlist' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} showHoverPreview />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const stats = getCourseProgressStats(course.id);
            const state = getCourseState(course);
            const meta = COURSE_LAST_ACCESSED[course.id] || {
              lastAccessed: '3 days ago',
              lastLessonId: 'lesson-101',
              lastLessonTitle: 'Lesson 1: Welcome & Orientation',
              watchedTime: '4h 15m',
              totalTime: course.duration,
            };

            const scaledCompleted = Math.round(
              (stats.completedLessons / stats.totalLessons) * course.lessonsCount
            );

            return (
              <article
                key={course.id}
                className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm hover:shadow-purple-md hover:border-[#A78BFA] transition-all flex flex-col overflow-hidden"
              >
                <div className="relative h-44 w-full bg-[#F3EFFF] overflow-hidden">
                  <Link to={`/student/progress/${course.id}`} className="block w-full h-full">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <StatusChip
                      label={
                        state === 'completed'
                          ? 'Completed'
                          : state === 'take-exam'
                          ? 'Ready for exam'
                          : 'In progress'
                      }
                      variant={
                        state === 'completed'
                          ? 'success'
                          : state === 'take-exam'
                          ? 'gold'
                          : 'primary'
                      }
                      className="bg-white/95"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(course.id)}
                    aria-label="Toggle wishlist"
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 border border-[#E6E1F5] flex items-center justify-center text-[#5F5B75] hover:text-[#DC2626] cursor-pointer"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        wishlistIds.includes(course.id)
                          ? 'fill-[#DC2626] text-[#DC2626]'
                          : ''
                      }`}
                    />
                  </button>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-bold text-[#6D4AE0]">{course.categoryName}</span>
                      <span className="text-[#5F5B75]">
                        Last accessed {meta.lastAccessed}
                      </span>
                    </div>

                    <Link
                      to={`/student/progress/${course.id}`}
                      className="block font-display font-bold text-[20px] text-[#1E1B2E] hover:text-[#6D4AE0] transition-colors line-clamp-2 leading-snug"
                    >
                      {course.title}
                    </Link>

                    <p className="text-[13px] text-[#5F5B75]">
                      Instructor: <strong className="text-[#1E1B2E]">{course.instructorName}</strong>
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-[#E6E1F5]">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="font-semibold text-[#1E1B2E]">
                          {scaledCompleted} of {course.lessonsCount} lessons
                        </span>
                        <span className="font-display font-bold text-[16px] text-[#6D4AE0]">
                          {stats.overallPercent}%
                        </span>
                      </div>
                      <ProgressBar
                        value={stats.overallPercent}
                        showValue={false}
                        size="sm"
                        color={state === 'completed' ? 'success' : 'primary'}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {state === 'completed' ? (
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          leftIcon={<Award className="w-4 h-4" />}
                          onClick={() => navigate('/certificates/cert-101')}
                        >
                          View certificate
                        </Button>
                      ) : state === 'take-exam' ? (
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          leftIcon={<FileCheck2 className="w-4 h-4" />}
                          onClick={() => navigate(`/exam/${course.id}`)}
                        >
                          Take exam
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          leftIcon={<PlayCircle className="w-4 h-4" />}
                          onClick={() =>
                            navigate(`/learn/${course.id}/${meta.lastLessonId}`)
                          }
                        >
                          Continue
                        </Button>
                      )}
                      <Link to={`/student/progress/${course.id}`} className="shrink-0">
                        <Button variant="secondary" size="md">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const StudentCourseProgressPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const {
    courses,
    getLessonWatchPercent,
    toggleLessonCompleted,
    completeAllCourseLessons,
    getCourseProgressStats,
    examBestScores,
    setCourseExamScore,
    addToast,
  } = useApp();

  const course = courses.find((c) => c.id === courseId) || courses[0];
  const stats = getCourseProgressStats(course.id);
  const meta = COURSE_LAST_ACCESSED[course.id] || COURSE_LAST_ACCESSED['course-1'];
  const bestExamScore = examBestScores[course.id] ?? null;

  const lessonsCompleteDone = stats.overallPercent === 100;
  const examPassedDone = typeof bestExamScore === 'number' && bestExamScore >= 60;
  const certificateUnlocked = lessonsCompleteDone && examPassedDone;

  const isLessonLocked = (lesson: StudentLessonItem, indexInAll: number): boolean => {
    if (!lesson.requiresPrevious || indexInAll === 0) return false;
    const preceding = ALL_STUDENT_LESSONS[indexInAll - 1];
    return getLessonWatchPercent(course.id, preceding.id) < 90;
  };

  const handleSimulateUnlockCertificate = () => {
    completeAllCourseLessons(course.id);
    if (!examPassedDone) {
      setCourseExamScore(course.id, 92);
    }
    addToast({
      title: 'All certificate requirements completed!',
      message: '100% of lessons completed and final exam passed (92%). You can now claim your certificate.',
      variant: 'success',
    });
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'My courses', to: '/student/courses' },
          { label: `${course.title} — Progress` },
        ]}
      />

      {/* Progress rules shown in the UI */}
      <div className="rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5] p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-white text-[#6D4AE0] flex items-center justify-center shrink-0 shadow-2xs">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-[13px] sm:text-[14px]">
            <span className="font-bold text-[#1E1B2E]">Progress tracking rules: </span>
            <span className="text-[#5F5B75]">
              A lesson completes automatically at{' '}
              <strong className="text-[#6D4AE0]">90% watched</strong> •{' '}
              <strong className="text-[#6D4AE0]">
                Course % = completed lessons ({stats.completedLessons}) / total lessons (
                {stats.totalLessons})
              </strong>
            </span>
          </div>
        </div>
        {!certificateUnlocked && (
          <button
            type="button"
            onClick={handleSimulateUnlockCertificate}
            className="shrink-0 px-3 py-1.5 rounded-[8px] bg-white border border-[#E6E1F5] hover:border-[#6D4AE0] text-[12px] font-bold text-[#6D4AE0] inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F59E3B]" />
            <span>Simulate 100% & exam pass</span>
          </button>
        )}
      </div>

      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip label={course.categoryName} variant="primary" />
            <StatusChip
              label={
                certificateUnlocked
                  ? 'Completed & Certified'
                  : `${stats.completedLessons} of ${stats.totalLessons} lessons completed`
              }
              variant={certificateUnlocked ? 'success' : 'gold'}
            />
          </div>
          <h1 className="text-[30px] sm:text-[36px] font-display font-bold text-[#1E1B2E] leading-tight">
            {course.title}
          </h1>
          <div className="flex flex-wrap items-center gap-5 text-[14px] text-[#5F5B75]">
            <span>
              Instructor: <strong className="text-[#1E1B2E]">{course.instructorName}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#6D4AE0]" />
              <span>
                Watched time:{' '}
                <strong className="text-[#1E1B2E]">
                  {lessonsCompleteDone ? meta.totalTime : meta.watchedTime}
                </strong>{' '}
                of {meta.totalTime}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to={`/learn/${course.id}/${meta.lastLessonId}`}>
              <Button variant="primary" leftIcon={<PlayCircle className="w-4 h-4" />}>
                {lessonsCompleteDone ? 'Review video lessons' : 'Resume video lessons'}
              </Button>
            </Link>
            <Link to={`/courses/${course.id}`}>
              <Button variant="secondary">Course details</Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-6 self-start lg:self-center p-4 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5]">
          <ProgressRing
            value={stats.overallPercent}
            size={108}
            strokeWidth={10}
            label="Overall completion"
          />
          <div className="space-y-1.5 text-[13px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
              <span className="text-[#5F5B75]">Completed:</span>
              <strong className="text-[#1E1B2E]">{stats.completedLessons}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E3B]" />
              <span className="text-[#5F5B75]">In progress:</span>
              <strong className="text-[#1E1B2E]">{stats.inProgressLessons}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E6E1F5]" />
              <span className="text-[#5F5B75]">Remaining:</span>
              <strong className="text-[#1E1B2E]">{stats.notStartedLessons}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN GRID: Section-by-Section Lesson Checklist + Final Exam Status & Certificate Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-5">
          <div>
            <h2 className="text-[26px] font-display font-bold text-[#1E1B2E]">
              Section-by-section lesson checklist
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Click any unlocked lesson to watch, or toggle completion to test the progress formula.
            </p>
          </div>

          <div className="space-y-4">
            {STUDENT_COURSE_SECTIONS.map((section) => {
              const secCompleted = section.lessons.filter(
                (l) => getLessonWatchPercent(course.id, l.id) >= 90
              ).length;

              return (
                <div
                  key={section.id}
                  className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden"
                >
                  <div className="px-5 py-4 bg-[#FAF8FF] border-b border-[#E6E1F5] flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                        {section.title}
                      </h3>
                      <p className="text-[12px] text-[#5F5B75]">{section.subtitle}</p>
                    </div>
                    <StatusChip
                      label={`${secCompleted} / ${section.lessons.length} completed`}
                      variant={secCompleted === section.lessons.length ? 'success' : 'primary'}
                    />
                  </div>

                  <div className="divide-y divide-[#E6E1F5]">
                    {section.lessons.map((lesson) => {
                      const globalIdx = ALL_STUDENT_LESSONS.findIndex(
                        (l) => l.id === lesson.id
                      );
                      const pct = getLessonWatchPercent(course.id, lesson.id);
                      const locked = isLessonLocked(lesson, globalIdx);

                      const statusType: 'completed' | 'in-progress' | 'not-started' | 'locked' =
                        locked
                          ? 'locked'
                          : pct >= 90
                          ? 'completed'
                          : pct > 0
                          ? 'in-progress'
                          : 'not-started';

                      return (
                        <div
                          key={lesson.id}
                          className={`p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                            locked ? 'bg-[#FAF8FF]/60 opacity-75' : 'hover:bg-[#FAF8FF]'
                          }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => {
                                const done = toggleLessonCompleted(course.id, lesson.id);
                                addToast({
                                  title: done
                                    ? 'Lesson marked complete (100%)'
                                    : 'Lesson reset to 0%',
                                  message: lesson.title,
                                  variant: done ? 'success' : 'info',
                                });
                              }}
                              className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                statusType === 'completed'
                                  ? 'bg-[#16A34A] text-white'
                                  : statusType === 'in-progress'
                                  ? 'bg-[#FEF3C7] border-2 border-[#F59E3B] text-[#B45309]'
                                  : statusType === 'locked'
                                  ? 'bg-[#E6E1F5] text-[#5F5B75] cursor-not-allowed'
                                  : 'bg-white border-2 border-[#E6E1F5] hover:border-[#6D4AE0]'
                              }`}
                              title={
                                locked
                                  ? 'Complete previous lesson first'
                                  : 'Click to toggle lesson completion'
                              }
                            >
                              {statusType === 'completed' ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : statusType === 'locked' ? (
                                <Lock className="w-3 h-3" />
                              ) : statusType === 'in-progress' ? (
                                <span className="w-2 h-2 rounded-full bg-[#F59E3B]" />
                              ) : null}
                            </button>

                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[15px] font-bold text-[#1E1B2E]">
                                  {lesson.title}
                                </span>
                                {statusType === 'completed' && (
                                  <StatusChip
                                    label={`Completed (${pct}%)`}
                                    variant="success"
                                  />
                                )}
                                {statusType === 'in-progress' && (
                                  <StatusChip
                                    label={`In progress (${pct}%)`}
                                    variant="orange"
                                  />
                                )}
                                {statusType === 'not-started' && (
                                  <StatusChip
                                    label="Not started"
                                    variant="neutral"
                                    dot={false}
                                  />
                                )}
                                {statusType === 'locked' && (
                                  <StatusChip label="Locked" variant="neutral" dot={false} />
                                )}
                              </div>
                              <p className="text-[12px] text-[#5F5B75]">
                                Duration: {lesson.duration} •{' '}
                                {statusType === 'locked'
                                  ? 'Requires previous lesson (90%+ watched)'
                                  : statusType === 'completed'
                                  ? '90% watch rule satisfied'
                                  : statusType === 'in-progress'
                                  ? `Watch ${90 - pct}% more to auto-complete`
                                  : 'Ready to start'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {locked ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled
                                leftIcon={<Lock className="w-3.5 h-3.5" />}
                              >
                                Locked
                              </Button>
                            ) : (
                              <Link to={`/learn/${course.id}/${lesson.id}`}>
                                <Button
                                  size="sm"
                                  variant={
                                    statusType === 'in-progress' ? 'primary' : 'secondary'
                                  }
                                >
                                  {statusType === 'completed'
                                    ? 'Rewatch'
                                    : statusType === 'in-progress'
                                    ? `Resume (${pct}%)`
                                    : 'Start lesson'}
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT 4 COLS: Final Exam Status Card & Certificate Requirements Card */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#6D4AE0]">
                <FileCheck2 className="w-4 h-4" />
                Final exam status
              </span>
              <StatusChip
                label={
                  examPassedDone
                    ? 'Passed'
                    : typeof bestExamScore === 'number'
                    ? 'Below 60%'
                    : 'Not taken'
                }
                variant={
                  examPassedDone
                    ? 'success'
                    : typeof bestExamScore === 'number'
                    ? 'warning'
                    : 'neutral'
                }
              />
            </div>

            <div>
              <h3 className="font-display font-bold text-[20px] text-[#1E1B2E]">
                Certification Assessment
              </h3>
              <p className="text-[13px] text-[#5F5B75] mt-0.5">
                Passing threshold: 60% or higher • 20 multiple-choice questions
              </p>
            </div>

            <div className="p-4 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between">
              <div>
                <p className="text-[12px] text-[#5F5B75]">Your best score</p>
                <p className="font-display font-bold text-[28px] text-[#1E1B2E] leading-tight">
                  {typeof bestExamScore === 'number' ? `${bestExamScore}%` : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-[#5F5B75]">Required score</p>
                <p className="font-display font-bold text-[20px] text-[#16A34A]">60%+</p>
              </div>
            </div>

            <div className="space-y-2">
              <Link to={`/exam/${course.id}`} className="block">
                <Button variant="secondary" fullWidth size="md">
                  {typeof bestExamScore === 'number' ? 'Retake final exam' : 'Start final exam'}
                </Button>
              </Link>
              {!examPassedDone && (
                <button
                  type="button"
                  onClick={() => {
                    setCourseExamScore(course.id, 88);
                    addToast({
                      title: 'Simulated exam pass (88%)',
                      message: 'Final exam requirement is now satisfied.',
                      variant: 'success',
                    });
                  }}
                  className="w-full text-center text-[12px] font-bold text-[#6D4AE0] hover:underline cursor-pointer pt-1"
                >
                  Simulate passing exam (88%)
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[12px] bg-white border-2 border-[#6D4AE0]/30 p-6 shadow-purple-md space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[12px] bg-[#F3EFFF] text-[#6D4AE0] flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-[20px] text-[#1E1B2E]">
                  Certificate requirements
                </h3>
                <p className="text-[12px] text-[#5F5B75]">
                  Complete both steps to unlock your credential
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div
                className={`p-3.5 rounded-[10px] border flex items-start gap-3 ${
                  lessonsCompleteDone
                    ? 'bg-[#16A34A]/8 border-[#16A34A]/30'
                    : 'bg-[#FAF8FF] border-[#E6E1F5]'
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                    lessonsCompleteDone
                      ? 'bg-[#16A34A] text-white'
                      : 'bg-[#E6E1F5] text-[#5F5B75]'
                  }`}
                >
                  {lessonsCompleteDone ? <Check className="w-3.5 h-3.5" /> : '1'}
                </div>
                <div className="flex-1 text-[13px]">
                  <p className="font-bold text-[#1E1B2E]">Complete 100% of lessons</p>
                  <p className="text-[#5F5B75] mt-0.5">
                    Current: {stats.completedLessons} of {stats.totalLessons} lessons (
                    {stats.overallPercent}%)
                  </p>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-[10px] border flex items-start gap-3 ${
                  examPassedDone
                    ? 'bg-[#16A34A]/8 border-[#16A34A]/30'
                    : 'bg-[#FAF8FF] border-[#E6E1F5]'
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                    examPassedDone
                      ? 'bg-[#16A34A] text-white'
                      : 'bg-[#E6E1F5] text-[#5F5B75]'
                  }`}
                >
                  {examPassedDone ? <Check className="w-3.5 h-3.5" /> : '2'}
                </div>
                <div className="flex-1 text-[13px]">
                  <p className="font-bold text-[#1E1B2E]">Pass the final exam (60%+)</p>
                  <p className="text-[#5F5B75] mt-0.5">
                    {typeof bestExamScore === 'number'
                      ? `Best score: ${bestExamScore}% (${
                          examPassedDone ? 'Passed' : 'Needs 60%+'
                        })`
                      : 'Exam not attempted yet'}
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!certificateUnlocked}
              leftIcon={<Award className="w-5 h-5" />}
              onClick={() => navigate('/certificates/cert-101?view=completion')}
            >
              Get certificate
            </Button>

            {!certificateUnlocked && (
              <p className="text-[12px] text-center text-[#5F5B75]">
                The "Get certificate" button unlocks automatically once both steps above are
                completed.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { currentUser, role, addToast } = useApp();
  const user = currentUser || ROLE_USERS.student;
  const [name, setName] = useState(user.name);
  const [title, setTitle] = useState(user.title);
  const [bio, setBio] = useState(user.bio);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      title: 'Profile changes saved',
      message: 'Your public bio and display details have been updated.',
      variant: 'success',
    });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Profile & account settings' }]} />

      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar src={user.avatar} name={user.name} size="xl" status="online" />
          <div>
            <StatusChip label={`${role} account`} variant="primary" />
            <h1 className="text-[32px] font-display font-bold text-[#1E1B2E] mt-1">
              {user.name}
            </h1>
            <p className="text-[14px] text-[#5F5B75]">
              {user.email} • Joined {user.joinedAt}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-5"
      >
        <h2 className="text-[24px] font-display font-semibold text-[#1E1B2E]">
          Personal information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <TextInput
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextInput
            label="Professional headline"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <TextareaInput
          label="Short biography"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLengthCount={300}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-[#E6E1F5]">
          <PasswordInput label="New password (optional)" placeholder="Leave blank to keep current" />
          <PasswordInput label="Confirm new password" placeholder="Re-enter new password" />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary">
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Notifications' }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-display font-bold text-[#1E1B2E]">
            Notifications
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Course replies, exam unlocks, certificate issuances, and moderation alerts.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<CheckCheck className="w-4 h-4" />}
          onClick={markAllNotificationsRead}
        >
          Mark all as read
        </Button>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="You are all caught up"
          description="New course announcements and instructor replies will appear here."
          actionLabel="Browse courses"
          actionTo="/courses"
        />
      ) : (
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm divide-y divide-[#E6E1F5]">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !n.read ? 'bg-[#F3EFFF]/40' : ''
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-[10px] bg-[#F3EFFF] text-[#6D4AE0] flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[17px] font-display font-bold text-[#1E1B2E]">
                      {n.title}
                    </h3>
                    {!n.read && <StatusChip label="New" variant="primary" />}
                  </div>
                  <p className="text-[14px] text-[#5F5B75] mt-0.5">{n.message}</p>
                  <p className="text-[12px] text-[#5F5B75]/80 mt-1">{n.createdAt}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={n.link} onClick={() => markNotificationRead(n.id)}>
                  <Button size="sm" variant="secondary">
                    Open item
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
