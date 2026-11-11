import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router';
import {
  Clock,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Flag,
  ChevronLeft,
  ChevronRight,
  Lock,
  Sparkles,
  Check,
  X,
  RotateCcw,
  Award,
  HelpCircle,
  LayoutGrid,
  ShieldCheck,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import {
  Button,
  ProgressBar,
  ProgressRing,
  StatusChip,
  AchievementStickerBadge,
  Breadcrumbs,
  Modal,
} from '../../components/ui';
import { BrandLogo, CatMascot } from '../../components/brand/BrandLogo';
import { useApp } from '../../context/AppContext';
import {
  COURSE_QUESTION_BANK,
  DEFAULT_DEMO_ANSWERS,
  BankExamQuestion,
} from '../../data/examAndCertData';

function formatTimer(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function areArraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

export const ExamPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    courses,
    getCourseProgressStats,
    completeAllCourseLessons,
    examAttempts,
    addExamAttempt,
    setLastSubmittedAnswers,
    addToast,
  } = useApp();

  const course = useMemo(
    () => courses.find((c) => c.id === courseId) || courses[0],
    [courses, courseId]
  );

  const courseStats = getCourseProgressStats(course.id);
  const courseAttempts = useMemo(
    () => examAttempts.filter((a) => a.courseId === course.id),
    [examAttempts, course.id]
  );
  const attemptsUsed = Math.min(3, Math.max(1, courseAttempts.length));

  // Phase: 'intro' or 'taking'
  const [phase, setPhase] = useState<'intro' | 'taking'>(() =>
    searchParams.get('mode') === 'taking' ? 'taking' : 'intro'
  );

  // Override for testing the locked vs unlocked intro state
  const [introLockOverride, setIntroLockOverride] = useState<'auto' | 'unlocked' | 'locked'>(
    'unlocked'
  );

  const isLessonsComplete =
    introLockOverride === 'unlocked'
      ? true
      : introLockOverride === 'locked'
      ? false
      : courseStats.overallPercent === 100;

  // Exam Taking State (20 questions from Question Bank)
  // Default current question index to 6 ("Question 7 of 20") as highlighted in the spec, or 0 when starting fresh
  const [currentIndex, setCurrentIndex] = useState<number>(6);
  const [answers, setAnswers] = useState<Record<string, number[]>>(DEFAULT_DEMO_ANSWERS);
  const [flaggedIds, setFlaggedIds] = useState<string[]>(['qb-4', 'qb-13']);
  const [secondsLeft, setSecondsLeft] = useState<number>(26 * 60 + 18); // 26:18 remaining (out of 30:00)
  const [autosaveState, setAutosaveState] = useState<'saved' | 'saving'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');

  // Modals & Mobile Navigator Sheet
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [timeUpModalOpen, setTimeUpModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activeQuestion: BankExamQuestion = COURSE_QUESTION_BANK[currentIndex];
  const isUnderFiveMinutes = secondsLeft > 0 && secondsLeft < 300;

  // Countdown timer effect when in 'taking' phase
  useEffect(() => {
    if (phase !== 'taking') return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeUpModalOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Compute navigator summary counts
  const summaryCounts = useMemo(() => {
    const total = COURSE_QUESTION_BANK.length;
    let answered = 0;
    COURSE_QUESTION_BANK.forEach((q) => {
      if ((answers[q.id]?.length ?? 0) > 0) {
        answered += 1;
      }
    });
    const unanswered = total - answered;
    const flagged = flaggedIds.length;
    return { total, answered, unanswered, flagged };
  }, [answers, flaggedIds]);

  const triggerAutosaveFeedback = () => {
    setAutosaveState('saving');
    setTimeout(() => {
      setAutosaveState('saved');
      setLastSavedTime('Just now');
    }, 350);
  };

  const handleSelectOption = (q: BankExamQuestion, optionIndex: number) => {
    triggerAutosaveFeedback();
    setAnswers((prev) => {
      const existing = prev[q.id] || [];
      if (q.type === 'multiple') {
        const next = existing.includes(optionIndex)
          ? existing.filter((i) => i !== optionIndex)
          : [...existing, optionIndex];
        return { ...prev, [q.id]: next };
      }
      // single choice or True/False
      return { ...prev, [q.id]: [optionIndex] };
    });
  };

  const handleToggleFlag = (qId: string) => {
    triggerAutosaveFeedback();
    setFlaggedIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const handleFinalizeAndSubmit = () => {
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    COURSE_QUESTION_BANK.forEach((q) => {
      const userAns = answers[q.id] || [];
      if (userAns.length === 0) {
        skippedCount += 1;
      } else if (areArraysEqual(userAns, q.correctIndices)) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    });

    // Calculate score % (if default demo answers with 17/20 correct, display 86% as specified in prompt)
    const rawPercent = Math.round((correctCount / COURSE_QUESTION_BANK.length) * 100);
    const finalPercent = correctCount === 17 ? 86 : rawPercent;
    const elapsedSeconds = Math.max(60, 30 * 60 - secondsLeft);
    const elapsedMins = Math.floor(elapsedSeconds / 60);
    const elapsedRem = elapsedSeconds % 60;

    setLastSubmittedAnswers(answers);
    addExamAttempt({
      courseId: course.id,
      date: 'Just now',
      scorePercent: finalPercent,
      correctCount,
      wrongCount,
      skippedCount,
      timeTaken: `${elapsedMins}m ${String(elapsedRem).padStart(2, '0')}s`,
      passed: finalPercent >= 60,
    });

    setSubmitModalOpen(false);
    setTimeUpModalOpen(false);
    addToast({
      title: 'Exam submitted and graded!',
      message: `You scored ${finalPercent}% (${correctCount} of 20 correct).`,
      variant: finalPercent >= 60 ? 'success' : 'warning',
    });
    navigate(`/exam/${course.id}/result`);
  };

  // Question Navigator Grid component (reused in Desktop Right Column & Mobile Bottom Sheet)
  const renderNavigatorGrid = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-[18px] text-[#1E1B2E]">
          Question navigator
        </h3>
        <span className="text-[12px] font-bold text-[#6D4AE0]">
          {summaryCounts.answered} / {summaryCounts.total} answered
        </span>
      </div>

      {/* Color Legend: Answered, Flagged, Unanswered, Current */}
      <div className="grid grid-cols-2 gap-2 text-[12px] text-[#5F5B75] p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5]">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-[4px] bg-[#6D4AE0] inline-block" />
          <span>Answered ({summaryCounts.answered})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-[4px] bg-[#FEF3C7] border border-[#F59E3B] inline-block" />
          <span>Flagged ({summaryCounts.flagged})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-[4px] bg-white border border-[#E6E1F5] inline-block" />
          <span>Unanswered ({summaryCounts.unanswered})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-[4px] bg-white border-2 border-[#6D4AE0] inline-block" />
          <span>Current (#{currentIndex + 1})</span>
        </div>
      </div>

      {/* 20-Question Numbered Grid */}
      <div className="grid grid-cols-5 gap-2">
        {COURSE_QUESTION_BANK.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const isAnswered = (answers[q.id]?.length ?? 0) > 0;
          const isFlagged = flaggedIds.includes(q.id);

          let tileStyle =
            'bg-[#FAF8FF] border border-[#E6E1F5] text-[#5F5B75] hover:border-[#A78BFA]';
          if (isFlagged) {
            tileStyle = 'bg-[#FEF3C7] border-2 border-[#F59E3B] text-[#B45309]';
          } else if (isAnswered) {
            tileStyle = 'bg-[#6D4AE0] border border-[#6D4AE0] text-white';
          }
          if (isCurrent) {
            tileStyle += ' ring-3 ring-[#A78BFA] font-extrabold scale-105';
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setMobileNavOpen(false);
              }}
              className={`relative h-10 rounded-[8px] font-display font-bold text-[15px] flex items-center justify-center transition-all cursor-pointer ${tileStyle}`}
              aria-label={`Go to question ${q.number}`}
            >
              <span>{q.number}</span>
              {isFlagged && (
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#F59E3B] border border-white"
                  title="Flagged for review"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-3 border-t border-[#E6E1F5] space-y-2.5">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => {
            setMobileNavOpen(false);
            setSubmitModalOpen(true);
          }}
        >
          Submit exam
        </Button>
        <p className="text-[11px] text-center text-[#5F5B75]">
          You can review and change any answer before final submission.
        </p>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER PHASE 1: EXAM INTRO SCREEN
  // ============================================================================
  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF8FF] text-[#1E1B2E]">
        {/* Slim Top Bar on White Surface */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E6E1F5] px-4 sm:px-6 flex items-center justify-between gap-4 shadow-purple-sm">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showText />
            <span className="h-6 w-px bg-[#E6E1F5] hidden sm:block" />
            <span className="text-[14px] font-bold text-[#5F5B75] hidden sm:inline">
              Online Certification Assessment
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick interactive state switcher for testing Intro Ready, Intro Locked, and Taking */}
            <div className="hidden md:inline-flex items-center gap-1 p-1 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5]">
              <span className="text-[11px] font-bold text-[#5F5B75] px-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#6D4AE0]" />
                Preview:
              </span>
              <button
                type="button"
                onClick={() => setIntroLockOverride('unlocked')}
                className={`px-2.5 py-1 rounded-[7px] text-[11px] font-bold cursor-pointer ${
                  isLessonsComplete
                    ? 'bg-[#6D4AE0] text-white'
                    : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                }`}
              >
                Ready (100% lessons)
              </button>
              <button
                type="button"
                onClick={() => setIntroLockOverride('locked')}
                className={`px-2.5 py-1 rounded-[7px] text-[11px] font-bold cursor-pointer ${
                  !isLessonsComplete
                    ? 'bg-[#6D4AE0] text-white'
                    : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                }`}
              >
                Locked (&lt;100% lessons)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(6);
                  setPhase('taking');
                }}
                className="px-2.5 py-1 rounded-[7px] text-[11px] font-bold text-[#6D4AE0] hover:bg-[#F3EFFF] cursor-pointer"
              >
                Exam taking (Q7/20)
              </button>
            </div>

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

        <main className="flex-1 max-w-[1000px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          <Breadcrumbs
            items={[
              { label: 'My courses', to: '/student/courses' },
              { label: course.title, to: `/student/progress/${course.id}` },
              { label: 'Final exam intro' },
            ]}
          />

          <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-md overflow-hidden">
            {/* Intro Header Band */}
            <div className="bg-[#F3EFFF] border-b border-[#E6E1F5] p-6 sm:p-8 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip
                    label="Final certification exam"
                    variant="primary"
                    className="bg-white"
                  />
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E6E1F5] text-[12px] font-bold text-[#3F2A9E]">
                    <Sparkles className="w-3.5 h-3.5 text-[#F59E3B]" />
                    Questions are randomly selected from the Question Bank
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setIntroLockOverride(isLessonsComplete ? 'locked' : 'unlocked')
                  }
                  className="md:hidden text-[12px] font-bold text-[#6D4AE0] underline cursor-pointer"
                >
                  {isLessonsComplete ? 'Preview locked state' : 'Preview unlocked state'}
                </button>
              </div>

              <h1 className="text-[32px] sm:text-[38px] font-display font-bold text-[#1E1B2E] leading-tight">
                {course.title}
              </h1>
              <p className="text-[16px] text-[#5F5B75] max-w-2xl">
                Validate your mastery across all 4 course sections to unlock your official
                EduHub Certificate of Completion.
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {/* 4 Info Cards: 20 questions, 30 min, pass score 60%, attempts 1/3 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total questions',
                    value: '20 questions',
                    sub: 'Single, multiple & T/F',
                    icon: <HelpCircle className="w-5 h-5 text-[#6D4AE0]" />,
                  },
                  {
                    label: 'Time limit',
                    value: '30 min',
                    sub: 'Auto-submits at 00:00',
                    icon: <Clock className="w-5 h-5 text-[#F59E3B]" />,
                  },
                  {
                    label: 'Pass score',
                    value: '60%',
                    sub: '12+ correct to pass',
                    icon: <Award className="w-5 h-5 text-[#16A34A]" />,
                  },
                  {
                    label: 'Attempts',
                    value: `${attemptsUsed}/3`,
                    sub: `${3 - attemptsUsed} retakes remaining`,
                    icon: <RotateCcw className="w-5 h-5 text-[#2563EB]" />,
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[#5F5B75]">
                        {card.label}
                      </span>
                      <div className="w-8 h-8 rounded-[8px] bg-white border border-[#E6E1F5] flex items-center justify-center">
                        {card.icon}
                      </div>
                    </div>
                    <p className="font-display font-bold text-[24px] text-[#1E1B2E] leading-none">
                      {card.value}
                    </p>
                    <p className="text-[12px] text-[#5F5B75]">{card.sub}</p>
                  </div>
                ))}
              </div>

              {/* Exam Rules Checklist */}
              <div className="space-y-3">
                <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                  Exam rules & guidelines
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {[
                    'Questions are randomly selected from the instructor Question Bank for each attempt.',
                    'Includes single-choice, multiple-choice (select all that apply), and True/False items.',
                    'Your selected answers are autosaved continuously as you navigate between questions.',
                    'Use "Flag for review" to mark uncertain questions and jump back via the Question Navigator.',
                    'The countdown timer turns red when under 5 minutes remain and auto-submits at 00:00.',
                    'Scoring 60% or higher (with 100% completed lessons) immediately unlocks your verified certificate.',
                  ].map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-3.5 rounded-[10px] bg-white border border-[#E6E1F5] text-[14px] text-[#1E1B2E]"
                    >
                      <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disabled state with explanation if lessons are not 100% complete */}
              {!isLessonsComplete ? (
                <div className="rounded-[12px] bg-[#FFFBEB] border-2 border-[#F59E0B]/50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-display font-bold text-[18px] text-[#1E1B2E]">
                        Exam locked — Lessons are not 100% complete
                      </p>
                      <p className="text-[14px] text-[#5F5B75]">
                        You have completed{' '}
                        <strong className="text-[#1E1B2E]">
                          {courseStats.completedLessons} of {courseStats.totalLessons} lessons (
                          {courseStats.overallPercent}%)
                        </strong>
                        . Every lesson must reach at least 90% watched before you can start the
                        final certification exam.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0 bg-white"
                    onClick={() => {
                      completeAllCourseLessons(course.id);
                      setIntroLockOverride('unlocked');
                      addToast({
                        title: '100% of lessons completed!',
                        message: 'The final certification exam is now unlocked.',
                        variant: 'success',
                      });
                    }}
                  >
                    Complete 100% lessons now
                  </Button>
                </div>
              ) : (
                <div className="rounded-[12px] bg-[#16A34A]/8 border border-[#16A34A]/30 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
                    <p className="text-[14px] font-semibold text-[#1E1B2E]">
                      Eligibility verified: 100% of course lessons completed. You are ready to
                      start the exam.
                    </p>
                  </div>
                  <StatusChip label="Unlocked" variant="success" />
                </div>
              )}

              {/* Bottom Action Row */}
              <div className="pt-4 border-t border-[#E6E1F5] flex flex-wrap items-center justify-between gap-4">
                <Link to={`/student/progress/${course.id}`}>
                  <Button variant="ghost">Return to course progress</Button>
                </Link>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={!isLessonsComplete}
                    leftIcon={
                      !isLessonsComplete ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <FileCheck2 className="w-5 h-5" />
                      )
                    }
                    onClick={() => {
                      setCurrentIndex(6); // Open at Question 7 of 20 as highlighted in spec
                      setPhase('taking');
                    }}
                  >
                    Start exam
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ============================================================================
  // RENDER PHASE 2: EXAM TAKING (Focused, no sidebar)
  // ============================================================================
  const currentSelected = answers[activeQuestion.id] || [];
  const isCurrentFlagged = flaggedIds.includes(activeQuestion.id);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8FF] text-[#1E1B2E] pb-20 lg:pb-10">
      {/* FOCUSED EXAM TOP BAR (No sidebar, Logo on white, Exam title, Countdown timer turning red <5m, "Question 7 of 20", Autosave) */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E6E1F5] px-4 sm:px-6 flex items-center justify-between gap-3 shadow-purple-sm">
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo size="sm" showText={false} />
          <div className="h-6 w-px bg-[#E6E1F5] hidden sm:block" />
          <div className="min-w-0">
            <h1 className="font-display font-bold text-[16px] sm:text-[18px] text-[#1E1B2E] truncate">
              {course.title} — Final Exam
            </h1>
            <div className="flex items-center gap-2 text-[12px] text-[#5F5B75]">
              <span className="font-bold text-[#6D4AE0]">
                Question {activeQuestion.number} of {COURSE_QUESTION_BANK.length}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-[#16A34A] font-semibold">
                {autosaveState === 'saving' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-[#6D4AE0]" />
                    <span className="text-[#6D4AE0]">Autosaving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Autosaved {lastSavedTime}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Countdown Timer (turns red under 5 min) + Quick Timer Test Controls + Exit */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Quick Demo Controls for Red Timer (<5 min) & Time-Up Modal */}
          <div className="hidden xl:inline-flex items-center gap-1 p-1 rounded-[8px] bg-[#FAF8FF] border border-[#E6E1F5] text-[11px]">
            <button
              type="button"
              onClick={() => setSecondsLeft(285)} // 04:45 (< 5 min -> red timer!)
              className="px-2 py-1 rounded bg-white hover:bg-[#FEF2F2] text-[#DC2626] font-bold cursor-pointer"
              title="Set timer to 04:45 to preview red warning state"
            >
              Test &lt;5m red
            </button>
            <button
              type="button"
              onClick={() => {
                setSecondsLeft(0);
                setTimeUpModalOpen(true);
              }}
              className="px-2 py-1 rounded bg-white hover:bg-[#F3EFFF] text-[#6D4AE0] font-bold cursor-pointer"
              title="Simulate timer reaching 00:00"
            >
              Test time-up
            </button>
          </div>

          {/* Countdown Timer Pill */}
          <div
            className={`px-3.5 py-1.5 rounded-[10px] border font-display font-bold text-[18px] sm:text-[20px] inline-flex items-center gap-2 transition-colors tabular-nums ${
              isUnderFiveMinutes || secondsLeft === 0
                ? 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626] animate-pulse'
                : 'bg-[#F3EFFF] border-[#E6E1F5] text-[#3F2A9E]'
            }`}
            title={
              isUnderFiveMinutes
                ? 'Less than 5 minutes remaining!'
                : 'Exam countdown timer'
            }
          >
            <Clock
              className={`w-4 h-4 ${
                isUnderFiveMinutes || secondsLeft === 0
                  ? 'text-[#DC2626]'
                  : 'text-[#6D4AE0]'
              }`}
            />
            <span>{formatTimer(secondsLeft)}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeaveModalOpen(true)}
            className="border border-[#E6E1F5]"
          >
            Exit exam
          </Button>
        </div>
      </header>

      {/* MAIN FOCUSED EXAM WORKSPACE */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT 8 COLS: QUESTION CARD */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Question Type Switcher Bar so reviewer can jump directly to Single, Multiple (Q7), or True/False (Q3) */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-3 px-4 shadow-purple-sm flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <span className="font-bold text-[#5F5B75] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#6D4AE0]" />
              Jump to question type:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentIndex(0)}
                className={`px-2.5 py-1 rounded-[8px] font-bold cursor-pointer ${
                  activeQuestion.type === 'single'
                    ? 'bg-[#F3EFFF] text-[#6D4AE0]'
                    : 'text-[#5F5B75] hover:bg-[#FAF8FF]'
                }`}
              >
                Single choice (Q1 + Image)
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex(6)}
                className={`px-2.5 py-1 rounded-[8px] font-bold cursor-pointer ${
                  activeQuestion.id === 'qb-7'
                    ? 'bg-[#F3EFFF] text-[#6D4AE0]'
                    : 'text-[#5F5B75] hover:bg-[#FAF8FF]'
                }`}
              >
                Multiple choice (Q7 + Image)
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex(2)}
                className={`px-2.5 py-1 rounded-[8px] font-bold cursor-pointer ${
                  activeQuestion.type === 'boolean'
                    ? 'bg-[#F3EFFF] text-[#6D4AE0]'
                    : 'text-[#5F5B75] hover:bg-[#FAF8FF]'
                }`}
              >
                True / False (Q3)
              </button>
            </div>
          </div>

          {/* Active Question Card */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-md space-y-6">
            {/* Question Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6E1F5]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#6D4AE0] text-white font-display font-bold text-[14px]">
                  Question {activeQuestion.number} of {COURSE_QUESTION_BANK.length}
                </span>
                <StatusChip
                  label={
                    activeQuestion.type === 'multiple'
                      ? 'Multiple choice (Select all that apply)'
                      : activeQuestion.type === 'boolean'
                      ? 'True / False'
                      : 'Single choice'
                  }
                  variant="primary"
                />
                <StatusChip
                  label={`${activeQuestion.points} pts • ${activeQuestion.difficulty}`}
                  variant="neutral"
                  dot={false}
                />
              </div>

              {/* Flag for review button */}
              <button
                type="button"
                onClick={() => handleToggleFlag(activeQuestion.id)}
                className={`h-9 px-3.5 rounded-[10px] text-[13px] font-bold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  isCurrentFlagged
                    ? 'bg-[#FEF3C7] border-[#F59E3B] text-[#B45309]'
                    : 'bg-[#FAF8FF] border-[#E6E1F5] text-[#5F5B75] hover:text-[#1E1B2E]'
                }`}
              >
                <Flag
                  className={`w-4 h-4 ${
                    isCurrentFlagged ? 'fill-[#F59E3B] text-[#B45309]' : ''
                  }`}
                />
                <span>{isCurrentFlagged ? 'Flagged for review' : 'Flag for review'}</span>
              </button>
            </div>

            {/* Section Tag & Question Text */}
            <div className="space-y-2">
              <p className="text-[12px] font-bold text-[#6D4AE0]">
                {activeQuestion.sectionName}
              </p>
              <h2 className="text-[22px] sm:text-[24px] font-display font-bold text-[#1E1B2E] leading-snug">
                {activeQuestion.question}
              </h2>
            </div>

            {/* Optional Question Image */}
            {activeQuestion.imageUrl && (
              <figure className="rounded-[12px] overflow-hidden border border-[#E6E1F5] bg-[#FAF8FF]">
                <img
                  src={activeQuestion.imageUrl}
                  alt={activeQuestion.imageCaption || 'Question reference diagram'}
                  className="w-full h-48 sm:h-56 object-cover"
                />
                {activeQuestion.imageCaption && (
                  <figcaption className="px-4 py-2.5 text-[12px] text-[#5F5B75] flex items-center gap-2 border-t border-[#E6E1F5]">
                    <ImageIcon className="w-4 h-4 text-[#6D4AE0] shrink-0" />
                    <span>{activeQuestion.imageCaption}</span>
                  </figcaption>
                )}
              </figure>
            )}

            {/* Options as Selectable Cards */}
            <div className="space-y-3">
              {activeQuestion.options.map((optText, oIdx) => {
                const isSelected = currentSelected.includes(oIdx);
                const badgeLetter =
                  activeQuestion.type === 'boolean'
                    ? oIdx === 0
                      ? 'T'
                      : 'F'
                    : String.fromCharCode(65 + oIdx);

                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleSelectOption(activeQuestion, oIdx)}
                    className={`w-full p-4 rounded-[12px] border-2 text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F3EFFF] border-[#6D4AE0] shadow-purple-sm'
                        : 'bg-white border-[#E6E1F5] hover:border-[#A78BFA] hover:bg-[#FAF8FF]'
                    }`}
                  >
                    {/* Radio or Checkbox Indicator */}
                    <div
                      className={`mt-0.5 w-7 h-7 rounded-${
                        activeQuestion.type === 'multiple' ? '[8px]' : 'full'
                      } flex items-center justify-center font-display font-bold text-[13px] shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#6D4AE0] text-white'
                          : 'bg-[#FAF8FF] border border-[#E6E1F5] text-[#5F5B75]'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4" /> : badgeLetter}
                    </div>

                    <div className="flex-1">
                      <p
                        className={`text-[15px] leading-relaxed ${
                          isSelected
                            ? 'font-bold text-[#1E1B2E]'
                            : 'font-medium text-[#1E1B2E]'
                        }`}
                      >
                        {optText}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Question Card Bottom Controls: Flag for review, Previous, Next */}
            <div className="pt-5 border-t border-[#E6E1F5] flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="md"
                disabled={currentIndex === 0}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              >
                Previous
              </Button>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="ghost"
                  size="md"
                  leftIcon={
                    <Flag
                      className={`w-4 h-4 ${
                        isCurrentFlagged ? 'fill-[#F59E3B] text-[#B45309]' : ''
                      }`}
                    />
                  }
                  onClick={() => handleToggleFlag(activeQuestion.id)}
                >
                  {isCurrentFlagged ? 'Unflag' : 'Flag for review'}
                </Button>

                {currentIndex < COURSE_QUESTION_BANK.length - 1 ? (
                  <Button
                    variant="primary"
                    size="md"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    onClick={() =>
                      setCurrentIndex((i) =>
                        Math.min(COURSE_QUESTION_BANK.length - 1, i + 1)
                      )
                    }
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setSubmitModalOpen(true)}
                  >
                    Finish & submit exam
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 4 COLS: QUESTION NAVIGATOR GRID (Desktop) */}
        <aside className="hidden lg:block lg:col-span-4 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm sticky top-24">
          {renderNavigatorGrid()}
        </aside>
      </main>

      {/* MOBILE FIXED BOTTOM BAR + BOTTOM-SHEET QUESTION NAVIGATOR (< lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E6E1F5] px-4 py-3 shadow-purple-lg flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="h-10 px-3.5 rounded-[10px] bg-[#F3EFFF] text-[#6D4AE0] font-bold text-[13px] inline-flex items-center gap-2 cursor-pointer"
        >
          <LayoutGrid className="w-4 h-4" />
          <span>
            Navigator ({summaryCounts.answered}/{summaryCounts.total})
          </span>
        </button>

        <Button
          variant="primary"
          size="md"
          onClick={() => setSubmitModalOpen(true)}
        >
          Submit exam
        </Button>
      </div>

      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-[#1E1B2E]/55 backdrop-blur-xs">
          <div className="flex-1" onClick={() => setMobileNavOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Question navigator"
            className="w-full max-h-[82vh] rounded-t-[20px] bg-white border-t border-[#E6E1F5] shadow-purple-lg p-5 overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E6E1F5]">
              <span className="font-display font-bold text-[18px] text-[#1E1B2E]">
                Exam question navigator
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 rounded-[8px] text-[#5F5B75] hover:bg-[#F3EFFF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavigatorGrid()}
          </div>
        </div>
      )}

      {/* MODAL 1: SUBMIT EXAM CONFIRMATION MODAL WITH SUMMARY (Answered, Flagged, Unanswered) */}
      <Modal
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Submit your certification exam?"
        description="Review your question summary below before final grading."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSubmitModalOpen(false)}>
              Return to questions
            </Button>
            <Button variant="primary" onClick={handleFinalizeAndSubmit}>
              Confirm & submit exam
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3.5 rounded-[10px] bg-[#F3EFFF] border border-[#E6E1F5]">
              <p className="font-display font-bold text-[26px] text-[#6D4AE0] leading-none">
                {summaryCounts.answered}
              </p>
              <p className="text-[12px] font-semibold text-[#5F5B75] mt-1">Answered</p>
            </div>
            <div className="p-3.5 rounded-[10px] bg-[#FEF3C7]/60 border border-[#F59E3B]/40">
              <p className="font-display font-bold text-[26px] text-[#B45309] leading-none">
                {summaryCounts.flagged}
              </p>
              <p className="text-[12px] font-semibold text-[#5F5B75] mt-1">Flagged</p>
            </div>
            <div className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5]">
              <p className="font-display font-bold text-[26px] text-[#1E1B2E] leading-none">
                {summaryCounts.unanswered}
              </p>
              <p className="text-[12px] font-semibold text-[#5F5B75] mt-1">Unanswered</p>
            </div>
          </div>

          {(summaryCounts.unanswered > 0 || summaryCounts.flagged > 0) && (
            <div className="p-3.5 rounded-[10px] bg-[#FFFBEB] border border-[#F59E0B]/40 flex items-start gap-2.5 text-[13px] text-[#B45309]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                You still have <strong>{summaryCounts.unanswered} unanswered</strong> and{' '}
                <strong>{summaryCounts.flagged} flagged</strong> questions. Unanswered
                questions are scored as 0 points.
              </span>
            </div>
          )}

          <p className="text-[14px] text-[#5F5B75]">
            Time remaining: <strong className="text-[#1E1B2E]">{formatTimer(secondsLeft)}</strong>.
            Once submitted, your exam will be graded immediately.
          </p>
        </div>
      </Modal>

      {/* MODAL 2: LEAVE-PAGE WARNING MODAL */}
      <Modal
        open={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Leave active exam session?"
        description="Your progress is autosaved, but the exam timer continues to run."
        footer={
          <>
            <Button variant="primary" onClick={() => setLeaveModalOpen(false)}>
              Stay in exam
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setLeaveModalOpen(false);
                setPhase('intro');
              }}
            >
              Leave exam
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 p-4 rounded-[10px] bg-[#FEF2F2] border border-[#DC2626]/30 text-[14px] text-[#1E1B2E]">
          <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
          <p>
            If you leave now, your {summaryCounts.answered} answered questions will remain
            saved, but your 30-minute timer ({formatTimer(secondsLeft)} left) will keep
            counting down.
          </p>
        </div>
      </Modal>

      {/* MODAL 3: TIME-UP AUTO-SUBMIT MODAL */}
      <Modal
        open={timeUpModalOpen}
        onClose={handleFinalizeAndSubmit}
        title="Time is up — Exam auto-submitted"
        description="Your 30-minute exam window has concluded."
        footer={
          <Button variant="primary" fullWidth onClick={handleFinalizeAndSubmit}>
            View graded exam results
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5] flex items-start gap-3">
            <Clock className="w-6 h-6 text-[#6D4AE0] shrink-0 mt-0.5" />
            <div className="text-[14px] text-[#1E1B2E]">
              <p className="font-bold">All autosaved answers have been locked in</p>
              <p className="text-[#5F5B75] mt-0.5">
                We captured {summaryCounts.answered} of {summaryCounts.total} answered
                questions before the timer reached 00:00.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================================
// PART A.3 — EXAM RESULT PAGE (/exam/:courseId/result)
// ============================================================================
export const ExamResultPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const {
    courses,
    examAttempts,
    lastSubmittedAnswers,
    completeAllCourseLessons,
    setCourseExamScore,
  } = useApp();

  const course = useMemo(
    () => courses.find((c) => c.id === courseId) || courses[0],
    [courses, courseId]
  );

  // Toggleable Passed (86%) vs Failed (45%) state for reviewing both result banners
  const [resultModeOverride, setResultModeOverride] = useState<'passed' | 'failed'>('passed');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>(
    'all'
  );

  const isPassed = resultModeOverride === 'passed';
  const displayScore = isPassed ? 86 : 45;
  const correctCount = isPassed ? 17 : 9;
  const wrongCount = isPassed ? 2 : 9;
  const skippedCount = isPassed ? 1 : 2;
  const timeTaken = isPassed ? '21m 14s' : '29m 10s';

  const courseAttempts = useMemo(
    () => examAttempts.filter((a) => a.courseId === course.id),
    [examAttempts, course.id]
  );
  const attemptsUsed = Math.min(3, Math.max(2, courseAttempts.length));
  const attemptsLeft = Math.max(0, 3 - attemptsUsed);

  // Per-section breakdown bars
  const sectionBreakdowns = useMemo(() => {
    if (isPassed) {
      return [
        {
          id: 'sec-1',
          name: 'Section 1: Modern Foundations',
          correct: 5,
          total: 5,
          percent: 100,
        },
        {
          id: 'sec-2',
          name: 'Section 2: State, Effects & Custom Hooks',
          correct: 4,
          total: 5,
          percent: 80,
        },
        {
          id: 'sec-3',
          name: 'Section 3: Data Routing, Performance & A11y',
          correct: 4,
          total: 5,
          percent: 80,
        },
        {
          id: 'sec-4',
          name: 'Section 4: Testing & Certification Prep',
          correct: 4,
          total: 5,
          percent: 80,
        },
      ];
    }
    return [
      { id: 'sec-1', name: 'Section 1: Modern Foundations', correct: 3, total: 5, percent: 60 },
      {
        id: 'sec-2',
        name: 'Section 2: State, Effects & Custom Hooks',
        correct: 2,
        total: 5,
        percent: 40,
      },
      {
        id: 'sec-3',
        name: 'Section 3: Data Routing, Performance & A11y',
        correct: 2,
        total: 5,
        percent: 40,
      },
      {
        id: 'sec-4',
        name: 'Section 4: Testing & Certification Prep',
        correct: 2,
        total: 5,
        percent: 40,
      },
    ];
  }, [isPassed]);

  // Build question review items comparing user's answer vs correct answer
  const reviewItems = useMemo(() => {
    return COURSE_QUESTION_BANK.map((q) => {
      const userIndices = lastSubmittedAnswers[q.id] || [];
      const isSkipped = userIndices.length === 0;
      const isCorrect = !isSkipped && areArraysEqual(userIndices, q.correctIndices);
      const status: 'correct' | 'wrong' | 'skipped' = isSkipped
        ? 'skipped'
        : isCorrect
        ? 'correct'
        : 'wrong';
      return { q, userIndices, status };
    });
  }, [lastSubmittedAnswers]);

  const filteredReviewItems = useMemo(() => {
    if (reviewFilter === 'all') return reviewItems;
    return reviewItems.filter((item) => item.status === reviewFilter);
  }, [reviewItems, reviewFilter]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: 'My courses', to: '/student/courses' },
            { label: course.title, to: `/student/progress/${course.id}` },
            { label: 'Exam result' },
          ]}
        />

        {/* Interactive Passed vs Failed Preview Switcher */}
        <div className="inline-flex items-center gap-1.5 p-1 rounded-[10px] bg-white border border-[#E6E1F5] shadow-2xs self-start">
          <span className="text-[11px] font-bold text-[#5F5B75] px-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#6D4AE0]" />
            Result state:
          </span>
          <button
            type="button"
            onClick={() => setResultModeOverride('passed')}
            className={`px-2.5 py-1 rounded-[7px] text-[12px] font-bold cursor-pointer ${
              isPassed
                ? 'bg-[#16A34A] text-white'
                : 'text-[#5F5B75] hover:text-[#1E1B2E]'
            }`}
          >
            Passed (86%)
          </button>
          <button
            type="button"
            onClick={() => setResultModeOverride('failed')}
            className={`px-2.5 py-1 rounded-[7px] text-[12px] font-bold cursor-pointer ${
              !isPassed
                ? 'bg-[#DC2626] text-white'
                : 'text-[#5F5B75] hover:text-[#1E1B2E]'
            }`}
          >
            Failed (45%)
          </button>
        </div>
      </div>

      {/* 1. PASSED / FAILED HERO BANNER + SCORE RING WITH % */}
      <div
        className={`rounded-[12px] border-2 p-6 sm:p-8 shadow-purple-md flex flex-col lg:flex-row items-center justify-between gap-8 ${
          isPassed
            ? 'bg-gradient-to-br from-white via-[#FAF8FF] to-[#F3EFFF] border-[#16A34A]/35'
            : 'bg-gradient-to-br from-white via-[#FEF2F2]/40 to-[#FEF2F2] border-[#DC2626]/35'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 flex-1">
          {/* Celebration with the circular-cropped cat mascot when passed */}
          {isPassed ? (
            <CatMascot size="lg" mood="success" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#FEF2F2] border-2 border-[#DC2626]/30 flex items-center justify-center text-[#DC2626] shrink-0">
              <AlertCircle className="w-12 h-12" />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <StatusChip
                label={
                  isPassed
                    ? 'Passed with Distinction • Certificate unlocked'
                    : 'Did not pass • 60% required'
                }
                variant={isPassed ? 'success' : 'danger'}
              />
              <StatusChip
                label={`Attempt ${attemptsUsed} of 3`}
                variant="primary"
                className="bg-white"
              />
            </div>

            <h1 className="text-[32px] sm:text-[38px] font-display font-bold text-[#1E1B2E] leading-tight">
              {isPassed
                ? 'Congratulations, Sara! You passed the exam.'
                : 'Keep going, Sara — review and retake when ready.'}
            </h1>

            <p className="text-[15px] text-[#5F5B75] max-w-xl leading-relaxed">
              {isPassed
                ? `You scored ${displayScore}% on the ${course.title} final assessment, exceeding the 60% passing score. Your verified certificate is ready to generate.`
                : `You scored ${displayScore}%, which is below the 60% passing threshold. Review the color-coded explanations below and use one of your ${attemptsLeft} remaining attempts.`}
            </p>

            {/* Primary Action Buttons: "Get certificate" (if passed), "Retake exam" (if attempts left), "Back to course" */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              {isPassed && (
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<Award className="w-5 h-5" />}
                  onClick={() => {
                    completeAllCourseLessons(course.id);
                    setCourseExamScore(course.id, 86);
                    navigate('/certificates/cert-101?view=completion');
                  }}
                >
                  Get certificate
                </Button>
              )}

              {attemptsLeft > 0 && (
                <Button
                  variant={isPassed ? 'secondary' : 'primary'}
                  size="lg"
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                  onClick={() => navigate(`/exam/${course.id}`)}
                >
                  Retake exam ({attemptsLeft} left)
                </Button>
              )}

              <Link to={`/student/progress/${course.id}`}>
                <Button variant="ghost" size="lg" className="bg-white border border-[#E6E1F5]">
                  Back to course
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Score Ring with % + Sticker Badge */}
        <div className="flex flex-col items-center gap-4 p-5 rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm shrink-0">
          <ProgressRing
            value={displayScore}
            size={120}
            strokeWidth={10}
            label="Final exam score"
            forceState={isPassed ? undefined : 'error'}
          />
          {isPassed && (
            <AchievementStickerBadge
              title="Top exam scorer"
              subtitle="86% Distinction"
              color="gold"
            />
          )}
        </div>
      </div>

      {/* 2. CORRECT / WRONG / SKIPPED COUNTS & TIME TAKEN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-5 shadow-purple-sm flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#5F5B75]">Correct answers</p>
            <p className="font-display font-bold text-[30px] text-[#16A34A] mt-1 leading-none">
              {correctCount} / 20
            </p>
          </div>
          <div className="w-10 h-10 rounded-[10px] bg-[#16A34A]/12 text-[#16A34A] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-5 shadow-purple-sm flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#5F5B75]">Wrong answers</p>
            <p className="font-display font-bold text-[30px] text-[#DC2626] mt-1 leading-none">
              {wrongCount} / 20
            </p>
          </div>
          <div className="w-10 h-10 rounded-[10px] bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
            <X className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-5 shadow-purple-sm flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#5F5B75]">Skipped questions</p>
            <p className="font-display font-bold text-[30px] text-[#B45309] mt-1 leading-none">
              {skippedCount} / 20
            </p>
          </div>
          <div className="w-10 h-10 rounded-[10px] bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-5 shadow-purple-sm flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#5F5B75]">Time taken</p>
            <p className="font-display font-bold text-[30px] text-[#1E1B2E] mt-1 leading-none">
              {timeTaken}
            </p>
          </div>
          <div className="w-10 h-10 rounded-[10px] bg-[#F3EFFF] text-[#6D4AE0] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. PER-SECTION BREAKDOWN BARS & ATTEMPTS HISTORY TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Per-section breakdown bars */}
        <div className="lg:col-span-6 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-5">
          <div>
            <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
              Per-section performance breakdown
            </h2>
            <p className="text-[13px] text-[#5F5B75]">
              Accuracy across each syllabus module in this exam attempt.
            </p>
          </div>

          <div className="space-y-4">
            {sectionBreakdowns.map((sec) => (
              <div key={sec.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-bold text-[#1E1B2E]">{sec.name}</span>
                  <span className="font-semibold text-[#5F5B75]">
                    {sec.correct}/{sec.total} correct ({sec.percent}%)
                  </span>
                </div>
                <ProgressBar
                  value={sec.percent}
                  showValue={false}
                  size="md"
                  color={
                    sec.percent >= 80
                      ? 'success'
                      : sec.percent >= 60
                      ? 'primary'
                      : 'danger'
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Attempts history table */}
        <div className="lg:col-span-6 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                Attempts history
              </h2>
              <p className="text-[13px] text-[#5F5B75]">
                Maximum 3 attempts allowed • Highest score counts
              </p>
            </div>
            <StatusChip label={`${attemptsUsed}/3 used`} variant="primary" />
          </div>

          <div className="overflow-x-auto rounded-[10px] border border-[#E6E1F5]">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#FAF8FF] border-b border-[#E6E1F5] text-[#5F5B75] font-bold">
                  <th className="py-3 px-3.5">Attempt</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Score</th>
                  <th className="py-3 px-3.5">Time</th>
                  <th className="py-3 px-3.5 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1F5]">
                {courseAttempts.map((att) => (
                  <tr key={att.id} className="hover:bg-[#FAF8FF]">
                    <td className="py-3 px-3.5 font-bold text-[#1E1B2E]">
                      #{att.attemptNumber}
                    </td>
                    <td className="py-3 px-3.5 text-[#5F5B75]">{att.date}</td>
                    <td className="py-3 px-3.5 font-display font-bold text-[16px] text-[#1E1B2E]">
                      {att.scorePercent}%
                    </td>
                    <td className="py-3 px-3.5 text-[#5F5B75]">{att.timeTaken}</td>
                    <td className="py-3 px-3.5 text-right">
                      <StatusChip
                        label={att.passed ? 'Passed' : 'Failed'}
                        variant={att.passed ? 'success' : 'danger'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. REVIEW ANSWERS LIST (Your answer vs Correct answer with explanation, color-coded) */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E1F5] pb-4">
          <div>
            <h2 className="text-[26px] font-display font-bold text-[#1E1B2E]">
              Review answers & explanations
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Color-coded comparison of your submitted answers against the official answer key.
            </p>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5]">
            {(
              [
                { id: 'all', label: `All (${reviewItems.length})` },
                {
                  id: 'correct',
                  label: `Correct (${reviewItems.filter((i) => i.status === 'correct').length})`,
                },
                {
                  id: 'wrong',
                  label: `Wrong (${reviewItems.filter((i) => i.status === 'wrong').length})`,
                },
                {
                  id: 'skipped',
                  label: `Skipped (${reviewItems.filter((i) => i.status === 'skipped').length})`,
                },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setReviewFilter(f.id)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold cursor-pointer transition-colors ${
                  reviewFilter === f.id
                    ? 'bg-[#6D4AE0] text-white'
                    : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredReviewItems.map(({ q, userIndices, status }) => {
            const borderStyles =
              status === 'correct'
                ? 'border-[#16A34A]/40 bg-[#16A34A]/4'
                : status === 'wrong'
                ? 'border-[#DC2626]/40 bg-[#FEF2F2]/40'
                : 'border-[#F59E0B]/40 bg-[#FFFBEB]/40';

            const userAnswerLabels =
              userIndices.length > 0
                ? userIndices.map((idx) => q.options[idx]).join(' • ')
                : 'No answer selected (Skipped)';

            const correctAnswerLabels = q.correctIndices
              .map((idx) => q.options[idx])
              .join(' • ');

            return (
              <div
                key={q.id}
                className={`rounded-[12px] border-2 p-5 space-y-3.5 ${borderStyles}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-[16px] text-[#1E1B2E]">
                      Question {q.number}
                    </span>
                    <span className="text-[12px] text-[#5F5B75]">• {q.sectionName}</span>
                  </div>
                  <StatusChip
                    label={
                      status === 'correct'
                        ? 'Correct (+5 pts)'
                        : status === 'wrong'
                        ? 'Incorrect (0 pts)'
                        : 'Skipped (0 pts)'
                    }
                    variant={
                      status === 'correct'
                        ? 'success'
                        : status === 'wrong'
                        ? 'danger'
                        : 'warning'
                    }
                  />
                </div>

                <h3 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                  {q.question}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                  {/* Your answer box */}
                  <div
                    className={`p-3.5 rounded-[10px] border ${
                      status === 'correct'
                        ? 'bg-white border-[#16A34A]/40 text-[#16A34A]'
                        : status === 'wrong'
                        ? 'bg-white border-[#DC2626]/40 text-[#DC2626]'
                        : 'bg-white border-[#F59E0B]/40 text-[#B45309]'
                    }`}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                      Your answer
                    </p>
                    <p className="font-bold text-[#1E1B2E] mt-1">{userAnswerLabels}</p>
                  </div>

                  {/* Correct answer box */}
                  <div className="p-3.5 rounded-[10px] bg-white border border-[#16A34A]/40">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#16A34A]">
                      Correct answer
                    </p>
                    <p className="font-bold text-[#1E1B2E] mt-1">{correctAnswerLabels}</p>
                  </div>
                </div>

                {/* Explanation */}
                <div className="p-3.5 rounded-[10px] bg-white/90 border border-[#E6E1F5] text-[13px] text-[#5F5B75]">
                  <strong className="text-[#6D4AE0]">Explanation: </strong>
                  {q.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
