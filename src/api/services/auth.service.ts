import {
  ActionResultSchema,
  AuthSessionResponseSchema,
  RefreshTokenResponseSchema,
  RegisterResponseSchema,
  ResendOtpResponseSchema,
  type ActionResultDto,
  type AuthSessionResponseDto,
  type ForgotPasswordRequestDto,
  type GoogleOAuthRequestDto,
  type LoginRequestDto,
  type RefreshTokenRequestDto,
  type RefreshTokenResponseDto,
  type RegisterRequestDto,
  type RegisterResponseDto,
  type ResendOtpRequestDto,
  type ResendOtpResponseDto,
  type ResetPasswordRequestDto,
  type VerifyOtpRequestDto,
} from '../dto';
import { http } from '../http';
import { tokenStore } from '../tokenStore';

/** Authentication and session-lifecycle endpoints. */
export const authService = {
  /** Registers a new student or instructor account and triggers a verification OTP. */
  async register(payload: RegisterRequestDto): Promise<RegisterResponseDto> {
    return http.post('/auth/register', RegisterResponseSchema, payload, {
      skipAuth: true,
    });
  },

  /** Verifies a 6-digit email OTP and stores the resulting session tokens. */
  async verifyOtp(payload: VerifyOtpRequestDto): Promise<AuthSessionResponseDto> {
    const session = await http.post('/auth/verify-otp', AuthSessionResponseSchema, payload, {
      skipAuth: true,
    });
    tokenStore.setTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    return session;
  },

  /** Re-sends a 6-digit email verification code (subject to 60s server cooldown). */
  async resendOtp(payload: ResendOtpRequestDto): Promise<ResendOtpResponseDto> {
    return http.post('/auth/resend-otp', ResendOtpResponseSchema, payload, {
      skipAuth: true,
    });
  },

  /** Authenticates with email and password and stores the returned JWT pair. */
  async login(payload: LoginRequestDto): Promise<AuthSessionResponseDto> {
    const session = await http.post('/auth/login', AuthSessionResponseSchema, payload, {
      skipAuth: true,
    });
    tokenStore.setTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    return session;
  },

  /** Authenticates with Google OAuth identity token or demo profile selection. */
  async loginWithGoogle(payload: GoogleOAuthRequestDto = {}): Promise<AuthSessionResponseDto> {
    const session = await http.post('/auth/oauth/google', AuthSessionResponseSchema, payload, {
      skipAuth: true,
    });
    tokenStore.setTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    return session;
  },

  /** Exchanges a refresh token for a fresh access/refresh token pair. */
  async refresh(payload: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
    const refreshed = await http.post('/auth/refresh', RefreshTokenResponseSchema, payload, {
      skipAuth: true,
    });
    tokenStore.setTokens({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    });
    return refreshed;
  },

  /** Revokes the active session on the server and clears local tokens. */
  async logout(refreshToken?: string | null): Promise<ActionResultDto> {
    try {
      const token = refreshToken ?? tokenStore.getRefreshToken();
      return await http.post(
        '/auth/logout',
        ActionResultSchema,
        token ? { refreshToken: token } : {}
      );
    } finally {
      tokenStore.clear();
    }
  },

  /** Requests a password reset code/link for the supplied email address. */
  async forgotPassword(payload: ForgotPasswordRequestDto): Promise<ActionResultDto> {
    return http.post('/auth/forgot-password', ActionResultSchema, payload, {
      skipAuth: true,
    });
  },

  /** Validates whether a password reset code/token is currently valid. */
  async validateResetToken(params: {
    code?: string;
    token?: string;
    email?: string;
  }): Promise<ActionResultDto> {
    return http.get('/auth/reset-password/validate', ActionResultSchema, {
      query: { ...params },
      skipAuth: true,
    });
  },

  /** Resets the account password using a verified reset code. */
  async resetPassword(payload: ResetPasswordRequestDto): Promise<ActionResultDto> {
    return http.post('/auth/reset-password', ActionResultSchema, payload, {
      skipAuth: true,
    });
  },
};
