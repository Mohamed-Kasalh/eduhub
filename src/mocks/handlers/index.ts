import { adminHandlers } from './admin.handlers';
import { authHandlers } from './auth.handlers';
import { catalogHandlers } from './catalog.handlers';
import { certificatesHandlers } from './certificates.handlers';
import { commentsHandlers } from './comments.handlers';
import { examsHandlers } from './exams.handlers';
import { instructorHandlers } from './instructor.handlers';
import { learningHandlers } from './learning.handlers';
import { meHandlers } from './me.handlers';
import { notificationsHandlers } from './notifications.handlers';
import { questionsHandlers } from './questions.handlers';
import { supervisorHandlers } from './supervisor.handlers';
import { uploadsHandlers } from './uploads.handlers';

export const handlers = [
  ...authHandlers,
  ...meHandlers,
  ...catalogHandlers,
  ...learningHandlers,
  ...commentsHandlers,
  ...examsHandlers,
  ...certificatesHandlers,
  ...notificationsHandlers,
  ...uploadsHandlers,
  ...instructorHandlers,
  ...questionsHandlers,
  ...supervisorHandlers,
  ...adminHandlers,
];
