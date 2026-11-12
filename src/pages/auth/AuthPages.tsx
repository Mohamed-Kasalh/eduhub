import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router';
import {
  Mail,
  User,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Award,
  FileCheck2,
  GraduationCap,
  Presentation,
  RefreshCw,
  AlertCircle,
  Info,
  KeyRound,
} from 'lucide-react';
import {
  Button,
  TextInput,
  PasswordInput,
  OtpInput,
  StatusChip,
  PasswordStrengthChecklist,
  evaluatePassword,
  FormErrorSummary,
  FormErrorItem,
} from '../../components/ui';
import { BrandLogo, CatMascot } from '../../components/brand/BrandLogo';
import {
  useLoginMutation,
  useGoogleLoginMutation,
  useRegisterMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  getRoleDashboardPath,
} from '../../api/hooks/useAuth';
import { authService } from '../../api/services';
import { getErrorMessage, isApiError } from '../../api/errors';
import { mapApiFieldErrors, pickFieldError } from '../../lib/formErrors';
import type { UserRole } from '../../data/mockData';

function getSafeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return raw;
  }
  return null;
}

/**
 * Helper to mask an email address for OTP display (e.g., sara.ali@eduhub.com -> sa***@eduhub.com)
 */
function maskEmail(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 1) return trimmed || 'your email';
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);
  const visiblePrefix = local.slice(0, 2);
  return `${visiblePrefix}***${domain}`;
}

/**
 * Split Authentication Layout:
 * - Desktop: Left panel = purple gradient with official logo inside a white rounded card + 3 short benefits; Right = form card.
 * - Mobile: Shows only the form card with the official logo on top (on white surface).
 */
