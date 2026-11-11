export type BankQuestionType = 'single' | 'multiple' | 'boolean';

export interface BankExamQuestion {
  id: string;
  number: number;
  type: BankQuestionType;
  sectionId: string;
  sectionName: string;
  question: string;
  options: string[];
  correctIndices: number[];
  points: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  imageUrl?: string;
  imageCaption?: string;
  explanation: string;
}

export interface ExamAttemptRecord {
  id: string;
  attemptNumber: number;
  courseId: string;
  date: string;
  scorePercent: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeTaken: string;
  passed: boolean;
}

export const COURSE_QUESTION_BANK: BankExamQuestion[] = [
  {
    id: 'qb-1',
    number: 1,
    type: 'single',
    sectionId: 'sec-1',
    sectionName: 'Section 1: Modern Foundations',
    question:
      'Why should state updates in React always treat objects and arrays as immutable references?',
    options: [
      'Because React uses reference equality (Object.is) to detect state changes and schedule re-renders',
      'Because JavaScript automatically freezes all objects inside functional components',
      'Because mutating arrays throws a compile-time syntax error in TypeScript 5.7',
      'Because React persists all component state in browser sessionStorage by default',
    ],
    correctIndices: [0],
    points: 5,
    difficulty: 'Easy',
    imageUrl:
      'https://images.unsplash.com/photo-1619410283995-43d9134e7656?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=900',
    imageCaption: 'Figure 1.1 — Reference equality check (prevState !== nextState) during reconciliation.',
    explanation:
      'React compares the previous state pointer with the next state pointer using Object.is. Mutating an object in place keeps the same memory reference and skips re-rendering.',
  },
  {
    id: 'qb-2',
    number: 2,
    type: 'multiple',
    sectionId: 'sec-1',
    sectionName: 'Section 1: Modern Foundations',
    question:
      'Which of the following are valid benefits of using compound component composition over a single monolithic configuration prop object? (Select all that apply)',
    options: [
      'Consumers can rearrange or conditionally render child sub-components without prop bloat',
      'Shared implicit state can be scoped cleanly via a parent React Context',
      'It completely eliminates the need for React keys when rendering arrays',
      'Each sub-component can accept its own native HTML and ARIA attributes directly',
    ],
    correctIndices: [0, 1, 3],
    points: 5,
    difficulty: 'Medium',
    explanation:
      'Compound components provide flexible layout control, clean context sharing, and direct prop forwarding on sub-elements, whereas array keys are still required whenever rendering lists.',
  },
  {
    id: 'qb-3',
    number: 3,
    type: 'boolean',
    sectionId: 'sec-1',
    sectionName: 'Section 1: Modern Foundations',
    question:
      'True or False: In Tailwind CSS v4, global element reset rules placed outside any @layer block will override utility classes regardless of class specificity.',
    options: ['True', 'False'],
    correctIndices: [0],
    points: 5,
    difficulty: 'Easy',
    explanation:
      'Unlayered CSS always takes precedence over layered CSS (@layer utilities). Global element defaults should always be placed inside @layer base.',
  },
  {
    id: 'qb-4',
    number: 4,
    type: 'single',
    sectionId: 'sec-1',
    sectionName: 'Section 1: Modern Foundations',
    question:
      'What is the minimum contrast ratio required by WCAG 2.2 Level AA for standard body text (16px)?',
    options: ['2.5 : 1', '3.0 : 1', '4.5 : 1', '7.0 : 1'],
    correctIndices: [2],
    points: 5,
    difficulty: 'Easy',
    explanation:
      'WCAG 2.2 AA requires at least 4.5:1 contrast for normal body text and 3.0:1 for large text (18pt+ or 14pt+ bold).',
  },
  {
    id: 'qb-5',
    number: 5,
    type: 'single',
    sectionId: 'sec-1',
    sectionName: 'Section 1: Modern Foundations',
    question:
      'When rendering a dynamic list of course cards that can be filtered and re-sorted, what should be used as the React key prop?',
    options: [
      'The array index of the map callback (index)',
      'A stable, unique identifier from the data model (such as course.id)',
      'Math.random() generated during each render pass',
      'The current timestamp in milliseconds',
    ],
    correctIndices: [1],
    points: 5,
    difficulty: 'Easy',
    explanation:
      'Using a stable domain ID (course.id) allows React to preserve component identity and DOM state accurately across sorts and filters.',
  },
  {
    id: 'qb-6',
    number: 6,
    type: 'single',
    sectionId: 'sec-2',
    sectionName: 'Section 2: State, Effects & Custom Hooks',
    question:
      'When is useReducer generally preferred over useState in a complex interactive component?',
    options: [
      'Whenever the state is a single boolean toggle for a modal',
      'When next state depends on multi-field transitions or named domain actions',
      'When you want to skip React reconciliation completely',
      'Only inside static Server Components with no client interactivity',
    ],
    correctIndices: [1],
    points: 5,
    difficulty: 'Medium',
    explanation:
      'useReducer centralizes state transition rules when multiple related sub-values update together in response to explicit actions.',
  },
  {
    id: 'qb-7',
    number: 7,
    type: 'multiple',
    sectionId: 'sec-2',
    sectionName: 'Section 2: State, Effects & Custom Hooks',
    question:
      'Review the custom video player hook lifecycle diagram below. Which actions must occur inside a useEffect cleanup function when subscribing to a media timer or window listener? (Select all that apply)',
    options: [
      'Clear any active interval or timeout IDs (clearInterval / clearTimeout)',
      'Remove attached DOM event listeners using the exact same handler reference',
      'Mutate the component props object directly to reset the timer',
      'Abort or ignore stale in-flight async callbacks if the lessonId changes',
    ],
    correctIndices: [0, 1, 3],
    points: 5,
    difficulty: 'Hard',
    imageUrl:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=900',
    imageCaption:
      'Figure 2.4 — Effect setup and cleanup cycle when switching between lessonIds.',
    explanation:
      'Effect cleanup functions prevent memory leaks and duplicate listeners by clearing timers, detaching event handlers, and ignoring stale async responses. Props are read-only and must never be mutated.',
  },
  {
    id: 'qb-8',
    number: 8,
    type: 'boolean',
    sectionId: 'sec-2',
    sectionName: 'Section 2: State, Effects & Custom Hooks',
    question:
      'True or False: In React 19, multiple state updates triggered inside an asynchronous event handler or Promise resolution are automatically batched into a single re-render.',
    options: ['True', 'False'],
    correctIndices: [0],
    points: 5,
    difficulty: 'Easy',
    explanation:
      'Automatic batching groups state updates across native event handlers, Promises, and timeouts so the component only re-renders once.',
  },
  {
    id: 'qb-9',
    number: 9,
    type: 'single',
    sectionId: 'sec-2',
    sectionName: 'Section 2: State, Effects & Custom Hooks',
    question:
      'How can you avoid synchronization bugs when displaying "overallPercent" derived from a list of completed lessons?',
    options: [
      'Compute overallPercent directly during render (or via useMemo) from the single source of truth',
      'Copy overallPercent into three separate useState variables and sync them with chained useEffects',
      'Store overallPercent in a global window variable outside React',
      'Force a full browser page reload after every lesson click',
    ],
    correctIndices: [0],
    points: 5,
    difficulty: 'Medium',
    explanation:
      'Deriving computed metrics directly from the primary state during render guarantees they can never drift out of sync.',
  },
  {
    id: 'qb-10',
    number: 10,
    type: 'single',
    sectionId: 'sec-2',
    sectionName: 'Section 2: State, Effects & Custom Hooks',
    question:
      'According to EduHub learning rules, at what watch percentage does a video lesson automatically mark itself as Completed?',
    options: ['50% watched', '75% watched', '90% watched', '100% watched only'],
    correctIndices: [2],
    points: 5,
    difficulty: 'Easy',
    explanation:
      'EduHub automatically marks a video lesson as completed as soon as the student watches 90% or more of the lesson.',
  },
  {
    id: 'qb-11',
    number: 11,
    type: 'single',
    sectionId: 'sec-3',
    sectionName: 'Section 3: Data Routing, Performance & A11y',
    question:
      'Which React Router hook reads and updates the URL query string (such as ?q=react&level=Intermediate) without reloading the page?',
    options: ['useParams()', 'useSearchParams()', 'useLocationHash()', 'useHistoryStack()'],
    correctIndices: [1],
    points: 5,
    difficulty: 'Easy',
    explanation:
      'useSearchParams() returns the current URLSearchParams instance and a setter function to synchronize UI filters with the URL query string.',
  },
  {
    id: 'qb-12',
    number: 12,
    type: 'multiple',
    sectionId: 'sec-3',
    sectionName: 'Section 3: Data Routing, Performance & A11y',
    question:
      'Which of the following practices improve keyboard accessibility inside a custom modal dialog? (Select all that apply)',
    options: [
      'Setting role="dialog" and aria-modal="true" on the modal container',
      'Allowing the user to close the modal with the Escape key or an accessible Close button',
      'Removing all focus outlines (outline: none) without providing any visible focus indicator',
      'Restoring focus to the trigger button when the modal closes',
    ],
    correctIndices: [0, 1, 3],
    points: 5,
    difficulty: 'Medium',
    explanation:
      'Accessible dialogs declare aria-modal="true", support Escape/close controls, trap and restore focus, and always preserve visible focus rings.',
  },
  {
    id: 'qb-13',
    number: 13,
    type: 'boolean',
    sectionId: 'sec-3',
    sectionName: 'Section 3: Data Routing, Performance & A11y',
    question:
      'True or False: Wrapping every trivial primitive calculation in useMemo() always makes a React application faster.',
    options: ['True', 'False'],
    correctIndices: [1],
    points: 5,
    difficulty: 'Medium',
    explanation:
      'False. useMemo has allocation and dependency-comparison overhead; it is most beneficial for expensive computations (such as filtering/sorting large collections) or preserving referential identity.',
  },
  {
    id: 'qb-14',
    number: 14,
    type: 'single',
    sectionId: 'sec-3',
    sectionName: 'Section 3: Data Routing, Performance & A11y',
    question:
      'When an unauthenticated guest attempts to visit a role-protected route, what is the best UX pattern in EduHub?',
    options: [
      'Render a blank white screen with a console error',
      'Display a clear 403 / access guard screen with a one-click role switcher or sign-in link',
      'Crash the browser tab immediately',
      'Silently delete the URL bar',
    ],
    correctIndices: [1],
    points: 5,
    difficulty: 'Easy',
    explanation:
      'A friendly RoleGuard / 403 screen explains which role is required and provides immediate recovery actions.',
  },
  {
    id: 'qb-15',
    number: 15,
    type: 'single',
    sectionId: 'sec-3',
    sectionName: 'Section 3: Data Routing, Performance & A11y',
    question:
      'How does setting explicit width/height or aspect-video classes on video and thumbnail containers improve Core Web Vitals?',
    options: [
      'It prevents Cumulative Layout Shift (CLS) while media assets load',
      'It compresses 4K video files on the server automatically',
      'It disables browser caching for images',
      'It converts PNG images into SVG vectors',
    ],
    correctIndices: [0],
    points: 5,
    difficulty: 'Easy',
    explanation:
      'Reserving the exact aspect ratio box before the image or video loads prevents surrounding content from jumping (CLS).',
  },
  {
    id: 'qb-16',
    number: 16,
    type: 'single',
    sectionId: 'sec-4',
    sectionName: 'Section 4: Testing & Certification Prep',
    question:
      'When writing component tests with Testing Library and Vitest, which query priority best reflects how real users and assistive technologies interact with the page?',
    options: [
      'getByRole() with an accessible name',
      'container.querySelector(".css-hash-123")',
      'Selecting by internal React fiber node index',
      'Selecting by inline style hex code',
    ],
    correctIndices: [0],
    points: 5,
    difficulty: 'Medium',
    explanation:
      'Querying by accessible role and label (getByRole) verifies both functional behavior and semantic accessibility simultaneously.',
  },
  {
    id: 'qb-17',
    number: 17,
    type: 'multiple',
    sectionId: 'sec-4',
    sectionName: 'Section 4: Testing & Certification Prep',
    question:
      'What two requirements must a student satisfy on EduHub before the "Get certificate" button unlocks and issues a verified certificate? (Select all that apply)',
    options: [
      'Complete 100% of the course lessons (each watched to at least 90%)',
      'Pass the final certification exam with a score of 60% or higher',
      'Post at least 50 comments on every single video lesson',
      'Wait 90 business days for manual postal mail delivery',
    ],
    correctIndices: [0, 1],
    points: 5,
    difficulty: 'Easy',
    explanation:
      'EduHub certificates unlock automatically as soon as 100% of lessons are completed and the student scores 60%+ on the final exam.',
  },
  {
    id: 'qb-18',
    number: 18,
    type: 'boolean',
    sectionId: 'sec-4',
    sectionName: 'Section 4: Testing & Certification Prep',
    question:
      'True or False: Every issued EduHub certificate includes a unique certificate ID (e.g. EDU-2026-000123) and a public verification URL that anyone can check.',
    options: ['True', 'False'],
    correctIndices: [0],
    points: 5,
    difficulty: 'Easy',
    explanation:
      'Every certificate carries a unique credential ID and QR/verify URL (/verify/:id) for instant employer verification.',
  },
  {
    id: 'qb-19',
    number: 19,
    type: 'single',
    sectionId: 'sec-4',
    sectionName: 'Section 4: Testing & Certification Prep',
    question:
      'If the 30-minute exam countdown timer reaches 00:00 while a student is on Question 18, what happens?',
    options: [
      'All progress is erased and the account is locked',
      'The time-up modal appears and all autosaved answers are automatically submitted for grading',
      'The timer starts counting upward indefinitely',
      'The browser window closes without saving',
    ],
    correctIndices: [1],
    points: 5,
    difficulty: 'Easy',
    explanation:
      'EduHub autosaves answers continuously and automatically submits the attempt when the timer expires.',
  },
  {
    id: 'qb-20',
    number: 20,
    type: 'single',
    sectionId: 'sec-4',
    sectionName: 'Section 4: Testing & Certification Prep',
    question:
      'Which HTTP status code or route pattern is used when a certificate verification lookup does not match any valid credential ID?',
    options: [
      'An explicit invalid state showing "Certificate not found" in red with recovery guidance',
      'A silent redirect to the login page',
      'A fake green checkmark for every random string',
      'An unhandled runtime exception',
    ],
    correctIndices: [0],
    points: 5,
    difficulty: 'Easy',
    explanation:
      'The public verification page (/verify/:id) clearly distinguishes valid credentials from invalid IDs with a red "Certificate not found" state.',
  },
];

