import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  CheckCircle2,
  Clock,
  UploadCloud,
  Image as ImageIcon,
  Film,
  Crop,
  AlertCircle,
  RotateCcw,
  Trash2,
  Plus,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Paperclip,
  Eye,
  DollarSign,
  FileCheck2,
  ExternalLink,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Save,
  Loader2,
} from 'lucide-react';
import {
  Button,
  StatusChip,
  Breadcrumbs,
  ProgressBar,
  FormErrorSummary,
  FormErrorItem,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { ROLE_USERS, Course } from '../../data/mockData';

type UploadVisualState = 'idle' | 'uploading' | 'success' | 'error';

interface WizardLesson {
  id: string;
  title: string;
  durationMinutes: number;
  videoFileName: string;
  attachmentName?: string;
  isFreePreview: boolean;
}

interface WizardSection {
  id: string;
  title: string;
  lessons: WizardLesson[];
}

const WIZARD_STEPS = [
  { id: 0, key: 'basics', letter: 'a', label: 'Basics' },
  { id: 1, key: 'media', letter: 'b', label: 'Media' },
  { id: 2, key: 'curriculum', letter: 'c', label: 'Curriculum' },
  { id: 3, key: 'pricing', letter: 'd', label: 'Pricing' },
  { id: 4, key: 'exam', letter: 'e', label: 'Final exam' },
  { id: 5, key: 'review', letter: 'f', label: 'Review & submit' },
];

function formatTotalMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export const InstructorCreateCoursePage: React.FC = () => {
  const { categories, setCourses, currentUser, addToast } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeStep, setActiveStep] = useState<number>(0);
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving'>('saved');
  const [lastAutosaved, setLastAutosaved] = useState<string>('Just now');
  const [wizardErrors, setWizardErrors] = useState<FormErrorItem[]>([]);
  const [wizardSummaryKey, setWizardSummaryKey] = useState<number>(0);

  // Step a. Basics state
  const [title, setTitle] = useState(
    searchParams.get('edit')
      ? 'Legacy Redux & Class Components Workshop (Updated to React 19)'
      : 'Advanced React 19 Server Actions & Design Systems'
  );
  const [subtitle, setSubtitle] = useState(
    'Build accessible, high-performance full-stack interfaces with React 19, TypeScript 5.7, and automated testing.'
  );
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat-web');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [language, setLanguage] = useState('English & Arabic CC');
  const [description, setDescription] = useState(
    'This hands-on workshop guides software engineers through modern React 19 architecture, composable design tokens, optimistic state updates, and end-to-end verification.'
  );
  const [tags, setTags] = useState<string[]>(['React 19', 'TypeScript', 'Design Systems']);
  const [tagInput, setTagInput] = useState('');

  // Step b. Media upload states (idle, uploading, success, error)
  const [coverUploadState, setCoverUploadState] = useState<UploadVisualState>('success');
  const [coverProgress, setCoverProgress] = useState<number>(68);
  const [coverCropZoom, setCoverCropZoom] = useState<number>(100);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>(
    'https://images.unsplash.com/photo-1619410283995-43d9134e7656?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  );
  const [coverErrorMsg, setCoverErrorMsg] = useState<string>(
    'Invalid file: "banner-raw.bmp" (8.4 MB) exceeds the 5MB limit. Allowed: JPG/PNG up to 5MB.'
  );

  const [videoUploadState, setVideoUploadState] = useState<UploadVisualState>('success');
  const [videoProgress, setVideoProgress] = useState<number>(54);
  const [videoFileName, setVideoFileName] = useState<string>(
    '01-Course-Orientation-Demo-1080p.mp4 (148 MB)'
  );
  const [videoErrorMsg, setVideoErrorMsg] = useState<string>(
    'Upload failed: "raw-4k-master.mov" (2.6 GB) exceeds the 2GB limit. Allowed: MP4 up to 2GB.'
  );

  // Step c. Curriculum state (Sections & Lessons with drag-to-reorder & auto-calculated duration)
  const [sections, setSections] = useState<WizardSection[]>([
    {
      id: 'wsec-1',
      title: 'Section 1: Architecture & Workspace Setup',
      lessons: [
        {
          id: 'wles-1',
          title: '1. Course Tour & Monorepo Structure',
          durationMinutes: 14,
          videoFileName: '01-monorepo-tour.mp4',
          attachmentName: 'Starter-Repo-Setup.pdf',
          isFreePreview: true,
        },
        {
          id: 'wles-2',
          title: '2. Strict TypeScript 5.7 & Vite 8 Configuration',
          durationMinutes: 22,
          videoFileName: '02-ts-vite-config.mp4',
          attachmentName: 'tsconfig-reference.zip',
          isFreePreview: true,
        },
      ],
    },
    {
      id: 'wsec-2',
      title: 'Section 2: Composable State & Reducers',
      lessons: [
        {
          id: 'wles-3',
          title: '3. Modeling Complex UI Flows with useReducer',
          durationMinutes: 28,
          videoFileName: '03-usereducer-flows.mp4',
          attachmentName: 'State-Machine-Diagram.pdf',
          isFreePreview: false,
        },
        {
          id: 'wles-4',
          title: '4. Optimistic Updates & Error Boundaries',
          durationMinutes: 31,
          videoFileName: '04-optimistic-ui.mp4',
          isFreePreview: false,
        },
      ],
    },
    {
      id: 'wsec-3',
      title: 'Section 3: Testing & Production Deployment',
      lessons: [
        {
          id: 'wles-5',
          title: '5. Automated Accessibility & Playwright E2E Suite',
          durationMinutes: 35,
          videoFileName: '05-playwright-a11y.mp4',
          attachmentName: 'WCAG-2.2-Checklist.pdf',
          isFreePreview: false,
        },
      ],
    },
  ]);

  // Add Lesson inline form state
  const [addingToSectionId, setAddingToSectionId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonMinutes, setNewLessonMinutes] = useState('18');
  const [newLessonVideo, setNewLessonVideo] = useState('lesson-walkthrough-1080p.mp4');
  const [newLessonAttachment, setNewLessonAttachment] = useState('Lab-Exercise-Files.zip');
  const [newLessonPreview, setNewLessonPreview] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [draggedLessonInfo, setDraggedLessonInfo] = useState<{
    sectionId: string;
    lessonIdx: number;
  } | null>(null);

  // Step d. Pricing state
  const [pricingMode, setPricingMode] = useState<'paid' | 'free'>('paid');
  const [priceAmount, setPriceAmount] = useState<string>('49.99');
  const [hasDiscount, setHasDiscount] = useState<boolean>(true);
  const [originalPriceAmount, setOriginalPriceAmount] = useState<string>('89.99');

  // Step e. Final exam state
  const [linkedQuestionBankCourseId, setLinkedQuestionBankCourseId] =
    useState<string>('course-1');
  const [examQuestionsCount, setExamQuestionsCount] = useState<number>(20);
  const [examDurationMinutes, setExamDurationMinutes] = useState<number>(30);
  const [examPassScore, setExamPassScore] = useState<number>(60);

  // Step f. Review & Missing Items Simulator
  const [simulateMissingItems, setSimulateMissingItems] = useState<boolean>(false);

  const triggerAutosave = () => {
    setAutosaveStatus('saving');
    setTimeout(() => {
      setAutosaveStatus('saved');
      setLastAutosaved('Just now');
    }, 400);
  };

  // Simulated progress bar animation when cover or video is in 'uploading' state
  useEffect(() => {
    if (coverUploadState !== 'uploading') return;
    const timer = setInterval(() => {
      setCoverProgress((p) => {
        if (p >= 95) return 68;
        return p + 5;
      });
    }, 600);
    return () => clearInterval(timer);
  }, [coverUploadState]);

  useEffect(() => {
    if (videoUploadState !== 'uploading') return;
    const timer = setInterval(() => {
      setVideoProgress((p) => {
        if (p >= 95) return 54;
        return p + 5;
      });
    }, 600);
    return () => clearInterval(timer);
  }, [videoUploadState]);

  // Automatically calculate total lessons and total duration across all sections
  const curriculumTotals = useMemo(() => {
    let totalLessons = 0;
    let totalMinutes = 0;
    let previewCount = 0;
    sections.forEach((sec) => {
      totalLessons += sec.lessons.length;
      sec.lessons.forEach((l) => {
        totalMinutes += l.durationMinutes;
        if (l.isFreePreview) previewCount += 1;
      });
    });
    return {
      totalSections: sections.length,
      totalLessons,
      totalMinutes,
      formattedDuration: formatTotalMinutes(totalMinutes),
      previewCount,
    };
  }, [sections]);

  // Move lesson up/down or via drag-and-drop
  const handleMoveLesson = (sectionId: string, fromIdx: number, toIdx: number) => {
    triggerAutosave();
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        if (toIdx < 0 || toIdx >= sec.lessons.length) return sec;
        const updated = [...sec.lessons];
        const [moved] = updated.splice(fromIdx, 1);
        updated.splice(toIdx, 0, moved);
        return { ...sec, lessons: updated };
      })
    );
  };

  const handleAddLesson = (sectionId: string) => {
    if (!newLessonTitle.trim()) return;
    triggerAutosave();
    const mins = Math.max(2, parseInt(newLessonMinutes, 10) || 15);
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          lessons: [
            ...sec.lessons,
            {
              id: `wles-${Date.now()}`,
              title: newLessonTitle.trim(),
              durationMinutes: mins,
              videoFileName: newLessonVideo || 'lesson-video.mp4',
              attachmentName: newLessonAttachment.trim() || undefined,
              isFreePreview: newLessonPreview,
            },
          ],
        };
      })
    );
    setNewLessonTitle('');
    setNewLessonPreview(false);
    setAddingToSectionId(null);
    addToast({
      title: 'Lesson added',
      message: `Course total duration automatically updated.`,
      variant: 'success',
    });
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    triggerAutosave();
    setSections((prev) => [
      ...prev,
      {
        id: `wsec-${Date.now()}`,
        title: newSectionTitle.trim(),
        lessons: [],
      },
    ]);
    setNewSectionTitle('');
  };

  // Missing items checklist calculation for Step f
  const checklistItems = useMemo(() => {
    if (simulateMissingItems) {
      return [
        {
          stepIdx: 0,
          label: 'Course title, subtitle, category & tags (Step a)',
          done: true,
          detail: title,
        },
        {
          stepIdx: 1,
          label: '16:9 Cover image & demo video uploaded (Step b)',
          done: false,
          detail: 'Missing: Demo video upload is still pending or failed.',
        },
        {
          stepIdx: 2,
          label: 'At least 2 curriculum sections with video lessons (Step c)',
          done: true,
          detail: `${curriculumTotals.totalSections} sections, ${curriculumTotals.totalLessons} lessons (${curriculumTotals.formattedDuration})`,
        },
        {
          stepIdx: 3,
          label: 'Course pricing configured (Step d)',
          done: true,
          detail: pricingMode === 'free' ? 'Free course' : `$${priceAmount}`,
        },
        {
          stepIdx: 4,
          label: 'Final exam linked to Question Bank with 20+ questions (Step e)',
          done: false,
          detail: 'Missing: Question Bank currently has 14/20 required questions.',
        },
      ];
    }

    return [
      {
        stepIdx: 0,
        label: 'Course title, subtitle, category & tags (Step a)',
        done: title.trim().length >= 6 && description.trim().length >= 20,
        detail: `${title} • ${level} • ${language}`,
      },
      {
        stepIdx: 1,
        label: '16:9 Cover image & demo video uploaded (Step b)',
        done: coverUploadState === 'success' && videoUploadState === 'success',
        detail:
          coverUploadState === 'success' && videoUploadState === 'success'
            ? '16:9 cover cropped + 1080p demo MP4 ready'
            : 'Upload cover image (JPG/PNG) and demo video (MP4)',
      },
      {
        stepIdx: 2,
        label: 'At least 2 curriculum sections with video lessons (Step c)',
        done:
          curriculumTotals.totalSections >= 2 && curriculumTotals.totalLessons >= 3,
        detail: `${curriculumTotals.totalSections} sections • ${curriculumTotals.totalLessons} lessons • ${curriculumTotals.formattedDuration} auto-calculated`,
      },
      {
        stepIdx: 3,
        label: 'Course pricing configured (Step d)',
        done: pricingMode === 'free' || Number(priceAmount) > 0,
        detail:
          pricingMode === 'free'
            ? 'Free enrollment'
            : `$${Number(priceAmount || 49.99).toFixed(2)} USD`,
      },
      {
        stepIdx: 4,
        label: 'Final exam linked to Question Bank (Step e)',
        done: examPassScore >= 50,
        detail: `${examQuestionsCount} questions • ${examDurationMinutes} mins • ${examPassScore}% pass score`,
      },
    ];
  }, [
    simulateMissingItems,
    title,
    description,
    level,
    language,
    coverUploadState,
    videoUploadState,
    curriculumTotals,
    pricingMode,
    priceAmount,
    examQuestionsCount,
    examDurationMinutes,
    examPassScore,
  ]);

  const missingCount = checklistItems.filter((i) => !i.done).length;

  const validateWizard = (targetStatus: 'Draft' | 'Pending review'): FormErrorItem[] => {
    const errs: FormErrorItem[] = [];
    if (title.trim().length < 6) {
      errs.push({
        field: 'Course title',
        message: 'Course title must be at least 6 characters long.',
        targetId: 'wizard-title',
      });
    }
    if (pricingMode === 'paid' && !(Number(priceAmount) > 0)) {
      errs.push({
        field: 'Course price',
        message: 'Enter a valid course price greater than $0.00.',
        targetId: 'wizard-price',
      });
    }
    if (targetStatus === 'Pending review') {
      if (description.trim().length < 20) {
        errs.push({
          field: 'Full course description',
          message: 'Full course description must be at least 20 characters.',
          targetId: 'wizard-description',
        });
      }
      if (
        coverUploadState !== 'success' ||
        videoUploadState !== 'success' ||
        simulateMissingItems
      ) {
        errs.push({
          field: 'Media (Step b)',
          message: 'Upload both a 16:9 cover image and a demo video before submitting.',
        });
      }
      if (curriculumTotals.totalSections < 2 || curriculumTotals.totalLessons < 3) {
        errs.push({
          field: 'Curriculum (Step c)',
          message: 'Include at least 2 curriculum sections and 3 video lessons.',
        });
      }
      if (examPassScore < 50 || simulateMissingItems) {
        errs.push({
          field: 'Final exam (Step e)',
          message: 'Link a Question Bank with at least 20 questions and 50%+ pass score.',
        });
      }
    }
    return errs;
  };

  const handleSaveCourse = (targetStatus: 'Draft' | 'Pending review') => {
    const errs = validateWizard(targetStatus);
    if (errs.length > 0) {
      setWizardErrors(errs);
      setWizardSummaryKey((k) => k + 1);
      addToast({
        title:
          targetStatus === 'Draft'
            ? 'Check required course details before saving'
            : 'Resolve missing requirements before submitting',
        variant: 'danger',
      });
      return;
    }

    setWizardErrors([]);
    const instructor = currentUser || ROLE_USERS.instructor;
    const cat = categories.find((c) => c.id === categoryId) || categories[0];
    const created: Course = {
      id: `course-${Date.now()}`,
      title: title.trim() || 'Untitled Instructor Course',
      subtitle: subtitle.trim(),
      instructorId: instructor.id,
      instructorName: instructor.name,
      instructorAvatar: instructor.avatar,
      categoryId: cat.id,
      categoryName: cat.name,
      thumbnail: coverPreviewUrl,
      rating: 0,
      reviewCount: 0,
      studentsCount: 0,
      price: pricingMode === 'free' ? 0 : parseFloat(priceAmount) || 49.99,
      originalPrice:
        pricingMode === 'paid' && hasDiscount
          ? parseFloat(originalPriceAmount) || 89.99
          : undefined,
      level,
      duration: curriculumTotals.formattedDuration,
      lessonsCount: curriculumTotals.totalLessons,
      isFree: pricingMode === 'free',
      status: targetStatus,
      updatedAt: 'Just now',
      tags,
    };
    setCourses((prev) => [created, ...prev]);
    addToast({
      title:
        targetStatus === 'Draft'
          ? 'Course saved as draft'
          : 'Submitted for supervisor approval!',
      message:
        targetStatus === 'Draft'
          ? `"${created.title}" has been saved to your Drafts tab.`
          : `"${created.title}" is now in the Pending Review queue.`,
      variant: 'success',
    });
    navigate('/instructor/courses');
  };

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Instructor dashboard', to: '/instructor/dashboard' },
          { label: 'My courses', to: '/instructor/courses' },
          { label: 'Course builder wizard' },
        ]}
      />

      {/* WIZARD HEADER WITH AUTOSAVE INDICATOR & "SAVE DRAFT" BUTTON */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusChip label="Course builder wizard" variant="primary" />
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#16A34A] bg-[#16A34A]/10 px-2.5 py-1 rounded-full">
                {autosaveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6D4AE0]" />
                    <span className="text-[#6D4AE0]">Autosaving changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Autosaved {lastAutosaved}</span>
                  </>
                )}
              </span>
            </div>
            <h1 className="text-[32px] sm:text-[36px] font-display font-bold text-[#1E1B2E]">
              Build & publish your course
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={() => handleSaveCourse('Draft')}
            >
              Save draft
            </Button>
            <Link to="/instructor/courses">
              <Button variant="ghost" size="md">
                Exit wizard
              </Button>
            </Link>
          </div>
        </div>

        {/* 6-Step Interactive Stepper (a. Basics -> f. Review & submit) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-[#E6E1F5]">
          {WIZARD_STEPS.map((st, idx) => {
            const isCurrent = idx === activeStep;
            const isCompleted = idx < activeStep;
            return (
              <button
                key={st.key}
                type="button"
                onClick={() => {
                  setWizardErrors([]);
                  setActiveStep(idx);
                }}
                className={`p-3 rounded-[10px] border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  isCurrent
                    ? 'bg-[#F3EFFF] border-[#6D4AE0] shadow-purple-sm'
                    : isCompleted
                    ? 'bg-white border-[#16A34A]/40 hover:border-[#16A34A]'
                    : 'bg-[#FAF8FF] border-[#E6E1F5] hover:border-[#A78BFA]'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full text-[12px] font-display font-bold flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-[#6D4AE0] text-white'
                      : isCompleted
                      ? 'bg-[#16A34A] text-white'
                      : 'bg-white border border-[#E6E1F5] text-[#5F5B75]'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : st.letter.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#5F5B75] uppercase">
                    Step {idx + 1}
                  </p>
                  <p
                    className={`text-[13px] font-bold truncate ${
                      isCurrent ? 'text-[#6D4AE0]' : 'text-[#1E1B2E]'
                    }`}
                  >
                    {st.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP CONTENT PANEL */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-6">
        <FormErrorSummary errors={wizardErrors} summaryKey={wizardSummaryKey} />

        {/* ====================================================================
            STEP A: BASICS (title, subtitle, category, level, language, description, tags)
            ==================================================================== */}
        {activeStep === 0 && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E1F5] pb-4">
              <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                Step a — Course basics
              </h2>
              <p className="text-[14px] text-[#5F5B75]">
                Set your course title, subtitle, category, difficulty level, language, and discovery tags.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2 space-y-1.5">
                <label htmlFor="wizard-title" className="block text-[14px] font-bold text-[#1E1B2E]">
                  Course title *
                </label>
                <input
                  id="wizard-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (wizardErrors.length > 0) setWizardErrors([]);
                    triggerAutosave();
                  }}
                  placeholder="e.g. Complete React Developer Course"
                  className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[15px] text-[#1E1B2E]"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-[14px] font-bold text-[#1E1B2E]">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => {
                    setSubtitle(e.target.value);
                    triggerAutosave();
                  }}
                  placeholder="A concise 1-sentence summary of what students will build..."
                  className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[15px] text-[#1E1B2E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[14px] font-bold text-[#1E1B2E]">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    triggerAutosave();
                  }}
                  className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[15px] text-[#1E1B2E]"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[14px] font-bold text-[#1E1B2E]">
                    Level
                  </label>
                  <select
                    value={level}
                    onChange={(e) => {
                      setLevel(e.target.value as Course['level']);
                      triggerAutosave();
                    }}
                    className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[15px] text-[#1E1B2E]"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[14px] font-bold text-[#1E1B2E]">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      triggerAutosave();
                    }}
                    className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[15px] text-[#1E1B2E]"
                  >
                    <option value="English">English</option>
                    <option value="English & Arabic CC">English & Arabic CC</option>
                    <option value="Spanish CC">Spanish CC</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label htmlFor="wizard-description" className="block text-[14px] font-bold text-[#1E1B2E]">
                  Full course description
                </label>
                <textarea
                  id="wizard-description"
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (wizardErrors.length > 0) setWizardErrors([]);
                    triggerAutosave();
                  }}
                  className="w-full p-3.5 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[15px] text-[#1E1B2E]"
                />
              </div>

              {/* Tags input */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-[14px] font-bold text-[#1E1B2E]">
                  Search tags
                </label>
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5]">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E6E1F5] text-[13px] font-bold text-[#6D4AE0]"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTags((prev) => prev.filter((item) => item !== t));
                          triggerAutosave();
                        }}
                        className="text-[#5F5B75] hover:text-[#DC2626] cursor-pointer"
                        aria-label={`Remove tag ${t}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          e.preventDefault();
                          if (!tags.includes(tagInput.trim())) {
                            setTags((prev) => [...prev, tagInput.trim()]);
                          }
                          setTagInput('');
                          triggerAutosave();
                        }
                      }}
                      placeholder="Add a tag and press Enter..."
                      className="flex-1 h-9 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px] focus:outline-none focus:border-[#6D4AE0]"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                          setTags((prev) => [...prev, tagInput.trim()]);
                          setTagInput('');
                          triggerAutosave();
                        }
                      }}
                    >
                      Add tag
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            STEP B: MEDIA (Cover image upload with drag-drop, crop, 16:9 preview +
            Demo video upload. Upload states: idle, uploading %, success, error.
            File rules: JPG/PNG up to 5MB, MP4 up to 2GB)
            ==================================================================== */}
        {activeStep === 1 && (
          <div className="space-y-8">
            <div className="border-b border-[#E6E1F5] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                  Step b — Course media & promotional video
                </h2>
                <p className="text-[14px] text-[#5F5B75]">
                  File rules: Cover image <strong>JPG/PNG up to 5MB</strong> (16:9 aspect ratio) •
                  Demo video <strong>MP4 up to 2GB</strong>.
                </p>
              </div>
              <StatusChip label="All 4 uploader states interactive" variant="primary" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 1. COVER IMAGE UPLOADER */}
              <div className="rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#6D4AE0]" />
                    <div>
                      <h3 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                        Course cover image (16:9)
                      </h3>
                      <p className="text-[12px] text-[#5F5B75]">
                        Allowed: JPG/PNG up to 5MB (1920×1080 recommended)
                      </p>
                    </div>
                  </div>

                  {/* Interactive State Switcher for Cover Uploader */}
                  <div className="inline-flex items-center gap-1 p-1 rounded-[8px] bg-white border border-[#E6E1F5] text-[11px]">
                    {(['idle', 'uploading', 'success', 'error'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setCoverUploadState(st)}
                        className={`px-2 py-0.5 rounded font-bold capitalize cursor-pointer ${
                          coverUploadState === st
                            ? 'bg-[#6D4AE0] text-white'
                            : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* IDLE STATE */}
                {coverUploadState === 'idle' && (
                  <div
                    onClick={() => {
                      setCoverProgress(25);
                      setCoverUploadState('uploading');
                    }}
                    className="rounded-[12px] border-2 border-dashed border-[#A78BFA] bg-white hover:bg-[#F3EFFF]/50 p-8 text-center space-y-3 cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#F3EFFF] text-[#6D4AE0] flex items-center justify-center mx-auto">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-[17px] text-[#1E1B2E]">
                        Drag & drop your 16:9 cover image here
                      </p>
                      <p className="text-[13px] text-[#5F5B75]">
                        or click to browse files • <strong>JPG/PNG up to 5MB</strong>
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Button size="sm" variant="secondary">
                        Choose image
                      </Button>
                    </div>
                  </div>
                )}

                {/* UPLOADING STATE (progress % + cancel) */}
                {coverUploadState === 'uploading' && (
                  <div className="rounded-[12px] bg-white border border-[#6D4AE0] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Loader2 className="w-5 h-5 text-[#6D4AE0] animate-spin" />
                        <div>
                          <p className="text-[14px] font-bold text-[#1E1B2E]">
                            Uploading react-19-cover-16x9.png...
                          </p>
                          <p className="text-[12px] text-[#5F5B75]">2.8 MB of 4.1 MB</p>
                        </div>
                      </div>
                      <span className="font-display font-bold text-[20px] text-[#6D4AE0]">
                        {coverProgress}%
                      </span>
                    </div>
                    <ProgressBar value={coverProgress} showValue={false} size="md" />
                    <div className="flex items-center justify-between pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCoverUploadState('idle')}
                      >
                        Cancel upload
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setCoverUploadState('success')}
                      >
                        Complete now
                      </Button>
                    </div>
                  </div>
                )}

                {/* SUCCESS STATE (16:9 crop preview + replace/remove) */}
                {coverUploadState === 'success' && (
                  <div className="rounded-[12px] bg-white border border-[#16A34A]/40 p-4 space-y-3">
                    <div className="relative aspect-video w-full rounded-[10px] overflow-hidden bg-[#1E1B2E] border border-[#E6E1F5]">
                      <img
                        src={coverPreviewUrl}
                        alt="16:9 Course cover preview"
                        className="w-full h-full object-cover transition-transform"
                        style={{ transform: `scale(${coverCropZoom / 100})` }}
                      />
                      {/* 16:9 Crop Grid Overlay */}
                      <div className="absolute inset-3 border-2 border-dashed border-white/75 rounded-[6px] pointer-events-none flex items-end justify-between p-2">
                        <span className="px-2 py-0.5 rounded bg-[#1E1B2E]/80 text-white text-[11px] font-bold inline-flex items-center gap-1">
                          <Crop className="w-3 h-3 text-[#F5B82E]" />
                          16:9 Safe crop frame ({coverCropZoom}%)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#16A34A] text-white text-[11px] font-bold">
                          JPG • 3.4 MB (Valid)
                        </span>
                      </div>
                    </div>

                    {/* Interactive Crop Zoom Slider + Replace / Remove */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-[12px] text-[#5F5B75]">
                        <Crop className="w-4 h-4 text-[#6D4AE0]" />
                        <span>Crop zoom:</span>
                        <input
                          type="range"
                          min={100}
                          max={135}
                          value={coverCropZoom}
                          onChange={(e) => setCoverCropZoom(Number(e.target.value))}
                          className="w-24 accent-[#6D4AE0] cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setCoverUploadState('uploading')}
                        >
                          Replace
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setCoverUploadState('idle')}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ERROR STATE (wrong type or too large + Retry) */}
                {coverUploadState === 'error' && (
                  <div className="rounded-[12px] bg-[#FEF2F2] border-2 border-[#DC2626]/40 p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                      <div className="text-[13px]">
                        <p className="font-bold text-[#DC2626]">
                          Cover image upload failed
                        </p>
                        <p className="text-[#5F5B75] mt-0.5">{coverErrorMsg}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        onClick={() => setCoverUploadState('uploading')}
                      >
                        Retry upload
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCoverUploadState('idle')}
                      >
                        Reset dropzone
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. DEMO VIDEO UPLOADER (MP4 up to 2GB) */}
              <div className="rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Film className="w-5 h-5 text-[#6D4AE0]" />
                    <div>
                      <h3 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                        Promotional demo video
                      </h3>
                      <p className="text-[12px] text-[#5F5B75]">
                        Allowed: MP4 up to 2GB (1080p H.264 recommended)
                      </p>
                    </div>
                  </div>

                  {/* Interactive State Switcher for Video Uploader */}
                  <div className="inline-flex items-center gap-1 p-1 rounded-[8px] bg-white border border-[#E6E1F5] text-[11px]">
                    {(['idle', 'uploading', 'success', 'error'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setVideoUploadState(st)}
                        className={`px-2 py-0.5 rounded font-bold capitalize cursor-pointer ${
                          videoUploadState === st
                            ? 'bg-[#6D4AE0] text-white'
                            : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {videoUploadState === 'idle' && (
                  <div
                    onClick={() => {
                      setVideoProgress(30);
                      setVideoUploadState('uploading');
                    }}
                    className="rounded-[12px] border-2 border-dashed border-[#A78BFA] bg-white hover:bg-[#F3EFFF]/50 p-8 text-center space-y-3 cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#F3EFFF] text-[#6D4AE0] flex items-center justify-center mx-auto">
                      <Film className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-[17px] text-[#1E1B2E]">
                        Drag & drop your promotional demo video
                      </p>
                      <p className="text-[13px] text-[#5F5B75]">
                        or click to select file • <strong>MP4 up to 2GB</strong>
                      </p>
                    </div>
                    <Button size="sm" variant="secondary">
                      Select MP4 video
                    </Button>
                  </div>
                )}

                {videoUploadState === 'uploading' && (
                  <div className="rounded-[12px] bg-white border border-[#6D4AE0] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Loader2 className="w-5 h-5 text-[#6D4AE0] animate-spin" />
                        <div>
                          <p className="text-[14px] font-bold text-[#1E1B2E]">
                            Uploading {videoFileName}...
                          </p>
                          <p className="text-[12px] text-[#5F5B75]">80 MB of 148 MB</p>
                        </div>
                      </div>
                      <span className="font-display font-bold text-[20px] text-[#6D4AE0]">
                        {videoProgress}%
                      </span>
                    </div>
                    <ProgressBar value={videoProgress} showValue={false} size="md" />
                    <div className="flex items-center justify-between pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setVideoUploadState('idle')}
                      >
                        Cancel upload
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setVideoUploadState('success')}
                      >
                        Complete now
                      </Button>
                    </div>
                  </div>
                )}

                {videoUploadState === 'success' && (
                  <div className="rounded-[12px] bg-white border border-[#16A34A]/40 p-4 space-y-3">
                    <div className="relative aspect-video w-full rounded-[10px] overflow-hidden bg-[#1E1B2E] flex flex-col items-center justify-center text-white p-4">
                      <img
                        src={coverPreviewUrl}
                        alt="Demo video preview"
                        className="absolute inset-0 w-full h-full object-cover opacity-40"
                      />
                      <div className="relative z-10 text-center space-y-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#16A34A] text-white text-[11px] font-bold">
                          MP4 encoded • 1080p HD
                        </span>
                        <p className="font-display font-bold text-[16px]">{videoFileName}</p>
                        <p className="text-[12px] text-white/80">Duration: 03:45 • Ready for preview</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[12px] font-semibold text-[#16A34A] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        MP4 verified (under 2GB limit)
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setVideoUploadState('uploading')}
                        >
                          Replace
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setVideoUploadState('idle')}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {videoUploadState === 'error' && (
                  <div className="rounded-[12px] bg-[#FEF2F2] border-2 border-[#DC2626]/40 p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                      <div className="text-[13px]">
                        <p className="font-bold text-[#DC2626]">
                          Demo video upload error
                        </p>
                        <p className="text-[#5F5B75] mt-0.5">{videoErrorMsg}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        onClick={() => setVideoUploadState('uploading')}
                      >
                        Retry upload
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setVideoUploadState('idle')}
                      >
                        Reset dropzone
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            STEP C: CURRICULUM (Sections and lessons, drag to reorder, add lesson
            with title, video upload, attachments, free-preview toggle; durations
            calculated automatically)
            ==================================================================== */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E1F5] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                  Step c — Curriculum builder
                </h2>
                <p className="text-[14px] text-[#5F5B75]">
                  Drag lessons to reorder or use the arrow controls. Total course duration is
                  calculated automatically.
                </p>
              </div>

              {/* Auto-calculated duration summary pill */}
              <div className="px-4 py-2.5 rounded-[12px] bg-[#F3EFFF] border border-[#E6E1F5] flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#6D4AE0]" />
                <div className="text-[13px]">
                  <p className="font-bold text-[#1E1B2E]">
                    Auto-calculated duration: {curriculumTotals.formattedDuration}
                  </p>
                  <p className="text-[11px] text-[#5F5B75]">
                    {curriculumTotals.totalSections} sections • {curriculumTotals.totalLessons}{' '}
                    lessons • {curriculumTotals.previewCount} free previews
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {sections.map((section, sIdx) => {
                const secMinutes = section.lessons.reduce(
                  (acc, l) => acc + l.durationMinutes,
                  0
                );
                return (
                  <div
                    key={section.id}
                    className="rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] overflow-hidden"
                  >
                    {/* Section Header */}
                    <div className="px-5 py-3.5 bg-white border-b border-[#E6E1F5] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <GripVertical className="w-4 h-4 text-[#5F5B75]" />
                        <h3 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                          {section.title}
                        </h3>
                        <StatusChip
                          label={`${section.lessons.length} lessons • ${formatTotalMinutes(
                            secMinutes
                          )}`}
                          variant="primary"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Plus className="w-3.5 h-3.5" />}
                          onClick={() => setAddingToSectionId(section.id)}
                        >
                          Add lesson
                        </Button>
                        {sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setSections((prev) =>
                                prev.filter((item) => item.id !== section.id)
                              )
                            }
                            className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                            title="Delete section"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lessons List (Drag to reorder + Up/Down controls) */}
                    <div className="p-4 space-y-2.5">
                      {section.lessons.map((lesson, lIdx) => (
                        <div
                          key={lesson.id}
                          draggable
                          onDragStart={() =>
                            setDraggedLessonInfo({ sectionId: section.id, lessonIdx: lIdx })
                          }
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (
                              draggedLessonInfo &&
                              draggedLessonInfo.sectionId === section.id &&
                              draggedLessonInfo.lessonIdx !== lIdx
                            ) {
                              handleMoveLesson(
                                section.id,
                                draggedLessonInfo.lessonIdx,
                                lIdx
                              );
                            }
                            setDraggedLessonInfo(null);
                          }}
                          className="p-3.5 rounded-[10px] bg-white border border-[#E6E1F5] hover:border-[#A78BFA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <GripVertical className="w-4 h-4 text-[#5F5B75] shrink-0 mt-1 sm:mt-0" />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-[14px] text-[#1E1B2E]">
                                  {lesson.title}
                                </span>
                                {lesson.isFreePreview && (
                                  <StatusChip label="Free preview" variant="success" />
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#5F5B75] mt-1">
                                <span className="inline-flex items-center gap-1">
                                  <Film className="w-3.5 h-3.5 text-[#6D4AE0]" />
                                  {lesson.videoFileName}
                                </span>
                                {lesson.attachmentName && (
                                  <span className="inline-flex items-center gap-1">
                                    <Paperclip className="w-3.5 h-3.5 text-[#F59E3B]" />
                                    {lesson.attachmentName}
                                  </span>
                                )}
                                <span className="font-semibold text-[#6D4AE0]">
                                  • {lesson.durationMinutes}m video
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {/* Free-preview toggle */}
                            <label className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#5F5B75] cursor-pointer mr-2">
                              <input
                                type="checkbox"
                                checked={lesson.isFreePreview}
                                onChange={() => {
                                  triggerAutosave();
                                  setSections((prev) =>
                                    prev.map((s) =>
                                      s.id !== section.id
                                        ? s
                                        : {
                                            ...s,
                                            lessons: s.lessons.map((l) =>
                                              l.id === lesson.id
                                                ? { ...l, isFreePreview: !l.isFreePreview }
                                                : l
                                            ),
                                          }
                                    )
                                  );
                                }}
                                className="accent-[#6D4AE0] w-3.5 h-3.5 rounded cursor-pointer"
                              />
                              <span>Preview</span>
                            </label>

                            <button
                              type="button"
                              disabled={lIdx === 0}
                              onClick={() => handleMoveLesson(section.id, lIdx, lIdx - 1)}
                              className="p-1.5 rounded-[8px] border border-[#E6E1F5] text-[#5F5B75] hover:text-[#6D4AE0] disabled:opacity-40 cursor-pointer"
                              title="Move lesson up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={lIdx === section.lessons.length - 1}
                              onClick={() => handleMoveLesson(section.id, lIdx, lIdx + 1)}
                              className="p-1.5 rounded-[8px] border border-[#E6E1F5] text-[#5F5B75] hover:text-[#6D4AE0] disabled:opacity-40 cursor-pointer"
                              title="Move lesson down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                triggerAutosave();
                                setSections((prev) =>
                                  prev.map((s) =>
                                    s.id !== section.id
                                      ? s
                                      : {
                                          ...s,
                                          lessons: s.lessons.filter(
                                            (l) => l.id !== lesson.id
                                          ),
                                        }
                                  )
                                );
                              }}
                              className="p-1.5 rounded-[8px] border border-[#E6E1F5] text-[#5F5B75] hover:text-[#DC2626] cursor-pointer"
                              title="Remove lesson"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Inline Add Lesson Box */}
                      {addingToSectionId === section.id && (
                        <div className="p-4 rounded-[12px] bg-[#F3EFFF] border-2 border-[#6D4AE0] space-y-4">
                          <h4 className="font-display font-bold text-[16px] text-[#1E1B2E]">
                            Add new lesson to {section.title}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[12px] font-bold text-[#1E1B2E] mb-1">
                                Lesson title *
                              </label>
                              <input
                                type="text"
                                value={newLessonTitle}
                                onChange={(e) => setNewLessonTitle(e.target.value)}
                                placeholder="e.g. 6. Server Actions & Form Validation"
                                className="w-full h-10 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[12px] font-bold text-[#1E1B2E] mb-1">
                                Video upload (MP4 up to 2GB) & auto-detected minutes
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={newLessonVideo}
                                  onChange={(e) => setNewLessonVideo(e.target.value)}
                                  className="flex-1 h-10 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px]"
                                />
                                <input
                                  type="number"
                                  min={1}
                                  max={180}
                                  value={newLessonMinutes}
                                  onChange={(e) => setNewLessonMinutes(e.target.value)}
                                  className="w-20 h-10 px-2.5 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px] font-bold text-[#6D4AE0]"
                                  title="Video duration in minutes"
                                />
                                <span className="text-[12px] text-[#5F5B75]">min</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[12px] font-bold text-[#1E1B2E] mb-1">
                                Downloadable attachment (PDF / ZIP)
                              </label>
                              <input
                                type="text"
                                value={newLessonAttachment}
                                onChange={(e) => setNewLessonAttachment(e.target.value)}
                                placeholder="e.g. Starter-Code-Lab.zip"
                                className="w-full h-10 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px]"
                              />
                            </div>
                            <div className="flex items-end pb-2">
                              <label className="inline-flex items-center gap-2 text-[13px] font-bold text-[#1E1B2E] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newLessonPreview}
                                  onChange={(e) => setNewLessonPreview(e.target.checked)}
                                  className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                                />
                                <span>Allow free preview before enrollment</span>
                              </label>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setAddingToSectionId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleAddLesson(section.id)}
                            >
                              Save lesson
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add New Section Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5]">
              <input
                type="text"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="New section title (e.g. Section 4: Capstone Project & CI/CD)..."
                className="flex-1 h-10 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] text-[14px] focus:outline-none focus:border-[#6D4AE0]"
              />
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleAddSection}
              >
                Add section
              </Button>
            </div>
          </div>
        )}

        {/* ====================================================================
            STEP D: PRICING (Free or Paid, price, optional discount)
            ==================================================================== */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E1F5] pb-4">
              <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                Step d — Course pricing & promotions
              </h2>
              <p className="text-[14px] text-[#5F5B75]">
                Choose whether your course is Free or Paid, and configure optional promotional discounts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              {(
                [
                  {
                    id: 'paid',
                    title: 'Paid course',
                    desc: 'Charge a one-time enrollment price with lifetime student access.',
                  },
                  {
                    id: 'free',
                    title: 'Free course',
                    desc: 'Open enrollment at $0.00 to grow your student community.',
                  },
                ] as const
              ).map((pm) => {
                const selected = pricingMode === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => {
                      setPricingMode(pm.id);
                      triggerAutosave();
                    }}
                    className={`p-5 rounded-[12px] border-2 text-left transition-all cursor-pointer space-y-1.5 ${
                      selected
                        ? 'bg-[#F3EFFF] border-[#6D4AE0] shadow-purple-sm'
                        : 'bg-white border-[#E6E1F5] hover:border-[#A78BFA]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-[19px] text-[#1E1B2E]">
                        {pm.title}
                      </span>
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          selected ? 'bg-[#6D4AE0] text-white' : 'border border-[#E6E1F5]'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3" />}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#5F5B75]">{pm.desc}</p>
                  </button>
                );
              })}
            </div>

            {pricingMode === 'paid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl pt-2">
                <div className="space-y-1.5">
                  <label htmlFor="wizard-price" className="block text-[14px] font-bold text-[#1E1B2E]">
                    Course price (USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-[#6D4AE0] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="wizard-price"
                      type="number"
                      step="0.01"
                      value={priceAmount}
                      onChange={(e) => {
                        setPriceAmount(e.target.value);
                        if (wizardErrors.length > 0) setWizardErrors([]);
                        triggerAutosave();
                      }}
                      className="w-full h-11 pl-9 pr-4 rounded-[10px] bg-white border border-[#E6E1F5] font-display font-bold text-[18px] text-[#1E1B2E] focus:outline-none focus:border-[#6D4AE0]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 text-[14px] font-bold text-[#1E1B2E] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasDiscount}
                      onChange={(e) => {
                        setHasDiscount(e.target.checked);
                        triggerAutosave();
                      }}
                      className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                    />
                    <span>Enable promotional discount (Original price)</span>
                  </label>
                  {hasDiscount && (
                    <input
                      type="number"
                      step="0.01"
                      value={originalPriceAmount}
                      onChange={(e) => setOriginalPriceAmount(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] text-[15px] text-[#5F5B75]"
                      placeholder="Original price (e.g. 89.99)"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            STEP E: FINAL EXAM (Link to the Question Bank, pass score)
            ==================================================================== */}
        {activeStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E1F5] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                  Step e — Final certification exam setup
                </h2>
                <p className="text-[14px] text-[#5F5B75]">
                  Connect your course to the Question Bank and set the minimum passing score for certificates.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/instructor/question-bank">
                  <Button
                    variant="secondary"
                    size="sm"
                    rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    Open Question Bank
                  </Button>
                </Link>
                <Link to="/instructor/exam-settings">
                  <Button variant="ghost" size="sm">
                    Advanced Exam Settings
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl">
              <div className="space-y-1.5">
                <label className="block text-[14px] font-bold text-[#1E1B2E]">
                  Question Bank source
                </label>
                <select
                  value={linkedQuestionBankCourseId}
                  onChange={(e) => setLinkedQuestionBankCourseId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] text-[14px] font-semibold text-[#1E1B2E]"
                >
                  <option value="course-1">Complete React Developer Bank (20 questions)</option>
                  <option value="course-5">Full-Stack TypeScript Bank (14 questions)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[14px] font-bold text-[#1E1B2E]">
                  Questions per attempt
                </label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={examQuestionsCount}
                  onChange={(e) => setExamQuestionsCount(Number(e.target.value))}
                  className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] font-bold text-[15px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[14px] font-bold text-[#1E1B2E]">
                  Minimum pass score (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={50}
                    max={90}
                    step={5}
                    value={examPassScore}
                    onChange={(e) => setExamPassScore(Number(e.target.value))}
                    className="flex-1 accent-[#6D4AE0] cursor-pointer"
                  />
                  <span className="font-display font-bold text-[22px] text-[#6D4AE0] w-14">
                    {examPassScore}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-3xl">
              <div className="space-y-1">
                <p className="font-display font-bold text-[16px] text-[#1E1B2E]">
                  Certificate issuance rule
                </p>
                <p className="text-[13px] text-[#5F5B75]">
                  Students who complete 100% of your {curriculumTotals.totalLessons} lessons and
                  score {examPassScore}%+ on the final exam will automatically receive a signed
                  EduHub certificate.
                </p>
              </div>
              <StatusChip label="Auto-verified" variant="success" />
            </div>
          </div>
        )}

        {/* ====================================================================
            STEP F: REVIEW AND SUBMIT FOR APPROVAL (with checklist of missing items)
            ==================================================================== */}
        {activeStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E1F5] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                  Step f — Review & submit for supervisor approval
                </h2>
                <p className="text-[14px] text-[#5F5B75]">
                  Verify all required course elements before sending your syllabus to Supervisor Hana Mostafa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSimulateMissingItems((v) => !v)}
                className="px-3 py-1.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] hover:border-[#6D4AE0] text-[12px] font-bold text-[#6D4AE0] inline-flex items-center gap-1.5 cursor-pointer self-start"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F59E3B]" />
                <span>
                  {simulateMissingItems
                    ? 'Show all items complete'
                    : 'Simulate missing items checklist'}
                </span>
              </button>
            </div>

            {/* Missing items alert banner if any item is incomplete */}
            {missingCount > 0 ? (
              <div className="rounded-[12px] bg-[#FFFBEB] border-2 border-[#F59E0B]/50 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
                <div className="text-[14px]">
                  <p className="font-bold text-[#1E1B2E]">
                    {missingCount} required {missingCount === 1 ? 'item is' : 'items are'} missing
                    before submission
                  </p>
                  <p className="text-[#5F5B75] text-[13px]">
                    Resolve the highlighted checklist items below (or save as Draft to finish later).
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-[12px] bg-[#16A34A]/8 border border-[#16A34A]/35 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
                  <p className="text-[14px] font-bold text-[#1E1B2E]">
                    All 5 submission requirements passed! Your course is ready for supervisor review.
                  </p>
                </div>
                <StatusChip label="Ready to submit" variant="success" />
              </div>
            )}

            {/* Checklist of Missing / Completed Items */}
            <div className="space-y-3">
              {checklistItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-[12px] border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.done
                      ? 'bg-white border-[#E6E1F5]'
                      : 'bg-[#FEF2F2]/60 border-[#DC2626]/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        item.done
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-[#DC2626] text-white'
                      }`}
                    >
                      {item.done ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-[#1E1B2E]">{item.label}</p>
                      <p
                        className={`text-[13px] ${
                          item.done ? 'text-[#5F5B75]' : 'text-[#DC2626] font-semibold'
                        }`}
                      >
                        {item.detail}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={item.done ? 'ghost' : 'secondary'}
                    onClick={() => setActiveStep(item.stepIdx)}
                  >
                    {item.done ? 'Edit step' : 'Fix missing item'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WIZARD FOOTER NAVIGATION */}
        <div className="pt-6 border-t border-[#E6E1F5] flex flex-wrap items-center justify-between gap-4">
          <Button
            variant="secondary"
            disabled={activeStep === 0}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
            onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
          >
            Previous step
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={() => handleSaveCourse('Draft')}>
              Save as draft
            </Button>
            {activeStep < WIZARD_STEPS.length - 1 ? (
              <Button
                variant="primary"
                rightIcon={<ChevronRight className="w-4 h-4" />}
                onClick={() => {
                  const stepErrs: FormErrorItem[] = [];
                  if (activeStep === 0) {
                    if (title.trim().length < 6) {
                      stepErrs.push({
                        field: 'Course title',
                        message: 'Course title must be at least 6 characters long.',
                        targetId: 'wizard-title',
                      });
                    }
                    if (description.trim().length < 20) {
                      stepErrs.push({
                        field: 'Full course description',
                        message: 'Full course description must be at least 20 characters.',
                        targetId: 'wizard-description',
                      });
                    }
                  } else if (activeStep === 3 && pricingMode === 'paid' && !(Number(priceAmount) > 0)) {
                    stepErrs.push({
                      field: 'Course price',
                      message: 'Enter a valid course price greater than $0.00.',
                      targetId: 'wizard-price',
                    });
                  }
                  if (stepErrs.length > 0) {
                    setWizardErrors(stepErrs);
                    setWizardSummaryKey((k) => k + 1);
                    return;
                  }
                  setWizardErrors([]);
                  setActiveStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1));
                }}
              >
                Continue to Step {WIZARD_STEPS[activeStep + 1].letter.toUpperCase()}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                leftIcon={<FileCheck2 className="w-5 h-5" />}
                onClick={() => handleSaveCourse('Pending review')}
              >
                Submit for approval
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
