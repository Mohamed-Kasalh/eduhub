# EduHub Frontend

Role-based e-learning platform built with React 19, TypeScript, Vite 8, Tailwind CSS v4, react-router 8, and lucide-react.

## Commands

- `pnpm install` — install dependencies
- `pnpm dev` — start local Vite development server
- `pnpm exec tsc --noEmit` — run TypeScript type-checking
- `pnpm build` — build production bundle into `dist/`
- `pnpm preview` — preview production build locally
- `pnpm format` — format source files with `oxfmt`

## Project Structure

- `index.html` — HTML shell mounting `src/main.tsx` into `#root`
- `src/main.tsx` — React entrypoint loading `src/index.css` and `src/App.tsx`
- `src/App.tsx` — wraps `RouterProvider` with `AppProvider`
- `src/routes.tsx` — route tree (`PublicShell`, `DashboardShell`, `AdaptiveShell`, `RoleGuard`)
- `src/context/AppContext.tsx` — client-side state, mock data wiring, role preview, toast queue
- `src/data/` — mock datasets (`mockData.ts`, `studentLearningData.ts`, `examAndCertData.ts`, `instructorMockData.ts`, `adminSupervisorMockData.ts`)
- `src/components/ui/` — shared UI primitives (`Button`, `Modal`, `Drawer`, `Tabs`, `DataTable`, `Pagination`, inputs, badges, progress, etc.)
- `src/components/layout/` — shells (`DashboardShell`, `PublicNavbar`, `PublicFooter`, `RoleGuard`, `PreviewSwitcher`)
- `src/pages/` — pages grouped by `public/`, `auth/`, `student/`, `instructor/`, `admin/`, `supervisor/`, `shared/`
- `public/eduhub-logo.png`, `public/favicon.png` — static brand assets

## Conventions

- Use the `@` path alias for `src/` imports where appropriate (configured in `tsconfig.json` and `vite.config.ts`).
- Styling uses Tailwind CSS v4 (`@import 'tailwindcss';` in `src/index.css`) and CSS custom properties (`--color-primary: #6D4AE0`, `Baloo 2` display, `Nunito Sans` body).
- Strict TypeScript: no `any`, `@ts-ignore`, or `eslint-disable`.
- Role views (`guest`, `student`, `instructor`, `admin`, `supervisor`) can be switched via the bottom-left "Preview as" widget.
