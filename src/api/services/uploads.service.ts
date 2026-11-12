import {
  UploadResponseSchema,
  type UploadKindDto,
  type UploadResponseDto,
} from '../dto';
import { upload, type UploadProgressEvent } from '../http';

export interface UploadFileParams {
  file: File | Blob;
  kind: UploadKindDto;
  filename?: string;
  signal?: AbortSignal;
  onProgress?: (progress: UploadProgressEvent) => void;
}

/** Multipart media and attachment upload endpoint with progress and cancellation. */
export const uploadsService = {
  /** Uploads a single file (`avatar`, `course_cover`, `demo_video`, `lesson_video`, `attachment`, or `csv`). */
  async uploadFile({
    file,
    kind,
    filename,
    signal,
    onProgress,
  }: UploadFileParams): Promise<UploadResponseDto> {
    const formData = new FormData();
    formData.append('kind', kind);
    const resolvedName =
      filename ?? (file instanceof File ? file.name : `${kind}-upload`);
    formData.append('file', file, resolvedName);

    return upload('/uploads', formData, {
      schema: UploadResponseSchema,
      signal,
      onProgress,
    });
  },
};
