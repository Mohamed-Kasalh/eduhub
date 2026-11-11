export type UserRole = 'guest' | 'student' | 'instructor' | 'admin' | 'supervisor';

export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type CourseStatus = 'Published' | 'Pending review' | 'Draft' | 'Rejected';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Exclude<UserRole, 'guest'>;
  avatar: string;
  title: string;
  bio: string;
  joinedAt: string;
  status: 'Active' | 'Suspended' | 'Pending';
  enrolledCourseIds?: string[];
  completedCourseIds?: string[];
  streakDays?: number;
  points?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  courseCount: number;
  iconName: string;
  accentColor: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  moduleTitle: string;
  title: string;
  duration: string;
  videoUrl: string;
  isPreview: boolean;
  completedByDefault?: boolean;
  summary: string;
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  instructorId: string;
  instructorName: string;
  instructorAvatar: string;
  categoryId: string;
  categoryName: string;
  thumbnail: string;
  rating: number;
  reviewCount: number;
  studentsCount: number;
  price: number;
  originalPrice?: number;
  level: CourseLevel;
  duration: string;
  lessonsCount: number;
  featured?: boolean;
  isNew?: boolean;
  isFree?: boolean;
  subcategory?: string;
  durationHours?: number;
  language?: string;
  includesCertificate?: boolean;
  includesExam?: boolean;
  unavailable?: boolean;
  learningPoints?: string[];
  status: CourseStatus;
  updatedAt: string;
  progress?: number; // For Sara Ali's enrolled courses
  tags: string[];
}

export interface SubcategoryItem {
  id: string;
  name: string;
  count: number;
}

export interface CurriculumLessonItem {
  id: string;
  title: string;
  type: 'video' | 'reading' | 'exam';
  duration: string;
  isPreview?: boolean;
}

export interface CurriculumSection {
  id: string;
  title: string;
  lessonsCount: number;
  totalDuration: string;
  lessons: CurriculumLessonItem[];
}

export interface CourseReview {
  id: string;
  courseId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  rating: number;
  createdAt: string;
  comment: string;
  helpfulCount: number;
}

export interface InstructorHighlight {
  id: string;
  name: string;
  field: string;
  avatar: string;
  learnersCount: string;
  rating: number;
  coursesCount: number;
  bio: string;
}

export interface StudentTestimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  courseTitle: string;
  rating: number;
  quote: string;
}

export interface CourseComment {
  id: string;
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  authorName: string;
  authorAvatar: string;
  authorRole: 'Student' | 'Instructor';
  content: string;
  createdAt: string;
  status: 'Approved' | 'Pending review' | 'Flagged' | 'Hidden';
  flagReason?: string;
  repliesCount: number;
}

export interface ExamQuestion {
  id: string;
  courseId: string;
  courseTitle: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  explanation: string;
}

export interface ExamConfig {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  durationMinutes: number;
  passingScore: number;
  totalQuestions: number;
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  lastScore?: number;
  passed?: boolean;
}

export interface CertificateRecord {
  id: string;
  verificationCode: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: string;
  grade: string;
  scorePercent: number;
  status: 'Valid' | 'Revoked';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: 'course' | 'exam' | 'certificate' | 'moderation' | 'system';
  link: string;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
  color: 'purple' | 'gold' | 'orange' | 'green';
}

export interface ModerationReport {
  id: string;
  targetType: 'Comment' | 'Course' | 'User';
  targetTitle: string;
  reportedBy: string;
  reason: string;
  severity: 'High' | 'Medium' | 'Low';
  createdAt: string;
  status: 'Open' | 'Investigating' | 'Resolved';
}

export const ROLE_USERS: Record<Exclude<UserRole, 'guest'>, UserProfile> = {
  student: {
    id: 'user-student-1',
    name: 'Sara Ali',
    email: 'sara.ali@eduhub.com',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    title: 'Frontend Engineering Learner',
    bio: 'Computer science graduate building modern web applications with React, TypeScript, and accessible design systems.',
    joinedAt: 'January 2025',
    status: 'Active',
    enrolledCourseIds: ['course-1', 'course-2', 'course-3', 'course-4', 'course-5'],
    completedCourseIds: ['course-3', 'course-9'],
    streakDays: 14,
    points: 2480,
  },
  instructor: {
    id: 'user-instructor-1',
    name: 'Ahmed Hassan',
    email: 'ahmed.hassan@eduhub.com',
    role: 'instructor',
    avatar: 'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    title: 'Principal Frontend Architect & Instructor',
    bio: '12+ years shipping large-scale web platforms. Teaching over 48,000 students practical software engineering on EduHub.',
    joinedAt: 'March 2023',
    status: 'Active',
  },
  admin: {
    id: 'user-admin-1',
    name: 'Nour Khaled',
    email: 'nour.khaled@eduhub.com',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1598616068838-75c77532d5bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    title: 'Platform Operations Administrator',
    bio: 'Overseeing platform settings, user lifecycle, catalog taxonomy, and verified academic credentials.',
    joinedAt: 'November 2022',
    status: 'Active',
  },
  supervisor: {
    id: 'user-supervisor-1',
    name: 'Hana Mostafa',
    email: 'hana.mostafa@eduhub.com',
    role: 'supervisor',
    avatar: 'https://images.unsplash.com/photo-1730469344658-f442e279df9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    title: 'Academic Quality & Trust Supervisor',
    bio: 'Ensuring every course syllabus, lesson discussion, and student interaction meets EduHub academic quality standards.',
    joinedAt: 'June 2023',
    status: 'Active',
  },
};

