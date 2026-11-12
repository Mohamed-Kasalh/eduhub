# EduHub Frontend-to-Backend Handover Specification

> **Target Audience**: Backend Engineering Team  
> **Frontend Version**: `v0.1-frontend-ready`  
> **Status**: Verified Backend-Ready (100% typed API layer, zero mock leaks in production bundles, 136 aligned endpoints)

---

## 1. Quick Start & Execution Modes

The frontend is built to run identically against the embedded mock service worker (MSW) or a real HTTP REST backend without code changes. Switching between mock and real modes is controlled exclusively via environment variables.

### Running in Mock Mode (Default)
```bash
# Starts local development server with mock API worker enabled
pnpm dev
```

### Running Against Real Backend
```bash
# Starts development server against local or staging backend API
VITE_USE_MOCK=false VITE_API_BASE_URL=http://localhost:8000/api/v1 pnpm dev
```

### Building for Production (Real Backend)
```bash
# Production build with zero mock runtime code in output bundle
VITE_USE_MOCK=false VITE_API_BASE_URL=https://api.eduhub.com/api/v1 pnpm build
```

---

## 2. Environment Variables Reference

| Variable | Default | Type | Description |
| --- | --- | --- | --- |
| `VITE_USE_MOCK` | `true` | `boolean` | When `true`, boots browser MSW service worker with in-memory seeded database. When `false`, all HTTP requests go directly to the real backend. |
| `VITE_API_BASE_URL` | `/api/v1` | `string` | Base path or absolute origin URL for all REST endpoints. |
| `VITE_MOCK_PERSIST` | `false` | `boolean` | When `true` in mock mode, persists mock database mutations across page refreshes in `localStorage`. |
| `VITE_MOCK_ERROR_RATE` | `0.0` | `number` (0.0 – 1.0) | Simulates random chaos failures for resilience testing (e.g. `0.2` for 20% simulated 500s). |
| `VITE_ENABLE_ROLE_SWITCHER` | `false` | `boolean` | Displays floating "Preview as" role switcher in the bottom-left corner during local development. |

---

## 3. Demo Accounts & Credentials

The mock database is seeded with 4 canonical role accounts that match real user flows:

| Role | Email | Password | OTP Verification Code |
| --- | --- | --- | --- |
| **Student** | `sara.ali@eduhub.com` | `EduHub#2025` | `123456` |
| **Instructor** | `ahmed.hassan@eduhub.com` | `EduHub#2025` | `123456` |
| **Admin** | `nour.khaled@eduhub.com` | `EduHub#2025` | `123456` |
| **Supervisor** | `hana.mostafa@eduhub.com` | `EduHub#2025` | `123456` |

> [!NOTE]
> The static OTP code `123456` is accepted for any verification code challenge (`POST /auth/verify-otp` and `POST /auth/reset-password`). Passwords must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number or symbol.

---

## 4. API Architecture & Schema Locations

### 4.1 Zod Schemas
Every DTO sent and received by the frontend is strictly validated using Zod schemas located in:
```
src/api/dto/
├── admin.dto.ts          # User management, role overrides, platform settings, course oversight
├── auth.dto.ts           # Login, register, OTP verification, token refresh, OAuth, password reset
├── catalog.dto.ts        # Courses catalog, search, categories, reviews, instructors, public stats
├── certificates.dto.ts   # Certificate verification, issuance, listing, PDF/PNG download
├── comments.dto.ts       # Lesson discussion comments, nested replies, moderation states
├── common.dto.ts         # Pagination envelopes, error envelopes, localized currency, file metadata
├── exams.dto.ts          # Exam attempts, timed question delivery, autosave, grading results
├── index.ts              # Central DTO and schema re-exports
├── instructor.dto.ts     # Course builder wizard, curriculum reordering, enrolled students
├── learning.dto.ts       # Student dashboard, course progress, lesson player, video timestamps
├── me.dto.ts             # User profile, active sessions, notification preferences
├── notifications.dto.ts  # In-app notifications list, mark read, unread counts
├── questions.dto.ts      # Instructor Question Bank, CSV import, exam configuration
├── supervisor.dto.ts     # Comment moderation queues, course review checklists, incident reports
└── uploads.dto.ts        # Multipart file uploads (covers, video lessons, avatars, attachments)
```

TypeScript types are derived directly from the Zod schemas via `z.infer<typeof ...>` to guarantee zero drift between runtime validation and static typing.

