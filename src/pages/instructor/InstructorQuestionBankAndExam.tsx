import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Edit3,
  FileSpreadsheet,
  Image as ImageIcon,
  Plus,
  PlusCircle,
  Search,
  Settings,
  Shuffle,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { isApiError } from '../../api/errors';
import {
  useInstructorCourseDetail,
  useInstructorCourses,
} from '../../api/hooks/useInstructor';
import {
  useBulkDeleteQuestionsMutation,
  useCourseQuestions,
  useCreateQuestionMutation,
  useDeleteQuestionMutation,
  useExamSettings,
  useImportQuestionsCsvMutation,
  useMultiCourseQuestions,
  usePreviewExamSettingsMutation,
  useUpdateExamSettingsMutation,
  useUpdateQuestionMutation,
} from '../../api/hooks/useQuestions';
import { toQuestionDifficultyDto } from '../../api/mappers/examCertificate.mapper';
import {
  mapQuestionDtoToInstructorItem,
  toQuestionTypeDto,
} from '../../api/mappers/instructor.mapper';
import {
  Breadcrumbs,
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  FormErrorSummary,
  Modal,
  Pagination,
  QueryErrorState,
  Skeleton,
  StatusChip,
  type FormErrorItem,
} from '../../components/ui';
import type { InstructorQuestionItem } from '../../data/instructorMockData';
import { useDebouncedValue } from '../../lib/useDebouncedValue';

const SAMPLE_CSV_PAYLOAD = [
  'question,type,option_a,option_b,option_c,option_d,correct,difficulty,points,section',
  'Which React hook lets you subscribe cleanly to external browser stores?,single,useSyncExternalStore,useImperativeHandle,useDebugValue,useLayoutEffect,A,medium,5,sec-1',
  'All React effects are guaranteed to run synchronously before browser paint.,boolean,True,False,,,B,easy,5,sec-2',
].join('\n');

function parsePositivePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function mapQuestionFieldErrors(
  fieldErrors?: Record<string, string[]>
): FormErrorItem[] {
  if (!fieldErrors) return [];
  const targetMap: Record<string, string> = {
    prompt: 'qbank-question-text',
    options: 'qbank-option-0',
    correctIndices: 'qbank-option-0',
    sectionId: 'qbank-section-select',
    points: 'qbank-points-input',
    difficulty: 'qbank-difficulty-select',
  };
  return Object.entries(fieldErrors).map(([field, messages]) => ({
    field,
    message: messages[0] ?? 'Please review this field.',
    targetId: targetMap[field],
  }));
}

