import type {
  AuthenticatedRoleDto,
  CurriculumLessonDto,
  CurriculumSectionDto,
  NotificationTypeDto,
  UserSummaryDto,
} from '../api/dto';
import { apiConfig } from '../api/config';
import {
  createInitialMockDbState,
  type MockDbState,
  type MockUserRecord,
} from './seed';

const MOCK_DB_STORAGE_KEY = 'eduhub_msw_mock_db_v1';

let dbInstance: MockDbState | null = null;

function loadPersistedDb(): MockDbState | null {
  if (!apiConfig.mockPersist || typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(MOCK_DB_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'users' in parsed &&
      'courses' in parsed
    ) {
      return parsed as MockDbState;
    }
    return null;
  } catch {
    return null;
  }
}

/** Saves the current mock DB snapshot when `VITE_MOCK_PERSIST=true`. */
export function persistMockDb(): void {
  if (!apiConfig.mockPersist || !dbInstance || typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(MOCK_DB_STORAGE_KEY, JSON.stringify(dbInstance));
  } catch {
    // Ignore storage quota or private mode failures.
  }
}

/** Returns the active stateful in-memory mock database singleton. */
export function getMockDb(): MockDbState {
  if (!dbInstance) {
    dbInstance = loadPersistedDb() ?? createInitialMockDbState();
  }
  return dbInstance;
}

/** Resets the in-memory mock database and clears persisted mock state if enabled. */
export function resetMockDb(): MockDbState {
  dbInstance = createInitialMockDbState();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(MOCK_DB_STORAGE_KEY);
    } catch {
      // Ignore storage access errors.
    }
  }
  return dbInstance;
}

/** Generates a monotonically increasing deterministic string ID with a domain prefix. */
export function nextDbId(prefix: string): string {
  const db = getMockDb();
  db.idCounter += 1;
  return `${prefix}-${db.idCounter}`;
}

export function nowUtcIso(): string {
  return new Date().toISOString();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Resolves a user record by email (supporting canonical demo aliases). */
export function findUserRecordByEmail(email: string): MockUserRecord | null {
  const db = getMockDb();
  const normalized = normalizeEmail(email);
  const resolvedEmail = db.emailAliases[normalized] ?? normalized;
  for (const record of Object.values(db.users)) {
    if (normalizeEmail(record.user.email) === resolvedEmail) {
      return record;
    }
  }
  return null;
}

export function toUserSummary(record: MockUserRecord): UserSummaryDto {
  return {
    id: record.user.id,
    name: record.user.name,
    title: record.user.title,
    role: record.user.role,
    avatarUrl: record.user.avatarUrl,
  };
}

/** Finds a lesson and its parent section/course inside seeded curricula. */
export function findLessonContext(lessonId: string): {
  courseId: string;
  section: CurriculumSectionDto;
  lesson: CurriculumLessonDto;
  allCourseLessons: CurriculumLessonDto[];
} | null {
  const db = getMockDb();
  for (const [courseId, sections] of Object.entries(db.curricula)) {
    const allCourseLessons = sections.flatMap((s) => s.lessons);
    for (const section of sections) {
      const lesson = section.lessons.find((l) => l.id === lessonId);
      if (lesson) {
        return { courseId, section, lesson, allCourseLessons };
      }
    }
  }
  return null;
}

/** Appends a role-scoped notification to the mock inbox. */
export function pushMockNotification(params: {
  title: string;
  message: string;
  type: NotificationTypeDto;
  link: string;
  roles: AuthenticatedRoleDto[];
}): void {
  const db = getMockDb();
  db.notifications.unshift({
    id: nextDbId('notif'),
    title: params.title,
    message: params.message,
    createdAt: nowUtcIso(),
    read: false,
    type: params.type,
    link: params.link,
    roles: params.roles,
  });
}
