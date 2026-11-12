import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { authService, dispatchSessionExpired, tokenStore } from '@/api';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { createAppQueryClient } from '@/lib/queryClient';
import { appRoutes } from '@/routes';

const PUBLIC_ROUTES = [
  '/',
  '/design-system',
  '/courses',
  '/courses/course-1',
  '/verify/EDUHUB-2026-8841',
  '/login',
  '/signup',
  '/verify-otp?email=sara.ali%40eduhub.com',
  '/forgot-password',
  '/reset-password',
  '/403',
  '/404',
  '/500',
  '/not-found-route-check',
];

const STUDENT_ROUTES = [
  '/student/dashboard',
  '/student/courses',
  '/student/progress/course-1',
  '/learn/course-1/lesson-101',
  '/exam/course-3',
  '/exam/course-3/result',
  '/certificates',
  '/certificates/cert-1',
  '/profile',
  '/notifications',
];

const INSTRUCTOR_ROUTES = [
  '/instructor/dashboard',
  '/instructor/courses',
  '/instructor/courses/new',
  '/instructor/question-bank',
  '/instructor/exam-settings',
  '/instructor/students',
  '/instructor/comments',
  '/profile',
  '/notifications',
];

const ADMIN_ROUTES = [
  '/admin/dashboard',
  '/admin/users',
  '/admin/courses',
  '/admin/categories',
  '/admin/certificates',
  '/admin/settings',
  '/profile',
  '/notifications',
];

const SUPERVISOR_ROUTES = [
  '/supervisor/dashboard',
  '/supervisor/comments',
  '/supervisor/course-review',
  '/supervisor/reports',
  '/profile',
  '/notifications',
];

async function renderAppAt(initialEntry: string) {
  const queryClient = createAppQueryClient();
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [initialEntry],
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <RouterProvider router={router} />
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

  await waitFor(() => {
    const main = document.getElementById('main-content');
    expect(main).not.toBeNull();
    expect(main?.textContent?.trim().length).toBeGreaterThan(0);
  });

  return {
    ...view,
    router,
    queryClient,
    dispose: () => {
      view.unmount();
      queryClient.clear();
    },
  };
}

describe('Routes Smoke & Auth Guard Suite', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'scrollTo', {
      writable: true,
      value: () => undefined,
    });

    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        }),
      });
    }

    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }

    if (typeof globalThis.IntersectionObserver === 'undefined') {
      globalThis.IntersectionObserver = class IntersectionObserver {
        readonly root = null;
        readonly rootMargin = '';
        readonly thresholds = [];
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      };
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('mounts every public and auth route for Guest with zero console errors or warnings', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    for (const path of PUBLIC_ROUTES) {
      const ctx = await renderAppAt(path);
      try {
        expect(document.getElementById('main-content')?.textContent?.length).toBeGreaterThan(0);
      } finally {
        ctx.dispose();
        cleanup();
      }
    }

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('redirects Guest away from protected routes to /login?returnTo=... and completes return navigation after login', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    for (const protectedPath of ['/student/dashboard', '/instructor/dashboard', '/admin/users', '/supervisor/reports', '/profile']) {
      const ctx = await renderAppAt(protectedPath);
      try {
        await waitFor(() => {
          expect(ctx.router.state.location.pathname).toBe('/login');
          expect(ctx.router.state.location.search).toContain(
            `returnTo=${encodeURIComponent(protectedPath)}`
          );
        });
      } finally {
        ctx.dispose();
        cleanup();
      }
    }

    // End-to-end returnTo redirect via the Login form UI
    const loginFlow = await renderAppAt('/student/courses');
    try {
      await waitFor(() => {
        expect(loginFlow.router.state.location.pathname).toBe('/login');
      });
      const submitBtn = loginFlow.container.querySelector('form button[type="submit"]');
      expect(submitBtn).not.toBeNull();
      if (submitBtn) fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(loginFlow.router.state.location.pathname).toBe('/student/courses');
      });
      expect(tokenStore.getAccessToken()).toBeTruthy();
    } finally {
      loginFlow.dispose();
    }

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('mounts all Student routes and enforces 403 on Instructor/Admin/Supervisor routes', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await authService.login({ email: 'sara.ali@eduhub.com', password: 'EduHub#2025' });

    for (const path of STUDENT_ROUTES) {
      const ctx = await renderAppAt(path);
      try {
        await waitFor(() => {
          expect(document.getElementById('main-content')?.textContent?.length).toBeGreaterThan(0);
        });
        expect(ctx.router.state.location.pathname).not.toBe('/login');
      } finally {
        ctx.dispose();
        cleanup();
      }
    }

    for (const forbidden of ['/instructor/dashboard', '/admin/users', '/supervisor/comments']) {
      const ctx = await renderAppAt(forbidden);
      try {
        await waitFor(() => {
          expect(ctx.container.textContent).toContain('Access denied');
        });
      } finally {
        ctx.dispose();
        cleanup();
      }
    }

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('mounts all Instructor routes and enforces 403 on other role routes', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await authService.login({ email: 'ahmed.hassan@eduhub.com', password: 'EduHub#2025' });

    for (const path of INSTRUCTOR_ROUTES) {
      const ctx = await renderAppAt(path);
      try {
        await waitFor(() => {
          expect(document.getElementById('main-content')?.textContent?.length).toBeGreaterThan(0);
        });
        expect(ctx.router.state.location.pathname).not.toBe('/login');
      } finally {
        ctx.dispose();
        cleanup();
      }
    }

    const forbiddenCtx = await renderAppAt('/admin/settings');
    try {
      await waitFor(() => {
        expect(forbiddenCtx.container.textContent).toContain('Access denied');
      });
    } finally {
      forbiddenCtx.dispose();
    }

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('mounts all Admin and Supervisor routes with cross-role 403 enforcement and clears session on expiry', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await authService.login({ email: 'nour.khaled@eduhub.com', password: 'EduHub#2025' });
    for (const path of ADMIN_ROUTES) {
      const ctx = await renderAppAt(path);
      try {
        await waitFor(() => {
          expect(document.getElementById('main-content')?.textContent?.length).toBeGreaterThan(0);
        });
      } finally {
        ctx.dispose();
        cleanup();
      }
    }

    const adminForbidden = await renderAppAt('/supervisor/course-review');
    try {
      await waitFor(() => {
        expect(adminForbidden.container.textContent).toContain('Access denied');
      });
    } finally {
      adminForbidden.dispose();
      cleanup();
    }

    await authService.login({ email: 'hana.mostafa@eduhub.com', password: 'EduHub#2025' });
    for (const path of SUPERVISOR_ROUTES) {
      const ctx = await renderAppAt(path);
      try {
        await waitFor(() => {
          expect(document.getElementById('main-content')?.textContent?.length).toBeGreaterThan(0);
        });
      } finally {
        ctx.dispose();
        cleanup();
      }
    }

    // Triggering session expiry clears tokens and redirects away from protected route
    const sessionCtx = await renderAppAt('/supervisor/dashboard');
    try {
      await waitFor(() => {
        expect(sessionCtx.container.textContent).toContain('Hana Mostafa');
      });
      act(() => {
        tokenStore.clear();
        dispatchSessionExpired();
      });
      await waitFor(() => {
        expect(sessionCtx.router.state.location.pathname).toBe('/login');
      });
      expect(tokenStore.getAccessToken()).toBeNull();
    } finally {
      sessionCtx.dispose();
    }

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
