import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router';
import {
  BookOpen,
  Award,
  Flame,
  PlayCircle,
  CheckCircle2,
  Clock,
  FileCheck2,
  BarChart3,
  ArrowRight,
  Lock,
  Sparkles,
  Search,
  Heart,
  Info,
  Check,
  Loader2,
} from 'lucide-react';
import {
  Button,
  CourseCard,
  ProgressBar,
  ProgressRing,
  StatusChip,
  AchievementStickerBadge,
  Breadcrumbs,
  EmptyState,
  Skeleton,
  Pagination,
  QueryErrorState,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { isForbiddenError, isNotFoundError } from '../../api/errors';
import {
  useCompleteLessonMutation,
  useCourseProgress,
  useMyEnrollments,
  useStudentDashboard,
  useUncompleteLessonMutation,
} from '../../api/hooks/useLearning';
import {
  useMyWishlist,
  useToggleWishlistMutation,
  useWishlistIds,
} from '../../api/hooks/useWishlist';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Forbidden403Page, NotFound404Page } from '../ErrorPages';

export { LessonPlayerPage } from './LessonPlayerPage';
export { ExamPage, ExamResultPage } from './ExamPages';
export { CertificatesListPage, CertificateDetailPage } from './CertificatePages';

type StudentCourseTab = 'all' | 'in-progress' | 'completed' | 'wishlist';
type StudentCourseSort = 'recent' | 'progress-desc' | 'progress-asc' | 'title';

function parseTabParam(raw: string | null): StudentCourseTab {
  if (raw === 'in-progress' || raw === 'completed' || raw === 'wishlist') {
    return raw;
  }
  return 'all';
}

function parseSortParam(raw: string | null): StudentCourseSort {
  if (raw === 'progress-desc' || raw === 'progress-asc' || raw === 'title') {
    return raw;
  }
  return 'recent';
}

function toApiEnrollmentSort(
  sort: StudentCourseSort
): 'recent' | 'progress_desc' | 'progress_asc' | 'title' {
  switch (sort) {
    case 'progress-desc':
      return 'progress_desc';
    case 'progress-asc':
      return 'progress_asc';
    case 'title':
      return 'title';
    default:
      return 'recent';
  }
}

