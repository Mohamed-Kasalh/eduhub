import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { HttpResponse, http as mswHttp } from 'msw';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { authService, tokenStore, type UserDto } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { createAppQueryClient } from '@/lib/queryClient';
import { server } from '@/mocks/server';
import { appRoutes } from '@/routes';
import resilienceManifest from './resilience-cases.json';

type RoleKey = 'guest' | 'student' | 'instructor' | 'admin' | 'supervisor';
type ModeKey = 'mode-a' | 'mode-b' | 'mode-c';

interface RouteSpec {
  path: string;
  routePattern: string;
  component: string;
  fetchesOnMount: boolean;
}

interface ResilienceCase {
  id: string;
  mode: ModeKey;
  role: RoleKey;
  spec: RouteSpec;
}

const MAX_PROFILER_COMMITS = 100;

const ROLE_CREDENTIALS: Record<Exclude<RoleKey, 'guest'>, string> = {
  student: 'sara.ali@eduhub.com',
  instructor: 'ahmed.hassan@eduhub.com',
  admin: 'nour.khaled@eduhub.com',
  supervisor: 'hana.mostafa@eduhub.com',
};

const ROUTES_BY_ROLE = resilienceManifest.routesByRole as Record<RoleKey, ReadonlyArray<RouteSpec>>;

const ALL_CASES: ReadonlyArray<ResilienceCase> = (() => {
  const cases: ResilienceCase[] = [];
  const roles: ReadonlyArray<RoleKey> = ['guest', 'student', 'instructor', 'admin', 'supervisor'];
  const modes: ReadonlyArray<ModeKey> = ['mode-a', 'mode-b', 'mode-c'];

  for (const mode of modes) {
    for (const role of roles) {
      for (const spec of ROUTES_BY_ROLE[role]) {
        if (mode === 'mode-c' && !spec.fetchesOnMount) {
          continue;
        }
        cases.push({
          id: `[${mode}] [${role}] ${spec.path} :: ${spec.component}`,
          mode,
          role,
          spec,
        });
      }
    }
  }
  return cases;
})();

function seedFromString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formatConsoleArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.stack || arg.message;
      }
      if (typeof arg === 'string') {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');
}

function createConsoleRecorder(role: string, route: string, mode: string) {
  const captured: Array<{ level: 'error' | 'warn'; text: string }> = [];

  const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    captured.push({ level: 'error', text: formatConsoleArgs(args) });
  });
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    captured.push({ level: 'warn', text: formatConsoleArgs(args) });
  });

  return {
    assertClean: () => {
      if (captured.length > 0) {
        const formatted = captured
          .map((item, idx) => `  [${idx + 1}] console.${item.level}: ${item.text}`)
          .join('\n');
        throw new Error(
          `Unexpected console output in [${mode}] role=${role} route=${route}:\n${formatted}`
        );
      }
    },
    restore: () => {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    },
  };
}

interface LoopMonitor {
  rootId: string;
  error: Error | null;
  onRender: React.ProfilerOnRenderCallback;
  assertHealthy: () => void;
}

function createLoopMonitor(componentName: string): LoopMonitor {
  const rootId = `Root(${componentName})`;
  const commitCounts = new Map<string, number>();
  const monitor: LoopMonitor = {
    rootId,
    error: null,
    onRender: (id) => {
      if (monitor.error) {
        if (id === rootId) {
          throw monitor.error;
        }
        return;
      }
      const nextCount = (commitCounts.get(id) ?? 0) + 1;
      commitCounts.set(id, nextCount);
      if (nextCount > MAX_PROFILER_COMMITS) {
        const label = id.startsWith('Root(') ? componentName : id;
        monitor.error = new Error(`render loop in ${label} (${nextCount} commits)`);
        throw monitor.error;
      }
    },
    assertHealthy: () => {
      if (monitor.error) {
        throw monitor.error;
      }
    },
  };
  return monitor;
}

const ROUTE_PATTERN_TO_COMPONENT = (() => {
  const map = new Map<string, string>();
  for (const role of Object.keys(ROUTES_BY_ROLE) as RoleKey[]) {
    for (const spec of ROUTES_BY_ROLE[role]) {
      map.set(spec.routePattern, spec.component);
    }
  }
  return map;
})();