const AuthSplitLayout: React.FC<{
  children: React.ReactNode;
  badgeText?: string;
}> = ({ children, badgeText = 'Trusted by 15,000+ active learners' }) => {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 rounded-[12px] overflow-hidden border border-[#E6E1F5] shadow-purple-lg bg-white">
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#6D4AE0] via-[#5A3AC7] to-[#3F2A9E] p-10 text-white flex-col justify-between relative overflow-hidden">
          <div
            aria-hidden="true"
            className="w-64 h-64 rounded-full bg-white/5 border border-white/10 absolute -top-16 -right-16 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="w-48 h-48 rounded-full bg-white/5 border border-white/10 absolute -bottom-12 -left-12 pointer-events-none"
          />

          <div className="space-y-8 relative z-10">
            <div className="inline-block bg-white rounded-[12px] p-4 shadow-purple-lg border border-[#E6E1F5]">
              <BrandLogo size="md" showText to="/" />
            </div>

            <div className="space-y-3">
              <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-white text-[12px] font-semibold">
                {badgeText}
              </span>
              <h2 className="text-[32px] font-display font-bold text-white leading-tight">
                Learn at your pace. Finish with a certificate.
              </h2>
              <p className="text-[15px] text-white/85 leading-relaxed">
                One friendly workspace for HD video lessons, real-time progress tracking, and verified exams.
              </p>
            </div>

            <ul className="space-y-4 pt-2">
              {[
                {
                  icon: <BookOpen className="w-5 h-5 text-[#F5B82E]" />,
                  title: '120+ structured HD video courses',
                  desc: 'Hands-on syllabi in development, design, data science, and security.',
                },
                {
                  icon: <FileCheck2 className="w-5 h-5 text-[#A78BFA]" />,
                  title: 'Interactive exams & progress tracking',
                  desc: 'Measure your mastery after every module with instant feedback.',
                },
                {
                  icon: <Award className="w-5 h-5 text-[#16A34A]" />,
                  title: 'Verified shareable certificates',
                  desc: 'Every graduate credential includes a unique public verification ID.',
                },
              ].map((b) => (
                <li
                  key={b.title}
                  className="flex items-start gap-3.5 p-3.5 rounded-[12px] bg-white/10 border border-white/15 backdrop-blur-xs"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-white flex items-center justify-center shrink-0 mt-0.5">
                    {b.icon}
                  </div>
                  <div>
                    <p className="font-display font-bold text-[16px] text-white leading-snug">
                      {b.title}
                    </p>
                    <p className="text-[13px] text-white/80 mt-0.5">{b.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-8 border-t border-white/15 text-[13px] text-white/75 flex items-center justify-between relative z-10">
            <span>15,000+ active learners</span>
            <span>4.8 ★ average rating</span>
          </div>
        </div>

        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          <div className="lg:hidden flex justify-center pb-6 mb-6 border-b border-[#E6E1F5]">
            <BrandLogo size="md" chip showText to="/" />
          </div>
          <div className="w-full max-w-md mx-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * 1. LOGIN PAGE (/login)
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));

  const loginMutation = useLoginMutation();
  const googleLoginMutation = useGoogleLoginMutation();

  const [email, setEmail] = useState('sara.ali@eduhub.com');
  const [password, setPassword] = useState('EduHub#2025');
  const [rememberMe, setRememberMe] = useState(true);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authBannerError, setAuthBannerError] = useState('');
  const [summaryErrors, setSummaryErrors] = useState<FormErrorItem[]>([]);
  const [summaryKey, setSummaryKey] = useState(0);

  const isBusy = loginMutation.isPending || googleLoginMutation.isPending;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    const trimmedEmail = email.trim();
    const localSummary: FormErrorItem[] = [];
    let nextEmailErr = '';
    let nextPwErr = '';

    if (!trimmedEmail) {
      nextEmailErr = 'Email address is required. Enter your registered EduHub email.';
      localSummary.push({ field: 'Email address', message: nextEmailErr, targetId: 'login-email' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextEmailErr = 'Enter a valid email address such as sara.ali@eduhub.com.';
      localSummary.push({ field: 'Email address', message: nextEmailErr, targetId: 'login-email' });
    }

    if (!password) {
      nextPwErr = 'Password is required to log in to your account.';
      localSummary.push({ field: 'Password', message: nextPwErr, targetId: 'login-password' });
    }

    setEmailError(nextEmailErr);
    setPasswordError(nextPwErr);
    setAuthBannerError('');

    if (localSummary.length > 0) {
      setSummaryErrors(localSummary);
      setSummaryKey((k) => k + 1);
      return;
    }

    setSummaryErrors([]);
    try {
      const session = await loginMutation.mutateAsync({
        email: trimmedEmail,
        password,
        rememberMe,
      });
      navigate(returnTo || getRoleDashboardPath(session.user.role), { replace: true });
    } catch (err) {
      const mapped = mapApiFieldErrors(err, [
        { key: 'email', label: 'Email address', targetId: 'login-email' },
        { key: 'password', label: 'Password', targetId: 'login-password' },
      ]);
      if (mapped.fieldMap.email) setEmailError(mapped.fieldMap.email);
      if (mapped.fieldMap.password) setPasswordError(mapped.fieldMap.password);
      if (mapped.summaryItems.length > 0) {
        setSummaryErrors(mapped.summaryItems);
        setSummaryKey((k) => k + 1);
      } else {
        setAuthBannerError(mapped.topMessage);
      }
    }
  };

  const handleGoogleLogin = async () => {
    if (isBusy) return;
    setAuthBannerError('');
    try {
      const session = await googleLoginMutation.mutateAsync({
        email: email.trim() || undefined,
      });
      navigate(returnTo || getRoleDashboardPath(session.user.role), { replace: true });
    } catch (err) {
      setAuthBannerError(getErrorMessage(err, 'Google sign-in could not be completed.'));
    }
  };

  return (
    <AuthSplitLayout badgeText="Welcome back to EduHub">
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-[32px] font-display font-bold text-[#1E1B2E]">
            Log in to your account
          </h1>
          <p className="text-[14px] text-[#5F5B75]">
            Enter your credentials to access your courses, progress, and certificates.
          </p>
        </div>

        <div className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-2">
          <p className="text-[12px] font-semibold text-[#5F5B75]">
            Click a seeded account email to sign in (password <code className="text-[#3F2A9E]">EduHub#2025</code>):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Student', email: 'sara.ali@eduhub.com' },
              { label: 'Instructor', email: 'ahmed.instructor@eduhub.com' },
              { label: 'Admin', email: 'nour.admin@eduhub.com' },
              { label: 'Supervisor', email: 'hana.supervisor@eduhub.com' },
            ].map((demo) => (
              <button
                key={demo.label}
                type="button"
                onClick={() => {
                  setEmail(demo.email);
                  setEmailError('');
                  setAuthBannerError('');
                }}
                className={`px-2.5 py-1 rounded-[8px] text-[12px] font-semibold border transition-all cursor-pointer ${
                  email === demo.email
                    ? 'bg-[#F3EFFF] border-[#6D4AE0] text-[#6D4AE0]'
                    : 'bg-white border-[#E6E1F5] text-[#1E1B2E] hover:border-[#A78BFA]'
                }`}
              >
                {demo.label}: {demo.email}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={(e) => void handleLogin(e)} noValidate className="space-y-4">
          <FormErrorSummary errors={summaryErrors} summaryKey={summaryKey} />

          {authBannerError && (
            <div
              role="alert"
              className="rounded-[10px] bg-[#FEF2F2] border border-[#DC2626]/30 p-3 flex items-start gap-2.5 text-[13px] text-[#DC2626]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authBannerError}</span>
            </div>
          )}

          <TextInput
            id="login-email"
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
              if (authBannerError) setAuthBannerError('');
            }}
            placeholder="you@eduhub.com"
            leftIcon={<Mail className="w-4 h-4" />}
            errorText={emailError}
            required
          />

          <PasswordInput
            id="login-password"
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
              if (authBannerError) setAuthBannerError('');
            }}
            errorText={passwordError}
            required
          />

          <div className="flex items-center justify-between text-[14px]">
            <label className="inline-flex items-center gap-2 text-[#5F5B75] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="font-semibold text-[#6D4AE0] hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="md"
            loading={loginMutation.isPending}
            disabled={isBusy}
          >
            Log in
          </Button>

          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-[#E6E1F5] w-full" />
            <span className="bg-white px-3 text-[12px] text-[#5F5B75] font-medium shrink-0">
              or continue with
            </span>
            <div className="border-t border-[#E6E1F5] w-full" />
          </div>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            size="md"
            loading={googleLoginMutation.isPending}
            disabled={isBusy}
            onClick={() => void handleGoogleLogin()}
            className="bg-white hover:bg-[#FAF8FF]"
            leftIcon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
            }
          >
            Continue with Google
          </Button>
        </form>

        <p className="text-center text-[14px] text-[#5F5B75] pt-2 border-t border-[#E6E1F5]">
          Don’t have an account?{' '}
          <Link
            to={returnTo ? `/signup?returnTo=${encodeURIComponent(returnTo)}` : '/signup'}
            className="font-bold text-[#6D4AE0] hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
};

/**
 * 2. SIGN UP PAGE (/signup)
 */
export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole =
    searchParams.get('role') === 'instructor' ? 'instructor' : 'student';
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));

  const registerMutation = useRegisterMutation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'student' | 'instructor'>(initialRole);
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    form?: string;
  }>({});
  const [summaryKey, setSummaryKey] = useState(0);

  const errorSummaryItems: FormErrorItem[] = [
    ...(errors.name ? [{ field: 'Full name', message: errors.name, targetId: 'signup-name' }] : []),
    ...(errors.email ? [{ field: 'Email address', message: errors.email, targetId: 'signup-email' }] : []),
    ...(errors.password ? [{ field: 'Password', message: errors.password, targetId: 'signup-password' }] : []),
    ...(errors.confirmPassword
      ? [{ field: 'Confirm password', message: errors.confirmPassword, targetId: 'signup-confirm-password' }]
      : []),
    ...(errors.terms ? [{ field: 'Terms of Service', message: errors.terms, targetId: 'signup-terms' }] : []),
    ...(errors.form ? [{ field: 'Account', message: errors.form }] : []),
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerMutation.isPending) return;

    const nextErrors: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) {
      nextErrors.name = 'Enter your full name (at least 2 characters) as it should appear on certificates.';
    }
    if (!email.trim()) {
      nextErrors.email = 'Email address is required so we can send your verification code.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address such as sara.ali@eduhub.com.';
    }

    const pwEval = evaluatePassword(password);
    if (!password) {
      nextErrors.password = 'Create a password that meets the security rules below.';
    } else if (!pwEval.isStrongEnough) {
      nextErrors.password =
        'Password is too weak. Include at least 8 characters and meet uppercase, number, and symbol rules.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your password to make sure there are no typos.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match. Re-enter the exact same password.';
    }

    if (!agreedTerms) {
      nextErrors.terms = 'Accept the Terms of Service and Privacy Policy to create your account.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSummaryKey((k) => k + 1);
      return;
    }

    try {
      const res = await registerMutation.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password,
        role: selectedRole,
      });

      const params = new URLSearchParams({ email: res.email });
      if (returnTo) params.set('returnTo', returnTo);

      navigate(`/verify-otp?${params.toString()}`, {
        state: {
          email: res.email,
          role: selectedRole,
          returnTo,
          cooldownSeconds: res.resendAvailableAfterSeconds,
        },
      });
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        setErrors({ email: err.message });
        setSummaryKey((k) => k + 1);
        return;
      }
      const mapped = mapApiFieldErrors(err, [
        { key: 'name', label: 'Full name', targetId: 'signup-name' },
        { key: 'email', label: 'Email address', targetId: 'signup-email' },
        { key: 'password', label: 'Password', targetId: 'signup-password' },
      ]);
      setErrors({
        name: mapped.fieldMap.name,
        email: mapped.fieldMap.email,
        password: mapped.fieldMap.password,
        form:
          Object.keys(mapped.fieldMap).length === 0 ? mapped.topMessage : undefined,
      });
      setSummaryKey((k) => k + 1);
    }
  };

  return (
    <AuthSplitLayout badgeText="Join 15,000+ learners and mentors">
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-[32px] font-display font-bold text-[#1E1B2E]">
            Create your account
          </h1>
          <p className="text-[14px] text-[#5F5B75]">
            Start learning at your pace or teaching courses on EduHub.
          </p>
        </div>

        <form onSubmit={(e) => void handleSignup(e)} noValidate className="space-y-4">
          <FormErrorSummary errors={errorSummaryItems} summaryKey={summaryKey} />

          <TextInput
            id="signup-name"
            label="Full name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Sara Ali"
            leftIcon={<User className="w-4 h-4" />}
            errorText={errors.name}
            required
          />

          <TextInput
            id="signup-email"
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="sara.ali@eduhub.com"
            leftIcon={<Mail className="w-4 h-4" />}
            errorText={errors.email}
            required
          />

          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-[#1E1B2E] block">
              Choose your account role <span className="text-[#DC2626]">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  {
                    id: 'student',
                    title: 'Student',
                    desc: 'Watch lessons, pass exams, and earn certificates.',
                    icon: <GraduationCap className="w-5 h-5" />,
                  },
                  {
                    id: 'instructor',
                    title: 'Instructor',
                    desc: 'Create courses, question banks, and mentor learners.',
                    icon: <Presentation className="w-5 h-5" />,
                  },
                ] as const
              ).map((roleOption) => {
                const selected = selectedRole === roleOption.id;
                return (
                  <button
                    key={roleOption.id}
                    type="button"
                    onClick={() => setSelectedRole(roleOption.id)}
                    className={`p-3.5 rounded-[12px] border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      selected
                        ? 'bg-[#F3EFFF] border-[#6D4AE0] ring-2 ring-[#A78BFA]/40 shadow-purple-sm'
                        : 'bg-white border-[#E6E1F5] hover:border-[#A78BFA] hover:bg-[#FAF8FF]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                        selected
                          ? 'bg-[#6D4AE0] text-white'
                          : 'bg-[#F3EFFF] text-[#6D4AE0]'
                      }`}
                    >
                      {roleOption.icon}
                    </div>
                    <div>
                      <p className="font-display font-bold text-[16px] text-[#1E1B2E]">
                        {roleOption.title}
                      </p>
                      <p className="text-[12px] text-[#5F5B75] leading-snug mt-0.5">
                        {roleOption.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-[#5F5B75] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#6D4AE0] shrink-0" />
              <span>Admin and Supervisor accounts are created by an Admin.</span>
            </p>
          </div>

          <PasswordInput
            id="signup-password"
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="Create a strong password"
            errorText={errors.password}
            required
          />

          <PasswordStrengthChecklist password={password} />

          <PasswordInput
            id="signup-confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) {
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }
            }}
            placeholder="Re-enter your password"
            errorText={errors.confirmPassword}
            required
          />

          <div className="space-y-1">
            <label className="flex items-start gap-2.5 text-[14px] text-[#5F5B75] cursor-pointer select-none">
              <input
                id="signup-terms"
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => {
                  setAgreedTerms(e.target.checked);
                  if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                }}
                className="accent-[#6D4AE0] w-4 h-4 rounded mt-1 cursor-pointer shrink-0"
              />
              <span>
                I agree to the EduHub{' '}
                <span className="font-semibold text-[#6D4AE0]">Terms of Service</span> and{' '}
                <span className="font-semibold text-[#6D4AE0]">Privacy Policy</span>.
              </span>
            </label>
            {errors.terms && (
              <p className="text-[12px] text-[#DC2626] font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.terms}</span>
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="md"
            loading={registerMutation.isPending}
            disabled={registerMutation.isPending}
          >
            Create account
          </Button>
        </form>

        <p className="text-center text-[14px] text-[#5F5B75] pt-2 border-t border-[#E6E1F5]">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-[#6D4AE0] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
};

/**
 * 3. OTP VERIFICATION PAGE (/verify-otp)
 */
export const VerifyOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const stateData =
    (location.state as {
      email?: string;
      role?: UserRole;
      returnTo?: string | null;
      cooldownSeconds?: number;
    } | null) || null;

  const initialEmail =
    searchParams.get('email') || stateData?.email || 'sara.ali@eduhub.com';
  const returnTo = getSafeReturnTo(searchParams.get('returnTo') ?? stateData?.returnTo);

  const verifyOtpMutation = useVerifyOtpMutation();
  const resendOtpMutation = useResendOtpMutation();

  const [emailInput, setEmailInput] = useState(initialEmail);
  const [otp, setOtp] = useState<string[]>(['1', '2', '3', '4', '5', '6']);
  const [countdown, setCountdown] = useState<number>(stateData?.cooldownSeconds ?? 60);
  const [errorText, setErrorText] = useState<string>('');
  const [shake, setShake] = useState<boolean>(false);
  const [verifiedRole, setVerifiedRole] = useState<Exclude<UserRole, 'guest'> | null>(null);
  const redirectTimerRef = useRef<number | null>(null);

  const masked = maskEmail(emailInput);

  useEffect(() => {
    if (verifiedRole || countdown <= 0) return;
    const timer = window.setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown, verifiedRole]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const triggerWrongCodeError = (msg: string) => {
    setErrorText(msg);
    setShake(true);
    window.setTimeout(() => setShake(false), 500);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyOtpMutation.isPending) return;

    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail) {
      triggerWrongCodeError('Enter the email address you registered with.');
      return;
    }

    const joined = otp.join('');
    if (joined.length < 6) {
      triggerWrongCodeError(
        'Enter all 6 digits from your verification email before verifying.'
      );
      return;
    }

    setErrorText('');
    try {
      const session = await verifyOtpMutation.mutateAsync({
        email: trimmedEmail,
        code: joined,
      });
      setVerifiedRole(session.user.role);
      const targetPath = returnTo || getRoleDashboardPath(session.user.role);
      redirectTimerRef.current = window.setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 1200);
    } catch (err) {
      if (isApiError(err)) {
        triggerWrongCodeError(
          pickFieldError(err.fieldErrors, 'code', 'email') || err.message
        );
      } else {
        triggerWrongCodeError('Verification failed. Please check your 6-digit code.');
      }
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0 || resendOtpMutation.isPending) return;
    try {
      const res = await resendOtpMutation.mutateAsync({ email: emailInput.trim() });
      setCountdown(res.resendAvailableAfterSeconds || 60);
      setErrorText('');
    } catch (err) {
      setErrorText(getErrorMessage(err, 'Unable to resend code yet.'));
    }
  };

  if (verifiedRole) {
    const targetPath = returnTo || getRoleDashboardPath(verifiedRole);
    return (
      <AuthSplitLayout badgeText="Account security verified">
        <div className="text-center space-y-5 flex flex-col items-center py-4">
          <div className="relative">
            <CatMascot size="lg" mood="success" />
            <span className="w-9 h-9 rounded-full bg-[#16A34A] text-white flex items-center justify-center absolute -bottom-1 -right-1 border-3 border-white shadow-md animate-bounce">
              <CheckCircle2 className="w-5 h-5" />
            </span>
          </div>

          <StatusChip label="Account verified" variant="success" />

          <h1 className="text-[32px] font-display font-bold text-[#1E1B2E]">
            Verification complete!
          </h1>
          <p className="text-[15px] text-[#5F5B75]">
            Your email <strong className="text-[#1E1B2E]">{masked}</strong> is confirmed. Taking you to your {verifiedRole} dashboard now...
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate(targetPath, { replace: true })}
          >
            Go to my dashboard now
          </Button>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout badgeText="Two-step email verification">
      <div className="space-y-6">
        <Link
          to="/signup"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#5F5B75] hover:text-[#6D4AE0]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to sign up</span>
        </Link>

        <div className="space-y-2">
          <StatusChip label="Step 2 of 2 • Verify email" variant="primary" />
          <h1 className="text-[32px] font-display font-bold text-[#1E1B2E]">
            Enter your 6-digit code
          </h1>
          <p className="text-[14px] text-[#5F5B75]">
            We sent a 6-digit verification code to{' '}
            <strong className="text-[#1E1B2E]">{masked}</strong>. Paste or type the digits below.
          </p>
        </div>

        <div className="p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <span className="text-[#5F5B75] font-medium">Demo OTP tester:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setOtp(['1', '2', '3', '4', '5', '6']);
                setErrorText('');
              }}
              className="px-2.5 py-1 rounded-[8px] bg-white border border-[#E6E1F5] hover:border-[#16A34A] text-[#16A34A] font-semibold cursor-pointer"
            >
              Fill valid (123456)
            </button>
            <button
              type="button"
              onClick={() => {
                setOtp(['0', '0', '0', '0', '0', '0']);
                setErrorText('');
              }}
              className="px-2.5 py-1 rounded-[8px] bg-white border border-[#E6E1F5] hover:border-[#DC2626] text-[#DC2626] font-semibold cursor-pointer"
            >
              Fill invalid (000000)
            </button>
          </div>
        </div>

        <form onSubmit={(e) => void handleVerify(e)} className="space-y-5">
          {!searchParams.get('email') && !stateData?.email && (
            <TextInput
              id="otp-email"
              label="Account email"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />
          )}

          <OtpInput
            label="6-digit verification code"
            value={otp}
            onChange={(next) => {
              setOtp(next);
              if (errorText) setErrorText('');
            }}
            autoFocusFirst
            shake={shake}
            errorText={errorText}
            helperText="Supports full 6-digit clipboard paste and Backspace navigation."
          />

          <div className="flex items-center justify-between text-[14px]">
            <span className="text-[#5F5B75]">Didn’t receive the email?</span>
            {countdown > 0 ? (
              <span className="font-semibold text-[#5F5B75]">
                Resend code in 0:{String(countdown).padStart(2, '0')}s
              </span>
            ) : (
              <button
                type="button"
                disabled={resendOtpMutation.isPending}
                onClick={() => void handleResendCode()}
                className="font-bold text-[#6D4AE0] hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Resend code now</span>
              </button>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="md"
            loading={verifyOtpMutation.isPending}
            disabled={verifyOtpMutation.isPending}
          >
            Verify
          </Button>
        </form>
      </div>
    </AuthSplitLayout>
  );
};

/**
 * 4. FORGOT PASSWORD PAGE (/forgot-password)
 */
export const ForgotPasswordPage: React.FC = () => {
  const forgotMutation = useForgotPasswordMutation();
  const [email, setEmail] = useState('sara.ali@eduhub.com');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotMutation.isPending) return;

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter the email address linked to your EduHub account.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address such as sara.ali@eduhub.com.');
      return;
    }

    setError('');
    try {
      await forgotMutation.mutateAsync({ email: trimmed });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send recovery email.'));
    }
  };

  const handleResend = async () => {
    if (forgotMutation.isPending) return;
    try {
      await forgotMutation.mutateAsync({ email: email.trim() });
    } catch {
      // Handled by mutation onError toast.
    }
  };

  if (sent) {
    const resetLink = `/reset-password?email=${encodeURIComponent(email.trim())}&code=123456`;
    return (
      <AuthSplitLayout badgeText="Account recovery">
        <div className="space-y-6 text-center flex flex-col items-center py-4">
          <CatMascot size="lg" mood="success" />
          <StatusChip label="Recovery email sent" variant="success" />
          <div className="space-y-2">
            <h1 className="text-[32px] font-display font-bold text-[#1E1B2E]">
              Check your email
            </h1>
            <p className="text-[15px] text-[#5F5B75]">
              We sent a password reset code to{' '}
              <strong className="text-[#1E1B2E]">{email.trim()}</strong>. The code expires in 15 minutes.
            </p>
          </div>

          <div className="w-full space-y-3 pt-2">
            <Link to={resetLink} className="block">
              <Button variant="primary" fullWidth>
                Open reset password screen
              </Button>
            </Link>
            <Button
              variant="secondary"
              fullWidth
              loading={forgotMutation.isPending}
              onClick={() => void handleResend()}
            >
              Resend email
            </Button>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#6D4AE0] hover:underline pt-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to login</span>
          </Link>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout badgeText="Password recovery">
      <div className="space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#5F5B75] hover:text-[#6D4AE0]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to login</span>
        </Link>

        <div className="space-y-2">
          <h1 className="text-[32px] font-display font-bold text-[#1E1B2E]">
            Forgot your password?
          </h1>
          <p className="text-[14px] text-[#5F5B75]">
            Enter the email associated with your EduHub account and we will send you a code to reset your password.
          </p>
        </div>

        <form onSubmit={(e) => void handleSend(e)} noValidate className="space-y-4">
          <TextInput
            id="forgot-email"
            label="Registered email address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            placeholder="sara.ali@eduhub.com"
            leftIcon={<Mail className="w-4 h-4" />}
            errorText={error}
            required
          />
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={forgotMutation.isPending}
            disabled={forgotMutation.isPending}
          >
            Send recovery link
          </Button>
        </form>
      </div>
    </AuthSplitLayout>
  );
};

