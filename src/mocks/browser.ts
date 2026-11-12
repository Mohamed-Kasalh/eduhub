import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Browser Service Worker instance activated only when `VITE_USE_MOCK=true`. */
export const worker = setupWorker(...handlers);