function cloneElementWithProfiler(
  element: React.ReactNode,
  componentName: string,
  onRender: React.ProfilerOnRenderCallback
): React.ReactNode {
  if (!React.isValidElement<{ children?: React.ReactNode }>(element)) {
    return element;
  }

  const inner = element.props.children;
  if (React.isValidElement<{ children?: React.ReactNode }>(inner)) {
    const wrappedInner = React.cloneElement(
      inner,
      undefined,
      <React.Profiler id={componentName} onRender={onRender}>
        {inner.props.children}
      </React.Profiler>
    );
    return (
      <React.Profiler id={`Shell(${componentName})`} onRender={onRender}>
        {React.cloneElement(element, undefined, wrappedInner)}
      </React.Profiler>
    );
  }

  return (
    <React.Profiler id={componentName} onRender={onRender}>
      {element}
    </React.Profiler>
  );
}

function buildProfiledRoutes(
  routes: RouteObject[],
  onRender: React.ProfilerOnRenderCallback,
  fallbackComponent: string
): RouteObject[] {
  return routes.map((route) => {
    const patternKey = route.index ? '/' : (route.path ?? '');
    const compName = ROUTE_PATTERN_TO_COMPONENT.get(patternKey) ?? fallbackComponent;
    const nextRoute: RouteObject = { ...route };
    if (route.children) {
      nextRoute.children = buildProfiledRoutes(route.children, onRender, fallbackComponent);
    }
    if (route.element !== undefined && route.path !== '/') {
      nextRoute.element = cloneElementWithProfiler(route.element, compName, onRender);
    }
    return nextRoute;
  });
}

function buildTestQueryClient(cachedUser?: UserDto) {
  const queryClient = createAppQueryClient();
  const existingDefaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    ...existingDefaults,
    queries: {
      ...existingDefaults.queries,
      retryDelay: 5,
    },
  });
  if (cachedUser) {
    queryClient.setQueryData(queryKeys.me.profile, cachedUser);
  }
  return queryClient;
}

async function loginRoleSession(
  role: RoleKey
): Promise<UserDto | undefined> {
  if (role === 'guest') {
    tokenStore.clear();
    return undefined;
  }
  tokenStore.clear();
  const res = await authService.login({
    email: ROLE_CREDENTIALS[role],
    password: 'EduHub#2025',
  });
  tokenStore.setTokens({
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
  });
  return res.user;
}

async function mountRoute(
  initialEntry: string,
  componentName: string,
  cachedUser?: UserDto
) {
  const queryClient = buildTestQueryClient(cachedUser);
  const loopMonitor = createLoopMonitor(componentName);
  const profiledRoutes = buildProfiledRoutes(appRoutes, loopMonitor.onRender, componentName);
  const router = createMemoryRouter(profiledRoutes, {
    initialEntries: [initialEntry],
  });

  const view = render(
    <React.Profiler id={loopMonitor.rootId} onRender={loopMonitor.onRender}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppProvider>
            <RouterProvider router={router} />
          </AppProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.Profiler>
  );

  loopMonitor.assertHealthy();

  await waitFor(
    () => {
      if (loopMonitor.error) return;
      const main = document.getElementById('main-content');
      expect(main).not.toBeNull();
      expect(main?.textContent?.trim().length).toBeGreaterThan(0);
    },
    { timeout: 10000 }
  );
  loopMonitor.assertHealthy();

  await waitFor(
    () => {
      if (loopMonitor.error) return;
      expect(queryClient.isFetching()).toBe(0);
    },
    { timeout: 10000 }
  );
  loopMonitor.assertHealthy();

  await new Promise((resolve) => setTimeout(resolve, 150));
  loopMonitor.assertHealthy();

  return {
    ...view,
    router,
    queryClient,
    loopMonitor,
    mainEl: () => document.getElementById('main-content') as HTMLElement,
    dispose: () => {
      view.unmount();
      queryClient.clear();
      cleanup();
    },
  };
}