export const ALL_USERS: UserProfile[] = [
  ROLE_USERS.student,
  ROLE_USERS.instructor,
  ROLE_USERS.admin,
  ROLE_USERS.supervisor,
  {
    id: 'user-inst-2',
    name: 'Dr. Mona Adel',
    email: 'mona.adel@eduhub.com',
    role: 'instructor',
    avatar: 'https://images.unsplash.com/photo-1697063882499-f7fca7d2d713?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    title: 'Lead Data Scientist & AI Researcher',
    bio: 'PhD in Machine Learning with a passion for making statistics, Python, and deep learning approachable.',
    joinedAt: 'April 2023',
    status: 'Active',
  },
  {
    id: 'user-inst-3',
    name: 'Salma Nabil',
    email: 'salma.nabil@eduhub.com',
    role: 'instructor',
    avatar: 'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    title: 'Staff Product Designer',
    bio: 'Specializing in design systems, accessibility, and human-centered product discovery.',
    joinedAt: 'August 2023',
    status: 'Active',
  },
  {
    id: 'user-inst-4',
    name: 'Omar Fathy',
    email: 'omar.fathy@eduhub.com',
    role: 'instructor',
    avatar: 'https://images.unsplash.com/photo-1633625510483-c177f4308f33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    title: 'Principal Security Engineer (OSCP, CISSP)',
    bio: 'Helping engineering teams defend cloud infrastructure and web applications through hands-on offensive security labs.',
    joinedAt: 'September 2023',
    status: 'Active',
  },
  {
    id: 'user-stu-2',
    name: 'Karim Tarek',
    email: 'karim.tarek@eduhub.com',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1574281570912-bf4355571765?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    title: 'Junior Full-Stack Developer',
    bio: 'Learning cloud architecture and backend systems.',
    joinedAt: 'February 2025',
    status: 'Active',
  },
  {
    id: 'user-stu-3',
    name: 'Yasmine Adel',
    email: 'yasmine.adel@eduhub.com',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1776111842991-4a189c07e609?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    title: 'UX Research Intern',
    bio: 'Transitioning into digital product design.',
    joinedAt: 'March 2025',
    status: 'Suspended',
  },
];

export const CATEGORIES: Category[] = [
  {
    id: 'cat-web',
    name: 'Development',
    slug: 'development',
    description: 'Modern frontend frameworks, full-stack TypeScript, APIs, and scalable web architecture.',
    courseCount: 28,
    iconName: 'Code2',
    accentColor: '#6D4AE0',
  },
  {
    id: 'cat-design',
    name: 'Design',
    slug: 'design',
    description: 'User research, wireframing, Figma design systems, interactive prototyping, and usability testing.',
    courseCount: 19,
    iconName: 'Palette',
    accentColor: '#F59E3B',
  },
  {
    id: 'cat-business',
    name: 'Business',
    slug: 'business',
    description: 'Product strategy, agile delivery, startup finance, stakeholder leadership, and operations.',
    courseCount: 16,
    iconName: 'Briefcase',
    accentColor: '#3F2A9E',
  },
  {
    id: 'cat-data',
    name: 'Data Science',
    slug: 'data-science',
    description: 'Python analytics, machine learning pipelines, neural networks, and practical LLM engineering.',
    courseCount: 22,
    iconName: 'BarChart3',
    accentColor: '#2563EB',
  },
  {
    id: 'cat-marketing',
    name: 'Marketing',
    slug: 'marketing',
    description: 'Growth analytics, content strategy, conversion optimization, and lifecycle email campaigns.',
    courseCount: 14,
    iconName: 'Megaphone',
    accentColor: '#F5B82E',
  },
  {
    id: 'cat-languages',
    name: 'Languages',
    slug: 'languages',
    description: 'Business English, technical communication, IELTS preparation, and conversational fluency.',
    courseCount: 11,
    iconName: 'Globe',
    accentColor: '#2563EB',
  },
  {
    id: 'cat-security',
    name: 'Cybersecurity',
    slug: 'cybersecurity',
    description: 'Ethical hacking, network defense, penetration testing, and cloud security operations.',
    courseCount: 12,
    iconName: 'ShieldCheck',
    accentColor: '#16A34A',
  },
  {
    id: 'cat-photo',
    name: 'Photography',
    slug: 'photography',
    description: 'Studio lighting, portrait composition, mirrorless camera mastery, and color grading.',
    courseCount: 9,
    iconName: 'Camera',
    accentColor: '#6D4AE0',
  },
];

