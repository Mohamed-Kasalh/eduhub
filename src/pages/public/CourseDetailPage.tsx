import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import {
  Star,
  Users,
  Clock,
  Globe,
  Calendar,
  PlayCircle,
  FileText,
  FileCheck2,
  CheckCircle2,
  Award,
  Smartphone,
  Infinity as InfinityIcon,
  BookOpen,
  Heart,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  Sparkles,
  AlertCircle,
  Lock,
  ArrowRight,
  Share2,
  MessageSquarePlus,
  Volume2,
  Maximize2,
} from 'lucide-react';
import {
  Button,
  CourseCard,
  StatusChip,
  FeaturedStickerTag,
  Breadcrumbs,
  Avatar,
  ProgressBar,
  Modal,
  Skeleton,
  QueryErrorState,
} from '../../components/ui';
import { CatMascot } from '../../components/brand/BrandLogo';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  useCourseDetail,
  useCourseReviews,
  useCreateCourseReviewMutation,
  useRelatedCourses,
  useToggleReviewHelpfulMutation,
} from '../../api/hooks/useCatalog';
import { useEnrollCourseMutation } from '../../api/hooks/useLearning';
import { useToggleWishlistMutation } from '../../api/hooks/useWishlist';
import { getErrorMessage, isNotFoundError } from '../../api/errors';
import { NotFound404Page } from '../ErrorPages';
import { handleImageError } from '../../utils/imageFallback';
import { usePageTitle } from '../../hooks/usePageTitle';
import type { CurriculumLessonItem } from '../../data/mockData';

type EnrollmentCardState = 'not-enrolled' | 'free' | 'enrolled' | 'unavailable';
type DetailTabId = 'overview' | 'curriculum' | 'instructor' | 'reviews';

const DEFAULT_LEARNING_OUTCOMES = [
  'Build production-ready applications following clean architecture and modular design patterns',
  'Write type-safe, maintainable code with modern tooling, automated linting, and strict checks',
  'Implement responsive 1440px, 768px, and 375px layouts that pass WCAG 2.2 AA accessibility audits',
  'State management, caching, and URL synchronization for real-world multi-role web platforms',
  'Debug performance bottlenecks using browser flamegraphs, memory profilers, and bundle analyzers',
  'Design and execute unit, integration, and end-to-end automated tests with high confidence',
  'Prepare for the timed certification exam with hands-on section quizzes and code walkthroughs',
  'Deploy and monitor production builds with automated CI/CD workflows and rollback safeguards',
];

const COURSE_REQUIREMENTS = [
  'A computer (Windows, macOS, or Linux) with a modern web browser and stable internet connection',
  'Foundational familiarity with HTML, CSS, or basic programming concepts (all advanced topics are taught step by step)',
  'No paid software required — we use free, open-source tools and provide a pre-configured starter repository',
];

