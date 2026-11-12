# EduHub Backend Integration Guide

The EduHub frontend communicates strictly through the typed API client in `src/api/` (`http`, `upload`, `download`, Zod DTO schemas in `src/api/dto/`, and React Query hooks in `src/api/hooks/`). Runtime mock data lives only under `src/mocks/` (enforced by `pnpm check:no-mock-imports`), so switching from the local MSW server to a real backend requires changing environment variables only.

See [docs/API_CONTRACT.md](./API_CONTRACT.md) for full endpoint paths, role permissions, DTO schemas, status transitions, and validation rules.

---

## 1. Environment Variables

All runtime flags are declared in `src/vite-env.d.ts` and read in `src/api/config.ts`, `src/main.tsx`, `src/routes.tsx`, and `src/components/layout/PreviewSwitcher.tsx`:

| Variable | Default / `.env.example` | `.env.development` | Purpose |
| --- | --- | --- | --- |
| `VITE_USE_MOCK` | `false` | `true` | When `true`, `src/main.tsx` dynamically imports `./mocks/browser` and starts MSW before React renders. Any other value skips MSW completely. |
| `VITE_API_BASE_URL` | `/api/v1` | `/api/v1` | Relative proxy path (e.g. `/api/v1`) or full backend origin (e.g. `https://api.eduhub.example/api/v1`). Normalized without a trailing slash. |
| `VITE_ENABLE_ROLE_SWITCHER` | `false` | `true` | Renders the bottom-left dev switcher (`PreviewSwitcher`) **only** when `import.meta.env.DEV && VITE_ENABLE_ROLE_SWITCHER === 'true'`. Excluded from production builds. |
| `VITE_MOCK_PERSIST` | `false` | `false` | Active only when `VITE_USE_MOCK=true`; persists mock DB mutations across page reloads. |
| `VITE_MOCK_ERROR_RATE` | `0` | `0` | Active only when `VITE_USE_MOCK=true`; simulated fault injection rate (`0`..`1`) for testing retry and error boundaries. |

---

## 2. Switching to a Real Backend

1. Configure production/staging env vars (for example in `.env.production` or CI build variables):
   ```dotenv
   VITE_USE_MOCK=false
   VITE_API_BASE_URL=https://api.your-domain.com/api/v1
   VITE_ENABLE_ROLE_SWITCHER=false
   ```
   If serving the SPA and API behind the same domain proxy (Nginx, Cloudflare, Vite dev proxy), keep `VITE_API_BASE_URL=/api/v1`.

2. Build the production bundle:
   ```bash
   VITE_USE_MOCK=false VITE_API_BASE_URL=https://api.your-domain.com/api/v1 pnpm build
   ```
   Because `import.meta.env.VITE_USE_MOCK !== 'true'` is statically replaced at build time, Vite/Rollup dead-code-eliminates `src/mocks/` from `dist/`.

---

## 3. Authentication & Session Protocol

- **Bearer Tokens**: Protected requests attach `Authorization: Bearer <accessToken>` (unless `skipAuth: true`).
- **Single-Flight Refresh**: Any `401` from a protected endpoint triggers at most one concurrent `POST {VITE_API_BASE_URL}/auth/refresh` request with `{ "refreshToken": "..." }`.
  - Expected `200` payload: `{ "accessToken": string, "refreshToken": string, "expiresInSeconds": number }`.
  - Concurrent failing requests share the refresh promise and automatically replay with the rotated token.
  - Refresh is **not** attempted for `/auth/login`, `/auth/register`, `/auth/verify-otp`, `/auth/resend-otp`, `/auth/oauth/google`, `/auth/refresh`, `/auth/forgot-password`, or `/auth/reset-password`.
- **Session Expiry**: When refresh fails (or no refresh token exists), `tokenStore.clear()` executes and `dispatchSessionExpired()` triggers redirect to `/login?returnTo=...`.

---

## 4. Request, Response & Error Conventions

- **Default Timeout**: `15_000` ms (`apiConfig.timeoutMs`), customizable per request.
- **Retry Policy**:
  - `src/api/http.ts` automatically retries idempotent `GET` calls once on `5xx`, network error, or timeout; mutations (`POST`/`PUT`/`PATCH`/`DELETE`) never auto-retry.
  - React Query (`src/lib/queryClient.ts`) uses `staleTime: 30_000`, `refetchOnWindowFocus: false`, up to 1 query retry on non-`4xx` errors, and no mutation retries.
- **Pagination Envelope**:
  ```json
  {
    "data": [],
    "meta": { "page": 1, "limit": 12, "total": 42, "totalPages": 4 }
  }
  ```
  Query parameters use 1-based `page`, `limit`, `sort`, and `q`.
- **Error Envelope**:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Human-readable summary",
      "fieldErrors": {
        "email": ["Must be a valid email address."]
      }
    }
  }
  ```
  Non-2xx responses with this structure are converted to `ApiError` instances (`status`, `code`, `message`, `fieldErrors`) so forms map `fieldErrors` directly inline.

---

## 5. Multipart Uploads & Binary Downloads

- **Media & Attachment Uploads (`POST /uploads`)**: Uses `XMLHttpRequest` (`upload()` in `src/api/http.ts`) with `Authorization: Bearer <accessToken>` and `FormData` fields:
  - `kind`: `'avatar' | 'course_cover' | 'demo_video' | 'lesson_video' | 'attachment' | 'csv'`
  - `file`: binary file blob + filename
  Supports real upload progress events and `AbortSignal` cancellation.
- **Question Bank CSV Import (`POST /instructor/courses/:courseId/questions/import`)**:
  - Accepts multipart `FormData` (`file`) for `.csv` file uploads, or `application/json` `{ csvText }` for pasted CSV imports.
- **Certificate Downloads (`GET /certificates/:id/file`)**:
  - Sends Bearer auth and reads the binary blob along with `Content-Type` and `Content-Disposition` filename headers.

---

## 6. Cross-Origin (CORS) Checklist (When Using a Separate API Origin)

If `VITE_API_BASE_URL` points to a different origin (e.g. `https://api.your-domain.com/api/v1`), ensure the backend allows:
- **Allowed Origins**: Exact frontend origin(s)
- **Allowed Methods**: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- **Allowed Headers**: `Accept, Authorization, Content-Type`
- **Exposed Headers**: `Content-Disposition, Content-Type` (required so client downloads read server filenames)

---

## 7. Local & CI Verification Commands

```bash
# Enforce zero runtime src/data imports outside src/mocks, typecheck, full Vitest suite, and build
pnpm check

# Build explicitly configured for a real remote backend
VITE_USE_MOCK=false VITE_API_BASE_URL=https://api.your-domain.com/api/v1 pnpm build
```