export const COURSES: Course[] = [
  {
    id: 'course-1',
    title: 'Complete React Developer Course',
    subtitle: 'Master React 19, Hooks, Router, state management, performance optimization, and real-world testing from scratch.',
    instructorId: 'user-instructor-1',
    instructorName: 'Ahmed Hassan',
    instructorAvatar: 'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-web',
    categoryName: 'Development',
    thumbnail: 'https://images.unsplash.com/photo-1619410283995-43d9134e7656?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.9,
    reviewCount: 1420,
    studentsCount: 18450,
    price: 49.99,
    originalPrice: 89.99,
    level: 'Intermediate',
    duration: '28h 40m',
    lessonsCount: 42,
    featured: true,
    isNew: false,
    isFree: false,
    status: 'Published',
    updatedAt: 'March 2025',
    progress: 68,
    tags: ['React 19', 'TypeScript', 'Frontend'],
  },
  {
    id: 'course-2',
    title: 'Python for Data Science',
    subtitle: 'Analyze complex datasets, build predictive models with Pandas, NumPy, Matplotlib, and Scikit-Learn.',
    instructorId: 'user-inst-2',
    instructorName: 'Dr. Mona Adel',
    instructorAvatar: 'https://images.unsplash.com/photo-1697063882499-f7fca7d2d713?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-data',
    categoryName: 'Data Science',
    thumbnail: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.8,
    reviewCount: 980,
    studentsCount: 14200,
    price: 54.99,
    originalPrice: 94.99,
    level: 'Beginner',
    duration: '24h 15m',
    lessonsCount: 36,
    featured: true,
    status: 'Published',
    updatedAt: 'February 2025',
    progress: 35,
    tags: ['Python', 'Pandas', 'Analytics'],
  },
  {
    id: 'course-3',
    title: 'UI/UX Design Masterclass',
    subtitle: 'Design delightful digital products from user interviews and information architecture to polished Figma design systems.',
    instructorId: 'user-inst-3',
    instructorName: 'Salma Nabil',
    instructorAvatar: 'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-design',
    categoryName: 'Design',
    thumbnail: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.9,
    reviewCount: 1150,
    studentsCount: 12900,
    price: 44.99,
    originalPrice: 79.99,
    level: 'Beginner',
    duration: '21h 10m',
    lessonsCount: 32,
    featured: true,
    isNew: true,
    status: 'Published',
    updatedAt: 'March 2025',
    progress: 100,
    tags: ['Figma', 'UX Research', 'Design Systems'],
  },
  {
    id: 'course-4',
    title: 'Ethical Hacking Fundamentals',
    subtitle: 'Learn reconnaissance, web application vulnerability assessment, OWASP Top 10, and defensive hardening.',
    instructorId: 'user-inst-4',
    instructorName: 'Omar Fathy',
    instructorAvatar: 'https://images.unsplash.com/photo-1633625510483-c177f4308f33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-security',
    categoryName: 'Cybersecurity',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.7,
    reviewCount: 740,
    studentsCount: 9640,
    price: 0,
    originalPrice: 99.99,
    level: 'Intermediate',
    duration: '19h 50m',
    lessonsCount: 29,
    featured: false,
    isFree: true,
    status: 'Published',
    updatedAt: 'January 2025',
    progress: 18,
    tags: ['OWASP', 'Network Security', 'Pentesting'],
  },
  {
    id: 'course-5',
    title: 'Full-Stack TypeScript & Node.js Bootcamp',
    subtitle: 'Build production-grade REST and GraphQL APIs with Node.js, PostgreSQL, Prisma, Redis, and automated CI/CD.',
    instructorId: 'user-instructor-1',
    instructorName: 'Ahmed Hassan',
    instructorAvatar: 'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-web',
    categoryName: 'Development',
    thumbnail: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.8,
    reviewCount: 620,
    studentsCount: 8300,
    price: 52.99,
    originalPrice: 89.99,
    level: 'Advanced',
    duration: '31h 00m',
    lessonsCount: 48,
    featured: true,
    isNew: true,
    status: 'Published',
    updatedAt: 'March 2025',
    progress: 52,
    tags: ['TypeScript', 'Node.js', 'PostgreSQL'],
  },
  {
    id: 'course-6',
    title: 'Machine Learning with PyTorch & Scikit-Learn',
    subtitle: 'Train, evaluate, and deploy supervised and deep learning models with hands-on notebooks and real datasets.',
    instructorId: 'user-inst-2',
    instructorName: 'Dr. Mona Adel',
    instructorAvatar: 'https://images.unsplash.com/photo-1697063882499-f7fca7d2d713?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-data',
    categoryName: 'Data Science',
    thumbnail: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.9,
    reviewCount: 530,
    studentsCount: 7120,
    price: 64.99,
    originalPrice: 109.99,
    level: 'Advanced',
    duration: '27h 30m',
    lessonsCount: 40,
    featured: false,
    isNew: true,
    status: 'Published',
    updatedAt: 'February 2025',
    tags: ['PyTorch', 'Deep Learning', 'AI'],
  },
  {
    id: 'course-7',
    title: 'Design Systems & Figma Variables Workshop',
    subtitle: 'Architect multi-brand token systems, accessible component libraries, and seamless developer handoff workflows.',
    instructorId: 'user-inst-3',
    instructorName: 'Salma Nabil',
    instructorAvatar: 'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-design',
    categoryName: 'Design',
    thumbnail: 'https://images.unsplash.com/photo-1607706189992-eae578626c86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.8,
    reviewCount: 410,
    studentsCount: 5890,
    price: 0,
    originalPrice: 69.99,
    level: 'Intermediate',
    duration: '14h 20m',
    lessonsCount: 24,
    featured: false,
    isNew: true,
    isFree: true,
    status: 'Published',
    updatedAt: 'March 2025',
    tags: ['Design Tokens', 'Figma', 'Accessibility'],
  },
  {
    id: 'course-8',
    title: 'Cloud Security & AWS Penetration Testing',
    subtitle: 'Audit IAM policies, S3 permissions, container workloads, and serverless architectures against modern threats.',
    instructorId: 'user-inst-4',
    instructorName: 'Omar Fathy',
    instructorAvatar: 'https://images.unsplash.com/photo-1633625510483-c177f4308f33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-security',
    categoryName: 'Cybersecurity',
    thumbnail: 'https://images.unsplash.com/photo-1484417894907-623942c8ee29?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.7,
    reviewCount: 315,
    studentsCount: 4320,
    price: 69.99,
    originalPrice: 119.99,
    level: 'Advanced',
    duration: '22h 10m',
    lessonsCount: 31,
    featured: false,
    isNew: true,
    status: 'Pending review',
    updatedAt: 'March 2025',
    tags: ['AWS', 'Cloud Security', 'IAM'],
  },
  {
    id: 'course-9',
    title: 'Web Accessibility & Inclusive Interface Engineering',
    subtitle: 'Build WCAG 2.2 AA compliant web applications with semantic HTML, ARIA patterns, keyboard flows, and screen readers.',
    instructorId: 'user-instructor-1',
    instructorName: 'Ahmed Hassan',
    instructorAvatar: 'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-business',
    categoryName: 'Business',
    thumbnail: 'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.9,
    reviewCount: 290,
    studentsCount: 4100,
    price: 0,
    originalPrice: 59.99,
    level: 'Beginner',
    duration: '11h 45m',
    lessonsCount: 18,
    featured: false,
    isFree: true,
    status: 'Published',
    updatedAt: 'January 2025',
    progress: 100,
    tags: ['Accessibility', 'ARIA', 'Frontend'],
  },
  {
    id: 'course-10',
    title: 'SQL & PostgreSQL Performance Engineering',
    subtitle: 'Write analytical queries, understand B-Tree and GIN indexing, query plans, partitioning, and high-concurrency tuning.',
    instructorId: 'user-instructor-1',
    instructorName: 'Ahmed Hassan',
    instructorAvatar: 'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-marketing',
    categoryName: 'Marketing',
    thumbnail: 'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.8,
    reviewCount: 475,
    studentsCount: 6540,
    price: 0,
    originalPrice: 74.99,
    level: 'Intermediate',
    duration: '16h 30m',
    lessonsCount: 26,
    featured: false,
    isNew: true,
    isFree: true,
    status: 'Published',
    updatedAt: 'February 2025',
    tags: ['SQL', 'PostgreSQL', 'Databases'],
  },
  {
    id: 'course-11',
    title: 'Mobile App Design & Prototyping in Figma',
    subtitle: 'Craft iOS and Android navigation patterns, micro-interactions, adaptive layouts, and interactive user test flows.',
    instructorId: 'user-inst-3',
    instructorName: 'Salma Nabil',
    instructorAvatar: 'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-photo',
    categoryName: 'Photography',
    thumbnail: 'https://images.unsplash.com/photo-1608306448197-e83633f1261c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.7,
    reviewCount: 360,
    studentsCount: 5120,
    price: 39.99,
    originalPrice: 64.99,
    level: 'Beginner',
    duration: '15h 15m',
    lessonsCount: 22,
    featured: false,
    isNew: true,
    status: 'Draft',
    updatedAt: 'March 2025',
    tags: ['Mobile UX', 'Prototyping', 'iOS & Android'],
  },
  {
    id: 'course-12',
    title: 'Applied Natural Language Processing & LLMs',
    subtitle: 'Build retrieval-augmented generation (RAG) systems, embeddings pipelines, vector search, and evaluation suites.',
    instructorId: 'user-inst-2',
    instructorName: 'Dr. Mona Adel',
    instructorAvatar: 'https://images.unsplash.com/photo-1697063882499-f7fca7d2d713?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    categoryId: 'cat-languages',
    categoryName: 'Languages',
    thumbnail: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    rating: 4.9,
    reviewCount: 685,
    studentsCount: 9210,
    price: 69.99,
    originalPrice: 119.99,
    level: 'Advanced',
    duration: '25h 40m',
    lessonsCount: 38,
    featured: true,
    isNew: true,
    status: 'Pending review',
    updatedAt: 'March 2025',
    tags: ['NLP', 'RAG', 'Vector Search'],
  },
];

