export interface StudentLessonItem {
  id: string;
  sectionId: string;
  sectionTitle: string;
  number: number;
  title: string;
  duration: string;
  durationSeconds: number;
  summary: string;
  keyTakeaways: string[];
  requiresPrevious?: boolean;
}

export interface StudentCourseSection {
  id: string;
  title: string;
  subtitle: string;
  lessons: StudentLessonItem[];
}

export interface LessonResourceFile {
  id: string;
  title: string;
  type: 'PDF' | 'ZIP' | 'CSV' | 'FIG';
  size: string;
  description: string;
}

export interface ThreadedLessonReply {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  isInstructor?: boolean;
  isSupervisorVerified?: boolean;
  createdAt: string;
  content: string;
  likesCount: number;
  likedByMe?: boolean;
}

export interface ThreadedLessonComment {
  id: string;
  courseId: string;
  lessonId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  isInstructor?: boolean;
  isSupervisorVerified?: boolean;
  status: 'approved' | 'pending';
  createdAt: string;
  timestampSeconds: number;
  content: string;
  likesCount: number;
  likedByMe?: boolean;
  replies: ThreadedLessonReply[];
}

export interface WeeklyActivityDay {
  day: string;
  fullDay: string;
  hours: number;
  lessonsCompleted: number;
  dateLabel: string;
}

export const WEEKLY_LEARNING_ACTIVITY: WeeklyActivityDay[] = [
  { day: 'Mon', fullDay: 'Monday', hours: 1.8, lessonsCompleted: 2, dateLabel: 'Mar 17' },
  { day: 'Tue', fullDay: 'Tuesday', hours: 2.4, lessonsCompleted: 3, dateLabel: 'Mar 18' },
  { day: 'Wed', fullDay: 'Wednesday', hours: 1.2, lessonsCompleted: 1, dateLabel: 'Mar 19' },
  { day: 'Thu', fullDay: 'Thursday', hours: 3.1, lessonsCompleted: 4, dateLabel: 'Mar 20' },
  { day: 'Fri', fullDay: 'Friday', hours: 2.6, lessonsCompleted: 3, dateLabel: 'Mar 21' },
  { day: 'Sat', fullDay: 'Saturday', hours: 3.5, lessonsCompleted: 4, dateLabel: 'Mar 22' },
  { day: 'Sun', fullDay: 'Sunday', hours: 2.1, lessonsCompleted: 2, dateLabel: 'Mar 23' },
];

export const COURSE_LAST_ACCESSED: Record<
  string,
  { lastAccessed: string; lastLessonId: string; lastLessonTitle: string; watchedTime: string; totalTime: string }
> = {
  'course-1': {
    lastAccessed: '2 hours ago',
    lastLessonId: 'lesson-103',
    lastLessonTitle: 'Lesson 4: Deep Dive into useState, useReducer & Immutable State',
    watchedTime: '19h 10m',
    totalTime: '28h 40m',
  },
  'course-2': {
    lastAccessed: 'Yesterday',
    lastLessonId: 'lesson-102',
    lastLessonTitle: 'Lesson 5: Vectorized Operations & DataFrames in Pandas',
    watchedTime: '10h 05m',
    totalTime: '24h 15m',
  },
  'course-3': {
    lastAccessed: '3 days ago',
    lastLessonId: 'lesson-112',
    lastLessonTitle: 'Lesson 12: Multi-Brand Design Systems & Handoff',
    watchedTime: '21h 10m',
    totalTime: '21h 10m',
  },
  'course-4': {
    lastAccessed: '4 days ago',
    lastLessonId: 'lesson-103-setup',
    lastLessonTitle: 'Lesson 3: Isolated Kali Lab & OWASP Reconnaissance',
    watchedTime: '4h 55m',
    totalTime: '19h 50m',
  },
  'course-5': {
    lastAccessed: '1 day ago',
    lastLessonId: 'lesson-112',
    lastLessonTitle: 'Lesson 12: Production CI/CD & Final Exam Preparation',
    watchedTime: '31h 00m',
    totalTime: '31h 00m',
  },
  'course-9': {
    lastAccessed: '2 weeks ago',
    lastLessonId: 'lesson-112',
    lastLessonTitle: 'Lesson 12: Screen Reader Auditing & WCAG 2.2 Sign-Off',
    watchedTime: '11h 45m',
    totalTime: '11h 45m',
  },
};

