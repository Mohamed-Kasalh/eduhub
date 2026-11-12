import type {
  ActiveSessionDto,
  AdminActivityItemDto,
  CategoryDto,
  CertificateDto,
  CommentDto,
  CourseDto,
  CourseReviewDto,
  CourseReviewSubmissionDto,
  CurriculumSectionDto,
  ExamAttemptSummaryDto,
  ExamConfigDto,
  ModerationReportDto,
  NotificationDto,
  NotificationPreferencesDto,
  PendingInstructorApplicationDto,
  PlatformSettingsDto,
  QuestionDto,
  RolePermissionItemDto,
  SupervisorAuditActionDto,
  TestimonialDto,
  UploadResponseDto,
  UserDto,
} from '../api/dto';

export interface MockUserRecord {
  user: UserDto;
  password: string;
  sessions: ActiveSessionDto[];
  wishlistCourseIds: string[];
  recentSearches: string[];
}

export interface MockPendingRegistration {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'instructor';
  code: string;
  otpSentAtMs: number;
}

export interface MockPasswordResetRecord {
  email: string;
  code: string;
  expiresAtMs: number;
}

export interface MockRefreshTokenRecord {
  userId: string;
  sessionId: string;
  revoked: boolean;
}

export interface MockLessonProgressState {
  watchPercent: number;
  lastPositionSeconds: number;
  completed: boolean;
}

export interface MockEnrollmentRecord {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  lastAccessedAt: string | null;
  lastLessonId: string | null;
  lessonProgress: Record<string, MockLessonProgressState>;
  certificateId: string | null;
}

export interface MockExamAttemptRecord {
  id: string;
  attemptNumber: number;
  userId: string;
  courseId: string;
  status: 'in_progress' | 'submitted' | 'expired';
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  durationSeconds: number;
  passingScorePercent: number;
  questions: Array<QuestionDto & { number: number; displayOptions: string[]; displayCorrectIndices: number[] }>;
  answers: Record<string, number[]>;
  flaggedQuestionIds: string[];
  scorePercent: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  passed: boolean;
}

export interface MockCourseReviewRecord {
  review: CourseReviewDto;
  helpfulUserIds: string[];
}

export interface MockCommentLikeState {
  commentLikedUserIds: Record<string, string[]>;
  replyLikedUserIds: Record<string, string[]>;
}

export interface MockDbState {
  idCounter: number;
  users: Record<string, MockUserRecord>;
  emailAliases: Record<string, string>;
  pendingRegistrations: Record<string, MockPendingRegistration>;
  passwordResets: Record<string, MockPasswordResetRecord>;
  refreshTokens: Record<string, MockRefreshTokenRecord>;
  revokedAccessTokens: string[];
  categories: CategoryDto[];
  courses: CourseDto[];
  curricula: Record<string, CurriculumSectionDto[]>;
  reviews: MockCourseReviewRecord[];
  enrollments: MockEnrollmentRecord[];
  comments: CommentDto[];
  commentLikes: MockCommentLikeState;
  questions: QuestionDto[];
  examConfigs: Record<string, ExamConfigDto>;
  examAttempts: MockExamAttemptRecord[];
  certificates: CertificateDto[];
  notifications: NotificationDto[];
  courseReviewSubmissions: CourseReviewSubmissionDto[];
  reports: ModerationReportDto[];
  instructorApplications: PendingInstructorApplicationDto[];
  testimonials: TestimonialDto[];
  newsletterSubscribers: string[];
  platformSettings: PlatformSettingsDto;
  permissionsMatrix: RolePermissionItemDto[];
  uploads: UploadResponseDto[];
  supervisorAuditActions: SupervisorAuditActionDto[];
  adminActivity: AdminActivityItemDto[];
}

const DEFAULT_PREFS: NotificationPreferencesDto = {
  courseReplies: { inApp: true, email: true },
  examResults: { inApp: true, email: true },
  certificates: { inApp: true, email: true },
  moderation: { inApp: true, email: false },
  announcements: { inApp: true, email: false },
};

function makeInstructorCourseCurriculum(
  courseId: string,
  sectionIds: [string, string, string, string],
  lessonOffset: number
): CurriculumSectionDto[] {
  const sectionTitles = [
    'Foundations & Architecture',
    'Core Patterns & State',
    'Production Workflows & Performance',
    'Testing & Deployment',
  ];
  const lessonTitles = [
    'Course Overview & Local Setup',
    'Mental Model & Project Structure',
    'Component Composition & Typed Props',
    'Hooks & Predictable State Management',
    'Async Data Flows & Error Boundaries',
    'Routing, Guards & Deep Linking',
    'Forms, Validation & Accessible Inputs',
    'Profiling & Rendering Optimization',
    'Design Tokens & Responsive Layouts',
    'Unit & Integration Testing with Vitest',
    'End-to-End Verification Checklist',
    'Production Build & Release Strategy',
  ];

  const sections: CurriculumSectionDto[] = [];
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const secId = sectionIds[sIdx];
    const lessons = [];
    for (let lIdx = 0; lIdx < 3; lIdx++) {
      const globalNum = sIdx * 3 + lIdx + 1;
      const durationSeconds = 480 + globalNum * 45;
      lessons.push({
        id: `lesson-${lessonOffset + globalNum}`,
        sectionId: secId,
        courseId,
        number: globalNum,
        title: lessonTitles[globalNum - 1],
        type: (globalNum === 3 || globalNum === 9 ? 'reading' : 'video') as 'video' | 'reading' | 'exam',
        durationSeconds,
        isPreview: globalNum === 1,
        requiresPrevious: globalNum > 1,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        summary: `Hands-on walkthrough covering ${lessonTitles[globalNum - 1].toLowerCase()} with practical refactoring steps.`,
        keyTakeaways: [
          `Apply clean patterns for ${lessonTitles[globalNum - 1].toLowerCase()}`,
          'Avoid common state synchronization pitfalls',
          'Validate edge cases early with strict types',
        ],
        attachments:
          globalNum % 2 === 1
            ? [
                {
                  id: `att-${courseId}-${globalNum}`,
                  title: `Lesson ${globalNum} Workbook.pdf`,
                  fileType: 'pdf' as const,
                  sizeBytes: 1_240_000 + globalNum * 85_000,
                  description: 'Reference guide and annotated code samples.',
                  url: `https://cdn.eduhub.com/attachments/${courseId}-lesson-${globalNum}.pdf`,
                },
              ]
            : [],
      });
    }
    const sectionDuration = lessons.reduce((acc, item) => acc + item.durationSeconds, 0);
    sections.push({
      id: secId,
      title: sectionTitles[sIdx],
      subtitle: `Module ${sIdx + 1}`,
      order: sIdx,
      lessonsCount: lessons.length,
      durationSeconds: sectionDuration,
      lessons,
    });
  }
  return sections;
}

function makeCourseQuestions(
  courseId: string,
  courseTitle: string,
  sections: CurriculumSectionDto[],
  idPrefix: string,
  count: number
): QuestionDto[] {
  const difficulties: Array<'easy' | 'medium' | 'hard'> = [
    'easy',
    'easy',
    'medium',
    'medium',
    'hard',
  ];
  const questions: QuestionDto[] = [];
  for (let i = 0; i < count; i++) {
    const section = sections[i % sections.length];
    const difficulty = difficulties[i % difficulties.length];
    const qType: 'single' | 'multiple' | 'boolean' =
      i % 5 === 4 ? 'boolean' : i % 4 === 3 ? 'multiple' : 'single';
    const isBool = qType === 'boolean';
    const isMulti = qType === 'multiple';

    questions.push({
      id: `${idPrefix}-${i + 1}`,
      courseId,
      courseTitle,
      sectionId: section.id,
      sectionName: section.title,
      type: qType,
      prompt: `Q${i + 1} (${courseTitle}): Which principle best demonstrates ${section.title} in lesson practice?`,
      options: isBool
        ? ['True', 'False']
        : [
            `Deterministic ${section.title.toLowerCase()} flow`,
            'Mutating shared state directly inside render',
            isMulti ? 'Strict validation at module boundaries' : 'Skipping boundary error handling',
            'Hardcoding unvalidated environment constants',
          ],
      correctIndices: isBool ? [0] : isMulti ? [0, 2] : [0],
      difficulty,
      points: difficulty === 'hard' ? 10 : difficulty === 'medium' ? 5 : 4,
      timesUsed: 12 + (i % 7),
      explanation: `Deterministic ${section.title.toLowerCase()} design guarantees predictable updates and simpler testing.`,
      imageUrl: i === 2 ? 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600' : null,
      imageCaption: i === 2 ? 'Architecture dependency flow diagram' : null,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-03-10T14:00:00.000Z',
    });
  }
  return questions;
}

