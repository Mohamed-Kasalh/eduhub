import React from 'react';
import { Link } from 'react-router';
import {
  Star,
  Clock,
  BookOpen,
  AlertCircle,
  Heart,
  CheckCircle2,
  Users,
} from 'lucide-react';
import type { Course } from '../../data/mockData';
import { useToggleWishlistMutation, useWishlistIds } from '../../api/hooks/useWishlist';
import { Button, ComponentVisualState } from './Button';
import { FeaturedStickerTag, StatusChip } from './Badges';
import { Avatar, ProgressBar, Skeleton } from './DataDisplay';
import { handleImageError } from '../../utils/imageFallback';

export interface CourseCardProps {
  course: Course;
  showProgress?: boolean;
  showHoverPreview?: boolean;
  layout?: 'grid' | 'list';
  forceState?: ComponentVisualState;
  onAction?: (course: Course) => void;
  actionLabel?: string;
  className?: string;
}

const DEFAULT_PREVIEW_BULLETS = [
  'Build production-ready projects with guided step-by-step video lessons',
  'Validate your knowledge with interactive quizzes and a proctored final exam',
  'Earn a verified EduHub completion certificate with a public credential ID',
];

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  showProgress = false,
  showHoverPreview = false,
  layout = 'grid',
  forceState,
  onAction,
  actionLabel,
  className = '',
}) => {
  const wishlistIds = useWishlistIds();
  const toggleWishlistMutation = useToggleWishlistMutation();
  const isWishlisted = wishlistIds.includes(course.id);
  const toggleWishlist = (courseId: string) => {
    if (toggleWishlistMutation.isPending) return;
    toggleWishlistMutation.mutate({ courseId, currentlyWishlisted: isWishlisted });
  };
  const previewBullets =
    course.learningPoints && course.learningPoints.length > 0
      ? course.learningPoints
      : DEFAULT_PREVIEW_BULLETS;

  if (forceState === 'loading') {
    return <Skeleton variant="card" className={className} />;
  }

  const isDisabled = forceState === 'disabled';
  const isError = forceState === 'error';
  const isHovered = forceState === 'hover';
  const isFocused = forceState === 'focus';
  const isFreeCourse = course.price === 0 || course.isFree;

  const levelVariant =
    course.level === 'Beginner'
      ? 'success'
      : course.level === 'Intermediate'
      ? 'orange'
      : 'primary';

  if (layout === 'list') {
    return (
      <article
        className={`group rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm hover:border-[#A78BFA] hover:shadow-purple-md transition-all duration-200 flex flex-col md:flex-row overflow-hidden ${
          isDisabled ? 'opacity-55 pointer-events-none' : ''
        } ${className}`}
      >
        <div className="relative md:w-72 lg:w-80 h-48 md:h-auto shrink-0 overflow-hidden bg-[#F3EFFF]">
          <Link to={`/courses/${course.id}`} className="block w-full h-full">
            <img
              src={course.thumbnail}
              alt={course.title}
              onError={handleImageError}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </Link>
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {course.featured && <FeaturedStickerTag />}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist(course.id);
            }}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`absolute top-2.5 right-2.5 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm border ${
              isWishlisted
                ? 'bg-[#FEF2F2] border-[#DC2626]/30 text-[#DC2626]'
                : 'bg-white/95 border-[#E6E1F5] text-[#5F5B75] hover:text-[#DC2626]'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#DC2626]' : ''}`} />
          </button>
        </div>

        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <span className="px-2.5 py-0.5 rounded-full bg-[#F3EFFF] text-[#6D4AE0] font-bold">
                {course.categoryName}
              </span>
              <StatusChip label={course.level} variant={levelVariant} dot={false} />
              <span className="inline-flex items-center gap-1 text-[#5F5B75] font-medium">
                <Clock className="w-3.5 h-3.5 text-[#6D4AE0]" />
                {course.duration}
              </span>
              <span className="inline-flex items-center gap-1 text-[#5F5B75] font-medium">
                <BookOpen className="w-3.5 h-3.5 text-[#6D4AE0]" />
                {course.lessonsCount} lessons
              </span>
            </div>

            <Link
              to={`/courses/${course.id}`}
              className="block font-display font-bold text-[22px] text-[#1E1B2E] group-hover:text-[#6D4AE0] transition-colors leading-snug"
            >
              {course.title}
            </Link>

            <p className="text-[14px] text-[#5F5B75] line-clamp-2 leading-relaxed">
              {course.subtitle}
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {previewBullets.slice(0, 2).map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-[12px] text-[#5F5B75]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-3 border-t border-[#E6E1F5] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Avatar
                  src={course.instructorAvatar}
                  name={course.instructorName}
                  size="sm"
                />
                <span className="text-[14px] font-semibold text-[#1E1B2E]">
                  {course.instructorName}
                </span>
              </div>
              <div className="inline-flex items-center gap-1 text-[14px]">
                <Star className="w-4 h-4 fill-[#F5B82E] text-[#F5B82E]" />
                <span className="font-bold text-[#1E1B2E]">{course.rating.toFixed(1)}</span>
                <span className="text-[#5F5B75]">
                  ({course.reviewCount.toLocaleString()})
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[13px] text-[#5F5B75]">
                <Users className="w-3.5 h-3.5 text-[#6D4AE0]" />
                {course.studentsCount.toLocaleString()} learners
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                {isFreeCourse ? (
                  <span className="px-3 py-1 rounded-full bg-[#16A34A]/12 text-[#16A34A] font-display font-bold text-[18px]">
                    Free
                  </span>
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display font-bold text-[24px] text-[#1E1B2E]">
                      ${course.price.toFixed(2)}
                    </span>
                    {course.originalPrice && (
                      <span className="text-[13px] text-[#5F5B75] line-through">
                        ${course.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Link to={`/courses/${course.id}`}>
                <Button variant="primary" size="md">
                  {actionLabel || 'View course'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group relative rounded-[12px] bg-white border transition-all duration-200 flex flex-col ${
        isError
          ? 'border-[#DC2626] ring-2 ring-[#DC2626]/20'
          : isFocused
          ? 'border-[#6D4AE0] ring-3 ring-[#A78BFA]/50 shadow-purple-md'
          : isHovered
          ? 'border-[#A78BFA] shadow-purple-md -translate-y-1'
          : 'border-[#E6E1F5] shadow-purple-sm hover:border-[#A78BFA] hover:shadow-purple-md hover:-translate-y-1'
      } ${isDisabled ? 'opacity-55 pointer-events-none grayscale-[30%]' : ''} ${className}`}
    >
      {/* Thumbnail */}
      <div className="relative h-44 w-full overflow-hidden rounded-t-[12px] bg-[#F3EFFF]">
        <Link to={`/courses/${course.id}`} className="block w-full h-full">
          <img
            src={course.thumbnail}
            alt={course.title}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-transform duration-300 ${
              isHovered ? 'scale-105' : 'group-hover:scale-105'
            }`}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B2E]/55 via-transparent to-transparent" />
        </Link>

        {/* Top badges: Featured sticker tag (only place alongside achievement badges) & Level */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5">
            {course.featured && <FeaturedStickerTag />}
            <StatusChip
              label={course.level}
              variant={levelVariant}
              dot={false}
              className="bg-white/95 backdrop-blur-xs"
            />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(course.id);
            }}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`pointer-events-auto w-11 h-11 -mr-1 -mt-1 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs border ${
              isWishlisted
                ? 'bg-[#FEF2F2] border-[#DC2626]/30 text-[#DC2626]'
                : 'bg-white/95 border-[#E6E1F5] text-[#5F5B75] hover:text-[#DC2626]'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#DC2626]' : ''}`} />
          </button>
        </div>

        {/* Bottom meta inside thumbnail */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[12px] font-medium pointer-events-none">
          <span className="inline-flex items-center gap-1 bg-[#1E1B2E]/70 backdrop-blur-xs px-2.5 py-0.5 rounded-full">
            <Clock className="w-3.5 h-3.5 text-[#F5B82E]" />
            {course.duration}
          </span>
          <span className="inline-flex items-center gap-1 bg-[#1E1B2E]/70 backdrop-blur-xs px-2.5 py-0.5 rounded-full">
            <BookOpen className="w-3.5 h-3.5 text-[#A78BFA]" />
            {course.lessonsCount} lessons
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-[12px] text-[#6D4AE0] font-semibold">
            <span>{course.categoryName}</span>
            <div className="inline-flex items-center gap-1 text-[#1E1B2E]">
              <Star className="w-4 h-4 fill-[#F5B82E] text-[#F5B82E]" />
              <span className="font-bold">{course.rating.toFixed(1)}</span>
              <span className="text-[#5F5B75] font-normal">({course.reviewCount.toLocaleString()})</span>
            </div>
          </div>

          <Link
            to={`/courses/${course.id}`}
            className="block font-display font-bold text-[19px] leading-snug text-[#1E1B2E] group-hover:text-[#6D4AE0] transition-colors line-clamp-2"
          >
            {course.title}
          </Link>

          <div className="flex items-center gap-2 pt-1">
            <Avatar src={course.instructorAvatar} name={course.instructorName} size="sm" />
            <div className="text-[14px] leading-tight">
              <p className="font-semibold text-[#1E1B2E]">{course.instructorName}</p>
              <p className="text-[12px] text-[#5F5B75]">
                {course.studentsCount.toLocaleString()} learners
              </p>
            </div>
          </div>
        </div>

        {isError ? (
          <div className="rounded-[10px] bg-[#FEF2F2] border border-[#DC2626]/30 p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[12px] text-[#DC2626] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Could not load enrollment status.</span>
            </div>
            <Button size="sm" variant="danger" onClick={() => onAction?.(course)}>
              Retry load
            </Button>
          </div>
        ) : showProgress && typeof course.progress === 'number' ? (
          <div className="pt-2 border-t border-[#E6E1F5] space-y-2.5">
            <ProgressBar
              value={course.progress}
              label={course.progress === 100 ? 'Completed' : 'Course progress'}
              color={course.progress === 100 ? 'success' : 'primary'}
              size="sm"
            />
            <div className="flex items-center gap-2">
              <Link to={`/learn/${course.id}/lesson-101`} className="flex-1">
                <Button size="sm" variant="primary" fullWidth>
                  {actionLabel || (course.progress === 100 ? 'Review lessons' : 'Continue learning')}
                </Button>
              </Link>
              <Link to={`/student/progress/${course.id}`}>
                <Button size="sm" variant="secondary">
                  Details
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-[#E6E1F5] flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              {isFreeCourse ? (
                <span className="px-2.5 py-0.5 rounded-full bg-[#16A34A]/12 text-[#16A34A] font-display font-bold text-[16px]">
                  Free
                </span>
              ) : (
                <span className="font-display font-bold text-[22px] text-[#1E1B2E]">
                  ${course.price.toFixed(2)}
                </span>
              )}
              {course.originalPrice && (
                <span className="text-[14px] text-[#5F5B75] line-through">
                  ${course.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            {onAction ? (
              <Button size="sm" variant="primary" onClick={() => onAction(course)}>
                {actionLabel || 'View course'}
              </Button>
            ) : (
              <Link to={`/courses/${course.id}`}>
                <Button size="sm" variant="primary">
                  {actionLabel || 'View course'}
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Desktop Quick-Preview Hover Popover (3 learning bullets + Add to wishlist) */}
      {showHoverPreview && (
        <div className="hidden lg:block opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 absolute left-2.5 right-2.5 bottom-2.5 z-30 rounded-[12px] bg-white/98 backdrop-blur-xs border-2 border-[#6D4AE0] shadow-purple-lg p-4 space-y-3">
          <div>
            <span className="text-[11px] font-bold text-[#6D4AE0]">
              Quick preview • {course.level} • {course.duration}
            </span>
            <h4 className="font-display font-bold text-[16px] text-[#1E1B2E] leading-snug mt-0.5">
              {course.title}
            </h4>
          </div>
          <ul className="space-y-1.5">
            {previewBullets.slice(0, 3).map((bullet, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-[12px] text-[#5F5B75] leading-snug"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-[#E6E1F5] flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggleWishlist(course.id);
              }}
              className={`flex-1 min-h-11 px-3 rounded-[10px] text-[13px] font-bold inline-flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                isWishlisted
                  ? 'bg-[#FEF2F2] border-[#DC2626]/30 text-[#DC2626]'
                  : 'bg-[#F3EFFF] border-[#E6E1F5] text-[#6D4AE0] hover:bg-[#E6E1F5]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-[#DC2626]' : ''}`} />
              <span>{isWishlisted ? 'In wishlist' : 'Add to wishlist'}</span>
            </button>
            <Link to={`/courses/${course.id}`}>
              <Button size="sm" variant="primary">
                Details
              </Button>
            </Link>
          </div>
        </div>
      )}
    </article>
  );
};
