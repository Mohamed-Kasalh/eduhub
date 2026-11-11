export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'student' | 'instructor' | 'supervisor' | 'admin';
  status: 'Active' | 'Suspended' | 'Pending';
  joinedAt: string;
  lastLogin: string;
  coursesCount: number;
  recentActivity: Array<{ id: string; action: string; date: string }>;
}

export interface SupervisorCommentItem {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorRole: 'Student' | 'Instructor';
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  createdAt: string;
  status: 'Pending' | 'Flagged' | 'Approved' | 'Rejected';
  reportReasons: string[];
  rejectionReason?: 'Spam' | 'Offensive' | 'Off-topic' | 'Other';
  content: string;
  parentThreadContext: {
    promptAuthor: string;
    promptText: string;
    promptTime: string;
  };
  authorHistory: {
    joinedAt: string;
    totalComments: number;
    approvedComments: number;
    priorFlags: number;
    trustStanding: 'Good standing' | 'Under watch';
  };
}

export interface SupervisorCourseSubmission {
  id: string;
  courseId: string;
  title: string;
  subtitle: string;
  instructorName: string;
  instructorAvatar: string;
  categoryName: string;
  thumbnail: string;
  submittedDate: string;
  price: number;
  isFree?: boolean;
  sectionsCount: number;
  lessonsCount: number;
  totalDuration: string;
  questionBankCount: number;
  requiredQuestionsCount: number;
  status: 'Pending review' | 'Published' | 'Rejected' | 'Changes requested';
  rejectionReason?: string;
  checklist: {
    titleAndDescription: 'pass' | 'fail';
    coverAndDemoVideo: 'pass' | 'fail';
    curriculumComplete: 'pass' | 'fail';
    enoughQuestionsInBank: 'pass' | 'fail';
    pricingSet: 'pass' | 'fail';
  };
}

export const USER_GROWTH_6_MONTHS = [
  { month: 'Oct', users: 9400, active: 7800 },
  { month: 'Nov', users: 10650, active: 8900 },
  { month: 'Dec', users: 11800, active: 9750 },
  { month: 'Jan', users: 13120, active: 11200 },
  { month: 'Feb', users: 14390, active: 12450 },
  { month: 'Mar', users: 15480, active: 13680 },
];

export const CATEGORY_ENROLLMENT_DONUT = [
  { name: 'Development', count: 24810, percent: 36, color: '#6D4AE0' },
  { name: 'Data Science', count: 16540, percent: 24, color: '#2563EB' },
  { name: 'Design', count: 12405, percent: 18, color: '#F59E3B' },
  { name: 'Cybersecurity', count: 8270, percent: 12, color: '#16A34A' },
  { name: 'Business & Other', count: 6895, percent: 10, color: '#F5B82E' },
];

export const USERS_BY_ROLE_DISTRIBUTION = [
  { role: 'Student', count: 15120, percent: 76, badge: '15,120 learners', color: '#6D4AE0' },
  { role: 'Instructor', count: 318, percent: 14, badge: '318 instructors', color: '#F59E3B' },
  { role: 'Supervisor', count: 28, percent: 6, badge: '28 moderators', color: '#16A34A' },
  { role: 'Admin', count: 14, percent: 4, badge: '14 admins', color: '#2563EB' },
];

