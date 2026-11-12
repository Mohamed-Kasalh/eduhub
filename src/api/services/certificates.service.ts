import {
  CertificateSchema,
  CertificateVerificationResponseSchema,
  CertificatesListResponseSchema,
  type CertificateDto,
  type CertificateVerificationResponseDto,
  type CertificatesListResponseDto,
} from '../dto';
import { download, http, type DownloadResult } from '../http';

/** Public certificate verification and student/admin certificate endpoints. */
export const certificatesService = {
  /** Publicly verifies a certificate by its verification code (no auth required). */
  async verifyCertificate(code: string): Promise<CertificateVerificationResponseDto> {
    return http.get(`/verify/${encodeURIComponent(code)}`, CertificateVerificationResponseSchema, {
      skipAuth: true,
    });
  },

  /** Generates/issues a certificate for a course once lessons & exam criteria are met. */
  async generateCertificate(courseId: string): Promise<CertificateDto> {
    return http.post(`/courses/${encodeURIComponent(courseId)}/certificate`, CertificateSchema);
  },

  /** Lists all certificates earned by the authenticated student. */
  async getMyCertificates(): Promise<CertificatesListResponseDto> {
    return http.get('/me/certificates', CertificatesListResponseSchema);
  },

  /** Retrieves a single certificate by ID or verification code. */
  async getCertificate(certificateId: string): Promise<CertificateDto> {
    return http.get(`/certificates/${encodeURIComponent(certificateId)}`, CertificateSchema);
  },

  /** Downloads a binary PDF or PNG representation of the certificate. */
  async downloadCertificateFile(
    certificateId: string,
    format: 'pdf' | 'png' = 'pdf'
  ): Promise<DownloadResult> {
    return download(`/certificates/${encodeURIComponent(certificateId)}/file`, {
      query: { format },
    });
  },
};