export const LESSONS: Lesson[] = [
  {
    id: 'lesson-101',
    courseId: 'course-1',
    moduleTitle: 'Module 1: Modern React Foundations',
    title: '1. Welcome to the Complete React Developer Course',
    duration: '08:24',
    videoUrl: 'https://example.com/video/101',
    isPreview: true,
    completedByDefault: true,
    summary: 'Overview of the course roadmap, project architecture, and setting up your local Vite + TypeScript workspace.',
  },
  {
    id: 'lesson-102',
    courseId: 'course-1',
    moduleTitle: 'Module 1: Modern React Foundations',
    title: '2. Declarative UI, JSX & Component Composition',
    duration: '18:45',
    videoUrl: 'https://example.com/video/102',
    isPreview: true,
    completedByDefault: true,
    summary: 'How React turns component trees into DOM updates, prop design patterns, and avoiding common composition pitfalls.',
  },
  {
    id: 'lesson-103',
    courseId: 'course-1',
    moduleTitle: 'Module 2: State, Effects & Custom Hooks',
    title: '3. Deep Dive into useState, useReducer & Immutable State',
    duration: '24:10',
    videoUrl: 'https://example.com/video/103',
    isPreview: false,
    completedByDefault: true,
    summary: 'Choosing between local state and reducers, batching behavior, and modeling complex interactive forms.',
  },
  {
    id: 'lesson-104',
    courseId: 'course-1',
    moduleTitle: 'Module 2: State, Effects & Custom Hooks',
    title: '4. Synchronizing with External Systems & Custom Hooks',
    duration: '29:05',
    videoUrl: 'https://example.com/video/104',
    isPreview: false,
    completedByDefault: false,
    summary: 'Extracting reusable logic into clean custom hooks with proper cleanup and TypeScript generics.',
  },
  {
    id: 'lesson-201',
    courseId: 'course-2',
    moduleTitle: 'Module 1: Python Data Toolkit',
    title: '1. NumPy Vectorization & Memory Layout',
    duration: '21:15',
    videoUrl: 'https://example.com/video/201',
    isPreview: true,
    completedByDefault: true,
    summary: 'Why vectorized array operations outperform Python loops by orders of magnitude.',
  },
  {
    id: 'lesson-301',
    courseId: 'course-3',
    moduleTitle: 'Module 1: Visual Hierarchy & Systems',
    title: '1. Establishing an 8px Spatial Grid & Type Scale',
    duration: '19:30',
    videoUrl: 'https://example.com/video/301',
    isPreview: true,
    completedByDefault: true,
    summary: 'Practical typography pairings, rhythm, contrast ratios, and responsive breakpoints at 1440, 768, and 375.',
  },
];

export const COMMENTS: CourseComment[] = [
  {
    id: 'comment-1',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    lessonId: 'lesson-103',
    lessonTitle: '3. Deep Dive into useState, useReducer & Immutable State',
    authorName: 'Sara Ali',
    authorAvatar: 'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Student',
    content: 'The comparison between state machines and useReducer cleared up so much confusion in our checkout flow. Could you share an example with optimistic UI updates too?',
    createdAt: '2 hours ago',
    status: 'Approved',
    repliesCount: 2,
  },
  {
    id: 'comment-2',
    courseId: 'course-2',
    courseTitle: 'Python for Data Science',
    lessonId: 'lesson-201',
    lessonTitle: '1. NumPy Vectorization & Memory Layout',
    authorName: 'Karim Tarek',
    authorAvatar: 'https://images.unsplash.com/photo-1574281570912-bf4355571765?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Student',
    content: 'When broadcasting a 2D matrix with a 1D row vector, does NumPy allocate a new copy in memory or use stride tricks?',
    createdAt: '5 hours ago',
    status: 'Pending review',
    repliesCount: 0,
  },
  {
    id: 'comment-3',
    courseId: 'course-4',
    courseTitle: 'Ethical Hacking Fundamentals',
    lessonId: 'lesson-101',
    lessonTitle: 'Lab Environment Setup',
    authorName: 'Yasmine Adel',
    authorAvatar: 'https://images.unsplash.com/photo-1776111842991-4a189c07e609?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Student',
    content: 'Check out this external link for discounted third-party exam dumps and promo codes!',
    createdAt: '1 day ago',
    status: 'Flagged',
    flagReason: 'Suspected promotional spam / unauthorized exam dump link',
    repliesCount: 0,
  },
  {
    id: 'comment-4',
    courseId: 'course-3',
    courseTitle: 'UI/UX Design Masterclass',
    lessonId: 'lesson-301',
    lessonTitle: '1. Establishing an 8px Spatial Grid & Type Scale',
    authorName: 'Sara Ali',
    authorAvatar: 'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Student',
    content: 'Using Baloo 2 for headings paired with Nunito Sans for dense tables makes the dashboard feel so friendly without losing readability.',
    createdAt: '2 days ago',
    status: 'Approved',
    repliesCount: 4,
  },
];

