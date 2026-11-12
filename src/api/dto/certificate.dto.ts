import { z } from 'zod';
import {
  CertificateGradeSchema,
  CertificateStatusSchema,
  CourseRefSchema,
  IdSchema,
  IsoDateTimeSchema,
  createPaginatedSchema,
} from './common.dto';

export const CertificateStudentRefSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
});
export type CertificateStudentRefDto = z.infer<typeof CertificateStudentRefSchema>;

export const CertificateSchema = z.object({
  id: IdSchema,
  verificationCode: z.string().min(1),
  student: CertificateStudentRefSchema,
  course: CourseRefSchema,
  instructorName: z.string().min(1),
  academicDirectorName: z.string().min(1),
  issuedAt: IsoDateTimeSchema,
  grade: CertificateGradeSchema,
  scorePercent: z.number().min(0).max(100),
  status: CertificateStatusSchema,
  verificationUrl: z.string().min(1),
});
export type CertificateDto = z.infer<typeof CertificateSchema>;

export const CertificateVerificationResponseSchema = z.object({
  status: CertificateStatusSchema,
  certificate: CertificateSchema,
});
export type CertificateVerificationResponseDto = z.infer<
  typeof CertificateVerificationResponseSchema
>;

export const CertificatesListResponseSchema = z.object({
  data: z.array(CertificateSchema),
});
export type CertificatesListResponseDto = z.infer<
  typeof CertificatesListResponseSchema
>;

export const PaginatedCertificatesResponseSchema =
  createPaginatedSchema(CertificateSchema);
export type PaginatedCertificatesResponseDto = z.infer<
  typeof PaginatedCertificatesResponseSchema
>;