export const STUDENT_COURSE_SECTIONS: StudentCourseSection[] = [
  {
    id: 'sec-1',
    title: 'Section 1: Modern Foundations & Architecture',
    subtitle: '3 lessons • 41m total',
    lessons: [
      {
        id: 'lesson-101',
        sectionId: 'sec-1',
        sectionTitle: 'Section 1: Modern Foundations & Architecture',
        number: 1,
        title: '1. Welcome & Architecture Walkthrough',
        duration: '08:24',
        durationSeconds: 504,
        summary:
          'An end-to-end tour of the production application we will build together, curriculum milestones, and how lesson watch tracking (90% threshold) and final certification exams work on EduHub.',
        keyTakeaways: [
          'Understand the 4-layer project folder structure and component boundaries',
          'Configure strict TypeScript 5.7 checks and fast Vite HMR',
          'Learn how completing 100% of lessons and scoring 60%+ on the exam unlocks your certificate',
        ],
      },
      {
        id: 'lesson-102',
        sectionId: 'sec-1',
        sectionTitle: 'Section 1: Modern Foundations & Architecture',
        number: 2,
        title: '2. Declarative UI, JSX & Component Composition',
        duration: '18:45',
        durationSeconds: 1125,
        summary:
          'How declarative rendering turns state into predictable DOM updates, designing clean slot and compound component patterns, and avoiding prop drilling.',
        keyTakeaways: [
          'Master composition vs. configuration props in reusable UI primitives',
          'Prevent unnecessary re-renders by colocating state close to where it is read',
          'Build accessible card, badge, and modal containers on an 8px spatial grid',
        ],
      },
      {
        id: 'lesson-103-setup',
        sectionId: 'sec-1',
        sectionTitle: 'Section 1: Modern Foundations & Architecture',
        number: 3,
        title: '3. Design Tokens, Spatial Rhythm & Responsive Breakpoints',
        duration: '14:20',
        durationSeconds: 860,
        summary:
          'Setting up semantic color variables, typography pairings (Baloo 2 and Nunito Sans), and testing responsive layouts across 1440px, 768px, and 375px viewports.',
        keyTakeaways: [
          'Implement fluid 12-column desktop, 8-column tablet, and 4-column mobile grids',
          'Maintain WCAG 2.2 AA contrast ratios across primary, warning, and success badges',
          'Verify keyboard focus rings and touch target sizing on mobile viewports',
        ],
      },
    ],
  },
  {
    id: 'sec-2',
    title: 'Section 2: State, Effects & Custom Hooks',
    subtitle: '3 lessons • 1h 14m total',
    lessons: [
      {
        id: 'lesson-103',
        sectionId: 'sec-2',
        sectionTitle: 'Section 2: State, Effects & Custom Hooks',
        number: 4,
        title: '4. Deep Dive into useState, useReducer & Immutable State',
        duration: '24:10',
        durationSeconds: 1450,
        summary:
          'Choosing between local state and reducers, understanding reference equality (Object.is), automatic state batching, and modeling multi-step interactive workflows.',
        keyTakeaways: [
          'Why mutating objects in place prevents UI updates and how to structure clean reducers',
          'Model deterministic state transitions for video players, filter drawers, and quizzes',
          'Eliminate derived-state synchronization bugs by computing values during render',
        ],
      },
      {
        id: 'lesson-104',
        sectionId: 'sec-2',
        sectionTitle: 'Section 2: State, Effects & Custom Hooks',
        number: 5,
        title: '5. Synchronizing with External Systems & Custom Hooks',
        duration: '29:05',
        durationSeconds: 1745,
        summary:
          'Extracting reusable media, timer, and keyboard listeners into composable custom hooks with proper cleanup and TypeScript generics.',
        keyTakeaways: [
          'Write idempotent effect cleanup functions for intervals, WebSockets, and media events',
          'Design custom hooks with clear return tuples and typed options',
          'Avoid stale closures using functional updates and stable event callbacks',
        ],
      },
      {
        id: 'lesson-105',
        sectionId: 'sec-2',
        sectionTitle: 'Section 2: State, Effects & Custom Hooks',
        number: 6,
        title: '6. Optimistic UI Updates & Async Error Recovery',
        duration: '21:30',
        durationSeconds: 1290,
        requiresPrevious: true,
        summary:
          'Building snappy interfaces that update immediately on user action while gracefully rolling back and notifying the user if a network request fails.',
        keyTakeaways: [
          'Implement instant like, wishlist, and comment submission feedback',
          'Provide clear toast notifications and retry actions when requests fail',
          'Prevent race conditions when users rapidly switch tabs or filters',
        ],
      },
    ],
  },
  {
    id: 'sec-3',
    title: 'Section 3: Data Routing, Performance & Accessibility',
    subtitle: '3 lessons • 1h 08m total',
    lessons: [
      {
        id: 'lesson-106',
        sectionId: 'sec-3',
        sectionTitle: 'Section 3: Data Routing, Performance & Accessibility',
        number: 7,
        title: '7. Nested Layouts, Role Guards & URL Search Params',
        duration: '26:15',
        durationSeconds: 1575,
        summary:
          'Architecting role-based route protection for Guest, Student, Instructor, Admin, and Supervisor personas while syncing catalog filters with the URL.',
        keyTakeaways: [
          'Keep search, category, price, and sort state shareable via URLSearchParams',
          'Protect role-specific routes with adaptive shells and friendly 403 screens',
          'Preserve scroll position and focus across route transitions',
        ],
      },
      {
        id: 'lesson-107',
        sectionId: 'sec-3',
        sectionTitle: 'Section 3: Data Routing, Performance & Accessibility',
        number: 8,
        title: '8. Core Web Vitals, Memoization & Bundle Splitting',
        duration: '19:40',
        durationSeconds: 1180,
        summary:
          'Profiling component render times with React DevTools, splitting large route bundles, and optimizing image loading.',
        keyTakeaways: [
          'Read flamegraphs to pinpoint expensive list renders and filter computations',
          'Apply useMemo and useCallback deliberately where referential stability matters',
          'Eliminate layout shifts (CLS) with explicit aspect ratios and skeleton loaders',
        ],
      },
      {
        id: 'lesson-108',
        sectionId: 'sec-3',
        sectionTitle: 'Section 3: Data Routing, Performance & Accessibility',
        number: 9,
        title: '9. Accessible Modals, Keyboard Flows & Screen Readers',
        duration: '22:50',
        durationSeconds: 1370,
        requiresPrevious: true,
        summary:
          'Auditing interactive widgets with keyboard-only navigation, focus traps, ARIA attributes, and live region announcements.',
        keyTakeaways: [
          'Manage focus restoration when opening and closing modals and slide-over drawers',
          'Announce dynamic progress milestones and toast alerts to assistive technologies',
          'Support full keyboard control inside custom video players and exam forms',
        ],
      },
    ],
  },
  {
    id: 'sec-4',
    title: 'Section 4: Automated Testing & Certification Prep',
    subtitle: '3 lessons • 1h 04m total',
    lessons: [
      {
        id: 'lesson-109',
        sectionId: 'sec-4',
        sectionTitle: 'Section 4: Automated Testing & Certification Prep',
        number: 10,
        title: '10. Unit & Custom Hook Testing with Vitest',
        duration: '23:10',
        durationSeconds: 1390,
        summary:
          'Writing fast, deterministic tests for business logic, progress calculation rules (90% lesson completion), and reducer state transitions.',
        keyTakeaways: [
          'Test edge cases in progress calculation and exam grading formulas',
          'Use accessible role queries instead of brittle CSS selectors',
          'Mock timers and media playback events cleanly',
        ],
      },
      {
        id: 'lesson-110',
        sectionId: 'sec-4',
        sectionTitle: 'Section 4: Automated Testing & Certification Prep',
        number: 11,
        title: '11. End-to-End Integration Flows with Playwright',
        duration: '25:00',
        durationSeconds: 1500,
        summary:
          'Automating critical student journeys from course discovery and enrollment to completing video lessons and downloading a verified certificate.',
        keyTakeaways: [
          'Verify responsive layouts across 1440px, 768px, and 375px viewports automatically',
          'Test authentication, OTP verification, and role-based access control',
          'Run accessibility assertions inside your CI pipeline',
        ],
      },
      {
        id: 'lesson-112',
        sectionId: 'sec-4',
        sectionTitle: 'Section 4: Automated Testing & Certification Prep',
        number: 12,
        title: '12. Final Exam Review & Production Release Checklist',
        duration: '16:30',
        durationSeconds: 990,
        summary:
          'A comprehensive recap of all four sections, sample certification exam questions, and strategies to score 60%+ (or 90%+ Distinction) on your final assessment.',
        keyTakeaways: [
          'Review key architectural concepts covered in the timed certification exam',
          'Complete the pre-exam readiness checklist',
          'Unlock and verify your official EduHub completion credential',
        ],
      },
    ],
  },
];