/** Builds a clean, deterministic seeded database snapshot for MSW handlers and tests. */
export function createInitialMockDbState(): MockDbState {
  const users: Record<string, MockUserRecord> = {
    'user-student-1': {
      password: 'EduHub#2025',
      wishlistCourseIds: ['course-2', 'course-6'],
      recentSearches: ['React 19', 'TypeScript', 'UI/UX Design'],
      sessions: [
        {
          id: 'sess-stu-1',
          deviceName: 'MacBook Pro 14"',
          deviceType: 'desktop',
          browser: 'Chrome 134',
          location: 'Cairo, Egypt',
          lastActiveAt: '2026-03-25T12:00:00.000Z',
          isCurrent: true,
        },
        {
          id: 'sess-stu-2',
          deviceName: 'iPhone 16 Pro',
          deviceType: 'mobile',
          browser: 'Safari 18',
          location: 'Alexandria, Egypt',
          lastActiveAt: '2026-03-24T19:15:00.000Z',
          isCurrent: false,
        },
      ],
      user: {
        id: 'user-student-1',
        name: 'Sara Ali',
        email: 'sara.ali@eduhub.com',
        emailVerified: true,
        role: 'student',
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
        title: 'Product Engineer & Lifelong Learner',
        bio: 'Building accessible React interfaces and expanding full-stack testing skills.',
        phone: '+20 100 555 0142',
        links: {
          website: 'https://saraali.dev',
          linkedin: 'https://linkedin.com/in/sara-ali-dev',
          github: 'https://github.com/sara-ali',
        },
        expertiseTags: ['React', 'TypeScript', 'UI Systems'],
        notificationPreferences: DEFAULT_PREFS,
        joinedAt: '2025-09-10T08:30:00.000Z',
        lastLoginAt: '2026-03-25T11:55:00.000Z',
        coursesCount: 4,
        streakDays: 14,
        points: 2480,
        recentActivity: [
          {
            id: 'act-1',
            action: 'Completed React Architecture final exam (86%)',
            occurredAt: '2026-03-24T16:05:00.000Z',
          },
          {
            id: 'act-2',
            action: 'Downloaded certificate EDU-2026-000123',
            occurredAt: '2026-03-24T16:09:00.000Z',
          },
        ],
      },
    },
    'user-instructor-1': {
      password: 'EduHub#2025',
      wishlistCourseIds: [],
      recentSearches: ['Curriculum Design', 'Exam Banks'],
      sessions: [
        {
          id: 'sess-inst-1',
          deviceName: 'ThinkPad X1 Carbon',
          deviceType: 'desktop',
          browser: 'Firefox 136',
          location: 'Giza, Egypt',
          lastActiveAt: '2026-03-25T13:10:00.000Z',
          isCurrent: true,
        },
      ],
      user: {
        id: 'user-instructor-1',
        name: 'Ahmed Hassan',
        email: 'ahmed.hassan@eduhub.com',
        emailVerified: true,
        role: 'instructor',
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1679476819592-3e233227fd83?w=400',
        title: 'Principal Frontend Architect & Instructor',
        bio: 'Teaching production React 19, architecture patterns, and automated frontend testing.',
        phone: '+20 100 555 0199',
        links: {
          website: 'https://ahmedhassan.dev',
          linkedin: 'https://linkedin.com/in/ahmed-hassan',
          github: 'https://github.com/ahmed-hassan',
        },
        expertiseTags: ['React 19', 'TypeScript', 'Design Systems', 'Testing'],
        notificationPreferences: DEFAULT_PREFS,
        joinedAt: '2024-06-15T10:00:00.000Z',
        lastLoginAt: '2026-03-25T13:05:00.000Z',
        coursesCount: 5,
        streakDays: 0,
        points: 0,
      },
    },
    'user-supervisor-1': {
      password: 'EduHub#2025',
      wishlistCourseIds: [],
      recentSearches: ['Moderation Queue'],
      sessions: [
        {
          id: 'sess-sup-1',
          deviceName: 'Dell XPS 15',
          deviceType: 'desktop',
          browser: 'Chrome 134',
          location: 'Cairo, Egypt',
          lastActiveAt: '2026-03-25T13:20:00.000Z',
          isCurrent: true,
        },
      ],
      user: {
        id: 'user-supervisor-1',
        name: 'Hana Mostafa',
        email: 'hana.mostafa@eduhub.com',
        emailVerified: true,
        role: 'supervisor',
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300',
        title: 'Lead Curriculum Quality Supervisor',
        bio: 'Reviewing course quality standards and keeping learner discussions supportive.',
        phone: '+20 101 555 0114',
        links: {
          website: null,
          linkedin: 'https://linkedin.com/in/hana-mostafa',
          github: null,
        },
        expertiseTags: ['Instructional Design', 'Quality Assurance'],
        notificationPreferences: DEFAULT_PREFS,
        joinedAt: '2024-08-01T09:00:00.000Z',
        lastLoginAt: '2026-03-25T13:18:00.000Z',
        coursesCount: 0,
        streakDays: 0,
        points: 0,
      },
    },
    'user-admin-1': {
      password: 'EduHub#2025',
      wishlistCourseIds: [],
      recentSearches: ['Certificate Audit'],
      sessions: [
        {
          id: 'sess-adm-1',
          deviceName: 'Mac Studio M2',
          deviceType: 'desktop',
          browser: 'Chrome 134',
          location: 'Cairo, Egypt',
          lastActiveAt: '2026-03-25T13:30:00.000Z',
          isCurrent: true,
        },
      ],
      user: {
        id: 'user-admin-1',
        name: 'Nour Khaled',
        email: 'nour.khaled@eduhub.com',
        emailVerified: true,
        role: 'admin',
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300',
        title: 'Academic Director & Platform Admin',
        bio: 'Overseeing curriculum governance, instructors, and verified credentials.',
        phone: '+20 100 555 0100',
        links: {
          website: 'https://eduhub.com',
          linkedin: 'https://linkedin.com/in/nour-khaled',
          github: null,
        },
        expertiseTags: ['Governance', 'EdTech Operations'],
        notificationPreferences: DEFAULT_PREFS,
        joinedAt: '2024-01-05T08:00:00.000Z',
        lastLoginAt: '2026-03-25T13:25:00.000Z',
        coursesCount: 0,
        streakDays: 0,
        points: 0,
      },
    },
    'user-inst-2': {
      password: 'EduHub#2025',
      wishlistCourseIds: [],
      recentSearches: [],
      sessions: [],
      user: {
        id: 'user-inst-2',
        name: 'Mona Adel',
        email: 'mona.adel@eduhub.com',
        emailVerified: true,
        role: 'instructor',
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300',
        title: 'Staff Product Designer & Figma Lead',
        bio: 'Crafting accessible design systems and interactive prototyping workflows.',
        phone: null,
        links: { website: 'https://monaadel.design', linkedin: null, github: null },
        expertiseTags: ['UI/UX Design', 'Figma', 'Design Systems'],
        notificationPreferences: DEFAULT_PREFS,
        joinedAt: '2024-09-12T10:00:00.000Z',
        lastLoginAt: '2026-03-24T17:00:00.000Z',
        coursesCount: 3,
        streakDays: 0,
        points: 0,
      },
    },
    'user-inst-3': {
      password: 'EduHub#2025',
      wishlistCourseIds: [],
      recentSearches: [],
      sessions: [],
      user: {
        id: 'user-inst-3',
        name: 'Salma Nabil',
        email: 'salma.nabil@eduhub.com',
        emailVerified: true,
        role: 'instructor',
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
        title: 'Applied Data Scientist & ML Engineer',
        bio: 'Making statistical modeling, Python, and machine learning clear and intuitive.',
        phone: null,
        links: { website: null, linkedin: null, github: 'https://github.com/salmanabil' },
        expertiseTags: ['Python', 'Data Science', 'Machine Learning'],
        notificationPreferences: DEFAULT_PREFS,
        joinedAt: '2024-10-03T11:00:00.000Z',
        lastLoginAt: '2026-03-23T14:20:00.000Z',
        coursesCount: 2,
        streakDays: 0,
        points: 0,
      },
    },
    'user-inst-4': {
      password: 'EduHub#2025',
      wishlistCourseIds: [],
      recentSearches: [],
      sessions: [],
      user: {
        id: 'user-inst-4',
        name: 'Omar Fathy',
        email: 'omar.fathy@eduhub.com',
        emailVerified: true,
        role: 'instructor',
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
        title: 'Cloud Security & DevSecOps Architect',
        bio: 'Defensive architecture, threat modeling, and hands-on ethical hacking labs.',
        phone: null,
        links: { website: null, linkedin: null, github: null },
        expertiseTags: ['Cybersecurity', 'Cloud Security', 'Linux'],
        notificationPreferences: DEFAULT_PREFS,
        joinedAt: '2024-11-20T09:00:00.000Z',
        lastLoginAt: '2026-03-22T18:00:00.000Z',
        coursesCount: 2,
        streakDays: 0,
        points: 0,
      },
    },
    'user-stu-2': {
      password: 'EduHub#2025',
      wishlistCourseIds: [],
      recentSearches: [],
      sessions: [],
      user: {
        id: 'user-stu-2',
        name: 'Karim Tarek',
        email: 'karim.tarek@eduhub.com',
        emailVerified: true,
        role: 'student',
        status: 'active',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
        title: 'Junior Full-Stack Developer',
        bio: 'Focused on backend Node systems and TypeScript.',
        phone: null,
        links: { website: null, linkedin: null, github: null },
        expertiseTags: ['TypeScript', 'Node.js'],
        notificationPreferences: DEFAULT_PREFS,
        joinedAt: '2025-10-14T10:00:00.000Z',
        lastLoginAt: '2026-03-24T12:15:00.000Z',
        coursesCount: 2,
        streakDays: 6,
        points: 940,
      },
    },
    'user-stu-3': {
      password: 'EduHub#2025',
      wishlistCourseIds: [],
      recentSearches: [],
      sessions: [],
      user: {
        id: 'user-stu-3',
        name: 'Yasmine Adel',
        email: 'yasmine.adel@eduhub.com',
        emailVerified: true,
        role: 'student',
        status: 'suspended',
        avatarUrl: null,
        title: 'Student Learner',
        bio: 'Account temporarily suspended pending moderation review.',
        phone: null,
        links: { website: null, linkedin: null, github: null },
        expertiseTags: [],
        notificationPreferences: DEFAULT_PREFS,
        joinedAt: '2025-12-01T10:00:00.000Z',
        lastLoginAt: '2026-03-10T09:00:00.000Z',
        coursesCount: 1,
        streakDays: 0,
        points: 120,
      },
    },
    'user-inst-pending': {
      password: 'EduHub#2025',
      wishlistCourseIds: [],
      recentSearches: [],
      sessions: [],
      user: {
        id: 'user-inst-pending',
        name: 'Tamer Mansour',
        email: 'tamer.mansour@eduhub.com',
        emailVerified: true,
        role: 'instructor',
        status: 'pending',
        avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300',
        title: 'Cloud Infrastructure Consultant',
        bio: 'Preparing AWS & Kubernetes architecture tracks.',
        phone: null,
        links: { website: null, linkedin: null, github: null },
        expertiseTags: ['AWS', 'Kubernetes', 'Terraform'],
        notificationPreferences: DEFAULT_PREFS,
        joinedAt: '2026-03-20T09:00:00.000Z',
        lastLoginAt: null,
        coursesCount: 0,
        streakDays: 0,
        points: 0,
      },
    },
  };

  const categories: CategoryDto[] = [
    {
      id: 'cat-web',
      name: 'Development',
      slug: 'development',
      description: 'Modern frontend frameworks, full-stack systems, and automated testing.',
      courseCount: 4,
      iconName: 'CodeXml',
      accentColor: '#6D4AE0',
      order: 0,
      subcategories: [
        { id: 'sub-react', categoryId: 'cat-web', name: 'React & Frontend', courseCount: 2 },
        { id: 'sub-backend', categoryId: 'cat-web', name: 'Backend & APIs', courseCount: 2 },
      ],
    },
    {
      id: 'cat-design',
      name: 'Design',
      slug: 'design',
      description: 'Product design, Figma workflows, design systems, and user research.',
      courseCount: 2,
      iconName: 'Palette',
      accentColor: '#EC4899',
      order: 1,
      subcategories: [
        { id: 'sub-uiux', categoryId: 'cat-design', name: 'UI/UX Design', courseCount: 2 },
      ],
    },
    {
      id: 'cat-data',
      name: 'Data Science',
      slug: 'data-science',
      description: 'Python analytics, machine learning, and SQL engineering.',
      courseCount: 2,
      iconName: 'BarChart3',
      accentColor: '#0EA5E9',
      order: 2,
      subcategories: [
        { id: 'sub-ml', categoryId: 'cat-data', name: 'Machine Learning', courseCount: 2 },
      ],
    },
    {
      id: 'cat-business',
      name: 'Business',
      slug: 'business',
      description: 'Product strategy, agile delivery, and executive communication.',
      courseCount: 1,
      iconName: 'Briefcase',
      accentColor: '#F59E0B',
      order: 3,
      subcategories: [
        { id: 'sub-pm', categoryId: 'cat-business', name: 'Product Management', courseCount: 1 },
      ],
    },
    {
      id: 'cat-marketing',
      name: 'Marketing',
      slug: 'marketing',
      description: 'Growth loops, SEO foundations, and lifecycle analytics.',
      courseCount: 1,
      iconName: 'Megaphone',
      accentColor: '#10B981',
      order: 4,
      subcategories: [
        { id: 'sub-growth', categoryId: 'cat-marketing', name: 'Growth & Analytics', courseCount: 1 },
      ],
    },
    {
      id: 'cat-languages',
      name: 'Languages',
      slug: 'languages',
      description: 'Technical communication and fluent English for global teams.',
      courseCount: 1,
      iconName: 'Languages',
      accentColor: '#8B5CF6',
      order: 5,
      subcategories: [
        { id: 'sub-eng', categoryId: 'cat-languages', name: 'Business English', courseCount: 1 },
      ],
    },
    {
      id: 'cat-security',
      name: 'Cybersecurity',
      slug: 'cybersecurity',
      description: 'Web application pentesting, network defense, and cloud hardening.',
      courseCount: 1,
      iconName: 'ShieldCheck',
      accentColor: '#EF4444',
      order: 6,
      subcategories: [
        { id: 'sub-appsec', categoryId: 'cat-security', name: 'Application Security', courseCount: 1 },
      ],
    },
    {
      id: 'cat-photo',
      name: 'Photography',
      slug: 'photography',
      description: 'Studio lighting, editorial composition, and RAW color grading.',
      courseCount: 1,
      iconName: 'Camera',
      accentColor: '#14B8A6',
      order: 7,
      subcategories: [
        { id: 'sub-studio', categoryId: 'cat-photo', name: 'Editorial & Studio', courseCount: 1 },
      ],
    },
  ];

  const ahmedSummary = {
    id: 'user-instructor-1',
    name: 'Ahmed Hassan',
    title: 'Principal Frontend Architect & Instructor',
    avatarUrl: users['user-instructor-1'].user.avatarUrl,
  };
  const monaSummary = {
    id: 'user-inst-2',
    name: 'Mona Adel',
    title: 'Staff Product Designer & Figma Lead',
    avatarUrl: users['user-inst-2'].user.avatarUrl,
  };
  const salmaSummary = {
    id: 'user-inst-3',
    name: 'Salma Nabil',
    title: 'Applied Data Scientist & ML Engineer',
    avatarUrl: users['user-inst-3'].user.avatarUrl,
  };
  const omarSummary = {
    id: 'user-inst-4',
    name: 'Omar Fathy',
    title: 'Cloud Security & DevSecOps Architect',
    avatarUrl: users['user-inst-4'].user.avatarUrl,
  };

  const c1Curriculum = makeInstructorCourseCurriculum('course-1', ['sec-1', 'sec-2', 'sec-3', 'sec-4'], 100);
  const c2Curriculum = makeInstructorCourseCurriculum('course-2', ['sec-2-1', 'sec-2-2', 'sec-2-3', 'sec-2-4'], 200);
  const c3Curriculum = makeInstructorCourseCurriculum('course-3', ['sec-3-1', 'sec-3-2', 'sec-3-3', 'sec-3-4'], 300);
  const c4Curriculum = makeInstructorCourseCurriculum('course-4', ['sec-4-1', 'sec-4-2', 'sec-4-3', 'sec-4-4'], 400);
  const c5Curriculum = makeInstructorCourseCurriculum('course-5', ['sec-5-1', 'sec-5-2', 'sec-5-3', 'sec-5-4'], 500);
  const cPendingCurriculum = makeInstructorCourseCurriculum('course-inst-pending', ['sec-p-1', 'sec-p-2', 'sec-p-3', 'sec-p-4'], 600);
  const cDraftCurriculum = makeInstructorCourseCurriculum('course-inst-draft', ['sec-d-1', 'sec-d-2', 'sec-d-3', 'sec-d-4'], 700);
  const cRejectedCurriculum = makeInstructorCourseCurriculum('course-inst-rejected', ['sec-r-1', 'sec-r-2', 'sec-r-3', 'sec-r-4'], 800);

  const curricula: Record<string, CurriculumSectionDto[]> = {
    'course-1': c1Curriculum,
    'course-2': c2Curriculum,
    'course-3': c3Curriculum,
    'course-4': c4Curriculum,
    'course-5': c5Curriculum,
    'course-inst-pending': cPendingCurriculum,
    'course-inst-draft': cDraftCurriculum,
    'course-inst-rejected': cRejectedCurriculum,
  };

  function calcCurricTotals(secs: CurriculumSectionDto[]) {
    return {
      lessonsCount: secs.reduce((sum, s) => sum + s.lessonsCount, 0),
      durationSeconds: secs.reduce((sum, s) => sum + s.durationSeconds, 0),
      sectionsCount: secs.length,
    };
  }

  const c1T = calcCurricTotals(c1Curriculum);
  const c2T = calcCurricTotals(c2Curriculum);
  const c3T = calcCurricTotals(c3Curriculum);
  const c4T = calcCurricTotals(c4Curriculum);
  const c5T = calcCurricTotals(c5Curriculum);
  const cPT = calcCurricTotals(cPendingCurriculum);
  const cDT = calcCurricTotals(cDraftCurriculum);
  const cRT = calcCurricTotals(cRejectedCurriculum);

  // Add default minimal 2-section curriculum for course-6..course-12 so every published course plays cleanly
  const extraCoursesMeta: Array<{
    id: string;
    title: string;
    subtitle: string;
    instructor: typeof ahmedSummary;
    cat: { id: string; name: string };
    sub: { id: string; name: string };
    thumb: string;
    rating: number;
    reviews: number;
    students: number;
    price: number;
    orig: number | null;
    isFree: boolean;
    level: 'beginner' | 'intermediate' | 'advanced';
    language: 'en' | 'en_ar_cc' | 'es_cc';
    durationSeconds: number;
    featured: boolean;
    isNew: boolean;
    hasCert: boolean;
    hasExam: boolean;
    tags: string[];
    createdAt: string;
  }> = [
    {
      id: 'course-6',
      title: 'Python for Data Science & Machine Learning',
      subtitle: 'Build reproducible ML pipelines with NumPy, pandas, and scikit-learn.',
      instructor: salmaSummary,
      cat: { id: 'cat-data', name: 'Data Science' },
      sub: { id: 'sub-ml', name: 'Machine Learning' },
      thumb: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080',
      rating: 4.8,
      reviews: 910,
      students: 11200,
      price: 59.99,
      orig: 99.99,
      isFree: false,
      level: 'intermediate',
      language: 'en_ar_cc',
      durationSeconds: 32400, // 9h (5_10h)
      featured: true,
      isNew: false,
      hasCert: true,
      hasExam: true,
      tags: ['Python', 'Data Science', 'Machine Learning'],
      createdAt: '2025-12-02T09:00:00.000Z',
    },
    {
      id: 'course-7',
      title: 'Ethical Hacking & Defensive AppSec Labs',
      subtitle: 'Audit OWASP Top 10 flaws, API auth controls, and secure deployment headers.',
      instructor: omarSummary,
      cat: { id: 'cat-security', name: 'Cybersecurity' },
      sub: { id: 'sub-appsec', name: 'Application Security' },
      thumb: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1080',
      rating: 4.9,
      reviews: 640,
      students: 7850,
      price: 69.99,
      orig: 119.99,
      isFree: false,
      level: 'advanced',
      language: 'en',
      durationSeconds: 39600, // 11h (10h_plus)
      featured: true,
      isNew: true,
      hasCert: true,
      hasExam: true,
      tags: ['Cybersecurity', 'OWASP', 'AppSec'],
      createdAt: '2026-02-14T10:00:00.000Z',
    },
    {
      id: 'course-8',
      title: 'Product Management Foundations',
      subtitle: 'Turn discovery interviews into focused roadmaps and measurable launches.',
      instructor: monaSummary,
      cat: { id: 'cat-business', name: 'Business' },
      sub: { id: 'sub-pm', name: 'Product Management' },
      thumb: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1080',
      rating: 4.6,
      reviews: 412,
      students: 5300,
      price: 39.99,
      orig: 69.99,
      isFree: false,
      level: 'beginner',
      language: 'en',
      durationSeconds: 12600, // 3.5h (2_5h)
      featured: false,
      isNew: false,
      hasCert: true,
      hasExam: false,
      tags: ['Product Management', 'Strategy'],
      createdAt: '2025-11-20T09:00:00.000Z',
    },
    {
      id: 'course-9',
      title: 'Growth Marketing & Cohort Analytics',
      subtitle: 'Design experimentation frameworks, attribution funnels, and retention loops.',
      instructor: salmaSummary,
      cat: { id: 'cat-marketing', name: 'Marketing' },
      sub: { id: 'sub-growth', name: 'Growth & Analytics' },
      thumb: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080',
      rating: 4.5,
      reviews: 280,
      students: 3940,
      price: 29.99,
      orig: null,
      isFree: false,
      level: 'beginner',
      language: 'es_cc',
      durationSeconds: 5400, // 1.5h (0_2h)
      featured: false,
      isNew: true,
      hasCert: false,
      hasExam: false,
      tags: ['Growth', 'Analytics'],
      createdAt: '2026-03-01T10:00:00.000Z',
    },
    {
      id: 'course-10',
      title: 'Business English for Engineering Teams',
      subtitle: 'Lead crisp standups, architecture reviews, and stakeholder demos.',
      instructor: monaSummary,
      cat: { id: 'cat-languages', name: 'Languages' },
      sub: { id: 'sub-eng', name: 'Business English' },
      thumb: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1080',
      rating: 4.7,
      reviews: 325,
      students: 4610,
      price: 0,
      orig: null,
      isFree: true,
      level: 'beginner',
      language: 'en',
      durationSeconds: 4800, // 1.33h (0_2h)
      featured: false,
      isNew: false,
      hasCert: true,
      hasExam: false,
      tags: ['Communication', 'English'],
      createdAt: '2025-10-08T10:00:00.000Z',
    },
    {
      id: 'course-11',
      title: 'Editorial Photography & Studio Lighting',
      subtitle: 'Master key-to-fill ratios, portrait directing, and Lightroom color workflows.',
      instructor: omarSummary,
      cat: { id: 'cat-photo', name: 'Photography' },
      sub: { id: 'sub-studio', name: 'Editorial & Studio' },
      thumb: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1080',
      rating: 4.8,
      reviews: 215,
      students: 2890,
      price: 44.99,
      orig: 79.99,
      isFree: false,
      level: 'intermediate',
      language: 'en',
      durationSeconds: 21600, // 6h (5_10h)
      featured: false,
      isNew: false,
      hasCert: true,
      hasExam: false,
      tags: ['Photography', 'Lighting'],
      createdAt: '2025-12-18T11:00:00.000Z',
    },
    {
      id: 'course-12',
      title: 'SQL Performance & Analytics Engineering',
      subtitle: 'Tune query plans, window functions, and warehouse transformations.',
      instructor: salmaSummary,
      cat: { id: 'cat-data', name: 'Data Science' },
      sub: { id: 'sub-ml', name: 'Machine Learning' },
      thumb: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1080',
      rating: 4.9,
      reviews: 504,
      students: 6900,
      price: 0,
      orig: null,
      isFree: true,
      level: 'intermediate',
      language: 'en_ar_cc',
      durationSeconds: 14400, // 4h (2_5h)
      featured: false,
      isNew: true,
      hasCert: true,
      hasExam: true,
      tags: ['SQL', 'Data Science'],
      createdAt: '2026-03-12T08:00:00.000Z',
    },
  ];

  for (let i = 0; i < extraCoursesMeta.length; i++) {
    const meta = extraCoursesMeta[i];
    curricula[meta.id] = makeInstructorCourseCurriculum(
      meta.id,
      [`sec-${meta.id}-1`, `sec-${meta.id}-2`, `sec-${meta.id}-3`, `sec-${meta.id}-4`],
      1000 + i * 100
    );
  }

  const courses: CourseDto[] = [
    {
      id: 'course-1',
      title: 'Complete React Developer Course',
      subtitle: 'Master React 19, Hooks, Router, state management, and testing.',
      description:
        'A complete production-focused React 19 curriculum covering architecture, strict TypeScript patterns, accessible UI primitives, and automated integration tests.',
      instructor: ahmedSummary,
      category: { id: 'cat-web', name: 'Development' },
      subcategory: { id: 'sub-react', name: 'React & Frontend' },
      thumbnailUrl: 'https://images.unsplash.com/photo-1619410283995-43d9134e7656?w=1080',
      previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      rating: 4.9,
      reviewCount: 1420,
      studentsCount: 18450,
      price: { amount: 49.99, currency: 'USD' },
      originalPrice: { amount: 89.99, currency: 'USD' },
      isFree: false,
      level: 'intermediate',
      language: 'en_ar_cc',
      durationSeconds: 43200, // 12h -> 10h_plus bucket
      lessonsCount: c1T.lessonsCount,
      sectionsCount: c1T.sectionsCount,
      featured: true,
      isNew: false,
      includesCertificate: true,
      includesExam: true,
      passingScorePercent: 60,
      unavailable: false,
      status: 'published',
      learningPoints: [
        'Architect scalable React 19 applications with clean module boundaries',
        'Design strict TypeScript hooks, reducers, and form validation flows',
        'Write fast, deterministic Vitest + Testing Library integration suites',
      ],
      requirements: ['Familiarity with HTML, CSS & modern JavaScript ES2022+'],
      tags: ['React 19', 'TypeScript', 'Frontend'],
      completionRatePercent: 78,
      rejectionReason: null,
      submittedAt: '2025-11-08T10:00:00.000Z',
      updatedAt: '2026-03-20T12:00:00.000Z',
      createdAt: '2025-11-10T09:00:00.000Z',
    },
    {
      id: 'course-2',
      title: 'UI/UX Design Masterclass with Figma',
      subtitle: 'Build scalable component libraries, interactive prototypes, and handoff specs.',
      description:
        'From user flows and low-fidelity wireframes to tokenized design systems and developer-ready Figma component specs.',
      instructor: monaSummary,
      category: { id: 'cat-design', name: 'Design' },
      subcategory: { id: 'sub-uiux', name: 'UI/UX Design' },
      thumbnailUrl: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=1080',
      previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      rating: 4.8,
      reviewCount: 860,
      studentsCount: 12300,
      price: { amount: 54.99, currency: 'USD' },
      originalPrice: { amount: 94.99, currency: 'USD' },
      isFree: false,
      level: 'beginner',
      language: 'en_ar_cc',
      durationSeconds: 25200, // 7h (5_10h)
      lessonsCount: c2T.lessonsCount,
      sectionsCount: c2T.sectionsCount,
      featured: true,
      isNew: false,
      includesCertificate: true,
      includesExam: true,
      passingScorePercent: 70,
      unavailable: false,
      status: 'published',
      learningPoints: [
        'Structure responsive design tokens in Figma Variables',
        'Run structured usability tests and synthesize findings',
      ],
      requirements: ['Free Figma account and basic computer skills'],
      tags: ['UI/UX Design', 'Figma', 'Design Systems'],
      completionRatePercent: 74,
      rejectionReason: null,
      submittedAt: '2025-11-18T10:00:00.000Z',
      updatedAt: '2026-03-18T10:00:00.000Z',
      createdAt: '2025-11-22T09:00:00.000Z',
    },
    {
      id: 'course-3',
      title: 'Advanced TypeScript & Node.js APIs',
      subtitle: 'End-to-end type safety, Zod validation, REST architecture, and observability.',
      description:
        'Engineer rock-solid HTTP APIs in TypeScript with schema-driven contracts, rate limiting, structured logging, and integration test suites.',
      instructor: ahmedSummary,
      category: { id: 'cat-web', name: 'Development' },
      subcategory: { id: 'sub-backend', name: 'Backend & APIs' },
      thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1080',
      previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      rating: 4.9,
      reviewCount: 540,
      studentsCount: 8420,
      price: { amount: 64.99, currency: 'USD' },
      originalPrice: { amount: 109.99, currency: 'USD' },
      isFree: false,
      level: 'advanced',
      language: 'en',
      durationSeconds: 28800, // 8h (5_10h)
      lessonsCount: c3T.lessonsCount,
      sectionsCount: c3T.sectionsCount,
      featured: true,
      isNew: true,
      includesCertificate: true,
      includesExam: true,
      passingScorePercent: 60,
      unavailable: false,
      status: 'published',
      learningPoints: [
        'Model shared REST contracts with Zod schemas',
        'Design idempotent endpoints and JWT refresh rotation',
      ],
      requirements: ['Solid JavaScript and basic REST experience'],
      tags: ['TypeScript', 'Node.js', 'REST APIs'],
      completionRatePercent: 81,
      rejectionReason: null,
      submittedAt: '2026-01-20T10:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z',
      createdAt: '2026-01-25T10:00:00.000Z',
    },
    {
      id: 'course-4',
      title: 'Web Accessibility & Inclusive UI Engineering',
      subtitle: 'WCAG 2.2 AA patterns, keyboard navigation, ARIA states, and focus traps.',
      description:
        'Practical accessibility techniques every frontend engineer can apply right away without slowing down product delivery.',
      instructor: ahmedSummary,
      category: { id: 'cat-web', name: 'Development' },
      subcategory: { id: 'sub-react', name: 'React & Frontend' },
      thumbnailUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1080',
      previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      rating: 4.7,
      reviewCount: 410,
      studentsCount: 9800,
      price: { amount: 0, currency: 'USD' },
      originalPrice: null,
      isFree: true,
      level: 'beginner',
      language: 'en_ar_cc',
      durationSeconds: 10800, // 3h (2_5h)
      lessonsCount: c4T.lessonsCount,
      sectionsCount: c4T.sectionsCount,
      featured: false,
      isNew: false,
      includesCertificate: true,
      includesExam: true,
      passingScorePercent: 60,
      unavailable: false,
      status: 'published',
      learningPoints: [
        'Build accessible modals, drawers, tabs, and comboboxes',
        'Audit color contrast and focus management automatically',
      ],
      requirements: ['Basic HTML and CSS fundamentals'],
      tags: ['Accessibility', 'HTML', 'React 19'],
      completionRatePercent: 85,
      rejectionReason: null,
      submittedAt: '2025-10-12T10:00:00.000Z',
      updatedAt: '2026-02-15T10:00:00.000Z',
      createdAt: '2025-10-15T10:00:00.000Z',
    },
    {
      id: 'course-5',
      title: 'Frontend Testing & Automated QA Systems',
      subtitle: 'Master Vitest, React Testing Library, MSW network mocking, and Playwright.',
      description:
        'Ship with confidence using fast unit specs, realistic MSW service worker tests, and resilient end-to-end checks.',
      instructor: ahmedSummary,
      category: { id: 'cat-web', name: 'Development' },
      subcategory: { id: 'sub-backend', name: 'Backend & APIs' },
      thumbnailUrl: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1080',
      previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      rating: 4.9,
      reviewCount: 495,
      studentsCount: 6450,
      price: { amount: 39.99, currency: 'USD' },
      originalPrice: { amount: 74.99, currency: 'USD' },
      isFree: false,
      level: 'intermediate',
      language: 'en',
      durationSeconds: 18000, // 5h (5_10h)
      lessonsCount: c5T.lessonsCount,
      sectionsCount: c5T.sectionsCount,
      featured: false,
      isNew: true,
      includesCertificate: true,
      includesExam: true,
      passingScorePercent: 70,
      unavailable: false,
      status: 'published',
      learningPoints: [
        'Test async flows cleanly with MSW handlers',
        'Avoid brittle selector coupling in UI tests',
      ],
      requirements: ['React & TypeScript experience'],
      tags: ['Testing', 'Vitest', 'MSW'],
      completionRatePercent: 79,
      rejectionReason: null,
      submittedAt: '2026-02-01T10:00:00.000Z',
      updatedAt: '2026-03-19T12:00:00.000Z',
      createdAt: '2026-02-05T10:00:00.000Z',
    },
    ...extraCoursesMeta.map((meta) => ({
      id: meta.id,
      title: meta.title,
      subtitle: meta.subtitle,
      description: `${meta.subtitle} Includes structured lessons, downloadable references, and applied exercises.`,
      instructor: meta.instructor,
      category: meta.cat,
      subcategory: meta.sub,
      thumbnailUrl: meta.thumb,
      previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      rating: meta.rating,
      reviewCount: meta.reviews,
      studentsCount: meta.students,
      price: { amount: meta.price, currency: 'USD' },
      originalPrice: meta.orig !== null ? { amount: meta.orig, currency: 'USD' } : null,
      isFree: meta.isFree,
      level: meta.level,
      language: meta.language,
      durationSeconds: meta.durationSeconds,
      lessonsCount: curricula[meta.id].reduce((sum, s) => sum + s.lessonsCount, 0),
      sectionsCount: curricula[meta.id].length,
      featured: meta.featured,
      isNew: meta.isNew,
      includesCertificate: meta.hasCert,
      includesExam: meta.hasExam,
      passingScorePercent: 65,
      unavailable: false,
      status: 'published' as const,
      learningPoints: [
        `Apply core ${meta.tags[0]} concepts on real deliverables`,
        'Build a portfolio-grade project from scratch',
      ],
      requirements: ['Motivated learner mindset'],
      tags: meta.tags,
      completionRatePercent: 72,
      rejectionReason: null,
      submittedAt: meta.createdAt,
      updatedAt: '2026-03-20T10:00:00.000Z',
      createdAt: meta.createdAt,
    })),
    {
      id: 'course-inst-pending',
      title: 'React Server Components & Streaming Deep Dive',
      subtitle: 'Understand RSC boundaries, caching headers, and suspense streaming.',
      description:
        'An in-depth engineering workshop exploring modern React rendering architectures, bundle budgets, and streaming data patterns.',
      instructor: ahmedSummary,
      category: { id: 'cat-web', name: 'Development' },
      subcategory: { id: 'sub-react', name: 'React & Frontend' },
      thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1080',
      previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      rating: 0,
      reviewCount: 0,
      studentsCount: 0,
      price: { amount: 54.99, currency: 'USD' },
      originalPrice: { amount: 89.99, currency: 'USD' },
      isFree: false,
      level: 'advanced',
      language: 'en',
      durationSeconds: cPT.durationSeconds,
      lessonsCount: cPT.lessonsCount,
      sectionsCount: cPT.sectionsCount,
      featured: false,
      isNew: true,
      includesCertificate: true,
      includesExam: true,
      passingScorePercent: 70,
      unavailable: false,
      status: 'pending_review',
      learningPoints: ['Differentiate server vs client module graphs accurately'],
      requirements: ['React Hooks experience'],
      tags: ['React 19', 'RSC'],
      completionRatePercent: 0,
      rejectionReason: null,
      submittedAt: '2026-03-24T11:30:00.000Z',
      updatedAt: '2026-03-24T11:30:00.000Z',
      createdAt: '2026-03-10T09:00:00.000Z',
    },
    {
      id: 'course-inst-draft',
      title: 'Design Token Automation & Multi-Brand Themes',
      subtitle: 'Automate CSS variables, Tailwind v4 themes, and Figma token pipelines.',
      description:
        'A hands-on engineering guide to scaling multi-brand UI systems using CSS custom properties and automated style checks.',
      instructor: ahmedSummary,
      category: { id: 'cat-design', name: 'Design' },
      subcategory: { id: 'sub-uiux', name: 'UI/UX Design' },
      thumbnailUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1080',
      previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      rating: 0,
      reviewCount: 0,
      studentsCount: 0,
      price: { amount: 34.99, currency: 'USD' },
      originalPrice: null,
      isFree: false,
      level: 'intermediate',
      language: 'en',
      durationSeconds: cDT.durationSeconds,
      lessonsCount: cDT.lessonsCount,
      sectionsCount: cDT.sectionsCount,
      featured: false,
      isNew: false,
      includesCertificate: true,
      includesExam: true,
      passingScorePercent: 60,
      unavailable: false,
      status: 'draft',
      learningPoints: ['Automate token transformations safely'],
      requirements: ['CSS & Tailwind basics'],
      tags: ['Design Tokens', 'Tailwind CSS'],
      completionRatePercent: 0,
      rejectionReason: null,
      submittedAt: null,
      updatedAt: '2026-03-25T09:00:00.000Z',
      createdAt: '2026-03-21T09:00:00.000Z',
    },
    {
      id: 'course-inst-rejected',
      title: 'Legacy Webpack 4 Migration Playbook',
      subtitle: 'Modernizing legacy frontend build setups step-by-step to Vite.',
      description:
        'Diagnose slow bundler bottlenecks and safely transition existing frontend apps onto modern ESM toolchains.',
      instructor: ahmedSummary,
      category: { id: 'cat-web', name: 'Development' },
      subcategory: { id: 'sub-react', name: 'React & Frontend' },
      thumbnailUrl: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1080',
      previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      rating: 0,
      reviewCount: 0,
      studentsCount: 0,
      price: { amount: 24.99, currency: 'USD' },
      originalPrice: null,
      isFree: false,
      level: 'intermediate',
      language: 'en',
      durationSeconds: cRT.durationSeconds,
      lessonsCount: cRT.lessonsCount,
      sectionsCount: cRT.sectionsCount,
      featured: false,
      isNew: false,
      includesCertificate: true,
      includesExam: true,
      passingScorePercent: 60,
      unavailable: false,
      status: 'rejected',
      learningPoints: ['Audit build plugins and migrate aliases cleanly'],
      requirements: ['Frontend tooling basics'],
      tags: ['Vite', 'Tooling'],
      completionRatePercent: 0,
      rejectionReason:
        'Please expand Module 3 with Vite production chunk-splitting benchmarks and add at least 10 bank questions.',
      submittedAt: '2026-03-19T14:00:00.000Z',
      updatedAt: '2026-03-21T16:00:00.000Z',
      createdAt: '2026-03-12T10:00:00.000Z',
    },
  ];

  const reviews: MockCourseReviewRecord[] = [
    {
      review: {
        id: 'rev-1',
        courseId: 'course-1',
        author: {
          id: 'user-stu-2',
          name: 'Karim Tarek',
          title: 'Junior Full-Stack Developer',
          role: 'student',
          avatarUrl: users['user-stu-2'].user.avatarUrl,
        },
        rating: 5,
        comment: 'Clear explanations of custom hooks, reducer state, and production routing patterns.',
        helpfulCount: 38,
        markedHelpfulByMe: false,
        createdAt: '2026-03-14T11:20:00.000Z',
      },
      helpfulUserIds: [],
    },
    {
      review: {
        id: 'rev-2',
        courseId: 'course-1',
        author: {
          id: 'user-student-1',
          name: 'Sara Ali',
          title: 'Product Engineer & Lifelong Learner',
          role: 'student',
          avatarUrl: users['user-student-1'].user.avatarUrl,
        },
        rating: 5,
        comment: 'The TypeScript architecture section alone paid for the entire course.',
        helpfulCount: 24,
        markedHelpfulByMe: true,
        createdAt: '2026-03-20T15:10:00.000Z',
      },
      helpfulUserIds: ['user-student-1'],
    },
    {
      review: {
        id: 'rev-3',
        courseId: 'course-2',
        author: {
          id: 'user-stu-2',
          name: 'Karim Tarek',
          title: 'Junior Full-Stack Developer',
          role: 'student',
          avatarUrl: users['user-stu-2'].user.avatarUrl,
        },
        rating: 5,
        comment: 'Practical token naming conventions and super clear auto-layout examples.',
        helpfulCount: 15,
        markedHelpfulByMe: false,
        createdAt: '2026-03-18T09:40:00.000Z',
      },
      helpfulUserIds: [],
    },
  ];

  const c1AllLessonsProgress: Record<string, MockLessonProgressState> = {};
  for (const sec of c1Curriculum) {
    for (const l of sec.lessons) {
      c1AllLessonsProgress[l.id] = {
        watchPercent: 100,
        lastPositionSeconds: l.durationSeconds,
        completed: true,
      };
    }
  }

  const c3AllLessonsProgress: Record<string, MockLessonProgressState> = {};
  for (const sec of c3Curriculum) {
    for (const l of sec.lessons) {
      c3AllLessonsProgress[l.id] = {
        watchPercent: 100,
        lastPositionSeconds: l.durationSeconds,
        completed: true,
      };
    }
  }

  const c4AllLessonsProgress: Record<string, MockLessonProgressState> = {};
  for (const sec of c4Curriculum) {
    for (const l of sec.lessons) {
      c4AllLessonsProgress[l.id] = {
        watchPercent: 100,
        lastPositionSeconds: l.durationSeconds,
        completed: true,
      };
    }
  }

  const c5KarimProgress: Record<string, MockLessonProgressState> = {};
  for (const sec of c5Curriculum) {
    for (const l of sec.lessons) {
      c5KarimProgress[l.id] = {
        watchPercent: 100,
        lastPositionSeconds: l.durationSeconds,
        completed: true,
      };
    }
  }

  const c2PartialProgress: Record<string, MockLessonProgressState> = {};
  c2Curriculum.flatMap((s) => s.lessons).slice(0, 6).forEach((l, idx) => {
    c2PartialProgress[l.id] =
      idx < 5
        ? { watchPercent: 100, lastPositionSeconds: l.durationSeconds, completed: true }
        : { watchPercent: 45, lastPositionSeconds: Math.round(l.durationSeconds * 0.45), completed: false };
  });

  const enrollments: MockEnrollmentRecord[] = [
    {
      id: 'enr-1',
      userId: 'user-student-1',
      courseId: 'course-1',
      enrolledAt: '2026-01-12T10:00:00.000Z',
      lastAccessedAt: '2026-03-24T16:07:00.000Z',
      lastLessonId: 'lesson-112',
      lessonProgress: c1AllLessonsProgress,
      certificateId: 'cert-101',
    },
    {
      id: 'enr-2',
      userId: 'user-student-1',
      courseId: 'course-2',
      enrolledAt: '2026-02-05T14:00:00.000Z',
      lastAccessedAt: '2026-03-25T10:30:00.000Z',
      lastLessonId: 'lesson-206',
      lessonProgress: c2PartialProgress,
      certificateId: null,
    },
    {
      id: 'enr-3',
      userId: 'user-student-1',
      courseId: 'course-3',
      enrolledAt: '2026-02-20T09:00:00.000Z',
      lastAccessedAt: '2026-03-25T11:45:00.000Z',
      lastLessonId: 'lesson-312',
      lessonProgress: c3AllLessonsProgress,
      certificateId: null,
    },
    {
      id: 'enr-4',
      userId: 'user-student-1',
      courseId: 'course-4',
      enrolledAt: '2026-01-03T11:00:00.000Z',
      lastAccessedAt: '2026-02-12T16:00:00.000Z',
      lastLessonId: 'lesson-412',
      lessonProgress: c4AllLessonsProgress,
      certificateId: 'cert-102',
    },
    {
      id: 'enr-5',
      userId: 'user-stu-2',
      courseId: 'course-1',
      enrolledAt: '2026-02-01T10:00:00.000Z',
      lastAccessedAt: '2026-03-23T15:00:00.000Z',
      lastLessonId: 'lesson-104',
      lessonProgress: {
        'lesson-101': { watchPercent: 100, lastPositionSeconds: 525, completed: true },
        'lesson-102': { watchPercent: 100, lastPositionSeconds: 570, completed: true },
        'lesson-103': { watchPercent: 100, lastPositionSeconds: 615, completed: true },
        'lesson-104': { watchPercent: 50, lastPositionSeconds: 330, completed: false },
      },
      certificateId: null,
    },
    {
      id: 'enr-6',
      userId: 'user-stu-2',
      courseId: 'course-5',
      enrolledAt: '2026-02-10T10:00:00.000Z',
      lastAccessedAt: '2026-03-21T16:30:00.000Z',
      lastLessonId: 'lesson-512',
      lessonProgress: c5KarimProgress,
      certificateId: 'cert-103',
    },
  ];

  const questions: QuestionDto[] = [
    ...makeCourseQuestions('course-1', 'Complete React Developer Course', c1Curriculum, 'qb', 20),
    ...makeCourseQuestions('course-1', 'Complete React Developer Course', c1Curriculum, 'iq', 6),
    ...makeCourseQuestions('course-2', 'UI/UX Design Masterclass with Figma', c2Curriculum, 'qb2', 12),
    ...makeCourseQuestions('course-3', 'Advanced TypeScript & Node.js APIs', c3Curriculum, 'qb3', 12),
    ...makeCourseQuestions('course-4', 'Web Accessibility & Inclusive UI Engineering', c4Curriculum, 'qb4', 10),
    ...makeCourseQuestions('course-5', 'Frontend Testing & Automated QA Systems', c5Curriculum, 'iq', 12).map((q, idx) => ({
      ...q,
      id: `iq-${idx + 7}`,
    })),
    ...makeCourseQuestions('course-inst-draft', 'Design Token Automation & Multi-Brand Themes', cDraftCurriculum, 'qb-draft', 10),
    ...makeCourseQuestions('course-inst-pending', 'React Server Components & Streaming Deep Dive', cPendingCurriculum, 'qb-pend', 10),
  ];

  const examConfigs: Record<string, ExamConfigDto> = {
    'course-1': {
      id: 'exam-1',
      courseId: 'course-1',
      courseTitle: 'Complete React Developer Course',
      title: 'React Architecture & Hooks Certification Exam',
      durationSeconds: 1800,
      passingScorePercent: 60,
      totalQuestions: 20,
      attemptsAllowed: 3,
      shuffleQuestions: true,
      shuffleOptions: true,
      difficultyMix: { easyPercent: 40, mediumPercent: 40, hardPercent: 20 },
      coveredSectionIds: ['sec-1', 'sec-2', 'sec-3', 'sec-4'],
    },
    'course-2': {
      id: 'exam-2',
      courseId: 'course-2',
      courseTitle: 'UI/UX Design Masterclass with Figma',
      title: 'Design Systems & Figma Certification Exam',
      durationSeconds: 1200,
      passingScorePercent: 70,
      totalQuestions: 10,
      attemptsAllowed: 3,
      shuffleQuestions: true,
      shuffleOptions: false,
      difficultyMix: { easyPercent: 40, mediumPercent: 40, hardPercent: 20 },
      coveredSectionIds: ['sec-2-1', 'sec-2-2', 'sec-2-3', 'sec-2-4'],
    },
    'course-3': {
      id: 'exam-3',
      courseId: 'course-3',
      courseTitle: 'Advanced TypeScript & Node.js APIs',
      title: 'TypeScript API Engineering Certification Exam',
      durationSeconds: 1200,
      passingScorePercent: 60,
      totalQuestions: 8,
      attemptsAllowed: 3,
      shuffleQuestions: false,
      shuffleOptions: false,
      difficultyMix: { easyPercent: 40, mediumPercent: 40, hardPercent: 20 },
      coveredSectionIds: ['sec-3-1', 'sec-3-2', 'sec-3-3', 'sec-3-4'],
    },
    'course-4': {
      id: 'exam-4',
      courseId: 'course-4',
      courseTitle: 'Web Accessibility & Inclusive UI Engineering',
      title: 'WCAG 2.2 AA Certification Exam',
      durationSeconds: 900,
      passingScorePercent: 60,
      totalQuestions: 8,
      attemptsAllowed: 3,
      shuffleQuestions: true,
      shuffleOptions: true,
      difficultyMix: { easyPercent: 50, mediumPercent: 30, hardPercent: 20 },
      coveredSectionIds: ['sec-4-1', 'sec-4-2', 'sec-4-3', 'sec-4-4'],
    },
    'course-5': {
      id: 'exam-5',
      courseId: 'course-5',
      courseTitle: 'Frontend Testing & Automated QA Systems',
      title: 'Testing & MSW Automation Certification Exam',
      durationSeconds: 1200,
      passingScorePercent: 70,
      totalQuestions: 10,
      attemptsAllowed: 3,
      shuffleQuestions: true,
      shuffleOptions: true,
      difficultyMix: { easyPercent: 40, mediumPercent: 40, hardPercent: 20 },
      coveredSectionIds: ['sec-5-1', 'sec-5-2', 'sec-5-3', 'sec-5-4'],
    },
    'course-inst-draft': {
      id: 'exam-draft',
      courseId: 'course-inst-draft',
      courseTitle: 'Design Token Automation & Multi-Brand Themes',
      title: 'Design Token Pipeline Final Exam',
      durationSeconds: 1200,
      passingScorePercent: 60,
      totalQuestions: 8,
      attemptsAllowed: 3,
      shuffleQuestions: true,
      shuffleOptions: true,
      difficultyMix: { easyPercent: 40, mediumPercent: 40, hardPercent: 20 },
      coveredSectionIds: ['sec-d-1', 'sec-d-2', 'sec-d-3', 'sec-d-4'],
    },
  };

  const c1Bank = questions.filter((q) => q.courseId === 'course-1').slice(0, 20);
  function toAttemptRecord(
    id: string,
    attemptNumber: number,
    userId: string,
    courseId: string,
    startedAt: string,
    submittedAt: string,
    passingScorePercent: number,
    correctCount: number
  ): MockExamAttemptRecord {
    const picked = c1Bank;
    const answers: Record<string, number[]> = {};
    picked.forEach((q, idx) => {
      if (idx < correctCount) {
        answers[q.id] = q.correctIndices;
      } else {
        answers[q.id] = [q.correctIndices[0] === 0 ? 1 : 0];
      }
    });
    const scorePercent = Math.round((correctCount / picked.length) * 100);
    return {
      id,
      attemptNumber,
      userId,
      courseId,
      status: 'submitted',
      startedAt,
      expiresAt: submittedAt,
      submittedAt,
      durationSeconds: 1800,
      passingScorePercent,
      questions: picked.map((q, idx) => ({
        ...q,
        number: idx + 1,
        displayOptions: q.options,
        displayCorrectIndices: q.correctIndices,
      })),
      answers,
      flaggedQuestionIds: [picked[2].id],
      scorePercent,
      correctCount,
      wrongCount: picked.length - correctCount,
      skippedCount: 0,
      passed: scorePercent >= passingScorePercent,
    };
  }

  const examAttempts: MockExamAttemptRecord[] = [
    toAttemptRecord(
      'att-1',
      1,
      'user-student-1',
      'course-1',
      '2026-03-22T10:00:00.000Z',
      '2026-03-22T10:21:00.000Z',
      60,
      11
    ),
    toAttemptRecord(
      'att-2',
      2,
      'user-student-1',
      'course-1',
      '2026-03-24T15:40:00.000Z',
      '2026-03-24T16:05:00.000Z',
      60,
      17
    ),
  ];
  // Adjust att-2 score to match docs 86% nicely if needed (17/20 = 85 -> fine, or set 85 consistently).

  const certificates: CertificateDto[] = [
    {
      id: 'cert-101',
      verificationCode: 'EDU-2026-000123',
      student: { id: 'user-student-1', name: 'Sara Ali' },
      course: { id: 'course-1', title: 'Complete React Developer Course' },
      instructorName: 'Ahmed Hassan',
      academicDirectorName: 'Nour Khaled',
      issuedAt: '2026-03-24T16:07:00.000Z',
      grade: 'distinction',
      scorePercent: 85,
      status: 'valid',
      verificationUrl: '/verify/EDU-2026-000123',
    },
    {
      id: 'cert-102',
      verificationCode: 'EDU-2026-000124',
      student: { id: 'user-student-1', name: 'Sara Ali' },
      course: { id: 'course-4', title: 'Web Accessibility & Inclusive UI Engineering' },
      instructorName: 'Ahmed Hassan',
      academicDirectorName: 'Nour Khaled',
      issuedAt: '2026-02-12T16:05:00.000Z',
      grade: 'merit',
      scorePercent: 82,
      status: 'valid',
      verificationUrl: '/verify/EDU-2026-000124',
    },
    {
      id: 'cert-103',
      verificationCode: 'EDU-2026-000125',
      student: { id: 'user-stu-2', name: 'Karim Tarek' },
      course: { id: 'course-5', title: 'Frontend Testing & Automated QA Systems' },
      instructorName: 'Ahmed Hassan',
      academicDirectorName: 'Nour Khaled',
      issuedAt: '2026-03-21T16:35:00.000Z',
      grade: 'pass',
      scorePercent: 72,
      status: 'revoked',
      verificationUrl: '/verify/EDU-2026-000125',
    },
  ];

  const comments: CommentDto[] = [
    {
      id: 'tcomment-1',
      course: { id: 'course-1', title: 'Complete React Developer Course' },
      lesson: { id: 'lesson-101', title: 'Course Overview & Local Setup' },
      author: {
        id: 'user-student-1',
        name: 'Sara Ali',
        title: 'Product Engineer & Lifelong Learner',
        role: 'student',
        avatarUrl: users['user-student-1'].user.avatarUrl,
      },
      content: 'Should pnpm strict hoisting be enabled when cloning the starter repository?',
      status: 'approved',
      isInstructor: false,
      isSupervisorVerified: true,
      resolved: true,
      likesCount: 18,
      likedByMe: false,
      repliesCount: 1,
      replies: [
        {
          id: 'treply-1',
          commentId: 'tcomment-1',
          author: {
            id: 'user-instructor-1',
            name: 'Ahmed Hassan',
            title: 'Principal Frontend Architect & Instructor',
            role: 'instructor',
            avatarUrl: ahmedSummary.avatarUrl,
          },
          isInstructor: true,
          isSupervisorVerified: true,
          content: 'Default pnpm settings work out of the box—no extra flags needed.',
          likesCount: 9,
          likedByMe: false,
          createdAt: '2026-03-22T11:30:00.000Z',
        },
      ],
      flagReasons: [],
      rejectionReason: null,
      rejectionNotes: null,
      parentThreadPrompt: null,
      authorHistory: {
        joinedAt: '2025-09-10T08:30:00.000Z',
        totalComments: 12,
        approvedComments: 12,
        priorFlags: 0,
        trustStanding: 'good_standing',
      },
      createdAt: '2026-03-22T10:00:00.000Z',
      updatedAt: '2026-03-22T11:30:00.000Z',
    },
    {
      id: 'tcomment-2',
      course: { id: 'course-1', title: 'Complete React Developer Course' },
      lesson: { id: 'lesson-103', title: 'Component Composition & Typed Props' },
      author: {
        id: 'user-stu-2',
        name: 'Karim Tarek',
        title: 'Junior Full-Stack Developer',
        role: 'student',
        avatarUrl: users['user-stu-2'].user.avatarUrl,
      },
      content: 'Using discriminated unions for button variants eliminated three conditional bugs in my app!',
      status: 'approved',
      isInstructor: false,
      isSupervisorVerified: true,
      resolved: false,
      likesCount: 14,
      likedByMe: false,
      repliesCount: 0,
      replies: [],
      flagReasons: [],
      rejectionReason: null,
      rejectionNotes: null,
      parentThreadPrompt: null,
      authorHistory: {
        joinedAt: '2025-10-14T10:00:00.000Z',
        totalComments: 5,
        approvedComments: 5,
        priorFlags: 0,
        trustStanding: 'good_standing',
      },
      createdAt: '2026-03-23T14:20:00.000Z',
      updatedAt: '2026-03-23T14:20:00.000Z',
    },
    {
      id: 'tcomment-3',
      course: { id: 'course-1', title: 'Complete React Developer Course' },
      lesson: { id: 'lesson-102', title: 'Mental Model & Project Structure' },
      author: {
        id: 'user-student-1',
        name: 'Sara Ali',
        title: 'Product Engineer & Lifelong Learner',
        role: 'student',
        avatarUrl: users['user-student-1'].user.avatarUrl,
      },
      content: 'Can we share feature hooks across multiple sub-routes cleanly using barrel files?',
      status: 'approved',
      isInstructor: false,
      isSupervisorVerified: true,
      resolved: false,
      likesCount: 6,
      likedByMe: false,
      repliesCount: 0,
      replies: [],
      flagReasons: [],
      rejectionReason: null,
      rejectionNotes: null,
      createdAt: '2026-03-24T09:10:00.000Z',
      updatedAt: '2026-03-24T09:10:00.000Z',
    },
    {
      id: 'scm-1',
      course: { id: 'course-1', title: 'Complete React Developer Course' },
      lesson: { id: 'lesson-103', title: 'Component Composition & Typed Props' },
      author: {
        id: 'user-stu-2',
        name: 'Karim Tarek',
        title: 'Junior Full-Stack Developer',
        role: 'student',
        avatarUrl: users['user-stu-2'].user.avatarUrl,
      },
      content: 'Could we export generic slot helpers directly from src/components/ui/index.ts?',
      status: 'pending',
      isInstructor: false,
      isSupervisorVerified: false,
      resolved: false,
      likesCount: 0,
      likedByMe: false,
      repliesCount: 0,
      replies: [],
      flagReasons: [],
      authorHistory: {
        joinedAt: '2025-10-14T10:00:00.000Z',
        totalComments: 5,
        approvedComments: 4,
        priorFlags: 0,
        trustStanding: 'good_standing',
      },
      createdAt: '2026-03-25T10:15:00.000Z',
      updatedAt: '2026-03-25T10:15:00.000Z',
    },
    {
      id: 'scm-2',
      course: { id: 'course-2', title: 'UI/UX Design Masterclass with Figma' },
      lesson: { id: 'lesson-202', title: 'Mental Model & Project Structure' },
      author: {
        id: 'user-stu-3',
        name: 'Yasmine Adel',
        title: 'Student Learner',
        role: 'student',
        avatarUrl: null,
      },
      content: 'Check out this external Telegram dump for free paid templates [spam-link]',
      status: 'flagged',
      isInstructor: false,
      isSupervisorVerified: false,
      resolved: false,
      likesCount: 0,
      likedByMe: false,
      repliesCount: 0,
      replies: [],
      flagReasons: ['spam', 'Suspicious external link'],
      authorHistory: {
        joinedAt: '2025-12-01T10:00:00.000Z',
        totalComments: 3,
        approvedComments: 1,
        priorFlags: 2,
        trustStanding: 'under_watch',
      },
      createdAt: '2026-03-25T09:05:00.000Z',
      updatedAt: '2026-03-25T09:05:00.000Z',
    },
    {
      id: 'scm-3',
      course: { id: 'course-3', title: 'Advanced TypeScript & Node.js APIs' },
      lesson: { id: 'lesson-304', title: 'Hooks & Predictable State Management' },
      author: {
        id: 'user-stu-3',
        name: 'Yasmine Adel',
        title: 'Student Learner',
        role: 'student',
        avatarUrl: null,
      },
      content: 'Buy discounted followers now! Limited offer.',
      status: 'rejected',
      isInstructor: false,
      isSupervisorVerified: false,
      resolved: false,
      likesCount: 0,
      likedByMe: false,
      repliesCount: 0,
      replies: [],
      flagReasons: ['spam'],
      rejectionReason: 'spam',
      rejectionNotes: 'Unsolicited promotional link.',
      createdAt: '2026-03-23T12:00:00.000Z',
      updatedAt: '2026-03-23T12:45:00.000Z',
    },
    {
      id: 'icm-1',
      course: { id: 'course-1', title: 'Complete React Developer Course' },
      lesson: { id: 'lesson-104', title: 'Hooks & Predictable State Management' },
      author: {
        id: 'user-student-1',
        name: 'Sara Ali',
        title: 'Product Engineer & Lifelong Learner',
        role: 'student',
        avatarUrl: users['user-student-1'].user.avatarUrl,
      },
      content: 'When resetting multi-step form drafts, should useReducer dispatch RESET_DRAFT on unmount?',
      status: 'approved',
      isInstructor: false,
      isSupervisorVerified: true,
      resolved: false,
      likesCount: 4,
      likedByMe: false,
      repliesCount: 0,
      replies: [],
      flagReasons: [],
      parentThreadPrompt: {
        authorName: 'Ahmed Hassan',
        promptText: 'Post your reducer edge cases below for code review.',
      },
      createdAt: '2026-03-25T08:00:00.000Z',
      updatedAt: '2026-03-25T08:00:00.000Z',
    },
    {
      id: 'icm-2',
      course: { id: 'course-5', title: 'Frontend Testing & Automated QA Systems' },
      lesson: { id: 'lesson-502', title: 'Mental Model & Project Structure' },
      author: {
        id: 'user-stu-2',
        name: 'Karim Tarek',
        title: 'Junior Full-Stack Developer',
        role: 'student',
        avatarUrl: users['user-stu-2'].user.avatarUrl,
      },
      content: 'How should we isolate MSW handlers when running tests concurrently in Vitest?',
      status: 'approved',
      isInstructor: false,
      isSupervisorVerified: true,
      resolved: false,
      likesCount: 7,
      likedByMe: false,
      repliesCount: 0,
      replies: [],
      flagReasons: [],
      createdAt: '2026-03-24T17:45:00.000Z',
      updatedAt: '2026-03-24T17:45:00.000Z',
    },
  ];

  const notifications: NotificationDto[] = [
    {
      id: 'notif-1',
      title: 'Certificate ready to download',
      message: 'Your certificate for Complete React Developer Course has been verified and issued.',
      createdAt: '2026-03-24T16:07:00.000Z',
      read: false,
      type: 'certificate',
      link: '/certificates/cert-101',
      roles: ['student'],
    },
    {
      id: 'notif-2',
      title: 'Exam passed with distinction',
      message: 'You scored 85% on React Architecture & Hooks Certification Exam.',
      createdAt: '2026-03-24T16:05:00.000Z',
      read: false,
      type: 'exam',
      link: '/courses/course-1/exam',
      roles: ['student'],
    },
    {
      id: 'notif-3',
      title: 'Instructor replied to your question',
      message: 'Ahmed Hassan replied to your thread on Lesson 1.',
      createdAt: '2026-03-22T11:30:00.000Z',
      read: true,
      type: 'course',
      link: '/courses/course-1/learn/lesson-101',
      roles: ['student'],
    },
    {
      id: 'notif-4',
      title: 'New student question in Complete React Developer Course',
      message: 'Sara Ali asked about resetting multi-step form drafts in Lesson 4.',
      createdAt: '2026-03-25T08:02:00.000Z',
      read: false,
      type: 'course',
      link: '/instructor/comments',
      roles: ['instructor'],
    },
    {
      id: 'notif-5',
      title: 'Course review feedback received',
      message: 'Supervisor left actionable feedback on Legacy Webpack 4 Migration Playbook.',
      createdAt: '2026-03-21T16:05:00.000Z',
      read: false,
      type: 'moderation',
      link: '/instructor/courses/course-inst-rejected/edit',
      roles: ['instructor'],
    },
    {
      id: 'notif-6',
      title: 'Course awaiting quality review',
      message: 'React Server Components & Streaming Deep Dive was submitted by Ahmed Hassan.',
      createdAt: '2026-03-24T11:35:00.000Z',
      read: false,
      type: 'moderation',
      link: '/supervisor/course-reviews/course-inst-pending',
      roles: ['supervisor', 'admin'],
    },
    {
      id: 'notif-7',
      title: 'Flagged comment escalated',
      message: 'Automated spam guard flagged comment scm-2 in UI/UX Design Masterclass.',
      createdAt: '2026-03-25T09:06:00.000Z',
      read: false,
      type: 'moderation',
      link: '/supervisor/comments',
      roles: ['supervisor', 'admin'],
    },
    {
      id: 'notif-8',
      title: 'New instructor application pending',
      message: 'Tamer Mansour applied to teach Cloud Infrastructure courses.',
      createdAt: '2026-03-20T09:10:00.000Z',
      read: false,
      type: 'system',
      link: '/admin/users',
      roles: ['admin'],
    },
  ];

  const courseReviewSubmissions: CourseReviewSubmissionDto[] = [
    {
      id: 'sub-1',
      course: courses.find((c) => c.id === 'course-inst-pending')!,
      submittedAt: '2026-03-24T11:30:00.000Z',
      sectionsCount: cPT.sectionsCount,
      lessonsCount: cPT.lessonsCount,
      totalDurationSeconds: cPT.durationSeconds,
      questionBankCount: 10,
      requiredQuestionsCount: 10,
      reviewDecision: 'pending_review',
      reviewNotes: null,
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
      course: courses.find((c) => c.id === 'course-inst-rejected')!,
      submittedAt: '2026-03-19T14:00:00.000Z',
      sectionsCount: cRT.sectionsCount,
      lessonsCount: cRT.lessonsCount,
      totalDurationSeconds: cRT.durationSeconds,
      questionBankCount: 4,
      requiredQuestionsCount: 10,
      reviewDecision: 'changes_requested',
      reviewNotes:
        'Please expand Module 3 with Vite production chunk-splitting benchmarks and add at least 10 bank questions.',
      checklist: {
        titleAndDescription: 'pass',
        coverAndDemoVideo: 'pass',
        curriculumComplete: 'fail',
        enoughQuestionsInBank: 'fail',
        pricingSet: 'pass',
      },
    },
    {
      id: 'sub-3',
      course: courses.find((c) => c.id === 'course-3')!,
      submittedAt: '2026-01-20T10:00:00.000Z',
      sectionsCount: c3T.sectionsCount,
      lessonsCount: c3T.lessonsCount,
      totalDurationSeconds: c3T.durationSeconds,
      questionBankCount: 12,
      requiredQuestionsCount: 8,
      reviewDecision: 'approved',
      reviewNotes: 'Clean syllabus and comprehensive TypeScript exam coverage.',
      checklist: {
        titleAndDescription: 'pass',
        coverAndDemoVideo: 'pass',
        curriculumComplete: 'pass',
        enoughQuestionsInBank: 'pass',
        pricingSet: 'pass',
      },
    },
  ];

  const reports: ModerationReportDto[] = [
    {
      id: 'rep-1',
      targetType: 'comment',
      targetId: 'scm-2',
      targetTitle: 'Suspicious Telegram external link in UI/UX lesson 2',
      reportedBy: 'Sara Ali',
      reason: 'Promotional spam link soliciting off-platform downloads',
      severity: 'high',
      status: 'open',
      resolutionNotes: null,
      createdAt: '2026-03-25T09:05:00.000Z',
      resolvedAt: null,
    },
    {
      id: 'rep-2',
      targetType: 'course',
      targetId: 'course-inst-rejected',
      targetTitle: 'Missing video captions in Lesson 5',
      reportedBy: 'Automated QA Check',
      reason: 'Accessibility captions missing on one uploaded video',
      severity: 'medium',
      status: 'investigating',
      resolutionNotes: null,
      createdAt: '2026-03-24T14:20:00.000Z',
      resolvedAt: null,
    },
    {
      id: 'rep-3',
      targetType: 'user',
      targetId: 'user-stu-3',
      targetTitle: 'Repeated spam postings across design courses',
      reportedBy: 'Hana Mostafa',
      reason: 'Multiple confirmed spam violations within 24 hours',
      severity: 'high',
      status: 'resolved',
      resolutionNotes: 'User suspended and promotional comments hidden.',
      createdAt: '2026-03-23T12:50:00.000Z',
      resolvedAt: '2026-03-23T13:15:00.000Z',
    },
  ];

  const instructorApplications: PendingInstructorApplicationDto[] = [
    {
      id: 'app-1',
      userId: 'user-inst-pending',
      name: 'Tamer Mansour',
      email: 'tamer.mansour@eduhub.com',
      specialty: 'Cloud Infrastructure & Kubernetes',
      avatarUrl: users['user-inst-pending'].user.avatarUrl,
      submittedAt: '2026-03-20T09:00:00.000Z',
    },
  ];

  const testimonials: TestimonialDto[] = [
    {
      id: 'test-1',
      name: 'Sara Ali',
      role: 'Product Engineer at PayFlow',
      avatarUrl: users['user-student-1'].user.avatarUrl,
      courseTitle: 'Complete React Developer Course',
      rating: 5,
      quote:
        'Passing the React certification exam gave our team clear architecture patterns we immediately shipped into production.',
    },
    {
      id: 'test-2',
      name: 'Karim Tarek',
      role: 'Full-Stack Developer',
      avatarUrl: users['user-stu-2'].user.avatarUrl,
      courseTitle: 'UI/UX Design Masterclass with Figma',
      rating: 5,
      quote:
        'The design token module helped bridge every handoff conversation between our designers and engineers.',
    },
    {
      id: 'test-3',
      name: 'Dina Sherif',
      role: 'Senior Data Analyst',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300',
      courseTitle: 'Python for Data Science & Machine Learning',
      rating: 5,
      quote:
        'Clean, well-paced lessons paired with realistic datasets and verification certificates employers trust.',
    },
  ];

  const platformSettings: PlatformSettingsDto = {
    platformName: 'EduHub',
    currency: 'USD',
    defaultPassScorePercent: 60,
    maxAvatarSizeBytes: 2_097_152,
    maxImageSizeBytes: 5_242_880,
    maxVideoSizeBytes: 2_147_483_648,
  };

  const permissionsMatrix: RolePermissionItemDto[] = [
    {
      id: 'perm-1',
      feature: 'Browse catalog, preview demos & enroll in courses',
      category: 'learning',
      student: true,
      instructor: true,
      supervisor: true,
      admin: true,
    },
    {
      id: 'perm-2',
      feature: 'Take timed certification exams & download certificates',
      category: 'learning',
      student: true,
      instructor: false,
      supervisor: false,
      admin: true,
    },
    {
      id: 'perm-3',
      feature: 'Author courses, upload videos & manage question banks',
      category: 'teaching',
      student: false,
      instructor: true,
      supervisor: false,
      admin: true,
    },
    {
      id: 'perm-4',
      feature: 'Moderate lesson comments & audit course quality reviews',
      category: 'moderation',
      student: false,
      instructor: false,
      supervisor: true,
      admin: true,
    },
    {
      id: 'perm-5',
      feature: 'Manage users, categories, certificates & platform settings',
      category: 'administration',
      student: false,
      instructor: false,
      supervisor: false,
      admin: true,
    },
  ];

  const supervisorAuditActions: SupervisorAuditActionDto[] = [
    {
      id: 'sa-1',
      actionType: 'approved',
      summary: 'Approved comment thread tcomment-1 on Complete React Developer Course',
      actorName: 'Hana Mostafa',
      occurredAt: '2026-03-25T09:40:00.000Z',
    },
    {
      id: 'sa-2',
      actionType: 'rejected',
      summary: 'Rejected spam comment scm-3 with reason spam',
      actorName: 'Hana Mostafa',
      occurredAt: '2026-03-23T12:45:00.000Z',
    },
  ];

  const adminActivity: AdminActivityItemDto[] = [
    {
      id: 'adm-act-1',
      title: 'Certificate Issued',
      description: 'Certificate EDU-2026-000123 generated for Sara Ali',
      occurredAt: '2026-03-24T16:07:00.000Z',
    },
    {
      id: 'adm-act-2',
      title: 'Course Submitted',
      description: 'Ahmed Hassan submitted React Server Components & Streaming Deep Dive',
      occurredAt: '2026-03-24T11:30:00.000Z',
    },
  ];

  const emailAliases: Record<string, string> = {
    'ahmed.instructor@eduhub.com': 'ahmed.hassan@eduhub.com',
    'nour.admin@eduhub.com': 'nour.khaled@eduhub.com',
    'hana.supervisor@eduhub.com': 'hana.mostafa@eduhub.com',
  };

  return {
    idCounter: 1000,
    users,
    emailAliases,
    pendingRegistrations: {},
    passwordResets: {},
    refreshTokens: {},
    revokedAccessTokens: [],
    categories,
    courses,
    curricula,
    reviews,
    enrollments,
    comments,
    commentLikes: {
      commentLikedUserIds: {},
      replyLikedUserIds: {},
    },
    questions,
    examConfigs,
    examAttempts,
    certificates,
    notifications,
    courseReviewSubmissions,
    reports,
    instructorApplications,
    testimonials,
    newsletterSubscribers: [],
    platformSettings,
    permissionsMatrix,
    uploads: [],
    supervisorAuditActions,
    adminActivity,
  };
}

export function buildExamAttemptSummary(
  attempt: MockExamAttemptRecord
): ExamAttemptSummaryDto {
  const startedMs = new Date(attempt.startedAt).getTime();
  const endedMs = attempt.submittedAt ? new Date(attempt.submittedAt).getTime() : Date.now();
  const durationTakenSeconds = Math.max(0, Math.round((endedMs - startedMs) / 1000));
  return {
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    courseId: attempt.courseId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    durationTakenSeconds,
    scorePercent: attempt.scorePercent,
    correctCount: attempt.correctCount,
    wrongCount: attempt.wrongCount,
    skippedCount: attempt.skippedCount,
    passed: attempt.passed,
  };
}
