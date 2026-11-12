import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToasts, type ToastPayload } from '../lib/toastBus';
import {
  COURSES,
  CATEGORIES,
  EXAMS,
  EXAM_QUESTIONS,
  CERTIFICATES,
  NOTIFICATIONS,
  MODERATION_REPORTS,
  Course,
  Category,
  ExamConfig,
  ExamQuestion,
  CertificateRecord,
  NotificationItem,
  ModerationReport,
} from '../data/mockData';
import {
  ALL_STUDENT_LESSONS,
  INITIAL_LESSON_WATCH_MAP,
  INITIAL_EXAM_BEST_SCORES,
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
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  exams: ExamConfig[];
  setExams: React.Dispatch<React.SetStateAction<ExamConfig[]>>;
  questions: ExamQuestion[];
  setQuestions: React.Dispatch<React.SetStateAction<ExamQuestion[]>>;
  certificates: CertificateRecord[];
  setCertificates: React.Dispatch<React.SetStateAction<CertificateRecord[]>>;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  toggleNotificationRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  markAllNotificationsRead: () => void;
  reports: ModerationReport[];
  setReports: React.Dispatch<React.SetStateAction<ModerationReport[]>>;
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
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [exams, setExams] = useState<ExamConfig[]>(EXAMS);
  const [questions, setQuestions] = useState<ExamQuestion[]>(EXAM_QUESTIONS);
  const [certificates, setCertificates] = useState<CertificateRecord[]>(CERTIFICATES);
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);
  const [reports, setReports] = useState<ModerationReport[]>(MODERATION_REPORTS);
  const [lessonWatchMap, setLessonWatchMap] = useState<Record<string, Record<string, number>>>(
    INITIAL_LESSON_WATCH_MAP
  );
  const [examBestScores, setExamBestScores] = useState<Record<string, number | null>>(
    INITIAL_EXAM_BEST_SCORES
  );
  const [examAttempts, setExamAttempts] = useState<ExamAttemptRecord[]>(INITIAL_EXAM_ATTEMPTS);
  const [lastSubmittedAnswers, setLastSubmittedAnswers] =
    useState<Record<string, number[]>>(DEFAULT_DEMO_ANSWERS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: ToastPayload) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  useEffect(() => {
    return subscribeToasts(addToast);
  }, [addToast]);

  const notifications = useMemo(
    () =>
      role === 'guest'
        ? []
        : allNotifications.filter((n) => !n.roles || n.roles.includes(role)),
    [allNotifications, role]
  );

  const markNotificationRead = useCallback((id: string) => {
    setAllNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const toggleNotificationRead = useCallback((id: string) => {
    setAllNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setAllNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    if (role === 'guest') return;
    setAllNotifications((prev) =>
      prev.map((n) => (!n.roles || n.roles.includes(role) ? { ...n, read: true } : n))
    );
  }, [role]);

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

  return (
    <AppContext.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
        courses,
        setCourses,
        categories,
        setCategories,
        exams,
        setExams,
        questions,
        setQuestions,
        certificates,
        setCertificates,
        notifications,
        markNotificationRead,
        toggleNotificationRead,
        deleteNotification,
        markAllNotificationsRead,
        reports,
        setReports,
        completeAllCourseLessons,
        getCourseProgressStats,
        examBestScores,
        setCourseExamScore,
        examAttempts,
        addExamAttempt,
        lastSubmittedAnswers,
        setLastSubmittedAnswers,
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
