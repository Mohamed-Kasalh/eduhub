# EduHub REST API Contract (`v1`)

> **Step 2 Backend Specification** — Derived from the canonical Zod DTOs in `src/api/dto/*.ts` and every page & role workflow in `src/pages/**`.

---

## 1. Global Conventions

| Aspect | Standard |
| --- | --- |
| **Protocol & Format** | REST over HTTPS, `application/json; charset=utf-8` (except `multipart/form-data` on `POST /uploads` and binary download on `GET /certificates/:id/file`) |
| **Base Path** | Configured via `VITE_API_BASE_URL` (default `/api/v1`) |
| **Property Naming** | `camelCase` JSON keys; string IDs (`"course-1"`, `"user-student-1"`) |
| **Timestamps** | ISO-8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`), e.g. `"2026-03-24T16:05:00.000Z"` |
| **Enums** | Lowercase `snake_case` values (e.g. `pending_review`, `in_progress`, `course_cover`) |
| **Units & Display Purity** | Durations in integer `durationSeconds`; file sizes in integer `sizeBytes`; money as `{ amount: number, currency: "USD" }`. DTOs **never** return pre-formatted display strings (`"12h 30m"`, `"2h ago"`, `"January 2025"`, `"$49.99"`); formatting is performed in `src/lib/format.ts`. |
| **Authentication** | JWT access token in `Authorization: Bearer <accessToken>` header + refresh token flow via `POST /auth/refresh`. |

### 1.1 Standard Paginated List Envelope
All paginated endpoints accept `page` (1-based integer, default `1`), `limit` (integer, default `12` for catalog or `10`/`8` per UI), optional `sort`, and optional `q`.

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 42,
    "totalPages": 4
  }
}
```