describe('Routes Error Resilience Cases', () => {
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

  it(
    '[mode-c] [student-bootstrap] /student/dashboard :: RoleGuard',
    { timeout: 20000 },
    async () => {
      await loginRoleSession('student');

      let failMe = true;
      server.use(
        mswHttp.get(/\/api\/v1\//, () => {
          if (failMe) {
            return HttpResponse.json(
              { error: { code: 'INTERNAL_ERROR', message: 'Simulated /me 500 error.' } },
              { status: 500 }
            );
          }
          return undefined;
        })
      );

      const recorder = createConsoleRecorder(
        'student-bootstrap',
        '/student/dashboard',
        'mode-c'
      );
      const ctx = await mountRoute('/student/dashboard', 'RoleGuard');
      try {
        const retryBtn = await within(ctx.mainEl()).findByRole('button', {
          name: /retry|try again/i,
        });
        expect(ctx.mainEl().textContent).toContain('Something went wrong');

        failMe = false;
        fireEvent.click(retryBtn);

        await waitFor(
          () => {
            if (ctx.loopMonitor.error) return;
            expect(ctx.queryClient.isFetching()).toBe(0);
            expect(ctx.mainEl().textContent).toContain('Sara');
          },
          { timeout: 10000 }
        );
        ctx.loopMonitor.assertHealthy();
        recorder.assertClean();
      } finally {
        recorder.restore();
        ctx.dispose();
      }
    }
  );

  for (const testCase of ALL_CASES) {
    it(testCase.id, { timeout: 25000 }, async () => {
      const { mode, role, spec } = testCase;
      const cachedUser = await loginRoleSession(role);

      let failGets = mode === 'mode-a' || mode === 'mode-c';
      const rand = mulberry32(seedFromString(`${mode}:${role}:${spec.path}`));

      server.use(
        mswHttp.get(/\/api\/v1\//, () => {
          if (mode === 'mode-a') {
            return HttpResponse.json(
              { error: { code: 'INTERNAL_ERROR', message: 'Forced 500 GET failure.' } },
              { status: 500 }
            );
          }
          if (mode === 'mode-b') {
            if (rand() < 0.2) {
              return HttpResponse.json(
                { error: { code: 'INTERNAL_ERROR', message: 'Seeded 20% simulated 500.' } },
                { status: 500 }
              );
            }
            return undefined;
          }
          if (failGets) {
            return HttpResponse.json(
              { error: { code: 'INTERNAL_ERROR', message: 'Initial GET failed; click Retry.' } },
              { status: 500 }
            );
          }
          return undefined;
        })
      );

      const recorder = createConsoleRecorder(role, spec.path, mode);
      let ctx: Awaited<ReturnType<typeof mountRoute>> | null = null;
      try {
        ctx = await mountRoute(spec.path, spec.component, cachedUser);
        const main = ctx.mainEl();
        expect(main.textContent?.trim().length).toBeGreaterThan(0);

        if (mode === 'mode-a') {
          if (spec.fetchesOnMount) {
            const retryButtons = within(main).queryAllByRole('button', {
              name: /retry|try again/i,
            });
            if (retryButtons.length === 0) {
              throw new Error(
                `[mode-a] role=${role} route=${spec.path}: expected an inline error state with a Retry button when GET requests return 500.`
              );
            }
          }
          if (main.querySelector('[aria-busy="true"]')) {
            throw new Error(
              `[mode-a] role=${role} route=${spec.path}: stuck loading skeleton (aria-busy="true") remained after queries settled.`
            );
          }
        } else if (mode === 'mode-b') {
          if (main.querySelector('[aria-busy="true"]')) {
            throw new Error(
              `[mode-b] role=${role} route=${spec.path}: stuck loading state remained after queries settled.`
            );
          }
        } else if (mode === 'mode-c') {
          const initialRetryButtons = within(main).queryAllByRole('button', {
            name: /retry|try again/i,
          });
          if (initialRetryButtons.length === 0) {
            throw new Error(
              `[mode-c] role=${role} route=${spec.path}: expected at least one Retry button before recovery.`
            );
          }

          failGets = false;
          for (const btn of initialRetryButtons) {
            fireEvent.click(btn);
          }

          await waitFor(
            () => {
              if (ctx!.loopMonitor.error) return;
              if (ctx!.queryClient.isFetching() > 0) {
                throw new Error(`[mode-c] ${role} ${spec.path}: still fetching after Retry click`);
              }
              const remainingRetries = within(ctx!.mainEl()).queryAllByRole('button', {
                name: /retry|try again/i,
              });
              if (remainingRetries.length > 0) {
                const labels = remainingRetries
                  .map(
                    (b) =>
                      b.closest('[role="alert"]')?.textContent?.trim() ||
                      b.textContent?.trim() ||
                      'Retry'
                  )
                  .join(' | ');
                throw new Error(
                  `[mode-c] role=${role} route=${spec.path}: Retry button(s) remained after click: ${labels}`
                );
              }
            },
            { timeout: 6000 }
          );
          ctx.loopMonitor.assertHealthy();
          await new Promise((resolve) => setTimeout(resolve, 150));
          ctx.loopMonitor.assertHealthy();

          if (ctx.mainEl().querySelector('[aria-busy="true"]')) {
            throw new Error(
              `[mode-c] role=${role} route=${spec.path}: stuck loading skeleton remained after recovery.`
            );
          }
        }

        ctx.loopMonitor.assertHealthy();
        recorder.assertClean();
      } finally {
        recorder.restore();
        ctx?.dispose();
      }
    });
  }
});