export const EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: 'q-1',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    question: 'Why should state updates in React always treat objects and arrays as immutable?',
    options: [
      'Because React uses reference equality (Object.is) to detect state changes and schedule re-renders',
      'Because JavaScript freezes all variables inside functional components automatically',
      'Because mutating objects causes a syntax error in TypeScript 5.7',
      'Because React stores component state inside browser localStorage by default',
    ],
    correctIndex: 0,
    difficulty: 'Easy',
    points: 10,
    explanation: 'React compares the previous state reference with the next state reference using Object.is. Mutating in place keeps the same reference and skips re-rendering.',
  },
  {
    id: 'q-2',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    question: 'When is useReducer generally preferred over useState in a React component?',
    options: [
      'Whenever the state is a single boolean flag',
      'When next state depends on complex transitions across multiple related sub-values',
      'Only when fetching data inside a Server Component',
      'When you want to bypass React re-renders completely',
    ],
    correctIndex: 1,
    difficulty: 'Medium',
    points: 15,
    explanation: 'useReducer centralizes state transition logic when multiple state fields change together in response to well-defined actions.',
  },
  {
    id: 'q-3',
    courseId: 'course-2',
    courseTitle: 'Python for Data Science',
    question: 'Which Pandas method selects rows and columns strictly by integer position?',
    options: ['df.loc[]', 'df.iloc[]', 'df.query()', 'df.groupby()'],
    correctIndex: 1,
    difficulty: 'Easy',
    points: 10,
    explanation: 'df.iloc[] performs integer-location based indexing, whereas df.loc[] is label-based.',
  },
  {
    id: 'q-4',
    courseId: 'course-3',
    courseTitle: 'UI/UX Design Masterclass',
    question: 'What is the minimum WCAG 2.2 AA contrast ratio required for normal body text (16px)?',
    options: ['2.5 : 1', '3.0 : 1', '4.5 : 1', '7.0 : 1'],
    correctIndex: 2,
    difficulty: 'Medium',
    points: 15,
    explanation: 'WCAG 2.2 Level AA requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text.',
  },
];

export const EXAMS: ExamConfig[] = [
  {
    id: 'exam-1',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    title: 'React Architecture & Hooks Certification Exam',
    durationMinutes: 45,
    passingScore: 75,
    totalQuestions: 20,
    attemptsAllowed: 3,
    shuffleQuestions: true,
    lastScore: 88,
    passed: true,
  },
  {
    id: 'exam-2',
    courseId: 'course-2',
    courseTitle: 'Python for Data Science',
    title: 'Data Analysis & NumPy Assessment',
    durationMinutes: 40,
    passingScore: 70,
    totalQuestions: 15,
    attemptsAllowed: 2,
    shuffleQuestions: true,
  },
  {
    id: 'exam-3',
    courseId: 'course-3',
    courseTitle: 'UI/UX Design Masterclass',
    title: 'Design Systems & Accessibility Final Exam',
    durationMinutes: 30,
    passingScore: 80,
    totalQuestions: 15,
    attemptsAllowed: 3,
    shuffleQuestions: false,
    lastScore: 94,
    passed: true,
  },
];

export const CERTIFICATES: CertificateRecord[] = [
  {
    id: 'cert-101',
    verificationCode: 'EDU-2026-000123',
    studentId: 'user-student-1',
    studentName: 'Sara Ali',
    courseId: 'course-1',
    courseTitle: 'Complete React Developer Course',
    instructorName: 'Ahmed Hassan',
    issuedAt: 'March 24, 2026',
    grade: 'Distinction',
    scorePercent: 86,
    status: 'Valid',
  },
  {
    id: 'cert-102',
    verificationCode: 'EDU-2026-000124',
    studentId: 'user-student-1',
    studentName: 'Sara Ali',
    courseId: 'course-3',
    courseTitle: 'UI/UX Design Masterclass',
    instructorName: 'Salma Nabil',
    issuedAt: 'March 12, 2026',
    grade: 'Distinction',
    scorePercent: 94,
    status: 'Valid',
  },
  {
    id: 'cert-103',
    verificationCode: 'EDU-2026-000125',
    studentId: 'user-stu-2',
    studentName: 'Karim Tarek',
    courseId: 'course-9',
    courseTitle: 'Web Accessibility & Inclusive Interface Engineering',
    instructorName: 'Ahmed Hassan',
    issuedAt: 'February 27, 2026',
    grade: 'Distinction',
    scorePercent: 91,
    status: 'Valid',
  },
];

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Certificate ready to download',
    message: 'Congratulations Sara! Your certificate for UI/UX Design Masterclass has been verified and issued.',
    createdAt: '25 minutes ago',
    read: false,
    type: 'certificate',
    link: '/certificates/cert-101',
  },
  {
    id: 'notif-2',
    title: 'Ahmed Hassan replied to your question',
    message: 'New instructor response in Lesson 3: Deep Dive into useState, useReducer & Immutable State.',
    createdAt: '2 hours ago',
    read: false,
    type: 'course',
    link: '/learn/course-1/lesson-103',
  },
  {
    id: 'notif-3',
    title: 'Practice exam unlocked',
    message: 'You reached 68% in Complete React Developer Course. Take the practice exam anytime.',
    createdAt: 'Yesterday',
    read: true,
    type: 'exam',
    link: '/exam/course-1',
  },
  {
    id: 'notif-4',
    title: 'Course review queue updated',
    message: '2 courses (Cloud Security & Applied NLP) are awaiting supervisor syllabus review.',
    createdAt: '2 days ago',
    read: true,
    type: 'moderation',
    link: '/supervisor/course-review',
  },
];

export const ACHIEVEMENT_BADGES: AchievementBadge[] = [
  {
    id: 'badge-1',
    title: '14-day streak',
    description: 'Completed at least one lesson every day for two full weeks.',
    earned: true,
    earnedAt: 'Earned today',
    color: 'gold',
  },
  {
    id: 'badge-2',
    title: 'Top 5% exam scorer',
    description: 'Scored above 90% on a final certification exam on the first attempt.',
    earned: true,
    earnedAt: 'Mar 12, 2025',
    color: 'purple',
  },
  {
    id: 'badge-3',
    title: 'Helpful peer mentor',
    description: 'Had 10+ lesson answers upvoted by instructors and fellow students.',
    earned: true,
    earnedAt: 'Feb 28, 2025',
    color: 'orange',
  },
  {
    id: 'badge-4',
    title: 'Full-stack finisher',
    description: 'Complete 3 Web development track courses with verified certificates.',
    earned: false,
    color: 'green',
  },
];

export const MODERATION_REPORTS: ModerationReport[] = [
  {
    id: 'rep-1',
    targetType: 'Comment',
    targetTitle: 'Promotional spam link in Ethical Hacking Fundamentals',
    reportedBy: 'Omar Fathy (Instructor)',
    reason: 'External link advertising unauthorized exam dumps.',
    severity: 'High',
    createdAt: '3 hours ago',
    status: 'Open',
  },
  {
    id: 'rep-2',
    targetType: 'Course',
    targetTitle: 'Cloud Security & AWS Penetration Testing',
    reportedBy: 'Automated Quality Check',
    reason: 'Module 4 lab instructions need safety disclaimer verification before publishing.',
    severity: 'Medium',
    createdAt: '1 day ago',
    status: 'Investigating',
  },
  {
    id: 'rep-3',
    targetType: 'User',
    targetTitle: 'Yasmine Adel (yasmine.adel@eduhub.com)',
    reportedBy: 'Hana Mostafa (Supervisor)',
    reason: 'Repeated duplicate comments across three course discussion boards.',
    severity: 'Low',
    createdAt: '3 days ago',
    status: 'Resolved',
  },
];