/**
 * 5. RESET PASSWORD PAGE (/reset-password)
 */
export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const resetMutation = useResetPasswordMutation();

  const [email, setEmail] = useState(
    () => searchParams.get('email') || 'sara.ali@eduhub.com'
  );
  const [code, setCode] = useState(() => searchParams.get('code') || '123456');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    code?: string;
    password?: string;
    confirmPassword?: string;
    token?: string;
  }>({});
  const [summaryKey, setSummaryKey] = useState(0);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    const queryCode = searchParams.get('code');
    const queryEmail = searchParams.get('email');
    if (!queryCode) return;

    const controller = new AbortController();
    authService
      .validateResetToken({ email: queryEmail || undefined, code: queryCode })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setErrors((prev) => ({
            ...prev,
            token: getErrorMessage(err, 'Reset link has expired or is invalid.'),
          }));
        }
      });

    return () => controller.abort();
  }, [searchParams]);

  const errorSummaryItems: FormErrorItem[] = [
    ...(errors.token ? [{ field: 'Reset link', message: errors.token }] : []),
    ...(errors.email ? [{ field: 'Email address', message: errors.email, targetId: 'reset-email' }] : []),
    ...(errors.code ? [{ field: 'Reset code', message: errors.code, targetId: 'reset-code' }] : []),
    ...(errors.password ? [{ field: 'New password', message: errors.password, targetId: 'reset-password' }] : []),
    ...(errors.confirmPassword
      ? [{ field: 'Confirm new password', message: errors.confirmPassword, targetId: 'reset-confirm' }]
      : []),
  ];

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetMutation.isPending) return;

    const nextErrors: typeof errors = {};
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid registered email address.';
    }
    if (!/^\d{6}$/.test(code.trim())) {
      nextErrors.code = 'Enter the 6-digit recovery code sent to your email.';
    }

    const pwEval = evaluatePassword(password);
    if (!password) {
      nextErrors.password = 'Enter a new password for your account.';
    } else if (!pwEval.isStrongEnough) {
      nextErrors.password =
        'Password is too weak. Use at least 8 characters and satisfy uppercase, number, and symbol rules.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Re-enter your new password to confirm.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match. Make sure both fields are identical.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSummaryKey((k) => k + 1);
      return;
    }

    try {
      await resetMutation.mutateAsync({
        email: email.trim(),
        code: code.trim(),
        newPassword: password,
      });
      setUpdated(true);
    } catch (err) {
      const mapped = mapApiFieldErrors(err, [
        { key: 'email', label: 'Email address', targetId: 'reset-email' },
        { key: 'code', label: 'Reset code', targetId: 'reset-code' },
        { key: 'newPassword', label: 'New password', targetId: 'reset-password' },
      ]);
      setErrors({
        email: mapped.fieldMap.email,
        code: mapped.fieldMap.code,
        password: mapped.fieldMap.newPassword,
        token:
          Object.keys(mapped.fieldMap).length === 0 ? mapped.topMessage : undefined,
      });
      setSummaryKey((k) => k + 1);
    }
  };

  if (updated) {
    return (
      <AuthSplitLayout badgeText="Security credentials updated">
        <div className="space-y-5 text-center flex flex-col items-center py-4">
          <div className="relative">
            <CatMascot size="lg" mood="success" />
            <span className="w-9 h-9 rounded-full bg-[#16A34A] text-white flex items-center justify-center absolute -bottom-1 -right-1 border-3 border-white shadow-md">
              <CheckCircle2 className="w-5 h-5" />
            </span>
          </div>
          <StatusChip label="All set" variant="success" />
          <h1 className="text-[32px] font-display font-bold text-[#1E1B2E]">
            Password updated
          </h1>
          <p className="text-[15px] text-[#5F5B75]">
            Your new password is active. You can now log in to your EduHub account.
          </p>
          <Link to="/login" className="w-full pt-2">
            <Button variant="primary" fullWidth size="md">
              Log in
            </Button>
          </Link>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout badgeText="Reset your password">
      <div className="space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#5F5B75] hover:text-[#6D4AE0]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to login</span>
        </Link>

        <div className="space-y-2">
          <h1 className="text-[32px] font-display font-bold text-[#1E1B2E]">
            Choose a new password
          </h1>
          <p className="text-[14px] text-[#5F5B75]">
            Create a strong password that you have not used before on EduHub.
          </p>
        </div>

        <form onSubmit={(e) => void handleReset(e)} noValidate className="space-y-4">
          <FormErrorSummary errors={errorSummaryItems} summaryKey={summaryKey} />

          <TextInput
            id="reset-email"
            label="Account email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
            }}
            leftIcon={<Mail className="w-4 h-4" />}
            errorText={errors.email}
            required
          />

          <TextInput
            id="reset-code"
            label="6-digit recovery code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (errors.code) setErrors((p) => ({ ...p, code: undefined }));
            }}
            leftIcon={<KeyRound className="w-4 h-4" />}
            errorText={errors.code}
            required
          />

          <PasswordInput
            id="reset-password"
            label="New password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
            }}
            placeholder="Enter new password"
            errorText={errors.password}
            required
          />

          <PasswordStrengthChecklist password={password} />

          <PasswordInput
            id="reset-confirm"
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: undefined }));
            }}
            placeholder="Re-enter new password"
            errorText={errors.confirmPassword}
            required
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={resetMutation.isPending}
            disabled={resetMutation.isPending}
          >
            Save new password
          </Button>
        </form>
      </div>
    </AuthSplitLayout>
  );
};
