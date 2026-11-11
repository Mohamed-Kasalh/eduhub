import React, { useState, useEffect } from 'react';
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
import { useApp, getRoleDashboardPath } from '../../context/AppContext';
import { UserRole } from '../../data/mockData';

/**
 * Helper to mask an email address for OTP display (e.g., sara.ali@eduhub.com -> sa***@eduhub.com)
 */
function maskEmail(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 1) return 'sa***@eduhub.com';
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
        {/* Left Panel: Purple Gradient (Hidden on Mobile, Visible on Desktop lg+) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#6D4AE0] via-[#5A3AC7] to-[#3F2A9E] p-10 text-white flex-col justify-between relative overflow-hidden">
          {/* Decorative subtle circles */}
          <div
            aria-hidden="true"
            className="w-64 h-64 rounded-full bg-white/5 border border-white/10 absolute -top-16 -right-16 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="w-48 h-48 rounded-full bg-white/5 border border-white/10 absolute -bottom-12 -left-12 pointer-events-none"
          />

          <div className="space-y-8 relative z-10">
            {/* Official logo strictly inside a white rounded card, never directly on purple */}
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

            {/* 3 Short Benefits */}
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

        {/* Right Panel: Form Card (On mobile shows only the form with the logo on top on a white surface) */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          {/* Mobile Logo on top on white surface */}
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
 * - Email, password (show/hide), Remember me, "Forgot password?", "Log in" button, "Continue with Google" button, link to Sign up.
 * - Demo redirect by role: email containing "admin" -> Admin, "instructor" -> Instructor, "supervisor" -> Supervisor, anything else -> Student.
 */
export const LoginPage: React.FC = () => {
  const { setRole, profiles, addToast } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('sara.ali@eduhub.com');
  const [password, setPassword] = useState('EduHub#2025');
  const [rememberMe, setRememberMe] = useState(true);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const resolveRoleFromEmail = (rawEmail: string): Exclude<UserRole, 'guest'> => {
    const lower = rawEmail.toLowerCase();
    if (lower.includes('admin')) return 'admin';
    if (lower.includes('instructor')) return 'instructor';
    if (lower.includes('supervisor')) return 'supervisor';
    return 'student';
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Email address is required. Enter your registered EduHub email.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Enter a valid email address such as sara.ali@eduhub.com.');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Password is required to sign in to your account.');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!valid) return;

    setLoading(true);
    const targetRole = resolveRoleFromEmail(trimmedEmail);
    setTimeout(() => {
      setLoading(false);
      setRole(targetRole);
      addToast({
        title: `Welcome back, ${profiles[targetRole].name}!`,
        message: `Signed in as ${targetRole} (${trimmedEmail}).`,
        variant: 'success',
      });
      navigate(getRoleDashboardPath(targetRole));
    }, 550);
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    const targetRole = resolveRoleFromEmail(email);
    setTimeout(() => {
      setGoogleLoading(false);
      setRole(targetRole);
      addToast({
        title: 'Connected with Google',
        message: `Signed in to your ${targetRole} workspace.`,
        variant: 'success',
      });
      navigate(getRoleDashboardPath(targetRole));
    }, 500);
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

        {/* Demo email-based role redirect helper */}
        <div className="p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] space-y-2">
          <p className="text-[12px] font-semibold text-[#5F5B75]">
            Click a demo email to test role-based redirect:
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

        <form onSubmit={handleLogin} noValidate className="space-y-4">
          <TextInput
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            placeholder="you@eduhub.com"
            leftIcon={<Mail className="w-4 h-4" />}
            errorText={emailError}
            helperText="Tip: emails with 'admin', 'instructor', or 'supervisor' route to that role."
            required
          />

          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
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

          <Button type="submit" variant="primary" fullWidth size="md" loading={loading}>
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
            loading={googleLoading}
            onClick={handleGoogleLogin}
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
          <Link to="/signup" className="font-bold text-[#6D4AE0] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
};

/**
 * 2. SIGN UP PAGE (/signup)
 * - Full name, email, password with strength meter & rules checklist (8+ chars, uppercase, number, symbol),
 *   confirm password, role cards (Student or Instructor only; Admin & Supervisor accounts are created by an Admin),
 *   terms checkbox, "Create account" leads to OTP (/verify-otp).
 */
export const SignupPage: React.FC = () => {
  const { addToast } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole =
    searchParams.get('role') === 'instructor' ? 'instructor' : 'student';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'student' | 'instructor'>(initialRole);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
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
  ];

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
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
        'Password is too weak. Include at least 8 characters and meet at least 3 of the 4 rules.';
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

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addToast({
        title: 'Verification code sent',
        message: `We sent a 6-digit code to ${email.trim()}.`,
        variant: 'success',
      });
      navigate('/verify-otp', {
        state: {
          email: email.trim(),
          role: selectedRole,
          name: name.trim(),
        },
      });
    }, 550);
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

        <form onSubmit={handleSignup} noValidate className="space-y-4">
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

          {/* Role Selection Cards: Student or Instructor only */}
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

          {/* Live Password Strength Meter & 4 Rules Checklist */}
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

          {/* Terms Checkbox */}
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

          <Button type="submit" variant="primary" fullWidth size="md" loading={loading}>
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
 * - 6 digit boxes (auto-focus, paste support, backspace goes back),
 *   masked email, 60s resend countdown, "Verify" button,
 *   wrong-code error (shake + red border + message),
 *   success (check animation + cat mascot then redirect).
 */