export const INITIAL_ADMIN_USERS: AdminUserRecord[] = [
  {
    id: 'user-student-1',
    name: 'Sara Ali',
    email: 'sara.ali@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    role: 'student',
    status: 'Active',
    joinedAt: 'Jan 12, 2026',
    lastLogin: '10 mins ago',
    coursesCount: 6,
    recentActivity: [
      { id: 'act-1', action: 'Passed Final Exam (86%) in Complete React Developer Course', date: 'Today, 16:05' },
      { id: 'act-2', action: 'Generated Certificate EDU-2026-000123', date: 'Today, 16:07' },
      { id: 'act-3', action: 'Completed Lesson 4: Deep Dive into useReducer', date: 'Yesterday' },
    ],
  },
  {
    id: 'user-instructor-1',
    name: 'Ahmed Hassan',
    email: 'ahmed.hassan@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    role: 'instructor',
    status: 'Active',
    joinedAt: 'Mar 04, 2025',
    lastLogin: '1 hour ago',
    coursesCount: 6,
    recentActivity: [
      { id: 'act-4', action: 'Submitted "GraphQL Federation & Microservices" for review', date: 'Yesterday' },
      { id: 'act-5', action: 'Added 4 new questions to React Question Bank', date: '2 days ago' },
    ],
  },
  {
    id: 'user-supervisor-1',
    name: 'Hana Mostafa',
    email: 'hana.mostafa@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1730469344658-f442e279df9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    role: 'supervisor',
    status: 'Active',
    joinedAt: 'Jun 18, 2025',
    lastLogin: '25 mins ago',
    coursesCount: 0,
    recentActivity: [
      { id: 'act-6', action: 'Verified 12 student lesson comments', date: 'Today, 14:20' },
      { id: 'act-7', action: 'Requested syllabus changes on Legacy Redux Workshop', date: '2 days ago' },
    ],
  },
  {
    id: 'user-admin-1',
    name: 'Nour Khaled',
    email: 'nour.khaled@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1598616068838-75c77532d5bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    role: 'admin',
    status: 'Active',
    joinedAt: 'Nov 02, 2024',
    lastLogin: 'Just now',
    coursesCount: 0,
    recentActivity: [
      { id: 'act-8', action: 'Updated default exam pass threshold to 60%', date: 'Today, 11:00' },
      { id: 'act-9', action: 'Audited certificate registry', date: '3 days ago' },
    ],
  },
  {
    id: 'user-inst-2',
    name: 'Dr. Mona Adel',
    email: 'mona.adel@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1697063882499-f7fca7d2d713?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    role: 'instructor',
    status: 'Active',
    joinedAt: 'Apr 19, 2025',
    lastLogin: '4 hours ago',
    coursesCount: 3,
    recentActivity: [
      { id: 'act-10', action: 'Submitted "Applied NLP & LLMs" for supervisor review', date: '2 days ago' },
    ],
  },
  {
    id: 'user-inst-3',
    name: 'Salma Nabil',
    email: 'salma.nabil@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    role: 'instructor',
    status: 'Active',
    joinedAt: 'Aug 11, 2025',
    lastLogin: 'Yesterday',
    coursesCount: 3,
    recentActivity: [
      { id: 'act-11', action: 'Updated Figma Variables Workshop attachments', date: '3 days ago' },
    ],
  },
  {
    id: 'user-stu-2',
    name: 'Karim Tarek',
    email: 'karim.tarek@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1574281570912-bf4355571765?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    role: 'student',
    status: 'Active',
    joinedAt: 'Feb 03, 2026',
    lastLogin: '3 hours ago',
    coursesCount: 4,
    recentActivity: [
      { id: 'act-12', action: 'Enrolled in Full-Stack TypeScript Bootcamp', date: '4 days ago' },
    ],
  },
  {
    id: 'user-stu-3',
    name: 'Yasmine Adel',
    email: 'yasmine.adel@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1776111842991-4a189c07e609?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    role: 'student',
    status: 'Suspended',
    joinedAt: 'Mar 01, 2026',
    lastLogin: '5 days ago',
    coursesCount: 1,
    recentActivity: [
      { id: 'act-13', action: 'Account suspended due to promotional spam link reports', date: '4 days ago' },
    ],
  },
  {
    id: 'user-inst-pending',
    name: 'Dr. Tamer Mansour',
    email: 'tamer.mansour@eduhub.com',
    avatar:
      'https://images.unsplash.com/photo-1633625510483-c177f4308f33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    role: 'instructor',
    status: 'Pending',
    joinedAt: 'Mar 24, 2026',
    lastLogin: '2 hours ago',
    coursesCount: 0,
    recentActivity: [
      { id: 'act-14', action: 'Submitted instructor application & identity credentials', date: 'Today, 09:30' },
    ],
  },
];

