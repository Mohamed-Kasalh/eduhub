import React, { useState, useMemo } from 'react';
import { Link } from 'react-router';
import {
  PlusCircle,
  Upload,
  Trash2,
  Edit3,
  Search,
  Settings,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Shuffle,
  Plus,
  X,
  Check,
  Image as ImageIcon,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Button,
  StatusChip,
  Breadcrumbs,
  Drawer,
  Modal,
  EmptyState,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import {
  INITIAL_INSTRUCTOR_QUESTIONS,
  InstructorQuestionItem,
} from '../../data/instructorMockData';
import { COURSE_QUESTION_BANK } from '../../data/examAndCertData';

const SECTION_OPTIONS = [
  { id: 'sec-1', name: 'Section 1: Modern Foundations' },
  { id: 'sec-2', name: 'Section 2: State, Effects & Custom Hooks' },
  { id: 'sec-3', name: 'Section 3: Data Routing, Performance & A11y' },
  { id: 'sec-4', name: 'Section 4: Testing & Certification Prep' },
];

// ============================================================================
// 4. QUESTION BANK (/instructor/question-bank)
// ============================================================================
export const InstructorQuestionBankPage: React.FC = () => {
  const { addToast } = useApp();

  // Combine initial instructor questions with the full 20-question bank so course-1 has 20+ questions
  const [bankQuestions, setBankQuestions] = useState<InstructorQuestionItem[]>(() => {
    const fromExamBank: InstructorQuestionItem[] = COURSE_QUESTION_BANK.map((q, idx) => ({
      id: `bank-${q.id}`,
      courseId: 'course-1',
      courseTitle: 'Complete React Developer Course',
      sectionId: q.sectionId,
      sectionName: q.sectionName,
      type: q.type,
      question: q.question,
      options: q.options,
      correctIndices: q.correctIndices,
      difficulty: q.difficulty,
      points: q.points,
      timesUsed: 1420 - idx * 38,
      explanation: q.explanation,
      imageUrl: q.imageUrl,
    }));
    const extraCourse5 = INITIAL_INSTRUCTOR_QUESTIONS.filter(
      (q) => q.courseId === 'course-5'
    );
    return [...fromExamBank, ...extraCourse5];
  });

  // Filters & Search
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Import CSV modal state
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // "Add question" side drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qType, setQType] = useState<'single' | 'multiple' | 'boolean'>('single');
  const [qText, setQText] = useState('');
  const [qImageUrl, setQImageUrl] = useState('');
  const [qOptions, setQOptions] = useState<string[]>([
    'Use functional state updates (setCount(c => c + 1))',
    'Mutate the state variable directly without calling setState',
    'Call forceUpdate() on the window object',
    'Wrap the component in an HTML table',
  ]);
  const [qCorrectIndices, setQCorrectIndices] = useState<number[]>([0]);
  const [qExplanation, setQExplanation] = useState(
    'Functional updates always receive the latest pending state value and prevent stale closure bugs.'
  );
  const [qDifficulty, setQDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [qPoints, setQPoints] = useState<number>(5);
  const [qSectionId, setQSectionId] = useState<string>('sec-2');
  const [qCourseId, setQCourseId] = useState<string>('course-1');
  const [validationError, setValidationError] = useState<string>('');

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bankQuestions.filter((item) => {
      if (selectedCourseId !== 'all' && item.courseId !== selectedCourseId) return false;
      if (selectedSectionId !== 'all' && item.sectionId !== selectedSectionId) return false;
      if (selectedDifficulty !== 'all' && item.difficulty !== selectedDifficulty)
        return false;
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      if (
        q &&
        !item.question.toLowerCase().includes(q) &&
        !item.sectionName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [
    bankQuestions,
    selectedCourseId,
    selectedSectionId,
    selectedDifficulty,
    selectedType,
    searchQuery,
  ]);

  // Counters per difficulty (Easy, Medium, Hard)
  const difficultyCounters = useMemo(() => {
    const base =
      selectedCourseId === 'all'
        ? bankQuestions
        : bankQuestions.filter((q) => q.courseId === selectedCourseId);
    return {
      total: base.length,
      easy: base.filter((q) => q.difficulty === 'Easy').length,
      medium: base.filter((q) => q.difficulty === 'Medium').length,
      hard: base.filter((q) => q.difficulty === 'Hard').length,
    };
  }, [bankQuestions, selectedCourseId]);

  const handleOpenAddDrawer = () => {
    setEditingQuestionId(null);
    setQType('single');
    setQText('');
    setQImageUrl('');
    setQOptions(['Option A', 'Option B', 'Option C', 'Option D']);
    setQCorrectIndices([0]);
    setQExplanation('');
    setQDifficulty('Medium');
    setQPoints(5);
    setQSectionId('sec-1');
    setValidationError('');
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
    setDrawerOpen(true);
  };

  const handleChangeQuestionType = (nextType: 'single' | 'multiple' | 'boolean') => {
    setQType(nextType);
    setValidationError('');
    if (nextType === 'boolean') {
      setQOptions(['True', 'False']);
      setQCorrectIndices([0]);
    } else if (qOptions.length < 2 || (qOptions.length === 2 && qOptions[0] === 'True')) {
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

  const validateAndSaveQuestion = (keepDrawerOpenForAnother: boolean) => {
    if (qText.trim().length < 8) {
      setValidationError('Please enter a clear question prompt (at least 8 characters).');
      return;
    }
    const hasEmptyOption = qOptions.some((opt) => !opt.trim());
    if (hasEmptyOption) {
      setValidationError('Validation error: No empty options are allowed. Fill or remove blank options.');
      return;
    }
    if (qCorrectIndices.length === 0) {
      setValidationError('Validation error: Select at least one correct answer.');
      return;
    }

    const secObj =
      SECTION_OPTIONS.find((s) => s.id === qSectionId) || SECTION_OPTIONS[0];
    const courseTitle =
      qCourseId === 'course-5'
        ? 'Full-Stack TypeScript & Node.js Bootcamp'
        : 'Complete React Developer Course';

    if (editingQuestionId) {
      setBankQuestions((prev) =>
        prev.map((q) =>
          q.id === editingQuestionId
            ? {
                ...q,
                courseId: qCourseId,
                courseTitle,
                sectionId: secObj.id,
                sectionName: secObj.name,
                type: qType,
                question: qText.trim(),
                options: qOptions.map((o) => o.trim()),
                correctIndices: qCorrectIndices,
                difficulty: qDifficulty,
                points: qPoints,
                explanation: qExplanation.trim() || 'Verified instructor explanation.',
                imageUrl: qImageUrl.trim() || undefined,
              }
            : q
        )
      );
      addToast({
        title: 'Question updated',
        message: 'Changes saved to the Question Bank.',
        variant: 'success',
      });
    } else {
      const created: InstructorQuestionItem = {
        id: `iq-${Date.now()}`,
        courseId: qCourseId,
        courseTitle,
        sectionId: secObj.id,
        sectionName: secObj.name,
        type: qType,
        question: qText.trim(),
        options: qOptions.map((o) => o.trim()),
        correctIndices: qCorrectIndices,
        difficulty: qDifficulty,
        points: qPoints,
        timesUsed: 1,
        explanation: qExplanation.trim() || 'Verified instructor explanation.',
        imageUrl: qImageUrl.trim() || undefined,
      };
      setBankQuestions((prev) => [created, ...prev]);
      addToast({
        title: 'Question saved to bank',
        message: keepDrawerOpenForAnother
          ? 'Ready to enter your next question.'
          : `"${created.question.slice(0, 48)}..." added.`,
        variant: 'success',
      });
    }

    if (keepDrawerOpenForAnother) {
      setEditingQuestionId(null);
      setQText('');
      setQImageUrl('');
      if (qType === 'boolean') {
        setQOptions(['True', 'False']);
      } else {
        setQOptions(['', '', '', '']);
      }
      setQCorrectIndices([0]);
      setValidationError('');
    } else {
      setDrawerOpen(false);
    }
  };

  const handleBulkDelete = () => {
    const count = selectedIds.length;
    setBankQuestions((prev) => prev.filter((q) => !selectedIds.includes(q.id)));
    setSelectedIds([]);
    addToast({
      title: `Deleted ${count} selected ${count === 1 ? 'question' : 'questions'}`,
      variant: 'info',
    });
  };

  const handleImportCsvSample = () => {
    const imported: InstructorQuestionItem[] = [
      {
        id: `csv-${Date.now()}-1`,
        courseId: 'course-1',
        courseTitle: 'Complete React Developer Course',
        sectionId: 'sec-2',
        sectionName: 'Section 2: State, Effects & Custom Hooks',
        type: 'single',
        question: '[CSV Import] Which hook lets you read context or resolve a Promise directly in React 19?',
        options: ['use()', 'useLegacyContext()', 'useClassState()', 'useDOM()'],
        correctIndices: [0],
        difficulty: 'Easy',
        points: 5,
        timesUsed: 0,
        explanation: 'The React 19 use() API reads resources like Promises and Context during render.',
      },
      {
        id: `csv-${Date.now()}-2`,
        courseId: 'course-1',
        courseTitle: 'Complete React Developer Course',
        sectionId: 'sec-3',
        sectionName: 'Section 3: Data Routing, Performance & A11y',
        type: 'boolean',
        question: '[CSV Import] True or False: Semantic <button> elements automatically support Enter and Space key activation.',
        options: ['True', 'False'],
        correctIndices: [0],
        difficulty: 'Easy',
        points: 5,
        timesUsed: 0,
        explanation: 'Native <button> elements include built-in keyboard focus and Enter/Space activation.',
      },
    ];
    setBankQuestions((prev) => [...imported, ...prev]);
    setCsvModalOpen(false);
    addToast({
      title: 'Imported 2 questions from CSV',
      message: 'All rows validated and added to Complete React Developer Course.',
      variant: 'success',
    });
  };

  const allVisibleSelected =
    filteredQuestions.length > 0 &&
    filteredQuestions.every((q) => selectedIds.includes(q.id));

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
            Manage single-choice, multiple-choice, and True/False exam questions across your courses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setCsvModalOpen(true)}
          >
            Import CSV
          </Button>
          <Link to="/instructor/exam-settings">
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

      {/* COURSE SELECTOR, SECTION FILTER, DIFFICULTY FILTER & SEARCH */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-[#5F5B75] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search question text or section..."
              className="w-full h-10 pl-9 pr-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] focus:outline-none focus:border-[#6D4AE0]"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              aria-label="Filter by course"
              className="w-full h-10 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-semibold text-[#1E1B2E]"
            >
              <option value="all">All courses ({bankQuestions.length})</option>
              <option value="course-1">Complete React Developer Course</option>
              <option value="course-5">Full-Stack TypeScript & Node.js</option>
            </select>
          </div>

          <div className="lg:col-span-3">
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              aria-label="Filter by section"
              className="w-full h-10 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-semibold text-[#1E1B2E]"
            >
              <option value="all">All sections</option>
              {SECTION_OPTIONS.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              aria-label="Filter by difficulty"
              className="w-full h-10 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-semibold text-[#1E1B2E]"
            >
              <option value="all">All difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Bulk Select Action Bar */}
        {selectedIds.length > 0 && (
          <div className="pt-3 border-t border-[#E6E1F5] flex items-center justify-between gap-4 bg-[#F3EFFF] px-4 py-2.5 rounded-[10px]">
            <span className="text-[13px] font-bold text-[#3F2A9E]">
              {selectedIds.length} {selectedIds.length === 1 ? 'question' : 'questions'}{' '}
              selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
              >
                Clear selection
              </Button>
              <Button
                size="sm"
                variant="danger"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleBulkDelete}
              >
                Delete selected
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* QUESTION BANK TABLE */}
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
                        setSelectedIds(filteredQuestions.map((q) => q.id));
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
              {filteredQuestions.map((item) => {
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
                      <StatusChip label={item.difficulty} variant={diffVariant} dot={false} />
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
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBankQuestions((prev) =>
                              prev.filter((q) => q.id !== item.id)
                            );
                            addToast({
                              title: 'Question deleted',
                              variant: 'info',
                            });
                          }}
                          className="p-1.5 rounded-[8px] text-[#5F5B75] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                          title="Delete question"
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

      {/* "ADD QUESTION" SIDE DRAWER */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingQuestionId ? 'Edit question' : 'Add question to bank'}
        footer={
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => validateAndSaveQuestion(true)}
              >
                Save and add another
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => validateAndSaveQuestion(false)}
              >
                Save
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5 text-[14px]">
          {validationError && (
            <div className="p-3.5 rounded-[10px] bg-[#FEF2F2] border border-[#DC2626]/40 text-[#DC2626] text-[13px] font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Question Type Selector: Single choice, Multiple choice, True/False */}
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
              <label className="block text-[12px] font-bold text-[#1E1B2E]">Course</label>
              <select
                value={qCourseId}
                onChange={(e) => setQCourseId(e.target.value)}
                className="w-full h-10 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px]"
              >
                <option value="course-1">Complete React Developer</option>
                <option value="course-5">Full-Stack TypeScript</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[12px] font-bold text-[#1E1B2E]">Section</label>
              <select
                value={qSectionId}
                onChange={(e) => setQSectionId(e.target.value)}
                className="w-full h-10 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px]"
              >
                {SECTION_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#1E1B2E]">Question text *</label>
            <textarea
              rows={3}
              value={qText}
              onChange={(e) => {
                setQText(e.target.value);
                setValidationError('');
              }}
              placeholder="Enter the exam question prompt..."
              className="w-full p-3 rounded-[10px] bg-white border border-[#E6E1F5] focus:border-[#6D4AE0] focus:outline-none text-[14px]"
            />
          </div>

          {/* Optional Image */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold text-[#5F5B75]">
              Optional diagram / code snippet image URL
            </label>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#6D4AE0] shrink-0" />
              <input
                type="text"
                value={qImageUrl}
                onChange={(e) => setQImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 h-9 px-3 rounded-[8px] bg-[#FAF8FF] border border-[#E6E1F5] text-[12px]"
              />
            </div>
          </div>

          {/* 2–6 Options with Correct Toggle and Add/Remove */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#1E1B2E]">
                Answer options ({qOptions.length}/6)
              </label>
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
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold cursor-pointer ${
                        isCorrect
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-[#FAF8FF] border border-[#E6E1F5] text-[#5F5B75]'
                      }`}
                      title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                    >
                      {isCorrect ? <Check className="w-3.5 h-3.5" /> : String.fromCharCode(65 + idx)}
                    </button>
                    <input
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
                      className="flex-1 h-8 px-2 text-[13px] bg-transparent focus:outline-none"
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
                        className="p-1 text-[#5F5B75] hover:text-[#DC2626] cursor-pointer"
                        title="Remove option"
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
                className="text-[12px] font-bold text-[#6D4AE0] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add option (up to 6)</span>
              </button>
            )}
          </div>

          {/* Difficulty & Points */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[12px] font-bold text-[#1E1B2E]">
                Difficulty
              </label>
              <select
                value={qDifficulty}
                onChange={(e) => setQDifficulty(e.target.value as any)}
                className="w-full h-10 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px]"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[12px] font-bold text-[#1E1B2E]">Points</label>
              <input
                type="number"
                min={1}
                max={25}
                value={qPoints}
                onChange={(e) => setQPoints(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-[8px] bg-white border border-[#E6E1F5] text-[13px] font-bold"
              />
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-1">
            <label className="block text-[12px] font-bold text-[#1E1B2E]">
              Answer explanation (shown on exam review)
            </label>
            <textarea
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
        onClose={() => setCsvModalOpen(false)}
        title="Import questions from CSV"
        description="Upload a UTF-8 CSV file matching the EduHub Question Bank schema."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCsvModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleImportCsvSample}>
              Import 2 sample questions
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-[12px] border-2 border-dashed border-[#A78BFA] bg-[#FAF8FF] p-6 text-center space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-[#6D4AE0] mx-auto" />
            <p className="font-display font-bold text-[16px] text-[#1E1B2E]">
              react-19-question-bank-batch.csv
            </p>
            <p className="text-[12px] text-[#5F5B75]">
              Columns: question, type, option_a, option_b, option_c, option_d, correct,
              difficulty, points, section
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================================
// 5. EXAM SETTINGS (/instructor/exam-settings)
// Per course: number of questions, duration, pass %, max attempts, shuffle
// questions and options toggles, difficulty mix sliders (Easy/Medium/Hard %,
// total 100%), section coverage selector, "Generate sample exam" preview,
// and warning banner when the bank is too small (need 20, have 14) with "Add questions" link.
// ============================================================================
export const InstructorExamSettingsPage: React.FC = () => {
  const { addToast } = useApp();

  // Course selector: course-1 has 20 questions, course-5 has 14 questions (triggers "need 20, have 14" warning!)
  const [selectedCourseId, setSelectedCourseId] = useState<string>('course-5');
  const [numQuestions, setNumQuestions] = useState<number>(20);
  const [durationMins, setDurationMins] = useState<number>(30);
  const [passPercent, setPassPercent] = useState<number>(60);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);

  // Difficulty mix sliders (Easy / Medium / Hard %, total 100%)
  const [easyPct, setEasyPct] = useState<number>(40);
  const [mediumPct, setMediumPct] = useState<number>(40);
  const [hardPct, setHardPct] = useState<number>(20);

  // Section coverage selector
  const [coveredSectionIds, setCoveredSectionIds] = useState<string[]>([
    'sec-1',
    'sec-2',
    'sec-3',
    'sec-4',
  ]);

  // Sample exam generator state
  const [sampleQuestions, setSampleQuestions] = useState<typeof COURSE_QUESTION_BANK>([]);

  const availableInBank = selectedCourseId === 'course-1' ? 20 : 14;
  const isBankTooSmall = availableInBank < numQuestions;
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

  const handleGenerateSampleExam = () => {
    const pool = COURSE_QUESTION_BANK.filter((q) =>
      coveredSectionIds.includes(q.sectionId)
    );
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 6);
    setSampleQuestions(shuffled);
    addToast({
      title: 'Generated sample exam preview',
      message: `Randomly picked questions matching your ${easyPct}% Easy / ${mediumPct}% Medium / ${hardPct}% Hard mix.`,
      variant: 'info',
    });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      title: 'Exam settings saved!',
      message: `${numQuestions} questions, ${durationMins}m time limit, ${passPercent}% passing score.`,
      variant: 'success',
    });
  };

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
            Configure question draw rules, difficulty mix, section coverage, and passing thresholds per course.
          </p>
        </div>

        {/* Course Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#5F5B75]">Course:</span>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="h-11 px-3.5 rounded-[10px] bg-white border-2 border-[#6D4AE0] text-[14px] font-bold text-[#1E1B2E] cursor-pointer"
          >
            <option value="course-5">
              Full-Stack TypeScript Bootcamp (Have 14, Need 20)
            </option>
            <option value="course-1">
              Complete React Developer Course (Have 20, Need 20)
            </option>
          </select>
        </div>
      </div>

      {/* WARNING BANNER WHEN THE BANK IS TOO SMALL (Need 20, Have 14) WITH "ADD QUESTIONS" LINK */}
      {isBankTooSmall && (
        <div className="rounded-[12px] bg-[#FFFBEB] border-2 border-[#F59E0B] p-5 shadow-purple-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-[10px] bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-[18px] text-[#1E1B2E]">
                Warning: Question bank is too small (need {numQuestions}, have {availableInBank})
              </h2>
              <p className="text-[14px] text-[#5F5B75]">
                Your exam is configured to draw <strong>{numQuestions} questions</strong>, but this
                course Question Bank only has <strong>{availableInBank} questions</strong>. Add at
                least {numQuestions - availableInBank} more questions so every student attempt has a
                complete question set.
              </p>
            </div>
          </div>
          <Link to="/instructor/question-bank" className="shrink-0">
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

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT 7 COLS: CORE SETTINGS, SHUFFLE TOGGLES & DIFFICULTY MIX SLIDERS */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-5">
            <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
              Core assessment parameters
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-[#1E1B2E]">
                  Questions
                </label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-display font-bold text-[18px] text-[#1E1B2E]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-[#1E1B2E]">
                  Duration (min)
                </label>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-display font-bold text-[18px] text-[#1E1B2E]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-[#1E1B2E]">
                  Pass score (%)
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={passPercent}
                  onChange={(e) => setPassPercent(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-display font-bold text-[18px] text-[#16A34A]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-[#1E1B2E]">
                  Max attempts
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] font-display font-bold text-[18px] text-[#1E1B2E]"
                />
              </div>
            </div>

            {/* Shuffle Questions & Shuffle Options Toggles */}
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

          {/* Difficulty Mix Sliders (Easy/Medium/Hard %, Total 100%) */}
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

        {/* RIGHT 5 COLS: SECTION COVERAGE SELECTOR & "GENERATE SAMPLE EXAM" PREVIEW */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-4">
            <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
              Section coverage selector
            </h2>
            <p className="text-[13px] text-[#5F5B75]">
              Choose which syllabus sections are included when generating student exams.
            </p>

            <div className="space-y-2.5">
              {SECTION_OPTIONS.map((sec) => {
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

            <div className="pt-4 border-t border-[#E6E1F5] flex flex-col gap-2.5">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                leftIcon={<Shuffle className="w-4 h-4" />}
                onClick={handleGenerateSampleExam}
              >
                Generate sample exam
              </Button>
              <Button type="submit" variant="primary" fullWidth>
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
