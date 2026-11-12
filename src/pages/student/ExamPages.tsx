import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Skeleton,
  EmptyState,
  QueryErrorState,
} from '../../components/ui';
import { BrandLogo, CatMascot } from '../../components/brand/BrandLogo';
import type { ExamAttemptResultDto, ExamAttemptStartDto } from '../../api/dto-types-bridge';
import { isForbiddenError, isNotFoundError } from '../../api/errors';
import {
  useAutosaveExamAnswersMutation,
  useCourseExamAttempts,
  useCourseExamOverview,
  useExamAttemptResult,
  useGenerateCertificateMutation,
  useMyCertificates,
  useStartExamAttemptMutation,
  useSubmitExamAttemptMutation,
} from '../../api/hooks/useExamsAndCertificates';
import {
  mapExamAttemptQuestionDtoToView,
  mapExamAttemptResultDtoToView,
  mapExamAttemptSummaryDtoToRecord,
  type StudentExamQuestionView,
} from '../../api/mappers';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Forbidden403Page, NotFound404Page } from '../ErrorPages';

function formatTimer(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function computeSecondsUntil(expiresAtIso: string): number {
  const diffMs = new Date(expiresAtIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 1000));
}

// ============================================================================
// PART A.1 & A.2 — FINAL EXAM INTRO & ACTIVE TAKING WORKSPACE (/exam/:courseId)
// ============================================================================
export const ExamPage: React.FC = () => {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const overviewQuery = useCourseExamOverview(courseId);
  const attemptsQuery = useCourseExamAttempts(courseId);
  const startAttemptMutation = useStartExamAttemptMutation(courseId);
  const autosaveMutation = useAutosaveExamAnswersMutation();
  const submitAttemptMutation = useSubmitExamAttemptMutation(courseId);

  const courseTitle = overviewQuery.data?.config.courseTitle ?? 'Certification Exam';
  usePageTitle(`${courseTitle} Final Exam`);

  const [activeAttempt, setActiveAttempt] = useState<ExamAttemptStartDto | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [autosaveState, setAutosaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const [autoSubmittedResult, setAutoSubmittedResult] = useState<ExamAttemptResultDto | null>(null);

  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [timeUpModalOpen, setTimeUpModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Refs prevent stale closures inside autosave timers and expiration handlers
  const dirtyRef = useRef(false);
  const answersRef = useRef<Record<string, number[]>>({});
  const flaggedRef = useRef<string[]>([]);
  const attemptRef = useRef<ExamAttemptStartDto | null>(null);
  const hasAutoSubmittedRef = useRef(false);
  const autosaveMutateRef = useRef(autosaveMutation.mutateAsync);
  const submitMutateRef = useRef(submitAttemptMutation.mutateAsync);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    flaggedRef.current = flaggedIds;
  }, [flaggedIds]);

  useEffect(() => {
    attemptRef.current = activeAttempt;
  }, [activeAttempt]);

  useEffect(() => {
    autosaveMutateRef.current = autosaveMutation.mutateAsync;
  }, [autosaveMutation.mutateAsync]);

  useEffect(() => {
    submitMutateRef.current = submitAttemptMutation.mutateAsync;
  }, [submitAttemptMutation.mutateAsync]);

  const flushAutosave = useCallback(async () => {
    const currentAttempt = attemptRef.current;
    if (!currentAttempt || !dirtyRef.current) return;
    dirtyRef.current = false;
    setAutosaveState('saving');
    try {
      await autosaveMutateRef.current({
        attemptId: currentAttempt.attemptId,
        payload: {
          answers: answersRef.current,
          flaggedQuestionIds: flaggedRef.current,
        },
      });
      setAutosaveState('saved');
      setLastSavedTime('Just now');
    } catch {
      dirtyRef.current = true;
      setAutosaveState('error');
    }
  }, []);

  // Debounced autosave (1.5s after change) + periodic safety sync every 15s while active
  useEffect(() => {
    if (!activeAttempt) return;
    if (!dirtyRef.current) return;

    const debounceTimer = window.setTimeout(() => {
      void flushAutosave();
    }, 1500);

    return () => window.clearTimeout(debounceTimer);
  }, [activeAttempt, answers, flaggedIds, flushAutosave]);

  useEffect(() => {
    if (!activeAttempt) return;
    const interval = window.setInterval(() => {
      if (dirtyRef.current) {
        void flushAutosave();
      }
    }, 15000);
    return () => window.clearInterval(interval);
  }, [activeAttempt, flushAutosave]);

  // Synchronize live countdown timer against server `expiresAt`
  useEffect(() => {
    if (!activeAttempt) return;

    const tick = () => {
      const remaining = computeSecondsUntil(activeAttempt.expiresAt);
      setSecondsLeft(remaining);
      if (remaining <= 0 && !hasAutoSubmittedRef.current) {
        hasAutoSubmittedRef.current = true;
        setTimeUpModalOpen(true);
        void (async () => {
          try {
            await flushAutosave();
            const res = await submitMutateRef.current({
              attemptId: activeAttempt.attemptId,
            });
            setAutoSubmittedResult(res);
          } catch {
            // Submit button in time-up modal allows manual retry if submission fails
          }
        })();
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeAttempt, flushAutosave]);

  const mappedQuestions = useMemo<StudentExamQuestionView[]>(() => {
    if (!activeAttempt) return [];
    return activeAttempt.questions.map(mapExamAttemptQuestionDtoToView);
  }, [activeAttempt]);

  const activeQuestion = mappedQuestions[currentIndex] ?? mappedQuestions[0];

  const summaryCounts = useMemo(() => {
    const total = mappedQuestions.length;
    let answered = 0;
    mappedQuestions.forEach((q) => {
      if ((answers[q.id]?.length ?? 0) > 0) {
        answered += 1;
      }
    });
    const unanswered = total - answered;
    const flagged = flaggedIds.length;
    return { total, answered, unanswered, flagged };
  }, [mappedQuestions, answers, flaggedIds]);

  const questionTypeAnchors = useMemo(() => {
    const singleIdx = mappedQuestions.findIndex((q) => q.type === 'single');
    const multipleIdx = mappedQuestions.findIndex((q) => q.type === 'multiple');
    const booleanIdx = mappedQuestions.findIndex((q) => q.type === 'boolean');
    return { singleIdx, multipleIdx, booleanIdx };
  }, [mappedQuestions]);

  const handleStartExam = async () => {
    if (startAttemptMutation.isPending) return;
    const started = await startAttemptMutation.mutateAsync();
    dirtyRef.current = false;
    hasAutoSubmittedRef.current = false;
    answersRef.current = started.answers;
    flaggedRef.current = started.flaggedQuestionIds;
    attemptRef.current = started;
    setAnswers(started.answers);
    setFlaggedIds(started.flaggedQuestionIds);
    setCurrentIndex(0);
    setAutoSubmittedResult(null);
    setSecondsLeft(Math.min(started.remainingSeconds, computeSecondsUntil(started.expiresAt)));
    setAutosaveState('saved');
    setLastSavedTime('Just now');
    setActiveAttempt(started);
  };

  const handleSelectOption = (q: StudentExamQuestionView, optionIndex: number) => {
    dirtyRef.current = true;
    setAutosaveState('saving');
    setAnswers((prev) => {
      const existing = prev[q.id] || [];
      const next =
        q.type === 'multiple'
          ? existing.includes(optionIndex)
            ? existing.filter((i) => i !== optionIndex)
            : [...existing, optionIndex]
          : [optionIndex];
      const updated = { ...prev, [q.id]: next };
      answersRef.current = updated;
      return updated;
    });
  };

  const handleToggleFlag = (qId: string) => {
    dirtyRef.current = true;
    setAutosaveState('saving');
    setFlaggedIds((prev) => {
      const updated = prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId];
      flaggedRef.current = updated;
      return updated;
    });
  };

  const handleFinalizeAndSubmit = async () => {
    if (!activeAttempt || submitAttemptMutation.isPending) return;
    if (autoSubmittedResult) {
      setTimeUpModalOpen(false);
      navigate(`/exam/${courseId}/result?attemptId=${encodeURIComponent(autoSubmittedResult.id)}`);
      return;
    }

    await flushAutosave();
    const graded = await submitAttemptMutation.mutateAsync({
      attemptId: activeAttempt.attemptId,
    });
    setSubmitModalOpen(false);
    setTimeUpModalOpen(false);
    navigate(`/exam/${courseId}/result?attemptId=${encodeURIComponent(graded.id)}`);
  };

  if (!courseId) {
    return <NotFound404Page />;
  }

  if (overviewQuery.isLoading) {
    return (
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#FAF8FF] px-4 sm:px-6 py-10 focus:outline-none">
        <div className="max-w-[1000px] mx-auto space-y-6">
          <Skeleton variant="text" className="w-64 h-6" />
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-8 space-y-6">
            <Skeleton variant="card" className="h-32 w-full rounded-[12px]" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} variant="card" className="h-28 rounded-[12px]" />
              ))}
            </div>
            <Skeleton variant="card" className="h-20 w-full rounded-[12px]" />
          </div>
        </div>
      </main>
    );
  }

  if (overviewQuery.isError) {
    if (isNotFoundError(overviewQuery.error)) {
      return <NotFound404Page />;
    }
    if (isForbiddenError(overviewQuery.error)) {
      return <Forbidden403Page requiredRoles={['student']} />;
    }
    return (
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#FAF8FF] flex items-center justify-center px-4 py-12 focus:outline-none">
        <div className="max-w-lg w-full">
          <QueryErrorState
            error={overviewQuery.error}
            title="Unable to load exam overview"
            onRetry={() => void overviewQuery.refetch()}
          />
        </div>
      </main>
    );
  }

  const overview = overviewQuery.data;
  if (!overview) {
    return <NotFound404Page />;
  }

  const { config, eligibility } = overview;
  const durationMinutes = Math.max(1, Math.round(config.durationSeconds / 60));
  const previousAttempts = (attemptsQuery.data?.data ?? []).map(mapExamAttemptSummaryDtoToRecord);

  // ============================================================================
  // RENDER PHASE 1: EXAM INTRO SCREEN
  // ============================================================================
  if (!activeAttempt || !activeQuestion) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF8FF] text-[#1E1B2E]">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E6E1F5] px-4 sm:px-8 flex items-center justify-between">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-3">
            {previousAttempts.length > 0 && (
              <Link to={`/exam/${courseId}/result`}>
                <Button variant="ghost" size="sm">
                  View past results
                </Button>
              </Link>
            )}
            <Link to={`/student/progress/${courseId}`}>
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

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 max-w-[1000px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 focus:outline-none"
        >
          <Breadcrumbs
            items={[
              { label: 'My courses', to: '/student/courses' },
              { label: config.courseTitle, to: `/student/progress/${courseId}` },
              { label: 'Final exam intro' },
            ]}
          />

          <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-md overflow-hidden">
            <div className="bg-[#F3EFFF] border-b border-[#E6E1F5] p-6 sm:p-8 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip
                  label="Final certification exam"
                  variant="primary"
                  className="bg-white"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E6E1F5] text-[12px] font-bold text-[#3F2A9E]">
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E3B]" />
                  {config.shuffleQuestions
                    ? 'Questions are randomly selected from the Question Bank'
                    : 'Curated certification assessment'}
                </span>
              </div>

              <h1 className="text-[32px] sm:text-[38px] font-display font-bold text-[#1E1B2E] leading-tight">
                {config.title}
              </h1>
              <p className="text-[16px] text-[#5F5B75] max-w-2xl">
                Validate your mastery of <strong>{config.courseTitle}</strong> to unlock your
                official EduHub Certificate of Completion.
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total questions',
                    value: `${config.totalQuestions} questions`,
                    sub: 'Single, multiple & T/F',
                    icon: <HelpCircle className="w-5 h-5 text-[#6D4AE0]" />,
                  },
                  {
                    label: 'Time limit',
                    value: `${durationMinutes} min`,
                    sub: 'Auto-submits at 00:00',
                    icon: <Clock className="w-5 h-5 text-[#F59E3B]" />,
                  },
                  {
                    label: 'Pass score',
                    value: `${config.passingScorePercent}%`,
                    sub: 'Minimum required to pass',
                    icon: <Award className="w-5 h-5 text-[#16A34A]" />,
                  },
                  {
                    label: 'Attempts',
                    value: `${eligibility.attemptsUsed}/${config.attemptsAllowed}`,
                    sub: `${eligibility.attemptsRemaining} retakes remaining`,
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

              <div className="space-y-3">
                <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                  Exam rules & guidelines
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {[
                    'Questions are drawn dynamically from the instructor Question Bank for each attempt.',
                    'Includes single-choice, multiple-choice (select all that apply), and True/False items.',
                    'Your selected answers are autosaved continuously while you navigate.',
                    'Use "Flag for review" to mark uncertain questions and jump back via the Question Navigator.',
                    'The countdown timer turns red when under 5 minutes remain and auto-submits at 00:00.',
                    `Scoring ${config.passingScorePercent}% or higher (with 100% completed lessons) immediately unlocks your verified certificate.`,
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

              {!eligibility.eligible ? (
                <div className="rounded-[12px] bg-[#FFFBEB] border-2 border-[#F59E0B]/50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-display font-bold text-[18px] text-[#1E1B2E]">
                        Exam locked — Eligibility requirements not met
                      </p>
                      <p className="text-[14px] text-[#5F5B75]">
                        {eligibility.reason ||
                          'Complete every required lesson and remain within attempt limits to begin.'}{' '}
                        Progress:{' '}
                        <strong className="text-[#1E1B2E]">
                          {eligibility.lessonsCompleted} of {eligibility.totalLessons} lessons (
                          {eligibility.courseProgressPercent}%)
                        </strong>
                        .
                      </p>
                    </div>
                  </div>
                  {eligibility.courseProgressPercent < 100 ? (
                    <Link to={`/student/progress/${courseId}`} className="shrink-0">
                      <Button variant="secondary" size="sm" className="bg-white">
                        Finish remaining lessons
                      </Button>
                    </Link>
                  ) : (
                    <Link to={`/exam/${courseId}/result`} className="shrink-0">
                      <Button variant="secondary" size="sm" className="bg-white">
                        View exam results
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="rounded-[12px] bg-[#16A34A]/8 border border-[#16A34A]/30 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
                    <p className="text-[14px] font-semibold text-[#1E1B2E]">
                      Eligibility verified: 100% of course lessons completed ({eligibility.attemptsRemaining}{' '}
                      {eligibility.attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining).
                    </p>
                  </div>
                  <StatusChip label="Unlocked" variant="success" />
                </div>
              )}

              <div className="pt-4 border-t border-[#E6E1F5] flex flex-wrap items-center justify-between gap-4">
                <Link to={`/student/progress/${courseId}`}>
                  <Button variant="ghost">Return to course progress</Button>
                </Link>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={!eligibility.eligible || startAttemptMutation.isPending}
                    loading={startAttemptMutation.isPending}
                    leftIcon={
                      !eligibility.eligible ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <FileCheck2 className="w-5 h-5" />
                      )
                    }
                    onClick={() => void handleStartExam()}
                  >
                    {startAttemptMutation.isPending ? 'Starting exam...' : 'Start exam'}
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
  // RENDER PHASE 2: ACTIVE EXAM TAKING WORKSPACE
  // ============================================================================
  const currentSelected = answers[activeQuestion.id] || [];
  const isCurrentFlagged = flaggedIds.includes(activeQuestion.id);
  const isUnderFiveMinutes = secondsLeft > 0 && secondsLeft < 300;
  const activeDurationMins = Math.max(1, Math.round(activeAttempt.durationSeconds / 60));

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

      <div className="grid grid-cols-5 gap-2">
        {mappedQuestions.map((q, idx) => {
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
          size="md"
          fullWidth
          disabled={submitAttemptMutation.isPending}
          onClick={() => {
            setMobileNavOpen(false);
            setSubmitModalOpen(true);
          }}
        >
          Finish & submit exam
        </Button>
        <p className="text-[11px] text-center text-[#5F5B75]">
          {autosaveState === 'saving'
            ? 'Saving your answers...'
            : autosaveState === 'error'
              ? 'Offline changes queued for sync.'
              : 'All progress is continuously autosaved.'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8FF] text-[#1E1B2E] pb-20 lg:pb-10">
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E6E1F5] px-4 sm:px-6 flex items-center justify-between gap-3 shadow-purple-sm">
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo size="sm" showText={false} />
          <div className="h-6 w-px bg-[#E6E1F5] hidden sm:block" />
          <div className="min-w-0">
            <h1 className="font-display font-bold text-[16px] sm:text-[18px] text-[#1E1B2E] truncate">
              {config.courseTitle} — Final Exam
            </h1>
            <div className="flex items-center gap-2 text-[12px] text-[#5F5B75]">
              <span className="font-bold text-[#6D4AE0]">
                Question {activeQuestion.number} of {mappedQuestions.length}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-[#16A34A] font-semibold">
                {autosaveState === 'saving' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-[#6D4AE0]" />
                    <span className="text-[#6D4AE0]">Autosaving...</span>
                  </>
                ) : autosaveState === 'error' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                    <span className="text-[#DC2626]">Sync delayed</span>
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

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div
            className={`px-3.5 py-1.5 rounded-[10px] border font-display font-bold text-[18px] sm:text-[20px] inline-flex items-center gap-2 transition-colors tabular-nums ${
              isUnderFiveMinutes || secondsLeft === 0
                ? 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626] animate-pulse'
                : 'bg-[#F3EFFF] border-[#E6E1F5] text-[#3F2A9E]'
            }`}
            title={
              isUnderFiveMinutes ? 'Less than 5 minutes remaining!' : 'Exam countdown timer'
            }
          >
            <Clock
              className={`w-4 h-4 ${
                isUnderFiveMinutes || secondsLeft === 0 ? 'text-[#DC2626]' : 'text-[#6D4AE0]'
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

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start focus:outline-none"
      >
        <div className="lg:col-span-8 space-y-6">
          {(questionTypeAnchors.singleIdx >= 0 ||
            questionTypeAnchors.multipleIdx >= 0 ||
            questionTypeAnchors.booleanIdx >= 0) && (
            <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-3 px-4 shadow-purple-sm flex flex-wrap items-center justify-between gap-2 text-[12px]">
              <span className="font-bold text-[#5F5B75] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#6D4AE0]" />
                Jump to question type:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {questionTypeAnchors.singleIdx >= 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(questionTypeAnchors.singleIdx)}
                    className={`px-2.5 py-1 rounded-[8px] font-bold cursor-pointer ${
                      activeQuestion.type === 'single'
                        ? 'bg-[#F3EFFF] text-[#6D4AE0]'
                        : 'text-[#5F5B75] hover:bg-[#FAF8FF]'
                    }`}
                  >
                    Single choice (Q{questionTypeAnchors.singleIdx + 1})
                  </button>
                )}
                {questionTypeAnchors.multipleIdx >= 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(questionTypeAnchors.multipleIdx)}
                    className={`px-2.5 py-1 rounded-[8px] font-bold cursor-pointer ${
                      activeQuestion.type === 'multiple'
                        ? 'bg-[#F3EFFF] text-[#6D4AE0]'
                        : 'text-[#5F5B75] hover:bg-[#FAF8FF]'
                    }`}
                  >
                    Multiple choice (Q{questionTypeAnchors.multipleIdx + 1})
                  </button>
                )}
                {questionTypeAnchors.booleanIdx >= 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(questionTypeAnchors.booleanIdx)}
                    className={`px-2.5 py-1 rounded-[8px] font-bold cursor-pointer ${
                      activeQuestion.type === 'boolean'
                        ? 'bg-[#F3EFFF] text-[#6D4AE0]'
                        : 'text-[#5F5B75] hover:bg-[#FAF8FF]'
                    }`}
                  >
                    True / False (Q{questionTypeAnchors.booleanIdx + 1})
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-md space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6E1F5]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#6D4AE0] text-white font-display font-bold text-[14px]">
                  Question {activeQuestion.number} of {mappedQuestions.length}
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

            <div className="space-y-2">
              <p className="text-[12px] font-bold text-[#6D4AE0]">
                {activeQuestion.sectionName}
              </p>
              <h2 className="text-[22px] sm:text-[24px] font-display font-bold text-[#1E1B2E] leading-snug">
                {activeQuestion.question}
              </h2>
            </div>

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
                    <div
                      className={`mt-0.5 w-7 h-7 ${
                        activeQuestion.type === 'multiple' ? 'rounded-[8px]' : 'rounded-full'
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
                          isSelected ? 'font-bold text-[#1E1B2E]' : 'font-medium text-[#1E1B2E]'
                        }`}
                      >
                        {optText}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

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

                {currentIndex < mappedQuestions.length - 1 ? (
                  <Button
                    variant="primary"
                    size="md"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    onClick={() =>
                      setCurrentIndex((i) => Math.min(mappedQuestions.length - 1, i + 1))
                    }
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    disabled={submitAttemptMutation.isPending}
                    onClick={() => setSubmitModalOpen(true)}
                  >
                    Finish & submit exam
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="hidden lg:block lg:col-span-4 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm sticky top-24">
          {renderNavigatorGrid()}
        </aside>
      </main>

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
          disabled={submitAttemptMutation.isPending}
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

      <Modal
        open={submitModalOpen}
        onClose={() => {
          if (!submitAttemptMutation.isPending) setSubmitModalOpen(false);
        }}
        title="Submit your certification exam?"
        description="Review your question summary below before final grading."
        footer={
          <>
            <Button
              variant="ghost"
              disabled={submitAttemptMutation.isPending}
              onClick={() => setSubmitModalOpen(false)}
            >
              Return to questions
            </Button>
            <Button
              variant="primary"
              loading={submitAttemptMutation.isPending}
              disabled={submitAttemptMutation.isPending}
              onClick={() => void handleFinalizeAndSubmit()}
            >
              {submitAttemptMutation.isPending ? 'Grading exam...' : 'Confirm & submit exam'}
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
                <strong>{summaryCounts.flagged} flagged</strong> questions. Unanswered questions
                are scored as 0 points.
              </span>
            </div>
          )}

          <p className="text-[14px] text-[#5F5B75]">
            Time remaining: <strong className="text-[#1E1B2E]">{formatTimer(secondsLeft)}</strong>.
            Once submitted, your exam will be graded immediately.
          </p>
        </div>
      </Modal>

      <Modal
        open={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Leave active exam view?"
        description="Your progress is autosaved on the server while the timer remains active."
        footer={
          <>
            <Button variant="primary" onClick={() => setLeaveModalOpen(false)}>
              Stay in exam
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void flushAutosave();
                setLeaveModalOpen(false);
                navigate(`/student/progress/${courseId}`);
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
            If you leave now, your {summaryCounts.answered} answered questions will remain saved,
            but your {activeDurationMins}-minute timer ({formatTimer(secondsLeft)} left) will keep
            counting down until expiration.
          </p>
        </div>
      </Modal>

      <Modal
        open={timeUpModalOpen}
        onClose={() => void handleFinalizeAndSubmit()}
        title="Time is up — Exam auto-submitted"
        description={`Your ${activeDurationMins}-minute exam window has concluded.`}
        footer={
          <Button
            variant="primary"
            fullWidth
            loading={submitAttemptMutation.isPending}
            disabled={submitAttemptMutation.isPending}
            onClick={() => void handleFinalizeAndSubmit()}
          >
            {submitAttemptMutation.isPending
              ? 'Finalizing grade...'
              : 'View graded exam results'}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5] flex items-start gap-3">
            <Clock className="w-6 h-6 text-[#6D4AE0] shrink-0 mt-0.5" />
            <div className="text-[14px] text-[#1E1B2E]">
              <p className="font-bold">All autosaved answers have been locked in</p>
              <p className="text-[#5F5B75] mt-0.5">
                We captured {summaryCounts.answered} of {summaryCounts.total} answered questions
                when the timer reached 00:00.
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
  const { courseId = '' } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const overviewQuery = useCourseExamOverview(courseId);
  const attemptsQuery = useCourseExamAttempts(courseId);
  const myCertsQuery = useMyCertificates();
  const generateCertMutation = useGenerateCertificateMutation();

  const sortedSubmittedAttempts = useMemo(() => {
    const raw = attemptsQuery.data?.data ?? [];
    return [...raw]
      .filter((a) => a.status !== 'in_progress')
      .sort((a, b) => b.attemptNumber - a.attemptNumber);
  }, [attemptsQuery.data]);

  const requestedAttemptId = searchParams.get('attemptId') || undefined;
  const activeAttemptId = requestedAttemptId ?? sortedSubmittedAttempts[0]?.id;
  const resultQuery = useExamAttemptResult(activeAttemptId);

  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>(
    'all'
  );

  const courseTitle = overviewQuery.data?.config.courseTitle ?? 'Course';
  usePageTitle(`${courseTitle} Exam Results`);

  const handleOpenCertificate = async () => {
    if (!courseId || generateCertMutation.isPending) return;
    const existing = myCertsQuery.data?.data.find((c) => c.course.id === courseId);
    if (existing) {
      navigate(`/certificates/${encodeURIComponent(existing.id)}?view=completion`);
      return;
    }
    const issued = await generateCertMutation.mutateAsync({ courseId });
    navigate(`/certificates/${encodeURIComponent(issued.id)}?view=completion`);
  };

  if (!courseId) {
    return <NotFound404Page />;
  }

  if (overviewQuery.isLoading || attemptsQuery.isLoading || (activeAttemptId && resultQuery.isLoading)) {
    return (
      <div className="space-y-8 pb-12">
        <Skeleton variant="text" className="w-72 h-6" />
        <Skeleton variant="card" className="h-56 rounded-[12px]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} variant="card" className="h-24 rounded-[12px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton variant="card" className="lg:col-span-6 h-64 rounded-[12px]" />
          <Skeleton variant="card" className="lg:col-span-6 h-64 rounded-[12px]" />
        </div>
      </div>
    );
  }

  const firstError = overviewQuery.error ?? attemptsQuery.error ?? resultQuery.error;
  if (firstError) {
    if (isNotFoundError(firstError)) {
      return <NotFound404Page />;
    }
    if (isForbiddenError(firstError)) {
      return <Forbidden403Page requiredRoles={['student']} />;
    }
    return (
      <div className="py-10">
        <QueryErrorState
          error={firstError}
          title="Unable to load exam results"
          onRetry={() => {
            void overviewQuery.refetch();
            void attemptsQuery.refetch();
            if (activeAttemptId) void resultQuery.refetch();
          }}
        />
      </div>
    );
  }

  if (!activeAttemptId || !resultQuery.data) {
    return (
      <div className="space-y-6 pb-12">
        <Breadcrumbs
          items={[
            { label: 'My courses', to: '/student/courses' },
            { label: courseTitle, to: `/student/progress/${courseId}` },
            { label: 'Exam result' },
          ]}
        />
        <EmptyState
          title="No completed exam attempts yet"
          description="Take and submit your certification exam to view your graded score, per-section accuracy breakdown, and full answer review."
          actionLabel="Go to final exam"
          actionTo={`/exam/${courseId}`}
          mood="empty"
        />
      </div>
    );
  }

  const view = mapExamAttemptResultDtoToView(resultQuery.data);
  const attemptsHistory = sortedSubmittedAttempts.map(mapExamAttemptSummaryDtoToRecord);
  const maxAttempts = overviewQuery.data?.config.attemptsAllowed ?? 3;
  const totalQuestionsCount = view.reviewItems.length;
  const isPassed = view.summary.passed;

  const filteredReviewItems =
    reviewFilter === 'all'
      ? view.reviewItems
      : view.reviewItems.filter((item) => item.outcome === reviewFilter);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: 'My courses', to: '/student/courses' },
            { label: courseTitle, to: `/student/progress/${courseId}` },
            { label: 'Exam result' },
          ]}
        />

        <span className="text-[12px] font-bold text-[#5F5B75]">
          Showing Attempt #{view.summary.attemptNumber} ({view.summary.date})
        </span>
      </div>

      {/* 1. PASSED / FAILED HERO BANNER + SCORE RING */}
      <div
        className={`rounded-[12px] border-2 p-6 sm:p-8 shadow-purple-md flex flex-col lg:flex-row items-center justify-between gap-8 ${
          isPassed
            ? 'bg-gradient-to-br from-white via-[#FAF8FF] to-[#F3EFFF] border-[#16A34A]/35'
            : 'bg-gradient-to-br from-white via-[#FEF2F2]/40 to-[#FEF2F2] border-[#DC2626]/35'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 flex-1">
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
                    ? `Passed • ${view.passingScorePercent}% required`
                    : `Did not pass • ${view.passingScorePercent}% required`
                }
                variant={isPassed ? 'success' : 'danger'}
              />
              <StatusChip
                label={`Attempt ${view.attemptsUsed} of ${maxAttempts}`}
                variant="primary"
                className="bg-white"
              />
            </div>

            <h1 className="text-[32px] sm:text-[38px] font-display font-bold text-[#1E1B2E] leading-tight">
              {isPassed
                ? 'Congratulations! You passed the exam.'
                : 'Keep going — review and retake when ready.'}
            </h1>

            <p className="text-[15px] text-[#5F5B75] max-w-xl leading-relaxed">
              {isPassed
                ? `You scored ${view.summary.scorePercent}% on the ${courseTitle} final assessment, exceeding the ${view.passingScorePercent}% passing score.`
                : `You scored ${view.summary.scorePercent}%, below the ${view.passingScorePercent}% passing threshold. Review the color-coded explanations below before your next attempt.`}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              {isPassed && view.certificateEligible && (
                <Button
                  variant="primary"
                  size="lg"
                  loading={generateCertMutation.isPending}
                  disabled={generateCertMutation.isPending}
                  leftIcon={<Award className="w-5 h-5" />}
                  onClick={() => void handleOpenCertificate()}
                >
                  {generateCertMutation.isPending ? 'Generating certificate...' : 'Get certificate'}
                </Button>
              )}

              {view.attemptsRemaining > 0 && (
                <Button
                  variant={isPassed ? 'secondary' : 'primary'}
                  size="lg"
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                  onClick={() => navigate(`/exam/${courseId}`)}
                >
                  Retake exam ({view.attemptsRemaining} left)
                </Button>
              )}

              <Link to={`/student/progress/${courseId}`}>
                <Button variant="ghost" size="lg" className="bg-white border border-[#E6E1F5]">
                  Back to course
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 p-5 rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm shrink-0">
          <ProgressRing
            value={view.summary.scorePercent}
            size={120}
            strokeWidth={10}
            label="Final exam score"
            forceState={isPassed ? undefined : 'error'}
          />
          {isPassed && (
            <AchievementStickerBadge
              title={view.summary.scorePercent >= 85 ? 'Top exam scorer' : 'Exam certified'}
              subtitle={`${view.summary.scorePercent}% Score`}
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
              {view.summary.correctCount} / {totalQuestionsCount}
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
              {view.summary.wrongCount} / {totalQuestionsCount}
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
              {view.summary.skippedCount} / {totalQuestionsCount}
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
              {view.summary.timeTaken}
            </p>
          </div>
          <div className="w-10 h-10 rounded-[10px] bg-[#F3EFFF] text-[#6D4AE0] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. PER-SECTION BREAKDOWN BARS & ATTEMPTS HISTORY TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
            {view.sectionBreakdowns.map((sec) => (
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
                    sec.percent >= 80 ? 'success' : sec.percent >= 60 ? 'primary' : 'danger'
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                Attempts history
              </h2>
              <p className="text-[13px] text-[#5F5B75]">
                Maximum {maxAttempts} attempts allowed • Click a row to inspect
              </p>
            </div>
            <StatusChip label={`${view.attemptsUsed}/${maxAttempts} used`} variant="primary" />
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
                {attemptsHistory.map((att) => {
                  const isActiveRow = att.id === view.summary.id;
                  return (
                    <tr
                      key={att.id}
                      onClick={() => setSearchParams({ attemptId: att.id }, { replace: true })}
                      className={`cursor-pointer transition-colors ${
                        isActiveRow ? 'bg-[#F3EFFF]/65' : 'hover:bg-[#FAF8FF]'
                      }`}
                    >
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. REVIEW ANSWERS LIST */}
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
                { id: 'all', label: `All (${view.reviewItems.length})` },
                {
                  id: 'correct',
                  label: `Correct (${view.reviewItems.filter((i) => i.outcome === 'correct').length})`,
                },
                {
                  id: 'wrong',
                  label: `Wrong (${view.reviewItems.filter((i) => i.outcome === 'wrong').length})`,
                },
                {
                  id: 'skipped',
                  label: `Skipped (${view.reviewItems.filter((i) => i.outcome === 'skipped').length})`,
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
          {filteredReviewItems.map((item) => {
            const borderStyles =
              item.outcome === 'correct'
                ? 'border-[#16A34A]/40 bg-[#16A34A]/4'
                : item.outcome === 'wrong'
                  ? 'border-[#DC2626]/40 bg-[#FEF2F2]/40'
                  : 'border-[#F59E0B]/40 bg-[#FFFBEB]/40';

            const userAnswerLabels =
              item.selectedIndices.length > 0
                ? item.selectedIndices
                    .map((idx) => item.options[idx] ?? `Option ${idx + 1}`)
                    .join(' • ')
                : 'No answer selected (Skipped)';

            const correctAnswerLabels = item.correctIndices
              .map((idx) => item.options[idx] ?? `Option ${idx + 1}`)
              .join(' • ');

            return (
              <div
                key={item.id}
                className={`rounded-[12px] border-2 p-5 space-y-3.5 ${borderStyles}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-[16px] text-[#1E1B2E]">
                      Question {item.number}
                    </span>
                    <span className="text-[12px] text-[#5F5B75]">• {item.sectionName}</span>
                  </div>
                  <StatusChip
                    label={
                      item.outcome === 'correct'
                        ? `Correct (+${item.pointsAwarded} pts)`
                        : item.outcome === 'wrong'
                          ? 'Incorrect (0 pts)'
                          : 'Skipped (0 pts)'
                    }
                    variant={
                      item.outcome === 'correct'
                        ? 'success'
                        : item.outcome === 'wrong'
                          ? 'danger'
                          : 'warning'
                    }
                  />
                </div>

                <h3 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                  {item.question}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                  <div
                    className={`p-3.5 rounded-[10px] border ${
                      item.outcome === 'correct'
                        ? 'bg-white border-[#16A34A]/40 text-[#16A34A]'
                        : item.outcome === 'wrong'
                          ? 'bg-white border-[#DC2626]/40 text-[#DC2626]'
                          : 'bg-white border-[#F59E0B]/40 text-[#B45309]'
                    }`}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                      Your answer
                    </p>
                    <p className="font-bold text-[#1E1B2E] mt-1">{userAnswerLabels}</p>
                  </div>

                  <div className="p-3.5 rounded-[10px] border bg-white border-[#16A34A]/40">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#16A34A]">
                      Official correct answer
                    </p>
                    <p className="font-bold text-[#1E1B2E] mt-1">{correctAnswerLabels}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-white border border-[#E6E1F5] text-[13px] text-[#5F5B75]">
                  <strong className="text-[#1E1B2E]">Explanation:</strong> {item.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
