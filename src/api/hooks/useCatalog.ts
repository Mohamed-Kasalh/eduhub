import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CourseQueryParamsDto,
  CreateCourseReviewRequestDto,
  PaginatedCourseReviewsResponseDto,
} from '../dto';
import { getErrorMessage } from '../errors';
import {
  mapCategoryDtoToCategory,
  mapCourseDetailDtoToDetail,
  mapCourseDtoToCourse,
  mapCourseReviewDtoToReview,
  mapFeaturedInstructorDtoToHighlight,
  mapTestimonialDtoToTestimonial,
} from '../mappers';
import { queryKeys } from '../queryKeys';
import { catalogService } from '../services';
import { emitToast } from '../../lib/toastBus';

/** Fetches global platform config (upload limits, feature flags, currency). */
export function usePublicConfig() {
  return useQuery({
    queryKey: queryKeys.publicConfig.config,
    queryFn: () => catalogService.getPublicConfig(),
    staleTime: 5 * 60_000,
  });
}

/** Fetches landing-page aggregate platform statistics and popular topics. */
export function usePublicStats() {
  return useQuery({
    queryKey: queryKeys.publicConfig.stats,
    queryFn: () => catalogService.getPublicStats(),
    staleTime: 60_000,
  });
}

/** Lists active categories and nested subcategories. */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.publicConfig.categories,
    queryFn: async () => {
      const response = await catalogService.getCategories();
      return response.data.map(mapCategoryDtoToCategory);
    },
    staleTime: 60_000,
  });
}

/** Searches, filters, sorts, and paginates catalog courses without blank flicker. */
export function useCourses(params?: CourseQueryParamsDto, enabled = true) {
  const normalizedParams = params ?? {};
  return useQuery({
    queryKey: queryKeys.courses.list(normalizedParams),
    queryFn: async () => {
      const response = await catalogService.getCourses(normalizedParams);
      return {
        items: response.data.map((dto) => mapCourseDtoToCourse(dto)),
        rawItems: response.data,
        meta: response.meta,
      };
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Retrieves full course detail, sections, rating breakdown, and viewer enrollment context. */
export function useCourseDetail(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.detail(courseId ?? ''),
    queryFn: async () => {
      if (!courseId) {
        throw new Error('Course ID is required.');
      }
      const dto = await catalogService.getCourseDetail(courseId);
      return mapCourseDetailDtoToDetail(dto);
    },
    enabled: Boolean(courseId),
  });
}

/** Fetches related courses for a course detail page. */
export function useRelatedCourses(courseId: string | undefined, limit = 4) {
  return useQuery({
    queryKey: queryKeys.courses.related(courseId ?? ''),
    queryFn: async () => {
      if (!courseId) return [];
      const response = await catalogService.getRelatedCourses(courseId, limit);
      return response.data.map((dto) => mapCourseDtoToCourse(dto));
    },
    enabled: Boolean(courseId),
  });
}

/** Lists paginated reviews for a course with `keepPreviousData`. */
export function useCourseReviews(
  courseId: string | undefined,
  params?: { page?: number; limit?: number }
) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  return useQuery({
    queryKey: queryKeys.courses.reviews(courseId ?? '', { page, limit }),
    queryFn: async () => {
      if (!courseId) {
        throw new Error('Course ID is required.');
      }
      const response = await catalogService.getCourseReviews(courseId, { page, limit });
      return {
        items: response.data.map(mapCourseReviewDtoToReview),
        rawResponse: response,
        meta: response.meta,
      };
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(courseId),
  });
}

/** Submits a new student review for an enrolled course. */
export function useCreateCourseReviewMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCourseReviewRequestDto) =>
      catalogService.createCourseReview(courseId, payload),
    onSuccess: () => {
      emitToast({
        title: 'Thank you for your review',
        message: 'Your rating and comment are now visible to prospective learners.',
        variant: 'success',
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.courses.reviewsPrefix(courseId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.courses.detail(courseId),
      });
      void queryClient.invalidateQueries({
        queryKey: ['courses', 'list'],
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not publish review',
        message: getErrorMessage(error, 'Unable to submit your review.'),
        variant: 'danger',
      });
    },
  });
}

/** Toggles helpful vote on a course review with safe rollback on error. */
export function useToggleReviewHelpfulMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, currentlyHelpful }: { reviewId: string; currentlyHelpful: boolean }) =>
      currentlyHelpful
        ? catalogService.unmarkReviewHelpful(reviewId)
        : catalogService.markReviewHelpful(reviewId),
    onMutate: async ({ reviewId, currentlyHelpful }) => {
      const prefixKey = queryKeys.courses.reviewsPrefix(courseId);
      await queryClient.cancelQueries({ queryKey: prefixKey });

      const snapshots = queryClient.getQueriesData<{
        items: ReturnType<typeof mapCourseReviewDtoToReview>[];
        rawResponse: PaginatedCourseReviewsResponseDto;
        meta: PaginatedCourseReviewsResponseDto['meta'];
      }>({ queryKey: prefixKey });

      for (const [key, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData(key, {
          ...data,
          items: data.items.map((rev) =>
            rev.id === reviewId
              ? {
                  ...rev,
                  markedHelpfulByMe: !currentlyHelpful,
                  helpfulCount: Math.max(
                    0,
                    rev.helpfulCount + (currentlyHelpful ? -1 : 1)
                  ),
                }
              : rev
          ),
        });
      }

      return { snapshots };
    },
    onError: (error, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, previous] of context.snapshots) {
          queryClient.setQueryData(key, previous);
        }
      }
      emitToast({
        title: 'Action failed',
        message: getErrorMessage(error, 'Sign in or try again to vote on reviews.'),
        variant: 'danger',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.courses.reviewsPrefix(courseId),
      });
    },
  });
}

/** Lists featured instructors for the home showcase. */
export function useFeaturedInstructors() {
  return useQuery({
    queryKey: queryKeys.publicConfig.instructors(true),
    queryFn: async () => {
      const response = await catalogService.getInstructors({ featured: true });
      return response.data.map(mapFeaturedInstructorDtoToHighlight);
    },
    staleTime: 60_000,
  });
}

/** Lists verified graduate testimonials for the home page. */
export function useTestimonials() {
  return useQuery({
    queryKey: queryKeys.publicConfig.testimonials,
    queryFn: async () => {
      const response = await catalogService.getTestimonials();
      return response.data.map(mapTestimonialDtoToTestimonial);
    },
    staleTime: 60_000,
  });
}

/** Fetches autocomplete search suggestions matching a query string. */
export function useSearchSuggestions(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.publicConfig.searchSuggestions(trimmed),
    queryFn: async () => {
      const dto = await catalogService.getSearchSuggestions(trimmed);
      return {
        categories: dto.categories.map(mapCategoryDtoToCategory),
        courses: dto.courses.map((c) => mapCourseDtoToCourse(c)),
      };
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/** Subscribes an email address to the EduHub weekly newsletter. */
export function useNewsletterSubscribeMutation() {
  return useMutation({
    mutationFn: (email: string) => catalogService.subscribeNewsletter({ email }),
    onSuccess: () => {
      emitToast({
        title: 'Subscribed to EduHub newsletter',
        message: 'We will send weekly course picks and study guides to your inbox.',
        variant: 'success',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Subscription failed',
        message: getErrorMessage(error, 'Unable to subscribe this email address right now.'),
        variant: 'danger',
      });
    },
  });
}
