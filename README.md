# EduHub

EduHub is a role-based e-learning platform featuring courses catalog browsing, video lesson playback, timed exams, and verifiable certificates. It supports 4 primary authenticated roles plus guests:
- **Student**: Course discovery, syllabus progress, lesson player with Q&A, exam assessments, and certificate verification.
- **Instructor**: 6-step course builder wizard, curriculum management, question bank with CSV import, and enrolled students roster.
- **Admin**: User lifecycle management, course oversight (approve/reject/unpublish), category ordering, and certificate revocation.
- **Supervisor**: Comment moderation queues (approve/reject/delete), course quality review checklists, and incident reports.

## Tech Stack & Requirements

- **Stack**: React 19, TypeScript strict, Vite 8, Tailwind CSS v4, React Router 8, TanStack Query v5, Lucide React, MSW v3, Vitest.
- **Requirements**: Node.js 20+ and pnpm 9+.

## Quick Start

```bash
pnpm install
pnpm dev
```

## Package Scripts

- `pnpm dev` — Starts local Vite development server.
- `pnpm build` — Compiles production bundle into `dist/`.
- `pnpm preview` — Previews the production build locally.
- `pnpm format` — Formats source files using `oxfmt`.
- `pnpm typecheck` — Runs TypeScript type-checking with zero emit (`tsc --noEmit`).
- `pnpm test` — Executes Vitest unit, contract, and resilience test suites.
- `pnpm check:no-mock-imports` — Verifies no runtime imports from `src/data` or `src/mocks` outside mock/test code.
- `pnpm check:contract` — Ensures 136 endpoints stay synchronized between services, MSW handlers, and API contract docs.
- `pnpm check` — Runs the complete CI pipeline: import lint, contract check, typecheck, tests, and production build.

## Environment Variables

Configured in `.env.example` and typed in `src/vite-env.d.ts`:

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_USE_MOCK` | `false` | Enable in-browser MSW mock server (`true` in dev default; `false` connects to real backend). |
| `VITE_API_BASE_URL` | `/api/v1` | Base URL path or backend origin for REST API requests. |
| `VITE_MOCK_PERSIST` | `false` | Persist mock database state in `localStorage` across page reloads (mock mode only). |
| `VITE_MOCK_ERROR_RATE` | `0` | Simulated chaos failure probability (`0.0`–`1.0`) for fault resilience verification. |
| `VITE_ENABLE_ROLE_SWITCHER` | `false` | Display bottom-left "Preview as" role switcher widget in local development. |

## Mock Mode vs. Real Backend Mode

- **Mock Mode**: Boots in-browser MSW interceptor with seeded mock data. Run with `VITE_USE_MOCK=true pnpm dev`.
- **Real Backend Mode**: Directs API requests to your HTTP backend without bundle bloat. Run:
  ```bash
  VITE_USE_MOCK=false VITE_API_BASE_URL=https://api.eduhub.com/api/v1 pnpm build
  ```

## Folder Structure

- `src/api/` — Typed REST API client (`http.ts`), Zod DTO schemas (`dto/`), services, query/mutation hooks, and mappers.
- `src/mocks/` — MSW browser worker and Node server, seed records, database state, and handlers for all 136 endpoints.
- `src/pages/` — Screen components grouped by domain: `public/`, `auth/`, `student/`, `instructor/`, `admin/`, `supervisor/`, `shared/`.
- `src/components/` — Shared design system primitives (`ui/`), brand logos (`brand/`), and layout shells (`layout/`).
- `src/context/` — Application UI state (`AppContext`) and authentication/session management (`AuthContext`).
- `docs/` — Architecture contracts, integration guides, and backend handover specifications.

## Demo Accounts & Documentation

Seeded accounts (passwords `EduHub#2025`, OTP `123456`):
- Student: `sara.ali@eduhub.com` • Instructor: `ahmed.hassan@eduhub.com`
- Admin: `nour.khaled@eduhub.com` • Supervisor: `hana.mostafa@eduhub.com`

Detailed handover notes, API contracts, and integration instructions:
- [API Contract (`docs/API_CONTRACT.md`)](docs/API_CONTRACT.md)
- [Backend Integration Guide (`docs/BACKEND_INTEGRATION.md`)](docs/BACKEND_INTEGRATION.md)
- [Backend Handover Specification (`docs/HANDOVER.md`)](docs/HANDOVER.md)
