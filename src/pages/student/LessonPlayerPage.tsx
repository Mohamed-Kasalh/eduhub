import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  FileText,
  Download,
  ThumbsUp,
  MessageSquare,
  MoreVertical,
  Flag,
  Edit3,
  Trash2,
  ShieldCheck,
  Clock,
  Award,
  FileCheck2,
  Sparkles,
  PanelRightOpen,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  Button,
  ProgressBar,
  ProgressRing,
  StatusChip,
  Avatar,
  EmptyState,
  ConfirmDialog,
} from '../../components/ui';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { useApp } from '../../context/AppContext';
import { ROLE_USERS } from '../../data/mockData';
import {
  STUDENT_COURSE_SECTIONS,
  ALL_STUDENT_LESSONS,
  LESSON_RESOURCES,
  StudentLessonItem,
  ThreadedLessonComment,
} from '../../data/studentLearningData';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const VIDEO_QUALITIES = ['1080p HD', '720p', '480p'];

function formatSeconds(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const LessonPlayerPage: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const {
    courses,
    currentUser,
    getLessonWatchPercent,
    updateLessonWatchPercent,
    toggleLessonCompleted,
    getCourseProgressStats,
    threadedComments,
    setThreadedComments,
    setReports,
    addToast,
  } = useApp();

  const student = currentUser || ROLE_USERS.student;
  const course = useMemo(
    () => courses.find((c) => c.id === courseId) || courses[0],
    [courses, courseId]
  );

  // Resolve active lesson from our 12-lesson structured syllabus
  const activeLessonIndex = useMemo(() => {
    const idx = ALL_STUDENT_LESSONS.findIndex((l) => l.id === lessonId);
    return idx >= 0 ? idx : 3; // Default to Lesson 4 (lesson-103, 72% watched)
  }, [lessonId]);

  const activeLesson: StudentLessonItem = ALL_STUDENT_LESSONS[activeLessonIndex];
  const prevLesson: StudentLessonItem | null =
    activeLessonIndex > 0 ? ALL_STUDENT_LESSONS[activeLessonIndex - 1] : null;
  const nextLesson: StudentLessonItem | null =
    activeLessonIndex < ALL_STUDENT_LESSONS.length - 1
      ? ALL_STUDENT_LESSONS[activeLessonIndex + 1]
      : null;

  // Check if a lesson is locked: a lesson with requiresPrevious is locked if the preceding lesson is < 90% watched
  const isLessonLocked = (lesson: StudentLessonItem, indexInAll: number): boolean => {
    if (!lesson.requiresPrevious || indexInAll === 0) return false;
    const preceding = ALL_STUDENT_LESSONS[indexInAll - 1];
    const precedingPct = getLessonWatchPercent(course.id, preceding.id);
    return precedingPct < 90;
  };

  const isNextLessonLocked = nextLesson
    ? isLessonLocked(nextLesson, activeLessonIndex + 1)
    : false;

  // Live watch percent for the active lesson
  const watchedPercent = getLessonWatchPercent(course.id, activeLesson.id);
  const isCompleted = watchedPercent >= 90;
  const courseStats = getCourseProgressStats(course.id);

  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
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

  // Active tab below video: 'overview' | 'resources' | 'comments'
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'comments'>('comments');

  // Right sidebar collapsible sections & mobile slide-over state
  const [openSectionIds, setOpenSectionIds] = useState<string[]>(() =>
    STUDENT_COURSE_SECTIONS.map((s) => s.id)
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Comments state
  const [commentInput, setCommentInput] = useState('');
  const [commentSort, setCommentSort] = useState<'newest' | 'top'>('newest');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [openReportMenuId, setOpenReportMenuId] = useState<string | null>(null);
  const [visibleCommentsCount, setVisibleCommentsCount] = useState<number>(4);
  const [showEmptyCommentsPreview, setShowEmptyCommentsPreview] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);

  // Show "Resume from 04:12" toast on open / lesson switch
  useEffect(() => {
    const key = `${course.id}:${activeLesson.id}`;
    if (hasShownResumeToastRef.current !== key) {
      hasShownResumeToastRef.current = key;
      addToast({
        title: 'Resume from 04:12',
        message: `Continuing "${activeLesson.title}" from your last saved timestamp.`,
        variant: 'info',
      });
    }
    setIsPlaying(false);
    setJustAutoCompleted(false);
  }, [course.id, activeLesson.id, activeLesson.title, addToast]);

  // Advance watch percentage while playing, and auto-complete at 90%
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const current = getLessonWatchPercent(course.id, activeLesson.id);
      if (current >= 100) {
        setIsPlaying(false);
        return;
      }
      const step = Math.max(1, Math.round(playbackSpeed * 2));
      const next = Math.min(100, current + step);
      handleWatchPercentChange(current, next);
    }, 900);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, course.id, activeLesson.id, getLessonWatchPercent]);

  const handleWatchPercentChange = (prevPct: number, nextPct: number) => {
    updateLessonWatchPercent(course.id, activeLesson.id, nextPct);
    // Rule: At 90% watched, the lesson completes automatically with check animation + toast "Lesson completed"
    if (prevPct < 90 && nextPct >= 90) {
      setJustAutoCompleted(true);
      addToast({
        title: 'Lesson completed',
        message: `You reached ${nextPct}% watched on "${activeLesson.title}". Course progress updated!`,
        variant: 'success',
      });
    }
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!seekBarRef.current) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const targetPct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    handleWatchPercentChange(watchedPercent, targetPct);
  };

  const handleManualToggleComplete = () => {
    const nowCompleted = toggleLessonCompleted(course.id, activeLesson.id);
    if (nowCompleted) {
      setJustAutoCompleted(true);
      addToast({
        title: 'Lesson completed',
        message: `"${activeLesson.title}" marked as complete.`,
        variant: 'success',
      });
    } else {
      setJustAutoCompleted(false);
      addToast({
        title: 'Lesson marked as in progress',
        message: 'Watch progress reset so you can review again.',
        variant: 'info',
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

  // Calculate current and total time for display
  // When at 72% (default for lesson-103), show 04:12 if just opened or proportional time
  const currentSeconds =
    watchedPercent === 72
      ? 252 // 04:12
      : Math.round((watchedPercent / 100) * activeLesson.durationSeconds);
  const bufferedPercent = Math.min(100, watchedPercent + 18);

  // Filter & sort threaded comments
  const displayedComments = useMemo(() => {
    if (showEmptyCommentsPreview) return [];
    const list = threadedComments.filter(
      (c) =>
        c.status === 'approved' ||
        (c.status === 'pending' && c.authorId === 'user-student-1')
    );
    return [...list].sort((a, b) => {
      if (commentSort === 'top') return b.likesCount - a.likesCount;
      return a.timestampSeconds - b.timestampSeconds;
    });
  }, [threadedComments, commentSort, showEmptyCommentsPreview]);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    const created: ThreadedLessonComment = {
      id: `tcomment-${Date.now()}`,
      courseId: course.id,
      lessonId: activeLesson.id,
      authorId: student.id,
      authorName: student.name,
      authorAvatar: student.avatar,
      isSupervisorVerified: false,
      status: 'pending', // Yellow "Pending review" state visible only to the author
      createdAt: 'Just now',
      timestampSeconds: 1,
      content: commentInput.trim(),
      likesCount: 0,
      likedByMe: false,
      replies: [],
    };
    setThreadedComments((prev) => [created, ...prev]);
    setCommentInput('');
    setShowEmptyCommentsPreview(false);
    addToast({
      title: 'Comment submitted for review',
      message: 'Your comment is visible to you with a "Pending review" badge until approved by a supervisor.',
      variant: 'info',
    });
  };

  const handleToggleLikeComment = (commentId: string) => {
    setThreadedComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const nextLiked = !c.likedByMe;
        return {
          ...c,
          likedByMe: nextLiked,
          likesCount: nextLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1),
        };
      })
    );
  };

  const handleToggleLikeReply = (commentId: string, replyId: string) => {
    setThreadedComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        return {
          ...c,
          replies: c.replies.map((r) => {
            if (r.id !== replyId) return r;
            const nextLiked = !r.likedByMe;
            return {
              ...r,
              likedByMe: nextLiked,
              likesCount: nextLiked ? r.likesCount + 1 : Math.max(0, r.likesCount - 1),
            };
          }),
        };
      })
    );
  };

  const handlePostReply = (commentId: string) => {
    if (!replyText.trim()) return;
    setThreadedComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        return {
          ...c,
          replies: [
            ...c.replies,
            {
              id: `treply-${Date.now()}`,
              authorId: student.id,
              authorName: student.name,
              authorAvatar: student.avatar,
              isSupervisorVerified: false,
              createdAt: 'Just now',
              content: replyText.trim(),
              likesCount: 0,
              likedByMe: false,
            },
          ],
        };
      })
    );
    setReplyText('');
    setReplyingToId(null);
    addToast({
      title: 'Reply posted',
      message: 'Your reply has been added to the thread.',
      variant: 'success',
    });
  };

  const handleSaveEditedComment = (commentId: string) => {
    if (!editingText.trim()) return;
    setThreadedComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, content: editingText.trim() } : c))
    );
    setEditingCommentId(null);
    setEditingText('');
    addToast({
      title: 'Comment updated',
      message: 'Your changes have been saved.',
      variant: 'success',
    });
  };

  const handleDeleteComment = (commentId: string) => {
    setThreadedComments((prev) => prev.filter((c) => c.id !== commentId));
    addToast({
      title: 'Comment deleted',
      message: 'Your comment was removed from this lesson.',
      variant: 'info',
    });
  };

  const handleReportComment = (comment: ThreadedLessonComment, reason: string) => {
    setOpenReportMenuId(null);
    setReports((prev) => [
      {
        id: `rep-${Date.now()}`,
        targetType: 'Comment',
        targetTitle: `Comment by ${comment.authorName} in ${activeLesson.title}`,
        reportedBy: `${student.name} (Student)`,
        reason,
        severity: 'Medium',
        createdAt: 'Just now',
        status: 'Open',
      },
      ...prev,
    ]);
    addToast({
      title: 'Comment reported to supervisors',
      message: `Flagged for: ${reason}`,
      variant: 'warning',
    });
  };

  // Right Sidebar Content ("Course content") reused on Desktop and Mobile Slide-Over
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
        {STUDENT_COURSE_SECTIONS.map((sec) => {
          const isOpen = openSectionIds.includes(sec.id);
          const secCompletedCount = sec.lessons.filter(
            (l) => getLessonWatchPercent(course.id, l.id) >= 90
          ).length;

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
                    {secCompletedCount}/{sec.lessons.length} completed • {sec.subtitle.split('•')[1]}
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
                    const globalIdx = ALL_STUDENT_LESSONS.findIndex((l) => l.id === lesson.id);
                    const pct = getLessonWatchPercent(course.id, lesson.id);
                    const lessonCompleted = pct >= 90;
                    const isCurrent = lesson.id === activeLesson.id;
                    const locked = isLessonLocked(lesson, globalIdx);

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
                          setMobileSidebarOpen(false);
                          navigate(`/learn/${course.id}/${lesson.id}`);
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
                          {/* State icon: completed check, current play, locked padlock, or mini watch-progress */}
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
                              <span>{lesson.duration}</span>
                              {pct > 0 && pct < 90 && (
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

        {/* Final Exam Row at the end of the sidebar */}
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
              {course.title} Assessment
            </p>
            <p className="text-[12px] text-[#5F5B75]">
              20 multiple-choice questions • 45 mins • Instant grading
            </p>
            <Link to={`/exam/${course.id}`} className="block pt-1">
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
      {/* SLIM TOP BAR (Logo on white surface, course title, progress ring & %, "Back to course") */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E6E1F5] px-4 sm:px-6 flex items-center justify-between gap-4 shadow-purple-sm">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <BrandLogo size="sm" showText={false} />
          <div className="h-6 w-px bg-[#E6E1F5] hidden sm:block" />
          <div className="min-w-0">
            <Link
              to={`/student/progress/${course.id}`}
              className="font-display font-bold text-[16px] sm:text-[18px] text-[#1E1B2E] hover:text-[#6D4AE0] transition-colors truncate block"
            >
              {course.title}
            </Link>
            <p className="text-[12px] text-[#5F5B75] truncate hidden sm:block">
              {activeLesson.sectionTitle} • {activeLesson.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Course Progress Ring and % */}
          <Link
            to={`/student/progress/${course.id}`}
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

          {/* Mobile Slide-Over Trigger for Course Content Sidebar */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden h-9 px-3 rounded-[10px] bg-[#F3EFFF] text-[#6D4AE0] font-bold text-[13px] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <PanelRightOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Course content</span>
          </button>

          {/* Back to course button */}
          <Link to={`/student/progress/${course.id}`}>
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

      {/* MAIN FOCUSED BODY: Left Video + Tabs Column & Right "Course content" Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        {/* Main Video & Tabs Column */}
        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 focus:outline-none">
          {/* CUSTOM VIDEO PLAYER */}
          <div
            ref={playerContainerRef}
            className="rounded-[12px] bg-[#1E1B2E] text-white overflow-hidden shadow-purple-lg border border-[#E6E1F5] relative flex flex-col justify-between aspect-video"
          >
            {/* Background video frame visual */}
            <img
              src={course.thumbnail}
              alt={activeLesson.title}
              className="absolute inset-0 w-full h-full object-cover opacity-35 select-none pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B2E] via-[#1E1B2E]/35 to-[#1E1B2E]/60 pointer-events-none" />

            {/* Top overlay inside video: Lesson badge + Resume pill + Auto-complete check animation */}
            <div className="relative z-10 p-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#6D4AE0] text-white text-[12px] font-bold">
                  Lesson {activeLesson.number} of {ALL_STUDENT_LESSONS.length}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-white text-[12px] font-semibold">
                  Resumed from 04:12
                </span>
              </div>

              {isCompleted && (
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

            {/* Center Play/Pause Button & Title Overlay */}
            <div className="relative z-10 my-auto px-6 text-center space-y-3">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
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
                  [CC] “When updating complex state in React, always return a new object reference so
                  Object.is detects the transition immediately...”
                </div>
              )}
            </div>

            {/* Bottom Custom Video Controls Bar */}
            <div className="relative z-20 p-3 sm:p-4 bg-gradient-to-t from-[#1E1B2E] via-[#1E1B2E]/95 to-transparent space-y-2.5">
              {/* Seek Bar showing Buffered and Watched segments + 90% completion marker */}
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
                      handleWatchPercentChange(watchedPercent, Math.min(100, watchedPercent + 5));
                    } else if (e.key === 'ArrowLeft') {
                      handleWatchPercentChange(watchedPercent, Math.max(0, watchedPercent - 5));
                    }
                  }}
                  className="group relative h-2.5 w-full rounded-full bg-white/20 cursor-pointer flex items-center"
                >
                  {/* Buffered segment */}
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-full bg-white/40 transition-all"
                    style={{ width: `${bufferedPercent}%` }}
                  />
                  {/* Watched segment */}
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-full bg-[#6D4AE0] transition-all"
                    style={{ width: `${watchedPercent}%` }}
                  />
                  {/* 90% auto-complete threshold tick mark */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#16A34A]"
                    style={{ left: '90%' }}
                    title="90% auto-complete threshold"
                  />
                  {/* Scrubber thumb */}
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

              {/* Controls Row: Play/Pause, Time, Volume, Speed (0.5x-2x), Captions, Quality, Fullscreen */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="p-1.5 rounded-[8px] hover:bg-white/15 text-white cursor-pointer"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>

                  {/* Time */}
                  <span className="text-[13px] font-semibold text-white tabular-nums">
                    {formatSeconds(currentSeconds)}{' '}
                    <span className="text-white/60">/ {activeLesson.duration}</span>
                  </span>

                  {/* Volume */}
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

                {/* Right player controls */}
                <div className="flex items-center gap-2">
                  {/* Speed (0.5x - 2x) */}
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

                  {/* Captions toggle */}
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

                  {/* Quality selector */}
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

                  {/* Fullscreen */}
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

          {/* WATCH TRACKING BAR & LESSON NAVIGATION UNDER THE VIDEO */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-5 shadow-purple-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-[18px] text-[#1E1B2E]">
                      Watched {watchedPercent}%
                    </span>
                    {isCompleted ? (
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

                  {/* Quick simulator button to test 90% auto-completion rule immediately */}
                  {watchedPercent < 90 && (
                    <button
                      type="button"
                      onClick={() => handleWatchPercentChange(watchedPercent, 92)}
                      className="text-[12px] font-bold text-[#6D4AE0] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#F59E3B]" />
                      <span>Simulate reaching 90% watched</span>
                    </button>
                  )}
                </div>

                {/* Visual Watch Bar with 90% threshold marker */}
                <div className="relative h-3 w-full rounded-full bg-[#F3EFFF] border border-[#E6E1F5] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCompleted ? 'bg-[#16A34A]' : 'bg-[#6D4AE0]'
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

              {/* Manual "Mark as complete" toggle */}
              <div className="shrink-0">
                <Button
                  variant={isCompleted ? 'secondary' : 'primary'}
                  size="md"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={handleManualToggleComplete}
                >
                  {isCompleted ? 'Completed (Click to undo)' : 'Mark as complete'}
                </Button>
              </div>
            </div>

            {/* Previous / Next Lesson Navigation Buttons */}
            <div className="pt-4 border-t border-[#E6E1F5] flex flex-wrap items-center justify-between gap-3">
              <div>
                {prevLesson ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                    onClick={() => navigate(`/learn/${course.id}/${prevLesson.id}`)}
                  >
                    Previous: {prevLesson.title.split('.')[1]?.trim() || prevLesson.title}
                  </Button>
                ) : (
                  <span className="text-[13px] text-[#5F5B75]">First lesson in course</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {nextLesson ? (
                  <>
                    {isNextLessonLocked && (
                      <span className="text-[12px] text-[#B45309] font-semibold hidden sm:inline">
                        Complete this lesson (90%+) to unlock next
                      </span>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isNextLessonLocked}
                      leftIcon={isNextLessonLocked ? <Lock className="w-4 h-4" /> : undefined}
                      rightIcon={
                        !isNextLessonLocked ? <ChevronRight className="w-4 h-4" /> : undefined
                      }
                      onClick={() => navigate(`/learn/${course.id}/${nextLesson.id}`)}
                    >
                      Next lesson
                    </Button>
                  </>
                ) : (
                  <Link to={`/exam/${course.id}`}>
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

          {/* TABS: Overview, Resources (downloadable files), Comments */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
            <div className="px-6 pt-4 border-b border-[#E6E1F5] bg-[#FAF8FF] flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'overview', label: 'Overview' },
                  { id: 'resources', label: `Resources (${LESSON_RESOURCES.length})` },
                  { id: 'comments', label: `Comments (${displayedComments.length})` },
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
              {/* TAB 1: OVERVIEW */}
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
                    <Link to={`/student/progress/${course.id}`}>
                      <Button variant="secondary" size="sm">
                        Full progress report
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* TAB 2: RESOURCES (Downloadable files) */}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {LESSON_RESOURCES.map((res) => (
                      <div
                        key={res.id}
                        className="rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] p-4 flex items-start justify-between gap-4 hover:border-[#A78BFA] transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-[10px] bg-[#F3EFFF] text-[#6D4AE0] flex items-center justify-center shrink-0 font-display font-bold text-[12px]">
                            {res.type}
                          </div>
                          <div className="min-w-0">
                            <p className="font-display font-bold text-[15px] text-[#1E1B2E] truncate">
                              {res.title}
                            </p>
                            <p className="text-[12px] text-[#5F5B75] mt-0.5">
                              {res.description}
                            </p>
                            <span className="inline-block text-[11px] font-bold text-[#6D4AE0] mt-1">
                              {res.type} • {res.size}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                          onClick={() =>
                            addToast({
                              title: 'Downloading resource',
                              message: `${res.title} (${res.size}) saved to your device.`,
                              variant: 'success',
                            })
                          }
                        >
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: COMMENTS (Composer, Sort, Threaded replies, Likes, Edit/Delete, Verified/Pending/Instructor badges, Report, Load more, Empty state) */}
              {activeTab === 'comments' && (
                <div className="space-y-6">
                  {/* Comment Composer */}
                  <form
                    onSubmit={handlePostComment}
                    className="rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar src={student.avatar} name={student.name} size="md" />
                      <div className="flex-1 space-y-2">
                        <textarea
                          rows={3}
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="Ask a question or share an insight about this lesson..."
                          className="w-full p-3 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[14px] text-[#1E1B2E]"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[12px] text-[#5F5B75]">
                            New comments appear with a yellow "Pending review" badge until approved
                            by a supervisor.
                          </span>
                          <Button type="submit" variant="primary" size="sm">
                            Post comment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>

                  {/* Sort Toolbar (Newest, Top) + Empty State Preview Toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E6E1F5]">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#6D4AE0]" />
                      <span className="font-display font-bold text-[18px] text-[#1E1B2E]">
                        Lesson discussion ({displayedComments.length})
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

                  {/* Threaded Comments List or Empty State */}
                  {displayedComments.length === 0 ? (
                    <EmptyState
                      title="No comments on this lesson yet"
                      description="Be the first student to ask a question or share your takeaway from this video lesson."
                      actionLabel="Restore discussion"
                      onAction={() => setShowEmptyCommentsPreview(false)}
                      mood="empty"
                    />
                  ) : (
                    <div className="space-y-5">
                      {displayedComments.slice(0, visibleCommentsCount).map((comment) => {
                        const isOwn = comment.authorId === student.id;
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

                                    {/* Instructor badge */}
                                    {comment.isInstructor && (
                                      <span className="px-2.5 py-0.5 rounded-full bg-[#6D4AE0] text-white text-[11px] font-bold">
                                        Instructor
                                      </span>
                                    )}

                                    {/* Green "Verified" badge on comments approved by a supervisor */}
                                    {comment.isSupervisorVerified && !isPending && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#16A34A]/12 text-[#16A34A] text-[11px] font-bold">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        Verified
                                      </span>
                                    )}

                                    {/* Yellow "Pending review" state on the author's new comment (visible only to them) */}
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

                              {/* Edit/Delete on own comments + Report menu */}
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

                                {/* Report Menu Trigger */}
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
                                    {[
                                      'Spam or promotional link',
                                      'Disrespectful or harassment',
                                      'Off-topic or exam spoilers',
                                    ].map((reason) => (
                                      <button
                                        key={reason}
                                        type="button"
                                        onClick={() => handleReportComment(comment, reason)}
                                        className="w-full px-3 py-2 text-left text-[13px] text-[#1E1B2E] hover:bg-[#FEF2F2] hover:text-[#DC2626] flex items-center gap-2 cursor-pointer"
                                      >
                                        <Flag className="w-3.5 h-3.5 text-[#DC2626]" />
                                        <span>{reason}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Comment Body or Inline Edit Mode */}
                            {isEditing ? (
                              <div className="space-y-2 pt-1">
                                <textarea
                                  rows={3}
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="w-full p-3 rounded-[10px] bg-white border border-[#6D4AE0] text-[14px] text-[#1E1B2E] focus:outline-none"
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="primary"
                                    size="sm"
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

                            {/* Like & Reply Action Row */}
                            <div className="flex items-center gap-4 pt-1">
                              <button
                                type="button"
                                onClick={() => handleToggleLikeComment(comment.id)}
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

                            {/* Inline Reply Box (One nested level) */}
                            {isReplying && (
                              <div className="pl-4 sm:pl-8 pt-2 space-y-2">
                                <textarea
                                  rows={2}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder={`Reply to ${comment.authorName}...`}
                                  className="w-full p-2.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[13px] text-[#1E1B2E]"
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="primary"
                                    size="sm"
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

                            {/* Nested Replies (1 Level) */}
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
                                      onClick={() =>
                                        handleToggleLikeReply(comment.id, reply.id)
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

                      {/* Load more button */}
                      {displayedComments.length > 4 && (
                        <div className="pt-2 flex justify-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setVisibleCommentsCount((prev) =>
                                prev >= displayedComments.length ? 4 : displayedComments.length
                              )
                            }
                          >
                            {visibleCommentsCount >= displayedComments.length
                              ? 'Show fewer comments'
                              : `Load more comments (${
                                  displayedComments.length - visibleCommentsCount
                                } more)`}
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

        {/* RIGHT SIDEBAR "Course content" (Desktop Sticky) */}
        <aside className="hidden lg:block w-96 shrink-0 bg-white border-l border-[#E6E1F5] sticky top-16 h-[calc(100vh-4rem)] overflow-hidden">
          {renderCourseContentSidebar()}
        </aside>
      </div>

      {/* MOBILE SLIDE-OVER FOR "Course content" SIDEBAR (< lg) */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-[#1E1B2E]/55 backdrop-blur-xs">
          <div className="flex-1" onClick={() => setMobileSidebarOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Course content sidebar"
            className="w-full max-w-sm bg-white h-full shadow-purple-lg border-l border-[#E6E1F5] flex flex-col"
          >
            <div className="px-4 py-3 border-b border-[#E6E1F5] flex items-center justify-between">
              <span className="font-display font-bold text-[18px] text-[#1E1B2E]">
                Course content
              </span>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-[8px] text-[#5F5B75] hover:bg-[#F3EFFF] cursor-pointer"
                aria-label="Close course content drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{renderCourseContentSidebar()}</div>
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
        onConfirm={() => {
          if (!commentToDeleteId) return;
          handleDeleteComment(commentToDeleteId);
          setCommentToDeleteId(null);
        }}
      />
    </div>
  );
};
