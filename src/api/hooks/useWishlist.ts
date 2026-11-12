import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WishlistListResponseDto } from '../dto';
import { getErrorMessage } from '../errors';
import { mapCourseDtoToCourse } from '../mappers';
import { queryKeys } from '../queryKeys';
import { learningService } from '../services';
import { useAuth } from '../../context/AuthContext';
import { emitToast } from '../../lib/toastBus';

/** Fetches the authenticated user's wishlist courses and ID set. */
export function useMyWishlist() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.me.wishlist,
    queryFn: async () => {
      const response = await learningService.getWishlist();
      const items = response.data.map((entry) => ({
        courseId: entry.courseId,
        addedAt: entry.addedAt,
        course: mapCourseDtoToCourse(entry.course),
      }));
      return {
        raw: response,
        items,
        ids: items.map((i) => i.courseId),
      };
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

/** Convenience hook returning wishlisted course IDs for fast lookup in cards/details. */
export function useWishlistIds(): string[] {
  const query = useMyWishlist();
  return query.data?.ids ?? [];
}

/** Toggles a course in/out of the authenticated user's wishlist with optimistic UI + rollback. */
export function useToggleWishlistMutation() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  return useMutation({
    mutationFn: async ({ courseId, currentlyWishlisted }: { courseId: string; currentlyWishlisted: boolean }) => {
      if (!isAuthenticated) {
        throw new Error('Sign in to save courses to your wishlist.');
      }
      return currentlyWishlisted
        ? learningService.removeFromWishlist(courseId)
        : learningService.addToWishlist(courseId);
    },
    onMutate: async ({ courseId, currentlyWishlisted }) => {
      if (!isAuthenticated) return undefined;
      await queryClient.cancelQueries({ queryKey: queryKeys.me.wishlist });
      const previous = queryClient.getQueryData<{
        raw: WishlistListResponseDto;
        items: Array<{ courseId: string; addedAt: string; course: ReturnType<typeof mapCourseDtoToCourse> }>;
        ids: string[];
      }>(queryKeys.me.wishlist);

      if (previous) {
        const nextIds = currentlyWishlisted
          ? previous.ids.filter((id) => id !== courseId)
          : [...previous.ids, courseId];
        queryClient.setQueryData(queryKeys.me.wishlist, {
          ...previous,
          ids: nextIds,
          items: currentlyWishlisted
            ? previous.items.filter((item) => item.courseId !== courseId)
            : previous.items,
        });
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.me.wishlist, context.previous);
      }
      emitToast({
        title: isAuthenticated ? 'Could not update wishlist' : 'Sign in required',
        message: getErrorMessage(error, 'Unable to update wishlist right now.'),
        variant: isAuthenticated ? 'danger' : 'info',
      });
    },
    onSuccess: (result) => {
      emitToast({
        title: result.wishlisted ? 'Added to wishlist' : 'Removed from wishlist',
        message: result.wishlisted
          ? 'Saved so you can jump back in anytime.'
          : 'Course removed from your saved list.',
        variant: 'info',
      });
    },
    onSettled: (_data, _error, vars) => {
      if (isAuthenticated) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.me.wishlist });
        void queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(vars.courseId) });
      }
    },
  });
}