// ============================================================================
// 4. QUESTION BANK (/instructor/question-bank)
// ============================================================================
export const InstructorQuestionBankPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCourseId = searchParams.get('courseId') || 'all';
  const selectedSectionId = searchParams.get('sectionId') || 'all';
  const selectedDifficulty = searchParams.get('difficulty') || 'all';
  const selectedType = searchParams.get('type') || 'all';
  const urlQuery = searchParams.get('q') ?? '';
  const page = parsePositivePage(searchParams.get('page'));

  const [searchInput, setSearchInput] = useState(urlQuery);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvCourseId, setCsvCourseId] = useState<string>('');
  const [csvSelectedFile, setCsvSelectedFile] = useState<File | null>(null);
  const [csvUploadProgress, setCsvUploadProgress] = useState<number>(0);
  const [csvImportResultErrors, setCsvImportResultErrors] = useState<
    Array<{ row: number; message: string }>
  >([]);
  const csvAbortRef = useRef<AbortController | null>(null);

  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] =
    useState<InstructorQuestionItem | null>(null);

  // Add/Edit side drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qType, setQType] = useState<'single' | 'multiple' | 'boolean'>('single');
  const [qText, setQText] = useState('');
  const [qImageUrl, setQImageUrl] = useState('');
  const [qOptions, setQOptions] = useState<string[]>([
    'Option A',
    'Option B',
    'Option C',
    'Option D',
  ]);
  const [qCorrectIndices, setQCorrectIndices] = useState<number[]>([0]);
  const [qExplanation, setQExplanation] = useState('');
  const [qDifficulty, setQDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [qPoints, setQPoints] = useState<number>(5);
  const [qSectionId, setQSectionId] = useState<string>('');
  const [qCourseId, setQCourseId] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [drawerFormErrors, setDrawerFormErrors] = useState<FormErrorItem[]>([]);

  useEffect(() => {
    setSearchInput(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (debouncedSearch === urlQuery) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch) next.set('q', debouncedSearch);
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true }
    );
  }, [debouncedSearch, urlQuery, setSearchParams]);

  const updateParams = (patch: {
    courseId?: string;
    sectionId?: string;
    difficulty?: string;
    type?: string;
    page?: number;
  }) => {
    setSelectedIds([]);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (patch.courseId !== undefined) {
          if (!patch.courseId || patch.courseId === 'all') {
            next.delete('courseId');
            next.delete('sectionId');
          } else {
            next.set('courseId', patch.courseId);
            next.delete('sectionId');
          }
        }
        if (patch.sectionId !== undefined) {
          if (!patch.sectionId || patch.sectionId === 'all') next.delete('sectionId');
          else next.set('sectionId', patch.sectionId);
        }
        if (patch.difficulty !== undefined) {
          if (!patch.difficulty || patch.difficulty === 'all') next.delete('difficulty');
          else next.set('difficulty', patch.difficulty);
        }
        if (patch.type !== undefined) {
          if (!patch.type || patch.type === 'all') next.delete('type');
          else next.set('type', patch.type);
        }
        if (patch.page !== undefined) {
          if (patch.page <= 1) next.delete('page');
          else next.set('page', String(patch.page));
        }
        return next;
      },
      { replace: true }
    );
  };

  const coursesQuery = useInstructorCourses({ status: 'all', limit: 50 });
  const taughtCourses = useMemo(
    () => coursesQuery.data?.items ?? [],
    [coursesQuery.data?.items]
  );
  const taughtCourseIds = useMemo(
    () => taughtCourses.map((c) => c.id),
    [taughtCourses]
  );

  // Sync default drawer/CSV course IDs when courses load
  useEffect(() => {
    if (taughtCourses.length === 0) return;
    if (!qCourseId || !taughtCourses.some((c) => c.id === qCourseId)) {
      setQCourseId(
        selectedCourseId !== 'all' ? selectedCourseId : taughtCourses[0].id
      );
    }
    if (!csvCourseId || !taughtCourses.some((c) => c.id === csvCourseId)) {
      setCsvCourseId(
        selectedCourseId !== 'all' ? selectedCourseId : taughtCourses[0].id
      );
    }
  }, [taughtCourses, selectedCourseId, qCourseId, csvCourseId]);

  const filterParams = useMemo(
    () => ({
      sectionId: selectedSectionId === 'all' ? undefined : selectedSectionId,
      difficulty: toQuestionDifficultyDto(selectedDifficulty),
      type: toQuestionTypeDto(selectedType),
      q: debouncedSearch || undefined,
    }),
    [selectedSectionId, selectedDifficulty, selectedType, debouncedSearch]
  );

  const singleCourseQuery = useCourseQuestions(
    selectedCourseId,
    { ...filterParams, page, limit: 10 },
    selectedCourseId !== 'all'
  );
  const singleCourseTotalsQuery = useCourseQuestions(
    selectedCourseId,
    { page: 1, limit: 100 },
    selectedCourseId !== 'all'
  );

  const multiCourseQuery = useMultiCourseQuestions(
    taughtCourseIds,
    filterParams,
    selectedCourseId === 'all' && taughtCourseIds.length > 0
  );
  const multiCourseAllQuery = useMultiCourseQuestions(
    taughtCourseIds,
    {},
    selectedCourseId === 'all' && taughtCourseIds.length > 0
  );

  const filterCourseDetailQuery = useInstructorCourseDetail(
    selectedCourseId,
    selectedCourseId !== 'all'
  );
  const drawerCourseDetailQuery = useInstructorCourseDetail(
    qCourseId,
    drawerOpen && Boolean(qCourseId)
  );

  // Dynamic section lists for Filter bar & Drawer
  const filterSections = useMemo(() => {
    if (selectedCourseId !== 'all' && filterCourseDetailQuery.data?.sections) {
      return filterCourseDetailQuery.data.sections.map((s) => ({
        id: s.id,
        name: s.title,
      }));
    }
    const seen = new Map<string, string>();
    for (const item of multiCourseAllQuery.items) {
      if (!seen.has(item.sectionId)) {
        seen.set(item.sectionId, item.sectionName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [selectedCourseId, filterCourseDetailQuery.data, multiCourseAllQuery.items]);

  const drawerSections = useMemo(
    () =>
      (drawerCourseDetailQuery.data?.sections ?? []).map((s) => ({
        id: s.id,
        name: s.title,
      })),
    [drawerCourseDetailQuery.data?.sections]
  );

  useEffect(() => {
    if (!drawerOpen || drawerSections.length === 0) return;
    if (!qSectionId || !drawerSections.some((s) => s.id === qSectionId)) {
      setQSectionId(drawerSections[0].id);
    }
  }, [drawerOpen, drawerSections, qSectionId]);

  const pageSize = 10;
  const allFilteredWhenAllCourses = useMemo(() => {
    if (selectedCourseId !== 'all') return [];
    if (selectedSectionId === 'all') return multiCourseQuery.items;
    return multiCourseQuery.items.filter((q) => q.sectionId === selectedSectionId);
  }, [selectedCourseId, selectedSectionId, multiCourseQuery.items]);

  const totalPages =
    selectedCourseId === 'all'
      ? Math.max(1, Math.ceil(allFilteredWhenAllCourses.length / pageSize))
      : (singleCourseQuery.data?.meta.totalPages ?? 1);
  const safePage = Math.min(page, totalPages);

  const displayedQuestions = useMemo(() => {
    if (selectedCourseId !== 'all') {
      return singleCourseQuery.data?.items ?? [];
    }
    const start = (safePage - 1) * pageSize;
    return allFilteredWhenAllCourses.slice(start, start + pageSize);
  }, [selectedCourseId, singleCourseQuery.data?.items, allFilteredWhenAllCourses, safePage]);

  const difficultyCounters = useMemo(() => {
    const base =
      selectedCourseId === 'all'
        ? multiCourseAllQuery.items
        : (singleCourseTotalsQuery.data?.items ?? []);
    return {
      total:
        selectedCourseId === 'all'
          ? multiCourseAllQuery.total
          : (singleCourseTotalsQuery.data?.meta.total ?? base.length),
      easy: base.filter((q) => q.difficulty === 'Easy').length,
      medium: base.filter((q) => q.difficulty === 'Medium').length,
      hard: base.filter((q) => q.difficulty === 'Hard').length,
    };
  }, [selectedCourseId, multiCourseAllQuery, singleCourseTotalsQuery.data]);

  const createQuestionMutation = useCreateQuestionMutation();
  const updateQuestionMutation = useUpdateQuestionMutation();
  const deleteQuestionMutation = useDeleteQuestionMutation();
  const bulkDeleteMutation = useBulkDeleteQuestionsMutation();
  const importCsvMutation = useImportQuestionsCsvMutation();

  const isSavingQuestion =
    createQuestionMutation.isPending || updateQuestionMutation.isPending;

  const isListLoading =
    coursesQuery.isLoading ||
    (selectedCourseId === 'all'
      ? taughtCourseIds.length > 0 && multiCourseQuery.isLoading
      : singleCourseQuery.isLoading);
  const isListFetching =
    selectedCourseId === 'all'
      ? multiCourseQuery.isFetching
      : singleCourseQuery.isFetching;
  const listError =
    coursesQuery.error ??
    (selectedCourseId === 'all'
      ? multiCourseQuery.isError
        ? multiCourseQuery.error
        : null
      : singleCourseQuery.error);

  const handleOpenAddDrawer = () => {
    const defaultCourse =
      selectedCourseId !== 'all' ? selectedCourseId : (taughtCourses[0]?.id ?? '');
    setEditingQuestionId(null);
    setQType('single');
    setQText('');
    setQImageUrl('');
    setQOptions(['Option A', 'Option B', 'Option C', 'Option D']);
    setQCorrectIndices([0]);
    setQExplanation('');
    setQDifficulty('Medium');
    setQPoints(5);
    setQCourseId(defaultCourse);
    setQSectionId('');
    setValidationError('');
    setDrawerFormErrors([]);
    setDrawerOpen(true);
  };

  const handleOpenEditDrawer = (item: InstructorQuestionItem) => {
    setEditingQuestionId(item.id);
    setQType(item.type);
    setQText(item.question);
    setQImageUrl(item.imageUrl || '');
    setQOptions([...item.options]);
    setQCorrectIndices([...item.correctIndices]);
    setQExplanation(item.explanation);
    setQDifficulty(item.difficulty);
    setQPoints(item.points);
    setQSectionId(item.sectionId);
    setQCourseId(item.courseId);
    setValidationError('');
    setDrawerFormErrors([]);
    setDrawerOpen(true);
  };

  const handleChangeQuestionType = (nextType: 'single' | 'multiple' | 'boolean') => {
    setQType(nextType);
    setValidationError('');
    if (nextType === 'boolean') {
      setQOptions(['True', 'False']);
      setQCorrectIndices([0]);
    } else if (
      qOptions.length < 2 ||
      (qOptions.length === 2 && qOptions[0] === 'True')
    ) {
      setQOptions(['Option A', 'Option B', 'Option C', 'Option D']);
      setQCorrectIndices([0]);
    } else if (nextType === 'single' && qCorrectIndices.length > 1) {
      setQCorrectIndices([qCorrectIndices[0]]);
    }
  };

  const handleToggleCorrectOption = (idx: number) => {
    setValidationError('');
    if (qType === 'multiple') {
      setQCorrectIndices((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
      );
    } else {
      setQCorrectIndices([idx]);
    }
  };

  const validateAndSaveQuestion = async (addAnother: boolean) => {
    const trimmedQuestion = qText.trim();
    if (trimmedQuestion.length < 8) {
      setValidationError('Question prompt must be at least 8 characters long.');
      return;
    }
    const cleanOptions = qOptions.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setValidationError('Provide at least 2 non-empty answer options.');
      return;
    }
    if (qCorrectIndices.length === 0) {
      setValidationError('Select at least one correct answer option.');
      return;
    }
    const resolvedSectionId = qSectionId || drawerSections[0]?.id || 'sec-1';
    const difficultyDto = toQuestionDifficultyDto(qDifficulty) ?? 'medium';

    const basePayload = {
      sectionId: resolvedSectionId,
      type: qType,
      prompt: trimmedQuestion,
      options: cleanOptions,
      correctIndices: qCorrectIndices,
      difficulty: difficultyDto,
      points: Math.max(1, Math.min(25, qPoints)),
      explanation:
        qExplanation.trim() || 'Reviewed and verified by the course instructor.',
      imageUrl: qImageUrl.trim() ? qImageUrl.trim() : null,
    };

    setValidationError('');
    setDrawerFormErrors([]);

    try {
      if (editingQuestionId) {
        await updateQuestionMutation.mutateAsync({
          questionId: editingQuestionId,
          courseId: qCourseId,
          payload: basePayload,
        });
      } else {
        await createQuestionMutation.mutateAsync({
          courseId: qCourseId,
          payload: basePayload,
        });
      }

      if (addAnother) {
        setEditingQuestionId(null);
        setQText('');
        setQImageUrl('');
        setQExplanation('');
        setQOptions(
          qType === 'boolean'
            ? ['True', 'False']
            : ['Option A', 'Option B', 'Option C', 'Option D']
        );
        setQCorrectIndices([0]);
      } else {
        setDrawerOpen(false);
      }
    } catch (error) {
      if (isApiError(error)) {
        setValidationError(error.message);
        setDrawerFormErrors(mapQuestionFieldErrors(error.fieldErrors));
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkDeleteMutation.mutateAsync({
        ids: selectedIds,
        courseId: selectedCourseId === 'all' ? undefined : selectedCourseId,
      });
      setSelectedIds([]);
      setBulkDeleteConfirmOpen(false);
    } catch {
      // Error toast emitted by mutation
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!questionToDelete) return;
    try {
      await deleteQuestionMutation.mutateAsync({
        questionId: questionToDelete.id,
        courseId: questionToDelete.courseId,
      });
      setSelectedIds((prev) => prev.filter((id) => id !== questionToDelete.id));
      setQuestionToDelete(null);
    } catch {
      // Error toast emitted by mutation
    }
  };

  const handleOpenCsvModal = () => {
    setCsvCourseId(
      selectedCourseId !== 'all' ? selectedCourseId : (taughtCourses[0]?.id ?? '')
    );
    setCsvSelectedFile(null);
    setCsvUploadProgress(0);
    setCsvImportResultErrors([]);
    setCsvModalOpen(true);
  };

  const handleRunCsvImport = async (mode: 'file' | 'sample') => {
    const targetCourseId =
      csvCourseId ||
      (selectedCourseId !== 'all' ? selectedCourseId : taughtCourses[0]?.id);
    if (!targetCourseId) return;

    const controller = new AbortController();
    csvAbortRef.current = controller;
    setCsvUploadProgress(0);
    setCsvImportResultErrors([]);

    try {
      const result = await importCsvMutation.mutateAsync({
        courseId: targetCourseId,
        input:
          mode === 'file' && csvSelectedFile
            ? csvSelectedFile
            : { csvText: SAMPLE_CSV_PAYLOAD },
        signal: controller.signal,
        onProgress: ({ percent }) => setCsvUploadProgress(percent),
      });
      if (result.errors.length > 0) {
        setCsvImportResultErrors(result.errors);
      } else {
        setCsvModalOpen(false);
      }
    } catch {
      // Handled by mutation error toast
    } finally {
      csvAbortRef.current = null;
    }
  };

  const handleCloseCsvModal = () => {
    csvAbortRef.current?.abort();
    csvAbortRef.current = null;
    setCsvModalOpen(false);
  };

  const allVisibleSelected =
    displayedQuestions.length > 0 &&
    displayedQuestions.every((q) => selectedIds.includes(q.id));

  const hasActiveFilters =
    selectedCourseId !== 'all' ||
    selectedSectionId !== 'all' ||
    selectedDifficulty !== 'all' ||
    selectedType !== 'all' ||
    Boolean(debouncedSearch);

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Instructor dashboard', to: '/instructor/dashboard' },
          { label: 'Question bank' },
        ]}
      />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Question bank
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Manage single-choice, multiple-choice, and True/False exam questions across your
            courses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            disabled={taughtCourses.length === 0}
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={handleOpenCsvModal}
          >
            Import CSV
          </Button>
          <Link
            to={
              selectedCourseId !== 'all'
                ? `/instructor/exam-settings?courseId=${encodeURIComponent(selectedCourseId)}`
                : '/instructor/exam-settings'
            }
          >
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Settings className="w-4 h-4" />}
            >
              Exam settings
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            disabled={taughtCourses.length === 0}
            leftIcon={<PlusCircle className="w-4 h-4" />}
            onClick={handleOpenAddDrawer}
          >
            Add question
          </Button>
        </div>
      </div>

      {/* COUNTERS PER DIFFICULTY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total questions',
            count: difficultyCounters.total,
            chip: 'All types',
            variant: 'primary' as const,
          },
          {
            label: 'Easy questions',
            count: difficultyCounters.easy,
            chip: 'Easy',
            variant: 'success' as const,
          },
          {
            label: 'Medium questions',
            count: difficultyCounters.medium,
            chip: 'Medium',
            variant: 'orange' as const,
          },
          {
            label: 'Hard questions',
            count: difficultyCounters.hard,
            chip: 'Hard',
            variant: 'danger' as const,
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm flex items-center justify-between"
          >
            <div>
              <p className="text-[13px] font-semibold text-[#5F5B75]">{c.label}</p>
              <p className="font-display font-bold text-[30px] text-[#1E1B2E] leading-none mt-1">
                {c.count}
              </p>
            </div>
            <StatusChip label={c.chip} variant={c.variant} dot={false} />
          </div>
        ))}
      </div>

      {/* COURSE SELECTOR, SECTION FILTER, DIFFICULTY & TYPE FILTERS & SEARCH */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-[#5F5B75] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search question text or section..."
              aria-label="Search question text or section"
              className="w-full h-11 pl-9 pr-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] focus:outline-none focus:border-[#6D4AE0]"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={selectedCourseId}
              onChange={(e) => updateParams({ courseId: e.target.value, page: 1 })}
              aria-label="Filter by course"
              className="w-full h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-semibold text-[#1E1B2E]"
            >
              <option value="all">
                All courses ({multiCourseAllQuery.total || difficultyCounters.total})
              </option>
              {taughtCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <select
              value={selectedSectionId}
              onChange={(e) => updateParams({ sectionId: e.target.value, page: 1 })}
              aria-label="Filter by section"
              className="w-full h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-semibold text-[#1E1B2E]"
            >
              <option value="all">All sections</option>
              {filterSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={selectedDifficulty}
              onChange={(e) => updateParams({ difficulty: e.target.value, page: 1 })}
              aria-label="Filter by difficulty"
              className="w-full h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-semibold text-[#1E1B2E]"
            >
              <option value="all">All difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Question type filter pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {[
            { id: 'all', label: 'All types' },
            { id: 'single', label: 'Single choice' },
            { id: 'multiple', label: 'Multiple choice' },
            { id: 'boolean', label: 'True / False' },
          ].map((pill) => {
            const active = selectedType === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => updateParams({ type: pill.id, page: 1 })}
                className={`h-8 px-3 rounded-full text-[12px] font-bold border transition-all cursor-pointer ${
                  active
                    ? 'bg-[#6D4AE0] text-white border-[#6D4AE0]'
                    : 'bg-[#FAF8FF] text-[#5F5B75] border-[#E6E1F5] hover:border-[#A78BFA]'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Bulk Select Action Bar */}
        {selectedIds.length > 0 && (
          <div className="pt-3 border-t border-[#E6E1F5] flex items-center justify-between gap-4 bg-[#F3EFFF] px-4 py-2.5 rounded-[10px]">
            <span className="text-[13px] font-bold text-[#3F2A9E]">
              {selectedIds.length} {selectedIds.length === 1 ? 'question' : 'questions'}{' '}
              selected
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                Clear selection
              </Button>
              <Button
                size="sm"
                variant="danger"
                loading={bulkDeleteMutation.isPending}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setBulkDeleteConfirmOpen(true)}
              >
                Delete selected
              </Button>
            </div>
          </div>
        )}
      </div>

      {isListFetching && !isListLoading && (
        <p className="text-[12px] font-semibold text-[#6D4AE0]">Refreshing question bank…</p>
      )}

      {isListLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-16 w-full rounded-[12px]" />
          ))}
        </div>
      ) : listError ? (
        <QueryErrorState
          title="Could not load question bank"
          error={listError}
          onRetry={() => {
            if (selectedCourseId === 'all') void multiCourseQuery.refetchAll();
            else void singleCourseQuery.refetch();
          }}
        />
      ) : displayedQuestions.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? 'No questions match your filters' : 'Question bank is empty'}
          description={
            hasActiveFilters
              ? 'Reset filters or add new assessment items to build this question pool.'
              : 'Add your first exam question or import a CSV batch to start building assessments.'
          }
          actionLabel={hasActiveFilters ? 'Reset filters' : 'Add question'}
          onAction={
            hasActiveFilters
              ? () => {
                  setSearchInput('');
                  updateParams({
                    courseId: 'all',
                    sectionId: 'all',
                    difficulty: 'all',
                    type: 'all',
                    page: 1,
                  });
                }
              : handleOpenAddDrawer
          }
          mood="empty"
        />
      ) : (
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[14px]">
              <thead>
                <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[#1E1B2E] font-bold text-[13px]">
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(displayedQuestions.map((q) => q.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      aria-label="Select all visible questions"
                      className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Question</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Difficulty</th>
                  <th className="py-3.5 px-4">Section</th>
                  <th className="py-3.5 px-4">Points</th>
                  <th className="py-3.5 px-4">Times used</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1F5]">
                {displayedQuestions.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const diffVariant =
                    item.difficulty === 'Easy'
                      ? 'success'
                      : item.difficulty === 'Medium'
                        ? 'orange'
                        : 'danger';
                  const typeLabel =
                    item.type === 'multiple'
                      ? 'Multiple choice'
                      : item.type === 'boolean'
                        ? 'True/False'
                        : 'Single choice';

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-[#F3EFFF]/50' : 'hover:bg-[#FAF8FF]'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          aria-label={`Select question ${item.id}`}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id]
                            )
                          }
                          className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <p className="font-bold text-[#1E1B2E] line-clamp-2">
                          {item.question}
                        </p>
                        <p className="text-[12px] text-[#5F5B75] mt-0.5">
                          {item.courseTitle} • {item.options.length} options
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-[#FAF8FF] border border-[#E6E1F5] text-[#1E1B2E]">
                          {typeLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusChip
                          label={item.difficulty}
                          variant={diffVariant}
                          dot={false}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-[13px] text-[#5F5B75]">
                        {item.sectionName.split(':')[0]}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#1E1B2E] whitespace-nowrap">
                        {item.points} pts
                      </td>
                      <td className="py-3.5 px-4 text-[13px] text-[#5F5B75] whitespace-nowrap">
                        {item.timesUsed.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDrawer(item)}
                            className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#6D4AE0] hover:bg-[#F3EFFF] cursor-pointer"
                            title="Edit question"
                            aria-label="Edit question"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuestionToDelete(item)}
                            className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                            title="Delete question"
                            aria-label="Delete question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={(nextPage) => updateParams({ page: nextPage })}
          />
        </div>
      )}

      {/* ADD / EDIT QUESTION SIDE DRAWER */}
      <Drawer
        open={drawerOpen}
        onClose={() => {
          if (!isSavingQuestion) setDrawerOpen(false);
        }}
        title={editingQuestionId ? 'Edit question' : 'Add question to bank'}
        footer={
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isSavingQuestion}
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {!editingQuestionId && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={createQuestionMutation.isPending}
                  disabled={isSavingQuestion}
                  onClick={() => void validateAndSaveQuestion(true)}
                >
                  Save and add another
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                loading={isSavingQuestion}
                disabled={isSavingQuestion}
                onClick={() => void validateAndSaveQuestion(false)}
              >
                Save
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5 text-[14px]">
          {drawerFormErrors.length > 0 && (
            <FormErrorSummary errors={drawerFormErrors} title="Check question fields" />
          )}

          {validationError && drawerFormErrors.length === 0 && (
            <div className="p-3.5 rounded-[10px] bg-[#FEF2F2] border border-[#DC2626]/40 text-[#DC2626] text-[13px] font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Question Type Selector */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#1E1B2E]">Question type</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'single', label: 'Single choice' },
                  { id: 'multiple', label: 'Multiple choice' },
                  { id: 'boolean', label: 'True / False' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleChangeQuestionType(t.id)}
                  className={`py-2 px-2.5 rounded-[8px] text-[12px] font-bold border transition-all cursor-pointer ${
                    qType === t.id
                      ? 'bg-[#6D4AE0] text-white border-[#6D4AE0]'
                      : 'bg-[#FAF8FF] text-[#5F5B75] border-[#E6E1F5] hover:text-[#1E1B2E]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Course & Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="qbank-course-select"
                className="block text-[12px] font-bold text-[#1E1B2E]"
              >
                Course
              </label>
              <select
                id="qbank-course-select"
                value={qCourseId}
                disabled={Boolean(editingQuestionId)}
                onChange={(e) => {
                  setQCourseId(e.target.value);
                  setQSectionId('');
                }}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px] disabled:opacity-60"
              >
                {taughtCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="qbank-section-select"
                className="block text-[12px] font-bold text-[#1E1B2E]"
              >
                Section
              </label>
              <select
                id="qbank-section-select"
                value={qSectionId}
                onChange={(e) => setQSectionId(e.target.value)}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px]"
              >
                {drawerSections.length === 0 ? (
                  <option value={qSectionId || 'sec-1'}>Default syllabus section</option>
                ) : (
                  drawerSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-1.5">
            <label htmlFor="qbank-question-text" className="block font-bold text-[#1E1B2E]">
              Question text *
            </label>
            <textarea
              id="qbank-question-text"
              rows={3}
              value={qText}
              onChange={(e) => {
                setQText(e.target.value);
                setValidationError('');
              }}
              placeholder="Enter the exam question prompt (at least 8 characters)..."
              className="w-full p-3 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[14px]"
            />
          </div>

          {/* Optional Image */}
          <div className="space-y-1.5">
            <label
              htmlFor="qbank-image-url"
              className="block text-[12px] font-bold text-[#5F5B75]"
            >
              Optional diagram / code snippet image URL
            </label>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#6D4AE0] shrink-0" />
              <input
                id="qbank-image-url"
                type="text"
                value={qImageUrl}
                onChange={(e) => setQImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 h-10 px-3 rounded-[8px] bg-[#FAF8FF] border border-[#E6E1F5] text-[12px]"
              />
            </div>
          </div>

          {/* 2–6 Options with Correct Toggle and Add/Remove */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1E1B2E]">
                Answer options ({qOptions.length}/6)
              </span>
              <span className="text-[11px] font-semibold text-[#6D4AE0]">
                {qType === 'multiple'
                  ? 'Check all correct options'
                  : 'Select the 1 correct option'}
              </span>
            </div>

            <div className="space-y-2">
              {qOptions.map((opt, idx) => {
                const isCorrect = qCorrectIndices.includes(idx);
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 p-2 rounded-[10px] border ${
                      isCorrect
                        ? 'bg-[#16A34A]/8 border-[#16A34A]/40'
                        : 'bg-white border-[#E6E1F5]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleCorrectOption(idx)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold cursor-pointer ${
                        isCorrect
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-[#FAF8FF] border border-[#E6E1F5] text-[#5F5B75]'
                      }`}
                      title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                      aria-label={`Option ${String.fromCharCode(65 + idx)}: ${
                        isCorrect ? 'Marked correct' : 'Mark as correct'
                      }`}
                    >
                      {isCorrect ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        String.fromCharCode(65 + idx)
                      )}
                    </button>
                    <input
                      id={`qbank-option-${idx}`}
                      type="text"
                      value={opt}
                      disabled={qType === 'boolean'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQOptions((prev) =>
                          prev.map((item, i) => (i === idx ? val : item))
                        );
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}...`}
                      aria-label={`Option ${String.fromCharCode(65 + idx)} text`}
                      className="flex-1 h-9 px-2 text-[13px] bg-transparent focus:outline-none"
                    />
                    {qType !== 'boolean' && qOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          setQOptions((prev) => prev.filter((_, i) => i !== idx));
                          setQCorrectIndices((prev) =>
                            prev
                              .filter((i) => i !== idx)
                              .map((i) => (i > idx ? i - 1 : i))
                          );
                        }}
                        className="w-9 h-9 flex items-center justify-center text-[#5F5B75] hover:text-[#DC2626] cursor-pointer"
                        title="Remove option"
                        aria-label={`Remove option ${String.fromCharCode(65 + idx)}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {qType !== 'boolean' && qOptions.length < 6 && (
              <button
                type="button"
                onClick={() => setQOptions((prev) => [...prev, ''])}
                className="text-[12px] font-bold text-[#6D4AE0] hover:underline inline-flex items-center gap-1 cursor-pointer min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add option (up to 6)</span>
              </button>
            )}
          </div>

          {/* Difficulty & Points */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="qbank-difficulty-select"
                className="block text-[12px] font-bold text-[#1E1B2E]"
              >
                Difficulty
              </label>
              <select
                id="qbank-difficulty-select"
                value={qDifficulty}
                onChange={(e) =>
                  setQDifficulty(e.target.value as InstructorQuestionItem['difficulty'])
                }
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px]"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="qbank-points-input"
                className="block text-[12px] font-bold text-[#1E1B2E]"
              >
                Points
              </label>
              <input
                id="qbank-points-input"
                type="number"
                min={1}
                max={25}
                value={qPoints}
                onChange={(e) => setQPoints(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px] font-bold"
              />
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-1">
            <label
              htmlFor="qbank-explanation"
              className="block text-[12px] font-bold text-[#1E1B2E]"
            >
              Answer explanation (shown on exam review)
            </label>
            <textarea
              id="qbank-explanation"
              rows={2}
              value={qExplanation}
              onChange={(e) => setQExplanation(e.target.value)}
              placeholder="Explain why the correct answer is right..."
              className="w-full p-2.5 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px]"
            />
          </div>
        </div>
      </Drawer>

      {/* IMPORT CSV MODAL */}
      <Modal
        open={csvModalOpen}
        onClose={handleCloseCsvModal}
        title="Import questions from CSV"
        description="Upload a UTF-8 CSV file matching the EduHub Question Bank schema."
        footer={
          <>
            <Button variant="ghost" onClick={handleCloseCsvModal}>
              {importCsvMutation.isPending ? 'Cancel upload' : 'Cancel'}
            </Button>
            {csvSelectedFile && (
              <Button
                variant="primary"
                loading={importCsvMutation.isPending}
                disabled={importCsvMutation.isPending}
                onClick={() => void handleRunCsvImport('file')}
              >
                Upload & import CSV
              </Button>
            )}
            <Button
              variant={csvSelectedFile ? 'secondary' : 'primary'}
              loading={!csvSelectedFile && importCsvMutation.isPending}
              disabled={importCsvMutation.isPending}
              onClick={() => void handleRunCsvImport('sample')}
            >
              Import 2 sample questions
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="csv-target-course"
              className="block text-[12px] font-bold text-[#1E1B2E]"
            >
              Destination course
            </label>
            <select
              id="csv-target-course"
              value={csvCourseId}
              disabled={importCsvMutation.isPending}
              onChange={(e) => setCsvCourseId(e.target.value)}
              className="w-full h-10 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px] font-semibold"
            >
              {taughtCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <label className="block rounded-[12px] border-2 border-dashed border-[#A78BFA] bg-[#FAF8FF] p-6 text-center space-y-2 cursor-pointer hover:border-[#6D4AE0] transition-colors">
            <FileSpreadsheet className="w-8 h-8 text-[#6D4AE0] mx-auto" />
            <p className="font-display font-bold text-[16px] text-[#1E1B2E]">
              {csvSelectedFile ? csvSelectedFile.name : 'Choose a .csv file or use sample batch'}
            </p>
            <p className="text-[12px] text-[#5F5B75]">
              Columns: question, type, option_a, option_b, option_c, option_d, correct,
              difficulty, points, section
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setCsvSelectedFile(file);
                setCsvImportResultErrors([]);
              }}
            />
          </label>

          {importCsvMutation.isPending && (
            <p className="text-[12px] font-semibold text-[#6D4AE0]">
              Importing CSV rows… {csvUploadProgress}%
            </p>
          )}

          {csvImportResultErrors.length > 0 && (
            <div className="p-3.5 rounded-[10px] bg-[#FFFBEB] border border-[#F59E0B] text-[12px] space-y-1">
              <p className="font-bold text-[#B45309]">Rows with validation errors:</p>
              {csvImportResultErrors.map((err) => (
                <p key={`${err.row}-${err.message}`} className="text-[#5F5B75]">
                  Row {err.row}: {err.message}
                </p>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onClose={() => {
          if (!bulkDeleteMutation.isPending) setBulkDeleteConfirmOpen(false);
        }}
        title={`Delete ${selectedIds.length} selected ${
          selectedIds.length === 1 ? 'question' : 'questions'
        }?`}
        description="This permanently removes the selected questions from the bank and cannot be undone."
        confirmLabel="Delete selected"
        tone="danger"
        loading={bulkDeleteMutation.isPending}
        onConfirm={() => void handleBulkDelete()}
      />

      <ConfirmDialog
        open={Boolean(questionToDelete)}
        onClose={() => {
          if (!deleteQuestionMutation.isPending) setQuestionToDelete(null);
        }}
        title="Delete this question?"
        description={
          questionToDelete
            ? `Are you sure you want to remove "${questionToDelete.question}" from your question bank?`
            : ''
        }
        confirmLabel="Delete question"
        tone="danger"
        loading={deleteQuestionMutation.isPending}
        onConfirm={() => void handleConfirmSingleDelete()}
      />
    </div>
  );
};

// ============================================================================
// 5. EXAM SETTINGS (/instructor/exam-settings)
// ============================================================================
export const InstructorExamSettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const coursesQuery = useInstructorCourses({ status: 'all', limit: 50 });
  const taughtCourses = useMemo(
    () => coursesQuery.data?.items ?? [],
    [coursesQuery.data?.items]
  );

  const urlCourseId = searchParams.get('courseId') || '';
  const selectedCourseId = useMemo(() => {
    if (urlCourseId && taughtCourses.some((c) => c.id === urlCourseId)) {
      return urlCourseId;
    }
    const preferred =
      taughtCourses.find((c) => c.id === 'course-5')?.id ??
      taughtCourses[0]?.id ??
      urlCourseId;
    return preferred || '';
  }, [urlCourseId, taughtCourses]);

  const handleSelectCourse = (nextCourseId: string) => {
    setSampleQuestions([]);
    setPreviewShortfall(null);
    setFormErrors([]);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextCourseId) next.set('courseId', nextCourseId);
        else next.delete('courseId');
        return next;
      },
      { replace: true }
    );
  };

  const courseDetailQuery = useInstructorCourseDetail(
    selectedCourseId,
    Boolean(selectedCourseId)
  );
  const examSettingsQuery = useExamSettings(selectedCourseId, Boolean(selectedCourseId));
  const bankSummaryQuery = useCourseQuestions(
    selectedCourseId,
    { page: 1, limit: 1 },
    Boolean(selectedCourseId)
  );

  const updateSettingsMutation = useUpdateExamSettingsMutation();
  const previewMutation = usePreviewExamSettingsMutation();

  const [numQuestions, setNumQuestions] = useState<number>(20);
  const [durationMins, setDurationMins] = useState<number>(30);
  const [passPercent, setPassPercent] = useState<number>(60);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
  const [easyPct, setEasyPct] = useState<number>(40);
  const [mediumPct, setMediumPct] = useState<number>(40);
  const [hardPct, setHardPct] = useState<number>(20);
  const [coveredSectionIds, setCoveredSectionIds] = useState<string[]>([]);

  const [sampleQuestions, setSampleQuestions] = useState<InstructorQuestionItem[]>([]);
  const [previewShortfall, setPreviewShortfall] = useState<{
    needed: number;
    available: number;
  } | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrorItem[]>([]);

  useEffect(() => {
    const config = examSettingsQuery.data;
    if (!config) return;
    setNumQuestions(config.totalQuestions);
    setDurationMins(Math.round(config.durationSeconds / 60));
    setPassPercent(config.passingScorePercent);
    setMaxAttempts(config.attemptsAllowed);
    setShuffleQuestions(config.shuffleQuestions);
    setShuffleOptions(config.shuffleOptions);
    setEasyPct(config.difficultyMix.easyPercent);
    setMediumPct(config.difficultyMix.mediumPercent);
    setHardPct(config.difficultyMix.hardPercent);
    setCoveredSectionIds(config.coveredSectionIds);
  }, [examSettingsQuery.data]);

  const sectionOptions = useMemo(
    () =>
      (courseDetailQuery.data?.sections ?? []).map((s) => ({
        id: s.id,
        name: s.title,
      })),
    [courseDetailQuery.data?.sections]
  );

  useEffect(() => {
    if (sectionOptions.length === 0) return;
    setCoveredSectionIds((prev) => {
      const valid = prev.filter((id) => sectionOptions.some((s) => s.id === id));
      return valid.length > 0 ? valid : sectionOptions.map((s) => s.id);
    });
  }, [sectionOptions]);

  const availableInBank = bankSummaryQuery.data?.meta.total ?? 0;
  const effectiveShortfall = previewShortfall
    ? previewShortfall
    : !bankSummaryQuery.isLoading && availableInBank < numQuestions
      ? { needed: numQuestions, available: availableInBank }
      : null;
  const totalMixPct = easyPct + mediumPct + hardPct;

  const handleAdjustDifficulty = (
    which: 'easy' | 'medium' | 'hard',
    newVal: number
  ) => {
    const clamped = Math.max(0, Math.min(100, newVal));
    if (which === 'easy') {
      const rem = 100 - clamped;
      const nextMed = Math.min(rem, mediumPct);
      setEasyPct(clamped);
      setMediumPct(nextMed);
      setHardPct(rem - nextMed);
    } else if (which === 'medium') {
      const rem = 100 - clamped;
      const nextEasy = Math.min(rem, easyPct);
      setMediumPct(clamped);
      setEasyPct(nextEasy);
      setHardPct(rem - nextEasy);
    } else {
      const rem = 100 - clamped;
      const nextEasy = Math.min(rem, easyPct);
      setHardPct(clamped);
      setEasyPct(nextEasy);
      setMediumPct(rem - nextEasy);
    }
  };

  const buildPayload = () => ({
    title: examSettingsQuery.data?.title,
    durationSeconds: Math.max(600, Math.min(10800, durationMins * 60)),
    passingScorePercent: Math.max(50, Math.min(100, passPercent)),
    totalQuestions: Math.max(5, Math.min(50, numQuestions)),
    attemptsAllowed: Math.max(1, Math.min(10, maxAttempts)),
    shuffleQuestions,
    shuffleOptions,
    difficultyMix: {
      easyPercent: easyPct,
      mediumPercent: mediumPct,
      hardPercent: hardPct,
    },
    coveredSectionIds:
      coveredSectionIds.length > 0
        ? coveredSectionIds
        : sectionOptions.slice(0, 1).map((s) => s.id),
  });

  const handleGenerateSampleExam = async () => {
    if (!selectedCourseId) return;
    try {
      const res = await previewMutation.mutateAsync({
        courseId: selectedCourseId,
        payload: buildPayload(),
      });
      setSampleQuestions(res.sampleQuestions.map(mapQuestionDtoToInstructorItem));
      setPreviewShortfall(res.shortfallWarning);
    } catch {
      // Handled via mutation toast
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    setFormErrors([]);
    try {
      await updateSettingsMutation.mutateAsync({
        courseId: selectedCourseId,
        payload: buildPayload(),
      });
    } catch (error) {
      if (isApiError(error) && error.fieldErrors) {
        setFormErrors(
          Object.entries(error.fieldErrors).map(([field, msgs]) => ({
            field,
            message: msgs[0] ?? error.message,
          }))
        );
      }
    }
  };

  if (coursesQuery.isLoading || (selectedCourseId && examSettingsQuery.isLoading)) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-24 w-full rounded-[12px]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-7 h-96 w-full rounded-[12px]" />
          <Skeleton className="lg:col-span-5 h-96 w-full rounded-[12px]" />
        </div>
      </div>
    );
  }

  if (coursesQuery.isError || (selectedCourseId && examSettingsQuery.isError)) {
    return (
      <div className="space-y-6 pb-12">
        <QueryErrorState
          title="Could not load exam settings"
          error={coursesQuery.error ?? examSettingsQuery.error}
          onRetry={() => {
            void coursesQuery.refetch();
            void examSettingsQuery.refetch();
          }}
        />
      </div>
    );
  }

  if (taughtCourses.length === 0) {
    return (
      <div className="space-y-6 pb-12">
        <Breadcrumbs
          items={[
            { label: 'Instructor dashboard', to: '/instructor/dashboard' },
            { label: 'Exam settings' },
          ]}
        />
        <EmptyState
          title="No authored courses yet"
          description="Create a course draft first before configuring its certification exam blueprint."
          actionLabel="Create course"
          actionTo="/instructor/courses/new"
          mood="empty"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Instructor dashboard', to: '/instructor/dashboard' },
          { label: 'Question bank', to: '/instructor/question-bank' },
          { label: 'Exam settings' },
        ]}
      />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Exam settings
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Configure question draw rules, difficulty mix, section coverage, and passing
            thresholds per course.
          </p>
        </div>

        {/* Course Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#5F5B75]">Course:</span>
          <select
            value={selectedCourseId}
            onChange={(e) => handleSelectCourse(e.target.value)}
            aria-label="Select course for exam settings"
            className="h-11 px-3.5 rounded-[10px] bg-white border-2 border-[#6D4AE0] text-[14px] font-bold text-[#1E1B2E] cursor-pointer max-w-[320px]"
          >
            {taughtCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
                {c.id === selectedCourseId && !bankSummaryQuery.isLoading
                  ? ` (Have ${availableInBank}, Need ${numQuestions})`
                  : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* WARNING BANNER WHEN THE BANK IS TOO SMALL */}
      {effectiveShortfall && (
        <div className="rounded-[12px] bg-[#FFFBEB] border-2 border-[#F59E0B] p-5 shadow-purple-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-[10px] bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                Warning: Question bank is too small (need {effectiveShortfall.needed}, have{' '}
                {effectiveShortfall.available})
              </h2>
              <p className="text-[14px] text-[#5F5B75]">
                Your exam is configured to draw{' '}
                <strong>{effectiveShortfall.needed} questions</strong>, but this course Question
                Bank only has <strong>{effectiveShortfall.available} questions</strong>. Add at
                least {Math.max(1, effectiveShortfall.needed - effectiveShortfall.available)} more
                questions so every student attempt has a complete question set.
              </p>
            </div>
          </div>
          <Link
            to={`/instructor/question-bank?courseId=${encodeURIComponent(selectedCourseId)}`}
            className="shrink-0"
          >
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Add questions
            </Button>
          </Link>
        </div>
      )}

      {formErrors.length > 0 && (
        <FormErrorSummary errors={formErrors} title="Could not save exam configuration" />
      )}

      <form
        onSubmit={(e) => void handleSaveSettings(e)}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      >
        {/* LEFT 7 COLS */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-5">
            <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
              Core assessment parameters
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="exam-num-questions"
                  className="block text-[13px] font-bold text-[#1E1B2E]"
                >
                  Questions
                </label>
                <input
                  id="exam-num-questions"
                  type="number"
                  min={5}
                  max={50}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-display font-bold text-[18px] text-[#1E1B2E]"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="exam-duration-mins"
                  className="block text-[13px] font-bold text-[#1E1B2E]"
                >
                  Duration (min)
                </label>
                <input
                  id="exam-duration-mins"
                  type="number"
                  min={10}
                  max={180}
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-display font-bold text-[18px] text-[#1E1B2E]"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="exam-pass-percent"
                  className="block text-[13px] font-bold text-[#1E1B2E]"
                >
                  Pass score (%)
                </label>
                <input
                  id="exam-pass-percent"
                  type="number"
                  min={50}
                  max={100}
                  value={passPercent}
                  onChange={(e) => setPassPercent(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-display font-bold text-[18px] text-[#16A34A]"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="exam-max-attempts"
                  className="block text-[13px] font-bold text-[#1E1B2E]"
                >
                  Max attempts
                </label>
                <input
                  id="exam-max-attempts"
                  type="number"
                  min={1}
                  max={10}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-display font-bold text-[18px] text-[#1E1B2E]"
                />
              </div>
            </div>

            {/* Shuffle Toggles */}
            <div className="pt-4 border-t border-[#E6E1F5] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-bold text-[14px] text-[#1E1B2E]">Shuffle questions</p>
                  <p className="text-[12px] text-[#5F5B75]">
                    Randomize question order per student
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="accent-[#6D4AE0] w-5 h-5 rounded cursor-pointer"
                />
              </label>

              <label className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-bold text-[14px] text-[#1E1B2E]">Shuffle options</p>
                  <p className="text-[12px] text-[#5F5B75]">
                    Randomize A/B/C/D choice positions
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="accent-[#6D4AE0] w-5 h-5 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Difficulty Mix Sliders */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                  Difficulty mix sliders
                </h2>
                <p className="text-[13px] text-[#5F5B75]">
                  Automatically balances Easy, Medium, and Hard percentages to total 100%.
                </p>
              </div>
              <StatusChip label={`Total: ${totalMixPct}%`} variant="success" />
            </div>

            <div className="space-y-4">
              {[
                {
                  key: 'easy' as const,
                  label: 'Easy',
                  val: easyPct,
                  color: 'text-[#16A34A]',
                  qCount: Math.round((easyPct / 100) * numQuestions),
                },
                {
                  key: 'medium' as const,
                  label: 'Medium',
                  val: mediumPct,
                  color: 'text-[#F59E3B]',
                  qCount: Math.round((mediumPct / 100) * numQuestions),
                },
                {
                  key: 'hard' as const,
                  label: 'Hard',
                  val: hardPct,
                  color: 'text-[#DC2626]',
                  qCount: Math.round((hardPct / 100) * numQuestions),
                },
              ].map((slider) => (
                <div key={slider.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="font-bold text-[#1E1B2E]">{slider.label}</span>
                    <span className={`font-display font-bold text-[16px] ${slider.color}`}>
                      {slider.val}% (~{slider.qCount} questions)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={slider.val}
                    aria-label={slider.label}
                    onChange={(e) =>
                      handleAdjustDifficulty(slider.key, Number(e.target.value))
                    }
                    className="w-full accent-[#6D4AE0] cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLS */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
            <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
              Section coverage selector
            </h2>
            <p className="text-[13px] text-[#5F5B75]">
              Choose which syllabus sections are included when generating student exams.
            </p>

            {sectionOptions.length === 0 ? (
              <p className="text-[13px] text-[#5F5B75] p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5]">
                No sections defined for this course yet. Add sections in the Course Builder.
              </p>
            ) : (
              <div className="space-y-2.5">
                {sectionOptions.map((sec) => {
                  const checked = coveredSectionIds.includes(sec.id);
                  return (
                    <label
                      key={sec.id}
                      className={`p-3.5 rounded-[10px] border flex items-center justify-between cursor-pointer transition-colors ${
                        checked
                          ? 'bg-[#F3EFFF] border-[#6D4AE0]'
                          : 'bg-[#FAF8FF] border-[#E6E1F5]'
                      }`}
                    >
                      <span className="font-semibold text-[14px] text-[#1E1B2E]">
                        {sec.name}
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setCoveredSectionIds((prev) =>
                            prev.includes(sec.id)
                              ? prev.length > 1
                                ? prev.filter((id) => id !== sec.id)
                                : prev
                              : [...prev, sec.id]
                          )
                        }
                        className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-[#E6E1F5] flex flex-col gap-2.5">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                loading={previewMutation.isPending}
                disabled={previewMutation.isPending || sectionOptions.length === 0}
                leftIcon={<Shuffle className="w-4 h-4" />}
                onClick={() => void handleGenerateSampleExam()}
              >
                Generate sample exam
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={updateSettingsMutation.isPending}
                disabled={updateSettingsMutation.isPending || sectionOptions.length === 0}
              >
                Save exam configuration
              </Button>
            </div>
          </div>

          {/* Sample Exam Preview Card */}
          {sampleQuestions.length > 0 && (
            <div className="rounded-[12px] bg-white border-2 border-[#6D4AE0] p-5 shadow-purple-md space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                  Sample exam draw preview
                </h3>
                <StatusChip label="Random draw" variant="primary" />
              </div>
              <div className="divide-y divide-[#E6E1F5] max-h-80 overflow-y-auto">
                {sampleQuestions.map((sq, idx) => (
                  <div key={sq.id} className="py-2.5 space-y-1 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#6D4AE0]">Sample Q{idx + 1}</span>
                      <span className="text-[11px] font-bold text-[#5F5B75]">
                        {sq.difficulty} • {sq.points} pts
                      </span>
                    </div>
                    <p className="font-semibold text-[#1E1B2E] line-clamp-2">
                      {sq.question}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
