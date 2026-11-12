import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router';
import { toPng } from 'html-to-image';
import {
  Award,
  CheckCircle2,
  Download,
  Share2,
  Copy,
  ExternalLink,
  Lock,
  ChevronLeft,
  Sparkles,
  Loader2,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  AlertCircle,
  Search,
  QrCode,
  Check,
  XCircle,
} from 'lucide-react';
import {
  Button,
  StatusChip,
  Breadcrumbs,
  EmptyState,
} from '../../components/ui';
import { BrandLogo, CatMascot } from '../../components/brand/BrandLogo';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { CertificateRecord } from '../../data/mockData';
import { handleImageError } from '../../utils/imageFallback';
import { usePageTitle } from '../../hooks/usePageTitle';

/**
 * Crisp SVG QR Code component for the certificate verification link
 */
const CertificateQrCode: React.FC<{ size?: number }> = ({ size = 76 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="rounded-[6px] border border-[#E6E1F5] bg-white p-1.5 shrink-0"
    aria-label="Certificate verification QR code"
  >
    {/* Top-left finder pattern */}
    <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="#1E1B2E" strokeWidth="2" />
    <rect x="5" y="5" width="4" height="4" fill="#6D4AE0" />
    {/* Top-right finder pattern */}
    <rect x="24" y="2" width="10" height="10" rx="1.5" stroke="#1E1B2E" strokeWidth="2" />
    <rect x="27" y="5" width="4" height="4" fill="#6D4AE0" />
    {/* Bottom-left finder pattern */}
    <rect x="2" y="24" width="10" height="10" rx="1.5" stroke="#1E1B2E" strokeWidth="2" />
    <rect x="5" y="27" width="4" height="4" fill="#6D4AE0" />
    {/* Data modules */}
    <rect x="15" y="3" width="3" height="3" fill="#1E1B2E" />
    <rect x="19" y="6" width="3" height="3" fill="#6D4AE0" />
    <rect x="14" y="11" width="3" height="3" fill="#1E1B2E" />
    <rect x="18" y="14" width="4" height="4" fill="#1E1B2E" />
    <rect x="3" y="15" width="3" height="3" fill="#1E1B2E" />
    <rect x="8" y="17" width="4" height="3" fill="#6D4AE0" />
    <rect x="24" y="15" width="3" height="3" fill="#1E1B2E" />
    <rect x="29" y="18" width="4" height="3" fill="#1E1B2E" />
    <rect x="15" y="22" width="3" height="3" fill="#6D4AE0" />
    <rect x="21" y="24" width="4" height="4" fill="#1E1B2E" />
    <rect x="27" y="25" width="3" height="3" fill="#6D4AE0" />
    <rect x="15" y="30" width="4" height="3" fill="#1E1B2E" />
    <rect x="23" y="31" width="4" height="3" fill="#1E1B2E" />
    <rect x="30" y="30" width="3" height="3" fill="#1E1B2E" />
  </svg>
);

/**
 * Ornate Gold Seal Emblem for the A4 Landscape Certificate
 */
const OrnateGoldSeal: React.FC = () => (
  <div className="relative inline-flex flex-col items-center select-none">
    {/* Ribbons */}
    <div className="absolute -bottom-3 flex items-center gap-3">
      <div className="w-3.5 h-6 bg-[#D97706] skew-x-[-14deg] rounded-b-xs" />
      <div className="w-3.5 h-6 bg-[#B45309] skew-x-[14deg] rounded-b-xs" />
    </div>
    {/* Seal disc */}
    <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#FDE68A] via-[#F5B82E] to-[#D97706] p-1.5 shadow-[0_6px_18px_rgba(245,184,46,0.45)] border-2 border-white flex items-center justify-center">
      <div className="w-full h-full rounded-full border-2 border-dashed border-[#78350F]/60 flex flex-col items-center justify-center text-center px-1">
        <Award className="w-6 h-6 sm:w-7 sm:h-7 text-[#78350F]" />
        <span className="text-[8px] sm:text-[9px] font-extrabold tracking-widest uppercase text-[#78350F] leading-tight mt-0.5">
          Verified
        </span>
        <span className="text-[7px] sm:text-[8px] font-bold text-[#92400E] leading-none">
          EduHub Seal
        </span>
      </div>
    </div>
  </div>
);

// ============================================================================
// PART B.1 & B.2 — CERTIFICATE DETAIL / COMPLETION / LOCKED PAGE (/certificates/:id)
// ============================================================================
export const CertificateDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    certificates,
    courses,
    getCourseProgressStats,
    examBestScores,
    completeAllCourseLessons,
    setCourseExamScore,
    addToast,
  } = useApp();
  const { user } = useAuth();

  const certRef = useRef<HTMLDivElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const cert: CertificateRecord = useMemo(() => {
    return (
      certificates.find(
        (c) =>
          c.id.toLowerCase() === (id || '').toLowerCase() ||
          c.verificationCode.toLowerCase() === (id || '').toLowerCase()
      ) || certificates[0]
    );
  }, [certificates, id]);

  const studentDisplayName =
    user && cert.studentId === user.id ? user.name : cert.studentName;

  const course = useMemo(
    () => courses.find((c) => c.id === cert.courseId) || courses[0],
    [courses, cert.courseId]
  );
  usePageTitle(`Certificate • ${course.title}`);

  const stats = getCourseProgressStats(course.id);
  const bestScore = examBestScores[course.id] ?? cert.scorePercent;

  // Mode switcher: 'preview' (2. Certificate preview) | 'completion' (1. Completion screen with 2s loader) | 'locked' (Locked state)
  const [viewMode, setViewMode] = useState<'preview' | 'completion' | 'locked'>(() => {
    const v = searchParams.get('view');
    if (v === 'completion') return 'completion';
    if (v === 'locked') return 'locked';
    return 'preview';
  });

  // 2-second generating loader state on the Completion screen
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const v = searchParams.get('view');
    if (v === 'completion' || v === 'locked' || v === 'preview') {
      setViewMode(v);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('action') !== 'print' || viewMode !== 'preview') return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
      window.print();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [searchParams, viewMode, setSearchParams]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleGenerateCertificate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setViewMode('preview');
      setSearchParams({}, { replace: true });
      addToast({
        title: 'Certificate generated!',
        message: `Official credential ${cert.verificationCode} has been issued and verified.`,
        variant: 'success',
      });
    }, 2000);
  };

  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/verify/${cert.verificationCode}`
      : `https://eduhub.com/verify/${cert.verificationCode}`;

  const handlePrintPdf = () => {
    window.print();
    addToast({
      title: 'Print dialog opened',
      message: `Select "Save as PDF" (A4 Landscape) to save ${cert.verificationCode}.pdf.`,
      variant: 'info',
    });
  };

  const handleDownloadPng = async () => {
    if (!certRef.current || isDownloadingPng) return;
    setIsDownloadingPng(true);
    try {
      const dataUrl = await toPng(certRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      const downloadAnchor = document.createElement('a');
      downloadAnchor.download = `${cert.verificationCode}-2x.png`;
      downloadAnchor.href = dataUrl;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      addToast({
        title: 'Certificate PNG saved',
        message: `${cert.verificationCode}-2x.png downloaded at 2x resolution.`,
        variant: 'success',
      });
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : 'Unable to export certificate image.';
      addToast({
        title: 'PNG download failed',
        message: reason,
        variant: 'danger',
      });
    } finally {
      setIsDownloadingPng(false);
    }
  };

  const handleShareLinkedIn = () => {
    const parsedDate = new Date(cert.issuedAt);
    const params = new URLSearchParams({
      startTask: 'CERTIFICATION_NAME',
      name: cert.courseTitle,
      organizationName: 'EduHub',
      certId: cert.verificationCode,
      certUrl: verifyUrl,
    });
    if (!Number.isNaN(parsedDate.getTime())) {
      params.set('issueYear', String(parsedDate.getFullYear()));
      params.set('issueMonth', String(parsedDate.getMonth() + 1));
    }
    const linkedInUrl = `https://www.linkedin.com/profile/add?${params.toString()}`;
    const opened = window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
    if (opened) {
      addToast({
        title: 'LinkedIn Add to profile opened',
        message: `Opened LinkedIn with credential ID ${cert.verificationCode}.`,
        variant: 'info',
      });
    } else {
      addToast({
        title: 'Popup blocked',
        message: 'Allow popups for this site to open LinkedIn Add to profile.',
        variant: 'warning',
      });
    }
  };

  const handleCopyVerifyLink = async () => {
    let success = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(verifyUrl);
        success = true;
      }
    } catch {
      success = false;
    }

    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = verifyUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopiedLink(true);
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopiedLink(false), 2500);
      addToast({
        title: 'Verification link copied',
        message: `${verifyUrl} copied to clipboard.`,
        variant: 'success',
      });
    } else {
      addToast({
        title: 'Copy failed',
        message: 'Unable to copy automatically. Please copy the verification link manually.',
        variant: 'danger',
      });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: 'My certificates', to: '/certificates' },
            { label: `${cert.courseTitle} (${cert.verificationCode})` },
          ]}
        />

        {/* Interactive Switcher for 1. Completion Screen, 2. Certificate Preview, and Locked State */}
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-[10px] bg-white border border-[#E6E1F5] shadow-2xs self-start">
          <span className="text-[11px] font-bold text-[#5F5B75] px-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#6D4AE0]" />
            Screen:
          </span>
          {(
            [
              { id: 'completion', label: '1. Completion screen' },
              { id: 'preview', label: '2. Certificate preview' },
              { id: 'locked', label: 'Locked state' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setViewMode(m.id)}
              className={`px-2.5 py-1 rounded-[7px] text-[12px] font-bold cursor-pointer transition-colors ${
                viewMode === m.id
                  ? 'bg-[#6D4AE0] text-white'
                  : 'text-[#5F5B75] hover:text-[#1E1B2E]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ==========================================================================
          STATE A: LOCKED STATE (Shown when lessons < 100% or exam not passed)
          ========================================================================== */}
      {viewMode === 'locked' && (
        <div className="max-w-2xl mx-auto rounded-[12px] bg-white border-2 border-[#F59E0B]/45 shadow-purple-md p-6 sm:p-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center mx-auto border-4 border-white shadow-md">
            <Lock className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <StatusChip label="Certificate locked" variant="warning" />
            <h1 className="text-[32px] sm:text-[36px] font-display font-bold text-[#1E1B2E]">
              Complete remaining requirements to unlock
            </h1>
            <p className="text-[15px] text-[#5F5B75] max-w-lg mx-auto">
              A verified EduHub certificate is issued only when 100% of course lessons are
              completed and you pass the final exam with a score of 60% or higher.
            </p>
          </div>

          {/* Missing requirements breakdown */}
          <div className="rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] p-5 text-left space-y-3">
            <p className="text-[13px] font-bold text-[#5F5B75]">
              Requirements checklist for {course.title}:
            </p>
            <div className="p-3.5 rounded-[10px] bg-white border border-[#E6E1F5] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center text-[12px] font-bold">
                  1
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#1E1B2E]">
                    Complete 100% of lessons (watch 90%+ per lesson)
                  </p>
                  <p className="text-[12px] text-[#B45309] font-semibold">
                    Missing: 4 of 12 lessons remaining (currently at 67%)
                  </p>
                </div>
              </div>
              <Link to={`/student/progress/${course.id}`}>
                <Button size="sm" variant="secondary">
                  Finish lessons
                </Button>
              </Link>
            </div>

            <div className="p-3.5 rounded-[10px] bg-white border border-[#E6E1F5] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center text-[12px] font-bold">
                  2
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#1E1B2E]">
                    Pass the final certification exam (60%+)
                  </p>
                  <p className="text-[12px] text-[#5F5B75]">
                    Requires 12+ correct answers out of 20
                  </p>
                </div>
              </div>
              <Link to={`/exam/${course.id}`}>
                <Button size="sm" variant="secondary">
                  Take exam
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => {
                completeAllCourseLessons(course.id);
                setCourseExamScore(course.id, 86);
                setViewMode('completion');
              }}
            >
              Simulate requirements met & open Completion screen
            </Button>
            <Link to={`/student/progress/${course.id}`}>
              <Button variant="ghost">Back to course</Button>
            </Link>
          </div>
        </div>
      )}

      {/* ==========================================================================
          STATE B: 1. COMPLETION SCREEN ("Congratulations!" with confetti, checklist,
          "Generate my certificate" button, 2-second generating loader, then success)
          ========================================================================== */}
      {viewMode === 'completion' && (
        <div className="relative max-w-2xl mx-auto rounded-[12px] bg-white border-2 border-[#6D4AE0]/30 shadow-purple-lg p-6 sm:p-10 text-center space-y-6 overflow-hidden">
          {/* Decorative Confetti Dots & Ribbons */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden"
          >
            <span className="absolute top-4 left-[12%] w-3 h-3 rounded-full bg-[#F5B82E] animate-bounce" />
            <span className="absolute top-8 left-[24%] w-4 h-2 rounded-full bg-[#6D4AE0] rotate-45" />
            <span className="absolute top-5 left-[42%] w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <span className="absolute top-7 right-[36%] w-4 h-2 rounded-full bg-[#F59E3B] -rotate-12" />
            <span className="absolute top-4 right-[20%] w-3 h-3 rounded-full bg-[#A78BFA] animate-bounce" />
            <span className="absolute top-9 right-[10%] w-3.5 h-2 rounded-full bg-[#16A34A] rotate-12" />
          </div>

          <div className="flex justify-center pt-2">
            <CatMascot size="xl" mood="success" />
          </div>

          <div className="space-y-2">
            <StatusChip label="Course 100% completed" variant="success" />
            <h1 className="text-[36px] sm:text-[42px] font-display font-bold text-[#1E1B2E]">
              Congratulations!
            </h1>
            <p className="text-[16px] text-[#5F5B75] max-w-lg mx-auto">
              You have satisfied every academic requirement for{' '}
              <strong className="text-[#1E1B2E]">{cert.courseTitle}</strong>.
            </p>
          </div>

          {/* 2-Step Completed Checklist: Lessons 100% done, Final exam passed with 86% */}
          <div className="max-w-md mx-auto rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] p-5 text-left space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-[10px] bg-white border border-[#16A34A]/30">
              <div className="w-7 h-7 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#1E1B2E]">Lessons 100% done</p>
                <p className="text-[12px] text-[#16A34A] font-semibold">
                  12 of 12 video lessons completed (90%+ watch rule met)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-[10px] bg-white border border-[#16A34A]/30">
              <div className="w-7 h-7 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#1E1B2E]">
                  Final exam passed with 86%
                </p>
                <p className="text-[12px] text-[#16A34A] font-semibold">
                  Passed with Distinction (minimum required: 60%)
                </p>
              </div>
            </div>
          </div>

          {/* 2-Second Generating Loader OR "Generate my certificate" Button */}
          {isGenerating ? (
            <div className="max-w-md mx-auto rounded-[12px] bg-[#F3EFFF] border border-[#6D4AE0]/40 p-5 space-y-3">
              <div className="flex items-center justify-center gap-2.5 text-[#6D4AE0] font-display font-bold text-[18px]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating your official certificate...</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white overflow-hidden">
                <div className="h-full bg-[#6D4AE0] rounded-full animate-pulse w-4/5" />
              </div>
              <p className="text-[12px] text-[#5F5B75]">
                Applying signatures, minting credential ID{' '}
                <strong className="text-[#3F2A9E]">{cert.verificationCode}</strong>, and
                encoding verification QR...
              </p>
            </div>
          ) : (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Award className="w-5 h-5" />}
                onClick={handleGenerateCertificate}
              >
                Generate my certificate
              </Button>
              <Link to={`/student/progress/${course.id}`}>
                <Button variant="ghost" size="lg">
                  Back to course
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ==========================================================================
          STATE C: 2. CERTIFICATE PREVIEW (/certificates/:id)
          Landscape A4 certificate, ornate purple and gold border, logo at top on white,
          title "Certificate of Completion", "This is to certify that", student full name
          in a large script font, "has successfully completed" + course title, score,
          completion date, instructor signature + EduHub director signature, gold seal,
          QR code, certificate ID (EDU-2026-000123), verify URL.
          Actions: Download PDF, Download PNG, Share (LinkedIn, copy link), Back to course.
          ========================================================================== */}
      {viewMode === 'preview' && (
        <div className="space-y-6">
          {/* Top Action Toolbar */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 sm:px-6 shadow-purple-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StatusChip label="Issued & Verified" variant="success" />
              <span className="text-[13px] font-bold text-[#6D4AE0]">
                ID: {cert.verificationCode}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={handlePrintPdf}
              >
                Download PDF
              </Button>

              <Button
                variant="secondary"
                size="sm"
                loading={isDownloadingPng}
                disabled={isDownloadingPng}
                leftIcon={<ImageIcon className="w-4 h-4" />}
                onClick={handleDownloadPng}
              >
                {isDownloadingPng ? 'Rendering PNG...' : 'Download PNG'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Share2 className="w-4 h-4" />}
                onClick={handleShareLinkedIn}
              >
                Share on LinkedIn
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="border border-[#E6E1F5]"
                leftIcon={
                  copiedLink ? (
                    <Check className="w-4 h-4 text-[#16A34A]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )
                }
                onClick={handleCopyVerifyLink}
              >
                {copiedLink ? 'Copied' : 'Copy link'}
              </Button>

              <Link to={`/student/progress/${course.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Back to course
                </Button>
              </Link>
            </div>
          </div>

          {/* LANDSCAPE A4 CERTIFICATE CANVAS (Scales cleanly on 1440 / 768 / 375 screens, strictly white background) */}
          <div id="certificate-print-area" className="max-w-[1040px] mx-auto">
            <div
              ref={certRef}
              className="relative rounded-[16px] bg-white p-3 sm:p-5 shadow-purple-lg border-4 border-[#6D4AE0]"
            >
              {/* Ornate Purple & Gold Double Frame with Corner Flourishes */}
              <div className="relative rounded-[10px] bg-white border-2 border-[#F5B82E] p-5 sm:p-10 lg:p-12 overflow-hidden">
                {/* 4 Ornate Corner Accents */}
                <div
                  aria-hidden="true"
                  className="w-8 h-8 sm:w-12 sm:h-12 border-t-4 border-l-4 border-[#6D4AE0] absolute top-2.5 left-2.5 rounded-tl-[6px]"
                />
                <div
                  aria-hidden="true"
                  className="w-8 h-8 sm:w-12 sm:h-12 border-t-4 border-r-4 border-[#6D4AE0] absolute top-2.5 right-2.5 rounded-tr-[6px]"
                />
                <div
                  aria-hidden="true"
                  className="w-8 h-8 sm:w-12 sm:h-12 border-b-4 border-l-4 border-[#6D4AE0] absolute bottom-2.5 left-2.5 rounded-bl-[6px]"
                />
                <div
                  aria-hidden="true"
                  className="w-8 h-8 sm:w-12 sm:h-12 border-b-4 border-r-4 border-[#6D4AE0] absolute bottom-2.5 right-2.5 rounded-br-[6px]"
                />

                {/* Subtle inner gold hairline */}
                <div className="relative z-10 flex flex-col items-center text-center space-y-4 sm:space-y-6">
                  {/* 1. Official EduHub Logo on White Background */}
                  <div className="flex flex-col items-center">
                    <BrandLogo size="md" showText to="" className="bg-white" />
                  </div>

                  {/* 2. Title "Certificate of Completion" & Subtitle "This is to certify that" */}
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#FAF8FF] border border-[#F5B82E]/60 text-[11px] sm:text-[12px] font-extrabold uppercase tracking-[0.2em] text-[#3F2A9E]">
                      Official Academic Credential
                    </div>
                    <h1 className="text-[28px] sm:text-[40px] lg:text-[46px] font-display font-bold text-[#1E1B2E] leading-tight">
                      Certificate of Completion
                    </h1>
                    <p className="text-[14px] sm:text-[16px] italic text-[#5F5B75]">
                      This is to certify that
                    </p>
                  </div>

                  {/* 3. Student Full Name in Large Script Font */}
                  <div className="py-1 sm:py-2 border-b-2 border-[#F5B82E]/60 px-8 sm:px-16">
                    <p className="font-script text-[44px] sm:text-[60px] lg:text-[68px] text-[#3F2A9E] leading-none select-all">
                      {studentDisplayName}
                    </p>
                  </div>

                  {/* 4. "has successfully completed" + Course Title + Score + Completion Date */}
                  <div className="space-y-2 max-w-2xl">
                    <p className="text-[14px] sm:text-[16px] text-[#5F5B75]">
                      has successfully completed all required video lessons, practical assignments,
                      and the proctored final certification exam for
                    </p>
                    <h2 className="text-[22px] sm:text-[30px] lg:text-[34px] font-display font-bold text-[#6D4AE0] leading-snug">
                      {cert.courseTitle}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-1 text-[13px] sm:text-[14px] font-semibold text-[#1E1B2E]">
                      <span className="px-3 py-1 rounded-full bg-[#F3EFFF] text-[#3F2A9E]">
                        Final Exam Score: <strong>{cert.scorePercent}% ({cert.grade})</strong>
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#FAF8FF] border border-[#E6E1F5] text-[#5F5B75]">
                        Completion Date: <strong className="text-[#1E1B2E]">{cert.issuedAt}</strong>
                      </span>
                    </div>
                  </div>

                  {/* 5. Signatures (Instructor + EduHub Director), Gold Seal, QR Code, Certificate ID & Verify URL */}
                  <div className="w-full pt-6 sm:pt-8 mt-2 border-t border-[#E6E1F5] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Instructor Signature */}
                    <div className="md:col-span-3 flex flex-col items-center">
                      <p className="font-script text-[28px] sm:text-[32px] text-[#1E1B2E] leading-none">
                        {cert.instructorName}
                      </p>
                      <div className="w-40 h-px bg-[#1E1B2E]/30 my-1.5" />
                      <p className="text-[13px] font-bold text-[#1E1B2E]">
                        {cert.instructorName}
                      </p>
                      <p className="text-[11px] text-[#5F5B75]">Lead Course Instructor</p>
                    </div>

                    {/* Center Gold Seal */}
                    <div className="md:col-span-3 flex justify-center py-2">
                      <OrnateGoldSeal />
                    </div>

                    {/* EduHub Director Signature */}
                    <div className="md:col-span-3 flex flex-col items-center">
                      <p className="font-script text-[28px] sm:text-[32px] text-[#1E1B2E] leading-none">
                        Nour Khaled
                      </p>
                      <div className="w-40 h-px bg-[#1E1B2E]/30 my-1.5" />
                      <p className="text-[13px] font-bold text-[#1E1B2E]">Nour Khaled</p>
                      <p className="text-[11px] text-[#5F5B75]">EduHub Academic Director</p>
                    </div>

                    {/* QR Code + Certificate ID (EDU-2026-000123) + Verify URL */}
                    <div className="md:col-span-3 flex flex-col sm:flex-row md:flex-col items-center justify-center gap-2 text-center md:text-right">
                      <CertificateQrCode size={68} />
                      <div className="space-y-0.5 text-center">
                        <p className="text-[11px] font-extrabold text-[#6D4AE0] tracking-wide">
                          ID: {cert.verificationCode}
                        </p>
                        <Link
                          to={`/verify/${cert.verificationCode}`}
                          className="text-[10px] text-[#5F5B75] hover:text-[#6D4AE0] underline block break-all"
                        >
                          eduhub.com/verify/{cert.verificationCode}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PART B.3 — MY CERTIFICATES LIST PAGE (/certificates)
// Grid of certificate thumbnails (course, date, ID) with View and Download;
// empty state with the cat mascot + locked course card explaining what is missing.
// ============================================================================
export const CertificatesListPage: React.FC = () => {
  const { certificates, courses } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [previewEmpty, setPreviewEmpty] = useState(false);

  const myCertificates = useMemo(
    () => (previewEmpty ? [] : certificates),
    [certificates, previewEmpty]
  );

  // Example in-progress course to show the locked state right alongside earned certificates
  const lockedCourse = courses.find((c) => c.id === 'course-2') || courses[1];

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumbs
        items={[
          { label: 'Student dashboard', to: '/student/dashboard' },
          { label: 'My certificates' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            My certificates
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Verified landscape A4 credentials earned by completing 100% of lessons and passing
            final exams.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPreviewEmpty((v) => !v)}
          className="self-start sm:self-auto px-3 py-1.5 rounded-[10px] bg-white border border-[#E6E1F5] hover:border-[#A78BFA] text-[12px] font-semibold text-[#6D4AE0] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#F59E3B]" />
          <span>{previewEmpty ? 'Restore certificates' : 'Preview empty state'}</span>
        </button>
      </div>

      {myCertificates.length === 0 ? (
        <EmptyState
          title="No certificates earned yet"
          description="Complete 100% of a course's video lessons and score 60% or higher on the final exam to unlock your first verified EduHub certificate."
          actionLabel="Browse courses"
          actionTo="/courses"
          mood="empty"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myCertificates.map((cert) => (
            <article
              key={cert.id}
              className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm hover:shadow-purple-md hover:border-[#A78BFA] transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Miniature Landscape A4 Certificate Thumbnail on White Background */}
              <Link
                to={`/certificates/${cert.id}`}
                className="block p-4 bg-[#F3EFFF] border-b border-[#E6E1F5] group"
              >
                <div className="rounded-[10px] bg-white border-2 border-[#6D4AE0] p-1.5 shadow-sm group-hover:scale-[1.02] transition-transform">
                  <div className="rounded-[6px] border border-[#F5B82E] p-3.5 text-center space-y-1.5 bg-white">
                    <div className="flex justify-center">
                      <img
                        src="/eduhub-logo.png"
                        alt="EduHub logo"
                        onError={handleImageError}
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#5F5B75]">
                      Certificate of Completion
                    </p>
                    <p className="font-script text-[24px] text-[#3F2A9E] leading-none">
                      {user && cert.studentId === user.id
                        ? user.name
                        : cert.studentName}
                    </p>
                    <p className="font-display font-bold text-[12px] text-[#6D4AE0] truncate">
                      {cert.courseTitle}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[9px] text-[#5F5B75] border-t border-[#E6E1F5]">
                      <span>{cert.issuedAt}</span>
                      <span className="font-bold text-[#B45309]">{cert.verificationCode}</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Card Metadata & Actions (View, Download) */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <StatusChip
                      label={`Score: ${cert.scorePercent}% (${cert.grade})`}
                      variant="success"
                    />
                    <code className="text-[11px] font-bold text-[#6D4AE0] bg-[#FAF8FF] px-2 py-0.5 rounded border border-[#E6E1F5]">
                      {cert.verificationCode}
                    </code>
                  </div>
                  <h2 className="font-display font-bold text-[20px] text-[#1E1B2E] leading-snug">
                    {cert.courseTitle}
                  </h2>
                  <p className="text-[13px] text-[#5F5B75]">
                    Issued on <strong className="text-[#1E1B2E]">{cert.issuedAt}</strong> •
                    Instructor: {cert.instructorName}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E6E1F5] flex items-center gap-2">
                  <Link to={`/certificates/${cert.id}`} className="flex-1">
                    <Button variant="primary" size="sm" fullWidth>
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => navigate(`/certificates/${cert.id}?action=print`)}
                  >
                    Download
                  </Button>
                  <Link
                    to={`/verify/${cert.verificationCode}`}
                    title="Open public verification page"
                  >
                    <Button variant="ghost" size="sm" className="border border-[#E6E1F5]">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </article>
          ))}

          {/* Locked Certificate Card explaining what is missing for an in-progress course */}
          <article className="rounded-[12px] bg-[#FAF8FF] border-2 border-dashed border-[#E6E1F5] p-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="h-36 rounded-[10px] bg-white border border-[#E6E1F5] flex flex-col items-center justify-center p-4 text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <p className="font-display font-bold text-[15px] text-[#1E1B2E]">
                  Certificate locked
                </p>
                <p className="text-[11px] text-[#5F5B75]">
                  Issued only when lessons are 100% done and exam is passed
                </p>
              </div>

              <div className="space-y-1">
                <StatusChip label="In progress • 42% lessons" variant="warning" />
                <h3 className="font-display font-bold text-[19px] text-[#1E1B2E] pt-1">
                  {lockedCourse.title}
                </h3>
                <p className="text-[12px] text-[#5F5B75]">
                  Missing: Complete remaining 7 lessons (to reach 100%) and pass the final
                  exam (60%+).
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E6E1F5] flex items-center gap-2">
              <Link to={`/student/progress/${lockedCourse.id}`} className="flex-1">
                <Button variant="secondary" size="sm" fullWidth>
                  View requirements
                </Button>
              </Link>
              <Link to="/certificates/cert-101?view=locked">
                <Button variant="ghost" size="sm">
                  Locked details
                </Button>
              </Link>
            </div>
          </article>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PART B.4 — PUBLIC CERTIFICATE VERIFICATION PAGE (/verify/:id)
// Certificate ID input (prefilled from the URL), valid state (green check,
// holder, course, issue date, instructor) and invalid state (red, "Certificate not found").
// ============================================================================
export const VerifyCertificatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { certificates } = useApp();
  const { user } = useAuth();

  const [inputCode, setInputCode] = useState<string>(() =>
    id && id !== ':id' ? id : 'EDU-2026-000123'
  );
  const [queriedCode, setQueriedCode] = useState<string>(() =>
    id && id !== ':id' ? id : 'EDU-2026-000123'
  );

  useEffect(() => {
    if (id && id !== ':id') {
      setInputCode(id);
      setQueriedCode(id);
    }
  }, [id]);

  // Match against EDU-2026-000123, cert-101, or legacy EH-2025-UX94-SARA
  const matchedCert = useMemo(() => {
    const clean = queriedCode.trim().toLowerCase();
    if (!clean) return null;
    if (clean === 'eh-2025-ux94-sara') return certificates[0];
    return (
      certificates.find(
        (c) =>
          c.verificationCode.toLowerCase() === clean || c.id.toLowerCase() === clean
      ) || null
    );
  }, [certificates, queriedCode]);

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQueriedCode(inputCode);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      <Breadcrumbs items={[{ label: 'Verify certificate' }]} />

      <div className="max-w-2xl mx-auto rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrandLogo size="md" showText to="" />
          </div>
          <h1 className="text-[32px] sm:text-[38px] font-display font-bold text-[#1E1B2E]">
            Public certificate verification
          </h1>
          <p className="text-[15px] text-[#5F5B75]">
            Verify the authenticity of any EduHub graduate credential by entering its
            certificate ID below.
          </p>
        </div>

        {/* Search / Verify Input Form prefilled from URL */}
        <form onSubmit={handleVerifySubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#6D4AE0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter certificate ID (e.g. EDU-2026-000123)"
                aria-label="Certificate ID"
                className="w-full h-11 pl-10 pr-4 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] focus:border-[#6D4AE0] focus:bg-white focus:outline-none font-bold text-[15px] text-[#1E1B2E]"
              />
            </div>
            <Button type="submit" variant="primary" size="md">
              Verify credential
            </Button>
          </div>

          {/* Quick One-Click Test Chips for Valid and Invalid states */}
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-semibold text-[#5F5B75]">Quick test IDs:</span>
            <button
              type="button"
              onClick={() => {
                setInputCode('EDU-2026-000123');
                setQueriedCode('EDU-2026-000123');
              }}
              className="px-2.5 py-1 rounded-full bg-[#16A34A]/12 text-[#16A34A] font-bold hover:bg-[#16A34A]/20 cursor-pointer"
            >
              Valid: EDU-2026-000123
            </button>
            <button
              type="button"
              onClick={() => {
                setInputCode('EDU-2026-000124');
                setQueriedCode('EDU-2026-000124');
              }}
              className="px-2.5 py-1 rounded-full bg-[#F3EFFF] text-[#6D4AE0] font-bold hover:bg-[#E6E1F5] cursor-pointer"
            >
              Valid: EDU-2026-000124
            </button>
            <button
              type="button"
              onClick={() => {
                setInputCode('EDU-2026-999999');
                setQueriedCode('EDU-2026-999999');
              }}
              className="px-2.5 py-1 rounded-full bg-[#FEF2F2] text-[#DC2626] font-bold hover:bg-[#FEE2E2] cursor-pointer"
            >
              Invalid: EDU-2026-999999
            </button>
          </div>
        </form>

        {/* RESULT STATE 1: VALID STATE (Green check, holder, course, issue date, instructor) */}
        {matchedCert ? (
          <div
            className={`rounded-[12px] p-6 space-y-5 border-2 ${
              matchedCert.status === 'Revoked'
                ? 'bg-[#FEF2F2] border-[#DC2626]/40'
                : 'bg-[#16A34A]/6 border-[#16A34A]/35'
            }`}
          >
            <div
              className={`flex flex-col sm:flex-row items-center gap-4 border-b pb-4 ${
                matchedCert.status === 'Revoked'
                  ? 'border-[#DC2626]/20'
                  : 'border-[#16A34A]/20'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-full text-white flex items-center justify-center shrink-0 shadow-md ${
                  matchedCert.status === 'Revoked' ? 'bg-[#DC2626]' : 'bg-[#16A34A]'
                }`}
              >
                {matchedCert.status === 'Revoked' ? (
                  <XCircle className="w-8 h-8" />
                ) : (
                  <CheckCircle2 className="w-8 h-8" />
                )}
              </div>
              <div className="text-center sm:text-left flex-1">
                <StatusChip
                  label={
                    matchedCert.status === 'Revoked'
                      ? 'Revoked Credential'
                      : 'Valid & Active Credential'
                  }
                  variant={matchedCert.status === 'Revoked' ? 'danger' : 'success'}
                />
                <h2 className="text-[24px] font-display font-bold text-[#1E1B2E] mt-1">
                  {matchedCert.status === 'Revoked'
                    ? 'Certificate revoked'
                    : 'Certificate verified'}
                </h2>
                <p className="text-[13px] text-[#5F5B75]">
                  {matchedCert.status === 'Revoked'
                    ? 'This certificate has been revoked by an administrator and is no longer valid.'
                    : 'This certificate was officially issued by EduHub and is in good standing.'}
                </p>
              </div>
              <CatMascot
                size="sm"
                mood={matchedCert.status === 'Revoked' ? '404' : 'success'}
                className="hidden sm:block"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px]">
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E6E1F5]">
                <p className="text-[12px] text-[#5F5B75]">Certificate holder</p>
                <p className="font-display font-bold text-[20px] text-[#1E1B2E]">
                  {user && matchedCert.studentId === user.id
                    ? user.name
                    : matchedCert.studentName}
                </p>
              </div>
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E6E1F5]">
                <p className="text-[12px] text-[#5F5B75]">Certificate ID</p>
                <p className="font-display font-bold text-[18px] text-[#6D4AE0]">
                  {matchedCert.verificationCode}
                </p>
              </div>
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E6E1F5]">
                <p className="text-[12px] text-[#5F5B75]">Course completed</p>
                <p className="font-display font-bold text-[17px] text-[#1E1B2E]">
                  {matchedCert.courseTitle}
                </p>
              </div>
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E6E1F5]">
                <p className="text-[12px] text-[#5F5B75]">Issue date</p>
                <p className="font-bold text-[#1E1B2E] mt-0.5">{matchedCert.issuedAt}</p>
              </div>
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E6E1F5]">
                <p className="text-[12px] text-[#5F5B75]">Lead instructor</p>
                <p className="font-bold text-[#1E1B2E] mt-0.5">
                  {matchedCert.instructorName}
                </p>
              </div>
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E6E1F5]">
                <p className="text-[12px] text-[#5F5B75]">Final exam score</p>
                <p className="font-bold text-[#16A34A] mt-0.5">
                  {matchedCert.scorePercent}% ({matchedCert.grade})
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[12px] text-[#5F5B75] inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                Cryptographically signed by EduHub Academic Registry
              </span>
              <Link to={`/certificates/${matchedCert.id}`}>
                <Button variant="secondary" size="sm">
                  Open full certificate preview
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* RESULT STATE 2: INVALID STATE (Red, "Certificate not found") */
          <div className="rounded-[12px] bg-[#FEF2F2] border-2 border-[#DC2626]/40 p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#DC2626] text-white flex items-center justify-center mx-auto shadow-md">
              <XCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <StatusChip label="Invalid or unrecognized ID" variant="danger" />
              <h2 className="text-[26px] font-display font-bold text-[#DC2626] pt-1">
                Certificate not found
              </h2>
              <p className="text-[14px] text-[#5F5B75] max-w-md mx-auto">
                No valid EduHub credential matches{' '}
                <code className="px-2 py-0.5 rounded bg-white border border-[#DC2626]/30 text-[#DC2626] font-bold">
                  {queriedCode || '(empty)'}
                </code>
                . Please check the ID for typos or contact the certificate holder.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white"
                onClick={() => {
                  setInputCode('EDU-2026-000123');
                  setQueriedCode('EDU-2026-000123');
                }}
              >
                Test with valid ID (EDU-2026-000123)
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
