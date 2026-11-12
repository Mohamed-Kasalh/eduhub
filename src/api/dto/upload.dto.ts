import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema, UploadKindSchema } from './common.dto';

export const UploadResponseSchema = z.object({
  id: IdSchema,
  kind: UploadKindSchema,
  url: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
});
export type UploadResponseDto = z.infer<typeof UploadResponseSchema>;
