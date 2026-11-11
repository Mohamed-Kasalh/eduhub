import { Course } from './mockData';

export interface EnrollmentChartPoint {
  dayLabel: string;
  dateFull: string;
  enrollments: number;
  completions: number;
}

export interface InstructorCourseRecord extends Course {
  completionRate: number;
  rejectionReason?: string;
  submittedAt?: string;
}

export interface InstructorQuestionItem {
  id: string;
  courseId: string;
  courseTitle: string;
  sectionId: string;
  sectionName: string;
  type: 'single' | 'multiple' | 'boolean';
  question: string;
  options: string[];
  correctIndices: number[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  timesUsed: number;
  explanation: string;
  imageUrl?: string;
}

export interface EnrolledStudentRecord {
  id: string;
  name: string;
  email: string;
  avatar: string;
  courseId: string;
  courseTitle: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  lastActive: string;
  examScore: number | null;
  examPassed: boolean;
  certificateIssued: boolean;
  certificateId?: string;
  lessonBreakdown: Array<{
    id: string;
    title: string;
    duration: string;
    watchedPercent: number;
    status: 'Completed' | 'In progress' | 'Not started';
  }>;
  examAttempts: Array<{
    attemptNumber: number;
    date: string;
    scorePercent: number;
    timeTaken: string;
    passed: boolean;
  }>;
}

export interface InstructorCommentThread {
  id: string;
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  studentName: string;
  studentAvatar: string;
  createdAt: string;
  content: string;
  likesCount: number;
  likedByInstructor: boolean;
  resolved: boolean;
  replies: Array<{
    id: string;
    authorName: string;
    authorAvatar: string;
    createdAt: string;
    content: string;
  }>;
}

export const ENROLLMENTS_30_DAYS: EnrollmentChartPoint[] = [
  { dayLabel: 'Day 1', dateFull: 'Feb 25', enrollments: 32, completions: 18 },
  { dayLabel: 'Day 3', dateFull: 'Feb 27', enrollments: 41, completions: 22 },
  { dayLabel: 'Day 5', dateFull: 'Mar 01', enrollments: 38, completions: 25 },
  { dayLabel: 'Day 7', dateFull: 'Mar 03', enrollments: 52, completions: 31 },
  { dayLabel: 'Day 9', dateFull: 'Mar 05', enrollments: 48, completions: 29 },
  { dayLabel: 'Day 11', dateFull: 'Mar 07', enrollments: 64, completions: 40 },
  { dayLabel: 'Day 13', dateFull: 'Mar 09', enrollments: 59, completions: 38 },
  { dayLabel: 'Day 15', dateFull: 'Mar 11', enrollments: 76, completions: 49 },
  { dayLabel: 'Day 17', dateFull: 'Mar 13', enrollments: 71, completions: 45 },
  { dayLabel: 'Day 19', dateFull: 'Mar 15', enrollments: 88, completions: 58 },
  { dayLabel: 'Day 21', dateFull: 'Mar 17', enrollments: 82, completions: 54 },
  { dayLabel: 'Day 23', dateFull: 'Mar 19', enrollments: 95, completions: 67 },
  { dayLabel: 'Day 25', dateFull: 'Mar 21', enrollments: 108, completions: 74 },
  { dayLabel: 'Day 27', dateFull: 'Mar 23', enrollments: 114, completions: 82 },
  { dayLabel: 'Day 30', dateFull: 'Mar 26', enrollments: 128, completions: 94 },
];

export const INITIAL_INSTRUCTOR_COURSES: InstructorCourseRecord[] = [
  {
    id: 'course-1',
    title: 'Complete React Developer Course',
    subtitle:
      'Master React 19, Hooks, Router, state management, performance optimization, and real-world testing from scratch.',
    instructorId: 'user-instructor-1',
    instructorName: 'Ahmed Hassan',
    instructorAvatar:
      'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-web',
    categoryName: 'Development',
    thumbnail:
      'https://images.unsplash.com/photo-1619410283995-43d9134e7656?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.9,
    reviewCount: 1420,
    studentsCount: 18450,
    price: 49.99,
    originalPrice: 89.99,
    level: 'Intermediate',
    duration: '28h 40m',
    lessonsCount: 42,
    featured: true,
    status: 'Published',
    updatedAt: 'March 20, 2026',
    completionRate: 82,
    tags: ['React 19', 'TypeScript', 'Frontend'],
  },
  {
    id: 'course-5',
    title: 'Full-Stack TypeScript & Node.js Bootcamp',
    subtitle:
      'Build production-grade REST and GraphQL APIs with Node.js, PostgreSQL, Prisma, Redis, and automated CI/CD.',
    instructorId: 'user-instructor-1',
    instructorName: 'Ahmed Hassan',
    instructorAvatar:
      'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-web',
    categoryName: 'Development',
    thumbnail:
      'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.8,
    reviewCount: 620,
    studentsCount: 8300,
    price: 52.99,
    originalPrice: 89.99,
    level: 'Advanced',
    duration: '31h 00m',
    lessonsCount: 48,
    featured: true,
    status: 'Published',
    updatedAt: 'March 15, 2026',
    completionRate: 76,
    tags: ['TypeScript', 'Node.js', 'PostgreSQL'],
  },
  {
    id: 'course-9',
    title: 'Web Accessibility & Inclusive Interface Engineering',
    subtitle:
      'Build WCAG 2.2 AA compliant web applications with semantic HTML, ARIA patterns, keyboard flows, and screen readers.',
    instructorId: 'user-instructor-1',
    instructorName: 'Ahmed Hassan',
    instructorAvatar:
      'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-web',
    categoryName: 'Development',
    thumbnail:
      'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.9,
    reviewCount: 290,
    studentsCount: 4100,
    price: 0,
    originalPrice: 59.99,
    level: 'Beginner',
    duration: '11h 45m',
    lessonsCount: 18,
    isFree: true,
    status: 'Published',
    updatedAt: 'February 28, 2026',
    completionRate: 89,
    tags: ['Accessibility', 'ARIA', 'WCAG 2.2'],
  },
  {
    id: 'course-10',
    title: 'SQL & PostgreSQL Performance Engineering',
    subtitle:
      'Write analytical queries, understand B-Tree and GIN indexing, query plans, partitioning, and high-concurrency tuning.',
    instructorId: 'user-instructor-1',
    instructorName: 'Ahmed Hassan',
    instructorAvatar:
      'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-data',
    categoryName: 'Data Science',
    thumbnail:
      'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.8,
    reviewCount: 475,
    studentsCount: 6540,
    price: 44.99,
    originalPrice: 74.99,
    level: 'Intermediate',
    duration: '16h 30m',
    lessonsCount: 26,
    status: 'Published',
    updatedAt: 'March 04, 2026',
    completionRate: 74,
    tags: ['SQL', 'PostgreSQL', 'Databases'],
  },
  {
    id: 'course-inst-pending',
    title: 'GraphQL Federation & Microservices Architecture',
    subtitle:
      'Design distributed subgraphs, Apollo Router gateways, schema contracts, and zero-downtime federation deployments.',
    instructorId: 'user-instructor-1',
    instructorName: 'Ahmed Hassan',
    instructorAvatar:
      'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-web',
    categoryName: 'Development',
    thumbnail:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 0,
    reviewCount: 0,
    studentsCount: 0,
    price: 59.99,
    originalPrice: 99.99,
    level: 'Advanced',
    duration: '19h 20m',
    lessonsCount: 28,
    status: 'Pending review',
    updatedAt: 'Yesterday',
    submittedAt: 'March 24, 2026',
    completionRate: 0,
    tags: ['GraphQL', 'Microservices', 'Node.js'],
  },
  {
    id: 'course-inst-draft',
    title: 'Next-Gen Web Performance & Core Web Vitals Lab',
    subtitle:
      'Hands-on profiling for INP, LCP, CLS, speculative prefetching, Web Workers, and edge caching strategies.',
    instructorId: 'user-instructor-1',
    instructorName: 'Ahmed Hassan',
    instructorAvatar:
      'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-web',
    categoryName: 'Development',
    thumbnail:
      'https://images.unsplash.com/photo-1484417894907-623942c8ee29?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 0,
    reviewCount: 0,
    studentsCount: 0,
    price: 39.99,
    level: 'Intermediate',
    duration: '08h 15m',
    lessonsCount: 12,
    status: 'Draft',
    updatedAt: '3 hours ago',
    completionRate: 0,
    tags: ['Web Vitals', 'Performance', 'DevTools'],
  },
  {
    id: 'course-inst-rejected',
    title: 'Legacy Redux & Class Components Workshop',
    subtitle:
      'Maintaining older enterprise React codebases and migrating lifecycle methods to modern functional hooks.',
    instructorId: 'user-instructor-1',
    instructorName: 'Ahmed Hassan',
    instructorAvatar:
      'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-web',
    categoryName: 'Development',
    thumbnail:
      'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 0,
    reviewCount: 0,
    studentsCount: 0,
    price: 29.99,
    level: 'Intermediate',
    duration: '10h 40m',
    lessonsCount: 16,
    status: 'Rejected',
    updatedAt: '2 days ago',
    completionRate: 0,
    rejectionReason:
      'Supervisor Hana Mostafa: Module 3 Lesson 4 lacks English captions, and the final exam Question Bank currently has only 9 questions (minimum 20 required). Please add 11 more questions and upload captions before re-submitting.',
    tags: ['Redux', 'Migration', 'React'],
  },
];

export const INITIAL_INSTRUCTOR_QUESTIONS: InstructorQuestionItem[] = [
  {
    id: 'iq-1',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    sectionId: 'sec-1',
    sectionName: 'Section 1: Modern Foundations',
    type: 'single',
    question:
      'Why should state updates in React always treat objects and arrays as immutable references?',
    options: [
      'Because React uses reference equality (Object.is) to detect state changes and schedule re-renders',
      'Because JavaScript freezes all variables inside functional components',
      'Because mutating arrays throws a syntax error in TypeScript 5.7',
      'Because React stores state in browser sessionStorage by default',
    ],
    correctIndices: [0],
    difficulty: 'Easy',
    points: 5,
    timesUsed: 1420,
    explanation:
      'React compares previous and next state pointers using Object.is. Mutating in place keeps the same reference and skips re-rendering.',
  },
  {
    id: 'iq-2',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    sectionId: 'sec-1',
    sectionName: 'Section 1: Modern Foundations',
    type: 'multiple',
    question:
      'Which of the following are valid advantages of compound component composition? (Select all that apply)',
    options: [
      'Flexible child ordering without prop bloat',
      'Clean implicit state sharing via parent React Context',
      'Eliminates the need for keys on mapped arrays',
      'Direct HTML/ARIA attribute forwarding on sub-components',
    ],
    correctIndices: [0, 1, 3],
    difficulty: 'Medium',
    points: 5,
    timesUsed: 1185,
    explanation:
      'Compound components allow flexible composition, context state sharing, and native prop forwarding.',
  },
  {
    id: 'iq-3',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    sectionId: 'sec-1',
    sectionName: 'Section 1: Modern Foundations',
    type: 'boolean',
    question:
      'True or False: Unlayered CSS rules override Tailwind CSS @layer utilities regardless of selector specificity.',
    options: ['True', 'False'],
    correctIndices: [0],
    difficulty: 'Easy',
    points: 5,
    timesUsed: 1310,
    explanation:
      'In CSS Cascade Layers, unlayered styles always take precedence over styles declared inside any @layer.',
  },
  {
    id: 'iq-4',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    sectionId: 'sec-2',
    sectionName: 'Section 2: State, Effects & Custom Hooks',
    type: 'single',
    question:
      'When is useReducer preferred over useState in a complex interactive component?',
    options: [
      'Whenever the state is a single boolean flag',
      'When next state depends on multi-field transitions or named domain actions',
      'When you want to bypass React reconciliation completely',
      'Only inside static Server Components',
    ],
    correctIndices: [1],
    difficulty: 'Medium',
    points: 5,
    timesUsed: 1290,
    explanation:
      'useReducer centralizes complex state transitions across multiple related fields.',
  },
  {
    id: 'iq-5',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    sectionId: 'sec-2',
    sectionName: 'Section 2: State, Effects & Custom Hooks',
    type: 'multiple',
    question:
      'Which actions belong inside a useEffect cleanup function when subscribing to a media timer or DOM listener?',
    options: [
      'Clear active interval or timeout IDs (clearInterval / clearTimeout)',
      'Remove attached DOM event listeners with removeEventListener',
      'Mutate the component props object directly',
      'Ignore or abort stale in-flight async callbacks',
    ],
    correctIndices: [0, 1, 3],
    difficulty: 'Hard',
    points: 10,
    timesUsed: 940,
    explanation:
      'Cleanup functions prevent memory leaks by clearing timers, removing listeners, and cancelling stale async tasks.',
  },
  {
    id: 'iq-6',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    sectionId: 'sec-2',
    sectionName: 'Section 2: State, Effects & Custom Hooks',
    type: 'single',
    question:
      'According to EduHub learning rules, at what watch percentage does a video lesson automatically mark itself as Completed?',
    options: ['50% watched', '75% watched', '90% watched', '100% watched only'],
    correctIndices: [2],
    difficulty: 'Easy',
    points: 5,
    timesUsed: 1510,
    explanation:
      'EduHub automatically marks a video lesson as completed once 90% of its duration is watched.',
  },
  {
    id: 'iq-7',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    sectionId: 'sec-3',
    sectionName: 'Section 3: Data Routing, Performance & A11y',
    type: 'single',
    question:
      'Which React Router hook reads and updates URL query parameters (such as ?q=react&sort=popular)?',
    options: ['useParams()', 'useSearchParams()', 'useHashRouter()', 'useHistory()'],
    correctIndices: [1],
    difficulty: 'Easy',
    points: 5,
    timesUsed: 1380,
    explanation:
      'useSearchParams() provides read/write access to the URL query string.',
  },
  {
    id: 'iq-8',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    sectionId: 'sec-3',
    sectionName: 'Section 3: Data Routing, Performance & A11y',
    type: 'multiple',
    question:
      'Which attributes and behaviors are required for an accessible modal dialog? (Select all that apply)',
    options: [
      'role="dialog" and aria-modal="true"',
      'Keyboard Escape key and Close button support',
      'Removing all focus outlines without replacement',
      'Restoring focus to the trigger element on close',
    ],
    correctIndices: [0, 1, 3],
    difficulty: 'Medium',
    points: 5,
    timesUsed: 1095,
    explanation:
      'Accessible dialogs declare aria-modal="true", support Escape, and manage focus cleanly.',
  },
  {
    id: 'iq-9',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    sectionId: 'sec-4',
    sectionName: 'Section 4: Testing & Certification Prep',
    type: 'single',
    question:
      'Which Testing Library query priority best verifies both user-visible behavior and accessibility semantics?',
    options: [
      'getByRole() with an accessible name',
      'container.querySelector(".btn-primary")',
      'Selecting by internal component state',
      'Selecting by inline style hex value',
    ],
    correctIndices: [0],
    difficulty: 'Medium',
    points: 5,
    timesUsed: 1120,
    explanation:
      'getByRole() queries elements the same way screen readers and users perceive the interface.',
  },
  {
    id: 'iq-10',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    sectionId: 'sec-4',
    sectionName: 'Section 4: Testing & Certification Prep',
    type: 'Hard' as any, // will be 'Hard' difficulty below
    question:
      'How do you prevent race conditions when fetching search results inside a custom hook as the query string changes rapidly?',
    options: [
      'Use an AbortController or a boolean ignore flag inside the useEffect cleanup function',
      'Disable the keyboard while requests are pending',
      'Call window.location.reload() on every keystroke',
      'Store responses in a static HTML comment',
    ],
    correctIndices: [0],
    difficulty: 'Hard',
    points: 10,
    timesUsed: 865,
    explanation:
      'Aborting the previous request or setting an ignore flag in cleanup ensures out-of-order responses never overwrite newer state.',
  },
  // Questions for course-5 (Full-Stack TypeScript & Node.js Bootcamp)
  {
    id: 'iq-11',
    courseId: 'course-5',
    courseTitle: 'Full-Stack TypeScript & Node.js Bootcamp',
    sectionId: 'sec-1',
    sectionName: 'Section 1: Modern Foundations',
    type: 'single',
    question:
      'Which PostgreSQL index type is best suited for indexing JSONB columns and full-text search vectors?',
    options: ['B-Tree index', 'GIN (Generalized Inverted Index)', 'Hash index', 'Sequence scan'],
    correctIndices: [1],
    difficulty: 'Medium',
    points: 5,
    timesUsed: 610,
    explanation:
      'GIN indexes efficiently index composite values such as JSONB keys and full-text lexemes.',
  },
  {
    id: 'iq-12',
    courseId: 'course-5',
    courseTitle: 'Full-Stack TypeScript & Node.js Bootcamp',
    sectionId: 'sec-2',
    sectionName: 'Section 2: State, Effects & Custom Hooks',
    type: 'boolean',
    question:
      'True or False: In TypeScript, the "unknown" type requires type narrowing before you can access properties or call methods on the value.',
    options: ['True', 'False'],
    correctIndices: [0],
    difficulty: 'Easy',
    points: 5,
    timesUsed: 740,
    explanation:
      'Unlike "any", "unknown" is type-safe and requires runtime narrowing or type guards before use.',
  },
];
// Fix iq-10 type to 'single'
INITIAL_INSTRUCTOR_QUESTIONS[9].type = 'single';

export const ENROLLED_STUDENTS_DATA: EnrolledStudentRecord[] = [
  {
    id: 'stu-1',
    name: 'Sara Ali',
    email: 'sara.ali@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    progressPercent: 100,
    completedLessons: 12,
    totalLessons: 12,
    lastActive: '25 minutes ago',
    examScore: 86,
    examPassed: true,
    certificateIssued: true,
    certificateId: 'EDU-2026-000123',
    lessonBreakdown: [
      { id: 'l-1', title: '1. Welcome & Architecture Walkthrough', duration: '08:24', watchedPercent: 100, status: 'Completed' },
      { id: 'l-2', title: '2. Declarative UI, JSX & Component Composition', duration: '18:45', watchedPercent: 96, status: 'Completed' },
      { id: 'l-3', title: '3. Design Tokens, Spatial Rhythm & Breakpoints', duration: '14:20', watchedPercent: 100, status: 'Completed' },
      { id: 'l-4', title: '4. Deep Dive into useState, useReducer & Immutable State', duration: '24:10', watchedPercent: 94, status: 'Completed' },
      { id: 'l-5', title: '5. Synchronizing with External Systems & Custom Hooks', duration: '29:05', watchedPercent: 92, status: 'Completed' },
      { id: 'l-6', title: '6. Optimistic UI Updates & Async Error Recovery', duration: '21:30', watchedPercent: 100, status: 'Completed' },
    ],
    examAttempts: [
      { attemptNumber: 1, date: 'Mar 10, 2026', scorePercent: 55, timeTaken: '28m 45s', passed: false },
      { attemptNumber: 2, date: 'Mar 24, 2026', scorePercent: 86, timeTaken: '21m 14s', passed: true },
    ],
  },
  {
    id: 'stu-2',
    name: 'Karim Tarek',
    email: 'karim.tarek@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1574281570912-bf4355571765?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    progressPercent: 75,
    completedLessons: 9,
    totalLessons: 12,
    lastActive: '3 hours ago',
    examScore: null,
    examPassed: false,
    certificateIssued: false,
    lessonBreakdown: [
      { id: 'l-1', title: '1. Welcome & Architecture Walkthrough', duration: '08:24', watchedPercent: 100, status: 'Completed' },
      { id: 'l-2', title: '2. Declarative UI, JSX & Component Composition', duration: '18:45', watchedPercent: 100, status: 'Completed' },
      { id: 'l-3', title: '3. Design Tokens, Spatial Rhythm & Breakpoints', duration: '14:20', watchedPercent: 92, status: 'Completed' },
      { id: 'l-4', title: '4. Deep Dive into useState, useReducer & Immutable State', duration: '24:10', watchedPercent: 68, status: 'In progress' },
      { id: 'l-5', title: '5. Synchronizing with External Systems & Custom Hooks', duration: '29:05', watchedPercent: 0, status: 'Not started' },
    ],
    examAttempts: [],
  },
  {
    id: 'stu-3',
    name: 'Nadia Mansour',
    email: 'nadia.mansour@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1730469344658-f442e279df9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    courseId: 'course-9',
    courseTitle: 'Web Accessibility & Inclusive Interface Engineering',
    progressPercent: 100,
    completedLessons: 12,
    totalLessons: 12,
    lastActive: '1 day ago',
    examScore: 94,
    examPassed: true,
    certificateIssued: true,
    certificateId: 'EDU-2026-000124',
    lessonBreakdown: [
      { id: 'l-1', title: '1. WCAG 2.2 AA Contrast & Semantic Landmarks', duration: '15:10', watchedPercent: 100, status: 'Completed' },
      { id: 'l-2', title: '2. Roving Tabindex & Keyboard Focus Traps', duration: '22:40', watchedPercent: 98, status: 'Completed' },
      { id: 'l-3', title: '3. Screen Reader Auditing with VoiceOver & NVDA', duration: '19:15', watchedPercent: 100, status: 'Completed' },
    ],
    examAttempts: [
      { attemptNumber: 1, date: 'Mar 18, 2026', scorePercent: 94, timeTaken: '19m 05s', passed: true },
    ],
  },
  {
    id: 'stu-4',
    name: 'Tarek El-Sayed',
    email: 'tarek.elsayed@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1633625510483-c177f4308f33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    courseId: 'course-5',
    courseTitle: 'Full-Stack TypeScript & Node.js Bootcamp',
    progressPercent: 100,
    completedLessons: 12,
    totalLessons: 12,
    lastActive: '5 hours ago',
    examScore: 52,
    examPassed: false,
    certificateIssued: false,
    lessonBreakdown: [
      { id: 'l-1', title: '1. Node.js Event Loop & TypeScript Strict Mode', duration: '18:00', watchedPercent: 100, status: 'Completed' },
      { id: 'l-2', title: '2. PostgreSQL Indexing & Prisma Transactions', duration: '27:30', watchedPercent: 95, status: 'Completed' },
      { id: 'l-3', title: '3. Redis Caching & Rate Limiting Middleware', duration: '21:15', watchedPercent: 91, status: 'Completed' },
    ],
    examAttempts: [
      { attemptNumber: 1, date: 'Mar 22, 2026', scorePercent: 52, timeTaken: '29m 40s', passed: false },
    ],
  },
  {
    id: 'stu-5',
    name: 'Mariam Adel',
    email: 'mariam.adel@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1697063882499-f7fca7d2d713?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    courseId: 'course-10',
    courseTitle: 'SQL & PostgreSQL Performance Engineering',
    progressPercent: 42,
    completedLessons: 5,
    totalLessons: 12,
    lastActive: '2 days ago',
    examScore: null,
    examPassed: false,
    certificateIssued: false,
    lessonBreakdown: [
      { id: 'l-1', title: '1. Window Functions & CTEs Deep Dive', duration: '20:10', watchedPercent: 100, status: 'Completed' },
      { id: 'l-2', title: '2. Reading EXPLAIN ANALYZE Execution Plans', duration: '25:45', watchedPercent: 60, status: 'In progress' },
      { id: 'l-3', title: '3. B-Tree vs. GIN & GiST Indexes', duration: '22:00', watchedPercent: 0, status: 'Not started' },
    ],
    examAttempts: [],
  },
];

export const INITIAL_INSTRUCTOR_COMMENTS: InstructorCommentThread[] = [
  {
    id: 'icm-1',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    lessonId: 'lesson-103',
    lessonTitle: 'Lesson 4: Deep Dive into useState, useReducer & Immutable State',
    studentName: 'Sara Ali',
    studentAvatar:
      'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    createdAt: '28 minutes ago',
    content:
      'When refactoring our checkout form to useReducer, should we keep field-level input validation inside the reducer or run it before dispatching the SUBMIT_ORDER action?',
    likesCount: 6,
    likedByInstructor: false,
    resolved: false,
    replies: [],
  },
  {
    id: 'icm-2',
    courseId: 'course-5',
    courseTitle: 'Full-Stack TypeScript & Node.js Bootcamp',
    lessonId: 'lesson-104',
    lessonTitle: 'Lesson 5: PostgreSQL Connection Pooling & Prisma Transactions',
    studentName: 'Karim Tarek',
    studentAvatar:
      'https://images.unsplash.com/photo-1574281570912-bf4355571765?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    createdAt: '2 hours ago',
    content:
      'In interactive Prisma transactions ($transaction(async (tx) => ...)), what is the recommended timeout when calling an external payment webhook?',
    likesCount: 4,
    likedByInstructor: true,
    resolved: false,
    replies: [],
  },
  {
    id: 'icm-3',
    courseId: 'course-9',
    courseTitle: 'Web Accessibility & Inclusive Interface Engineering',
    lessonId: 'lesson-102',
    lessonTitle: 'Lesson 2: Declarative UI, JSX & Component Composition',
    studentName: 'Nadia Mansour',
    studentAvatar:
      'https://images.unsplash.com/photo-1730469344658-f442e279df9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    createdAt: 'Yesterday',
    content:
      'Thank you for the ARIA live region demo! Adding aria-live="polite" on the toast container made VoiceOver announce every progress milestone smoothly.',
    likesCount: 11,
    likedByInstructor: true,
    resolved: true,
    replies: [
      {
        id: 'ir-1',
        authorName: 'Ahmed Hassan (Instructor)',
        authorAvatar:
          'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
        createdAt: '20 hours ago',
        content:
          'So glad that helped, Nadia! Polite live regions are ideal for non-blocking toasts so screen readers finish speaking the current label first.',
      },
    ],
  },
];