export const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dashboardQuery = useStudentDashboard();
  const enrollmentsQuery = useMyEnrollments({ limit: 50 });

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(5);

  const studentFirstName = (user?.name ?? 'Student').split(' ')[0];
  const dashboard = dashboardQuery.data;
  const allEnrollments = enrollmentsQuery.data?.items ?? [];

  const activeProgressCards = useMemo(() => {
    if (allEnrollments.length > 0) {
      return allEnrollments.slice(0, 3);
    }
    return dashboard?.activeCourses.slice(0, 3) ?? [];
  }, [allEnrollments, dashboard]);

  const upcomingExamsWithScores = useMemo(() => {
    if (!dashboard) return [];
    const byCourseId = new Map(allEnrollments.map((e) => [e.course.id, e]));
    return dashboard.upcomingExams.map((ex) => {
      const matched = byCourseId.get(ex.courseId);
      return {
        ...ex,
        lastScore: matched?.bestExamScorePercent ?? ex.lastScore ?? null,
        passed: matched?.examPassed ?? ex.passed ?? false,
        passingScore: matched?.passingScorePercent ?? ex.passingScore,
      };
    });
  }, [dashboard, allEnrollments]);

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-8">
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-4">
          <Skeleton variant="title" />
          <Skeleton className="w-2/3" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="rounded-[12px] bg-white border border-[#E6E1F5] p-5 shadow-purple-sm space-y-2"
            >
              <Skeleton className="w-24" />
              <Skeleton variant="title" className="w-16" />
              <Skeleton className="w-28" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((idx) => (
            <Skeleton key={idx} variant="card" />
          ))}
        </div>
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboard) {
    return (
      <QueryErrorState
        error={dashboardQuery.error}
        title="Unable to load your dashboard"
        onRetry={() => {
          void dashboardQuery.refetch();
          void enrollmentsQuery.refetch();
        }}
      />
    );
  }

  const continueCard = dashboard.continueLearning;
  const maxBarHours = Math.max(4.0, dashboard.kpis.dailyGoalHours * 2);
  const weeklyActivity = dashboard.weeklyActivity;
  const safeSelectedDayIndex =
    weeklyActivity.length > 0 ? Math.min(selectedDayIndex, weeklyActivity.length - 1) : 0;
  const selectedDay = weeklyActivity[safeSelectedDayIndex];
  const primaryCourseId = continueCard?.course.id ?? activeProgressCards[0]?.course.id ?? 'course-1';

  return (
    <div className="space-y-8">
      {/* 1. GREETING HEADER */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip label="Student workspace" variant="primary" />
            <StatusChip label={`${dashboard.streakDays}-day learning streak`} variant="gold" />
          </div>
          <h1 className="text-[34px] sm:text-[40px] font-display font-bold text-[#1E1B2E] leading-tight">
            Welcome back, {studentFirstName}
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            {continueCard
              ? `You have completed ${continueCard.completedLessons} of ${continueCard.totalLessons} lessons (${continueCard.progressPercent}%) in ${continueCard.course.title}. Keep your streak going!`
              : 'Explore courses and track your daily learning streak right here.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {continueCard ? (
            <Button
              variant="primary"
              leftIcon={<PlayCircle className="w-4 h-4" />}
              onClick={() =>
                navigate(`/learn/${continueCard.course.id}/${continueCard.lastLessonId}`)
              }
            >
              Resume learning
            </Button>
          ) : (
            <Link to="/courses">
              <Button variant="primary" leftIcon={<BookOpen className="w-4 h-4" />}>
                Start a course
              </Button>
            </Link>
          )}
          <Link to="/courses">
            <Button variant="secondary">Browse catalog</Button>
          </Link>
        </div>
      </div>

      {/* 2. STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Enrolled',
            value: dashboard.kpis.enrolledCount,
            sub: 'Active library',
            icon: <BookOpen className="w-5 h-5 text-[#6D4AE0]" />,
            to: '/student/courses',
          },
          {
            label: 'In progress',
            value: dashboard.kpis.inProgressCount,
            sub: 'Active tracks',
            icon: <Flame className="w-5 h-5 text-[#F59E3B]" />,
            to: '/student/courses?tab=in-progress',
          },
          {
            label: 'Completed',
            value: dashboard.kpis.completedCount,
            sub: '100% lessons & exam',
            icon: <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />,
            to: '/student/courses?tab=completed',
          },
          {
            label: 'Certificates',
            value: dashboard.kpis.certificatesCount,
            sub: 'Verified credentials',
            icon: <Award className="w-5 h-5 text-[#F5B82E]" />,
            to: '/certificates',
          },
          {
            label: 'Learning hours',
            value: dashboard.kpis.totalWatchLabel,
            sub: `+${dashboard.kpis.weeklyWatchHoursLabel}h this week`,
            icon: <Clock className="w-5 h-5 text-[#2563EB]" />,
            to: `/student/progress/${primaryCourseId}`,
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

      {/* 3. LARGE "CONTINUE LEARNING" CARD */}
      {continueCard ? (
        <div className="rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5] p-6 sm:p-7 shadow-purple-md">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 flex-1 min-w-0">
              <Link
                to={`/learn/${continueCard.course.id}/${continueCard.lastLessonId}`}
                className="relative w-full sm:w-56 h-36 rounded-[12px] overflow-hidden bg-[#1E1B2E] shrink-0 group border border-[#E6E1F5]"
              >
                <img
                  src={continueCard.course.thumbnail}
                  alt={continueCard.course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-[#1E1B2E]/35 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white text-[#6D4AE0] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-6 h-6" />
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-[#1E1B2E]/85 text-white text-[11px] font-semibold">
                  {continueCard.watchedTimeLabel} / {continueCard.totalTimeLabel}
                </span>
              </Link>

              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip label="Continue learning" variant="primary" className="bg-white" />
                  <span className="text-[12px] font-semibold text-[#5F5B75]">
                    Last accessed {continueCard.lastAccessedLabel}
                  </span>
                </div>
                <Link
                  to={`/student/progress/${continueCard.course.id}`}
                  className="block font-display font-bold text-[24px] text-[#1E1B2E] hover:text-[#6D4AE0] transition-colors truncate"
                >
                  {continueCard.course.title}
                </Link>
                <p className="text-[14px] font-semibold text-[#3F2A9E]">
                  {continueCard.lastLessonTitle}
                </p>
                <p className="text-[13px] text-[#5F5B75]">
                  {continueCard.completedLessons} of {continueCard.totalLessons} lessons completed •{' '}
                  {continueCard.watchedTimeLabel} watched
                </p>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#E6E1F5]">
              <ProgressRing
                value={continueCard.progressPercent}
                size={88}
                strokeWidth={8}
                label="Course progress"
              />
              <div className="flex flex-col gap-2.5 w-full sm:w-auto">
                <Link to={`/learn/${continueCard.course.id}/${continueCard.lastLessonId}`}>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    leftIcon={<PlayCircle className="w-5 h-5" />}
                  >
                    Resume
                  </Button>
                </Link>
                <Link to={`/student/progress/${continueCard.course.id}`}>
                  <Button variant="secondary" size="sm" fullWidth className="bg-white">
                    Course progress
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No courses in progress yet"
          description="Enroll in any catalog course to unlock guided video lessons, progress tracking, and certification."
          actionLabel="Browse catalog"
          actionTo="/courses"
          mood="empty"
        />
      )}

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
              View all {dashboard.kpis.enrolledCount} courses
            </Button>
          </Link>
        </div>

        {activeProgressCards.length === 0 ? (
          <EmptyState
            title="Your course list is empty"
            description="When you enroll in courses, your lesson completion cards will appear here."
            actionLabel="Explore courses"
            actionTo="/courses"
            mood="empty"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeProgressCards.map((card) => (
              <div
                key={card.course.id}
                className="rounded-[12px] bg-white border border-[#E6E1F5] p-5 shadow-purple-sm hover:shadow-purple-md hover:border-[#A78BFA] transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="relative h-36 rounded-[10px] overflow-hidden bg-[#F3EFFF]">
                    <img
                      src={card.course.thumbnail}
                      alt={card.course.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/95 text-[#6D4AE0] text-[11px] font-bold">
                      {card.course.categoryName}
                    </span>
                  </div>
                  <div>
                    <Link
                      to={`/student/progress/${card.course.id}`}
                      className="font-display font-bold text-[19px] text-[#1E1B2E] hover:text-[#6D4AE0] line-clamp-1"
                    >
                      {card.course.title}
                    </Link>
                    <p className="text-[12px] text-[#5F5B75] mt-0.5">
                      Instructor: {card.course.instructorName} • {card.watchedTimeLabel} watched
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-[#E6E1F5]">
                  <ProgressBar
                    value={card.progressPercent}
                    label={`${card.completedLessons} of ${card.totalLessons} lessons`}
                    color={card.progressPercent === 100 ? 'success' : 'primary'}
                    size="sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Link to={`/learn/${card.course.id}/${card.lastLessonId}`}>
                      <Button variant="primary" size="sm" fullWidth>
                        {card.progressPercent === 100 ? 'Review' : 'Resume'}
                      </Button>
                    </Link>
                    <Link to={`/student/progress/${card.course.id}`}>
                      <Button variant="secondary" size="sm" fullWidth>
                        Progress
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
            {upcomingExamsWithScores.length === 0 ? (
              <EmptyState
                title="No upcoming exams yet"
                description="Enroll in a course with a certification assessment to schedule and take your final exam."
                actionLabel="Browse courses"
                actionTo="/courses"
                mood="empty"
              />
            ) : (
              upcomingExamsWithScores.map((ex) => (
                <div
                  key={ex.id}
                  className="p-4 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-[17px] text-[#1E1B2E]">
                        {ex.courseTitle}
                      </span>
                      {typeof ex.lastScore === 'number' && (
                        <StatusChip
                          label={`Best: ${ex.lastScore}%`}
                          variant={ex.lastScore >= ex.passingScore ? 'success' : 'warning'}
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
              ))
            )}
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
                {dashboard.kpis.weeklyWatchHoursLabel} hours studied across{' '}
                {dashboard.kpis.weeklyCompletedLessons} completed lessons this week
              </p>
            </div>
            <StatusChip
              label={`Daily goal: ${dashboard.kpis.dailyGoalHours.toFixed(1)}h`}
              variant="success"
            />
          </div>

          {selectedDay ? (
            <>
              <div className="px-4 py-2.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between text-[13px]">
                <span className="font-semibold text-[#1E1B2E]">
                  {selectedDay.fullDay} ({selectedDay.dateLabel})
                </span>
                <span className="font-bold text-[#6D4AE0]">
                  {selectedDay.hours}h watched • {selectedDay.lessonsCompleted} lessons completed
                </span>
              </div>

              <div className="pt-4 pb-1 px-2">
                <div className="relative h-44 flex items-end justify-between gap-3 border-b border-[#E6E1F5] pb-2">
                  <div
                    className="absolute left-0 right-0 border-t-2 border-dashed border-[#16A34A]/45 pointer-events-none flex justify-end"
                    style={{
                      bottom: `${Math.min(
                        100,
                        (dashboard.kpis.dailyGoalHours / maxBarHours) * 100
                      )}%`,
                    }}
                  >
                    <span className="text-[10px] font-bold text-[#16A34A] bg-white px-1.5 -mt-2.5">
                      {dashboard.kpis.dailyGoalHours.toFixed(1)}h goal
                    </span>
                  </div>

                  {weeklyActivity.map((item, idx) => {
                    const heightPct = Math.min(100, Math.round((item.hours / maxBarHours) * 100));
                    const isSelected = idx === safeSelectedDayIndex;
                    const metGoal = item.hours >= dashboard.kpis.dailyGoalHours;

                    return (
                      <button
                        key={item.dateLabel}
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
                  {weeklyActivity.map((item, idx) => (
                    <div
                      key={item.dateLabel}
                      className={`flex-1 text-center ${
                        idx === safeSelectedDayIndex ? 'text-[#6D4AE0]' : ''
                      }`}
                    >
                      {item.day}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="No weekly study activity yet"
              description="Watch your first lesson this week to track daily progress against your study goal."
              mood="empty"
            />
          )}
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
          {dashboard.achievements.map((b) => (
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
      {dashboard.recommendedCourses.length > 0 && (
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
            {dashboard.recommendedCourses.map((course) => (
              <CourseCard key={course.id} course={course} showHoverPreview />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const StudentCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = parseTabParam(searchParams.get('tab'));
  const sortBy = parseSortParam(searchParams.get('sort'));
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const urlSearchQuery = searchParams.get('q') ?? '';

  const [searchText, setSearchText] = useState(urlSearchQuery);
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const [previewEmptyState, setPreviewEmptyState] = useState(false);

  // Sync external URL changes (e.g. back/forward navigation) into search input
  useEffect(() => {
    setSearchText(urlSearchQuery);
  }, [urlSearchQuery]);

  // Sync debounced text back into URL query params and reset page
  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed === urlSearchQuery) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (trimmed) {
          next.set('q', trimmed);
        } else {
          next.delete('q');
        }
        next.delete('page');
        return next;
      },
      { replace: true }
    );
  }, [debouncedSearch, urlSearchQuery, setSearchParams]);

  const updateUrlParams = (updates: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (!v) {
          next.delete(k);
        } else {
          next.set(k, v);
        }
      }
      return next;
    });
  };

  const apiStatus: 'all' | 'in_progress' | 'completed' =
    activeTab === 'in-progress'
      ? 'in_progress'
      : activeTab === 'completed'
        ? 'completed'
        : 'all';

  const dashboardQuery = useStudentDashboard();
  const enrollmentsQuery = useMyEnrollments(
    {
      status: apiStatus,
      q: urlSearchQuery || undefined,
      sort: toApiEnrollmentSort(sortBy),
      page: currentPage,
      limit: 12,
    },
    activeTab !== 'wishlist'
  );
  const wishlistQuery = useMyWishlist();
  const wishlistIds = useWishlistIds();
  const toggleWishlistMutation = useToggleWishlistMutation();

  const wishlistCourses = useMemo(() => {
    if (previewEmptyState) return [];
    const items = (wishlistQuery.data?.items ?? []).map((item) => item.course);
    const q = urlSearchQuery.trim().toLowerCase();
    const filtered = q
      ? items.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.instructorName.toLowerCase().includes(q) ||
            c.categoryName.toLowerCase().includes(q)
        )
      : items;
    return [...filtered].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [previewEmptyState, wishlistQuery.data, urlSearchQuery, sortBy]);

  const enrolledItems = useMemo(() => {
    if (previewEmptyState) return [];
    return enrollmentsQuery.data?.items ?? [];
  }, [previewEmptyState, enrollmentsQuery.data]);

  const activeQuery = activeTab === 'wishlist' ? wishlistQuery : enrollmentsQuery;
  const totalPages = activeTab === 'wishlist' ? 1 : (enrollmentsQuery.data?.meta.totalPages ?? 1);
  const kpis = dashboardQuery.data?.kpis;

  const isEmptyList =
    activeTab === 'wishlist' ? wishlistCourses.length === 0 : enrolledItems.length === 0;

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
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {activeQuery.isFetching && !activeQuery.isLoading && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6D4AE0]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Updating...</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setPreviewEmptyState((v) => !v)}
            className="px-3 py-1.5 rounded-[10px] bg-white border border-[#E6E1F5] hover:border-[#A78BFA] text-[12px] font-semibold text-[#6D4AE0] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F59E3B]" />
            <span>{previewEmptyState ? 'Show my courses' : 'Preview empty state'}</span>
          </button>
        </div>
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
              {
                id: 'all',
                label: 'All',
                count: kpis?.enrolledCount ?? enrollmentsQuery.data?.meta.total ?? 0,
              },
              { id: 'in-progress', label: 'In progress', count: kpis?.inProgressCount ?? 0 },
              { id: 'completed', label: 'Completed', count: kpis?.completedCount ?? 0 },
              { id: 'wishlist', label: 'Wishlist', count: wishlistIds.length },
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
                  setPreviewEmptyState(false);
                  updateUrlParams({
                    tab: t.id === 'all' ? null : t.id,
                    page: null,
                  });
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
              aria-label="Search my courses"
              className="w-full h-11 pl-9 pr-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[14px] text-[#1E1B2E] focus:outline-none focus:border-[#6D4AE0]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => {
              const nextSort = parseSortParam(e.target.value);
              updateUrlParams({
                sort: nextSort === 'recent' ? null : nextSort,
                page: null,
              });
            }}
            aria-label="Sort my courses"
            className="h-11 pl-3 pr-8 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[14px] font-semibold text-[#1E1B2E] focus:outline-none focus:border-[#6D4AE0] cursor-pointer"
          >
            <option value="recent">Sort: Recently accessed</option>
            <option value="progress-desc">Progress: High to low</option>
            <option value="progress-asc">Progress: Low to high</option>
            <option value="title">Title: A–Z</option>
          </select>
        </div>
      </div>

      {activeQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <Skeleton key={idx} variant="card" />
          ))}
        </div>
      ) : activeQuery.isError ? (
        <QueryErrorState
          error={activeQuery.error}
          title="Could not load your courses"
          onRetry={() => {
            void activeQuery.refetch();
          }}
        />
      ) : isEmptyList ? (
        <EmptyState
          title={
            activeTab === 'wishlist'
              ? 'Your wishlist is empty'
              : urlSearchQuery
                ? 'No matching courses found'
                : 'No courses in this tab yet'
          }
          description="Explore our catalog of hands-on video courses to start learning a new skill and earn your verified certificate."
          actionLabel="Browse courses"
          actionTo="/courses"
          mood="empty"
        />
      ) : activeTab === 'wishlist' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistCourses.map((course) => (
            <CourseCard key={course.id} course={course} showHoverPreview />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledItems.map((card) => {
              const { course, courseState } = card;
              const wishlisted = wishlistIds.includes(course.id);

              return (
                <article
                  key={card.enrollmentId}
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
                          courseState === 'completed'
                            ? 'Completed'
                            : courseState === 'take-exam'
                              ? 'Ready for exam'
                              : 'In progress'
                        }
                        variant={
                          courseState === 'completed'
                            ? 'success'
                            : courseState === 'take-exam'
                              ? 'gold'
                              : 'primary'
                        }
                        className="bg-white/95"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={toggleWishlistMutation.isPending}
                      onClick={() =>
                        toggleWishlistMutation.mutate({
                          courseId: course.id,
                          currentlyWishlisted: wishlisted,
                        })
                      }
                      aria-label="Toggle wishlist"
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 border border-[#E6E1F5] flex items-center justify-center text-[#5F5B75] hover:text-[#DC2626] disabled:opacity-50 cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 ${wishlisted ? 'fill-[#DC2626] text-[#DC2626]' : ''}`}
                      />
                    </button>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-bold text-[#6D4AE0]">{course.categoryName}</span>
                        <span className="text-[#5F5B75]">
                          Last accessed {card.lastAccessedLabel}
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
                            {card.completedLessons} of {card.totalLessons} lessons
                          </span>
                          <span className="font-display font-bold text-[16px] text-[#6D4AE0]">
                            {card.progressPercent}%
                          </span>
                        </div>
                        <ProgressBar
                          value={card.progressPercent}
                          showValue={false}
                          size="sm"
                          color={courseState === 'completed' ? 'success' : 'primary'}
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {courseState === 'completed' ? (
                          <Button
                            variant="primary"
                            size="md"
                            fullWidth
                            leftIcon={<Award className="w-4 h-4" />}
                            onClick={() =>
                              navigate(
                                card.certificateId
                                  ? `/certificates/${card.certificateId}`
                                  : '/certificates'
                              )
                            }
                          >
                            View certificate
                          </Button>
                        ) : courseState === 'take-exam' ? (
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
                              navigate(`/learn/${course.id}/${card.lastLessonId}`)
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

          {totalPages > 1 && (
            <div className="flex justify-center pt-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) =>
                  updateUrlParams({ page: page <= 1 ? null : String(page) })
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const StudentCourseProgressPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const progressQuery = useCourseProgress(courseId);
  const completeMutation = useCompleteLessonMutation();
  const uncompleteMutation = useUncompleteLessonMutation();

  usePageTitle(
    progressQuery.data?.courseTitle
      ? `${progressQuery.data.courseTitle} Progress`
      : 'Course Progress'
  );

  if (progressQuery.isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="w-48" />
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-4">
          <Skeleton variant="title" />
          <Skeleton className="w-1/2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton variant="card" />
          </div>
        </div>
      </div>
    );
  }

  if (progressQuery.isError) {
    if (isNotFoundError(progressQuery.error)) {
      return <NotFound404Page />;
    }
    if (isForbiddenError(progressQuery.error)) {
      return <Forbidden403Page />;
    }
    return (
      <QueryErrorState
        error={progressQuery.error}
        title="Unable to load course progress"
        onRetry={() => {
          void progressQuery.refetch();
        }}
      />
    );
  }

  const progress = progressQuery.data;
  if (!progress) {
    return <NotFound404Page />;
  }

  const lessonsCompleteDone = progress.overallPercent === 100;
  const bestExamScore = progress.bestExamScorePercent;
  const passingThreshold = progress.passingScorePercent;
  const examPassedDone = progress.examPassed;
  const certificateUnlocked = progress.certificateUnlocked;
  const isTogglingAny = completeMutation.isPending || uncompleteMutation.isPending;

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'My courses', to: '/student/courses' },
          { label: `${progress.courseTitle} — Progress` },
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
                Course % = completed lessons ({progress.completedLessons}) / total lessons (
                {progress.totalLessons})
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip label={progress.categoryName} variant="primary" />
            <StatusChip
              label={
                certificateUnlocked
                  ? 'Completed & Certified'
                  : `${progress.completedLessons} of ${progress.totalLessons} lessons completed`
              }
              variant={certificateUnlocked ? 'success' : 'gold'}
            />
          </div>
          <h1 className="text-[30px] sm:text-[36px] font-display font-bold text-[#1E1B2E] leading-tight">
            {progress.courseTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-5 text-[14px] text-[#5F5B75]">
            <span>
              Instructor: <strong className="text-[#1E1B2E]">{progress.instructorName}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#6D4AE0]" />
              <span>
                Watched time:{' '}
                <strong className="text-[#1E1B2E]">{progress.watchedTimeLabel}</strong> of{' '}
                {progress.totalTimeLabel}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to={`/learn/${progress.courseId}/${progress.lastLessonId}`}>
              <Button variant="primary" leftIcon={<PlayCircle className="w-4 h-4" />}>
                {lessonsCompleteDone ? 'Review video lessons' : 'Resume video lessons'}
              </Button>
            </Link>
            <Link to={`/courses/${progress.courseId}`}>
              <Button variant="secondary">Course details</Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-6 self-start lg:self-center p-4 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5]">
          <ProgressRing
            value={progress.overallPercent}
            size={108}
            strokeWidth={10}
            label="Overall completion"
          />
          <div className="space-y-1.5 text-[13px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
              <span className="text-[#5F5B75]">Completed:</span>
              <strong className="text-[#1E1B2E]">{progress.completedLessons}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E3B]" />
              <span className="text-[#5F5B75]">In progress:</span>
              <strong className="text-[#1E1B2E]">{progress.inProgressLessons}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E6E1F5]" />
              <span className="text-[#5F5B75]">Remaining:</span>
              <strong className="text-[#1E1B2E]">{progress.notStartedLessons}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN GRID: Section-by-Section Lesson Checklist + Final Exam Status & Certificate Requirements Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-5">
          <div>
            <h2 className="text-[26px] font-display font-bold text-[#1E1B2E]">
              Section-by-section lesson checklist
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Click any unlocked lesson to watch, or toggle completion to update your course progress.
            </p>
          </div>

          <div className="space-y-4">
            {progress.sections.map((section) => (
              <div
                key={section.id}
                className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden"
              >
                <div className="px-5 py-4 bg-[#FAF8FF] border-b border-[#E6E1F5] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                      {section.title}
                    </h3>
                    <p className="text-[12px] text-[#5F5B75]">
                      {section.lessons.length} lessons
                    </p>
                  </div>
                  <StatusChip
                    label={`${section.completedCount} / ${section.lessons.length} completed`}
                    variant={section.completedCount === section.lessons.length ? 'success' : 'primary'}
                  />
                </div>

                <div className="divide-y divide-[#E6E1F5]">
                  {section.lessons.map((lesson) => {
                    const statusType = lesson.status;
                    const pct = lesson.watchPercent;

                    return (
                      <div
                        key={lesson.lessonId}
                        className={`p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          lesson.locked ? 'bg-[#FAF8FF]/60 opacity-75' : 'hover:bg-[#FAF8FF]'
                        }`}
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <button
                            type="button"
                            disabled={lesson.locked || isTogglingAny}
                            onClick={() => {
                              if (lesson.completed) {
                                uncompleteMutation.mutate({
                                  courseId: progress.courseId,
                                  lessonId: lesson.lessonId,
                                  lessonTitle: lesson.title,
                                });
                              } else {
                                completeMutation.mutate({
                                  courseId: progress.courseId,
                                  lessonId: lesson.lessonId,
                                  lessonTitle: lesson.title,
                                });
                              }
                            }}
                            className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed ${
                              statusType === 'completed'
                                ? 'bg-[#16A34A] text-white'
                                : statusType === 'in_progress'
                                  ? 'bg-[#FEF3C7] border-2 border-[#F59E3B] text-[#B45309]'
                                  : statusType === 'locked'
                                    ? 'bg-[#E6E1F5] text-[#5F5B75]'
                                    : 'bg-white border-2 border-[#E6E1F5] hover:border-[#6D4AE0]'
                            }`}
                            title={
                              lesson.locked
                                ? 'Complete previous lesson first'
                                : 'Click to toggle lesson completion'
                            }
                          >
                            {statusType === 'completed' ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : statusType === 'locked' ? (
                              <Lock className="w-3 h-3" />
                            ) : statusType === 'in_progress' ? (
                              <span className="w-2 h-2 rounded-full bg-[#F59E3B]" />
                            ) : null}
                          </button>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[15px] font-bold text-[#1E1B2E]">
                                {lesson.title}
                              </span>
                              {statusType === 'completed' && (
                                <StatusChip label={`Completed (${pct}%)`} variant="success" />
                              )}
                              {statusType === 'in_progress' && (
                                <StatusChip label={`In progress (${pct}%)`} variant="orange" />
                              )}
                              {statusType === 'not_started' && (
                                <StatusChip label="Not started" variant="neutral" dot={false} />
                              )}
                              {statusType === 'locked' && (
                                <StatusChip label="Locked" variant="neutral" dot={false} />
                              )}
                            </div>
                            <p className="text-[12px] text-[#5F5B75]">
                              Duration: {lesson.durationLabel} •{' '}
                              {statusType === 'locked'
                                ? 'Requires previous lesson (90%+ watched)'
                                : statusType === 'completed'
                                  ? '90% watch rule satisfied'
                                  : statusType === 'in_progress'
                                    ? `Watch ${Math.max(0, 90 - pct)}% more to auto-complete`
                                    : 'Ready to start'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {lesson.locked ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled
                              leftIcon={<Lock className="w-3.5 h-3.5" />}
                            >
                              Locked
                            </Button>
                          ) : (
                            <Link to={`/learn/${progress.courseId}/${lesson.lessonId}`}>
                              <Button
                                size="sm"
                                variant={
                                  statusType === 'in_progress' ? 'primary' : 'secondary'
                                }
                              >
                                {statusType === 'completed'
                                  ? 'Rewatch'
                                  : statusType === 'in_progress'
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
            ))}
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
                      ? `Below ${passingThreshold}%`
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
                Passing threshold: {passingThreshold}% or higher • Timed assessment
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
                <p className="font-display font-bold text-[20px] text-[#16A34A]">
                  {passingThreshold}%+
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Link to={`/exam/${progress.courseId}`} className="block">
                <Button variant="secondary" fullWidth size="md">
                  {typeof bestExamScore === 'number' ? 'Retake final exam' : 'Start final exam'}
                </Button>
              </Link>
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
                    Current: {progress.completedLessons} of {progress.totalLessons} lessons (
                    {progress.overallPercent}%)
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
                  <p className="font-bold text-[#1E1B2E]">
                    Pass the final exam ({passingThreshold}%+)
                  </p>
                  <p className="text-[#5F5B75] mt-0.5">
                    {typeof bestExamScore === 'number'
                      ? `Best score: ${bestExamScore}% (${
                          examPassedDone ? 'Passed' : `Needs ${passingThreshold}%+`
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
              onClick={() =>
                navigate(
                  progress.certificateId
                    ? `/certificates/${progress.certificateId}?view=completion`
                    : '/certificates'
                )
              }
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