/**
 * Pre-populated answers for the default exam demo so if a user jumps straight to Question 7 or submits right away,
 * 17 of 20 questions are answered correctly (85% / 86%), 2 are wrong (for rich Review Answers comparison!), and 1 is skipped.
 */
export const DEFAULT_DEMO_ANSWERS: Record<string, number[]> = {
  'qb-1': [0], // Correct
  'qb-2': [0, 1, 3], // Correct
  'qb-3': [0], // Correct
  'qb-4': [2], // Correct
  'qb-5': [1], // Correct
  'qb-6': [1], // Correct
  'qb-7': [0, 1, 3], // Correct (Question 7 of 20)
  'qb-8': [0], // Correct
  'qb-9': [1], // Wrong (chose option 1 instead of 0, great for color-coded review!)
  'qb-10': [2], // Correct
  'qb-11': [1], // Correct
  'qb-12': [0, 1, 3], // Correct
  'qb-13': [0], // Wrong (chose True instead of False, great for color-coded review!)
  'qb-14': [1], // Correct
  'qb-15': [0], // Correct
  'qb-16': [0], // Correct
  'qb-17': [0, 1], // Correct
  'qb-18': [0], // Correct
  'qb-19': [1], // Correct
  // 'qb-20' left unanswered (1 skipped) so user sees Answered, Wrong, and Skipped in results!
};

export const INITIAL_EXAM_ATTEMPTS: ExamAttemptRecord[] = [
  {
    id: 'att-1',
    attemptNumber: 1,
    courseId: 'course-1',
    date: 'March 10, 2026 • 14:20',
    scorePercent: 55,
    correctCount: 11,
    wrongCount: 7,
    skippedCount: 2,
    timeTaken: '28m 45s',
    passed: false,
  },
  {
    id: 'att-2',
    attemptNumber: 2,
    courseId: 'course-1',
    date: 'March 24, 2026 • 16:05',
    scorePercent: 86,
    correctCount: 17,
    wrongCount: 2,
    skippedCount: 1,
    timeTaken: '21m 14s',
    passed: true,
  },
];