export const ALL_STUDENT_LESSONS: StudentLessonItem[] = STUDENT_COURSE_SECTIONS.flatMap(
  (s) => s.lessons
);

/**
 * Initial per-course, per-lesson watch percentage (0..100).
 * Rule: A lesson is Completed when watchPercent >= 90.
 * Course % = completed lessons / total lessons (12).
 */
export const INITIAL_LESSON_WATCH_MAP: Record<string, Record<string, number>> = {
  // Course 1: 8 of 12 completed (67%), lesson-103 at 72% (In progress), lesson-104 at 45% (In progress), lesson-105 at 0% (Not started), lesson-108 at 0% (Locked)
  'course-1': {
    'lesson-101': 100,
    'lesson-102': 95,
    'lesson-103-setup': 100,
    'lesson-103': 72,
    'lesson-104': 45,
    'lesson-105': 0,
    'lesson-106': 100,
    'lesson-107': 92,
    'lesson-108': 0,
    'lesson-109': 100,
    'lesson-110': 94,
    'lesson-112': 91,
  },
  // Course 2: 5 of 12 completed (42%)
  'course-2': {
    'lesson-101': 100,
    'lesson-102': 96,
    'lesson-103-setup': 92,
    'lesson-103': 100,
    'lesson-104': 90,
    'lesson-105': 64,
    'lesson-106': 30,
    'lesson-107': 0,
    'lesson-108': 0,
    'lesson-109': 0,
    'lesson-110': 0,
    'lesson-112': 0,
  },
  // Course 3: 12 of 12 completed (100%) + Exam passed (94%) -> Certificate unlocked!
  'course-3': {
    'lesson-101': 100,
    'lesson-102': 100,
    'lesson-103-setup': 98,
    'lesson-103': 100,
    'lesson-104': 95,
    'lesson-105': 100,
    'lesson-106': 100,
    'lesson-107': 94,
    'lesson-108': 100,
    'lesson-109': 100,
    'lesson-110': 96,
    'lesson-112': 100,
  },
  // Course 4: 3 of 12 completed (25%)
  'course-4': {
    'lesson-101': 100,
    'lesson-102': 94,
    'lesson-103-setup': 90,
    'lesson-103': 50,
    'lesson-104': 0,
    'lesson-105': 0,
    'lesson-106': 0,
    'lesson-107': 0,
    'lesson-108': 0,
    'lesson-109': 0,
    'lesson-110': 0,
    'lesson-112': 0,
  },
  // Course 5: 12 of 12 completed (100%), exam not yet passed -> Primary action "Take exam"!
  'course-5': {
    'lesson-101': 100,
    'lesson-102': 96,
    'lesson-103-setup': 100,
    'lesson-103': 95,
    'lesson-104': 100,
    'lesson-105': 92,
    'lesson-106': 100,
    'lesson-107': 100,
    'lesson-108': 94,
    'lesson-109': 100,
    'lesson-110': 98,
    'lesson-112': 100,
  },
  // Course 9: 12 of 12 completed (100%) + Exam passed (91%) -> Certificate unlocked!
  'course-9': {
    'lesson-101': 100,
    'lesson-102': 100,
    'lesson-103-setup': 100,
    'lesson-103': 96,
    'lesson-104': 100,
    'lesson-105': 100,
    'lesson-106': 95,
    'lesson-107': 100,
    'lesson-108': 100,
    'lesson-109': 92,
    'lesson-110': 100,
    'lesson-112': 100,
  },
};

