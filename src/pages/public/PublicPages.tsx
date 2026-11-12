import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Sparkles,
  PlayCircle,
  Award,
  CheckCircle2,
  Star,
  Users,
  Clock,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  Code2,
  Palette,
  Briefcase,
  BarChart3,
  Megaphone,
  Globe,
  Camera,
  Search,
  FileCheck2,
  GraduationCap,
  Quote,
} from 'lucide-react';
import {
  Button,
  CourseCard,
  SearchInput,
  SelectInput,
  StatusChip,
  FeaturedStickerTag,
  Breadcrumbs,
  Accordion,
  Avatar,
  EmptyState,
  Skeleton,
  QueryErrorState,
  ProgressBar,
} from '../../components/ui';
import { CatMascot } from '../../components/brand/BrandLogo';
import { useApp } from '../../context/AppContext';
import {
  useCategories,
  useCourses,
  useFeaturedInstructors,
  usePublicStats,
  useTestimonials,
} from '../../api/hooks/useCatalog';
import { formatCompact } from '../../lib/format';
import { handleImageError } from '../../utils/imageFallback';
export { CoursesCatalogPage } from './CoursesCatalogPage';
export { CourseDetailPage } from './CourseDetailPage';
export { VerifyCertificatePage } from '../student/CertificatePages';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Code2: <Code2 className="w-6 h-6" />,
  Palette: <Palette className="w-6 h-6" />,
  Briefcase: <Briefcase className="w-6 h-6" />,
  BarChart3: <BarChart3 className="w-6 h-6" />,
  Megaphone: <Megaphone className="w-6 h-6" />,
  Globe: <Globe className="w-6 h-6" />,
  ShieldCheck: <ShieldCheck className="w-6 h-6" />,
  Camera: <Camera className="w-6 h-6" />,
};

const POPULAR_TOPICS = [
  'React 19',
  'Python',
  'UI/UX Design',
  'Ethical Hacking',
  'TypeScript',
  'Figma',
];

