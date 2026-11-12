import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '../errors';
import { authService } from '../services';
import { queryKeys } from '../queryKeys';
import { useAuth } from '../../context/AuthContext';
import { emitToast } from '../../lib/toastBus';
import type {
  ForgotPasswordRequestDto,
  GoogleOAuthRequestDto,
  LoginRequestDto,
  RegisterRequestDto,
  ResendOtpRequestDto,
  ResetPasswordRequestDto,
  VerifyOtpRequestDto,
} from '../dto';

export { useAuth, getRoleDashboardPath } from '../../context/AuthContext';

/** Signs in with email + password and hydrates the React Query session cache. */
export function useLoginMutation() {
  const { applyAuthSession } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginRequestDto) => authService.login(payload),
    onSuccess: (session) => {
      applyAuthSession(session);
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all });
      emitToast({
        title: `Welcome back, ${session.user.name}!`,
        message: `Signed in as ${session.user.role} (${session.user.email}).`,
        variant: 'success',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Sign in failed',
        message: getErrorMessage(error, 'Invalid email or password.'),
        variant: 'danger',
      });
    },
  });
}

/** Signs in via Google OAuth demo exchange and hydrates the active user session. */
export function useGoogleLoginMutation() {
  const { applyAuthSession } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GoogleOAuthRequestDto) => authService.loginWithGoogle(payload),
    onSuccess: (session) => {
      applyAuthSession(session);
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all });
      emitToast({
        title: 'Connected with Google',
        message: `Signed in to your ${session.user.role} workspace.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Google sign-in failed',
        message: getErrorMessage(error),
        variant: 'danger',
      });
    },
  });
}

/** Registers a new student or instructor account and initiates OTP verification. */
export function useRegisterMutation() {
  return useMutation({
    mutationFn: (payload: RegisterRequestDto) => authService.register(payload),
    onSuccess: (res) => {
      emitToast({
        title: 'Verification code sent',
        message: `We sent a 6-digit code to ${res.email}.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Registration failed',
        message: getErrorMessage(error, 'Unable to create account.'),
        variant: 'danger',
      });
    },
  });
}

/** Verifies an email OTP code and completes authenticated session establishment. */
export function useVerifyOtpMutation() {
  const { applyAuthSession } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VerifyOtpRequestDto) => authService.verifyOtp(payload),
    onSuccess: (session) => {
      applyAuthSession(session);
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all });
      emitToast({
        title: 'Email verified!',
        message: `Redirecting you to your ${session.user.role} dashboard...`,
        variant: 'success',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Verification failed',
        message: getErrorMessage(error, 'Verification code is invalid or expired.'),
        variant: 'danger',
      });
    },
  });
}

/** Requests a fresh 6-digit OTP verification email. */
export function useResendOtpMutation() {
  return useMutation({
    mutationFn: (payload: ResendOtpRequestDto) => authService.resendOtp(payload),
    onSuccess: (res) => {
      emitToast({
        title: 'New 6-digit code sent',
        message: `Sent a fresh verification code to ${res.email}.`,
        variant: 'info',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Could not resend code',
        message: getErrorMessage(error),
        variant: 'danger',
      });
    },
  });
}

/** Initiates forgot-password recovery email dispatch. */
export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordRequestDto) => authService.forgotPassword(payload),
    onSuccess: (_, variables) => {
      emitToast({
        title: 'Password reset link sent',
        message: `Check ${variables.email} for recovery instructions.`,
        variant: 'info',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Request failed',
        message: getErrorMessage(error),
        variant: 'danger',
      });
    },
  });
}

/** Completes password recovery with email, code, and validated new password. */
export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ResetPasswordRequestDto) => authService.resetPassword(payload),
    onSuccess: () => {
      emitToast({
        title: 'Password updated',
        message: 'Your EduHub password has been reset.',
        variant: 'success',
      });
    },
    onError: (error) => {
      emitToast({
        title: 'Password reset failed',
        message: getErrorMessage(error),
        variant: 'danger',
      });
    },
  });
}

/** Revokes the current session on the server and always clears client credentials. */
export function useLogoutMutation() {
  const { clearAuthSession } = useAuth();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearAuthSession();
      emitToast({
        title: 'Signed out',
        message: 'You have safely logged out of EduHub.',
        variant: 'info',
      });
    },
    onError: (error) => {
      clearAuthSession();
      emitToast({
        title: 'Signed out locally',
        message: getErrorMessage(error, 'Session cleared on this device.'),
        variant: 'danger',
      });
    },
  });
}