/**
 * Initial best exam scores per course (null = not taken yet)
 */
export const INITIAL_EXAM_BEST_SCORES: Record<string, number | null> = {
  'course-1': 88,
  'course-2': null,
  'course-3': 94,
  'course-4': null,
  'course-5': 52, // Below 60% passing threshold, needs retake!
  'course-9': 91,
};

export const LESSON_RESOURCES: LessonResourceFile[] = [
  {
    id: 'res-1',
    title: 'Lesson-04-State-and-Reducers-Slides.pdf',
    type: 'PDF',
    size: '4.2 MB',
    description: 'Annotated lecture slides with architecture diagrams and decision trees.',
  },
  {
    id: 'res-2',
    title: 'Starter-Code-Lab-Immutable-State.zip',
    type: 'ZIP',
    size: '12.8 MB',
    description: 'Complete Vite + TypeScript starter workspace with unit test suite and solution branch.',
  },
  {
    id: 'res-3',
    title: 'React-19-Hooks-Quick-Reference-Sheet.pdf',
    type: 'PDF',
    size: '1.9 MB',
    description: 'Printable 2-page cheat sheet covering useState, useReducer, useMemo, and custom hooks.',
  },
  {
    id: 'res-4',
    title: 'Component-State-Spec-Tokens.fig',
    type: 'FIG',
    size: '8.5 MB',
    description: 'Figma file containing all 6 interactive states (default, hover, focus, disabled, loading, error).',
  },
];