export const TOP_INSTRUCTORS: InstructorHighlight[] = [
  {
    id: 'user-instructor-1',
    name: 'Ahmed Hassan',
    field: 'Development & Software Architecture',
    avatar: 'https://images.unsplash.com/photo-1679476819592-3e233227fd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    learnersCount: '18,450',
    rating: 4.9,
    coursesCount: 4,
    bio: 'Principal Frontend Architect with 12+ years building high-scale React and TypeScript platforms.',
  },
  {
    id: 'user-inst-2',
    name: 'Dr. Mona Adel',
    field: 'Data Science & Machine Learning',
    avatar: 'https://images.unsplash.com/photo-1697063882499-f7fca7d2d713?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    learnersCount: '14,200',
    rating: 4.9,
    coursesCount: 3,
    bio: 'AI researcher and lead data scientist teaching practical Python, PyTorch, and LLM applications.',
  },
  {
    id: 'user-inst-3',
    name: 'Salma Nabil',
    field: 'Product Design & Design Systems',
    avatar: 'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    learnersCount: '12,900',
    rating: 4.9,
    coursesCount: 3,
    bio: 'Staff Product Designer specializing in multi-brand Figma token architectures and inclusive UX.',
  },
  {
    id: 'user-inst-4',
    name: 'Omar Fathy',
    field: 'Cybersecurity & Cloud Defense',
    avatar: 'https://images.unsplash.com/photo-1633625510483-c177f4308f33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    learnersCount: '9,640',
    rating: 4.8,
    coursesCount: 2,
    bio: 'OSCP and CISSP certified security engineer guiding teams through hands-on ethical hacking labs.',
  },
];

export const STUDENT_TESTIMONIALS: StudentTestimonial[] = [
  {
    id: 'test-1',
    name: 'Sara Ali',
    role: 'Junior Frontend Engineer at PayMob',
    avatar: 'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    courseTitle: 'Complete React Developer Course',
    rating: 5,
    quote: 'The combination of bite-sized video lessons, real-time progress tracking, and a proctored final exam helped me land my first frontend engineering role within two months.',
  },
  {
    id: 'test-2',
    name: 'Karim Tarek',
    role: 'Data Analyst at Vodafone Intelligent Solutions',
    avatar: 'https://images.unsplash.com/photo-1574281570912-bf4355571765?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    courseTitle: 'Python for Data Science',
    rating: 5,
    quote: 'Dr. Mona explains NumPy vectorization and Pandas pipelines with real production datasets. Sharing my verified EduHub certificate on LinkedIn immediately stood out to recruiters.',
  },
  {
    id: 'test-3',
    name: 'Nadia Mansour',
    role: 'Product Designer at Instabug',
    avatar: 'https://images.unsplash.com/photo-1730469344658-f442e279df9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    courseTitle: 'UI/UX Design Masterclass',
    rating: 5,
    quote: 'Salma’s modules on 8px spatial grids, typography scales, and accessible component states transformed how I collaborate with frontend engineers every single day.',
  },
];

export const SUBCATEGORIES_BY_CATEGORY: Record<string, SubcategoryItem[]> = {
  'cat-web': [
    { id: 'sub-react', name: 'React & Frontend', count: 14 },
    { id: 'sub-node', name: 'Node.js & TypeScript', count: 9 },
    { id: 'sub-sql', name: 'SQL & Databases', count: 5 },
  ],
  'cat-design': [
    { id: 'sub-uiux', name: 'UI/UX & Product Design', count: 10 },
    { id: 'sub-systems', name: 'Design Systems & Tokens', count: 5 },
    { id: 'sub-mobile', name: 'Mobile Prototyping', count: 4 },
  ],
  'cat-business': [
    { id: 'sub-pm', name: 'Product Management', count: 9 },
    { id: 'sub-a11y', name: 'Inclusive & Accessible Ops', count: 7 },
  ],
  'cat-data': [
    { id: 'sub-python', name: 'Python & Pandas', count: 12 },
    { id: 'sub-ml', name: 'Machine Learning & PyTorch', count: 10 },
  ],
  'cat-marketing': [
    { id: 'sub-growth', name: 'Growth & SQL Analytics', count: 8 },
    { id: 'sub-content', name: 'Content & SEO Strategy', count: 6 },
  ],
  'cat-languages': [
    { id: 'sub-nlp', name: 'NLP & Language Models', count: 6 },
    { id: 'sub-eng', name: 'Technical Communication', count: 5 },
  ],
  'cat-security': [
    { id: 'sub-pentest', name: 'Ethical Hacking & OWASP', count: 7 },
    { id: 'sub-cloudsec', name: 'Cloud & AWS Security', count: 5 },
  ],
  'cat-photo': [
    { id: 'sub-visual', name: 'Visual Storytelling & Mobile', count: 5 },
    { id: 'sub-lighting', name: 'Studio Lighting', count: 4 },
  ],
};

/**
 * Deterministic course metadata enrichment so all 12 courses support every filter
 * (duration buckets 0-2h, 2-5h, 5-10h, 10h+, languages, subcategories, certificates, exams, and 3+ preview bullets)
 */
export const COURSE_FILTER_META: Record<
  string,
  {
    subcategoryId: string;
    subcategoryName: string;
    durationHours: number;
    durationBucket: '0-2h' | '2-5h' | '5-10h' | '10h+';
    language: 'English' | 'English & Arabic CC' | 'Spanish CC';
    includesCertificate: boolean;
    includesExam: boolean;
    learningBullets: string[];
  }