export const ROLES_PERMISSIONS_MATRIX: Array<{
  feature: string;
  category: string;
  student: boolean;
  instructor: boolean;
  supervisor: boolean;
  admin: boolean;
}> = [
  {
    feature: 'Browse catalog, preview demos & enroll in courses',
    category: 'Learning',
    student: true,
    instructor: true,
    supervisor: true,
    admin: true,
  },
  {
    feature: 'Watch HD lessons (90% auto-complete) & take exams',
    category: 'Learning',
    student: true,
    instructor: false,
    supervisor: false,
    admin: false,
  },
  {
    feature: 'Generate & download verified A4 certificates',
    category: 'Learning',
    student: true,
    instructor: false,
    supervisor: false,
    admin: true,
  },
  {
    feature: 'Create courses, upload media & manage Question Bank',
    category: 'Teaching',
    student: false,
    instructor: true,
    supervisor: false,
    admin: true,
  },
  {
    feature: 'Configure course exam settings & view student progress',
    category: 'Teaching',
    student: false,
    instructor: true,
    supervisor: false,
    admin: true,
  },
  {
    feature: 'Moderate lesson comments (Approve / Reject / Verify badge)',
    category: 'Moderation',
    student: false,
    instructor: false,
    supervisor: true,
    admin: true,
  },
  {
    feature: 'Review submitted courses (Quality checklist & Approve/Reject)',
    category: 'Moderation',
    student: false,
    instructor: false,
    supervisor: true,
    admin: true,
  },
  {
    feature: 'Investigate & resolve community moderation reports',
    category: 'Moderation',
    student: false,
    instructor: false,
    supervisor: true,
    admin: true,
  },
  {
    feature: 'Override any course publication status & toggle Featured tag',
    category: 'Administration',
    student: false,
    instructor: false,
    supervisor: false,
    admin: true,
  },
  {
    feature: 'Manage users, change roles & suspend/activate accounts',
    category: 'Administration',
    student: false,
    instructor: false,
    supervisor: false,
    admin: true,
  },
  {
    feature: 'Manage categories, revoke certificates & edit platform settings',
    category: 'Administration',
    student: false,
    instructor: false,
    supervisor: false,
    admin: true,
  },
];

