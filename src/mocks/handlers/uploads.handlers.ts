import { http } from 'msw';
import { UploadKindSchema } from '../../api/dto';
import { getMockDb, nextDbId, nowUtcIso, persistMockDb } from '../db';
import {
  apiEndpoint,
  isUploadedBlobLike,
  jsonError,
  jsonOk,
  requireAuth,
  simulateNetwork,
} from '../helpers';

const ALLOWED_MIMES: Record<string, string[]> = {
  avatar: ['image/jpeg', 'image/png'],
  course_cover: ['image/jpeg', 'image/png'],
  demo_video: ['video/mp4'],
  lesson_video: ['video/mp4'],
  attachment: [
    'application/pdf',
    'application/zip',
    'text/csv',
    'application/octet-stream',
  ],
  csv: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
};

const MAX_BYTES: Record<string, number> = {
  avatar: 2_097_152, // 2 MB
  course_cover: 5_242_880, // 5 MB
  demo_video: 2_147_483_648, // 2 GB
  lesson_video: 2_147_483_648, // 2 GB
  attachment: 52_428_800, // 50 MB
  csv: 5_242_880, // 5 MB
};

export const uploadsHandlers = [
  http.post(apiEndpoint('/uploads'), async ({ request }) => {
    const fault = await simulateNetwork();
    if (fault) return fault;

    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(400, 'BAD_REQUEST', 'Expected multipart/form-data payload.');
    }

    const rawKind = formData.get('kind');
    const kindParsed = UploadKindSchema.safeParse(rawKind);
    if (!kindParsed.success) {
      return jsonError(422, 'VALIDATION_ERROR', 'Unsupported upload kind.', {
        kind: ['Must be avatar, course_cover, demo_video, lesson_video, attachment, or csv.'],
      });
    }

    const kind = kindParsed.data;
    if (auth.userRecord.user.role === 'student' && kind !== 'avatar') {
      return jsonError(403, 'FORBIDDEN', 'Students can only upload profile avatars.');
    }

    const fileEntry = formData.get('file');
    if (!isUploadedBlobLike(fileEntry)) {
      return jsonError(400, 'BAD_REQUEST', 'Missing file field in upload payload.');
    }

    const filename =
      typeof fileEntry.name === 'string' && fileEntry.name.length > 0
        ? fileEntry.name
        : `${kind}-${Date.now()}.bin`;
    const mimeType = fileEntry.type || 'application/octet-stream';
    const sizeBytes = fileEntry.size;

    const allowed = ALLOWED_MIMES[kind] ?? [];
    const allowCsvByExtension =
      kind === 'csv' && filename.toLowerCase().endsWith('.csv');
    if (!allowCsvByExtension && allowed.length > 0 && !allowed.includes(mimeType)) {
      return jsonError(
        422,
        'VALIDATION_ERROR',
        `Unsupported file type (${mimeType}) for ${kind} upload.`,
        { file: [`Unsupported file type ${mimeType}.`] }
      );
    }

    const limitBytes = MAX_BYTES[kind] ?? 5_242_880;
    if (sizeBytes > limitBytes) {
      return jsonError(
        422,
        'VALIDATION_ERROR',
        `File exceeds maximum allowed size (${limitBytes} bytes).`,
        { file: [`File exceeds maximum allowed limit of ${limitBytes} bytes.`] }
      );
    }

    const id = nextDbId('upl');
    const safeFile = encodeURIComponent(filename.replace(/\s+/g, '-'));
    const record = {
      id,
      kind,
      url: `https://cdn.eduhub.com/uploads/${id}-${safeFile}`,
      filename,
      mimeType,
      sizeBytes,
      createdAt: nowUtcIso(),
    };

    getMockDb().uploads.unshift(record);
    persistMockDb();
    return jsonOk(record, 201);
  }),
];