export const HomePage: React.FC = () => {
  const { searchQuery, setSearchQuery } = useApp();
  const navigate = useNavigate();
  const [activeCourseTab, setActiveCourseTab] = useState<'popular' | 'new' | 'free'>('popular');

  const statsQuery = usePublicStats();
  const categoriesQuery = useCategories();
  const featuredCoursesQuery = useCourses({ tab: activeCourseTab, limit: 8 });
  const instructorsQuery = useFeaturedInstructors();
  const testimonialsQuery = useTestimonials();

  const categories = categoriesQuery.data ?? [];
  const displayedCourses = featuredCoursesQuery.data?.items ?? [];
  const heroCourse = displayedCourses[0];
  const popularTopics = statsQuery.data?.popularTopics ?? POPULAR_TOPICS;
  const instructors = instructorsQuery.data ?? [];
  const testimonials = testimonialsQuery.data ?? [];

  const handleTopicClick = (topic: string) => {
    setSearchQuery(topic);
    navigate(`/courses?q=${encodeURIComponent(topic)}`);
  };

  return (
    <div className="space-y-16 lg:space-y-24 pb-12">
      {/* 1. HERO SECTION (Tint background #F3EFFF, single entrance animation) */}
      <section className="bg-[#F3EFFF] border-b border-[#E6E1F5] py-12 sm:py-16 lg:py-20 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center animate-hero-entrance">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex flex-wrap items-center gap-2.5">
              <FeaturedStickerTag label="Featured" />
              <StatusChip
                label="Self-paced online learning platform"
                variant="primary"
                className="bg-white"
              />
            </div>

            <h1 className="text-[36px] sm:text-[40px] lg:text-[46px] font-display font-bold text-[#1E1B2E] leading-[1.14]">
              Learn at your pace. Finish with a certificate.
            </h1>

            <p className="text-[16px] sm:text-[18px] text-[#5F5B75] max-w-xl leading-relaxed">
              Video lessons, progress tracking and exams in one place.
            </p>

            {/* Large Search Bar + Popular Topic Chips */}
            <div className="space-y-3 max-w-xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = searchQuery.trim();
                  navigate(q ? `/courses?q=${encodeURIComponent(q)}` : '/courses');
                }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2 rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-md"
              >
                <div className="relative flex-1 flex items-center">
                  <Search className="w-5 h-5 text-[#6D4AE0] absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for React, Python, UI/UX design, or cybersecurity..."
                    aria-label="Search courses, skills, or topics"
                    className="w-full h-11 pl-11 pr-4 rounded-[10px] text-[16px] text-[#1E1B2E] placeholder:text-[#5F5B75] focus:outline-none"
                  />
                </div>
                <Button type="submit" variant="primary" size="md">
                  Search courses
                </Button>
              </form>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-[#5F5B75]">Popular topics:</span>
                {popularTopics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleTopicClick(topic)}
                    className="px-3 py-1 rounded-full bg-white border border-[#E6E1F5] hover:border-[#6D4AE0] hover:text-[#6D4AE0] text-[12px] font-semibold text-[#1E1B2E] transition-all cursor-pointer shadow-2xs"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary & Secondary Hero Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <Link to="/courses">
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Browse courses
                </Button>
              </Link>
              <Link to="/signup?role=instructor">
                <Button variant="secondary" size="lg" className="bg-white hover:bg-[#E6E1F5]/70">
                  Teach on EduHub
                </Button>
              </Link>
            </div>

            {/* Trust line: 120+ courses, 15k learners, 4.8 average rating */}
            <div className="pt-3 border-t border-[#E6E1F5] flex flex-wrap items-center gap-6 sm:gap-8 text-[14px] text-[#5F5B75]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-white border border-[#E6E1F5] flex items-center justify-center text-[#6D4AE0]">
                  <BookOpen className="w-4 h-4" />
                </span>
                <span>
                  <strong className="font-display font-bold text-[17px] text-[#1E1B2E]">
                    {statsQuery.data ? `${statsQuery.data.totalCoursesCount}+` : '12+'}
                  </strong>{' '}
                  courses
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-white border border-[#E6E1F5] flex items-center justify-center text-[#6D4AE0]">
                  <Users className="w-4 h-4" />
                </span>
                <span>
                  <strong className="font-display font-bold text-[17px] text-[#1E1B2E]">
                    {statsQuery.data ? formatCompact(statsQuery.data.totalLearnersCount) : '15k'}
                  </strong>{' '}
                  learners
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-white border border-[#E6E1F5] flex items-center justify-center text-[#F5B82E]">
                  <Star className="w-4 h-4 fill-[#F5B82E] text-[#F5B82E]" />
                </span>
                <span>
                  <strong className="font-display font-bold text-[17px] text-[#1E1B2E]">
                    {statsQuery.data ? statsQuery.data.averageRating.toFixed(1) : '4.8'}
                  </strong>{' '}
                  average rating
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Overlapping cards on a lavender circle echoing the logo */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[380px] sm:min-h-[420px]">
            <div
              aria-hidden="true"
              className="w-72 h-72 sm:w-88 sm:h-88 rounded-full bg-gradient-to-tr from-[#6D4AE0]/20 via-[#A78BFA]/25 to-white border-2 border-dashed border-[#6D4AE0]/45 shadow-[0_0_0_8px_rgba(255,255,255,0.8)] flex items-center justify-center"
            >
              <div className="w-56 h-56 sm:w-68 sm:h-68 rounded-full bg-[#A78BFA]/20 border border-[#6D4AE0]/20" />
            </div>

            {/* Overlapping Card 1: Video Lesson Card (thumbnail + 72% progress bar) */}
            <div className="absolute top-2 left-0 sm:left-2 w-72 sm:w-80 rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-lg p-3.5 space-y-3 z-10">
              <div className="relative h-36 w-full rounded-[10px] overflow-hidden bg-[#1E1B2E]">
                {heroCourse ? (
                  <img
                    src={heroCourse.thumbnail}
                    alt={`${heroCourse.title} lesson`}
                    onError={handleImageError}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#6D4AE0] to-[#3F2A9E]" />
                )}
                <div className="absolute inset-0 bg-[#1E1B2E]/35 flex items-center justify-center">
                  <Link
                    to={heroCourse ? `/courses/${heroCourse.id}` : '/courses'}
                    className="w-11 h-11 rounded-full bg-white text-[#6D4AE0] flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                    aria-label="Preview video lesson"
                  >
                    <PlayCircle className="w-6 h-6" />
                  </Link>
                </div>
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-[#1E1B2E]/80 text-white text-[11px] font-semibold">
                  24:10 HD
                </span>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#6D4AE0] truncate">
                  {heroCourse?.title || 'Complete React Developer Course'}
                </p>
                <p className="font-display font-bold text-[16px] text-[#1E1B2E] leading-snug">
                  Lesson 3: Custom Hooks & State
                </p>
              </div>
              <ProgressBar value={72} label="Lesson progress" size="sm" color="primary" />
            </div>

            {/* Overlapping Card 2: "Certificate unlocked" card with circular-cropped cat mascot */}
            <Link
              to="/certificates/cert-101"
              className="absolute bottom-2 right-0 sm:right-2 w-72 sm:w-80 rounded-[12px] bg-white border-2 border-[#16A34A]/30 shadow-purple-lg p-4 flex items-center gap-3.5 z-20 hover:-translate-y-1 transition-transform"
            >
              <CatMascot size="sm" mood="success" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span className="text-[12px] font-bold text-[#16A34A]">
                    Certificate unlocked
                  </span>
                </div>
                <p className="font-display font-bold text-[16px] text-[#1E1B2E] truncate mt-0.5">
                  UI/UX Design Masterclass
                </p>
                <p className="text-[12px] text-[#5F5B75]">
                  Issued to Sara Ali • 94% Distinction
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. TOP CATEGORIES: 8 Icon Cards */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
              Top categories
            </h2>
            <p className="text-[16px] text-[#5F5B75]">
              Explore 8 career tracks linking directly to the filtered course catalog.
            </p>
          </div>
          <Link to="/courses">
            <Button variant="ghost" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Browse catalog
            </Button>
          </Link>
        </div>

        {categoriesQuery.isPending ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Skeleton key={idx} variant="card" />
            ))}
          </div>
        ) : categoriesQuery.isError ? (
          <QueryErrorState
            title="Could not load categories"
            error={categoriesQuery.error}
            onRetry={() => void categoriesQuery.refetch()}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                to={`/courses?category=${cat.id}`}
                className="group rounded-[12px] bg-white border border-[#E6E1F5] p-5 shadow-purple-sm hover:shadow-purple-md hover:border-[#A78BFA] hover:-translate-y-0.5 transition-all flex items-start gap-4"
              >
                <div
                  className="w-12 h-12 rounded-[12px] flex items-center justify-center text-white shrink-0 shadow-xs transition-transform group-hover:scale-105"
                  style={{ backgroundColor: cat.accentColor }}
                >
                  {CATEGORY_ICONS[cat.iconName] || <BookOpen className="w-6 h-6" />}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="text-[20px] font-display font-bold text-[#1E1B2E] group-hover:text-[#6D4AE0] transition-colors truncate">
                    {cat.name}
                  </h3>
                  <p className="text-[13px] text-[#5F5B75] line-clamp-2">{cat.description}</p>
                  <p className="text-[12px] font-bold text-[#6D4AE0] pt-1">
                    {cat.courseCount} courses →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3. FEATURED COURSES: Tabs (Popular, New, Free), 8 Course Cards, "View all courses" button */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <FeaturedStickerTag label="Featured" />
            <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
              Featured courses
            </h2>
            <p className="text-[16px] text-[#5F5B75]">
              Hands-on syllabi with real-world code labs, practice exams, and verified certificates.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Course filter tabs"
            className="inline-flex items-center gap-1.5 p-1.5 rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5] self-start md:self-auto"
          >
            {(
              [
                { id: 'popular', label: 'Popular' },
                { id: 'new', label: 'New' },
                { id: 'free', label: 'Free' },
              ] as const
            ).map((tab) => {
              const active = activeCourseTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setActiveCourseTab(tab.id)}
                  className={`h-9 px-4 rounded-[10px] text-[14px] font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-[#6D4AE0] shadow-purple-sm'
                      : 'text-[#5F5B75] hover:text-[#1E1B2E] hover:bg-white/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {featuredCoursesQuery.isPending ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Skeleton key={idx} variant="card" />
            ))}
          </div>
        ) : featuredCoursesQuery.isError ? (
          <QueryErrorState
            title="Could not load featured courses"
            error={featuredCoursesQuery.error}
            onRetry={() => void featuredCoursesQuery.refetch()}
          />
        ) : displayedCourses.length === 0 ? (
          <EmptyState
            title="No courses in this tab yet"
            description="Browse the full catalog to explore all available courses across EduHub."
            actionLabel="Browse courses"
            onAction={() => navigate('/courses')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedCourses.map((course) => (
              <CourseCard key={`${activeCourseTab}-${course.id}`} course={course} />
            ))}
          </div>
        )}

        <div className="flex justify-center pt-2">
          <Link to="/courses">
            <Button
              variant="secondary"
              size="lg"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              View all courses
            </Button>
          </Link>
        </div>
      </section>

      {/* 4. HOW IT WORKS: 4 Steps (Enroll, Watch lessons, Pass the exam, Get your certificate) */}
      <section className="bg-[#F3EFFF]/70 border-y border-[#E6E1F5] py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <StatusChip label="Simple 4-step journey" variant="primary" className="bg-white" />
            <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
              How it works
            </h2>
            <p className="text-[16px] text-[#5F5B75]">
              Go from your first video lesson to a verified certificate in four clear steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Enroll',
                description:
                  'Pick a beginner, intermediate, or advanced course that matches your career goals.',
                icon: <BookOpen className="w-6 h-6 text-[#6D4AE0]" />,
              },
              {
                step: '02',
                title: 'Watch lessons',
                description:
                  'Follow bite-sized HD video lessons, download code labs, and track your completion percentage.',
                icon: <PlayCircle className="w-6 h-6 text-[#F59E3B]" />,
              },
              {
                step: '03',
                title: 'Pass the exam',
                description:
                  'Complete the timed multiple-choice certification exam with instant automated grading.',
                icon: <FileCheck2 className="w-6 h-6 text-[#2563EB]" />,
              },
              {
                step: '04',
                title: 'Get your certificate',
                description:
                  'Download and share your verified EduHub certificate with a unique credential ID.',
                icon: <GraduationCap className="w-6 h-6 text-[#16A34A]" />,
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="font-display font-bold text-[28px] text-[#6D4AE0]/25">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                    {item.title}
                  </h3>
                  <p className="text-[14px] text-[#5F5B75] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. TOP INSTRUCTORS: 4 Cards (avatar, name, field, learners, rating) */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
              Top instructors
            </h2>
            <p className="text-[16px] text-[#5F5B75]">
              Learn directly from senior engineers, data scientists, product designers, and security leads.
            </p>
          </div>
          <Link to="/signup?role=instructor">
            <Button variant="ghost" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Teach on EduHub
            </Button>
          </Link>
        </div>

        {instructorsQuery.isPending ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} variant="card" />
            ))}
          </div>
        ) : instructorsQuery.isError ? (
          <QueryErrorState
            title="Could not load instructors"
            error={instructorsQuery.error}
            onRetry={() => void instructorsQuery.refetch()}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {instructors.map((inst) => (
              <Link
                key={inst.id}
                to={`/courses?instructor=${encodeURIComponent(inst.name)}`}
                className="group rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm hover:shadow-purple-md hover:border-[#A78BFA] hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-4"
              >
                <Avatar src={inst.avatar} name={inst.name} size="xl" status="online" />
                <div className="space-y-1">
                  <h3 className="text-[20px] font-display font-bold text-[#1E1B2E] group-hover:text-[#6D4AE0] transition-colors">
                    {inst.name}
                  </h3>
                  <p className="text-[13px] font-semibold text-[#6D4AE0]">{inst.field}</p>
                  <p className="text-[13px] text-[#5F5B75] line-clamp-2 pt-1">{inst.bio}</p>
                </div>
                <div className="w-full pt-3 border-t border-[#E6E1F5] flex items-center justify-between text-[13px]">
                  <span className="inline-flex items-center gap-1 text-[#5F5B75] font-medium">
                    <Users className="w-4 h-4 text-[#6D4AE0]" />
                    <strong className="text-[#1E1B2E]">{inst.learnersCount}</strong> learners
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#1E1B2E]">
                    <Star className="w-4 h-4 fill-[#F5B82E] text-[#F5B82E]" />
                    {inst.rating.toFixed(1)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 6. STUDENT STORIES: 3 Testimonial Cards */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <StatusChip label="Verified graduate stories" variant="gold" />
          <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
            Student stories
          </h2>
          <p className="text-[16px] text-[#5F5B75]">
            Hear from graduates who completed courses, passed their exams, and earned verified certificates.
          </p>
        </div>

        {testimonialsQuery.isPending ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} variant="card" />
            ))}
          </div>
        ) : testimonialsQuery.isError ? (
          <QueryErrorState
            title="Could not load student stories"
            error={testimonialsQuery.error}
            onRetry={() => void testimonialsQuery.refetch()}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((story) => (
              <div
                key={story.id}
                className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: story.rating }).map((_, idx) => (
                        <Star
                          key={idx}
                          className="w-4 h-4 fill-[#F5B82E] text-[#F5B82E]"
                        />
                      ))}
                    </div>
                    <Quote className="w-6 h-6 text-[#A78BFA]/50" />
                  </div>
                  <p className="text-[15px] text-[#1E1B2E] leading-relaxed">
                    “{story.quote}”
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E6E1F5] flex items-center gap-3">
                  <Avatar src={story.avatar} name={story.name} size="md" />
                  <div className="min-w-0">
                    <p className="font-display font-bold text-[16px] text-[#1E1B2E] truncate">
                      {story.name}
                    </p>
                    <p className="text-[12px] text-[#5F5B75] truncate">{story.role}</p>
                    <p className="text-[12px] font-semibold text-[#6D4AE0] truncate mt-0.5">
                      Graduate: {story.courseTitle}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7. CALL-TO-ACTION BANNER (Purple gradient: "Start learning today" + "Create free account") */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="rounded-[12px] bg-gradient-to-r from-[#6D4AE0] via-[#5A3AC7] to-[#3F2A9E] p-8 sm:p-12 text-white shadow-purple-lg flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center lg:text-left max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[12px] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#F5B82E]" />
              <span>Unlimited access to free starter lessons</span>
            </span>
            <h2 className="text-[32px] sm:text-[38px] font-display font-bold text-white leading-tight">
              Start learning today
            </h2>
            <p className="text-[16px] text-white/85 leading-relaxed">
              Join 15,000+ learners building practical skills with HD video lessons, real-time progress tracking, and verified certificates.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 shrink-0">
            <Link to="/signup">
              <button
                type="button"
                className="h-13 px-7 rounded-[10px] bg-white text-[#3F2A9E] hover:bg-[#F3EFFF] font-bold text-[16px] inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>Create free account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/courses">
              <button
                type="button"
                className="h-13 px-6 rounded-[10px] bg-white/10 hover:bg-white/20 text-white border border-white/25 font-semibold text-[16px] transition-all cursor-pointer"
              >
                Browse courses
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

