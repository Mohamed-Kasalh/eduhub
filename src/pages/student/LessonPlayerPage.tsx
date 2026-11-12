import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Subtitles,
  Settings,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  ThumbsUp,
  MessageSquare,
  MoreVertical,
  Flag,
  Edit3,
  Trash2,
  ShieldCheck,
  Clock,
  FileCheck2,
  Sparkles,
  PanelRightOpen,
  X,
} from 'lucide-react';
import {
  Button,
  ProgressBar,
  ProgressRing,
  StatusChip,
  Avatar,
  EmptyState,
  ConfirmDialog,
  Skeleton,
  QueryErrorState,
} from '../../components/ui';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { isApiError, isForbiddenError, isNotFoundError } from '../../api/errors';
import {
  useCompleteLessonMutation,
  useCourseProgress,
  useLessonDetail,
  useSaveLessonProgressMutation,
  useUncompleteLessonMutation,
} from '../../api/hooks/useLearning';
import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useLessonComments,
  useReplyCommentMutation,
  useReportCommentMutation,
  useToggleLikeCommentMutation,
  useToggleLikeReplyMutation,
  useUpdateCommentMutation,
} from '../../api/hooks/useComments';
import {
  LESSON_REPORT_OPTIONS,
  type MappedLessonComment,
  type MappedPlayerLesson,
} from '../../api/mappers';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { formatDuration } from '../../lib/format';
import { handleImageError } from '../../utils/imageFallback';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Forbidden403Page, NotFound404Page } from '../ErrorPages';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const VIDEO_QUALITIES = ['1080p HD', '720p', '480p'];