> = {
  'course-1': {
    subcategoryId: 'sub-react',
    subcategoryName: 'React & Frontend',
    durationHours: 28.6,
    durationBucket: '10h+',
    language: 'English & Arabic CC',
    includesCertificate: true,
    includesExam: true,
    learningBullets: [
      'Architect scalable React 19 apps with custom hooks and TypeScript 5.7',
      'Manage complex state transitions with useReducer, Context, and Data Router',
      'Optimize Core Web Vitals, memoization, and automated integration tests',
    ],
  },
  'course-2': {
    subcategoryId: 'sub-python',
    subcategoryName: 'Python & Pandas',
    durationHours: 24.2,
    durationBucket: '10h+',
    language: 'English',
    includesCertificate: true,
    includesExam: true,
    learningBullets: [
      'Clean, transform, and aggregate million-row datasets using Pandas & NumPy',
      'Create publication-grade statistical charts with Matplotlib and Seaborn',
      'Build and validate regression and classification pipelines in Scikit-Learn',
    ],
  },
  'course-3': {
    subcategoryId: 'sub-uiux',
    subcategoryName: 'UI/UX & Product Design',
    durationHours: 21.1,
    durationBucket: '10h+',
    language: 'English & Arabic CC',
    includesCertificate: true,
    includesExam: true,
    learningBullets: [
      'Conduct structured user interviews and synthesize actionable journey maps',
      'Design responsive 1440/768/375 layouts on an 8px spatial grid in Figma',
      'Build multi-state component libraries with WCAG 2.2 AA contrast compliance',
    ],
  },
  'course-4': {
    subcategoryId: 'sub-pentest',
    subcategoryName: 'Ethical Hacking & OWASP',
    durationHours: 8.5,
    durationBucket: '5-10h',
    language: 'English',
    includesCertificate: true,
    includesExam: true,
    learningBullets: [
      'Perform network reconnaissance and enumeration in isolated lab environments',
      'Identify and remediate OWASP Top 10 web application vulnerabilities',
      'Write clear executive penetration testing reports with remediation priorities',
    ],
  },
  'course-5': {
    subcategoryId: 'sub-node',
    subcategoryName: 'Node.js & TypeScript',
    durationHours: 31.0,
    durationBucket: '10h+',
    language: 'English',
    includesCertificate: true,
    includesExam: true,
    learningBullets: [
      'Design type-safe REST and GraphQL APIs with Node.js and Express/Fastify',
      'Model relational schemas with PostgreSQL, Prisma, and Redis caching',
      'Deploy containerized services with automated GitHub Actions CI/CD pipelines',
    ],
  },
  'course-6': {
    subcategoryId: 'sub-ml',
    subcategoryName: 'Machine Learning & PyTorch',
    durationHours: 27.5,
    durationBucket: '10h+',
    language: 'English',
    includesCertificate: true,
    includesExam: true,
    learningBullets: [
      'Build custom neural network architectures using PyTorch tensors and autograd',
      'Prevent overfitting with regularization, dropout, and cross-validation',
      'Export and serve trained ML models behind low-latency inference endpoints',
    ],
  },
  'course-7': {
    subcategoryId: 'sub-systems',
    subcategoryName: 'Design Systems & Tokens',
    durationHours: 4.5,
    durationBucket: '2-5h',
    language: 'English & Arabic CC',
    includesCertificate: true,
    includesExam: false,
    learningBullets: [
      'Structure semantic color, typography, and spacing tokens with Figma Variables',
      'Document default, hover, focus, disabled, loading, and error component states',
      'Align Figma component props directly with React and Tailwind CSS APIs',
    ],
  },
  'course-8': {
    subcategoryId: 'sub-cloudsec',
    subcategoryName: 'Cloud & AWS Security',
    durationHours: 22.1,
    durationBucket: '10h+',
    language: 'English',
    includesCertificate: true,
    includesExam: true,
    learningBullets: [
      'Audit AWS IAM policies, privilege escalation paths, and S3 bucket policies',
      'Secure Kubernetes clusters, container registries, and serverless functions',
      'Automate cloud compliance monitoring and incident response playbooks',
    ],
  },
  'course-9': {
    subcategoryId: 'sub-a11y',
    subcategoryName: 'Inclusive & Accessible Ops',
    durationHours: 1.8,
    durationBucket: '0-2h',
    language: 'English & Arabic CC',
    includesCertificate: true,
    includesExam: true,
    learningBullets: [
      'Audit web interfaces against WCAG 2.2 Level AA success criteria',
      'Implement roving tabindex, focus traps, and ARIA live announcements',
      'Test user flows with VoiceOver, NVDA, and keyboard-only navigation',
    ],
  },
  'course-10': {
    subcategoryId: 'sub-growth',
    subcategoryName: 'Growth & SQL Analytics',
    durationHours: 7.5,
    durationBucket: '5-10h',
    language: 'Spanish CC',
    includesCertificate: true,
    includesExam: true,
    learningBullets: [
      'Write complex window functions, CTEs, and cohort retention queries in SQL',
      'Read EXPLAIN ANALYZE query plans and tune B-Tree and GIN indexes',
      'Design high-throughput transactional schemas without lock contention',
    ],
  },
  'course-11': {
    subcategoryId: 'sub-visual',
    subcategoryName: 'Visual Storytelling & Mobile',
    durationHours: 3.8,
    durationBucket: '2-5h',
    language: 'English',
    includesCertificate: false,
    includesExam: false,
    learningBullets: [
      'Design ergonomic iOS and Android navigation patterns and thumb zones',
      'Prototype spring animations, smart transitions, and gesture interactions',
      'Run moderated usability tests on interactive mobile prototypes',
    ],
  },
  'course-12': {
    subcategoryId: 'sub-nlp',
    subcategoryName: 'NLP & Language Models',
    durationHours: 25.6,
    durationBucket: '10h+',
    language: 'English',
    includesCertificate: true,
    includesExam: true,
    learningBullets: [
      'Build production Retrieval-Augmented Generation (RAG) pipelines with vector DBs',
      'Fine-tune transformer embeddings and evaluate hallucination metrics',
      'Design prompt guardrails, caching layers, and structured JSON outputs',
    ],
  },
};

/**
 * 8 Curriculum Sections (54 lessons, 12h 30m total) for Course Details (/courses/:id)
 */
