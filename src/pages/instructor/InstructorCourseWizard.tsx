import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crop,
  DollarSign,
  ExternalLink,
  FileCheck2,
  Film,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import type { UploadProgressEvent } from '../../api/http';
import { isApiError } from '../../api/errors';
import { useCategories, usePublicConfig } from '../../api/hooks/useCatalog';
import {
  useCreateInstructorCourseMutation,
  useInstructorCourseDetail,
  useInstructorCourses,
  usePutCurriculumMutation,
  useSubmitCourseMutation,
  useUpdateInstructorCourseMutation,
} from '../../api/hooks/useInstructor';
import {
  useCourseQuestions,
  useUpdateExamSettingsMutation,
} from '../../api/hooks/useQuestions';
import {
  COURSE_LANGUAGE_LABELS,
  COURSE_LEVEL_LABELS,
  toCourseLanguageDto,
  toCourseLevelDto,
} from '../../api/mappers/course.mapper';
import { uploadsService } from '../../api/services/uploads.service';
import {
  Breadcrumbs,
  Button,
  FormErrorSummary,
  ProgressBar,
  QueryErrorState,
  Skeleton,
  StatusChip,
  type FormErrorItem,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import type { Course } from '../../data/mockData';
import { formatBytes } from '../../lib/format';
import { handleImageError } from '../../utils/imageFallback';

type UploadVisualState = 'idle' | 'uploading' | 'success' | 'error';

interface WizardLesson {
  id: string;
  title: string;
  durationMinutes: number;
  videoFileName: string;
  videoUrl?: string;
  attachmentName?: string;
  attachmentUrl?: string;
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

const DEFAULT_SECTIONS: WizardSection[] = [
  {
    id: 'wsec-1',
    title: 'Section 1: Architecture & Workspace Setup',
    lessons: [
      {
        id: 'wles-1',
        title: '1. Course Tour & Workspace Structure',
        durationMinutes: 14,
        videoFileName: '01-workspace-tour.mp4',
        isFreePreview: true,
      },
      {
        id: 'wles-2',
        title: '2. Strict TypeScript & Toolchain Setup',
        durationMinutes: 22,
        videoFileName: '02-ts-setup.mp4',
        isFreePreview: true,
      },
    ],
  },
  {
    id: 'wsec-2',
    title: 'Section 2: Core Patterns & Delivery',
    lessons: [
      {
        id: 'wles-3',
        title: '3. Practical Architecture & State Flows',
        durationMinutes: 28,
        videoFileName: '03-state-flows.mp4',
        isFreePreview: false,
      },
    ],
  },
];

function formatTotalMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function mapServerFieldErrors(fieldErrors?: Record<string, string[]>): FormErrorItem[] {
  if (!fieldErrors) return [];
  const targetMap: Record<string, string> = {
    title: 'wizard-title',
    subtitle: 'wizard-subtitle',
    description: 'wizard-description',
    categoryId: 'wizard-category',
    price: 'wizard-price',
  };
  return Object.entries(fieldErrors).map(([field, messages]) => ({
    field,
    message: messages[0] ?? 'Please review this requirement.',
    targetId: targetMap[field],
  }));
}

export const InstructorCreateCoursePage: React.FC = () => {
  const { addToast } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editCourseId = searchParams.get('edit') || '';

  const categoriesQuery = useCategories();
  const publicConfigQuery = usePublicConfig();
  const taughtCoursesQuery = useInstructorCourses({ status: 'all', limit: 50 });
  const courseDetailQuery = useInstructorCourseDetail(editCourseId, Boolean(editCourseId));

  const createCourseMutation = useCreateInstructorCourseMutation();
  const updateCourseMutation = useUpdateInstructorCourseMutation();
  const putCurriculumMutation = usePutCurriculumMutation();
  const updateExamSettingsMutation = useUpdateExamSettingsMutation();
  const submitCourseMutation = useSubmitCourseMutation();

  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data]
  );
  const uploadLimits = publicConfigQuery.data?.uploadLimits;
  const coverMaxBytes = uploadLimits?.courseCoverMaxBytes ?? 5 * 1024 * 1024;
  const videoMaxBytes = uploadLimits?.lessonVideoMaxBytes ?? 2 * 1024 * 1024 * 1024;
  const attachmentMaxBytes = uploadLimits?.attachmentMaxBytes ?? 50 * 1024 * 1024;

  const [draftCourseId, setDraftCourseId] = useState<string>(editCourseId);
  const [hydratedCourseId, setHydratedCourseId] = useState<string>('');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastAutosaved, setLastAutosaved] = useState<string>('Not saved yet');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [wizardErrors, setWizardErrors] = useState<FormErrorItem[]>([]);
  const [wizardSummaryKey, setWizardSummaryKey] = useState<number>(0);

  // Step a. Basics
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [categoryId, setCategoryId] = useState('cat-web');
  const [level, setLevel] = useState<Course['level']>('Intermediate');
  const [language, setLanguage] = useState('English');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>(['React 19', 'TypeScript']);
  const [tagInput, setTagInput] = useState('');

  // Step b. Media uploads
  const [coverUploadState, setCoverUploadState] = useState<UploadVisualState>('idle');
  const [coverProgress, setCoverProgress] = useState<number>(0);
  const [coverLoadedBytes, setCoverLoadedBytes] = useState<number>(0);
  const [coverTotalBytes, setCoverTotalBytes] = useState<number>(0);
  const [coverCropZoom, setCoverCropZoom] = useState<number>(100);
  const [coverFileName, setCoverFileName] = useState<string>('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>('');
  const [coverErrorMsg, setCoverErrorMsg] = useState<string>('');
  const [lastCoverFile, setLastCoverFile] = useState<File | null>(null);
  const coverAbortRef = useRef<AbortController | null>(null);

  const [videoUploadState, setVideoUploadState] = useState<UploadVisualState>('idle');
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [videoLoadedBytes, setVideoLoadedBytes] = useState<number>(0);
  const [videoTotalBytes, setVideoTotalBytes] = useState<number>(0);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoErrorMsg, setVideoErrorMsg] = useState<string>('');
  const [lastVideoFile, setLastVideoFile] = useState<File | null>(null);
  const videoAbortRef = useRef<AbortController | null>(null);

  // Step c. Curriculum
  const [sections, setSections] = useState<WizardSection[]>(DEFAULT_SECTIONS);
  const [addingToSectionId, setAddingToSectionId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonMinutes, setNewLessonMinutes] = useState('18');
  const [newLessonVideo, setNewLessonVideo] = useState('');
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState('');
  const [newLessonVideoProgress, setNewLessonVideoProgress] = useState<number>(0);
  const [uploadingLessonVideo, setUploadingLessonVideo] = useState(false);
  const [newLessonAttachment, setNewLessonAttachment] = useState('');
  const [newLessonAttachmentUrl, setNewLessonAttachmentUrl] = useState('');
  const [uploadingLessonAttachment, setUploadingLessonAttachment] = useState(false);
  const [newLessonPreview, setNewLessonPreview] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [draggedLessonInfo, setDraggedLessonInfo] = useState<{
    sectionId: string;
    lessonIdx: number;
  } | null>(null);

  // Step d. Pricing
  const [pricingMode, setPricingMode] = useState<'paid' | 'free'>('paid');
  const [priceAmount, setPriceAmount] = useState<string>('49.99');
  const [hasDiscount, setHasDiscount] = useState<boolean>(false);
  const [originalPriceAmount, setOriginalPriceAmount] = useState<string>('89.99');

  // Step e. Final exam
  const [linkedQuestionBankCourseId, setLinkedQuestionBankCourseId] =
    useState<string>('');
  const [examQuestionsCount, setExamQuestionsCount] = useState<number>(5);
  const [examDurationMinutes, setExamDurationMinutes] = useState<number>(30);
  const [examPassScore, setExamPassScore] = useState<number>(60);

  // Live Question Bank check for this draft course
  const draftQuestionsQuery = useCourseQuestions(
    draftCourseId,
    { page: 1, limit: 1 },
    Boolean(draftCourseId)
  );
  const bankQuestionCount = draftCourseId ? (draftQuestionsQuery.data?.meta.total ?? 0) : 0;

  useEffect(() => {
    setDraftCourseId(editCourseId);
  }, [editCourseId]);

  // Default category when catalog categories arrive for a fresh draft
  useEffect(() => {
    if (!editCourseId && categories.length > 0 && !categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0].id);
    }
  }, [editCourseId, categories, categoryId]);

  // Hydrate existing course into wizard state once fetched
  useEffect(() => {
    const detail = courseDetailQuery.data;
    if (!detail || hydratedCourseId === detail.id) return;

    setTitle(detail.title);
    setSubtitle(detail.subtitle);
    setCategoryId(detail.category.id);
    setLevel(COURSE_LEVEL_LABELS[detail.level]);
    setLanguage(COURSE_LANGUAGE_LABELS[detail.language] ?? 'English');
    setDescription(detail.description);
    setTags(detail.tags);

    if (detail.thumbnailUrl) {
      setCoverPreviewUrl(detail.thumbnailUrl);
      setCoverFileName(detail.thumbnailUrl.split('/').pop() || 'course-cover.jpg');
      setCoverUploadState('success');
    } else {
      setCoverPreviewUrl('');
      setCoverUploadState('idle');
    }

    if (detail.previewVideoUrl) {
      setVideoUrl(detail.previewVideoUrl);
      setVideoFileName(detail.previewVideoUrl.split('/').pop() || 'demo-video.mp4');
      setVideoUploadState('success');
    } else {
      setVideoUrl('');
      setVideoUploadState('idle');
    }

    if (detail.sections.length > 0) {
      setSections(
        detail.sections.map((sec) => ({
          id: sec.id,
          title: sec.title,
          lessons: sec.lessons.map((les) => ({
            id: les.id,
            title: les.title,
            durationMinutes: Math.max(1, Math.round(les.durationSeconds / 60)),
            videoFileName: les.videoUrl?.split('/').pop() || 'lesson-video.mp4',
            videoUrl: les.videoUrl ?? undefined,
            attachmentName: les.attachments[0]?.title,
            attachmentUrl: les.attachments[0]?.url,
            isFreePreview: les.isPreview,
          })),
        }))
      );
    }

    setPricingMode(detail.isFree ? 'free' : 'paid');
    setPriceAmount(String(detail.price.amount));
    setHasDiscount(Boolean(detail.originalPrice && detail.originalPrice.amount > detail.price.amount));
    setOriginalPriceAmount(
      detail.originalPrice ? String(detail.originalPrice.amount) : '89.99'
    );

    setLinkedQuestionBankCourseId(detail.linkedQuestionBankCourseId ?? detail.id);
    setExamQuestionsCount(detail.examQuestionsCount);
    setExamDurationMinutes(Math.round(detail.examDurationSeconds / 60));
    setExamPassScore(detail.examPassScorePercent);

    setHydratedCourseId(detail.id);
    setAutosaveStatus('saved');
    setLastAutosaved('Synced with server');
    setHasUnsavedChanges(false);
  }, [courseDetailQuery.data, hydratedCourseId]);

  const markDirty = () => {
    setHasUnsavedChanges(true);
  };

  // Cleanup any in-flight uploads on unmount
  useEffect(() => {
    return () => {
      coverAbortRef.current?.abort();
      videoAbortRef.current?.abort();
    };
  }, []);

  // Build metadata DTO from current wizard form
  const buildMetadataPayload = () => {
    const parsedPrice = pricingMode === 'free' ? 0 : Math.max(0, Number(priceAmount) || 0);
    const parsedOriginal =
      pricingMode === 'paid' && hasDiscount && Number(originalPriceAmount) > parsedPrice
        ? Number(originalPriceAmount)
        : null;

    return {
      title: title.trim(),
      subtitle: subtitle.trim(),
      description:
        description.trim().length >= 20
          ? description.trim()
          : `${title.trim() || 'Course'} comprehensive syllabus and hands-on engineering workshop.`,
      categoryId,
      level: toCourseLevelDto(level) ?? 'intermediate',
      language: toCourseLanguageDto(language) ?? 'en',
      tags,
      thumbnailUrl: coverPreviewUrl || undefined,
      previewVideoUrl: videoUrl || null,
      price: { amount: parsedPrice, currency: 'USD' },
      originalPrice: parsedOriginal ? { amount: parsedOriginal, currency: 'USD' } : null,
      isFree: pricingMode === 'free',
    };
  };

  const buildCurriculumPayload = () => ({
    sections: sections.map((sec, sIdx) => ({
      id: sec.id.startsWith('wsec-') ? undefined : sec.id,
      title: sec.title.trim() || `Section ${sIdx + 1}`,
      order: sIdx,
      lessons: sec.lessons.map((les, lIdx) => ({
        id: les.id.startsWith('wles-') ? undefined : les.id,
        title: les.title.trim() || `Lesson ${lIdx + 1}`,
        type: 'video' as const,
        durationSeconds: Math.max(60, Math.min(10800, les.durationMinutes * 60)),
        videoUrl: les.videoUrl || `https://cdn.eduhub.example/videos/${les.id}.mp4`,
        attachmentUrl: les.attachmentUrl || null,
        attachmentName: les.attachmentName || null,
        isPreview: les.isFreePreview,
        order: lIdx,
      })),
    })),
  });

  // Real debounced autosave once a draft exists on the backend
  useEffect(() => {
    if (!hasUnsavedChanges || !draftCourseId || title.trim().length < 6) {
      return;
    }
    const timer = window.setTimeout(async () => {
      setAutosaveStatus('saving');
      try {
        await updateCourseMutation.mutateAsync({
          courseId: draftCourseId,
          payload: buildMetadataPayload(),
          silent: true,
        });
        setAutosaveStatus('saved');
        setLastAutosaved(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
        setHasUnsavedChanges(false);
      } catch {
        setAutosaveStatus('idle');
      }
    }, 1200);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, draftCourseId, title, subtitle, categoryId, level, language, description, tags, pricingMode, priceAmount, hasDiscount, originalPriceAmount, coverPreviewUrl, videoUrl]);

  // Real Cover Image Upload handler
  const uploadCoverFile = async (file: File) => {
    const validType =
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      /\.(jpe?g|png)$/i.test(file.name);
    if (!validType) {
      setCoverErrorMsg(
        `Invalid file "${file.name}". Only JPG and PNG cover images are accepted.`
      );
      setCoverUploadState('error');
      return;
    }
    if (file.size > coverMaxBytes) {
      setCoverErrorMsg(
        `File "${file.name}" (${formatBytes(file.size)}) exceeds the ${formatBytes(coverMaxBytes, 0)} maximum limit.`
      );
      setCoverUploadState('error');
      return;
    }

    coverAbortRef.current?.abort();
    const controller = new AbortController();
    coverAbortRef.current = controller;

    setLastCoverFile(file);
    setCoverFileName(file.name);
    setCoverTotalBytes(file.size);
    setCoverLoadedBytes(0);
    setCoverProgress(0);
    setCoverErrorMsg('');
    setCoverUploadState('uploading');

    try {
      const res = await uploadsService.uploadFile({
        kind: 'course_cover',
        file,
        signal: controller.signal,
        onProgress: (ev: UploadProgressEvent) => {
          setCoverLoadedBytes(ev.loaded);
          setCoverTotalBytes(ev.total);
          setCoverProgress(ev.percent);
        },
      });
      setCoverPreviewUrl(res.url);
      setCoverUploadState('success');
      markDirty();
      addToast({
        title: 'Cover image uploaded',
        message: `${file.name} (${formatBytes(file.size)}) saved.`,
        variant: 'success',
      });
    } catch (error) {
      if (controller.signal.aborted) {
        setCoverUploadState(coverPreviewUrl ? 'success' : 'idle');
        return;
      }
      setCoverErrorMsg(
        isApiError(error)
          ? error.message
          : 'Upload failed before finishing. Please retry.'
      );
      setCoverUploadState('error');
    } finally {
      coverAbortRef.current = null;
    }
  };

  // Real Demo Video Upload handler
  const uploadDemoVideoFile = async (file: File) => {
    const validType =
      file.type === 'video/mp4' || /\.mp4$/i.test(file.name);
    if (!validType) {
      setVideoErrorMsg(
        `Invalid format for "${file.name}". Promotional videos must be MP4.`
      );
      setVideoUploadState('error');
      return;
    }
    if (file.size > videoMaxBytes) {
      setVideoErrorMsg(
        `File "${file.name}" (${formatBytes(file.size)}) exceeds the ${formatBytes(videoMaxBytes, 0)} limit.`
      );
      setVideoUploadState('error');
      return;
    }

    videoAbortRef.current?.abort();
    const controller = new AbortController();
    videoAbortRef.current = controller;

    setLastVideoFile(file);
    setVideoFileName(file.name);
    setVideoTotalBytes(file.size);
    setVideoLoadedBytes(0);
    setVideoProgress(0);
    setVideoErrorMsg('');
    setVideoUploadState('uploading');

    try {
      const res = await uploadsService.uploadFile({
        kind: 'demo_video',
        file,
        signal: controller.signal,
        onProgress: (ev: UploadProgressEvent) => {
          setVideoLoadedBytes(ev.loaded);
          setVideoTotalBytes(ev.total);
          setVideoProgress(ev.percent);
        },
      });
      setVideoUrl(res.url);
      setVideoUploadState('success');
      markDirty();
      addToast({
        title: 'Demo video uploaded',
        message: `${file.name} ready for preview.`,
        variant: 'success',
      });
    } catch (error) {
      if (controller.signal.aborted) {
        setVideoUploadState(videoUrl ? 'success' : 'idle');
        return;
      }
      setVideoErrorMsg(
        isApiError(error)
          ? error.message
          : 'Demo video upload failed. Please check connection and retry.'
      );
      setVideoUploadState('error');
    } finally {
      videoAbortRef.current = null;
    }
  };

  // Lesson video & attachment real uploads inside Step C
  const handleUploadLessonVideo = async (file: File) => {
    if (file.size > videoMaxBytes) {
      addToast({
        title: 'Lesson video exceeds limit',
        message: `Maximum size is ${formatBytes(videoMaxBytes, 0)}.`,
        variant: 'danger',
      });
      return;
    }
    setUploadingLessonVideo(true);
    setNewLessonVideoProgress(0);
    try {
      const res = await uploadsService.uploadFile({
        kind: 'lesson_video',
        file,
        onProgress: (ev: UploadProgressEvent) => setNewLessonVideoProgress(ev.percent),
      });
      setNewLessonVideo(file.name);
      setNewLessonVideoUrl(res.url);
      addToast({ title: 'Lesson video uploaded', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Video upload failed',
        message: isApiError(error) ? error.message : 'Try uploading again.',
        variant: 'danger',
      });
    } finally {
      setUploadingLessonVideo(false);
    }
  };

  const handleUploadLessonAttachment = async (file: File) => {
    if (file.size > attachmentMaxBytes) {
      addToast({
        title: 'Attachment too large',
        message: `Maximum attachment size is ${formatBytes(attachmentMaxBytes, 0)}.`,
        variant: 'danger',
      });
      return;
    }
    setUploadingLessonAttachment(true);
    try {
      const res = await uploadsService.uploadFile({ kind: 'attachment', file });
      setNewLessonAttachment(file.name);
      setNewLessonAttachmentUrl(res.url);
      addToast({ title: 'Attachment uploaded', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Attachment upload failed',
        message: isApiError(error) ? error.message : 'Try uploading again.',
        variant: 'danger',
      });
    } finally {
      setUploadingLessonAttachment(false);
    }
  };

  // Curriculum derived metrics
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

  const handleMoveLesson = (sectionId: string, fromIdx: number, toIdx: number) => {
    markDirty();
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
    markDirty();
    const mins = Math.max(1, parseInt(newLessonMinutes, 10) || 15);
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
              videoFileName: newLessonVideo.trim() || 'lesson-video.mp4',
              videoUrl: newLessonVideoUrl || undefined,
              attachmentName: newLessonAttachment.trim() || undefined,
              attachmentUrl: newLessonAttachmentUrl || undefined,
              isFreePreview: newLessonPreview,
            },
          ],
        };
      })
    );
    setNewLessonTitle('');
    setNewLessonVideo('');
    setNewLessonVideoUrl('');
    setNewLessonAttachment('');
    setNewLessonAttachmentUrl('');
    setNewLessonPreview(false);
    setAddingToSectionId(null);
    addToast({
      title: 'Lesson added',
      message: 'Course total duration automatically updated.',
      variant: 'success',
    });
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    markDirty();
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

  // Submission checklist derived strictly from real form + API bank counts
  const checklistItems = useMemo(() => {
    const hasMedia = coverUploadState === 'success' && Boolean(coverPreviewUrl);
    const hasCurriculum =
      curriculumTotals.totalSections >= 2 && curriculumTotals.totalLessons >= 3;
    const hasPricing = pricingMode === 'free' || Number(priceAmount) > 0;
    const hasEnoughQuestions =
      examPassScore >= 50 &&
      (!draftCourseId || bankQuestionCount >= examQuestionsCount);

    return [
      {
        stepIdx: 0,
        label: 'Course title, subtitle, category & tags (Step a)',
        done: title.trim().length >= 6 && description.trim().length >= 20,
        detail:
          title.trim().length >= 6 && description.trim().length >= 20
            ? `${title.trim()} • ${level} • ${language}`
            : 'Enter a title (6+ chars) and course description (20+ chars).',
      },
      {
        stepIdx: 1,
        label: '16:9 Cover image & optional demo video (Step b)',
        done: hasMedia,
        detail: hasMedia
          ? videoUploadState === 'success'
            ? '16:9 cover image + promotional demo video ready'
            : '16:9 cover image uploaded'
          : 'Upload a JPG/PNG cover image (max 5 MB) in Step b.',
      },
      {
        stepIdx: 2,
        label: 'At least 2 curriculum sections with 3+ lessons (Step c)',
        done: hasCurriculum,
        detail: `${curriculumTotals.totalSections} sections • ${curriculumTotals.totalLessons} lessons • ${curriculumTotals.formattedDuration} auto-calculated`,
      },
      {
        stepIdx: 3,
        label: 'Course pricing configured (Step d)',
        done: hasPricing,
        detail:
          pricingMode === 'free'
            ? 'Free enrollment'
            : `$${Number(priceAmount || 0).toFixed(2)} USD`,
      },
      {
        stepIdx: 4,
        label: 'Final exam & Question Bank readiness (Step e)',
        done: hasEnoughQuestions,
        detail: draftCourseId
          ? `Course bank has ${bankQuestionCount}/${examQuestionsCount} required questions • ${examDurationMinutes} mins • ${examPassScore}% pass score`
          : `Configured ${examQuestionsCount} questions • ${examDurationMinutes} mins • ${examPassScore}% pass score (add bank questions after draft creation)`,
      },
    ];
  }, [
    title,
    description,
    level,
    language,
    coverUploadState,
    coverPreviewUrl,
    videoUploadState,
    curriculumTotals,
    pricingMode,
    priceAmount,
    examQuestionsCount,
    examDurationMinutes,
    examPassScore,
    draftCourseId,
    bankQuestionCount,
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
      if (coverUploadState !== 'success' || !coverPreviewUrl) {
        errs.push({
          field: 'Cover image (Step b)',
          message: 'Upload a 16:9 JPG/PNG cover image before submitting.',
        });
      }
      if (curriculumTotals.totalSections < 2 || curriculumTotals.totalLessons < 3) {
        errs.push({
          field: 'Curriculum (Step c)',
          message: 'Include at least 2 curriculum sections and 3 video lessons.',
        });
      }
    }
    return errs;
  };

  const ensureDraftAndSync = async (): Promise<string> => {
    let courseId = draftCourseId;
    const metadata = buildMetadataPayload();

    if (!courseId) {
      const created = await createCourseMutation.mutateAsync(metadata);
      courseId = created.id;
      setDraftCourseId(courseId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('edit', courseId);
          return next;
        },
        { replace: true }
      );
    } else {
      await updateCourseMutation.mutateAsync({
        courseId,
        payload: metadata,
        silent: true,
      });
    }

    const curriculumRes = await putCurriculumMutation.mutateAsync({
      courseId,
      payload: buildCurriculumPayload(),
      silent: true,
    });

    // Replace temporary section IDs with canonical server IDs
    const persistedSectionIds = curriculumRes.sections.map((s) => s.id);
    setSections(
      curriculumRes.sections.map((sec) => ({
        id: sec.id,
        title: sec.title,
        lessons: sec.lessons.map((les) => ({
          id: les.id,
          title: les.title,
          durationMinutes: Math.max(1, Math.round(les.durationSeconds / 60)),
          videoFileName: les.videoUrl?.split('/').pop() || 'lesson-video.mp4',
          videoUrl: les.videoUrl ?? undefined,
          attachmentName: les.attachments[0]?.title,
          attachmentUrl: les.attachments[0]?.url,
          isFreePreview: les.isPreview,
        })),
      }))
    );

    if (persistedSectionIds.length > 0) {
      await updateExamSettingsMutation.mutateAsync({
        courseId,
        silent: true,
        payload: {
          title: `${metadata.title} Final Exam`,
          durationSeconds: Math.max(600, Math.min(10800, examDurationMinutes * 60)),
          passingScorePercent: Math.max(50, Math.min(100, examPassScore)),
          totalQuestions: Math.max(5, Math.min(50, examQuestionsCount)),
          attemptsAllowed: 3,
          shuffleQuestions: true,
          shuffleOptions: true,
          difficultyMix: { easyPercent: 40, mediumPercent: 40, hardPercent: 20 },
          coveredSectionIds: persistedSectionIds,
        },
      });
    }

    setHasUnsavedChanges(false);
    setAutosaveStatus('saved');
    setLastAutosaved(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
    return courseId;
  };

  const isSubmittingOrSaving =
    createCourseMutation.isPending ||
    updateCourseMutation.isPending ||
    putCurriculumMutation.isPending ||
    updateExamSettingsMutation.isPending ||
    submitCourseMutation.isPending;

  const handleSaveCourse = async (targetStatus: 'Draft' | 'Pending review') => {
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

    try {
      const courseId = await ensureDraftAndSync();

      if (targetStatus === 'Draft') {
        addToast({
          title: 'Course saved as draft',
          message: `"${title.trim()}" has been saved to your Drafts tab.`,
          variant: 'success',
        });
        navigate('/instructor/courses');
        return;
      }

      await submitCourseMutation.mutateAsync({ courseId });
      navigate('/instructor/courses?status=Pending+review');
    } catch (error) {
      if (isApiError(error)) {
        const mapped = mapServerFieldErrors(error.fieldErrors);
        setWizardErrors(
          mapped.length > 0
            ? mapped
            : [{ field: 'Submission', message: error.message }]
        );
        setWizardSummaryKey((k) => k + 1);
      }
    }
  };

  const handleEnsureDraftAndNavigate = async (destination: 'question-bank' | 'exam-settings') => {
    if (draftCourseId) {
      navigate(`/instructor/${destination}?courseId=${encodeURIComponent(draftCourseId)}`);
      return;
    }
    if (title.trim().length < 6) {
      setWizardErrors([
        {
          field: 'Course title',
          message: 'Enter a course title (6+ characters) first so we can save your draft.',
          targetId: 'wizard-title',
        },
      ]);
      setWizardSummaryKey((k) => k + 1);
      setActiveStep(0);
      return;
    }
    try {
      const courseId = await ensureDraftAndSync();
      navigate(`/instructor/${destination}?courseId=${encodeURIComponent(courseId)}`);
    } catch {
      // Toasts already handled by mutations
    }
  };

  if (editCourseId && courseDetailQuery.isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-32 w-full rounded-[12px]" />
        <Skeleton className="h-96 w-full rounded-[12px]" />
      </div>
    );
  }

  if (editCourseId && courseDetailQuery.isError) {
    return (
      <div className="space-y-6 pb-12">
        <QueryErrorState
          title="Could not load course for editing"
          error={courseDetailQuery.error}
          onRetry={() => void courseDetailQuery.refetch()}
        />
      </div>
    );
  }

  const taughtCourses = taughtCoursesQuery.data?.items ?? [];

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Instructor dashboard', to: '/instructor/dashboard' },
          { label: 'My courses', to: '/instructor/courses' },
          { label: editCourseId ? 'Edit course' : 'Course builder wizard' },
        ]}
      />

      {/* WIZARD HEADER WITH AUTOSAVE INDICATOR & SAVE DRAFT */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusChip label="Course builder wizard" variant="primary" />
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#16A34A] bg-[#16A34A]/10 px-2.5 py-1 rounded-full">
                {autosaveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6D4AE0]" />
                    <span className="text-[#6D4AE0]">Saving draft changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {draftCourseId ? `Autosaved ${lastAutosaved}` : 'Ready to save draft'}
                    </span>
                  </>
                )}
              </span>
            </div>
            <h1 className="text-[32px] sm:text-[36px] font-display font-bold text-[#1E1B2E]">
              {editCourseId ? 'Edit & resubmit your course' : 'Build & publish your course'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              loading={isSubmittingOrSaving}
              disabled={isSubmittingOrSaving}
              leftIcon={<Save className="w-4 h-4" />}
              onClick={() => void handleSaveCourse('Draft')}
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

        {/* 6-Step Stepper */}
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
                    ? 'bg-[#6D4AE0] border-[#6D4AE0] text-white shadow-purple-sm'
                    : isCompleted
                      ? 'bg-[#F3EFFF] border-[#A78BFA]/60 text-[#3F2A9E]'
                      : 'bg-[#FAF8FF] border-[#E6E1F5] text-[#5F5B75] hover:border-[#A78BFA]'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-[13px] shrink-0 ${
                    isCurrent
                      ? 'bg-white text-[#6D4AE0]'
                      : isCompleted
                        ? 'bg-[#6D4AE0] text-white'
                        : 'bg-white border border-[#E6E1F5] text-[#5F5B75]'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : st.letter}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold opacity-80">
                    Step {st.letter}
                  </p>
                  <p className="text-[13px] font-bold truncate">{st.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP CONTENT PANEL */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-6">
        <FormErrorSummary
          errors={wizardErrors}
          summaryKey={wizardSummaryKey}
          title="Please complete these required fields"
        />

        {/* STEP A: BASICS */}
        {activeStep === 0 && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E1F5] pb-4">
              <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                Step a — Course basics & metadata
              </h2>
              <p className="text-[14px] text-[#5F5B75]">
                Students see your title, subtitle, category, level badge, and search tags across
                the EduHub catalog.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2 space-y-1.5">
                <label
                  htmlFor="wizard-title"
                  className="block text-[14px] font-bold text-[#1E1B2E]"
                >
                  Course title *
                </label>
                <input
                  id="wizard-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (wizardErrors.length > 0) setWizardErrors([]);
                    markDirty();
                  }}
                  placeholder="e.g. Complete React Developer Course"
                  className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[15px] text-[#1E1B2E]"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label
                  htmlFor="wizard-subtitle"
                  className="block text-[14px] font-bold text-[#1E1B2E]"
                >
                  Subtitle
                </label>
                <input
                  id="wizard-subtitle"
                  type="text"
                  value={subtitle}
                  onChange={(e) => {
                    setSubtitle(e.target.value);
                    markDirty();
                  }}
                  placeholder="A concise 1-sentence summary of what students will build..."
                  className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[15px] text-[#1E1B2E]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="wizard-category"
                  className="block text-[14px] font-bold text-[#1E1B2E]"
                >
                  Category
                </label>
                <select
                  id="wizard-category"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    markDirty();
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
                  <label
                    htmlFor="wizard-level"
                    className="block text-[14px] font-bold text-[#1E1B2E]"
                  >
                    Level
                  </label>
                  <select
                    id="wizard-level"
                    value={level}
                    onChange={(e) => {
                      setLevel(e.target.value as Course['level']);
                      markDirty();
                    }}
                    className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[15px] text-[#1E1B2E]"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="wizard-language"
                    className="block text-[14px] font-bold text-[#1E1B2E]"
                  >
                    Language
                  </label>
                  <select
                    id="wizard-language"
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      markDirty();
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
                <label
                  htmlFor="wizard-description"
                  className="block text-[14px] font-bold text-[#1E1B2E]"
                >
                  Full course description *
                </label>
                <textarea
                  id="wizard-description"
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (wizardErrors.length > 0) setWizardErrors([]);
                    markDirty();
                  }}
                  placeholder="Describe prerequisites, architecture topics, and real-world projects (20+ chars)..."
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
                          markDirty();
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
                      aria-label="Add search tag"
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          e.preventDefault();
                          if (!tags.includes(tagInput.trim())) {
                            setTags((prev) => [...prev, tagInput.trim()]);
                          }
                          setTagInput('');
                          markDirty();
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
                          markDirty();
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

        {/* STEP B: MEDIA */}
        {activeStep === 1 && (
          <div className="space-y-8">
            <div className="border-b border-[#E6E1F5] pb-4">
              <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                Step b — Course media & promotional video
              </h2>
              <p className="text-[14px] text-[#5F5B75]">
                File rules: Cover image <strong>JPG/PNG up to {formatBytes(coverMaxBytes, 0)}</strong>{' '}
                (16:9 aspect ratio) • Demo video <strong>MP4 up to {formatBytes(videoMaxBytes, 0)}</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 1. COVER IMAGE UPLOADER */}
              <div className="rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#6D4AE0]" />
                  <div>
                    <h3 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                      Course cover image (16:9)
                    </h3>
                    <p className="text-[12px] text-[#5F5B75]">
                      Allowed: JPG/PNG up to {formatBytes(coverMaxBytes, 0)} (1920×1080
                      recommended)
                    </p>
                  </div>
                </div>

                {coverUploadState === 'idle' && (
                  <label
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) void uploadCoverFile(file);
                    }}
                    className="block rounded-[12px] border-2 border-dashed border-[#A78BFA] bg-white hover:bg-[#F3EFFF]/50 p-8 text-center space-y-3 cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#F3EFFF] text-[#6D4AE0] flex items-center justify-center mx-auto">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-[17px] text-[#1E1B2E]">
                        Drag & drop your 16:9 cover image here
                      </p>
                      <p className="text-[13px] text-[#5F5B75]">
                        or click to browse files •{' '}
                        <strong>JPG/PNG up to {formatBytes(coverMaxBytes, 0)}</strong>
                      </p>
                    </div>
                    <span className="inline-flex items-center justify-center h-9 px-4 rounded-[8px] border border-[#E6E1F5] bg-[#FAF8FF] text-[13px] font-bold text-[#6D4AE0]">
                      Choose image
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadCoverFile(file);
                      }}
                    />
                  </label>
                )}

                {coverUploadState === 'uploading' && (
                  <div className="rounded-[12px] bg-white border border-[#6D4AE0] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Loader2 className="w-5 h-5 text-[#6D4AE0] animate-spin shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-[#1E1B2E] truncate">
                            Uploading {coverFileName}...
                          </p>
                          <p className="text-[12px] text-[#5F5B75]">
                            {formatBytes(coverLoadedBytes)} of {formatBytes(coverTotalBytes)}
                          </p>
                        </div>
                      </div>
                      <span className="font-display font-bold text-[20px] text-[#6D4AE0]">
                        {coverProgress}%
                      </span>
                    </div>
                    <ProgressBar value={coverProgress} showValue={false} size="md" />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => coverAbortRef.current?.abort()}
                    >
                      Cancel upload
                    </Button>
                  </div>
                )}

                {coverUploadState === 'success' && (
                  <div className="rounded-[12px] bg-white border border-[#16A34A]/40 p-4 space-y-3">
                    <div className="relative aspect-video w-full rounded-[10px] overflow-hidden bg-[#1E1B2E] border border-[#E6E1F5]">
                      <img
                        src={coverPreviewUrl}
                        alt="16:9 Course cover preview"
                        onError={handleImageError}
                        className="w-full h-full object-cover transition-transform"
                        style={{ transform: `scale(${coverCropZoom / 100})` }}
                      />
                      <div className="absolute inset-3 border-2 border-dashed border-white/75 rounded-[6px] pointer-events-none flex items-end justify-between p-2">
                        <span className="px-2 py-0.5 rounded bg-[#1E1B2E]/80 text-white text-[11px] font-bold inline-flex items-center gap-1">
                          <Crop className="w-3 h-3 text-[#F5B82E]" />
                          16:9 Safe crop frame ({coverCropZoom}%)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#16A34A] text-white text-[11px] font-bold">
                          Uploaded
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-[12px] text-[#5F5B75]">
                        <Crop className="w-4 h-4 text-[#6D4AE0]" />
                        <span>Crop zoom:</span>
                        <input
                          type="range"
                          min={100}
                          max={135}
                          value={coverCropZoom}
                          aria-label="Course cover crop zoom"
                          onChange={(e) => setCoverCropZoom(Number(e.target.value))}
                          className="w-24 accent-[#6D4AE0] cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center justify-center h-9 px-3 rounded-[8px] border border-[#E6E1F5] bg-[#FAF8FF] text-[13px] font-bold text-[#1E1B2E] cursor-pointer hover:border-[#6D4AE0]">
                          Replace
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void uploadCoverFile(file);
                            }}
                          />
                        </label>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setCoverPreviewUrl('');
                            setCoverFileName('');
                            setCoverUploadState('idle');
                            markDirty();
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

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
                      {lastCoverFile && (
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                          onClick={() => void uploadCoverFile(lastCoverFile)}
                        >
                          Retry upload
                        </Button>
                      )}
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

              {/* 2. DEMO VIDEO UPLOADER */}
              <div className="rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-[#6D4AE0]" />
                  <div>
                    <h3 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                      Promotional demo video
                    </h3>
                    <p className="text-[12px] text-[#5F5B75]">
                      Allowed: MP4 up to {formatBytes(videoMaxBytes, 0)} (1080p H.264
                      recommended)
                    </p>
                  </div>
                </div>

                {videoUploadState === 'idle' && (
                  <label
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) void uploadDemoVideoFile(file);
                    }}
                    className="block rounded-[12px] border-2 border-dashed border-[#A78BFA] bg-white hover:bg-[#F3EFFF]/50 p-8 text-center space-y-3 cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#F3EFFF] text-[#6D4AE0] flex items-center justify-center mx-auto">
                      <Film className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-[17px] text-[#1E1B2E]">
                        Drag & drop your promotional demo video
                      </p>
                      <p className="text-[13px] text-[#5F5B75]">
                        or click to select file •{' '}
                        <strong>MP4 up to {formatBytes(videoMaxBytes, 0)}</strong>
                      </p>
                    </div>
                    <span className="inline-flex items-center justify-center h-9 px-4 rounded-[8px] border border-[#E6E1F5] bg-[#FAF8FF] text-[13px] font-bold text-[#6D4AE0]">
                      Select MP4 video
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,.mp4"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadDemoVideoFile(file);
                      }}
                    />
                  </label>
                )}

                {videoUploadState === 'uploading' && (
                  <div className="rounded-[12px] bg-white border border-[#6D4AE0] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Loader2 className="w-5 h-5 text-[#6D4AE0] animate-spin shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-[#1E1B2E] truncate">
                            Uploading {videoFileName}...
                          </p>
                          <p className="text-[12px] text-[#5F5B75]">
                            {formatBytes(videoLoadedBytes)} of {formatBytes(videoTotalBytes)}
                          </p>
                        </div>
                      </div>
                      <span className="font-display font-bold text-[20px] text-[#6D4AE0]">
                        {videoProgress}%
                      </span>
                    </div>
                    <ProgressBar value={videoProgress} showValue={false} size="md" />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => videoAbortRef.current?.abort()}
                    >
                      Cancel upload
                    </Button>
                  </div>
                )}

                {videoUploadState === 'success' && (
                  <div className="rounded-[12px] bg-white border border-[#16A34A]/40 p-4 space-y-3">
                    <div className="relative aspect-video w-full rounded-[10px] overflow-hidden bg-[#1E1B2E] flex flex-col items-center justify-center text-white p-4">
                      {coverPreviewUrl && (
                        <img
                          src={coverPreviewUrl}
                          alt="Demo video preview"
                          onError={handleImageError}
                          className="absolute inset-0 w-full h-full object-cover opacity-40"
                        />
                      )}
                      <div className="relative z-10 text-center space-y-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#16A34A] text-white text-[11px] font-bold">
                          MP4 uploaded • Ready for preview
                        </span>
                        <p className="font-display font-bold text-[16px] break-all">
                          {videoFileName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[12px] font-semibold text-[#16A34A] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        MP4 verified (under {formatBytes(videoMaxBytes, 0)} limit)
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center justify-center h-9 px-3 rounded-[8px] border border-[#E6E1F5] bg-[#FAF8FF] text-[13px] font-bold text-[#1E1B2E] cursor-pointer hover:border-[#6D4AE0]">
                          Replace
                          <input
                            type="file"
                            accept="video/mp4,.mp4"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void uploadDemoVideoFile(file);
                            }}
                          />
                        </label>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setVideoUrl('');
                            setVideoFileName('');
                            setVideoUploadState('idle');
                            markDirty();
                          }}
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
                        <p className="font-bold text-[#DC2626]">Demo video upload error</p>
                        <p className="text-[#5F5B75] mt-0.5">{videoErrorMsg}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lastVideoFile && (
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                          onClick={() => void uploadDemoVideoFile(lastVideoFile)}
                        >
                          Retry upload
                        </Button>
                      )}
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

        {/* STEP C: CURRICULUM */}
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
              {sections.map((section) => {
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
                            onClick={() => {
                              markDirty();
                              setSections((prev) =>
                                prev.filter((item) => item.id !== section.id)
                              );
                            }}
                            className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                            title="Delete section"
                            aria-label={`Delete ${section.title}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lessons List */}
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
                            <label className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#5F5B75] cursor-pointer mr-2">
                              <input
                                type="checkbox"
                                checked={lesson.isFreePreview}
                                onChange={() => {
                                  markDirty();
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
                              aria-label={`Move ${lesson.title} up`}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={lIdx === section.lessons.length - 1}
                              onClick={() => handleMoveLesson(section.id, lIdx, lIdx + 1)}
                              className="p-1.5 rounded-[8px] border border-[#E6E1F5] text-[#5F5B75] hover:text-[#6D4AE0] disabled:opacity-40 cursor-pointer"
                              title="Move lesson down"
                              aria-label={`Move ${lesson.title} down`}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                markDirty();
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
                              aria-label={`Remove ${lesson.title}`}
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
                              <label
                                htmlFor={`new-lesson-title-${section.id}`}
                                className="block text-[12px] font-bold text-[#1E1B2E] mb-1"
                              >
                                Lesson title *
                              </label>
                              <input
                                id={`new-lesson-title-${section.id}`}
                                type="text"
                                value={newLessonTitle}
                                onChange={(e) => setNewLessonTitle(e.target.value)}
                                placeholder="e.g. 6. Server Actions & Form Validation"
                                className="w-full h-11 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px]"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`new-lesson-video-${section.id}`}
                                className="block text-[12px] font-bold text-[#1E1B2E] mb-1"
                              >
                                Lesson video (MP4 up to {formatBytes(videoMaxBytes, 0)}) &
                                minutes
                              </label>
                              <div className="flex items-center gap-2">
                                <label className="flex-1 h-11 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px] flex items-center justify-between cursor-pointer hover:border-[#6D4AE0] min-w-0">
                                  <span className="truncate text-[#1E1B2E]">
                                    {uploadingLessonVideo
                                      ? `Uploading… ${newLessonVideoProgress}%`
                                      : newLessonVideo || 'Upload MP4 file…'}
                                  </span>
                                  <Film className="w-4 h-4 text-[#6D4AE0] shrink-0 ml-2" />
                                  <input
                                    id={`new-lesson-video-${section.id}`}
                                    type="file"
                                    accept="video/mp4,.mp4"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) void handleUploadLessonVideo(file);
                                    }}
                                  />
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={180}
                                  value={newLessonMinutes}
                                  onChange={(e) => setNewLessonMinutes(e.target.value)}
                                  className="w-20 h-11 px-2.5 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px] font-bold text-[#6D4AE0]"
                                  title="Video duration in minutes"
                                  aria-label="Video duration in minutes"
                                />
                                <span className="text-[12px] text-[#5F5B75]">min</span>
                              </div>
                            </div>
                            <div>
                              <label
                                htmlFor={`new-lesson-attachment-${section.id}`}
                                className="block text-[12px] font-bold text-[#1E1B2E] mb-1"
                              >
                                Downloadable attachment (PDF / ZIP)
                              </label>
                              <label className="w-full h-11 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px] flex items-center justify-between cursor-pointer hover:border-[#6D4AE0]">
                                <span className="truncate text-[#1E1B2E]">
                                  {uploadingLessonAttachment
                                    ? 'Uploading attachment…'
                                    : newLessonAttachment || 'Optional PDF / ZIP workbook…'}
                                </span>
                                <Paperclip className="w-4 h-4 text-[#F59E3B] shrink-0 ml-2" />
                                <input
                                  id={`new-lesson-attachment-${section.id}`}
                                  type="file"
                                  accept=".pdf,.zip,.csv,.fig"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void handleUploadLessonAttachment(file);
                                  }}
                                />
                              </label>
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
                              disabled={uploadingLessonVideo || uploadingLessonAttachment}
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
                aria-label="New section title"
                className="flex-1 h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] text-[14px] focus:outline-none focus:border-[#6D4AE0]"
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

        {/* STEP D: PRICING */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E1F5] pb-4">
              <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                Step d — Course pricing & promotions
              </h2>
              <p className="text-[14px] text-[#5F5B75]">
                Choose whether your course is Free or Paid, and configure optional promotional
                discounts.
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
                      markDirty();
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
                  <label
                    htmlFor="wizard-price"
                    className="block text-[14px] font-bold text-[#1E1B2E]"
                  >
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
                        markDirty();
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
                        markDirty();
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
                      onChange={(e) => {
                        setOriginalPriceAmount(e.target.value);
                        markDirty();
                      }}
                      aria-label="Original promotional price"
                      className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] text-[15px] text-[#5F5B75]"
                      placeholder="Original price (e.g. 89.99)"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP E: FINAL EXAM */}
        {activeStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E1F5] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                  Step e — Final certification exam setup
                </h2>
                <p className="text-[14px] text-[#5F5B75]">
                  Connect your course to the Question Bank and set the minimum passing score
                  for certificates.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  onClick={() => void handleEnsureDraftAndNavigate('question-bank')}
                >
                  Open Question Bank
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleEnsureDraftAndNavigate('exam-settings')}
                >
                  Advanced Exam Settings
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl">
              <div className="space-y-1.5">
                <label
                  htmlFor="wizard-qbank-source"
                  className="block text-[14px] font-bold text-[#1E1B2E]"
                >
                  Question Bank course
                </label>
                <select
                  id="wizard-qbank-source"
                  value={linkedQuestionBankCourseId || draftCourseId || 'current'}
                  onChange={(e) => setLinkedQuestionBankCourseId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] text-[14px] font-semibold text-[#1E1B2E]"
                >
                  <option value={draftCourseId || 'current'}>
                    This course’s Question Bank ({bankQuestionCount} ready)
                  </option>
                  {taughtCourses
                    .filter((c) => c.id !== draftCourseId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="wizard-exam-qcount"
                  className="block text-[14px] font-bold text-[#1E1B2E]"
                >
                  Questions per attempt
                </label>
                <input
                  id="wizard-exam-qcount"
                  type="number"
                  min={5}
                  max={50}
                  value={examQuestionsCount}
                  onChange={(e) => setExamQuestionsCount(Number(e.target.value))}
                  className="w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#E6E1F5] font-bold text-[15px]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="wizard-exam-pass-score"
                  className="block text-[14px] font-bold text-[#1E1B2E]"
                >
                  Minimum pass score (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="wizard-exam-pass-score"
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
                  Certificate issuance rule & duration ({examDurationMinutes} mins)
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

        {/* STEP F: REVIEW & SUBMIT */}
        {activeStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E1F5] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[24px] font-display font-bold text-[#1E1B2E]">
                  Step f — Review & submit for supervisor approval
                </h2>
                <p className="text-[14px] text-[#5F5B75]">
                  Verify all required course elements before sending your syllabus to Supervisor
                  review.
                </p>
              </div>
              {draftCourseId && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  onClick={() =>
                    navigate(
                      `/instructor/question-bank?courseId=${encodeURIComponent(draftCourseId)}`
                    )
                  }
                >
                  Open course Question Bank
                </Button>
              )}
            </div>

            {missingCount > 0 ? (
              <div className="rounded-[12px] bg-[#FFFBEB] border-2 border-[#F59E0B]/50 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
                <div className="text-[14px]">
                  <p className="font-bold text-[#1E1B2E]">
                    {missingCount} required {missingCount === 1 ? 'item is' : 'items are'}{' '}
                    missing before submission
                  </p>
                  <p className="text-[#5F5B75] text-[13px]">
                    Resolve the highlighted checklist items below (or save as Draft to finish
                    later).
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-[12px] bg-[#16A34A]/8 border border-[#16A34A]/35 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
                  <p className="text-[14px] font-bold text-[#1E1B2E]">
                    All 5 submission requirements passed! Your course is ready for supervisor
                    review.
                  </p>
                </div>
                <StatusChip label="Ready to submit" variant="success" />
              </div>
            )}

            {/* Checklist */}
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
            disabled={activeStep === 0 || isSubmittingOrSaving}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
            onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
          >
            Previous step
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              loading={isSubmittingOrSaving}
              disabled={isSubmittingOrSaving}
              onClick={() => void handleSaveCourse('Draft')}
            >
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
                  } else if (
                    activeStep === 3 &&
                    pricingMode === 'paid' &&
                    !(Number(priceAmount) > 0)
                  ) {
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
                loading={isSubmittingOrSaving}
                disabled={isSubmittingOrSaving}
                leftIcon={<FileCheck2 className="w-5 h-5" />}
                onClick={() => void handleSaveCourse('Pending review')}
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
