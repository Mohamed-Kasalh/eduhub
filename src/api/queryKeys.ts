export const queryKeys = {
  me: {
    all: ['me'] as const,
    profile: ['me', 'profile'] as const,
    sessions: ['me', 'sessions'] as const,
    dashboard: ['me', 'dashboard'] as const,
    enrollments: (params?: unknown) => ['me', 'enrollments', params ?? {}] as const,
    wishlist: ['me', 'wishlist'] as const,
    courseProgress: (courseId: string) => ['me', 'progress', courseId] as const,
    lessonDetail: (courseId: string, lessonId: string) =>
      ['me', 'lesson', courseId, lessonId] as const,
    searchHistory: ['me', 'searchHistory'] as const,
  },
  publicConfig: {
    config: ['public', 'config'] as const,
    stats: ['public', 'stats'] as const,
    categories: ['public', 'categories'] as const,
    instructors: (featured = true) => ['public', 'instructors', featured] as const,
    testimonials: ['public', 'testimonials'] as const,
    searchSuggestions: (q: string) => ['public', 'searchSuggestions', q] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: (params?: unknown) => ['courses', 'list', params ?? {}] as const,
    detail: (id: string) => ['courses', 'detail', id] as const,
    related: (id: string) => ['courses', 'related', id] as const,
    reviewsPrefix: (id: string) => ['courses', 'reviews', id] as const,
    reviews: (id: string, params?: unknown) => ['courses', 'reviews', id, params ?? {}] as const,
  },
  comments: {
    lesson: (lessonId: string, params?: unknown) =>
      ['comments', 'lesson', lessonId, params ?? {}] as const,
  },
  exams: {
    config: (courseId: string) => ['exams', 'config', courseId] as const,
    attempts: (courseId: string) => ['exams', 'attempts', courseId] as const,
    result: (attemptId: string) => ['exams', 'result', attemptId] as const,
  },
  certificates: {
    all: ['certificates'] as const,
    detail: (id: string) => ['certificates', 'detail', id] as const,
    verify: (code: string) => ['certificates', 'verify', code] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (params?: unknown) => ['notifications', 'list', params ?? {}] as const,
  },
  instructor: {
    dashboard: ['instructor', 'dashboard'] as const,
    courses: (params?: unknown) => ['instructor', 'courses', params ?? {}] as const,
    courseDetail: (id: string) => ['instructor', 'course', id] as const,
    questions: (courseId: string, params?: unknown) =>
      ['instructor', 'questions', courseId, params ?? {}] as const,
    examSettings: (courseId: string) => ['instructor', 'examSettings', courseId] as const,
    students: (params?: unknown) => ['instructor', 'students', params ?? {}] as const,
    studentProgress: (studentId: string, courseId: string) =>
      ['instructor', 'studentProgress', studentId, courseId] as const,
    comments: (params?: unknown) => ['instructor', 'comments', params ?? {}] as const,
  },
  supervisor: {
    dashboard: ['supervisor', 'dashboard'] as const,
    comments: (params?: unknown) => ['supervisor', 'comments', params ?? {}] as const,
    courseReviews: (params?: unknown) => ['supervisor', 'courseReviews', params ?? {}] as const,
    reports: (params?: unknown) => ['supervisor', 'reports', params ?? {}] as const,
  },
  admin: {
    dashboard: ['admin', 'dashboard'] as const,
    users: (params?: unknown) => ['admin', 'users', params ?? {}] as const,
    courses: (params?: unknown) => ['admin', 'courses', params ?? {}] as const,
    categories: ['admin', 'categories'] as const,
    certificates: (params?: unknown) => ['admin', 'certificates', params ?? {}] as const,
    settings: ['admin', 'settings'] as const,
    permissions: ['admin', 'permissions'] as const,
  },
};