export const INITIAL_THREADED_COMMENTS: ThreadedLessonComment[] = [
  {
    id: 'tcomment-1',
    courseId: 'course-1',
    lessonId: 'lesson-103',
    authorId: 'user-student-1',
    authorName: 'Sara Ali',
    authorAvatar:
      'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    isSupervisorVerified: true,
    status: 'approved',
    createdAt: '2 hours ago',
    timestampSeconds: 7200,
    content:
      'At 04:12 when we refactor the multi-field checkout state from four separate useState calls into a single useReducer, how should we handle validation errors so they reset cleanly when the user edits a field?',
    likesCount: 18,
    likedByMe: true,
    replies: [
      {
        id: 'treply-1',
        authorId: 'user-instructor-1',
        authorName: 'Ahmed Hassan',
        authorAvatar:
          'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
        isInstructor: true,
        isSupervisorVerified: true,
        createdAt: '1 hour ago',
        content:
          'Great question, Sara! Inside your FIELD_CHANGED action branch in the reducer, clear the specific field key inside state.errors at the same time you update state.values. Check out Starter-Code-Lab-Immutable-State.zip in the Resources tab for the exact pattern!',
        likesCount: 12,
        likedByMe: false,
      },
    ],
  },
  {
    id: 'tcomment-2',
    courseId: 'course-1',
    lessonId: 'lesson-103',
    authorId: 'user-stu-2',
    authorName: 'Karim Tarek',
    authorAvatar:
      'https://images.unsplash.com/photo-1574281570912-bf4355571765?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    isSupervisorVerified: true,
    status: 'approved',
    createdAt: '5 hours ago',
    timestampSeconds: 18000,
    content:
      'The visual explanation of Object.is reference equality finally made it click why array.push() inside state never triggers a re-render. Using spread or array.map() is so much cleaner.',
    likesCount: 27,
    likedByMe: false,
    replies: [
      {
        id: 'treply-2',
        authorId: 'user-student-1',
        authorName: 'Sara Ali',
        authorAvatar:
          'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
        isSupervisorVerified: true,
        createdAt: '3 hours ago',
        content:
          'Totally agree! The diagram at 09:30 showing the previous and next state pointers saved me hours of debugging.',
        likesCount: 6,
        likedByMe: true,
      },
    ],
  },
  {
    id: 'tcomment-3',
    courseId: 'course-1',
    lessonId: 'lesson-103',
    authorId: 'user-student-1',
    authorName: 'Sara Ali',
    authorAvatar:
      'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    isSupervisorVerified: false,
    status: 'pending',
    createdAt: '12 minutes ago',
    timestampSeconds: 720,
    content:
      'Here is my note on combining useReducer with URLSearchParams for browser back/forward history synchronization in the catalog filter.',
    likesCount: 1,
    likedByMe: false,
    replies: [],
  },
  {
    id: 'tcomment-4',
    courseId: 'course-1',
    lessonId: 'lesson-103',
    authorId: 'user-inst-3',
    authorName: 'Nadia Mansour',
    authorAvatar:
      'https://images.unsplash.com/photo-1730469344658-f442e279df9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    isSupervisorVerified: true,
    status: 'approved',
    createdAt: '2 days ago',
    timestampSeconds: 172800,
    content:
      'Modeling the 6 UI states (default, hover, focus, disabled, loading, error) as an explicit union type instead of multiple boolean flags eliminated impossible state combinations in our design system.',
    likesCount: 15,
    likedByMe: false,
    replies: [],
  },
  {
    id: 'tcomment-5',
    courseId: 'course-1',
    lessonId: 'lesson-103',
    authorId: 'user-inst-2',
    authorName: 'Tarek El-Sayed',
    authorAvatar:
      'https://images.unsplash.com/photo-1633625510483-c177f4308f33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    isSupervisorVerified: true,
    status: 'approved',
    createdAt: '4 days ago',
    timestampSeconds: 345600,
    content:
      'Quick tip for anyone working on the lab exercise: run pnpm test:watch in a split terminal while refactoring the reducer—the tests give instant feedback on every action type.',
    likesCount: 9,
    likedByMe: false,
    replies: [],
  },
];
