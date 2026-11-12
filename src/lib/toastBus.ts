export type ToastVariant = 'success' | 'warning' | 'danger' | 'info';

export interface ToastPayload {
  title: string;
  message?: string;
  variant: ToastVariant;
}

type ToastListener = (toast: ToastPayload) => void;
const listeners = new Set<ToastListener>();

/** Emits a transient toast alert from application services, hooks, or event handlers. */
export function emitToast(toast: ToastPayload): void {
  listeners.forEach((listener) => listener(toast));
}

/** Subscribes to emitted toast events inside `AppProvider`. */
export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