export const INITIAL_SUPERVISOR_COMMENTS: SupervisorCommentItem[] = [
  {
    id: 'scm-1',
    authorName: 'Sara Ali',
    authorAvatar:
      'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Student',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    lessonId: 'lesson-103',
    lessonTitle: 'Lesson 4: Deep Dive into useState, useReducer & Immutable State',
    createdAt: '12 minutes ago',
    status: 'Pending',
    reportReasons: [],
    content:
      'Here is my note on combining useReducer with URLSearchParams for browser back/forward history synchronization in the catalog filter. Should we debounce the search input before updating URLSearchParams?',
    parentThreadContext: {
      promptAuthor: 'Ahmed Hassan (Instructor)',
      promptText:
        'Discussion prompt: Share how you structure complex filter state in React 19 without causing redundant history pushes.',
      promptTime: 'Pinned lesson topic',
    },
    authorHistory: {
      joinedAt: 'January 2026',
      totalComments: 18,
      approvedComments: 17,
      priorFlags: 0,
      trustStanding: 'Good standing',
    },
  },
  {
    id: 'scm-2',
    authorName: 'Karim Tarek',
    authorAvatar:
      'https://images.unsplash.com/photo-1574281570912-bf4355571765?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Student',
    courseId: 'course-2',
    courseTitle: 'Python for Data Science',
    lessonId: 'lesson-102',
    lessonTitle: 'Lesson 2: NumPy Vectorization & Memory Layout',
    createdAt: '45 minutes ago',
    status: 'Pending',
    reportReasons: [],
    content:
      'When broadcasting a 2D matrix with a 1D row vector in NumPy, does it allocate a new array in memory or use zero-copy stride tricks under the hood?',
    parentThreadContext: {
      promptAuthor: 'Dr. Mona Adel (Instructor)',
      promptText:
        'Post any questions about array shapes, broadcasting rules, or memory contiguity here.',
      promptTime: 'Pinned lesson topic',
    },
    authorHistory: {
      joinedAt: 'February 2026',
      totalComments: 9,
      approvedComments: 9,
      priorFlags: 0,
      trustStanding: 'Good standing',
    },
  },
  {
    id: 'scm-3',
    authorName: 'Yasmine Adel',
    authorAvatar:
      'https://images.unsplash.com/photo-1776111842991-4a189c07e609?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Student',
    courseId: 'course-4',
    courseTitle: 'Ethical Hacking Fundamentals',
    lessonId: 'lesson-101',
    lessonTitle: 'Lesson 1: Isolated Lab Environment Setup',
    createdAt: '2 hours ago',
    status: 'Flagged',
    reportReasons: ['Spam', 'External promo link'],
    content:
      'Check out this external Telegram link for leaked certification exam answer dumps and 90% off third-party voucher codes!',
    parentThreadContext: {
      promptAuthor: 'Omar Fathy (Instructor)',
      promptText:
        'Reminder: All penetration testing exercises must be performed strictly inside the provided isolated VM lab.',
      promptTime: 'Pinned lesson topic',
    },
    authorHistory: {
      joinedAt: 'March 2026',
      totalComments: 4,
      approvedComments: 1,
      priorFlags: 3,
      trustStanding: 'Under watch',
    },
  },
  {
    id: 'scm-4',
    authorName: 'Tarek El-Sayed',
    authorAvatar:
      'https://images.unsplash.com/photo-1633625510483-c177f4308f33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Student',
    courseId: 'course-5',
    courseTitle: 'Full-Stack TypeScript & Node.js Bootcamp',
    lessonId: 'lesson-104',
    lessonTitle: 'Lesson 5: PostgreSQL Indexing & Prisma Transactions',
    createdAt: '4 hours ago',
    status: 'Flagged',
    reportReasons: ['Off-topic'],
    content:
      'Is anyone here interested in buying my used gaming monitor in Cairo? DM me for price and photos.',
    parentThreadContext: {
      promptAuthor: 'Ahmed Hassan (Instructor)',
      promptText: 'Lesson Q&A thread for PostgreSQL B-Tree and GIN indexing benchmarks.',
      promptTime: 'Pinned lesson topic',
    },
    authorHistory: {
      joinedAt: 'January 2026',
      totalComments: 11,
      approvedComments: 10,
      priorFlags: 1,
      trustStanding: 'Good standing',
    },
  },
  {
    id: 'scm-5',
    authorName: 'Nadia Mansour',
    authorAvatar:
      'https://images.unsplash.com/photo-1730469344658-f442e279df9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Student',
    courseId: 'course-3',
    courseTitle: 'UI/UX Design Masterclass',
    lessonId: 'lesson-101',
    lessonTitle: 'Lesson 1: Establishing an 8px Spatial Grid & Type Scale',
    createdAt: '1 day ago',
    status: 'Approved',
    reportReasons: [],
    content:
      'Pairing Baloo 2 for display headings with Nunito Sans for dense data tables gives the interface a warm, approachable personality while keeping numbers crisp.',
    parentThreadContext: {
      promptAuthor: 'Salma Nabil (Instructor)',
      promptText: 'Share your favorite typography pairings for educational web apps.',
      promptTime: 'Pinned lesson topic',
    },
    authorHistory: {
      joinedAt: 'December 2025',
      totalComments: 24,
      approvedComments: 24,
      priorFlags: 0,
      trustStanding: 'Good standing',
    },
  },
  {
    id: 'scm-6',
    authorName: 'Yasmine Adel',
    authorAvatar:
      'https://images.unsplash.com/photo-1776111842991-4a189c07e609?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Student',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    lessonId: 'lesson-101',
    lessonTitle: 'Lesson 1: Welcome & Architecture Walkthrough',
    createdAt: '2 days ago',
    status: 'Rejected',
    reportReasons: ['Spam'],
    rejectionReason: 'Spam',
    content: 'Follow my crypto referral code for instant airdrops!',
    parentThreadContext: {
      promptAuthor: 'Ahmed Hassan (Instructor)',
      promptText: 'Welcome thread for new React 19 cohort students.',
      promptTime: 'Pinned lesson topic',
    },
    authorHistory: {
      joinedAt: 'March 2026',
      totalComments: 4,
      approvedComments: 1,
      priorFlags: 3,
      trustStanding: 'Under watch',
    },
  },
];

