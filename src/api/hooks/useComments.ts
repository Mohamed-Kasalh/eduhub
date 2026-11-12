import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CommentReportReasonDto,
  PaginatedCommentsResponseDto,
} from '../dto-types-bridge';
import { getErrorMessage } from '../errors';
import {
  mapCommentDtoToPlayer,
  type MappedLessonComment,
} from '../mappers';
import { queryKeys } from '../queryKeys';
import { commentsService, type LessonCommentsQueryParams } from '../services';
import { emitToast } from '../../lib/toastBus';

interface LessonCommentsCacheValue {
  items: MappedLessonComment[];
  meta: PaginatedCommentsResponseDto['meta'];
}

/** Lists paginated discussion comments for a lesson without UI flicker. */
export function useLessonComments(
  lessonId: string | undefined,
  params?: LessonCommentsQueryParams,
  enabled = true
) {
  const normalized = params ?? {};
  return useQuery({
    queryKey: queryKeys.comments.lesson(lessonId ?? '', normalized),
    queryFn: async (): Promise<LessonCommentsCacheValue> => {
      if (!lessonId) {
        throw new Error('Lesson ID is required.');
      }
      const response = await commentsService.getLessonComments(lessonId, normalized);
      return {
        items: response.data.map(mapCommentDtoToPlayer),
        meta: response.meta,
      };
    },
    placeholderData: keepPreviousData,
    enabled: enabled && Boolean(lessonId),
  });
}

/** Posts a new lesson comment (starts in `pending` supervisor moderation state). */
export function useCreateCommentMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      commentsService.createComment(lessonId, { content: content.trim() }),
    onSuccess: () => {
      emitToast({
        title: 'Comment submitted for review',
        message:
          'Your comment is visible to you with a "Pending review" badge until approved by a supervisor.',
        variant: 'info',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.lessonPrefix(lessonId) });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not post comment',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}

/** Adds a nested reply under an existing lesson comment. */
export function useReplyCommentMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      commentsService.replyToComment(commentId, { content: content.trim() }),
    onSuccess: () => {
      emitToast({
        title: 'Reply posted',
        message: 'Your reply has been added to the thread.',
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.lessonPrefix(lessonId) });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not post reply',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}

/** Edits an existing comment owned by the authenticated user. */
export function useUpdateCommentMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      commentsService.updateComment(commentId, { content: content.trim() }),
    onSuccess: () => {
      emitToast({
        title: 'Comment updated',
        message: 'Your changes have been saved.',
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.lessonPrefix(lessonId) });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not update comment',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}

/** Permanently deletes an owned comment from the lesson discussion. */
export function useDeleteCommentMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentsService.deleteComment(commentId),
    onSuccess: () => {
      emitToast({
        title: 'Comment deleted',
        message: 'Your comment was removed from this lesson.',
        variant: 'info',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.lessonPrefix(lessonId) });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not delete comment',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}

/** Optimistically toggles like on a lesson comment with rollback on error. */
export function useToggleLikeCommentMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, currentlyLiked }: { commentId: string; currentlyLiked: boolean }) =>
      currentlyLiked
        ? commentsService.unlikeComment(commentId)
        : commentsService.likeComment(commentId),
    onMutate: async ({ commentId, currentlyLiked }) => {
      const prefix = queryKeys.comments.lessonPrefix(lessonId);
      await queryClient.cancelQueries({ queryKey: prefix });
      const snapshots = queryClient.getQueriesData<LessonCommentsCacheValue>({
        queryKey: prefix,
      });

      for (const [key, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData<LessonCommentsCacheValue>(key, {
          ...data,
          items: data.items.map((item) =>
            item.id === commentId
              ? {
                  ...item,
                  likedByMe: !currentlyLiked,
                  likesCount: Math.max(0, item.likesCount + (currentlyLiked ? -1 : 1)),
                }
              : item
          ),
        });
      }
      return { snapshots };
    },
    onError: (error, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, prev] of context.snapshots) {
          queryClient.setQueryData(key, prev);
        }
      }
      emitToast({
        title: 'Could not update like',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.lessonPrefix(lessonId) });
    },
  });
}

/** Optimistically toggles like on a nested reply with rollback on error. */
export function useToggleLikeReplyMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      replyId,
      currentlyLiked,
    }: {
      commentId: string;
      replyId: string;
      currentlyLiked: boolean;
    }) =>
      currentlyLiked
        ? commentsService.unlikeReply(replyId)
        : commentsService.likeReply(replyId),
    onMutate: async ({ commentId, replyId, currentlyLiked }) => {
      const prefix = queryKeys.comments.lessonPrefix(lessonId);
      await queryClient.cancelQueries({ queryKey: prefix });
      const snapshots = queryClient.getQueriesData<LessonCommentsCacheValue>({
        queryKey: prefix,
      });

      for (const [key, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData<LessonCommentsCacheValue>(key, {
          ...data,
          items: data.items.map((item) =>
            item.id === commentId
              ? {
                  ...item,
                  replies: item.replies.map((rep) =>
                    rep.id === replyId
                      ? {
                          ...rep,
                          likedByMe: !currentlyLiked,
                          likesCount: Math.max(0, rep.likesCount + (currentlyLiked ? -1 : 1)),
                        }
                      : rep
                  ),
                }
              : item
          ),
        });
      }
      return { snapshots };
    },
    onError: (error, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, prev] of context.snapshots) {
          queryClient.setQueryData(key, prev);
        }
      }
      emitToast({
        title: 'Could not update like',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.lessonPrefix(lessonId) });
    },
  });
}

/** Flags a lesson comment to the supervisor moderation queue. */
export function useReportCommentMutation() {
  return useMutation({
    mutationFn: ({
      commentId,
      reason,
      reasonLabel,
    }: {
      commentId: string;
      reason: CommentReportReasonDto;
      reasonLabel: string;
    }) => commentsService.reportComment(commentId, { reason, details: reasonLabel }),
    onSuccess: (_res, variables) => {
      emitToast({
        title: 'Comment reported to supervisors',
        message: `Flagged for: ${variables.reasonLabel}`,
        variant: 'warning',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not report comment',
        message: getErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    },
  });
}