### 4.2 Endpoint Inventory
The frontend interacts with **136 distinct REST endpoints** across 13 business domains, verified by `scripts/check-contract.mjs`:

| Domain | Count | Service Location | Primary Operations |
| --- | --- | --- | --- |
| **Auth** | 11 | `src/api/services/auth.service.ts` | Register, login, OTP verify/resend, OAuth, token refresh, logout, password recovery |
| **Me** | 11 | `src/api/services/me.service.ts` | Current profile, avatar crop, session management, notification preferences, recent searches |
| **Catalog** | 10 | `src/api/services/catalog.service.ts` | Course listings, filters, course detail, reviews, instructors, suggestions, public stats |
| **Learning** | 14 | `src/api/services/learning.service.ts` | Student dashboard, my courses, lesson player details, progress sync, completion toggles |
| **Comments** | 8 | `src/api/services/comments.service.ts` | Lesson discussions, replies, editing, soft delete, helpful votes, abuse reporting |
| **Exams** | 6 | `src/api/services/exams.service.ts` | Exam overview, start attempt, autosave draft answers, finalize submission, view results |
| **Certificates** | 5 | `src/api/services/certificates.service.ts` | Issue upon passing exam, preview certificate, public verification code lookup, download PDF |
| **Notifications** | 5 | `src/api/services/notifications.service.ts` | Paginated notifications, mark single/all as read, unread count polling |
| **Uploads** | 1 | `src/api/services/uploads.service.ts` | Multipart file upload with upload progress tracking and cancellation support |
| **Instructor** | 15 | `src/api/services/instructor.service.ts` | Dashboard metrics, taught courses, wizard autosave, curriculum ordering, student roster |
| **Questions** | 10 | `src/api/services/questions.service.ts` | Question Bank CRUD, CSV bulk upload, exam pass score & question count settings |
| **Supervisor** | 14 | `src/api/services/supervisor.service.ts` | Comment queue moderation, bulk actions, course review quality checklist, incident reports |
| **Admin** | 26 | `src/api/services/admin.service.ts` | User table & bulk status, course oversight, categories ordering, certificate revocation, system settings |

Full endpoint-by-endpoint parameter tables, request payloads, and status codes are documented in [docs/API_CONTRACT.md](file:///home/mohamedkasalh/Projects/eduhub-project/eduhub/docs/API_CONTRACT.md).

---

## 5. Security & Authentication Conventions

1. **Tokens**:
   - Access tokens have a 15-minute lifespan (`ACCESS_TTL_SECONDS = 900`).
   - Refresh tokens have a 7-day lifespan (`REFRESH_TTL_SECONDS = 604800`).
   - All authenticated requests include `Authorization: Bearer <accessToken>`.
2. **Auto-Refresh**:
   - The HTTP client in `src/api/http.ts` automatically attempts a transparent `POST /auth/refresh` upon receiving a `401 UNAUTHORIZED`. If refresh succeeds, the queued requests replay seamlessly; if refresh fails, tokens are purged and the user is redirected to `/login?returnTo=...`.
3. **Password Protection**:
   - Passwords are never stored in localStorage or transmitted in query parameters.
4. **CORS Requirements**:
   - The real backend must permit `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
   - Allowed headers: `Authorization`, `Content-Type`, `X-Requested-With`.
   - Exposed headers: `Content-Disposition` (for certificate binary download filename parsing).

---

## 6. Known Limitations & Backend Contract Notes

1. **File Uploads**:
   - `POST /uploads` expects `multipart/form-data` with form field `file` and metadata fields `kind` (`avatar`, `course_cover`, `demo_video`, `lesson_video`, `attachment`, `csv`) and `filename`. Returns `{ url: string, sizeBytes: number, mimeType: string }`.
2. **Deterministic Enums**:
   - Backend enums must use lowercase `snake_case` (e.g. `pending_review`, `course_cover`, `intermediate`). The frontend anti-corruption mapper layer converts these into UI display strings.
3. **Durations & Timestamps**:
   - All durations are integer seconds (`durationSeconds`). Pre-formatted strings (`"12h 30m"`) in backend responses will be rejected by the Zod response schema.
   - All timestamps must be ISO-8601 UTC strings ending with `Z` or a numerical offset.
4. **Error Payloads**:
   - In case of validation errors (`422 Unprocessable Entity`), the backend must return:
     ```json
     {
       "error": {
         "code": "VALIDATION_ERROR",
         "message": "Human-readable summary",
         "fieldErrors": {
           "email": ["Enter a valid email address."]
         }
       }
     }
     ```
