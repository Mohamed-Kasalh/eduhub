import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  UserRole,
  UserProfile,
  ROLE_USERS,
  ALL_USERS,
  COURSES,
  CATEGORIES,
  LESSONS,
  COMMENTS,
  EXAMS,
  EXAM_QUESTIONS,
  CERTIFICATES,
  NOTIFICATIONS,
  MODERATION_REPORTS,
  INITIAL_COURSE_REVIEWS,
  Course,
  Category,
  Lesson,
  CourseComment,
  ExamConfig,
  ExamQuestion,
  CertificateRecord,
  NotificationItem,
  ModerationReport,
  CourseReview,
} from '../data/mockData';
import {
  ALL_STUDENT_LESSONS,
  INITIAL_LESSON_WATCH_MAP,
  INITIAL_EXAM_BEST_SCORES,
  INITIAL_THREADED_COMMENTS,
  ThreadedLessonComment,
} from '../data/studentLearningData';
import {
  INITIAL_EXAM_ATTEMPTS,
  DEFAULT_DEMO_ANSWERS,
  ExamAttemptRecord,
} from '../data/examAndCertData';

export type ToastVariant = 'success' | 'warning' | 'danger' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
}

interface AppContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentUser: UserProfile | null;
  getDashboardPath: (r?: UserRole) => string;
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  lessons: Lesson[];
  setLessons: React.Dispatch<React.SetStateAction<Lesson[]>>;
  comments: CourseComment[];
  setComments: React.Dispatch<React.SetStateAction<CourseComment[]>>;
  exams: ExamConfig[];
  setExams: React.Dispatch<React.SetStateAction<ExamConfig[]>>;
  questions: ExamQuestion[];
  setQuestions: React.Dispatch<React.SetStateAction<ExamQuestion[]>>;
  certificates: CertificateRecord[];
  setCertificates: React.Dispatch<React.SetStateAction<CertificateRecord[]>>;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  reports: ModerationReport[];
  setReports: React.Dispatch<React.SetStateAction<ModerationReport[]>>;
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  wishlistIds: string[];
  toggleWishlist: (courseId: string) => void;
  enrolledCourseIds: string[];
  enrollInCourse: (courseId: string) => void;
  reviews: CourseReview[];
  addCourseReview: (review: Omit<CourseReview, 'id' | 'createdAt' | 'helpfulCount'>) => void;
  lessonWatchMap: Record<string, Record<string, number>>;
  getLessonWatchPercent: (courseId: string, lessonId: string) => number;
  updateLessonWatchPercent: (courseId: string, lessonId: string, percent: number) => void;
  toggleLessonCompleted: (courseId: string, lessonId: string) => boolean;
  completeAllCourseLessons: (courseId: string) => void;
  getCourseProgressStats: (courseId: string) => {
    completedLessons: number;
    inProgressLessons: number;
    notStartedLessons: number;
    totalLessons: number;
    overallPercent: number;
  };
  examBestScores: Record<string, number | null>;
  setCourseExamScore: (courseId: string, score: number) => void;
  examAttempts: ExamAttemptRecord[];
  addExamAttempt: (attempt: Omit<ExamAttemptRecord, 'id' | 'attemptNumber'>) => void;
  lastSubmittedAnswers: Record<string, number[]>;
  setLastSubmittedAnswers: React.Dispatch<React.SetStateAction<Record<string, number[]>>>;
  threadedComments: ThreadedLessonComment[];
  setThreadedComments: React.Dispatch<React.SetStateAction<ThreadedLessonComment[]>>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case 'student':
      return '/student/dashboard';
    case 'instructor':
      return '/instructor/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'supervisor':
      return '/supervisor/dashboard';
    case 'guest':
    default:
      return '/';
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('student');
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [lessons, setLessons] = useState<Lesson[]>(LESSONS);
  const [comments, setComments] = useState<CourseComment[]>(COMMENTS);
  const [exams, setExams] = useState<ExamConfig[]>(EXAMS);
  const [questions, setQuestions] = useState<ExamQuestion[]>(EXAM_QUESTIONS);
  const [certificates, setCertificates] = useState<CertificateRecord[]>(CERTIFICATES);
  const [notifications, setNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);
  const [reports, setReports] = useState<ModerationReport[]>(MODERATION_REPORTS);
  const [users, setUsers] = useState<UserProfile[]>(ALL_USERS);
  const [wishlistIds, setWishlistIds] = useState<string[]>(['course-2', 'course-6']);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>(
    ['course-1', 'course-2', 'course-3', 'course-4', 'course-5', 'course-9']
  );
  const [reviews, setReviews] = useState<CourseReview[]>(INITIAL_COURSE_REVIEWS);
  const [lessonWatchMap, setLessonWatchMap] = useState<Record<string, Record<string, number>>>(
    INITIAL_LESSON_WATCH_MAP
  );
  const [examBestScores, setExamBestScores] = useState<Record<string, number | null>>(
    INITIAL_EXAM_BEST_SCORES
  );
  const [examAttempts, setExamAttempts] = useState<ExamAttemptRecord[]>(INITIAL_EXAM_ATTEMPTS);
  const [lastSubmittedAnswers, setLastSubmittedAnswers] =
    useState<Record<string, number[]>>(DEFAULT_DEMO_ANSWERS);
  const [threadedComments, setThreadedComments] = useState<ThreadedLessonComment[]>(
    INITIAL_THREADED_COMMENTS
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => {
        removeToast(id);
      }, 4200);
    },
    [removeToast]
  );

  const setRole = useCallback(
    (nextRole: UserRole) => {
      setRoleState(nextRole);
      const label =
        nextRole === 'guest'
          ? 'Guest visitor'
          : `${ROLE_USERS[nextRole].name} (${nextRole.charAt(0).toUpperCase() + nextRole.slice(1)})`;
      addToast({
        title: `Switched view to ${label}`,
        message: 'Sidebar navigation and route permissions updated immediately.',
        variant: 'info',
      });
    },
    [addToast]
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const toggleWishlist = useCallback(
    (courseId: string) => {
      const targetCourse = courses.find((c) => c.id === courseId);
      setWishlistIds((prev) => {
        const exists = prev.includes(courseId);
        const next = exists ? prev.filter((id) => id !== courseId) : [...prev, courseId];
        addToast({
          title: exists ? 'Removed from wishlist' : 'Added to wishlist',
          message: targetCourse ? targetCourse.title : undefined,
          variant: exists ? 'info' : 'success',
        });
        return next;
      });
    },
    [courses, addToast]
  );

  const enrollInCourse = useCallback(
    (courseId: string) => {
      const targetCourse = courses.find((c) => c.id === courseId);
      setEnrolledCourseIds((prev) => (prev.includes(courseId) ? prev : [...prev, courseId]));
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? {
                ...c,
                progress: typeof c.progress === 'number' ? c.progress : 12,
                studentsCount: c.studentsCount + 1,
              }
            : c
        )
      );
      setLessonWatchMap((prev) => {
        if (prev[courseId]) return prev;
        return {
          ...prev,
          [courseId]: {
            'lesson-101': 100,
            'lesson-102': 45,
          },
        };
      });
      addToast({
        title: 'Enrollment confirmed!',
        message: targetCourse
          ? `You now have full access to ${targetCourse.title}.`
          : 'You can start watching lessons right away.',
        variant: 'success',
      });
    },
    [courses, addToast]
  );

  const addCourseReview = useCallback(
    (newRev: Omit<CourseReview, 'id' | 'createdAt' | 'helpfulCount'>) => {
      const created: CourseReview = {
        ...newRev,
        id: `rev-${Date.now()}`,
        createdAt: 'Just now',
        helpfulCount: 1,
      };
      setReviews((prev) => [created, ...prev]);
      setCourses((prev) =>
        prev.map((c) =>
          c.id === newRev.courseId ? { ...c, reviewCount: c.reviewCount + 1 } : c
        )
      );
      addToast({
        title: 'Thank you for your review!',
        message: 'Your rating and feedback have been published.',
        variant: 'success',
      });
    },
    [addToast]
  );

  const syncCourseProgressPercent = useCallback(
    (courseId: string, courseMap: Record<string, number>) => {
      const total = ALL_STUDENT_LESSONS.length;
      const completed = ALL_STUDENT_LESSONS.filter((l) => (courseMap[l.id] || 0) >= 90).length;
      const pct = Math.round((completed / total) * 100);
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, progress: pct } : c))
      );
    },
    []
  );

  const getLessonWatchPercent = useCallback(
    (courseId: string, lessonId: string): number => {
      const courseMap = lessonWatchMap[courseId] || INITIAL_LESSON_WATCH_MAP['course-1'] || {};
      return courseMap[lessonId] ?? 0;
    },
    [lessonWatchMap]
  );

  const updateLessonWatchPercent = useCallback(
    (courseId: string, lessonId: string, percent: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(percent)));
      setLessonWatchMap((prev) => {
        const existingCourseMap = prev[courseId] || { ...(INITIAL_LESSON_WATCH_MAP['course-1'] || {}) };
        const updatedCourseMap = {
          ...existingCourseMap,
          [lessonId]: clamped,
        };
        syncCourseProgressPercent(courseId, updatedCourseMap);
        return {
          ...prev,
          [courseId]: updatedCourseMap,
        };
      });
    },
    [syncCourseProgressPercent]
  );

  const toggleLessonCompleted = useCallback(
    (courseId: string, lessonId: string): boolean => {
      const currentPct = getLessonWatchPercent(courseId, lessonId);
      const willComplete = currentPct < 90;
      const nextPct = willComplete ? 100 : 0;
      updateLessonWatchPercent(courseId, lessonId, nextPct);
      return willComplete;
    },
    [getLessonWatchPercent, updateLessonWatchPercent]
  );

  const completeAllCourseLessons = useCallback(
    (courseId: string) => {
      const fullMap: Record<string, number> = {};
      ALL_STUDENT_LESSONS.forEach((l) => {
        fullMap[l.id] = 100;
      });
      setLessonWatchMap((prev) => ({
        ...prev,
        [courseId]: fullMap,
      }));
      syncCourseProgressPercent(courseId, fullMap);
    },
    [syncCourseProgressPercent]
  );

  const getCourseProgressStats = useCallback(
    (courseId: string) => {
      const courseMap = lessonWatchMap[courseId] || INITIAL_LESSON_WATCH_MAP['course-1'] || {};
      const totalLessons = ALL_STUDENT_LESSONS.length;
      let completedLessons = 0;
      let inProgressLessons = 0;
      let notStartedLessons = 0;

      ALL_STUDENT_LESSONS.forEach((l) => {
        const pct = courseMap[l.id] ?? 0;
        if (pct >= 90) {
          completedLessons += 1;
        } else if (pct > 0) {
          inProgressLessons += 1;
        } else {
          notStartedLessons += 1;
        }
      });

      const overallPercent = Math.round((completedLessons / totalLessons) * 100);
      return {
        completedLessons,
        inProgressLessons,
        notStartedLessons,
        totalLessons,
        overallPercent,
      };
    },
    [lessonWatchMap]
  );

  const setCourseExamScore = useCallback((courseId: string, score: number) => {
    setExamBestScores((prev) => ({
      ...prev,
      [courseId]: Math.max(prev[courseId] ?? 0, score),
    }));
  }, []);

  const addExamAttempt = useCallback(
    (attempt: Omit<ExamAttemptRecord, 'id' | 'attemptNumber'>) => {
      setExamAttempts((prev) => {
        const courseAttemptsCount = prev.filter((a) => a.courseId === attempt.courseId).length;
        const created: ExamAttemptRecord = {
          ...attempt,
          id: `att-${Date.now()}`,
          attemptNumber: courseAttemptsCount + 1,
        };
        return [...prev, created];
      });
      setCourseExamScore(attempt.courseId, attempt.scorePercent);
    },
    [setCourseExamScore]
  );

  const currentUser = role === 'guest' ? null : ROLE_USERS[role];

  const getDashboardPath = useCallback(
    (targetRole?: UserRole) => getRoleDashboardPath(targetRole ?? role),
    [role]
  );

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        currentUser,
        getDashboardPath,
        courses,
        setCourses,
        categories,
        setCategories,
        lessons,
        setLessons,
        comments,
        setComments,
        exams,
        setExams,
        questions,
        setQuestions,
        certificates,
        setCertificates,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        reports,
        setReports,
        users,
        setUsers,
        wishlistIds,
        toggleWishlist,
        enrolledCourseIds,
        enrollInCourse,
        reviews,
        addCourseReview,
        lessonWatchMap,
        getLessonWatchPercent,
        updateLessonWatchPercent,
        toggleLessonCompleted,
        completeAllCourseLessons,
        getCourseProgressStats,
        examBestScores,
        setCourseExamScore,
        examAttempts,
        addExamAttempt,
        lastSubmittedAnswers,
        setLastSubmittedAnswers,
        threadedComments,
        setThreadedComments,
        searchQuery,
        setSearchQuery,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