export const LessonPlayerPage: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { addToast } = useApp();
  const { user } = useAuth();

  const resolvedCourseId = courseId ?? '';
  const resolvedLessonId = lessonId ?? '';

  const lessonDetailQuery = useLessonDetail(resolvedCourseId, resolvedLessonId);
  const courseProgressQuery = useCourseProgress(resolvedCourseId);

  const [commentSort, setCommentSort] = useState<'newest' | 'top'>('newest');
  const [commentLimit, setCommentLimit] = useState<number>(4);

  const commentsQuery = useLessonComments(
    resolvedLessonId,
    { sort: commentSort, page: 1, limit: commentLimit },
    Boolean(resolvedLessonId)
  );

  const saveProgressMutation = useSaveLessonProgressMutation();
  const completeLessonMutation = useCompleteLessonMutation();
  const uncompleteLessonMutation = useUncompleteLessonMutation();

  const createCommentMutation = useCreateCommentMutation(resolvedLessonId);
  const replyCommentMutation = useReplyCommentMutation(resolvedLessonId);
  const updateCommentMutation = useUpdateCommentMutation(resolvedLessonId);
  const deleteCommentMutation = useDeleteCommentMutation(resolvedLessonId);
  const toggleLikeCommentMutation = useToggleLikeCommentMutation(resolvedLessonId);
  const toggleLikeReplyMutation = useToggleLikeReplyMutation(resolvedLessonId);
  const reportCommentMutation = useReportCommentMutation();

  const detail = lessonDetailQuery.data;
  const activeLesson: MappedPlayerLesson | undefined = detail?.activeLesson;

  usePageTitle(
    activeLesson && detail ? `${activeLesson.title} • ${detail.courseTitle}` : 'Lesson Player'
  );

  // Player state synchronized to server state per lesson
  const [watchedPercent, setWatchedPercent] = useState<number>(0);
  const [positionSeconds, setPositionSeconds] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [volume, setVolume] = useState<number>(85);
  const [isMuted, setIsMuted] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [quality, setQuality] = useState<string>('1080p HD');
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [justAutoCompleted, setJustAutoCompleted] = useState(false);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const hasShownResumeToastRef = useRef<string | null>(null);
  const syncedLessonKeyRef = useRef<string | null>(null);
  const autoCompletedRef = useRef<boolean>(false);
  const dirtyRef = useRef<boolean>(false);
  const latestProgressRef = useRef<{
    courseId: string;
    lessonId: string;
    positionSeconds: number;
    watchPercent: number;
  }>({
    courseId: resolvedCourseId,
    lessonId: resolvedLessonId,
    positionSeconds: 0,
    watchPercent: 0,
  });

  // Tabs & sidebar UI state
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'comments'>('comments');
  const [openSectionIds, setOpenSectionIds] = useState<string[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mobileSidebarRef = useDialogA11y(mobileSidebarOpen, () => setMobileSidebarOpen(false));

  // Comments local UI state
  const [commentInput, setCommentInput] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [openReportMenuId, setOpenReportMenuId] = useState<string | null>(null);
  const [showEmptyCommentsPreview, setShowEmptyCommentsPreview] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);

  const saveMutateRef = useRef(saveProgressMutation.mutate);
  useEffect(() => {
    saveMutateRef.current = saveProgressMutation.mutate;
  }, [saveProgressMutation.mutate]);

  const flushPendingProgress = useCallback(() => {
    if (!dirtyRef.current) return;
    const snap = latestProgressRef.current;
    if (!snap.courseId || !snap.lessonId) return;
    dirtyRef.current = false;
    saveMutateRef.current(snap);
  }, []);

  // Synchronize player state when switching lessons or first loading detail
  useEffect(() => {
    if (!detail) return;
    const key = `${detail.courseId}:${detail.activeLesson.id}`;
    if (syncedLessonKeyRef.current !== key) {
      syncedLessonKeyRef.current = key;
      const initialPos = detail.lastPositionSeconds;
      const initialPct = detail.watchPercent;
      setPositionSeconds(initialPos);
      setWatchedPercent(initialPct);
      setCompleted(detail.completed || initialPct >= 90);
      autoCompletedRef.current = detail.completed || initialPct >= 90;
      dirtyRef.current = false;
      latestProgressRef.current = {
        courseId: detail.courseId,
        lessonId: detail.activeLesson.id,
        positionSeconds: initialPos,
        watchPercent: initialPct,
      };
      setIsPlaying(false);
      setJustAutoCompleted(false);
      setOpenSectionIds(detail.sections.map((s) => s.id));
    }

    if (hasShownResumeToastRef.current !== key) {
      hasShownResumeToastRef.current = key;
      if (detail.lastPositionSeconds > 0) {
        addToast({
          title: `Resume from ${formatDuration(detail.lastPositionSeconds, 'clock')}`,
          message: `Continuing "${detail.activeLesson.title}" from your last saved timestamp.`,
          variant: 'info',
        });
      }
    }
  }, [detail, addToast]);

  // Flush dirty playback progress when leaving the lesson or closing the page
  useEffect(() => {
    const onBeforeUnload = () => {
      if (dirtyRef.current) {
        flushPendingProgress();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (dirtyRef.current) {
        flushPendingProgress();
      }
    };
  }, [resolvedCourseId, resolvedLessonId, flushPendingProgress]);

  const applyProgressChange = useCallback(
    (nextPos: number, nextPct: number, flushImmediately = false) => {
      if (!detail) return;
      const clampedPos = Math.max(0, Math.min(detail.activeLesson.durationSeconds, Math.round(nextPos)));
      const clampedPct = Math.max(0, Math.min(100, Math.round(nextPct)));

      setPositionSeconds(clampedPos);
      setWatchedPercent(clampedPct);
      latestProgressRef.current = {
        courseId: detail.courseId,
        lessonId: detail.activeLesson.id,
        positionSeconds: clampedPos,
        watchPercent: clampedPct,
      };

      if (clampedPct >= 90 && !autoCompletedRef.current) {
        autoCompletedRef.current = true;
        dirtyRef.current = false;
        setCompleted(true);
        setJustAutoCompleted(true);
        completeLessonMutation.mutate({
          courseId: detail.courseId,
          lessonId: detail.activeLesson.id,
          lessonTitle: detail.activeLesson.title,
          isAutoComplete: true,
        });
        return;
      }

      dirtyRef.current = true;
      if (flushImmediately) {
        dirtyRef.current = false;
        saveProgressMutation.mutate(latestProgressRef.current);
      }
    },
    [detail, completeLessonMutation, saveProgressMutation]
  );

  // Advance playback smoothly while playing
  useEffect(() => {
    if (!isPlaying || !detail) return;
    const duration = Math.max(1, detail.activeLesson.durationSeconds);

    const tick = setInterval(() => {
      const prevPos = latestProgressRef.current.positionSeconds;
      const prevPct = latestProgressRef.current.watchPercent;
      if (prevPct >= 100 && prevPos >= duration) {
        setIsPlaying(false);
        return;
      }
      const nextPos = Math.min(duration, prevPos + Math.max(1, Math.round(playbackSpeed * 5)));
      const computedPct = Math.round((nextPos / duration) * 100);
      const nextPct = Math.max(prevPct, computedPct);
      applyProgressChange(nextPos, nextPct, false);
    }, 1000);

    return () => clearInterval(tick);
  }, [isPlaying, playbackSpeed, detail, applyProgressChange]);

  // Debounced background progress save every 10 seconds while playing
  useEffect(() => {
    if (!isPlaying) return;
    const autosave = setInterval(() => {
      if (dirtyRef.current) {
        flushPendingProgress();
      }
    }, 10_000);
    return () => clearInterval(autosave);
  }, [isPlaying, flushPendingProgress]);

  const lessonProgressById = useMemo(() => {
    const map = new Map<
      string,
      { watchPercent: number; completed: boolean; locked: boolean }
    >();
    for (const item of courseProgressQuery.data?.lessons ?? []) {
      map.set(item.lessonId, {
        watchPercent: item.watchPercent,
        completed: item.completed,
        locked: item.locked,
      });
    }
    return map;
  }, [courseProgressQuery.data]);

  const courseStats = useMemo(() => {
    if (courseProgressQuery.data) {
      return {
        completedLessons: courseProgressQuery.data.completedLessons,
        totalLessons: courseProgressQuery.data.totalLessons,
        overallPercent: courseProgressQuery.data.overallPercent,
      };
    }
    const flatCount = detail?.flatLessons.length ?? 0;
    const pct = detail?.courseProgressPercent ?? 0;
    return {
      completedLessons: flatCount > 0 ? Math.round((pct / 100) * flatCount) : 0,
      totalLessons: flatCount,
      overallPercent: pct,
    };
  }, [courseProgressQuery.data, detail]);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (prev && !next && dirtyRef.current) {
        flushPendingProgress();
      }
      return next;
    });
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!seekBarRef.current || !detail) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const targetPct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    const targetPos = Math.round((targetPct / 100) * detail.activeLesson.durationSeconds);
    applyProgressChange(targetPos, targetPct, true);
  };

  const handleManualToggleComplete = () => {
    if (!detail) return;
    if (completed) {
      autoCompletedRef.current = false;
      dirtyRef.current = false;
      setCompleted(false);
      setJustAutoCompleted(false);
      setWatchedPercent(0);
      setPositionSeconds(0);
      uncompleteLessonMutation.mutate({
        courseId: detail.courseId,
        lessonId: detail.activeLesson.id,
        lessonTitle: detail.activeLesson.title,
      });
    } else {
      autoCompletedRef.current = true;
      dirtyRef.current = false;
      setCompleted(true);
      setJustAutoCompleted(true);
      setWatchedPercent(100);
      setPositionSeconds(detail.activeLesson.durationSeconds);
      completeLessonMutation.mutate({
        courseId: detail.courseId,
        lessonId: detail.activeLesson.id,
        lessonTitle: detail.activeLesson.title,
      });
    }
  };

  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const displayedComments: MappedLessonComment[] = showEmptyCommentsPreview
    ? []
    : (commentsQuery.data?.items ?? []);
  const totalCommentsCount = commentsQuery.data?.meta.total ?? displayedComments.length;
  const commentFieldErrors = isApiError(createCommentMutation.error)
    ? createCommentMutation.error.fieldErrors
    : undefined;

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || createCommentMutation.isPending) return;
    createCommentMutation.mutate(commentInput, {
      onSuccess: () => {
        setCommentInput('');
        setShowEmptyCommentsPreview(false);
      },
    });
  };

  const handlePostReply = (commentId: string) => {
    if (!replyText.trim() || replyCommentMutation.isPending) return;
    replyCommentMutation.mutate(
      { commentId, content: replyText },
      {
        onSuccess: () => {
          setReplyText('');
          setReplyingToId(null);
        },
      }
    );
  };

  const handleSaveEditedComment = (commentId: string) => {
    if (!editingText.trim() || updateCommentMutation.isPending) return;
    updateCommentMutation.mutate(
      { commentId, content: editingText },
      {
        onSuccess: () => {
          setEditingCommentId(null);
          setEditingText('');
        },
      }
    );
  };

  const handleConfirmDeleteComment = () => {
    if (!commentToDeleteId || deleteCommentMutation.isPending) return;
    const targetId = commentToDeleteId;
    setCommentToDeleteId(null);
    deleteCommentMutation.mutate(targetId);
  };

  if (lessonDetailQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8FF] p-4 sm:p-8 space-y-6">
        <Skeleton className="w-64" />
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="aspect-video rounded-[12px] bg-[#F3EFFF] animate-pulse" />
            <Skeleton variant="card" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
        </div>
      </div>
    );
  }

  if (lessonDetailQuery.isError) {
    if (isNotFoundError(lessonDetailQuery.error)) {
      return <NotFound404Page />;
    }
    if (isForbiddenError(lessonDetailQuery.error)) {
      return <Forbidden403Page />;
    }
    return (
      <div className="min-h-screen bg-[#FAF8FF] p-6">
        <div className="max-w-3xl mx-auto">
          <QueryErrorState
            error={lessonDetailQuery.error}
            title="Unable to load lesson player"
            onRetry={() => {
              void lessonDetailQuery.refetch();
            }}
          />
        </div>
      </div>
    );
  }

  if (!detail || !activeLesson) {
    return <NotFound404Page />;
  }

  const bufferedPercent = Math.min(100, watchedPercent + 18);
  const nextLessonLocked = detail.nextLesson
    ? Boolean(lessonProgressById.get(detail.nextLesson.id)?.locked)
    : false;
  const resumedFromLabel = formatDuration(detail.lastPositionSeconds, 'clock');

  const renderCourseContentSidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[#E6E1F5] bg-[#FAF8FF] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[18px] text-[#1E1B2E]">
            Course content
          </h2>
          <span className="text-[12px] font-bold text-[#6D4AE0]">
            {courseStats.completedLessons} of {courseStats.totalLessons} completed (
            {courseStats.overallPercent}%)
          </span>
        </div>
        <ProgressBar
          value={courseStats.overallPercent}
          showValue={false}
          size="sm"
          color={courseStats.overallPercent === 100 ? 'success' : 'primary'}
        />
        <p className="text-[11px] text-[#5F5B75]">
          Rule: Lessons complete at 90% watched • Course % = completed / total lessons
        </p>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#E6E1F5]">
        {detail.sections.map((sec) => {
          const isOpen = openSectionIds.includes(sec.id);
          const secCompletedCount = sec.lessons.filter((l) => {
            if (l.id === activeLesson.id) return completed;
            const prog = lessonProgressById.get(l.id);
            return Boolean(prog?.completed);
          }).length;

          return (
            <div key={sec.id} className="bg-white">
              <button
                type="button"
                onClick={() =>
                  setOpenSectionIds((prev) =>
                    prev.includes(sec.id)
                      ? prev.filter((id) => id !== sec.id)
                      : [...prev, sec.id]
                  )
                }
                className="w-full px-4 py-3.5 bg-[#FAF8FF]/70 hover:bg-[#F3EFFF]/60 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="font-display font-bold text-[15px] text-[#1E1B2E] truncate">
                    {sec.title}
                  </p>
                  <p className="text-[12px] text-[#5F5B75]">
                    {secCompletedCount}/{sec.lessons.length} completed • {sec.totalDurationLabel}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[#6D4AE0] shrink-0 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="divide-y divide-[#E6E1F5]/60">
                  {sec.lessons.map((lesson) => {
                    const isCurrent = lesson.id === activeLesson.id;
                    const prog = lessonProgressById.get(lesson.id);
                    const pct = isCurrent ? watchedPercent : (prog?.watchPercent ?? 0);
                    const lessonCompleted = isCurrent ? completed : Boolean(prog?.completed);
                    const locked = !isCurrent && Boolean(prog?.locked);

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => {
                          if (locked) {
                            addToast({
                              title: 'Lesson locked',
                              message:
                                'Complete the previous lesson (watch at least 90%) to unlock this lesson.',
                              variant: 'warning',
                            });
                            return;
                          }
                          flushPendingProgress();
                          setMobileSidebarOpen(false);
                          navigate(`/learn/${detail.courseId}/${lesson.id}`);
                        }}
                        className={`w-full px-4 py-3 text-left flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#F3EFFF] border-l-4 border-l-[#6D4AE0]'
                            : locked
                              ? 'bg-[#FAF8FF]/60 opacity-65'
                              : 'hover:bg-[#FAF8FF]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="mt-0.5 shrink-0">
                            {lessonCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                            ) : isCurrent ? (
                              <Play className="w-4 h-4 text-[#6D4AE0] fill-[#6D4AE0]" />
                            ) : locked ? (
                              <Lock className="w-4 h-4 text-[#5F5B75]" />
                            ) : pct > 0 ? (
                              <span
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#F59E3B] text-[9px] font-bold text-[#B45309]"
                                title={`Watched ${pct}%`}
                              >
                                {pct}
                              </span>
                            ) : (
                              <span className="inline-block w-4 h-4 rounded-full border-2 border-[#E6E1F5]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-[13px] leading-snug ${
                                isCurrent
                                  ? 'font-bold text-[#6D4AE0]'
                                  : 'font-semibold text-[#1E1B2E]'
                              }`}
                            >
                              {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-[#5F5B75]">
                              <span>{lesson.durationLabel}</span>
                              {pct > 0 && !lessonCompleted && (
                                <span className="text-[#B45309] font-semibold">
                                  • {pct}% watched
                                </span>
                              )}
                              {lessonCompleted && (
                                <span className="text-[#16A34A] font-semibold">
                                  • Completed
                                </span>
                              )}
                              {locked && (
                                <span className="text-[#5F5B75] font-semibold">• Locked</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Final Exam Row */}
        <div className="p-4 bg-[#F3EFFF]/60">
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-3.5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#6D4AE0]">
                <FileCheck2 className="w-4 h-4" />
                Final certification exam
              </span>
              <StatusChip
                label={courseStats.overallPercent === 100 ? 'Unlocked' : '60%+ to pass'}
                variant={courseStats.overallPercent === 100 ? 'success' : 'primary'}
                dot={false}
              />
            </div>
            <p className="font-display font-bold text-[15px] text-[#1E1B2E]">
              {detail.courseTitle} Assessment
            </p>
            <p className="text-[12px] text-[#5F5B75]">
              Multiple-choice certification assessment • Instant grading
            </p>
            <Link to={`/exam/${detail.courseId}`} className="block pt-1">
              <Button variant="primary" size="sm" fullWidth>
                Start final exam
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8FF] text-[#1E1B2E]">
      {/* SLIM TOP BAR */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E6E1F5] px-4 sm:px-6 flex items-center justify-between gap-4 shadow-purple-sm">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <BrandLogo size="sm" showText={false} />
          <div className="h-6 w-px bg-[#E6E1F5] hidden sm:block" />
          <div className="min-w-0">
            <Link
              to={`/student/progress/${detail.courseId}`}
              className="font-display font-bold text-[16px] sm:text-[18px] text-[#1E1B2E] hover:text-[#6D4AE0] transition-colors truncate block"
            >
              {detail.courseTitle}
            </Link>
            <p className="text-[12px] text-[#5F5B75] truncate hidden sm:block">
              {activeLesson.sectionTitle} • {activeLesson.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <Link
            to={`/student/progress/${detail.courseId}`}
            className="flex items-center gap-2.5 px-3 py-1 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] hover:border-[#A78BFA] transition-colors"
            title="View detailed course progress"
          >
            <ProgressRing value={courseStats.overallPercent} size={36} strokeWidth={4} />
            <div className="hidden md:block text-left leading-tight">
              <p className="text-[12px] font-bold text-[#1E1B2E]">
                {courseStats.overallPercent}% complete
              </p>
              <p className="text-[11px] text-[#5F5B75]">
                {courseStats.completedLessons}/{courseStats.totalLessons} lessons
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden h-9 px-3 rounded-[10px] bg-[#F3EFFF] text-[#6D4AE0] font-bold text-[13px] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <PanelRightOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Course content</span>
          </button>

          <Link to={`/student/progress/${detail.courseId}`}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Back to course
            </Button>
          </Link>
        </div>
      </header>

      {/* MAIN BODY */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 focus:outline-none"
        >
          {/* CUSTOM VIDEO PLAYER */}
          <div
            ref={playerContainerRef}
            className="rounded-[12px] bg-[#1E1B2E] text-white overflow-hidden shadow-purple-lg border border-[#E6E1F5] relative flex flex-col justify-between aspect-video"
          >
            <img
              src={detail.courseThumbnailUrl}
              alt={activeLesson.title}
              onError={handleImageError}
              className="absolute inset-0 w-full h-full object-cover opacity-35 select-none pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B2E] via-[#1E1B2E]/35 to-[#1E1B2E]/60 pointer-events-none" />

            <div className="relative z-10 p-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#6D4AE0] text-white text-[12px] font-bold">
                  Lesson {activeLesson.number} of {detail.flatLessons.length || activeLesson.number}
                </span>
                {detail.lastPositionSeconds > 0 && (
                  <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-white text-[12px] font-semibold">
                    Resumed from {resumedFromLabel}
                  </span>
                )}
              </div>

              {completed && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16A34A] text-white text-[12px] font-bold shadow-md ${
                    justAutoCompleted ? 'animate-bounce' : ''
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lesson completed (90%+ watched)</span>
                </div>
              )}
            </div>

            <div className="relative z-10 my-auto px-6 text-center space-y-3">
              <button
                type="button"
                onClick={handleTogglePlay}
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
                className="w-18 h-18 rounded-full bg-[#6D4AE0] hover:bg-[#5A3AC7] text-white flex items-center justify-center mx-auto shadow-purple-lg transition-transform hover:scale-105 cursor-pointer border-2 border-white/80"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 fill-white ml-0.5" />
                )}
              </button>
              <h1 className="font-display font-bold text-[20px] sm:text-[26px] text-white max-w-2xl mx-auto leading-snug drop-shadow">
                {activeLesson.title}
              </h1>
              {captionsEnabled && (
                <div className="inline-block max-w-xl mx-auto px-4 py-1.5 rounded-[8px] bg-[#1E1B2E]/90 border border-white/15 text-[13px] sm:text-[14px] text-white/95">
                  [CC] {activeLesson.summary}
                </div>
              )}
            </div>

            <div className="relative z-20 p-3 sm:p-4 bg-gradient-to-t from-[#1E1B2E] via-[#1E1B2E]/95 to-transparent space-y-2.5">
              <div className="space-y-1">
                <div
                  ref={seekBarRef}
                  onClick={handleSeekClick}
                  role="slider"
                  aria-label="Video seek bar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={watchedPercent}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') {
                      const nextPct = Math.min(100, watchedPercent + 5);
                      applyProgressChange(
                        (nextPct / 100) * activeLesson.durationSeconds,
                        nextPct,
                        true
                      );
                    } else if (e.key === 'ArrowLeft') {
                      const nextPct = Math.max(0, watchedPercent - 5);
                      applyProgressChange(
                        (nextPct / 100) * activeLesson.durationSeconds,
                        nextPct,
                        true
                      );
                    }
                  }}
                  className="group relative h-2.5 w-full rounded-full bg-white/20 cursor-pointer flex items-center"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-full bg-white/40 transition-all"
                    style={{ width: `${bufferedPercent}%` }}
                  />
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-full bg-[#6D4AE0] transition-all"
                    style={{ width: `${watchedPercent}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#16A34A]"
                    style={{ left: '90%' }}
                    title="90% auto-complete threshold"
                  />
                  <div
                    className="w-4 h-4 rounded-full bg-white border-2 border-[#6D4AE0] shadow-md absolute -translate-x-1/2 group-hover:scale-125 transition-transform"
                    style={{ left: `${watchedPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-white/70">
                  <span>Click anywhere on the seek bar to scrub • Buffered {bufferedPercent}%</span>
                  <span className="text-[#16A34A] font-semibold">90% completion mark</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="p-1.5 rounded-[8px] hover:bg-white/15 text-white cursor-pointer"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>

                  <span className="text-[13px] font-semibold text-white tabular-nums">
                    {formatDuration(positionSeconds, 'clock')}{' '}
                    <span className="text-white/60">/ {activeLesson.durationLabel}</span>
                  </span>

                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMuted((m) => !m)}
                      className="p-1.5 rounded-[8px] hover:bg-white/15 text-white cursor-pointer"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-[#F59E3B]" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(Number(e.target.value));
                        if (isMuted) setIsMuted(false);
                      }}
                      aria-label="Volume"
                      className="w-20 accent-[#A78BFA] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setSpeedMenuOpen((v) => !v);
                        setQualityMenuOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-[8px] bg-white/10 hover:bg-white/20 text-[12px] font-bold text-white cursor-pointer"
                    >
                      {playbackSpeed}x
                    </button>
                    {speedMenuOpen && (
                      <div className="absolute right-0 bottom-full mb-2 w-28 rounded-[10px] bg-[#1E1B2E] border border-white/20 shadow-lg py-1 z-30">
                        {PLAYBACK_SPEEDS.map((sp) => (
                          <button
                            key={sp}
                            type="button"
                            onClick={() => {
                              setPlaybackSpeed(sp);
                              setSpeedMenuOpen(false);
                            }}
                            className={`w-full px-3 py-1.5 text-left text-[12px] font-semibold hover:bg-white/15 cursor-pointer flex items-center justify-between ${
                              playbackSpeed === sp ? 'text-[#A78BFA] font-bold' : 'text-white'
                            }`}
                          >
                            <span>{sp}x</span>
                            {playbackSpeed === sp && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCaptionsEnabled((c) => !c)}
                    className={`px-2.5 py-1 rounded-[8px] text-[12px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                      captionsEnabled
                        ? 'bg-[#6D4AE0] text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white/80'
                    }`}
                    aria-label="Toggle captions"
                  >
                    <Subtitles className="w-3.5 h-3.5" />
                    <span>CC</span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setQualityMenuOpen((v) => !v);
                        setSpeedMenuOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-[8px] bg-white/10 hover:bg-white/20 text-[12px] font-bold text-white inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{quality}</span>
                    </button>
                    {qualityMenuOpen && (
                      <div className="absolute right-0 bottom-full mb-2 w-32 rounded-[10px] bg-[#1E1B2E] border border-white/20 shadow-lg py-1 z-30">
                        {VIDEO_QUALITIES.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => {
                              setQuality(q);
                              setQualityMenuOpen(false);
                            }}
                            className={`w-full px-3 py-1.5 text-left text-[12px] font-semibold hover:bg-white/15 cursor-pointer flex items-center justify-between ${
                              quality === q ? 'text-[#A78BFA] font-bold' : 'text-white'
                            }`}
                          >
                            <span>{q}</span>
                            {quality === q && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="p-1.5 rounded-[8px] hover:bg-white/15 text-white cursor-pointer"
                    aria-label="Toggle fullscreen"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* WATCH TRACKING BAR & LESSON NAVIGATION */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-5 shadow-purple-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-[18px] text-[#1E1B2E]">
                      Watched {watchedPercent}%
                    </span>
                    {completed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#16A34A]/12 text-[#16A34A] text-[12px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed (90%+ rule met)
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#5F5B75] font-medium">
                        • Auto-completes at 90% watched
                      </span>
                    )}
                  </div>

                  {!completed && watchedPercent < 90 && (
                    <button
                      type="button"
                      disabled={completeLessonMutation.isPending}
                      onClick={() =>
                        applyProgressChange(
                          Math.round(activeLesson.durationSeconds * 0.92),
                          92,
                          false
                        )
                      }
                      className="text-[12px] font-bold text-[#6D4AE0] hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#F59E3B]" />
                      <span>Simulate reaching 90% watched</span>
                    </button>
                  )}
                </div>

                <div className="relative h-3 w-full rounded-full bg-[#F3EFFF] border border-[#E6E1F5] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      completed ? 'bg-[#16A34A]' : 'bg-[#6D4AE0]'
                    }`}
                    style={{ width: `${watchedPercent}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#1E1B2E]/40"
                    style={{ left: '90%' }}
                    title="90% auto-complete threshold"
                  />
                </div>
              </div>

              <div className="shrink-0">
                <Button
                  variant={completed ? 'secondary' : 'primary'}
                  size="md"
                  loading={completeLessonMutation.isPending || uncompleteLessonMutation.isPending}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={handleManualToggleComplete}
                >
                  {completed ? 'Completed (Click to undo)' : 'Mark as complete'}
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E6E1F5] flex flex-wrap items-center justify-between gap-3">
              <div>
                {detail.previousLesson ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                    onClick={() => {
                      flushPendingProgress();
                      navigate(`/learn/${detail.courseId}/${detail.previousLesson!.id}`);
                    }}
                  >
                    Previous: {detail.previousLesson.title}
                  </Button>
                ) : (
                  <span className="text-[13px] text-[#5F5B75]">First lesson in course</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {detail.nextLesson ? (
                  <>
                    {nextLessonLocked && (
                      <span className="text-[12px] text-[#B45309] font-semibold hidden sm:inline">
                        Complete this lesson (90%+) to unlock next
                      </span>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={nextLessonLocked}
                      leftIcon={nextLessonLocked ? <Lock className="w-4 h-4" /> : undefined}
                      rightIcon={!nextLessonLocked ? <ChevronRight className="w-4 h-4" /> : undefined}
                      onClick={() => {
                        flushPendingProgress();
                        navigate(`/learn/${detail.courseId}/${detail.nextLesson!.id}`);
                      }}
                    >
                      Next lesson
                    </Button>
                  </>
                ) : (
                  <Link to={`/exam/${detail.courseId}`}>
                    <Button
                      variant="primary"
                      size="sm"
                      rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                      Proceed to final exam
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* TABS: Overview, Resources, Comments */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
            <div className="px-6 pt-4 border-b border-[#E6E1F5] bg-[#FAF8FF] flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'overview', label: 'Overview' },
                  { id: 'resources', label: `Resources (${activeLesson.attachments.length})` },
                  { id: 'comments', label: `Comments (${totalCommentsCount})` },
                ] as const
              ).map((t) => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`px-4 py-2.5 rounded-t-[10px] text-[14px] font-bold border-b-2 transition-colors cursor-pointer ${
                      active
                        ? 'bg-white text-[#6D4AE0] border-[#6D4AE0]'
                        : 'text-[#5F5B75] border-transparent hover:text-[#1E1B2E]'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <span className="text-[12px] font-bold text-[#6D4AE0]">
                      {activeLesson.sectionTitle}
                    </span>
                    <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                      {activeLesson.title}
                    </h2>
                    <p className="text-[15px] text-[#5F5B75] leading-relaxed">
                      {activeLesson.summary}
                    </p>
                  </div>

                  {activeLesson.keyTakeaways.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-[#E6E1F5]">
                      <h3 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                        Key lesson takeaways
                      </h3>
                      <ul className="space-y-2">
                        {activeLesson.keyTakeaways.map((point, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-[14px] text-[#1E1B2E]"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="p-4 rounded-[10px] bg-[#F3EFFF] border border-[#E6E1F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
                    <div>
                      <p className="font-bold text-[#3F2A9E]">
                        EduHub progress calculation rules
                      </p>
                      <p className="text-[#5F5B75]">
                        A lesson completes automatically at 90% watched. Course % = completed
                        lessons ({courseStats.completedLessons}) / total lessons (
                        {courseStats.totalLessons}).
                      </p>
                    </div>
                    <Link to={`/student/progress/${detail.courseId}`}>
                      <Button variant="secondary" size="sm">
                        Full progress report
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                      Downloadable lesson files
                    </h2>
                    <p className="text-[14px] text-[#5F5B75]">
                      Code labs, slides, and reference sheets for {activeLesson.title}.
                    </p>
                  </div>

                  {activeLesson.attachments.length === 0 ? (
                    <EmptyState
                      title="No downloadable files for this lesson"
                      description="Check upcoming lessons or revisit previous sections for workbooks and starter templates."
                      mood="empty"
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeLesson.attachments.map((res) => (
                        <div
                          key={res.id}
                          className="rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] p-4 flex items-start justify-between gap-4 hover:border-[#A78BFA] transition-colors"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-[10px] bg-[#F3EFFF] text-[#6D4AE0] flex items-center justify-center shrink-0 font-display font-bold text-[12px]">
                              {res.typeLabel}
                            </div>
                            <div className="min-w-0">
                              <p className="font-display font-bold text-[15px] text-[#1E1B2E] truncate">
                                {res.title}
                              </p>
                              <p className="text-[12px] text-[#5F5B75] mt-0.5">
                                {res.description}
                              </p>
                              <span className="inline-block text-[11px] font-bold text-[#6D4AE0] mt-1">
                                {res.typeLabel} • {res.sizeLabel}
                              </span>
                            </div>
                          </div>
                          <a
                            href={res.url}
                            download={res.title}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              addToast({
                                title: 'Downloading resource',
                                message: `${res.title} (${res.sizeLabel}) saved to your device.`,
                                variant: 'success',
                              })
                            }
                          >
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<Download className="w-3.5 h-3.5" />}
                            >
                              Download
                            </Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="space-y-6">
                  <form
                    onSubmit={handlePostComment}
                    className="rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar src={user?.avatar} name={user?.name ?? 'Student'} size="md" />
                      <div className="flex-1 space-y-2">
                        <textarea
                          rows={3}
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="Ask a question or share an insight about this lesson..."
                          aria-label="Write a lesson comment"
                          className="w-full p-3 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[14px] text-[#1E1B2E]"
                        />
                        {commentFieldErrors?.content?.[0] && (
                          <p className="text-[12px] text-[#DC2626] font-semibold">
                            {commentFieldErrors.content[0]}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[12px] text-[#5F5B75]">
                            New comments appear with a yellow "Pending review" badge until approved
                            by a supervisor.
                          </span>
                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            loading={createCommentMutation.isPending}
                            disabled={!commentInput.trim()}
                          >
                            Post comment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>

                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E6E1F5]">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#6D4AE0]" />
                      <span className="font-display font-bold text-[18px] text-[#1E1B2E]">
                        Lesson discussion ({totalCommentsCount})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowEmptyCommentsPreview((v) => !v)}
                        className="text-[12px] font-semibold text-[#6D4AE0] hover:underline cursor-pointer"
                      >
                        {showEmptyCommentsPreview ? 'Restore comments' : 'Preview empty state'}
                      </button>
                      <div className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5]">
                        {(
                          [
                            { id: 'newest', label: 'Newest' },
                            { id: 'top', label: 'Top' },
                          ] as const
                        ).map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setCommentSort(s.id)}
                            className={`px-3 py-1 rounded-[8px] text-[12px] font-bold transition-colors cursor-pointer ${
                              commentSort === s.id
                                ? 'bg-[#6D4AE0] text-white'
                                : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {commentsQuery.isLoading ? (
                    <div className="space-y-4">
                      <Skeleton variant="card" />
                      <Skeleton variant="card" />
                    </div>
                  ) : commentsQuery.isError ? (
                    <QueryErrorState
                      error={commentsQuery.error}
                      title="Could not load lesson comments"
                      onRetry={() => {
                        void commentsQuery.refetch();
                      }}
                    />
                  ) : displayedComments.length === 0 ? (
                    <EmptyState
                      title="No comments on this lesson yet"
                      description="Be the first student to ask a question or share your takeaway from this video lesson."
                      actionLabel={showEmptyCommentsPreview ? 'Restore discussion' : undefined}
                      onAction={
                        showEmptyCommentsPreview
                          ? () => setShowEmptyCommentsPreview(false)
                          : undefined
                      }
                      mood="empty"
                    />
                  ) : (
                    <div className="space-y-5">
                      {displayedComments.map((comment) => {
                        const isOwn = comment.authorId === user?.id;
                        const isPending = comment.status === 'pending';
                        const isEditing = editingCommentId === comment.id;
                        const isReplying = replyingToId === comment.id;

                        return (
                          <div
                            key={comment.id}
                            className={`rounded-[12px] border p-4 sm:p-5 space-y-3 transition-colors ${
                              isPending
                                ? 'bg-[#FFFBEB]/60 border-[#F59E0B]/45'
                                : 'bg-white border-[#E6E1F5]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <Avatar
                                  src={comment.authorAvatar}
                                  name={comment.authorName}
                                  size="md"
                                />
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-display font-bold text-[16px] text-[#1E1B2E]">
                                      {comment.authorName}
                                    </span>

                                    {comment.isInstructor && (
                                      <span className="px-2.5 py-0.5 rounded-full bg-[#6D4AE0] text-white text-[11px] font-bold">
                                        Instructor
                                      </span>
                                    )}

                                    {comment.isSupervisorVerified && !isPending && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#16A34A]/12 text-[#16A34A] text-[11px] font-bold">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        Verified
                                      </span>
                                    )}

                                    {isPending && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/40 text-[11px] font-bold">
                                        <Clock className="w-3 h-3" />
                                        Pending review (visible only to you)
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[12px] text-[#5F5B75]">{comment.createdAt}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 relative">
                                {isOwn && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditingText(comment.content);
                                      }}
                                      className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#6D4AE0] hover:bg-[#F3EFFF] cursor-pointer"
                                      title="Edit your comment"
                                      aria-label="Edit comment"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCommentToDeleteId(comment.id)}
                                      className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                                      title="Delete your comment"
                                      aria-label="Delete comment"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenReportMenuId((prev) =>
                                      prev === comment.id ? null : comment.id
                                    )
                                  }
                                  className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#1E1B2E] hover:bg-[#FAF8FF] cursor-pointer"
                                  aria-label="Report comment menu"
                                  title="Report comment"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {openReportMenuId === comment.id && (
                                  <div className="absolute right-0 top-full mt-1 w-56 rounded-[10px] bg-white border border-[#E6E1F5] shadow-purple-lg py-1.5 z-20">
                                    <p className="px-3 py-1 text-[11px] font-bold text-[#5F5B75]">
                                      Report comment to supervisors
                                    </p>
                                    {LESSON_REPORT_OPTIONS.map((opt) => (
                                      <button
                                        key={opt.reason}
                                        type="button"
                                        disabled={reportCommentMutation.isPending}
                                        onClick={() => {
                                          setOpenReportMenuId(null);
                                          reportCommentMutation.mutate({
                                            commentId: comment.id,
                                            reason: opt.reason,
                                            reasonLabel: opt.label,
                                          });
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] text-[#1E1B2E] hover:bg-[#FEF2F2] hover:text-[#DC2626] flex items-center gap-2 cursor-pointer"
                                      >
                                        <Flag className="w-3.5 h-3.5 text-[#DC2626]" />
                                        <span>{opt.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {isEditing ? (
                              <div className="space-y-2 pt-1">
                                <textarea
                                  rows={3}
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  aria-label="Edit lesson comment"
                                  className="w-full p-3 rounded-[10px] bg-white border border-[#6D4AE0] text-[14px] text-[#1E1B2E] focus:outline-none"
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    loading={updateCommentMutation.isPending}
                                    disabled={!editingText.trim()}
                                    onClick={() => handleSaveEditedComment(comment.id)}
                                  >
                                    Save changes
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingCommentId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[14px] text-[#1E1B2E] leading-relaxed">
                                {comment.content}
                              </p>
                            )}

                            <div className="flex items-center gap-4 pt-1">
                              <button
                                type="button"
                                disabled={toggleLikeCommentMutation.isPending}
                                onClick={() =>
                                  toggleLikeCommentMutation.mutate({
                                    commentId: comment.id,
                                    currentlyLiked: comment.likedByMe,
                                  })
                                }
                                className={`inline-flex items-center gap-1.5 text-[13px] font-bold cursor-pointer transition-colors ${
                                  comment.likedByMe
                                    ? 'text-[#6D4AE0]'
                                    : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                                }`}
                              >
                                <ThumbsUp
                                  className={`w-4 h-4 ${
                                    comment.likedByMe ? 'fill-[#6D4AE0]/20' : ''
                                  }`}
                                />
                                <span>Like ({comment.likesCount})</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setReplyingToId((prev) =>
                                    prev === comment.id ? null : comment.id
                                  )
                                }
                                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#5F5B75] hover:text-[#6D4AE0] cursor-pointer"
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>Reply ({comment.replies.length})</span>
                              </button>
                            </div>

                            {isReplying && (
                              <div className="pl-4 sm:pl-8 pt-2 space-y-2">
                                <textarea
                                  rows={2}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder={`Reply to ${comment.authorName}...`}
                                  aria-label={`Reply to ${comment.authorName}`}
                                  className="w-full p-2.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[13px] text-[#1E1B2E]"
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    loading={replyCommentMutation.isPending}
                                    disabled={!replyText.trim()}
                                    onClick={() => handlePostReply(comment.id)}
                                  >
                                    Post reply
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setReplyingToId(null);
                                      setReplyText('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}

                            {comment.replies.length > 0 && (
                              <div className="pl-4 sm:pl-8 pt-2 space-y-3 border-l-2 border-[#E6E1F5] ml-2">
                                {comment.replies.map((reply) => (
                                  <div
                                    key={reply.id}
                                    className="rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] p-3.5 space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2.5 flex-wrap">
                                        <Avatar
                                          src={reply.authorAvatar}
                                          name={reply.authorName}
                                          size="sm"
                                        />
                                        <span className="font-display font-bold text-[14px] text-[#1E1B2E]">
                                          {reply.authorName}
                                        </span>
                                        {reply.isInstructor && (
                                          <span className="px-2 py-0.5 rounded-full bg-[#6D4AE0] text-white text-[10px] font-bold">
                                            Instructor
                                          </span>
                                        )}
                                        {reply.isSupervisorVerified && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#16A34A]/12 text-[#16A34A] text-[10px] font-bold">
                                            <ShieldCheck className="w-3 h-3" />
                                            Verified
                                          </span>
                                        )}
                                        <span className="text-[11px] text-[#5F5B75]">
                                          • {reply.createdAt}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-[13px] text-[#1E1B2E] leading-relaxed">
                                      {reply.content}
                                    </p>
                                    <button
                                      type="button"
                                      disabled={toggleLikeReplyMutation.isPending}
                                      onClick={() =>
                                        toggleLikeReplyMutation.mutate({
                                          commentId: comment.id,
                                          replyId: reply.id,
                                          currentlyLiked: reply.likedByMe,
                                        })
                                      }
                                      className={`inline-flex items-center gap-1 text-[12px] font-bold cursor-pointer ${
                                        reply.likedByMe ? 'text-[#6D4AE0]' : 'text-[#5F5B75]'
                                      }`}
                                    >
                                      <ThumbsUp className="w-3.5 h-3.5" />
                                      <span>Like ({reply.likesCount})</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {(totalCommentsCount > displayedComments.length || commentLimit > 4) && (
                        <div className="pt-2 flex justify-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={commentsQuery.isFetching}
                            onClick={() =>
                              setCommentLimit((prev) =>
                                totalCommentsCount > displayedComments.length ? prev + 6 : 4
                              )
                            }
                          >
                            {totalCommentsCount > displayedComments.length
                              ? `Load more comments (${
                                  totalCommentsCount - displayedComments.length
                                } more)`
                              : 'Show fewer comments'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="hidden lg:block w-96 shrink-0 bg-white border-l border-[#E6E1F5] sticky top-16 h-[calc(100vh-4rem)] overflow-hidden">
          {renderCourseContentSidebar()}
        </aside>
      </div>

      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-[#1E1B2E]/55 backdrop-blur-xs">
          <div className="flex-1" onClick={() => setMobileSidebarOpen(false)} />
          <div
            ref={mobileSidebarRef}
            role="dialog"
            aria-modal="true"
            aria-label="Course content sidebar"
            tabIndex={-1}
            className="w-full max-w-sm bg-white h-full max-h-[100dvh] shadow-purple-lg border-l border-[#E6E1F5] flex flex-col focus:outline-none"
          >
            <div className="px-4 py-3 border-b border-[#E6E1F5] flex items-center justify-between shrink-0">
              <span className="font-display font-bold text-[18px] text-[#1E1B2E]">
                Course content
              </span>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="w-11 h-11 -mr-2 flex items-center justify-center rounded-[10px] text-[#5F5B75] hover:bg-[#F3EFFF] cursor-pointer"
                aria-label="Close course content drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">{renderCourseContentSidebar()}</div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(commentToDeleteId)}
        onClose={() => setCommentToDeleteId(null)}
        title="Delete this comment?"
        description="Are you sure you want to permanently remove your comment and any replies from this lesson discussion?"
        confirmLabel="Delete comment"
        tone="danger"
        onConfirm={handleConfirmDeleteComment}
      />
    </div>
  );
};