export const INITIAL_SUPERVISOR_COURSE_REVIEWS: SupervisorCourseSubmission[] = [
  {
    id: 'sub-1',
    courseId: 'course-8',
    title: 'Cloud Security & AWS Penetration Testing',
    subtitle:
      'Audit IAM policies, S3 permissions, container workloads, and serverless architectures against modern threats.',
    instructorName: 'Omar Fathy',
    instructorAvatar:
      'https://images.unsplash.com/photo-1633625510483-c177f4308f33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryName: 'Cybersecurity',
    thumbnail:
      'https://images.unsplash.com/photo-1484417894907-623942c8ee29?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    submittedDate: 'March 24, 2026',
    price: 69.99,
    sectionsCount: 6,
    lessonsCount: 31,
    totalDuration: '22h 10m',
    questionBankCount: 24,
    requiredQuestionsCount: 20,
    status: 'Pending review',
    checklist: {
      titleAndDescription: 'pass',
      coverAndDemoVideo: 'pass',
      curriculumComplete: 'pass',
      enoughQuestionsInBank: 'pass',
      pricingSet: 'pass',
    },
  },
  {
    id: 'sub-2',
    courseId: 'course-12',
    title: 'Applied Natural Language Processing & LLMs',
    subtitle:
      'Build retrieval-augmented generation (RAG) systems, embeddings pipelines, vector search, and evaluation suites.',
    instructorName: 'Dr. Mona Adel',
    instructorAvatar:
      'https://images.unsplash.com/photo-1697063882499-f7fca7d2d713?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryName: 'Languages',
    thumbnail:
      'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    submittedDate: 'March 23, 2026',
    price: 69.99,
    sectionsCount: 8,
    lessonsCount: 38,
    totalDuration: '25h 40m',
    questionBankCount: 22,
    requiredQuestionsCount: 20,
    status: 'Pending review',
    checklist: {
      titleAndDescription: 'pass',
      coverAndDemoVideo: 'pass',
      curriculumComplete: 'pass',
      enoughQuestionsInBank: 'pass',
      pricingSet: 'pass',
    },
  },
  {
    id: 'sub-3',
    courseId: 'course-inst-rejected',
    title: 'Legacy Redux & Class Components Workshop',
    subtitle:
      'Maintaining older enterprise React codebases and migrating lifecycle methods to modern functional hooks.',
    instructorName: 'Ahmed Hassan',
    instructorAvatar:
      'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryName: 'Development',
    thumbnail:
      'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    submittedDate: 'March 21, 2026',
    price: 29.99,
    sectionsCount: 3,
    lessonsCount: 16,
    totalDuration: '10h 40m',
    questionBankCount: 9,
    requiredQuestionsCount: 20,
    status: 'Rejected',
    rejectionReason:
      'Question bank has only 9 questions (minimum 20 required) and Module 3 Lesson 4 is missing English captions.',
    checklist: {
      titleAndDescription: 'pass',
      coverAndDemoVideo: 'pass',
      curriculumComplete: 'fail',
      enoughQuestionsInBank: 'fail',
      pricingSet: 'pass',
    },
  },
];