export const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useApp();
  const { isAuthenticated } = useAuth();

  const detailQuery = useCourseDetail(id);
  const detail = detailQuery.data;
  const course = detail?.course;
  usePageTitle(course?.title ?? 'Course Details');

  const [reviewsLimit, setReviewsLimit] = useState<number>(3);
  const reviewsQuery = useCourseReviews(
    id,
    { page: 1, limit: reviewsLimit },
    Boolean(id) && Boolean(detail)
  );
  const relatedQuery = useRelatedCourses(
    id,
    4,
    Boolean(id) && Boolean(detail)
  );

  const enrollMutation = useEnrollCourseMutation();
  const createReviewMutation = useCreateCourseReviewMutation(id ?? '');
  const helpfulMutation = useToggleReviewHelpfulMutation(id ?? '');
  const toggleWishlistMutation = useToggleWishlistMutation();

  const [cardStateOverride, setCardStateOverride] = useState<EnrollmentCardState | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTabId>('overview');
  const [openSectionIds, setOpenSectionIds] = useState<string[]>([]);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [activeDemoLesson, setActiveDemoLesson] = useState<CurriculumLessonItem | null>(null);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [instructorModalOpen, setInstructorModalOpen] = useState(false);

  const [reviewRating, setReviewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewError, setReviewError] = useState<string>('');

  // Reset per-course view state when navigating between courses or loading detail
  useEffect(() => {
    setCardStateOverride(null);
    setReviewsLimit(3);
  }, [id]);

  useEffect(() => {
    if (!detail) return;
    setOpenSectionIds(detail.sections.slice(0, 2).map((s) => s.id));
    setActiveDemoLesson(
      detail.sections.flatMap((s) => s.lessons).find((l) => l.isPreview) ??
        detail.sections[0]?.lessons[0] ??
        null
    );
  }, [detail?.course.id]);

  const sections = detail?.sections ?? [];
  const previewLessons = useMemo(
    () => sections.flatMap((s) => s.lessons).filter((l) => l.isPreview),
    [sections]
  );

  if (detailQuery.isPending) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 space-y-8">
        <Skeleton variant="text" className="w-64 h-6" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton variant="card" className="h-64" />
            <Skeleton variant="card" className="h-96" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton variant="card" className="h-[460px]" />
          </div>
        </div>
      </div>
    );
  }

  if (detailQuery.isError || !detail || !course) {
    if (isNotFoundError(detailQuery.error)) {
      return <NotFound404Page />;
    }
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <QueryErrorState
          title="Could not load course details"
          error={detailQuery.error}
          onRetry={() => void detailQuery.refetch()}
        />
      </div>
    );
  }

  const {
    description,
    requirements,
    totalSectionsCount,
    totalLessonsCount,
    totalDurationLabel,
    instructorInfo,
    ratingBreakdown,
    viewerContext,
  } = detail;

  const isWishlisted = viewerContext.isWishlisted;
  const isActuallyEnrolled = viewerContext.isEnrolled;
  const isCourseFree = course.price === 0 || Boolean(course.isFree);
  const naturalCardState: EnrollmentCardState =
    course.unavailable || course.status === 'Rejected'
      ? 'unavailable'
      : isActuallyEnrolled
      ? 'enrolled'
      : isCourseFree
      ? 'free'
      : 'not-enrolled';
  const effectiveCardState: EnrollmentCardState = cardStateOverride ?? naturalCardState;

  const courseReviews = reviewsQuery.data?.items ?? [];
  const totalReviewsCount = reviewsQuery.data?.meta.total ?? course.reviewCount;
  const relatedCourses = relatedQuery.data ?? [];
  const learningOutcomes =
    course.learningPoints && course.learningPoints.length > 0
      ? course.learningPoints.slice(0, 8)
      : DEFAULT_LEARNING_OUTCOMES;
  const requirementsList = requirements.length > 0 ? requirements : COURSE_REQUIREMENTS;
  const firstLessonId = sections[0]?.lessons[0]?.id ?? 'lesson-101';
  const nextLessonTarget = viewerContext.nextLessonId || firstLessonId;

  // Price discount calculation
  const displayPrice = course.price > 0 ? course.price : 49.99;
  const displayOriginalPrice = course.originalPrice || Math.max(displayPrice * 1.6, 89.99);
  const discountPercent = Math.round(
    ((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100
  );
  const progressPercent = viewerContext.progressPercent;

  const allSectionsExpanded = sections.length > 0 && openSectionIds.length === sections.length;

  const handleToggleAllSections = () => {
    if (allSectionsExpanded) {
      setOpenSectionIds([]);
    } else {
      setOpenSectionIds(sections.map((s) => s.id));
    }
  };

  const handleToggleSection = (secId: string) => {
    setOpenSectionIds((prev) =>
      prev.includes(secId) ? prev.filter((sec) => sec !== secId) : [...prev, secId]
    );
  };

  const handleScrollToSection = (tabId: DetailTabId) => {
    setActiveTab(tabId);
    const el = document.getElementById(`section-${tabId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOpenDemoLesson = (lesson?: CurriculumLessonItem) => {
    if (lesson) {
      setActiveDemoLesson(lesson);
    } else {
      setActiveDemoLesson(previewLessons[0] ?? sections[0]?.lessons[0] ?? null);
    }
    setDemoModalOpen(true);
  };

  const toggleWishlist = (targetCourseId: string) => {
    if (toggleWishlistMutation.isPending) return;
    toggleWishlistMutation.mutate({
      courseId: targetCourseId,
      currentlyWishlisted: isWishlisted,
    });
  };

  const handleConfirmEnrollment = async () => {
    if (!isAuthenticated) {
      setEnrollModalOpen(false);
      navigate(`/login?returnTo=${encodeURIComponent(`/courses/${course.id}`)}`);
      return;
    }
    if (enrollMutation.isPending) return;
    try {
      await enrollMutation.mutateAsync(course.id);
      setCardStateOverride(null);
      setEnrollModalOpen(false);
    } catch {
      // Danger toast is emitted by mutation hook
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createReviewMutation.isPending) return;
    if (reviewComment.trim().length < 10) {
      setReviewError('Please write at least 10 characters sharing your learning experience.');
      return;
    }
    setReviewError('');
    try {
      await createReviewMutation.mutateAsync({
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewComment('');
      setReviewRating(5);
      setReviewModalOpen(false);
    } catch (err) {
      setReviewError(getErrorMessage(err, 'Could not submit your review.'));
    }
  };

  const levelVariant =
    course.level === 'Beginner'
      ? 'success'
      : course.level === 'Intermediate'
      ? 'orange'
      : 'primary';

  return (
    <div className="pb-24 lg:pb-16">
      {/* HERO BAND (Tint background #F3EFFF) */}
      <section className="bg-[#F3EFFF] border-b border-[#E6E1F5] py-8 sm:py-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <Breadcrumbs
              items={[
                { label: 'All courses', to: '/courses' },
                {
                  label: course.categoryName,
                  to: `/courses?cat=${encodeURIComponent(course.categoryId)}`,
                },
                { label: course.title },
              ]}
            />

            {/* Interactive Card State Switcher for testing all 4 required states */}
            <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-[10px] bg-white/90 border border-[#E6E1F5] shadow-2xs self-start">
              <span className="text-[11px] font-bold text-[#5F5B75] px-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#6D4AE0]" />
                Card state:
              </span>
              {(
                [
                  { id: 'not-enrolled', label: 'Not enrolled' },
                  { id: 'free', label: 'Free' },
                  { id: 'enrolled', label: 'Enrolled' },
                  { id: 'unavailable', label: 'Unavailable' },
                ] as const
              ).map((st) => {
                const active = effectiveCardState === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setCardStateOverride(st.id)}
                    className={`px-2.5 py-1 rounded-[7px] text-[12px] font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-[#6D4AE0] text-white shadow-2xs'
                        : 'text-[#5F5B75] hover:text-[#1E1B2E] hover:bg-[#F3EFFF]'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                {course.featured && <FeaturedStickerTag label="Featured" />}
                <StatusChip
                  label={course.categoryName}
                  variant="primary"
                  className="bg-white"
                />
                <StatusChip label={course.level} variant={levelVariant} dot={false} />
                {effectiveCardState === 'enrolled' && (
                  <StatusChip label="Enrolled" variant="success" />
                )}
              </div>

              <h1 className="text-[32px] sm:text-[38px] lg:text-[40px] font-display font-bold text-[#1E1B2E] leading-[1.15]">
                {course.title}
              </h1>

              <p className="text-[16px] sm:text-[18px] text-[#5F5B75] leading-relaxed">
                {course.subtitle}
              </p>

              {/* Rating, Review count, Learners, Instructor Link */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-5 pt-1 text-[14px]">
                <button
                  type="button"
                  onClick={() => handleScrollToSection('reviews')}
                  className="inline-flex items-center gap-1.5 font-bold text-[#1E1B2E] hover:text-[#6D4AE0] cursor-pointer"
                >
                  <span className="font-display font-bold text-[17px] text-[#B45309]">
                    {course.rating.toFixed(1)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-[#F5B82E] text-[#F5B82E]"
                      />
                    ))}
                  </div>
                  <span className="text-[#6D4AE0] underline font-semibold">
                    ({course.reviewCount.toLocaleString()} reviews)
                  </span>
                </button>

                <span className="inline-flex items-center gap-1.5 text-[#1E1B2E] font-semibold">
                  <Users className="w-4 h-4 text-[#6D4AE0]" />
                  {course.studentsCount.toLocaleString()} learners
                </span>

                <div className="inline-flex items-center gap-2">
                  <Avatar
                    src={course.instructorAvatar}
                    name={course.instructorName}
                    size="sm"
                  />
                  <span className="text-[#5F5B75]">Created by</span>
                  <button
                    type="button"
                    onClick={() => handleScrollToSection('instructor')}
                    className="font-bold text-[#6D4AE0] hover:underline cursor-pointer"
                  >
                    {course.instructorName}
                  </button>
                </div>
              </div>

              {/* Last updated, Language, Level badge */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-2 border-t border-[#E6E1F5] text-[13px] text-[#5F5B75]">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#6D4AE0]" />
                  <span>Last updated {course.updatedAt}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#6D4AE0]" />
                  <span>{course.language || 'English & Arabic CC'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#6D4AE0]" />
                  <span>Verified completion certificate included</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT GRID: Left 8 Columns (Tabs & Content) + Right 4 Columns (Sticky Card) */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT MAIN COLUMN */}
        <div className="lg:col-span-8 space-y-10">
          {/* Sticky In-Page Navigation Tabs (Overview, Curriculum, Instructor, Reviews) */}
          <div className="sticky top-16 z-20 bg-[#FAF8FF]/95 backdrop-blur-md py-2.5 border-b border-[#E6E1F5]">
            <nav
              aria-label="Course sections"
              className="flex items-center gap-2 overflow-x-auto no-scrollbar"
            >
              {(
                [
                  { id: 'overview', label: 'Overview' },
                  { id: 'curriculum', label: `Curriculum (${totalLessonsCount})` },
                  { id: 'instructor', label: 'Instructor' },
                  { id: 'reviews', label: `Reviews (${course.reviewCount.toLocaleString()})` },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleScrollToSection(tab.id)}
                    className={`h-10 px-4 rounded-[10px] text-[14px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#6D4AE0] text-white shadow-purple-sm'
                        : 'bg-white text-[#5F5B75] border border-[#E6E1F5] hover:text-[#1E1B2E] hover:border-[#A78BFA]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 1. OVERVIEW SECTION: What you'll learn (2-column checklist), Requirements, Description with Read more */}
          <section id="section-overview" className="scroll-mt-32 space-y-8">
            {/* What you'll learn: 2-column checklist */}
            <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-7 shadow-purple-sm space-y-4">
              <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                What you'll learn
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
                {learningOutcomes.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-[14px] text-[#1E1B2E]">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Requirements & Description with Read more */}
            <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-7 shadow-purple-sm space-y-6">
              <div className="space-y-3">
                <h3 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                  Requirements
                </h3>
                <ul className="space-y-2">
                  {requirementsList.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-[14px] text-[#5F5B75]"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#6D4AE0] shrink-0 mt-2" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-5 border-t border-[#E6E1F5] space-y-3">
                <h3 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                  Description
                </h3>
                <div className="space-y-3 text-[15px] text-[#5F5B75] leading-relaxed">
                  <p>{description}</p>
                  {isDescriptionExpanded && (
                    <p>
                      When you complete the lessons across {totalSectionsCount} structured sections
                      ({totalLessonsCount} lessons) and pass the final certification exam, EduHub
                      issues your verified completion certificate with a public verification code.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#6D4AE0] hover:text-[#5A3AC7] cursor-pointer pt-1"
                >
                  <span>{isDescriptionExpanded ? 'Show less' : 'Read more'}</span>
                  {isDescriptionExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* 2. CURRICULUM ACCORDION SECTION */}
          <section id="section-curriculum" className="scroll-mt-32 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h2 className="text-[28px] font-display font-bold text-[#1E1B2E]">
                  Course curriculum
                </h2>
                <p className="text-[14px] font-semibold text-[#5F5B75]">
                  {totalSectionsCount} sections, {totalLessonsCount} lessons, {totalDurationLabel} total
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleAllSections}
                className="text-[14px] font-bold text-[#6D4AE0] hover:underline cursor-pointer self-start sm:self-auto"
              >
                {allSectionsExpanded ? 'Collapse all sections' : 'Expand all'}
              </button>
            </div>

            <div className="space-y-3">
              {sections.map((section) => {
                const isOpen = openSectionIds.includes(section.id);
                return (
                  <div
                    key={section.id}
                    className={`rounded-[12px] bg-white border transition-all overflow-hidden ${
                      isOpen
                        ? 'border-[#A78BFA] shadow-purple-sm'
                        : 'border-[#E6E1F5] hover:border-[#A78BFA]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSection(section.id)}
                      className="w-full px-5 py-4 bg-[#FAF8FF]/60 hover:bg-[#F3EFFF]/60 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <h3 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                          {section.title}
                        </h3>
                        <p className="text-[13px] text-[#5F5B75]">
                          {section.lessonsCount} lessons • {section.totalDuration}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-[#6D4AE0] shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="divide-y divide-[#E6E1F5] border-t border-[#E6E1F5]">
                        {section.lessons.map((lesson) => {
                          const typeIcon =
                            lesson.type === 'video' ? (
                              <PlayCircle className="w-4 h-4 text-[#6D4AE0] shrink-0" />
                            ) : lesson.type === 'reading' ? (
                              <FileText className="w-4 h-4 text-[#F59E3B] shrink-0" />
                            ) : (
                              <FileCheck2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                            );

                          const typeLabel =
                            lesson.type === 'video'
                              ? 'Video'
                              : lesson.type === 'reading'
                              ? 'Reading'
                              : 'Exam';

                          return (
                            <div
                              key={lesson.id}
                              className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF8FF] transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {typeIcon}
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[14px] font-semibold text-[#1E1B2E]">
                                      {lesson.title}
                                    </span>
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF8FF] border border-[#E6E1F5] text-[#5F5B75]">
                                      {typeLabel}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {lesson.isPreview ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDemoLesson(lesson)}
                                    className="px-2.5 py-1 rounded-full bg-[#F3EFFF] hover:bg-[#6D4AE0] text-[#6D4AE0] hover:text-white text-[12px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <PlayCircle className="w-3.5 h-3.5" />
                                    <span>Preview</span>
                                  </button>
                                ) : effectiveCardState === 'enrolled' ? (
                                  <Link
                                    to={
                                      lesson.type === 'exam'
                                        ? `/exam/${course.id}`
                                        : `/learn/${course.id}/${lesson.id}`
                                    }
                                    className="text-[12px] font-bold text-[#6D4AE0] hover:underline"
                                  >
                                    Start
                                  </Link>
                                ) : (
                                  <Lock className="w-3.5 h-3.5 text-[#5F5B75]/50" />
                                )}
                                <span className="text-[13px] text-[#5F5B75] font-medium w-12 text-right">
                                  {lesson.duration}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. INSTRUCTOR CARD SECTION */}
          <section id="section-instructor" className="scroll-mt-32">
            <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-7 shadow-purple-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={instructorInfo.avatar}
                    name={instructorInfo.name}
                    size="xl"
                    status="online"
                  />
                  <div>
                    <span className="text-[12px] font-bold text-[#6D4AE0]">
                      Course instructor
                    </span>
                    <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                      {instructorInfo.name}
                    </h2>
                    <p className="text-[14px] font-semibold text-[#5F5B75]">
                      {instructorInfo.field}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setInstructorModalOpen(true)}
                  >
                    View profile
                  </Button>
                  <Link
                    to={`/courses?instructor=${encodeURIComponent(instructorInfo.name)}`}
                  >
                    <Button variant="ghost" size="sm">
                      All courses ({instructorInfo.coursesCount})
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Instructor stats row */}
              <div className="grid grid-cols-3 gap-4 p-4 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5]">
                <div className="flex items-center gap-2.5">
                  <Star className="w-5 h-5 fill-[#F5B82E] text-[#F5B82E] shrink-0" />
                  <div>
                    <p className="font-display font-bold text-[18px] text-[#1E1B2E] leading-none">
                      {instructorInfo.rating.toFixed(1)}
                    </p>
                    <p className="text-[12px] text-[#5F5B75]">Instructor rating</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-[#6D4AE0] shrink-0" />
                  <div>
                    <p className="font-display font-bold text-[18px] text-[#1E1B2E] leading-none">
                      {instructorInfo.learnersCount}
                    </p>
                    <p className="text-[12px] text-[#5F5B75]">Total learners</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-[#16A34A] shrink-0" />
                  <div>
                    <p className="font-display font-bold text-[18px] text-[#1E1B2E] leading-none">
                      {instructorInfo.coursesCount} courses
                    </p>
                    <p className="text-[12px] text-[#5F5B75]">Published on EduHub</p>
                  </div>
                </div>
              </div>

              <p className="text-[15px] text-[#5F5B75] leading-relaxed">
                {instructorInfo.bio} Every syllabus is peer-reviewed for technical accuracy,
                inclusive design, and practical workplace applicability.
              </p>
            </div>
          </section>

          {/* 4. REVIEWS SECTION: Average rating, 5-bar distribution, review list, Load more, Write a review */}
          <section id="section-reviews" className="scroll-mt-32 space-y-6">
            <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-7 shadow-purple-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-[28px] font-display font-bold text-[#1E1B2E]">
                    Student reviews
                  </h2>
                  <p className="text-[14px] text-[#5F5B75]">
                    Verified feedback from learners who took {course.title}
                  </p>
                </div>

                {/* Enrolled students see "Write a review" button */}
                {effectiveCardState === 'enrolled' ? (
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<MessageSquarePlus className="w-4 h-4" />}
                    onClick={() => setReviewModalOpen(true)}
                  >
                    Write a review
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#5F5B75]">
                      Enrolled students can rate this course
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCardStateOverride('enrolled');
                        setReviewModalOpen(true);
                      }}
                    >
                      Write a review
                    </Button>
                  </div>
                )}
              </div>

              {/* Average rating & 5-bar distribution */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-5 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5]">
                <div className="md:col-span-4 text-center md:border-r border-[#E6E1F5] md:pr-6 space-y-1">
                  <p className="font-display font-bold text-[52px] text-[#1E1B2E] leading-none">
                    {course.rating.toFixed(1)}
                  </p>
                  <div className="flex items-center justify-center gap-1 py-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className="w-5 h-5 fill-[#F5B82E] text-[#F5B82E]"
                      />
                    ))}
                  </div>
                  <p className="text-[13px] font-bold text-[#6D4AE0]">
                    Course rating • {course.reviewCount.toLocaleString()} ratings
                  </p>
                </div>

                <div className="md:col-span-8 space-y-2.5">
                  {ratingBreakdown.map((bar) => (
                    <div key={bar.stars} className="flex items-center gap-3 text-[13px]">
                      <div className="w-20 flex items-center gap-1 shrink-0 font-semibold text-[#1E1B2E]">
                        <Star className="w-3.5 h-3.5 fill-[#F5B82E] text-[#F5B82E]" />
                        <span>{bar.stars} stars</span>
                      </div>
                      <div className="flex-1 h-2.5 rounded-full bg-[#E6E1F5] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#F5B82E]"
                          style={{ width: `${bar.percent}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-bold text-[#5F5B75]">
                        {bar.percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review List */}
              {reviewsQuery.isPending ? (
                <div className="space-y-4">
                  <Skeleton variant="text" className="h-16" />
                  <Skeleton variant="text" className="h-16" />
                </div>
              ) : reviewsQuery.isError ? (
                <QueryErrorState
                  title="Could not load reviews"
                  error={reviewsQuery.error}
                  onRetry={() => void reviewsQuery.refetch()}
                />
              ) : courseReviews.length === 0 ? (
                <p className="text-[14px] text-[#5F5B75] py-4 text-center">
                  No student reviews yet. Complete the course to be the first to leave feedback.
                </p>
              ) : (
                <div className="divide-y divide-[#E6E1F5]">
                  {courseReviews.map((rev) => {
                    const hasVoted = rev.markedHelpfulByMe;
                    return (
                      <div key={rev.id} className="py-5 first:pt-1 last:pb-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar src={rev.authorAvatar} name={rev.authorName} size="md" />
                            <div>
                              <p className="font-display font-bold text-[16px] text-[#1E1B2E]">
                                {rev.authorName}
                              </p>
                              <p className="text-[12px] text-[#5F5B75]">
                                {rev.authorRole} • {rev.createdAt}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, sIdx) => (
                              <Star
                                key={sIdx}
                                className={`w-4 h-4 ${
                                  sIdx < rev.rating
                                    ? 'fill-[#F5B82E] text-[#F5B82E]'
                                    : 'text-[#E6E1F5]'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <p className="text-[15px] text-[#1E1B2E] leading-relaxed">
                          {rev.comment}
                        </p>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={helpfulMutation.isPending}
                            onClick={() => {
                              if (!isAuthenticated) {
                                navigate(`/login?returnTo=${encodeURIComponent(`/courses/${course.id}`)}`);
                                return;
                              }
                              helpfulMutation.mutate({
                                reviewId: rev.id,
                                currentlyHelpful: hasVoted,
                              });
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors cursor-pointer disabled:opacity-60 ${
                              hasVoted
                                ? 'bg-[#F3EFFF] border-[#6D4AE0] text-[#6D4AE0]'
                                : 'bg-white border-[#E6E1F5] text-[#5F5B75] hover:text-[#1E1B2E]'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Helpful ({rev.helpfulCount})</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Load more button */}
              {totalReviewsCount > courseReviews.length && (
                <div className="pt-2 flex justify-center">
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={reviewsQuery.isFetching}
                    onClick={() => setReviewsLimit((prev) => prev + 5)}
                  >
                    {reviewsQuery.isFetching
                      ? 'Loading reviews...'
                      : `Load more reviews (${totalReviewsCount - courseReviews.length} more)`}
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT STICKY ENROLLMENT CARD */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24">
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-lg overflow-hidden">
            {/* Cover with Play button opening Demo-Video Modal */}
            <div className="relative h-52 w-full bg-[#1E1B2E] group overflow-hidden">
              <img
                src={course.thumbnail}
                alt={course.title}
                onError={handleImageError}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B2E]/80 via-[#1E1B2E]/35 to-transparent flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenDemoLesson()}
                  className="w-16 h-16 rounded-full bg-white text-[#6D4AE0] flex items-center justify-center shadow-purple-lg hover:scale-110 transition-transform cursor-pointer"
                  aria-label="Play course preview video"
                >
                  <PlayCircle className="w-9 h-9 fill-[#F3EFFF]" />
                </button>
                <span className="px-3 py-1 rounded-full bg-[#1E1B2E]/85 text-white text-[12px] font-bold tracking-wide">
                  Preview this course (08:24)
                </span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* STATE 1: NOT ENROLLED */}
              {effectiveCardState === 'not-enrolled' && (
                <>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-display font-bold text-[36px] text-[#1E1B2E] leading-none">
                        ${displayPrice.toFixed(2)}
                      </span>
                      <span className="text-[16px] text-[#5F5B75] line-through">
                        ${displayOriginalPrice.toFixed(2)}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] text-[12px] font-bold">
                      {discountPercent}% off
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={() => setEnrollModalOpen(true)}
                    >
                      Enroll now
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      fullWidth
                      leftIcon={
                        <Heart
                          className={`w-4 h-4 ${
                            isWishlisted ? 'fill-[#DC2626] text-[#DC2626]' : ''
                          }`}
                        />
                      }
                      onClick={() => toggleWishlist(course.id)}
                    >
                      {isWishlisted ? 'Saved in wishlist' : 'Add to wishlist'}
                    </Button>
                  </div>
                </>
              )}

              {/* STATE 2: FREE ("Enroll for free") */}
              {effectiveCardState === 'free' && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2.5">
                      <span className="px-3.5 py-1 rounded-full bg-[#16A34A]/12 text-[#16A34A] font-display font-bold text-[28px] leading-none">
                        Free
                      </span>
                      {course.originalPrice && (
                        <span className="text-[15px] text-[#5F5B75] line-through">
                          ${course.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <StatusChip label="100% free access" variant="success" />
                  </div>

                  <div className="space-y-2.5">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={() => setEnrollModalOpen(true)}
                    >
                      Enroll for free
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      fullWidth
                      leftIcon={
                        <Heart
                          className={`w-4 h-4 ${
                            isWishlisted ? 'fill-[#DC2626] text-[#DC2626]' : ''
                          }`}
                        />
                      }
                      onClick={() => toggleWishlist(course.id)}
                    >
                      {isWishlisted ? 'Saved in wishlist' : 'Add to wishlist'}
                    </Button>
                  </div>
                </>
              )}

              {/* STATE 3: ENROLLED (button "Continue learning" + progress bar and %) */}
              {effectiveCardState === 'enrolled' && (
                <>
                  <div className="p-4 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-[#16A34A] inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        You are enrolled
                      </span>
                      <span className="font-display font-bold text-[18px] text-[#6D4AE0]">
                        {progressPercent}%
                      </span>
                    </div>
                    <ProgressBar
                      value={progressPercent}
                      showPercent={false}
                      color={progressPercent === 100 ? 'success' : 'primary'}
                      size="md"
                    />
                    <p className="text-[12px] text-[#5F5B75]">
                      Next up: Lesson 3 — Deep dive into state & custom hooks
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                      onClick={() => navigate(`/learn/${course.id}/${nextLessonTarget}`)}
                    >
                      Continue learning
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      fullWidth
                      leftIcon={
                        <Heart
                          className={`w-4 h-4 ${
                            isWishlisted ? 'fill-[#DC2626] text-[#DC2626]' : ''
                          }`}
                        />
                      }
                      onClick={() => toggleWishlist(course.id)}
                    >
                      {isWishlisted ? 'Saved in wishlist' : 'Add to wishlist'}
                    </Button>
                  </div>
                </>
              )}

              {/* STATE 4: UNAVAILABLE (disabled with message) */}
              {effectiveCardState === 'unavailable' && (
                <>
                  <div className="rounded-[10px] bg-[#FEF2F2] border border-[#DC2626]/30 p-3.5 flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                    <div className="text-[13px] text-[#1E1B2E]">
                      <p className="font-bold text-[#DC2626]">
                        Course currently unavailable for new enrollments
                      </p>
                      <p className="text-[#5F5B75] mt-0.5">
                        This syllabus is undergoing scheduled academic updates for the new term.
                        Save it to your wishlist to be notified when enrollment reopens.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Button variant="primary" size="lg" fullWidth disabled>
                      Enrollment unavailable
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      fullWidth
                      leftIcon={
                        <Heart
                          className={`w-4 h-4 ${
                            isWishlisted ? 'fill-[#DC2626] text-[#DC2626]' : ''
                          }`}
                        />
                      }
                      onClick={() => toggleWishlist(course.id)}
                    >
                      {isWishlisted ? 'Saved in wishlist' : 'Add to wishlist'}
                    </Button>
                  </div>
                </>
              )}

              {/* "This course includes" list */}
              <div className="pt-4 border-t border-[#E6E1F5] space-y-3">
                <p className="font-display font-bold text-[16px] text-[#1E1B2E]">
                  This course includes:
                </p>
                <ul className="space-y-2.5 text-[14px] text-[#5F5B75]">
                  <li className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#6D4AE0] shrink-0" />
                    <span>{totalDurationLabel} on-demand HD video</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-[#6D4AE0] shrink-0" />
                    <span>{totalLessonsCount} structured lessons across {totalSectionsCount} sections</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <FileCheck2 className="w-4 h-4 text-[#6D4AE0] shrink-0" />
                    <span>Online exams & interactive section quizzes</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-[#6D4AE0] shrink-0" />
                    <span>Verified certificate of completion</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <InfinityIcon className="w-4 h-4 text-[#6D4AE0] shrink-0" />
                    <span>Full lifetime access & future updates</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-[#6D4AE0] shrink-0" />
                    <span>Access on mobile, tablet, and desktop</span>
                  </li>
                </ul>
              </div>

              <div className="pt-3 border-t border-[#E6E1F5] flex items-center justify-between text-[13px]">
                <button
                  type="button"
                  onClick={() =>
                    addToast({
                      title: 'Course link copied',
                      message: `Share ${course.title} with your team or classmates.`,
                      variant: 'info',
                    })
                  }
                  className="inline-flex items-center gap-1.5 font-semibold text-[#6D4AE0] hover:underline cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share course</span>
                </button>
                <span className="text-[#5F5B75]">30-day money-back guarantee</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* RELATED COURSES ROW (4 Cards) */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-14 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-[28px] font-display font-bold text-[#1E1B2E]">
              Related courses
            </h2>
            <p className="text-[15px] text-[#5F5B75]">
              Learners who viewed {course.title} also enrolled in these tracks
            </p>
          </div>
          <Link to="/courses">
            <Button variant="ghost" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Browse all courses
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedCourses.map((rel) => (
            <CourseCard key={rel.id} course={rel} showHoverPreview />
          ))}
        </div>
      </section>

      {/* MOBILE FIXED BOTTOM BAR (< lg) WITH PRICE AND BUTTON */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E6E1F5] px-4 py-3 shadow-purple-lg flex items-center justify-between gap-4">
        <div>
          {effectiveCardState === 'enrolled' ? (
            <div>
              <p className="text-[11px] font-bold text-[#16A34A]">Enrolled</p>
              <p className="font-display font-bold text-[18px] text-[#1E1B2E]">
                {progressPercent}% completed
              </p>
            </div>
          ) : effectiveCardState === 'free' ? (
            <div>
              <p className="text-[11px] text-[#5F5B75]">Full course access</p>
              <p className="font-display font-bold text-[22px] text-[#16A34A]">Free</p>
            </div>
          ) : effectiveCardState === 'unavailable' ? (
            <div>
              <p className="text-[11px] font-bold text-[#DC2626]">Status</p>
              <p className="font-display font-bold text-[16px] text-[#5F5B75]">
                Enrollment closed
              </p>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-[24px] text-[#1E1B2E]">
                ${displayPrice.toFixed(2)}
              </span>
              <span className="text-[13px] text-[#5F5B75] line-through">
                ${displayOriginalPrice.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 max-w-[220px]">
          {effectiveCardState === 'enrolled' ? (
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => navigate(`/learn/${course.id}/${nextLessonTarget}`)}
            >
              Continue learning
            </Button>
          ) : effectiveCardState === 'free' ? (
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setEnrollModalOpen(true)}
            >
              Enroll for free
            </Button>
          ) : effectiveCardState === 'unavailable' ? (
            <Button variant="primary" size="md" fullWidth disabled>
              Unavailable
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setEnrollModalOpen(true)}
            >
              Enroll now
            </Button>
          )}
        </div>
      </div>

      {/* MODAL 1: DEMO VIDEO PREVIEW MODAL */}
      <Modal
        open={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        title="Course preview"
        description={course.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDemoModalOpen(false)}>
              Close preview
            </Button>
            {effectiveCardState !== 'enrolled' && effectiveCardState !== 'unavailable' && (
              <Button
                variant="primary"
                onClick={() => {
                  setDemoModalOpen(false);
                  setEnrollModalOpen(true);
                }}
              >
                {effectiveCardState === 'free' ? 'Enroll for free' : 'Enroll now'}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          {/* Simulated HD Video Player */}
          <div className="relative rounded-[12px] overflow-hidden bg-[#1E1B2E] aspect-video flex flex-col justify-between p-4 text-white">
            <img
              src={course.thumbnail}
              alt={activeDemoLesson?.title ?? course.title}
              onError={handleImageError}
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="relative z-10 flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full bg-[#6D4AE0] text-[11px] font-bold">
                Free preview lesson
              </span>
              <span className="text-[12px] font-semibold bg-[#1E1B2E]/80 px-2.5 py-0.5 rounded-full">
                1080p HD • {activeDemoLesson?.duration ?? '05:00'}
              </span>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center my-auto space-y-2 px-4">
              <div className="w-14 h-14 rounded-full bg-white/95 text-[#6D4AE0] flex items-center justify-center shadow-lg">
                <PlayCircle className="w-8 h-8" />
              </div>
              <p className="font-display font-bold text-[18px] text-white">
                {activeDemoLesson?.title ?? course.title}
              </p>
            </div>

            {/* Simulated Player Controls Bar */}
            <div className="relative z-10 space-y-1.5 bg-[#1E1B2E]/80 backdrop-blur-xs p-2.5 rounded-[10px]">
              <div className="w-full h-1.5 rounded-full bg-white/25 overflow-hidden">
                <div className="w-1/3 h-full bg-[#A78BFA] rounded-full" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/85">
                <span>02:45 / {activeDemoLesson?.duration ?? '05:00'}</span>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" /> 100%
                  </span>
                  <span>1.0x</span>
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Free sample lessons playlist */}
          <div className="space-y-2">
            <p className="text-[13px] font-bold text-[#5F5B75]">
              Free sample lessons in this course:
            </p>
            <div className="space-y-1.5">
              {previewLessons.map((item) => {
                const selected = item.id === activeDemoLesson?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveDemoLesson(item)}
                    className={`w-full p-3 rounded-[10px] border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#F3EFFF] border-[#6D4AE0] text-[#1E1B2E]'
                        : 'bg-white border-[#E6E1F5] hover:bg-[#FAF8FF]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayCircle className="w-4 h-4 text-[#6D4AE0] shrink-0" />
                      <span className="text-[14px] font-semibold truncate">{item.title}</span>
                    </div>
                    <span className="text-[12px] text-[#5F5B75] shrink-0">
                      {item.duration}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: ENROLLMENT CONFIRMATION MODAL */}
      <Modal
        open={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        title="Confirm your enrollment"
        description="Review your course details below to unlock immediate access."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEnrollModalOpen(false)} disabled={enrollMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleConfirmEnrollment()}
              loading={enrollMutation.isPending}
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? 'Enrolling...' : 'Confirm enrollment'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-4 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5]">
            <img
              src={course.thumbnail}
              alt={course.title}
              onError={handleImageError}
              className="w-20 h-16 rounded-[8px] object-cover shrink-0 border border-[#E6E1F5]"
            />
            <div className="min-w-0">
              <span className="text-[12px] font-bold text-[#6D4AE0]">
                {course.categoryName} • {course.level}
              </span>
              <h4 className="font-display font-bold text-[18px] text-[#1E1B2E] truncate">
                {course.title}
              </h4>
              <p className="text-[13px] text-[#5F5B75]">
                Instructor: {course.instructorName}
              </p>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E6E1F5] p-4 space-y-2.5 text-[14px]">
            <div className="flex items-center justify-between text-[#5F5B75]">
              <span>Full course access (54 lessons + final exam)</span>
              <span>
                {effectiveCardState === 'free'
                  ? 'Free'
                  : `$${displayOriginalPrice.toFixed(2)}`}
              </span>
            </div>
            {effectiveCardState !== 'free' && (
              <div className="flex items-center justify-between text-[#16A34A] font-semibold">
                <span>Scholarship & bundle discount ({discountPercent}% off)</span>
                <span>-${(displayOriginalPrice - displayPrice).toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2.5 border-t border-[#E6E1F5] flex items-center justify-between font-display font-bold text-[20px] text-[#1E1B2E]">
              <span>Total due today</span>
              <span className="text-[#6D4AE0]">
                {effectiveCardState === 'free' ? '$0.00 (Free)' : `$${displayPrice.toFixed(2)}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-[10px] bg-[#F3EFFF] text-[13px] text-[#3F2A9E]">
            <CatMascot size="sm" mood="success" />
            <p>
              You will get instant lifetime access to all 8 curriculum sections, downloadable
              resources, and your verified completion certificate upon passing the final exam.
            </p>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: WRITE A REVIEW MODAL (Star Picker + Text) */}
      <Modal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Write a course review"
        description={`Share your experience with ${course.title}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewModalOpen(false)} disabled={createReviewMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitReview}
              loading={createReviewMutation.isPending}
              disabled={createReviewMutation.isPending}
            >
              {createReviewMutation.isPending ? 'Publishing...' : 'Publish review'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitReview} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-[14px] font-bold text-[#1E1B2E]">
              Your overall rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const active = (hoverRating || reviewRating) >= starValue;
                return (
                  <button
                    key={starValue}
                    type="button"
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setReviewRating(starValue)}
                    className="p-1.5 rounded-[8px] hover:bg-[#F3EFFF] transition-transform hover:scale-110 cursor-pointer"
                    aria-label={`Rate ${starValue} out of 5 stars`}
                  >
                    <Star
                      className={`w-7 h-7 ${
                        active
                          ? 'fill-[#F5B82E] text-[#F5B82E]'
                          : 'text-[#E6E1F5]'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 font-display font-bold text-[18px] text-[#6D4AE0]">
                {reviewRating}.0 / 5.0
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="review-comment"
              className="block text-[14px] font-bold text-[#1E1B2E]"
            >
              Your review
            </label>
            <textarea
              id="review-comment"
              rows={4}
              value={reviewComment}
              onChange={(e) => {
                setReviewComment(e.target.value);
                if (reviewError) setReviewError('');
              }}
              placeholder="What did you like most about the lessons, hands-on projects, or instructor explanations?"
              className="w-full p-3.5 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[14px] text-[#1E1B2E]"
            />
            {reviewError && (
              <p className="text-[12px] text-[#DC2626] font-semibold">{reviewError}</p>
            )}
          </div>
        </form>
      </Modal>

      {/* MODAL 4: INSTRUCTOR PROFILE MODAL */}
      <Modal
        open={instructorModalOpen}
        onClose={() => setInstructorModalOpen(false)}
        title={instructorInfo.name}
        description={instructorInfo.field}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInstructorModalOpen(false)}>
              Close
            </Button>
            <Link
              to={`/courses?instructor=${encodeURIComponent(instructorInfo.name)}`}
              onClick={() => setInstructorModalOpen(false)}
            >
              <Button variant="primary">
                Browse all {instructorInfo.coursesCount} courses
              </Button>
            </Link>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar src={instructorInfo.avatar} name={instructorInfo.name} size="xl" />
            <div className="space-y-1 text-[14px]">
              <p className="font-bold text-[#1E1B2E] inline-flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-[#F5B82E] text-[#F5B82E]" />
                <span>{instructorInfo.rating.toFixed(1)} average instructor rating</span>
              </p>
              <p className="text-[#5F5B75]">
                {instructorInfo.learnersCount} students enrolled across{' '}
                {instructorInfo.coursesCount} published courses
              </p>
            </div>
          </div>
          <p className="text-[15px] text-[#5F5B75] leading-relaxed">
            {instructorInfo.bio}
          </p>
        </div>
      </Modal>
    </div>
  );
};