export const COURSE_CURRICULUM_SECTIONS: CurriculumSection[] = [
  {
    id: 'sec-1',
    title: 'Section 1: Course orientation & modern workspace setup',
    lessonsCount: 6,
    totalDuration: '1h 15m',
    lessons: [
      {
        id: 'lesson-101',
        title: 'Welcome to the course & architecture tour',
        type: 'video',
        duration: '08:24',
        isPreview: true,
      },
      {
        id: 'lesson-102',
        title: 'Configuring Vite, TypeScript 5.7 & ESLint',
        type: 'video',
        duration: '14:50',
        isPreview: true,
      },
      {
        id: 'lesson-103-read',
        title: 'Starter repository structure & keyboard shortcuts guide',
        type: 'reading',
        duration: '10:00',
        isPreview: false,
      },
      {
        id: 'lesson-104-quiz',
        title: 'Section 1 knowledge check',
        type: 'exam',
        duration: '15:00',
        isPreview: false,
      },
    ],
  },
  {
    id: 'sec-2',
    title: 'Section 2: Core mental models & component architecture',
    lessonsCount: 7,
    totalDuration: '1h 45m',
    lessons: [
      {
        id: 'lesson-201',
        title: 'Declarative rendering, Virtual DOM & reconciliation',
        type: 'video',
        duration: '18:45',
        isPreview: true,
      },
      {
        id: 'lesson-202',
        title: 'Designing composable component APIs with TypeScript',
        type: 'video',
        duration: '22:10',
      },
      {
        id: 'lesson-203',
        title: 'Compound components vs. configuration props',
        type: 'reading',
        duration: '12:00',
      },
    ],
  },
  {
    id: 'sec-3',
    title: 'Section 3: State management, reducers & custom hooks',
    lessonsCount: 8,
    totalDuration: '2h 05m',
    lessons: [
      {
        id: 'lesson-103',
        title: 'Deep dive into useState, useReducer & immutable state',
        type: 'video',
        duration: '24:10',
      },
      {
        id: 'lesson-104',
        title: 'Synchronizing with external systems & custom hooks',
        type: 'video',
        duration: '29:05',
      },
      {
        id: 'lesson-303',
        title: 'State machine lab & debugging stale closures',
        type: 'exam',
        duration: '20:00',
      },
    ],
  },
  {
    id: 'sec-4',
    title: 'Section 4: Routing, URL search params & data loading',
    lessonsCount: 7,
    totalDuration: '1h 40m',
    lessons: [
      {
        id: 'lesson-401',
        title: 'Nested layouts, role guards & URL query synchronization',
        type: 'video',
        duration: '26:30',
      },
      {
        id: 'lesson-402',
        title: 'Optimistic UI updates & error boundaries',
        type: 'video',
        duration: '19:45',
      },
    ],
  },
  {
    id: 'sec-5',
    title: 'Section 5: Design systems, accessibility & keyboard flows',
    lessonsCount: 7,
    totalDuration: '1h 35m',
    lessons: [
      {
        id: 'lesson-501',
        title: 'Building accessible modals, drawers & comboboxes',
        type: 'video',
        duration: '23:15',
      },
      {
        id: 'lesson-502',
        title: 'WCAG 2.2 AA audit checklist & screen reader testing',
        type: 'reading',
        duration: '14:00',
      },
    ],
  },
  {
    id: 'sec-6',
    title: 'Section 6: Performance profiling & bundle optimization',
    lessonsCount: 6,
    totalDuration: '1h 20m',
    lessons: [
      {
        id: 'lesson-601',
        title: 'Flamegraph profiling, code splitting & lazy boundaries',
        type: 'video',
        duration: '21:40',
      },
      {
        id: 'lesson-602',
        title: 'Memory leak detection & network waterfall tuning',
        type: 'reading',
        duration: '15:00',
      },
    ],
  },
  {
    id: 'sec-7',
    title: 'Section 7: Automated testing with Vitest & Playwright',
    lessonsCount: 7,
    totalDuration: '1h 30m',
    lessons: [
      {
        id: 'lesson-701',
        title: 'Testing hooks, user interactions & async forms',
        type: 'video',
        duration: '25:10',
      },
      {
        id: 'lesson-702',
        title: 'End-to-end authentication & checkout test suite',
        type: 'video',
        duration: '22:00',
      },
    ],
  },
  {
    id: 'sec-8',
    title: 'Section 8: Capstone project & final certification exam',
    lessonsCount: 6,
    totalDuration: '1h 20m',
    lessons: [
      {
        id: 'lesson-801',
        title: 'Production deployment & CI/CD release checklist',
        type: 'reading',
        duration: '15:00',
      },
      {
        id: 'lesson-802',
        title: 'Final timed certification exam (75% passing score)',
        type: 'exam',
        duration: '45:00',
      },
    ],
  },
];

export const INITIAL_COURSE_REVIEWS: CourseReview[] = [
  {
    id: 'rev-1',
    courseId: 'course-1',
    authorName: 'Sara Ali',
    authorAvatar: 'https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Frontend Engineering Learner',
    rating: 5,
    createdAt: '2 days ago',
    comment:
      'Best structured technical course I have taken. Every section pairs clear mental models with a real production feature, and the final exam genuinely tests your understanding rather than memorization.',
    helpfulCount: 38,
  },
  {
    id: 'rev-2',
    courseId: 'course-1',
    authorName: 'Karim Tarek',
    authorAvatar: 'https://images.unsplash.com/photo-1574281570912-bf4355571765?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Junior Full-Stack Developer',
    rating: 5,
    createdAt: '1 week ago',
    comment:
      'The custom hooks and URL state synchronization modules solved an exact problem we had at work. Highly recommend downloading the starter repo and coding along.',
    helpfulCount: 24,
  },
  {
    id: 'rev-3',
    courseId: 'course-1',
    authorName: 'Nadia Mansour',
    authorAvatar: 'https://images.unsplash.com/photo-1730469344658-f442e279df9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Product Designer & UI Engineer',
    rating: 5,
    createdAt: '2 weeks ago',
    comment:
      'I loved Section 5 on accessible component states and keyboard flows. The instructor explains both the engineering why and the UX impact.',
    helpfulCount: 19,
  },
  {
    id: 'rev-4',
    courseId: 'course-1',
    authorName: 'Tarek El-Sayed',
    authorAvatar: 'https://images.unsplash.com/photo-1633625510483-c177f4308f33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Software Engineer',
    rating: 4,
    createdAt: '3 weeks ago',
    comment:
      'Great pacing and crystal-clear audio. Adding even more advanced performance profiling exercises in Section 6 would make it 11/10.',
    helpfulCount: 11,
  },
  {
    id: 'rev-5',
    courseId: 'course-1',
    authorName: 'Mariam Adel',
    authorAvatar: 'https://images.unsplash.com/photo-1697063882499-f7fca7d2d713?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    authorRole: 'Computer Science Senior',
    rating: 5,
    createdAt: '1 month ago',
    comment:
      'Passed the certification exam with 92% and added the verified credential to my resume. The practice quizzes after each section prepared me really well.',
    helpfulCount: 29,
  },
];
