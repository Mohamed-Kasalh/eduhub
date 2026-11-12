import {
  ActionResultSchema,
  CommentReplySchema,
  CommentSchema,
  LikeToggleResponseSchema,
  PaginatedCommentsResponseSchema,
  type ActionResultDto,
  type CommentDto,
  type CommentReplyDto,
  type CreateCommentReplyRequestDto,
  type CreateCommentRequestDto,
  type LikeToggleResponseDto,
  type PaginatedCommentsResponseDto,
  type ReportCommentRequestDto,
  type UpdateCommentRequestDto,
} from '../dto';
import { http } from '../http';

export type LessonCommentsQueryParams = {
  sort?: 'newest' | 'top';
  page?: number;
  limit?: number;
};

/** Lesson discussion comments, nested replies, likes, and abuse reporting endpoints. */
export const commentsService = {
  /** Lists approved comments (plus the current user's pending comments) for a lesson. */
  async getLessonComments(
    lessonId: string,
    params?: LessonCommentsQueryParams
  ): Promise<PaginatedCommentsResponseDto> {
    return http.get(
      `/lessons/${encodeURIComponent(lessonId)}/comments`,
      PaginatedCommentsResponseSchema,
      { query: params ? { ...params } : undefined }
    );
  },

  /** Posts a new lesson comment (starts in `pending` moderation status). */
  async createComment(
    lessonId: string,
    payload: CreateCommentRequestDto
  ): Promise<CommentDto> {
    return http.post(
      `/lessons/${encodeURIComponent(lessonId)}/comments`,
      CommentSchema,
      payload
    );
  },

  /** Adds a single-level reply to an existing lesson comment. */
  async replyToComment(
    commentId: string,
    payload: CreateCommentReplyRequestDto
  ): Promise<CommentReplyDto> {
    return http.post(
      `/comments/${encodeURIComponent(commentId)}/replies`,
      CommentReplySchema,
      payload
    );
  },

  /** Edits a comment owned by the authenticated user. */
  async updateComment(
    commentId: string,
    payload: UpdateCommentRequestDto
  ): Promise<CommentDto> {
    return http.patch(`/comments/${encodeURIComponent(commentId)}`, CommentSchema, payload);
  },

  /** Deletes a comment (owner, supervisor, or admin). */
  async deleteComment(commentId: string): Promise<ActionResultDto> {
    return http.delete(`/comments/${encodeURIComponent(commentId)}`, ActionResultSchema);
  },

  /** Likes a lesson comment. */
  async likeComment(commentId: string): Promise<LikeToggleResponseDto> {
    return http.put(`/comments/${encodeURIComponent(commentId)}/like`, LikeToggleResponseSchema);
  },

  /** Removes the current user's like from a lesson comment. */
  async unlikeComment(commentId: string): Promise<LikeToggleResponseDto> {
    return http.delete(`/comments/${encodeURIComponent(commentId)}/like`, LikeToggleResponseSchema);
  },

  /** Likes a nested comment reply. */
  async likeReply(replyId: string): Promise<LikeToggleResponseDto> {
    return http.put(`/replies/${encodeURIComponent(replyId)}/like`, LikeToggleResponseSchema);
  },

  /** Removes the current user's like from a nested comment reply. */
  async unlikeReply(replyId: string): Promise<LikeToggleResponseDto> {
    return http.delete(`/replies/${encodeURIComponent(replyId)}/like`, LikeToggleResponseSchema);
  },

  /** Reports a comment to the supervisor moderation queue. */
  async reportComment(
    commentId: string,
    payload: ReportCommentRequestDto
  ): Promise<ActionResultDto> {
    return http.post(
      `/comments/${encodeURIComponent(commentId)}/report`,
      ActionResultSchema,
      payload
    );
  },
};
