import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { subscribeToasts, type ToastPayload } from '../lib/toastBus';
import {
  COURSES,
  CATEGORIES,
  EXAMS,
  EXAM_QUESTIONS,
  CERTIFICATES,
  MODERATION_REPORTS,
  type Course,
  type Category,
  type ExamConfig,
  type ExamQuestion,
  type CertificateRecord,
  type ModerationReport,
} from '../data/mockData';

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
  reports: ModerationReport[];
  setReports: React.Dispatch<React.SetStateAction<ModerationReport[]>>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [exams, setExams] = useState<ExamConfig[]>(EXAMS);
  const [questions, setQuestions] = useState<ExamQuestion[]>(EXAM_QUESTIONS);
  const [certificates, setCertificates] = useState<CertificateRecord[]>(CERTIFICATES);
  const [reports, setReports] = useState<ModerationReport[]>(MODERATION_REPORTS);
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
        reports,
        setReports,
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