export const VerifyOtpPage: React.FC = () => {
  const { setRole, profiles, addToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = (location.state as { email?: string; role?: UserRole } | null) || null;

  const rawEmail = stateData?.email || profiles.student.email;
  const targetRole: Exclude<UserRole, 'guest'> =
    stateData?.role && stateData.role !== 'guest' ? stateData.role : 'student';
  const masked = maskEmail(rawEmail);

  const [otp, setOtp] = useState<string[]>(['4', '8', '2', '9', '1', '0']);
  const [countdown, setCountdown] = useState<number>(60);
  const [errorText, setErrorText] = useState<string>('');
  const [shake, setShake] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (verified || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, verified]);

  const triggerWrongCodeError = (msg: string) => {
    setErrorText(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const joined = otp.join('');
    if (joined.length < 6) {
      triggerWrongCodeError(
        'Enter all 6 digits from your verification email before verifying.'
      );
      return;
    }
    if (joined === '000000' || joined === '111111') {
      triggerWrongCodeError(
        'That verification code is invalid or expired. Enter 482910 or request a new code.'
      );
      return;
    }

    setErrorText('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setVerified(true);
      setRole(targetRole);
      addToast({
        title: 'Email verified!',
        message: `Redirecting you to your ${targetRole} dashboard...`,
        variant: 'success',
      });
      setTimeout(() => {
        navigate(getRoleDashboardPath(targetRole));
      }, 1800);
    }, 550);
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    setCountdown(60);
    setErrorText('');
    setOtp(['4', '8', '2', '9', '1', '0']);
    addToast({
      title: 'New 6-digit code sent',
      message: `Sent a fresh verification code to ${masked}.`,
      variant: 'info',
    });
  };

  if (verified) {
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
            Your email <strong className="text-[#1E1B2E]">{masked}</strong> is confirmed. Taking you to your {targetRole} dashboard now...
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate(getRoleDashboardPath(targetRole))}
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

        {/* Quick test helpers for valid vs wrong code shake */}
        <div className="p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <span className="text-[#5F5B75] font-medium">Demo OTP tester:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setOtp(['4', '8', '2', '9', '1', '0']);
                setErrorText('');
              }}
              className="px-2.5 py-1 rounded-[8px] bg-white border border-[#E6E1F5] hover:border-[#16A34A] text-[#16A34A] font-semibold cursor-pointer"
            >
              Fill valid (482910)
            </button>
            <button
              type="button"
              onClick={() => {
                setOtp(['0', '0', '0', '0', '0', '0']);
                triggerWrongCodeError(
                  'That verification code is invalid or expired. Enter 482910 or request a new code.'
                );
              }}
              className="px-2.5 py-1 rounded-[8px] bg-white border border-[#E6E1F5] hover:border-[#DC2626] text-[#DC2626] font-semibold cursor-pointer"
            >
              Test wrong code (000000)
            </button>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
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
                onClick={handleResendCode}
                className="font-bold text-[#6D4AE0] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Resend code now</span>
              </button>
            )}
          </div>

          <Button type="submit" variant="primary" fullWidth size="md" loading={loading}>
            Verify
          </Button>
        </form>
      </div>
    </AuthSplitLayout>
  );
};

/**
 * 4. FORGOT PASSWORD PAGE (/forgot-password)
 * - Email field, then "Check your email" confirmation with Resend and Back to login.
 */
export const ForgotPasswordPage: React.FC = () => {
  const { addToast } = useApp();
  const [email, setEmail] = useState('sara.ali@eduhub.com');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
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
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      addToast({
        title: 'Password reset link sent',
        message: `Check ${trimmed} for recovery instructions.`,
        variant: 'info',
      });
    }, 500);
  };

  const handleResend = () => {
    addToast({
      title: 'Reset email resent',
      message: `We sent a fresh recovery link to ${email.trim()}.`,
      variant: 'success',
    });
  };

  if (sent) {
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
              We sent a password reset link to{' '}
              <strong className="text-[#1E1B2E]">{email.trim()}</strong>. The link expires in 30 minutes.
            </p>
          </div>

          <div className="w-full space-y-3 pt-2">
            <Link to="/reset-password" className="block">
              <Button variant="primary" fullWidth>
                Open reset password screen (Demo)
              </Button>
            </Link>
            <Button variant="secondary" fullWidth onClick={handleResend}>
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
            Enter the email associated with your EduHub account and we will send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSend} noValidate className="space-y-4">
          <TextInput
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
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Send recovery link
          </Button>
        </form>
      </div>
    </AuthSplitLayout>
  );
};

/**
 * 5. RESET PASSWORD PAGE (/reset-password)
 * - New and confirm password with strength meter, then success screen "Password updated" with "Log in" button.
 */
export const ResetPasswordPage: React.FC = () => {
  const { addToast } = useApp();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    const pwEval = evaluatePassword(password);

    if (!password) {
      setPasswordError('Enter a new password for your account.');
      valid = false;
    } else if (!pwEval.isStrongEnough) {
      setPasswordError(
        'Password is too weak. Use at least 8 characters and satisfy at least 3 security rules.'
      );
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmError('Re-enter your new password to confirm.');
      valid = false;
    } else if (confirmPassword !== password) {
      setConfirmError('Passwords do not match. Make sure both fields are identical.');
      valid = false;
    } else {
      setConfirmError('');
    }

    if (!valid) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setUpdated(true);
      addToast({
        title: 'Password updated',
        message: 'Your EduHub password has been reset.',
        variant: 'success',
      });
    }, 550);
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

        <form onSubmit={handleReset} noValidate className="space-y-4">
          <PasswordInput
            label="New password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
            placeholder="Enter new password"
            errorText={passwordError}
            required
          />

          <PasswordStrengthChecklist password={password} />

          <PasswordInput
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (confirmError) setConfirmError('');
            }}
            placeholder="Re-enter new password"
            errorText={confirmError}
            required
          />

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Save new password
          </Button>
        </form>
      </div>
    </AuthSplitLayout>
  );
};