### 1.2 Standard Error Envelope
HTTP status codes used across all endpoints: `400`, `401`, `403`, `404`, `409`, `422`, `429`, `5xx`.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields failed validation.",
    "fieldErrors": {
      "email": ["Enter a valid email address."],
      "password": ["Password must include at least one uppercase letter."]
    }
  }
}
```

| Status | Error `code` | Meaning |
| --- | --- | --- |
| `400` | `BAD_REQUEST` | Malformed JSON, missing multipart form data, or invalid query type |
| `401` | `UNAUTHORIZED` | Missing, malformed, or expired access/refresh JWT |
| `403` | `FORBIDDEN` | Authenticated role lacks permission, account suspended, or course/lesson locked |
| `404` | `NOT_FOUND` | Resource ID or verification code does not exist |
| `409` | `CONFLICT` | Duplicate email, already enrolled, or invalid workflow state transition (e.g. certificate requirements unmet) |
| `422` | `VALIDATION_ERROR` | Schema or business rule violation with `fieldErrors` map |
| `429` | `RATE_LIMITED` | OTP resend cooldown active or login attempt throttle exceeded |
| `500`/`503` | `INTERNAL_ERROR` | Unexpected server error |

---

## 2. Canonical Enums

| Enum Name | Values (`snake_case`) |
| --- | --- |
| `UserRole` | `guest`, `student`, `instructor`, `supervisor`, `admin` |
| `AuthenticatedRole` | `student`, `instructor`, `supervisor`, `admin` |
| `PublicSignupRole` | `student`, `instructor` |
| `UserStatus` | `active`, `suspended`, `pending` |
| `CourseLevel` | `beginner`, `intermediate`, `advanced` |
| `CourseStatus` | `draft`, `pending_review`, `published`, `rejected` |
| `CourseReviewDecision` | `pending_review`, `approved`, `changes_requested`, `rejected` |
| `CourseLanguage` | `en`, `en_ar_cc`, `es_cc` |
| `DurationBucket` | `0_2h`, `2_5h`, `5_10h`, `10h_plus` |
| `CatalogSort` | `popular`, `newest`, `rating`, `price_asc`, `price_desc` |
| `CatalogTab` | `popular`, `new`, `free` |
| `LessonType` | `video`, `reading`, `exam` |
| `LessonCompletionStatus` | `completed`, `in_progress`, `not_started`, `locked` |
| `AttachmentFileType` | `pdf`, `zip`, `csv`, `fig`, `other` |
| `CommentStatus` | `pending`, `approved`, `rejected`, `flagged`, `hidden` |
| `CommentRejectionReason` | `spam`, `offensive`, `off_topic`, `other` |
| `CommentReportReason` | `spam`, `harassment`, `off_topic`, `other` |
| `QuestionType` | `single`, `multiple`, `boolean` |
| `QuestionDifficulty` | `easy`, `medium`, `hard` |
| `ExamAttemptStatus` | `in_progress`, `submitted`, `expired` |
| `ExamReviewOutcome` | `correct`, `wrong`, `skipped` |
| `CertificateStatus` | `valid`, `revoked` |
| `CertificateGrade` | `distinction` (`>= 85%`), `merit` (`70-84%`), `pass` (`60-69%`) |
| `NotificationType` | `course`, `exam`, `certificate`, `moderation`, `system` |
| `ModerationTargetType` | `comment`, `course`, `user` |
| `ModerationSeverity` | `high`, `medium`, `low` |
| `ModerationReportStatus` | `open`, `investigating`, `resolved` |
| `UploadKind` | `avatar`, `course_cover`, `demo_video`, `lesson_video`, `attachment`, `csv` |
| `DeviceType` | `desktop`, `mobile`, `tablet` |

---

## 3. Role Permission Matrix

| Capability / API Area | Guest | Student | Instructor | Supervisor | Admin |
| --- | :---: | :---: | :---: | :---: | :---: |
| Browse public catalog, course details, verify certificates, subscribe newsletter | Yes | Yes | Yes | Yes | Yes |
| Register (`student`/`instructor`), verify OTP, login, refresh, reset password | Yes | Yes | Yes | Yes | Yes |
| Manage own profile, password, sessions, notification prefs & account deletion (`/me/*`, `/notifications/*`) | No | Yes | Yes | Yes | Yes |
| Manage public instructor profile (`expertiseTags` on `/me`) | No | No | Yes | No | No |
| Enroll in courses, watch lessons (90% auto-complete), post comments, wishlist | No | Yes | No* | No* | No* |
| Post course reviews, report comments, take final exams & earn certificates | No | Yes | No | No | No |
| Create/edit/submit courses, upload course media, manage Question Bank & Exam Settings (`/instructor/*`) | No | No | Yes | No | Yes |
| Moderate comments, review submitted courses & checklist, resolve reports (`/supervisor/*`) | No | No | No | Yes | Yes |
| Manage users, override course status/feature, manage categories, revoke/restore certificates, edit platform settings (`/admin/*`) | No | No | No | No | Yes |

\* In `/courses` catalog & wishlist/reviews, authenticated users can read public endpoints; student learning progress, exam taking, and certificate issuance routes require `student` role.

---

## 4. Status Workflows

### 4.1 Course Lifecycle
```text
draft ──(POST /instructor/courses/:id/submit)──▶ pending_review
  ▲                                                   │
  │                                  ┌────────────────┴────────────────┐
  │                                  ▼                                 ▼
  └──(instructor edits & fixes)── rejected ◀────(reject / request-changes) ── published
                                     ▲                                           │
                                     └──────(admin override/unpublish ──▶ draft)─┘
```
- **Supervisor review actions**: `approve` sets `course.status = "published"` and `reviewDecision = "approved"`; `request-changes` and `reject` set `course.status = "rejected"` (with `rejectionReason` / `reviewNotes` required, min 8 chars) and `reviewDecision = "changes_requested"` / `"rejected"`, notifying the instructor.
- **Admin actions**: `approve` -> `published`, `reject` -> `rejected`, `unpublish` -> `draft`, `status` override -> any `CourseStatus`.

### 4.2 Comment Moderation & Visibility
```text
pending ──▶ approved ◀──(supervisor restore)── rejected
   │            │
   │            ├──(user report)──▶ flagged ──▶ approved | rejected | hidden
   └────────────┴──(supervisor reject/hide)──▶ rejected | hidden
```
- **Public/Lesson visibility rule**: Public lesson Q&A (`GET /lessons/:id/comments`) returns only `status === "approved"` comments PLUS `status === "pending"` comments authored by the currently authenticated viewer. `rejected` and `hidden` comments are excluded.
- **Side effects**: Submitting a comment creates it with `status = "pending"`. Approving sets `status = "approved"` and `isSupervisorVerified = true`, notifying the author. Reporting appends a `ModerationReport` and flags the comment if needed.

### 4.3 User Account Lifecycle
```text
pending ──(verify OTP / admin activate)──▶ active ◀──(admin activate)── suspended
```
- Inviting a user via `POST /admin/users` with `sendInvite: true` initializes `status: "pending"`; otherwise `status: "active"`.
- Registering via `POST /auth/register` sets `emailVerified: false`, `status: "pending"` until `POST /auth/verify-otp` activates `status: "active"`.

### 4.4 Exam Attempt Lifecycle & Security
```text
in_progress ──(POST /exam-attempts/:id/submit)──▶ submitted
     │
     └──(expiresAt reached on server)──▶ expired (auto-graded on saved answers)
```
- **Security rule**: `POST /courses/:id/exam/attempts` returns randomized `ExamAttemptQuestion[]` **strictly stripped** of `correctIndices` and `explanation`. Correct answers and explanations appear **only** in `ExamAttemptResult` (`POST /exam-attempts/:id/submit` or `GET /exam-attempts/:id` after submission/expiry).
- **Eligibility**: Course lessons must be 100% completed (every lesson `watchPercent >= 90`) and `attemptsUsed < config.attemptsAllowed`.

### 4.5 Certificate Eligibility & Revocation
- **Issuance (`POST /courses/:id/certificate`)**: Requires 100% lesson completion AND a passed exam attempt (`scorePercent >= config.passingScorePercent`). Otherwise returns `409 CONFLICT` (`ELIGIBILITY_UNMET`).
- **Status**: `valid` <-> `revoked` (Admin `POST /admin/certificates/:id/revoke` and `restore`). Public verification (`GET /verify/:code`) returns both `valid` and `revoked` records clearly marked with `status`, and `404` for unrecognized codes.

---

## 5. Validation Rules

| Domain / Field | Rule |
| --- | --- |
| **Password (`register`, `reset-password`, `me/password`, `admin/users`)** | Minimum 8 characters, at least 1 uppercase (`A-Z`), at least 1 digit (`0-9`), at least 1 symbol (`[^A-Za-z0-9]`) |
| **OTP Code** | Exact 6 numeric digits (`/^\d{6}$/`); 60-second resend cooldown (`429 RATE_LIMITED` if exceeded) |
| **Full Name** | Trimmed string, minimum 2 characters |
| **Profile Headline (`title`)** | Maximum 100 characters (`minimum 3` for instructor public profile) |
| **Bio** | Maximum 300 characters |
| **Phone** | Optional; when provided must match `/^[+\d\s()-]{7,20}$/` |
| **Profile Links** | Optional `http://` or `https://` URLs (`website`, `linkedin`, `github`) |
| **Avatar Upload** | MIME `image/jpeg` or `image/png`, max **2 MB** (`2097152` bytes) |
| **Course Cover Upload** | MIME `image/jpeg` or `image/png`, max **5 MB** (`5242880` bytes) |
| **Demo & Lesson Video Upload** | MIME `video/mp4`, max **2 GB** (`2147483648` bytes) |
| **Attachment Upload** | PDF / ZIP / CSV / FIG, max **50 MB** (`52428800` bytes) |
| **Course Submission** | Title >= 6 chars, description >= 20 chars, >= 2 sections & >= 3 lessons, cover + demo video present, valid price (`isFree=true` or `price.amount > 0`), Question Bank >= configured question count |
| **Question Item** | Prompt >= 8 chars, 2–6 non-empty options (2 fixed `["True","False"]` for `boolean`), >= 1 valid `correctIndex`, `points` `1..25` |
| **Exam Settings Mix** | `difficultyMix.easyPercent + mediumPercent + hardPercent === 100`; at least 1 `coveredSectionId` |
| **Course Review** | Enrolled student only; `rating` integer `1..5`; `comment` >= 10 trimmed chars |
| **Supervisor Reject / Request Changes** | Reason/notes required, >= 8 trimmed chars |
| **Account Deletion (`DELETE /me`)** | Requires `{ "confirmationText": "DELETE" }` |

---

## 6. Auth Endpoints

### `POST /auth/register`
- **Roles**: Public (`guest`)
- **Request JSON**:
```json
{
  "name": "Laila Mansour",
  "email": "laila@eduhub.com",
  "password": "StrongPassword1!",
  "role": "student"
}
```
- **Success `201 Created`**:
```json
{
  "email": "laila@eduhub.com",
  "otpRequired": true,
  "resendAvailableAfterSeconds": 60
}
```
- **Errors**: `409 EMAIL_EXISTS`, `422 VALIDATION_ERROR` (invalid email, weak password, disallowed role such as `admin`).

### `POST /auth/verify-otp`
- **Roles**: Public (`guest`)
- **Request JSON**:
```json
{
  "email": "laila@eduhub.com",
  "code": "123456"
}
```
- **Success `200 OK`**:
```json
{
  "accessToken": "jwt.access.token",
  "refreshToken": "jwt.refresh.token",
  "expiresInSeconds": 900,
  "user": {
    "id": "user-stu-100",
    "name": "Laila Mansour",
    "email": "laila@eduhub.com",
    "emailVerified": true,
    "role": "student",
    "status": "active",
    "avatarUrl": null,
    "title": "EduHub Learner",
    "bio": "",
    "phone": null,
    "links": {},
    "expertiseTags": [],
    "notificationPreferences": {
      "courseReplies": { "inApp": true, "email": true },
      "examResults": { "inApp": true, "email": true },
      "certificates": { "inApp": true, "email": true },
      "moderation": { "inApp": true, "email": false },
      "announcements": { "inApp": true, "email": false }
    },
    "joinedAt": "2026-03-25T10:00:00.000Z",
    "lastLoginAt": "2026-03-25T10:01:00.000Z",
    "coursesCount": 0,
    "streakDays": 0,
    "points": 0
  }
}
```
- **Errors**: `400/422 INVALID_OTP`, `404 USER_NOT_FOUND`, `429 OTP_ATTEMPTS_EXCEEDED`.

### `POST /auth/resend-otp`
- **Roles**: Public (`guest`)
- **Request JSON**: `{ "email": "laila@eduhub.com" }`
- **Success `200 OK`**: `{ "email": "laila@eduhub.com", "resendAvailableAfterSeconds": 60 }`
- **Errors**: `404 USER_NOT_FOUND`, `429 RATE_LIMITED` (before 60s expires).

### `POST /auth/login`
- **Roles**: Public (`guest`)
- **Request JSON**:
```json
{
  "email": "sara.ali@eduhub.com",
  "password": "EduHub#2025",
  "rememberMe": true
}
```
- **Success `200 OK`**: Same shape as `POST /auth/verify-otp` (`{ accessToken, refreshToken, expiresInSeconds, user }`).
- **Errors**: `401 INVALID_CREDENTIALS`, `403 ACCOUNT_SUSPENDED` / `EMAIL_UNVERIFIED`, `422 VALIDATION_ERROR`, `429 RATE_LIMITED`.

### `POST /auth/oauth/google`
- **Roles**: Public (`guest`)
- **Request JSON**: `{ "idToken": "google-id-token", "role": "student" }`
- **Success `200 OK`**: `{ "accessToken": "...", "refreshToken": "...", "expiresInSeconds": 900, "user": { ... } }`
- **Errors**: `401 INVALID_OAUTH_TOKEN`, `403 ACCOUNT_SUSPENDED`.

### `POST /auth/refresh`
- **Roles**: Public (valid refresh token)
- **Request JSON**: `{ "refreshToken": "jwt.refresh.token" }`
- **Success `200 OK`**:
```json
{
  "accessToken": "new.jwt.access.token",
  "refreshToken": "new.jwt.refresh.token",
  "expiresInSeconds": 900
}
```
- **Errors**: `401 INVALID_REFRESH_TOKEN`.

### `POST /auth/logout`
- **Roles**: Authenticated (`student`, `instructor`, `supervisor`, `admin`)
- **Request JSON**: `{ "refreshToken": "jwt.refresh.token" }` (optional)
- **Success `200 OK`**: `{ "success": true, "message": "Signed out." }`
- **Errors**: `401 UNAUTHORIZED`.

### `POST /auth/forgot-password`
- **Roles**: Public
- **Request JSON**: `{ "email": "sara.ali@eduhub.com" }`
- **Success `200 OK`**: `{ "success": true, "message": "If an account exists, a reset code has been sent." }`
- **Errors**: `422 VALIDATION_ERROR`, `429 RATE_LIMITED`.

### `GET /auth/reset-password/validate`
- **Roles**: Public
- **Query Params**: `code` or `token`, plus optional `email`
- **Success `200 OK`**: `{ "success": true, "message": "Reset token is valid." }`
- **Errors**: `400/422 INVALID_OR_EXPIRED_TOKEN`.

### `POST /auth/reset-password`
- **Roles**: Public
- **Request JSON**:
```json
{
  "email": "sara.ali@eduhub.com",
  "code": "123456",
  "newPassword": "NewPassword#2026"
}
```
- **Success `200 OK`**: `{ "success": true, "message": "Password has been reset." }`
- **Errors**: `400/422 VALIDATION_ERROR` (weak password, invalid/expired code).

---

## 7. Current User (`/me`) Endpoints

### `GET /me`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Success `200 OK`**: Full `UserDto` object.
- **Errors**: `401 UNAUTHORIZED`.

### `PATCH /me`
- **Roles**: `student`, `instructor`, `supervisor`, `admin` (`expertiseTags` effective for `instructor`)
- **Request JSON** (partial):
```json
{
  "name": "Sara Ali",
  "title": "Senior Frontend Engineer",
  "bio": "Building accessible React apps.",
  "phone": "+20 100 555 0142",
  "links": {
    "website": "https://saraali.dev",
    "linkedin": "https://linkedin.com/in/sara-ali-dev",
    "github": "https://github.com/sara-ali"
  },
  "avatarUrl": "https://cdn.eduhub.com/uploads/av-1.jpg",
  "expertiseTags": ["React 19", "TypeScript"]
}
```
- **Success `200 OK`**: Updated `UserDto`.
- **Errors**: `401 UNAUTHORIZED`, `422 VALIDATION_ERROR` (bio > 300 chars, invalid URL/phone).

### `POST /me/password`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Request JSON**:
```json
{
  "currentPassword": "OldPassword#1",
  "newPassword": "NewPassword#2026"
}
```
- **Success `200 OK`**: `{ "success": true, "message": "Password updated successfully." }`
- **Errors**: `401 UNAUTHORIZED`, `422 VALIDATION_ERROR` (wrong `currentPassword`, weak `newPassword`, or `newPassword === currentPassword`).

### `GET /me/sessions`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Success `200 OK`**:
```json
{
  "data": [
    {
      "id": "sess-1",
      "deviceName": "MacBook Pro 14\"",
      "deviceType": "desktop",
      "browser": "Chrome 134",
      "location": "Cairo, Egypt",
      "lastActiveAt": "2026-03-25T12:00:00.000Z",
      "isCurrent": true
    }
  ]
}
```
- **Errors**: `401 UNAUTHORIZED`.

### `DELETE /me/sessions/:id`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Success `200 OK`**: `{ "success": true, "message": "Session revoked." }`
- **Errors**: `401 UNAUTHORIZED`, `404 SESSION_NOT_FOUND`, `409 CANNOT_REVOKE_CURRENT_SESSION`.

### `DELETE /me/sessions`
- **Roles**: `student`, `instructor`, `supervisor`, `admin` (revokes all sessions except current device)
- **Success `200 OK`**: `{ "success": true, "message": "All other sessions logged out." }`
- **Errors**: `401 UNAUTHORIZED`.

### `DELETE /me`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Request JSON**: `{ "confirmationText": "DELETE" }`
- **Success `200 OK`**: `{ "success": true, "message": "Account permanently deleted." }`
- **Errors**: `401 UNAUTHORIZED`, `422 VALIDATION_ERROR` (missing `"DELETE"` confirmation).

### `GET /me/notification-preferences`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Success `200 OK`**:
```json
{
  "courseReplies": { "inApp": true, "email": true },
  "examResults": { "inApp": true, "email": true },
  "certificates": { "inApp": true, "email": true },
  "moderation": { "inApp": true, "email": false },
  "announcements": { "inApp": true, "email": false }
}
```
- **Errors**: `401 UNAUTHORIZED`.

### `PUT /me/notification-preferences`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Request JSON**: Full `NotificationPreferencesDto` object.
- **Success `200 OK`**: Updated `NotificationPreferencesDto`.
- **Errors**: `401 UNAUTHORIZED`, `422 VALIDATION_ERROR`.

### `GET /me/recent-searches`, `POST /me/recent-searches`, `DELETE /me/recent-searches`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **`POST` Request JSON**: `{ "query": "React 19" }`
- **`GET` / `POST` / `DELETE` Success `200 OK`**: `{ "data": ["React 19", "TypeScript"] }`
- **Errors**: `401 UNAUTHORIZED`, `422 VALIDATION_ERROR`.

---

## 8. Public Discovery Endpoints

### `GET /config`
- **Roles**: Public (`guest`, `student`, `instructor`, `supervisor`, `admin`)
- **Success `200 OK`**:
```json
{
  "platformName": "EduHub",
  "currency": "USD",
  "defaultPassScorePercent": 60,
  "lessonCompleteThresholdPercent": 90,
  "uploadLimits": {
    "avatarMaxBytes": 2097152,
    "courseCoverMaxBytes": 5242880,
    "lessonVideoMaxBytes": 2147483648,
    "attachmentMaxBytes": 52428800
  },
  "featureFlags": {
    "googleAuthEnabled": true,
    "newsletterEnabled": true,
    "certificatesEnabled": true
  }
}
```
- **Errors**: `500 INTERNAL_ERROR`.

### `GET /public/stats`
- **Roles**: Public
- **Success `200 OK`**:
```json
{
  "totalCoursesCount": 120,
  "totalLearnersCount": 15480,
  "averageRating": 4.8,
  "popularTopics": ["React 19", "Python", "UI/UX Design", "Ethical Hacking", "TypeScript", "Figma"]
}
```
- **Errors**: `500 INTERNAL_ERROR`.

### `GET /categories`
- **Roles**: Public
- **Success `200 OK`**:
```json
{
  "data": [
    {
      "id": "cat-web",
      "name": "Development",
      "slug": "development",
      "description": "Modern frontend frameworks, full-stack TypeScript, APIs, and scalable web architecture.",
      "courseCount": 28,
      "iconName": "Code2",
      "accentColor": "#6D4AE0",
      "order": 0,
      "subcategories": [
        { "id": "sub-react", "categoryId": "cat-web", "name": "React & Frontend", "courseCount": 14 }
      ]
    }
  ]
}
```
- **Errors**: `500 INTERNAL_ERROR`.

### `GET /instructors`
- **Roles**: Public
- **Query Params**: `featured` (`boolean`, optional e.g. `?featured=true`), `limit` (`number`, optional)
- **Success `200 OK`**:
```json
{
  "data": [
    {
      "id": "user-instructor-1",
      "name": "Ahmed Hassan",
      "title": "Principal Frontend Architect & Instructor",
      "field": "Development & Software Architecture",
      "avatarUrl": "https://images.unsplash.com/photo-1679476819592-3e233227fd83?w=400",
      "bio": "Principal Frontend Architect with 12+ years building high-scale React and TypeScript platforms.",
      "learnersCount": 18450,
      "rating": 4.9,
      "coursesCount": 4,
      "expertiseTags": ["React 19", "TypeScript", "Design Systems"]
    }
  ]
}
```
- **Errors**: `500 INTERNAL_ERROR`.

### `GET /testimonials`
- **Roles**: Public
- **Query Params**: `limit` (`number`, optional)
- **Success `200 OK`**:
```json
{
  "data": [
    {
      "id": "test-1",
      "name": "Sara Ali",
      "role": "Junior Frontend Engineer at PayMob",
      "avatarUrl": "https://images.unsplash.com/photo-1590650213165-c1fef80648c4?w=400",
      "courseTitle": "Complete React Developer Course",
      "rating": 5,
      "quote": "The combination of bite-sized video lessons and a final exam helped me land my first frontend role."
    }
  ]
}
```
- **Errors**: `500 INTERNAL_ERROR`.

### `GET /search/suggestions`
- **Roles**: Public
- **Query Params**: `q` (string, required/optional — empty returns top categories & courses)
- **Success `200 OK`**: `{ "categories": [CategoryDto], "courses": [CourseDto] }` (up to 4 each).
- **Errors**: `400 BAD_REQUEST`.

### `GET /verify/:code`
- **Roles**: Public
- **Success `200 OK`**:
```json
{
  "status": "valid",
  "certificate": {
    "id": "cert-101",
    "verificationCode": "EDU-2026-000123",
    "student": { "id": "user-student-1", "name": "Sara Ali" },
    "course": { "id": "course-1", "title": "Complete React Developer Course" },
    "instructorName": "Ahmed Hassan",
    "academicDirectorName": "Nour Khaled",
    "issuedAt": "2026-03-24T16:07:00.000Z",
    "grade": "distinction",
    "scorePercent": 86,
    "status": "valid",
    "verificationUrl": "/verify/EDU-2026-000123"
  }
}
```
- **Errors**: `404 CERTIFICATE_NOT_FOUND`.

### `POST /newsletter/subscribe`
- **Roles**: Public
- **Request JSON**: `{ "email": "sara@domain.com" }`
- **Success `200 OK`**: `{ "email": "sara@domain.com", "subscribed": true }`
- **Errors**: `422 VALIDATION_ERROR`.

---

## 9. Catalog Endpoints

### `GET /courses`
- **Roles**: Public (`published` courses only; unpublished courses require Instructor/Supervisor/Admin role endpoints)
- **Query Params**:
  - `q` (search text), `categoryId`, `subcategoryId`, `instructorId`
  - `level` (`beginner | intermediate | advanced`), `minRating` (`number`), `duration` (`0_2h | 2_5h | 5_10h | 10h_plus`), `language` (`en | en_ar_cc | es_cc`)
  - `price` (`free | paid`), `minPrice` (`number`), `maxPrice` (`number`), `hasCertificate` (`boolean`), `hasExam` (`boolean`)
  - `sort` (`popular | newest | rating | price_asc | price_desc`), `tab` (`popular | new | free`)
  - `page` (`1`-based), `limit` (default `12`)
- **Success `200 OK`** (`{ data: CourseDto[], meta }`):
```json
{
  "data": [
    {
      "id": "course-1",
      "title": "Complete React Developer Course",
      "subtitle": "Master React 19, Hooks, Router, state management, and testing.",
      "instructor": {
        "id": "user-instructor-1",
        "name": "Ahmed Hassan",
        "title": "Principal Frontend Architect & Instructor",
        "avatarUrl": "https://images.unsplash.com/photo-1679476819592-3e233227fd83?w=400"
      },
      "category": { "id": "cat-web", "name": "Development" },
      "subcategory": { "id": "sub-react", "name": "React & Frontend" },
      "thumbnailUrl": "https://images.unsplash.com/photo-1619410283995-43d9134e7656?w=1080",
      "previewVideoUrl": "https://example.com/video/101",
      "rating": 4.9,
      "reviewCount": 1420,
      "studentsCount": 18450,
      "price": { "amount": 49.99, "currency": "USD" },
      "originalPrice": { "amount": 89.99, "currency": "USD" },
      "isFree": false,
      "level": "intermediate",
      "language": "en_ar_cc",
      "durationSeconds": 103200,
      "lessonsCount": 42,
      "sectionsCount": 8,
      "featured": true,
      "isNew": false,
      "includesCertificate": true,
      "includesExam": true,
      "passingScorePercent": 75,
      "unavailable": false,
      "status": "published",
      "learningPoints": ["Architect scalable React 19 apps"],
      "requirements": ["Familiarity with HTML, CSS & JavaScript"],
      "tags": ["React 19", "TypeScript", "Frontend"],
      "updatedAt": "2026-03-20T12:00:00.000Z",
      "createdAt": "2025-11-10T09:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 12, "total": 9, "totalPages": 1 }
}
```
- **Errors**: `400/422 VALIDATION_ERROR`.

### `GET /courses/:id`
- **Roles**: Public (draft/pending/rejected courses hidden behind `404` unless author instructor, supervisor, or admin)
- **Success `200 OK`**: `CourseDetailDto` extending `CourseDto` with `description`, `sections[]` (containing `lessons[]` with `attachments[]`), `instructorStats`, `ratingBreakdown[]`, and `viewerContext { isEnrolled, isWishlisted, hasReviewed, progressPercent, nextLessonId }`.
- **Errors**: `404 COURSE_NOT_FOUND`.

### `GET /courses/:id/related`
- **Roles**: Public
- **Query Params**: `limit` (default `4`)
- **Success `200 OK`**: `{ "data": [CourseDto] }` (excludes `:id`, prioritizes same `category.id`).
- **Errors**: `404 COURSE_NOT_FOUND`.

### `GET /courses/:id/reviews`
- **Roles**: Public
- **Query Params**: `page`, `limit`
- **Success `200 OK`**: Paginated `{ data: CourseReviewDto[], meta }`.
- **Errors**: `404 COURSE_NOT_FOUND`.

### `POST /courses/:id/reviews`
- **Roles**: `student` (must be enrolled in `:id`)
- **Request JSON**: `{ "rating": 5, "comment": "Excellent breakdown of custom hooks and useReducer patterns." }`
- **Success `201 Created`**: `CourseReviewDto` object.
- **Errors**: `401 UNAUTHORIZED`, `403 NOT_ENROLLED`, `404 COURSE_NOT_FOUND`, `409 ALREADY_REVIEWED`, `422 VALIDATION_ERROR` (comment < 10 chars, rating not 1..5).

### `PUT /reviews/:id/helpful` and `DELETE /reviews/:id/helpful`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Success `200 OK`**: `{ "reviewId": "rev-1", "helpfulCount": 39, "markedHelpfulByMe": true }`
- **Errors**: `401 UNAUTHORIZED`, `404 REVIEW_NOT_FOUND`.

---

## 10. Student Learning Endpoints

### `POST /courses/:id/enroll`
- **Roles**: `student` (or any authenticated user registering into student learning — `student` required in RBAC)
- **Success `201 Created`** (or `200 OK` if returning created enrollment): `EnrollmentDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`, `409 ALREADY_ENROLLED` / `COURSE_UNAVAILABLE`.

### `GET /me/enrollments`
- **Roles**: `student`
- **Query Params**: `status` (`all | in_progress | completed`), `q`, `sort` (`recent | progress_desc | progress_asc | title`), `page`, `limit`
- **Success `200 OK`**: Paginated `{ data: EnrollmentDto[], meta }`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### `GET /me/wishlist`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Success `200 OK`**: `{ "data": [{ "courseId": "course-2", "addedAt": "2026-03-20T12:00:00.000Z", "course": CourseDto }] }`
- **Errors**: `401 UNAUTHORIZED`.

### `PUT /me/wishlist/:courseId` and `DELETE /me/wishlist/:courseId`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Success `200 OK`**: `{ "courseId": "course-2", "wishlisted": true }` (`false` on `DELETE`)
- **Errors**: `401 UNAUTHORIZED`, `404 COURSE_NOT_FOUND`.

### `GET /me/dashboard`
- **Roles**: `student`
- **Success `200 OK`**:
```json
{
  "kpis": {
    "enrolledCount": 6,
    "inProgressCount": 4,
    "completedCount": 2,
    "certificatesCount": 2,
    "totalWatchSeconds": 174600,
    "weeklyWatchSeconds": 60120,
    "weeklyCompletedLessons": 19
  },
  "streakDays": 14,
  "points": 2480,
  "weeklyDailyGoalSeconds": 7200,
  "continueLearning": { "...": "EnrollmentDto" },
  "activeCourses": [],
  "upcomingExams": [],
  "weeklyActivity": [
    { "date": "2026-03-17", "watchedSeconds": 6480, "lessonsCompleted": 2 }
  ],
  "achievements": [],
  "recommendedCourses": []
}
```
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### `GET /courses/:id/progress`
- **Roles**: `student` (enrolled)
- **Success `200 OK`**: `CourseProgressDto` (`completedLessons`, `inProgressLessons`, `notStartedLessons`, `totalLessons`, `overallPercent`, `watchedDurationSeconds`, `totalDurationSeconds`, `bestExamScorePercent`, `passingScorePercent`, `examPassed`, `certificateUnlocked`, `certificateId`, `lessons[]`).
- **Errors**: `401 UNAUTHORIZED`, `403 NOT_ENROLLED`, `404 COURSE_NOT_FOUND`.

### `GET /courses/:id/lessons/:lessonId`
- **Roles**: `student` (enrolled, or preview lesson)
- **Success `200 OK`**: `LessonDetailDto` (`lesson`, `course`, `sections`, `watchPercent`, `lastPositionSeconds`, `completed`, `locked`, `nextLessonId`, `previousLessonId`, `courseProgressPercent`, `finalExamUnlocked`).
- **Errors**: `401 UNAUTHORIZED`, `403 LESSON_LOCKED` / `NOT_ENROLLED`, `404 NOT_FOUND`.

### `PUT /courses/:id/lessons/:lessonId/progress`
- **Roles**: `student`
- **Request JSON**: `{ "positionSeconds": 252, "watchPercent": 90 }`
- **Success `200 OK`**: `{ "lessonId": "lesson-103", "courseId": "course-1", "watchPercent": 90, "lastPositionSeconds": 252, "completed": true, "courseProgressPercent": 75 }`
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `422 VALIDATION_ERROR`.

### `POST /courses/:id/lessons/:lessonId/complete` and `DELETE /courses/:id/lessons/:lessonId/complete`
- **Roles**: `student`
- **Success `200 OK`**: Same `LessonProgressMutationResponseDto` (`POST` sets `watchPercent: 100, completed: true`; `DELETE` sets `watchPercent: 0, completed: false`).
- **Errors**: `401 UNAUTHORIZED`, `403 LESSON_LOCKED` / `NOT_ENROLLED`, `404 NOT_FOUND`.

---

## 11. Lesson Comments Endpoints

### `GET /lessons/:id/comments`
- **Roles**: Authenticated (`student`, `instructor`, `supervisor`, `admin`)
- **Query Params**: `sort` (`newest | top`, default `newest`), `page`, `limit` (`default 4` or `10`)
- **Visibility**: Returns `status === "approved"` plus any `status === "pending"` authored by the current authenticated user.
- **Success `200 OK`**: Paginated `{ data: CommentDto[], meta }`.
- **Errors**: `401 UNAUTHORIZED`, `404 LESSON_NOT_FOUND`.

### `POST /lessons/:id/comments`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Request JSON**: `{ "content": "How should we clear field errors inside useReducer?" }`
- **Success `201 Created`**: Created `CommentDto` (initialized with `status: "pending"`, `isSupervisorVerified: false`).
- **Errors**: `401 UNAUTHORIZED`, `404 LESSON_NOT_FOUND`, `422 VALIDATION_ERROR`.

### `POST /comments/:id/replies`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Request JSON**: `{ "content": "Clear state.errors[field] inside the FIELD_CHANGED case." }`
- **Success `201 Created`**: `CommentReplyDto` (1 nested level; if author is course instructor, backend marks parent thread `resolved: true`).
- **Errors**: `401 UNAUTHORIZED`, `404 COMMENT_NOT_FOUND`, `422 VALIDATION_ERROR`.

### `PATCH /comments/:id` and `DELETE /comments/:id`
- **Roles**: Comment author (or `supervisor` / `admin` for delete)
- **`PATCH` Request JSON**: `{ "content": "Updated question text..." }`
- **`PATCH` Success `200 OK`**: Updated `CommentDto`.
- **`DELETE` Success `200 OK`**: `{ "success": true, "message": "Comment deleted." }`
- **Errors**: `401 UNAUTHORIZED`, `403 NOT_OWNER`, `404 COMMENT_NOT_FOUND`, `422 VALIDATION_ERROR`.

### `PUT /comments/:id/like`, `DELETE /comments/:id/like`, `PUT /replies/:id/like`, `DELETE /replies/:id/like`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Success `200 OK`**: `{ "id": "tcomment-1", "likesCount": 19, "likedByMe": true }`
- **Errors**: `401 UNAUTHORIZED`, `404 NOT_FOUND`.

### `POST /comments/:id/report`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Request JSON**: `{ "reason": "spam", "details": "Promotional Telegram dump link." }`
- **Success `201 Created`**: `{ "success": true, "message": "Report submitted to moderation team." }` (creates `ModerationReport` & flags comment).
- **Errors**: `401 UNAUTHORIZED`, `404 COMMENT_NOT_FOUND`, `422 VALIDATION_ERROR`.

---

## 12. Exams Endpoints

### `GET /courses/:id/exam`
- **Roles**: `student` (enrolled)
- **Success `200 OK`**:
```json
{
  "config": {
    "id": "exam-1",
    "courseId": "course-1",
    "courseTitle": "Complete React Developer Course",
    "title": "React Architecture & Hooks Certification Exam",
    "durationSeconds": 1800,
    "passingScorePercent": 60,
    "totalQuestions": 20,
    "attemptsAllowed": 3,
    "shuffleQuestions": true,
    "shuffleOptions": true,
    "difficultyMix": { "easyPercent": 40, "mediumPercent": 40, "hardPercent": 20 },
    "coveredSectionIds": ["sec-1", "sec-2", "sec-3", "sec-4"]
  },
  "eligibility": {
    "eligible": true,
    "lessonsCompleted": 12,
    "totalLessons": 12,
    "courseProgressPercent": 100,
    "attemptsUsed": 2,
    "attemptsRemaining": 1,
    "bestScorePercent": 86,
    "passed": true,
    "reason": null
  }
}
```
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`.

### `POST /courses/:id/exam/attempts`
- **Roles**: `student`
- **Behavior**: Generates a random question set from the course question bank matching `totalQuestions`, `difficultyMix`, `coveredSectionIds`, and `shuffleQuestions`/`shuffleOptions`. **Security guarantee:** `correctIndices` and `explanation` are **never** included.
- **Success `201 Created`**:
```json
{
  "attemptId": "att-103",
  "attemptNumber": 3,
  "courseId": "course-1",
  "status": "in_progress",
  "startedAt": "2026-03-25T15:00:00.000Z",
  "expiresAt": "2026-03-25T15:30:00.000Z",
  "durationSeconds": 1800,
  "remainingSeconds": 1800,
  "passingScorePercent": 60,
  "questions": [
    {
      "id": "qb-1",
      "number": 1,
      "type": "single",
      "sectionId": "sec-1",
      "sectionName": "Section 1: Modern Foundations",
      "prompt": "Why should state updates in React always treat objects and arrays as immutable references?",
      "options": ["Reference equality check", "Freezes objects", "Syntax error", "Saves to sessionStorage"],
      "points": 5,
      "difficulty": "easy",
      "imageUrl": "https://images.unsplash.com/photo-1619410283995-43d9134e7656?w=900",
      "imageCaption": "Figure 1.1"
    }
  ],
  "answers": {},
  "flaggedQuestionIds": []
}
```
- **Errors**: `401 UNAUTHORIZED`, `403 NOT_ENROLLED`, `404 COURSE_NOT_FOUND`, `409 ELIGIBILITY_UNMET` (lessons < 100% or attempts exhausted).

### `PUT /exam-attempts/:id/answers`
- **Roles**: `student` (attempt owner)
- **Request JSON**:
```json
{
  "answers": { "qb-1": [0], "qb-2": [0, 1, 3] },
  "flaggedQuestionIds": ["qb-4", "qb-13"]
}
```
- **Success `200 OK`**:
```json
{
  "attemptId": "att-103",
  "savedAt": "2026-03-25T15:08:12.000Z",
  "remainingSeconds": 1308,
  "status": "in_progress"
}
```
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 ATTEMPT_NOT_FOUND`, `409 ATTEMPT_CLOSED` (already submitted or expired), `422 VALIDATION_ERROR`.

### `POST /exam-attempts/:id/submit`
- **Roles**: `student` (attempt owner)
- **Success `200 OK`**: `ExamAttemptResultDto` including `scorePercent`, `passed`, `sectionBreakdown[]`, and `reviewQuestions[]` (now containing `selectedIndices`, `correctIndices`, `outcome`, `pointsAwarded`, and `explanation`).
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 ATTEMPT_NOT_FOUND`, `409 ALREADY_SUBMITTED`.

### `GET /exam-attempts/:id`
- **Roles**: `student` (attempt owner)
- **Success `200 OK`**: `ExamAttemptResultDto` (for submitted/expired attempts) or `409 ATTEMPT_IN_PROGRESS` if caller requests results before submission.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 ATTEMPT_NOT_FOUND`, `409 ATTEMPT_IN_PROGRESS`.

### `GET /courses/:id/exam/attempts`
- **Roles**: `student`
- **Success `200 OK`**: `{ "data": [ExamAttemptSummaryDto] }`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`.

---

## 13. Certificates Endpoints

### `POST /courses/:id/certificate`
- **Roles**: `student`
- **Behavior**: Verifies 100% lessons completed (`watchPercent >= 90`) AND passed exam attempt (`scorePercent >= passingScorePercent`); creates certificate and triggers student notification.
- **Success `201 Created`**: `CertificateDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`, `409 ELIGIBILITY_UNMET` (`message` details missing lessons or failed exam).

### `GET /me/certificates`
- **Roles**: `student`
- **Success `200 OK`**: `{ "data": [CertificateDto] }`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### `GET /certificates/:id`
- **Roles**: `student` (owner), `admin`
- **Success `200 OK`**: `CertificateDto` (looks up by `id` or `verificationCode`).
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 CERTIFICATE_NOT_FOUND`.

### `GET /certificates/:id/file`
- **Roles**: `student` (owner), `admin`
- **Query Params**: `format` (`pdf | png`, default `pdf`)
- **Success `200 OK`**: Binary payload (`application/pdf` or `image/png`) with `Content-Disposition: attachment`.
- **Errors**: `400 INVALID_FORMAT`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 CERTIFICATE_NOT_FOUND`.

---

## 14. Notifications Endpoints

### `GET /notifications`
- **Roles**: `student`, `instructor`, `supervisor`, `admin` (role-scoped filtering applied server-side)
- **Query Params**: `status` (`all | unread`, default `all`), `type` (`all | course | exam | certificate | moderation | system`), `page` (1-based), `limit` (default `8`)
- **Success `200 OK`**:
```json
{
  "data": [
    {
      "id": "notif-1",
      "title": "Certificate ready to download",
      "message": "Your certificate for UI/UX Design Masterclass has been verified and issued.",
      "createdAt": "2026-03-25T14:35:00.000Z",
      "read": false,
      "type": "certificate",
      "link": "/certificates/cert-101",
      "roles": ["student"]
    }
  ],
  "meta": { "page": 1, "limit": 8, "total": 12, "totalPages": 2, "unreadCount": 4 }
}
```
- **Errors**: `401 UNAUTHORIZED`.

### `POST /notifications/:id/read` and `POST /notifications/:id/unread`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Success `200 OK`**: Updated `NotificationDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOTIFICATION_NOT_FOUND`.

### `POST /notifications/read-all`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Success `200 OK`**: `{ "markedCount": 5, "unreadCount": 0 }`
- **Errors**: `401 UNAUTHORIZED`.

### `DELETE /notifications/:id`
- **Roles**: `student`, `instructor`, `supervisor`, `admin`
- **Success `200 OK`**: `{ "success": true, "message": "Notification deleted." }`
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOTIFICATION_NOT_FOUND`.

---

## 15. Uploads Endpoint

### `POST /uploads`
- **Roles**: `student` (`avatar` only), `instructor`, `supervisor`, `admin`
- **Request Content-Type**: `multipart/form-data`
  - `file`: Binary file
  - `kind`: `avatar | course_cover | demo_video | lesson_video | attachment | csv`
- **Size & MIME limits**:
  - `avatar`: `image/jpeg`, `image/png` <= 2 MB (`2097152` bytes)
  - `course_cover`: `image/jpeg`, `image/png` <= 5 MB (`5242880` bytes)
  - `demo_video`, `lesson_video`: `video/mp4` <= 2 GB (`2147483648` bytes)
  - `attachment`: PDF/ZIP/CSV/FIG <= 50 MB
  - `csv`: `text/csv` / `.csv` <= 5 MB
- **Success `201 Created`**:
```json
{
  "id": "upl-101",
  "kind": "course_cover",
  "url": "https://cdn.eduhub.com/uploads/upl-101-cover.jpg",
  "filename": "cover.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 421500,
  "createdAt": "2026-03-25T15:10:00.000Z"
}
```
- **Errors**: `400 BAD_REQUEST` (missing file), `401 UNAUTHORIZED`, `403 FORBIDDEN`, `422 VALIDATION_ERROR` (unsupported MIME type or exceeds size limit).

---

## 16. Instructor Endpoints

### `GET /instructor/dashboard`
- **Roles**: `instructor`, `admin`
- **Success `200 OK`**: `InstructorDashboardDto` (`kpis`, `enrollmentChart[]`, `recentComments[]`, `unansweredCommentsCount`, `topPerformingCourses[]`, `notices { pendingCourses, rejectedCourses }`).
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### `GET /instructor/courses`
- **Roles**: `instructor`, `admin`
- **Query Params**: `status` (`all | draft | pending_review | published | rejected`), `q`, `page`, `limit`
- **Success `200 OK`**: Paginated `{ data: CourseDto[], meta }`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### `POST /instructor/courses`
- **Roles**: `instructor`, `admin`
- **Request JSON**: `CreateInstructorCourseRequestDto` (`title`, `subtitle`, `description`, `categoryId`, `level`, `language`, `tags`, `price`, `originalPrice?`, `isFree`).
- **Success `201 Created`**: Created `CourseDto` (with `status: "draft"`).
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `422 VALIDATION_ERROR`.

### `GET /instructor/courses/:id`, `PATCH /instructor/courses/:id`, `DELETE /instructor/courses/:id`
- **Roles**: `instructor` (owner), `admin`
- **`GET` Success `200 OK`**: `InstructorCourseDetailDto`.
- **`PATCH` Request / Success `200 OK`**: Partial update -> updated `CourseDto`.
- **`DELETE` Success `200 OK`**: `{ "success": true, "message": "Course deleted." }`
- **Errors**: `401 UNAUTHORIZED`, `403 NOT_OWNER`, `404 COURSE_NOT_FOUND`, `422 VALIDATION_ERROR`.

### `PUT /instructor/courses/:id/curriculum`
- **Roles**: `instructor` (owner), `admin`
- **Request JSON**: `{ "sections": [{ "id?": "sec-1", "title": "...", "order": 0, "lessons": [{ "title": "...", "type": "video", "durationSeconds": 900, "videoUrl": "...", "attachmentUrl?": "...", "isPreview": true, "order": 0 }] }] }`
- **Success `200 OK`**: `{ "courseId": "...", "sections": [...], "totalLessonsCount": 3, "totalDurationSeconds": 2700 }`
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`, `422 VALIDATION_ERROR`.

### `POST /instructor/courses/:id/submit`
- **Roles**: `instructor` (owner), `admin`
- **Behavior**: Validates readiness (>= 2 sections, >= 3 lessons, cover + demo video present, question bank >= exam question count, valid pricing); transitions `status` -> `pending_review`, creates `CourseReviewSubmission`, and notifies supervisors.
- **Success `200 OK`**: Updated `CourseDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`, `422 VALIDATION_ERROR` (lists missing wizard requirements in `fieldErrors`).

### `GET /instructor/courses/:id/questions`
- **Roles**: `instructor` (owner), `admin`
- **Query Params**: `sectionId`, `difficulty` (`easy | medium | hard`), `type` (`single | multiple | boolean`), `q`, `page`, `limit`
- **Success `200 OK`**: Paginated `{ data: QuestionDto[], meta }`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`.

### `POST /instructor/courses/:id/questions`
- **Roles**: `instructor` (owner), `admin`
- **Request JSON**: `{ "sectionId": "sec-1", "type": "single", "prompt": "...", "options": ["A", "B", "C", "D"], "correctIndices": [0], "difficulty": "easy", "points": 5, "explanation": "..." }`
- **Success `201 Created`**: Created `QuestionDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`, `422 VALIDATION_ERROR`.

### `PATCH /instructor/questions/:id` and `DELETE /instructor/questions/:id`
- **Roles**: `instructor` (owner), `admin`
- **Success `200 OK`**: Updated `QuestionDto` (on `PATCH`) or `{ "success": true }` (on `DELETE`).
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 QUESTION_NOT_FOUND`, `422 VALIDATION_ERROR`.

### `POST /instructor/questions/bulk-delete`
- **Roles**: `instructor` (owner), `admin`
- **Request JSON**: `{ "ids": ["iq-1", "iq-2"] }`
- **Success `200 OK`**: `{ "deletedCount": 2, "deletedIds": ["iq-1", "iq-2"] }`
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `422 VALIDATION_ERROR`.

### `POST /instructor/courses/:id/questions/import`
- **Roles**: `instructor` (owner), `admin`
- **Request Content-Type**: `multipart/form-data` (`file`: CSV with columns `question,type,option_a,option_b,option_c,option_d,correct,difficulty,points,section`) OR `{ "csvText": "..." }`.
- **Success `200 OK`**:
```json
{
  "importedCount": 2,
  "importedQuestions": [],
  "errors": [{ "row": 3, "message": "Prompt must be at least 8 characters." }]
}
```
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`, `422 VALIDATION_ERROR`.

### `GET /instructor/courses/:id/exam-settings` and `PUT /instructor/courses/:id/exam-settings`
- **Roles**: `instructor` (owner), `admin`
- **`PUT` Request JSON**:
```json
{
  "durationSeconds": 1800,
  "passingScorePercent": 60,
  "totalQuestions": 20,
  "attemptsAllowed": 3,
  "shuffleQuestions": true,
  "shuffleOptions": true,
  "difficultyMix": { "easyPercent": 40, "mediumPercent": 40, "hardPercent": 20 },
  "coveredSectionIds": ["sec-1", "sec-2", "sec-3", "sec-4"]
}
```
- **Success `200 OK`**: `ExamConfigDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`, `422 VALIDATION_ERROR` (difficulty mix sum !== 100).

### `POST /instructor/courses/:id/exam-settings/preview`
- **Roles**: `instructor` (owner), `admin`
- **Request JSON**: Optional partial override of `UpdateExamSettingsRequestDto` to preview unsaved settings.
- **Success `200 OK`**:
```json
{
  "sampleQuestions": [],
  "shortfallWarning": { "needed": 20, "available": 14 }
}
```
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`.

### `GET /instructor/students`
- **Roles**: `instructor`, `admin`
- **Query Params**: `courseId`, `q`, `page`, `limit`
- **Success `200 OK`**: Paginated `{ data: EnrolledStudentSummaryDto[], meta }`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### `GET /instructor/students/:id/progress`
- **Roles**: `instructor`, `admin`
- **Query Params**: `courseId` (optional)
- **Success `200 OK`**: `EnrolledStudentProgressDetailDto` (per-lesson watch percentages & statuses, exam attempts history, certificate code).
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 STUDENT_NOT_FOUND`.

### `GET /instructor/comments`
- **Roles**: `instructor`, `admin`
- **Query Params**: `status` (`unanswered | all`, default `unanswered`), `courseId`, `page`, `limit`
- **Success `200 OK`**: Paginated `{ data: CommentDto[], meta }`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### `PATCH /instructor/comments/:id`
- **Roles**: `instructor`, `admin`
- **Request JSON**: `{ "resolved": true }`
- **Success `200 OK`**: Updated `CommentDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COMMENT_NOT_FOUND`.

---

## 17. Supervisor Endpoints

### `GET /supervisor/dashboard`
- **Roles**: `supervisor`, `admin`
- **Success `200 OK`**: `SupervisorDashboardDto` (`kpis`, `queueVolumeLast7Days[]`, `recentActions[]`).
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### `GET /supervisor/comments`
- **Roles**: `supervisor`, `admin`
- **Query Params**: `status` (`pending | flagged | approved | rejected`), `page`, `limit`
- **Success `200 OK`**: Paginated `{ data: CommentDto[], meta }`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### `POST /supervisor/comments/:id/approve`
- **Roles**: `supervisor`, `admin`
- **Behavior**: Sets `status: "approved"`, `isSupervisorVerified: true`, and sends a notification to the comment author.
- **Success `200 OK`**: Updated `CommentDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COMMENT_NOT_FOUND`.

### `POST /supervisor/comments/:id/reject`
- **Roles**: `supervisor`, `admin`
- **Request JSON**: `{ "reason": "spam", "notes": "Promotional link" }`
- **Success `200 OK`**: Updated `CommentDto` (`status: "rejected"`, `rejectionReason`).
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COMMENT_NOT_FOUND`, `422 VALIDATION_ERROR`.

### `POST /supervisor/comments/:id/restore`
- **Roles**: `supervisor`, `admin`
- **Behavior**: Restores a rejected/flagged comment back to `approved` (`isSupervisorVerified: true`).
- **Success `200 OK`**: Updated `CommentDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COMMENT_NOT_FOUND`.

### `DELETE /supervisor/comments/:id`
- **Roles**: `supervisor`, `admin`
- **Success `200 OK`**: `{ "success": true, "message": "Comment permanently deleted." }`
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COMMENT_NOT_FOUND`.

### `POST /supervisor/comments/bulk-approve`
- **Roles**: `supervisor`, `admin`
- **Request JSON**: `{ "ids": ["scm-1", "scm-2"] }`
- **Success `200 OK`**: `{ "approvedCount": 2, "approvedIds": ["scm-1", "scm-2"] }`
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `422 VALIDATION_ERROR`.

### `GET /supervisor/course-reviews` and `GET /supervisor/course-reviews/:courseId`
- **Roles**: `supervisor`, `admin`
- **`GET` Query Params**: `status` (`all | pending_review | published | rejected | changes_requested`), `page`, `limit`
- **Success `200 OK`**: Paginated `CourseReviewSubmissionDto[]` (list) / Single `CourseReviewSubmissionDto` (detail).
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`.

### `PUT /supervisor/course-reviews/:courseId/checklist`
- **Roles**: `supervisor`, `admin`
- **Request JSON**:
```json
{
  "titleAndDescription": "pass",
  "coverAndDemoVideo": "pass",
  "curriculumComplete": "pass",
  "enoughQuestionsInBank": "fail",
  "pricingSet": "pass"
}
```
- **Success `200 OK`**: Updated `CourseReviewSubmissionDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`, `422 VALIDATION_ERROR`.

### `POST /supervisor/course-reviews/:courseId/approve`
- **Roles**: `supervisor`, `admin`
- **Behavior**: Transitions `course.status` -> `"published"`, `reviewDecision` -> `"approved"`, notifies instructor.
- **Success `200 OK`**: Updated `CourseReviewSubmissionDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`.

### `POST /supervisor/course-reviews/:courseId/request-changes`
- **Roles**: `supervisor`, `admin`
- **Request JSON**: `{ "notes": "Please add captions to Lesson 4 and 11 more bank questions." }`
- **Behavior**: Transitions `course.status` -> `"rejected"`, `reviewDecision` -> `"changes_requested"`, sets `rejectionReason`, notifies instructor.
- **Success `200 OK`**: Updated `CourseReviewSubmissionDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`, `422 VALIDATION_ERROR` (`notes` < 8 chars).

### `POST /supervisor/course-reviews/:courseId/reject`
- **Roles**: `supervisor`, `admin`
- **Request JSON**: `{ "reason": "Insufficient syllabus coverage and broken lab video links." }`
- **Behavior**: Transitions `course.status` -> `"rejected"`, `reviewDecision` -> `"rejected"`, notifies instructor.
- **Success `200 OK`**: Updated `CourseReviewSubmissionDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`, `422 VALIDATION_ERROR` (`reason` < 8 chars).

### `GET /supervisor/reports` and `POST /supervisor/reports/:id/resolve`
- **Roles**: `supervisor`, `admin`
- **`GET` Query Params**: `status` (`all | open | resolved`), `page`, `limit`
- **`POST` Request JSON**: `{ "resolutionNotes": "Reviewed spam link and removed comment." }` (optional)
- **Success `200 OK`**: Paginated `ModerationReportDto[]` / Resolved `ModerationReportDto`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 REPORT_NOT_FOUND`.

---

## 18. Admin Endpoints

### `GET /admin/dashboard`
- **Roles**: `admin`
- **Success `200 OK`**: `AdminDashboardDto` (`kpis`, `userGrowth6Months[]`, `categoryDistribution[]`, `usersByRole[]`, `pendingCourses[]`, `pendingInstructorApplications[]`, `recentActivity[]`).
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### `GET /admin/users`
- **Roles**: `admin`
- **Query Params**: `q`, `role` (`student | instructor | supervisor | admin`), `status` (`active | suspended | pending`), `page`, `limit`
- **Success `200 OK`**: Paginated `{ data: UserDto[], meta }`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### `POST /admin/users`
- **Roles**: `admin`
- **Request JSON**:
```json
{
  "name": "Tariq Nassar",
  "email": "tariq@eduhub.com",
  "role": "instructor",
  "temporaryPassword": "TempPassword#1",
  "sendInvite": true
}
```
- **Success `201 Created`**: Created `UserDto` (`status: "pending"` if `sendInvite: true`, else `"active"`).
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 EMAIL_EXISTS`, `422 VALIDATION_ERROR`.

### `PATCH /admin/users/:id` and `DELETE /admin/users/:id`
- **Roles**: `admin`
- **`PATCH` Request JSON**: `{ "name": "...", "role": "supervisor", "status": "suspended" }`
- **`PATCH` Success `200 OK`**: Updated `UserDto`.
- **`DELETE` Success `200 OK`**: `{ "success": true, "message": "User account deleted." }`
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 USER_NOT_FOUND`, `422 VALIDATION_ERROR`.

### `POST /admin/users/bulk`
- **Roles**: `admin`
- **Request JSON**: `{ "ids": ["user-stu-2", "user-stu-3"], "action": "suspend" }` (`activate | suspend | delete`)
- **Success `200 OK`**: `{ "affectedCount": 2, "affectedIds": ["user-stu-2", "user-stu-3"], "action": "suspend" }`
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `422 VALIDATION_ERROR`.

### `POST /admin/instructor-applications/:id/approve`, `POST /admin/instructor-applications/:id/reject`
- **Roles**: `admin`
- **Success `200 OK`**: `{ "success": true, "message": "Instructor application processed." }`
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 APPLICATION_NOT_FOUND`.

### `GET /admin/courses`
- **Roles**: `admin`
- **Query Params**: `status` (`all | pending_review | published | rejected | draft`), `q`, `page`, `limit`
- **Success `200 OK`**: Paginated `{ data: CourseDto[], meta }`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### `POST /admin/courses/:id/approve`, `POST /admin/courses/:id/reject`, `POST /admin/courses/:id/unpublish`, `PATCH /admin/courses/:id/feature`, `PATCH /admin/courses/:id/status`, `DELETE /admin/courses/:id`
- **Roles**: `admin`
- **Payloads**:
  - `POST .../approve`: none -> sets `published`, notifies instructor
  - `POST .../reject`: `{ "reason": "..." }` (min 8 chars) -> sets `rejected`, notifies instructor
  - `POST .../unpublish`: none -> sets `draft`
  - `PATCH .../feature`: `{ "featured": true }` -> updates `featured`
  - `PATCH .../status`: `{ "status": "published", "reason?": "..." }` -> admin status override
- **Success `200 OK`**: Updated `CourseDto` (or `{ "success": true }` on `DELETE`).
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 COURSE_NOT_FOUND`, `422 VALIDATION_ERROR`.

### `GET /admin/categories`, `POST /admin/categories`, `PATCH /admin/categories/:id`, `DELETE /admin/categories/:id`, `PUT /admin/categories/order`
- **Roles**: `admin`
- **`POST`/`PATCH` Request JSON**: `{ "name": "DevOps", "description": "CI/CD, Docker, and cloud infra.", "iconName": "BookOpen", "accentColor": "#6D4AE0" }`
- **`PUT .../order` Request JSON**: `{ "orderedIds": ["cat-web", "cat-design", "..."] }`
- **Success `200 OK` / `201 Created`**: `CategoryDto` or `{ "data": [CategoryDto] }`.
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 CATEGORY_NOT_FOUND`, `422 VALIDATION_ERROR`.

### `GET /admin/certificates`, `POST /admin/certificates/:id/revoke`, `POST /admin/certificates/:id/restore`
- **Roles**: `admin`
- **`GET` Query Params**: `q`, `status` (`all | valid | revoked`), `page`, `limit`
- **`GET` Success `200 OK`**: Paginated `{ data: CertificateDto[], meta }`.
- **`POST .../revoke` / `restore` Success `200 OK`**: Updated `CertificateDto` (`status: "revoked"` / `"valid"`).
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 CERTIFICATE_NOT_FOUND`.

### `GET /admin/settings` and `PUT /admin/settings`
- **Roles**: `admin`
- **`GET` / `PUT` JSON**:
```json
{
  "platformName": "EduHub",
  "currency": "USD",
  "defaultPassScorePercent": 60,
  "maxAvatarSizeBytes": 2097152,
  "maxImageSizeBytes": 5242880,
  "maxVideoSizeBytes": 2147483648
}
```
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `422 VALIDATION_ERROR`.

### `GET /admin/permissions`
- **Roles**: `admin`
- **Success `200 OK`**:
```json
{
  "data": [
    {
      "id": "perm-1",
      "feature": "Browse catalog, preview demos & enroll in courses",
      "category": "learning",
      "student": true,
      "instructor": true,
      "supervisor": true,
      "admin": true
    }
  ]
}
```
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.
