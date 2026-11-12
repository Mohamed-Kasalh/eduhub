import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useBlocker, useSearchParams } from 'react-router';
import {
  Camera,
  CheckCircle2,
  Globe,
  Briefcase,
  Code2,
  Phone,
  Mail,
  Laptop,
  Smartphone,
  Tablet,
  LogOut,
  ShieldAlert,
  Trash2,
  Plus,
  X,
  ZoomIn,
  Move,
  Award,
  Star,
  BookOpen,
  Bell,
  Lock,
  User as UserIcon,
  Eye,
} from 'lucide-react';
import {
  Avatar,
  Breadcrumbs,
  Button,
  ConfirmDialog,
  EmptyState,
  FileDropzone,
  FormErrorItem,
  FormErrorSummary,
  Modal,
  PasswordInput,
  PasswordStrengthChecklist,
  QueryErrorState,
  Skeleton,
  StatusChip,
  Tabs,
  TextInput,
  TextareaInput,
  evaluatePassword,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import type {
  NotificationPreferenceKey,
  NotificationPreferenceMap,
  UserProfile,
} from '../../api/dto-types-bridge';
import { getErrorMessage, isApiError } from '../../api/errors';
import { usePublicConfig } from '../../api/hooks/useCatalog';
import {
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useMySessions,
  useRevokeAllOtherSessionsMutation,
  useRevokeSessionMutation,
  useUpdateMeMutation,
  useUpdateNotificationPreferencesMutation,
  useUploadFileMutation,
} from '../../api/hooks/useProfileAndNotifications';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  toNullableTrimmed,
  type ActiveSessionView,
} from '../../api/mappers';

type AvatarUploadState = 'idle' | 'uploading' | 'success' | 'error';

const NOTIFICATION_ROWS: Array<{
  key: NotificationPreferenceKey;
  label: string;
  description: string;
}> = [
  {
    key: 'courseReplies',
    label: 'Course replies',
    description: 'Instructor responses and peer replies in lesson discussions.',
  },
  {
    key: 'examResults',
    label: 'Exam results',
    description: 'Graded certification exam scores and practice exam unlocks.',
  },
  {
    key: 'certificates',
    label: 'Certificates',
    description: 'Issued graduate certificates and verification registry alerts.',
  },
  {
    key: 'moderation',
    label: 'Course approvals and moderation',
    description: 'Syllabus review status changes and flagged discussion alerts.',
  },
  {
    key: 'announcements',
    label: 'Announcements',
    description: 'New course launches, platform updates, and study roadmaps.',
  },
];

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const PREVIEW_CANVAS_SIZE = 240;
const EXPORT_CANVAS_SIZE = 256;

function isValidOptionalUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function exportCanvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    } else {
      resolve(null);
    }
  });
  if (blob) return blob;
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const res = await fetch(dataUrl);
  return res.blob();
}

function buildApiFieldErrorResult(
  fieldErrors: Record<string, string[]> | undefined,
  descriptorMap: Record<string, { fieldKey: string; label: string; targetId: string }>
): { errors: FormErrorItem[]; fieldMap: Record<string, string> } {
  const errors: FormErrorItem[] = [];
  const fieldMap: Record<string, string> = {};
  if (!fieldErrors) return { errors, fieldMap };

  for (const [rawKey, messages] of Object.entries(fieldErrors)) {
    const firstMsg = messages?.[0];
    if (!firstMsg) continue;
    const normalizedKey = rawKey.includes('.') ? rawKey.split('.').pop() || rawKey : rawKey;
    const meta = descriptorMap[rawKey] ?? descriptorMap[normalizedKey];
    if (meta) {
      fieldMap[meta.fieldKey] = firstMsg;
      errors.push({ field: meta.label, message: firstMsg, targetId: meta.targetId });
    } else {
      errors.push({ field: normalizedKey, message: firstMsg, targetId: Object.values(descriptorMap)[0]?.targetId ?? '' });
    }
  }
  return { errors, fieldMap };
}

function normalizeProfileTab(tab: string | null, isInstructor: boolean): string {
  if (tab === 'sessions' || tab === 'security') return 'security';
  if (tab === 'notifications') return 'notifications';
  if (tab === 'public-profile' && isInstructor) return 'public-profile';
  return 'profile';
}

export const ProfilePage: React.FC = () => {
  const { role, user: authUser, rawUser, clearAuthSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const publicConfigQuery = usePublicConfig();
  const maxAvatarBytes = publicConfigQuery.data?.uploadLimits.avatarMaxBytes ?? MAX_AVATAR_BYTES;
  const maxAvatarMbLabel = `${Math.max(1, Math.round(maxAvatarBytes / (1024 * 1024)))} MB`;

  const user: UserProfile = {
    id: '',
    name: 'EduHub User',
    email: '',
    role: role === 'guest' ? 'student' : role,
    avatar: '',
    title: '',
    bio: '',
    joinedAt: '',
    status: 'Active',
    ...authUser,
  };
  const isInstructor = role === 'instructor';
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<string>(() =>
    normalizeProfileTab(tabParam, isInstructor)
  );

  useEffect(() => {
    if (tabParam !== null) {
      setActiveTab(normalizeProfileTab(tabParam, isInstructor));
    }
  }, [tabParam, isInstructor]);

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextTab === 'profile') next.delete('tab');
        else next.set('tab', nextTab);
        return next;
      },
      { replace: true }
    );
  };

  const sessionsQuery = useMySessions(activeTab === 'security');
  const updateMeMutation = useUpdateMeMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const revokeSessionMutation = useRevokeSessionMutation();
  const revokeAllSessionsMutation = useRevokeAllOtherSessionsMutation();
  const deleteAccountMutation = useDeleteAccountMutation();
  const updateNotifPrefsMutation = useUpdateNotificationPreferencesMutation();
  const uploadFileMutation = useUploadFileMutation();

  // Profile tab form state
  const [name, setName] = useState(user.name);
  const [headline, setHeadline] = useState(user.title);
  const [phone, setPhone] = useState(user.phone || '');
  const [bio, setBio] = useState(user.bio);
  const [website, setWebsite] = useState(user.links?.website || '');
  const [linkedin, setLinkedin] = useState(user.links?.linkedin || '');
  const [github, setGithub] = useState(user.links?.github || '');
  const [profileErrors, setProfileErrors] = useState<FormErrorItem[]>([]);
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});
  const [profileSummaryKey, setProfileSummaryKey] = useState(0);

  // Security tab state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<FormErrorItem[]>([]);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({});
  const [passwordSummaryKey, setPasswordSummaryKey] = useState(0);

  const [sessionToEnd, setSessionToEnd] = useState<ActiveSessionView | null>(null);
  const [endAllSessionsOpen, setEndAllSessionsOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  // Notifications preferences state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferenceMap>(
    user.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES
  );

  // Instructor public profile state
  const [publicHeadline, setPublicHeadline] = useState(user.title);
  const [publicBio, setPublicBio] = useState(user.bio);
  const [expertiseTags, setExpertiseTags] = useState<string[]>(user.expertiseTags || []);
  const [newExpertiseTag, setNewExpertiseTag] = useState('');
  const [publicWebsite, setPublicWebsite] = useState(user.links?.website || '');
  const [publicLinkedin, setPublicLinkedin] = useState(user.links?.linkedin || '');
  const [publicGithub, setPublicGithub] = useState(user.links?.github || '');
  const [publicErrors, setPublicErrors] = useState<FormErrorItem[]>([]);
  const [publicSummaryKey, setPublicSummaryKey] = useState(0);

  // Avatar modal & canvas crop state
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarUploadState>('idle');
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [avatarError, setAvatarError] = useState<string>('');
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bypassBlockerRef = useRef(false);

  // Re-sync form state when role or user changes
  useEffect(() => {
    setName(user.name);
    setHeadline(user.title);
    setPhone(user.phone || '');
    setBio(user.bio);
    setWebsite(user.links?.website || '');
    setLinkedin(user.links?.linkedin || '');
    setGithub(user.links?.github || '');
    setProfileErrors([]);
    setProfileFieldErrors({});
    setNotifPrefs(user.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES);
    setPublicHeadline(user.title);
    setPublicBio(user.bio);
    setExpertiseTags(user.expertiseTags || []);
    setPublicWebsite(user.links?.website || '');
    setPublicLinkedin(user.links?.linkedin || '');
    setPublicGithub(user.links?.github || '');
    setPublicErrors([]);
  }, [
    role,
    user.name,
    user.title,
    user.phone,
    user.bio,
    user.links?.website,
    user.links?.linkedin,
    user.links?.github,
    user.expertiseTags,
    user.notificationPreferences,
  ]);

  // Reset public-profile tab if user switches to a non-instructor role
  useEffect(() => {
    if (!isInstructor && activeTab === 'public-profile') {
      setActiveTab('profile');
    }
  }, [isInstructor, activeTab]);

  const isProfileDirty = useMemo(() => {
    return (
      name !== user.name ||
      headline !== user.title ||
      phone !== (user.phone || '') ||
      bio !== user.bio ||
      website !== (user.links?.website || '') ||
      linkedin !== (user.links?.linkedin || '') ||
      github !== (user.links?.github || '')
    );
  }, [name, headline, phone, bio, website, linkedin, github, user]);

  // Warn before closing tab or navigating away with unsaved profile changes
  useEffect(() => {
    if (!isProfileDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isProfileDirty]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isProfileDirty &&
      !bypassBlockerRef.current &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Clamp and draw cropped image onto preview or export canvas
  const drawCroppedImage = useCallback(
    (
      canvas: HTMLCanvasElement,
      img: HTMLImageElement,
      targetSize: number,
      zoom: number,
      offset: { x: number; y: number },
      circularClip: boolean
    ) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = targetSize;
      canvas.height = targetSize;
      ctx.clearRect(0, 0, targetSize, targetSize);

      ctx.save();
      if (circularClip) {
        ctx.beginPath();
        ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetSize, targetSize);
      }

      const scaleFactor = targetSize / PREVIEW_CANVAS_SIZE;
      const baseScale = Math.max(targetSize / img.naturalWidth, targetSize / img.naturalHeight);
      const drawW = img.naturalWidth * baseScale * zoom;
      const drawH = img.naturalHeight * baseScale * zoom;

      const maxOffsetX = Math.max(0, (drawW - targetSize) / 2);
      const maxOffsetY = Math.max(0, (drawH - targetSize) / 2);
      const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x * scaleFactor));
      const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y * scaleFactor));

      const drawX = (targetSize - drawW) / 2 + clampedX;
      const drawY = (targetSize - drawH) / 2 + clampedY;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    },
    []
  );

  useEffect(() => {
    if (!loadedImage || !previewCanvasRef.current) return;
    drawCroppedImage(
      previewCanvasRef.current,
      loadedImage,
      PREVIEW_CANVAS_SIZE,
      cropZoom,
      cropOffset,
      true
    );
  }, [loadedImage, cropZoom, cropOffset, drawCroppedImage]);

  const resetAvatarModal = () => {
    setAvatarState('idle');
    setAvatarProgress(0);
    setAvatarError('');
    setPickedFileName(null);
    setLoadedImage(null);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
  };

  const handleOpenAvatarModal = () => {
    resetAvatarModal();
    setAvatarModalOpen(true);
  };

  const handleCloseAvatarModal = () => {
    if (avatarState === 'uploading') return;
    resetAvatarModal();
    setAvatarModalOpen(false);
  };

  const handleAvatarFilePicked = (file: File) => {
    const validMime = file.type === 'image/jpeg' || file.type === 'image/png';
    const validExt = /\.(jpe?g|png)$/i.test(file.name);
    if (!validMime && !validExt) {
      setLoadedImage(null);
      setPickedFileName(null);
      setAvatarState('error');
      setAvatarError(
        `Unsupported file "${file.name}". Please choose a JPG or PNG image.`
      );
      return;
    }
    if (file.size > maxAvatarBytes) {
      setLoadedImage(null);
      setPickedFileName(null);
      setAvatarState('error');
      setAvatarError(
        `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is ${maxAvatarMbLabel}.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const img = new Image();
      img.onload = () => {
        setAvatarError('');
        setAvatarState('idle');
        setPickedFileName(file.name);
        setLoadedImage(img);
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
      };
      img.onerror = () => {
        setAvatarState('error');
        setAvatarError('Could not decode this image file. Try another JPG or PNG photo.');
      };
      img.src = result;
    };
    reader.onerror = () => {
      setAvatarState('error');
      setAvatarError('Failed to read the selected file. Click Retry to choose again.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!loadedImage || avatarState === 'uploading') return;
    setAvatarState('uploading');
    setAvatarProgress(10);
    setAvatarError('');

    const exportCanvas = document.createElement('canvas');
    drawCroppedImage(
      exportCanvas,
      loadedImage,
      EXPORT_CANVAS_SIZE,
      cropZoom,
      cropOffset,
      false
    );

    try {
      const blob = await exportCanvasToJpegBlob(exportCanvas, 0.9);
      const baseName = (pickedFileName ?? 'avatar').replace(/\.[^.]+$/, '');
      const exportFileName = `${baseName}.jpg`;
      const jpegFile = new File([blob], exportFileName, { type: 'image/jpeg' });

      const uploaded = await uploadFileMutation.mutateAsync({
        file: jpegFile,
        kind: 'avatar',
        filename: exportFileName,
        onProgress: (ev) => {
          setAvatarProgress(Math.max(15, Math.min(90, ev.percent)));
        },
      });

      setAvatarProgress(95);
      await updateMeMutation.mutateAsync({
        payload: { avatarUrl: uploaded.url },
        successTitle: 'Profile photo updated',
        successMessage: 'Your new 256×256 avatar is live across your workspace.',
      });
      setAvatarProgress(100);
      setAvatarState('success');
      resetAvatarModal();
      setAvatarModalOpen(false);
    } catch (err) {
      setAvatarState('error');
      setAvatarError(getErrorMessage(err, 'Unable to upload photo. Please try again.'));
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateMeMutation.mutateAsync({
        payload: { avatarUrl: null },
        successTitle: 'Profile photo removed',
        successMessage: 'Your initials avatar is now shown.',
      });
      resetAvatarModal();
      setAvatarModalOpen(false);
    } catch {
      // Danger toast already shown by mutation.
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!loadedImage) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: cropOffset.x,
      origY: cropOffset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStartRef.current || !loadedImage) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setCropOffset({
      x: dragStartRef.current.origX + dx,
      y: dragStartRef.current.origY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragStartRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragStartRef.current = null;
    }
  };

  // Save Profile Tab
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updateMeMutation.isPending) return;
    const errors: FormErrorItem[] = [];
    const fieldMap: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      const msg = 'Enter your full name (at least 2 characters).';
      fieldMap.name = msg;
      errors.push({ field: 'Full name', message: msg, targetId: 'profile-name' });
    }
    if (headline.trim().length > 100) {
      const msg = 'Headline must be 100 characters or fewer.';
      fieldMap.headline = msg;
      errors.push({ field: 'Headline', message: msg, targetId: 'profile-headline' });
    }
    if (phone.trim() && !/^[+\d\s()-]{7,20}$/.test(phone.trim())) {
      const msg = 'Enter a valid phone number (7–20 digits and symbols).';
      fieldMap.phone = msg;
      errors.push({ field: 'Phone', message: msg, targetId: 'profile-phone' });
    }
    if (bio.length > 300) {
      const msg = 'Bio must be 300 characters or fewer.';
      fieldMap.bio = msg;
      errors.push({ field: 'Bio', message: msg, targetId: 'profile-bio' });
    }
    if (!isValidOptionalUrl(website)) {
      const msg = 'Website must be a valid URL starting with http:// or https://.';
      fieldMap.website = msg;
      errors.push({ field: 'Website', message: msg, targetId: 'profile-website' });
    }
    if (!isValidOptionalUrl(linkedin)) {
      const msg = 'LinkedIn link must be a valid URL starting with http:// or https://.';
      fieldMap.linkedin = msg;
      errors.push({ field: 'LinkedIn', message: msg, targetId: 'profile-linkedin' });
    }
    if (!isValidOptionalUrl(github)) {
      const msg = 'GitHub link must be a valid URL starting with http:// or https://.';
      fieldMap.github = msg;
      errors.push({ field: 'GitHub', message: msg, targetId: 'profile-github' });
    }

    setProfileFieldErrors(fieldMap);
    setProfileErrors(errors);

    if (errors.length > 0) {
      setProfileSummaryKey((k) => k + 1);
      return;
    }

    try {
      await updateMeMutation.mutateAsync({
        payload: {
          name: name.trim(),
          title: headline.trim(),
          phone: toNullableTrimmed(phone),
          bio: bio.trim(),
          links: {
            website: toNullableTrimmed(website),
            linkedin: toNullableTrimmed(linkedin),
            github: toNullableTrimmed(github),
          },
        },
        successTitle: 'Profile changes saved',
        successMessage: 'Your name, bio, and profile links have been updated.',
      });
    } catch (err) {
      if (isApiError(err) && err.status === 422 && err.fieldErrors) {
        const mapped = buildApiFieldErrorResult(err.fieldErrors, {
          name: { fieldKey: 'name', label: 'Full name', targetId: 'profile-name' },
          title: { fieldKey: 'headline', label: 'Headline', targetId: 'profile-headline' },
          phone: { fieldKey: 'phone', label: 'Phone', targetId: 'profile-phone' },
          bio: { fieldKey: 'bio', label: 'Bio', targetId: 'profile-bio' },
          website: { fieldKey: 'website', label: 'Website', targetId: 'profile-website' },
          linkedin: { fieldKey: 'linkedin', label: 'LinkedIn', targetId: 'profile-linkedin' },
          github: { fieldKey: 'github', label: 'GitHub', targetId: 'profile-github' },
        });
        setProfileFieldErrors(mapped.fieldMap);
        setProfileErrors(mapped.errors);
        setProfileSummaryKey((k) => k + 1);
      }
    }
  };

  // Save Security Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changePasswordMutation.isPending) return;
    const errors: FormErrorItem[] = [];
    const fieldMap: Record<string, string> = {};

    if (!currentPassword) {
      const msg = 'Enter your current password to verify your identity.';
      fieldMap.currentPassword = msg;
      errors.push({
        field: 'Current password',
        message: msg,
        targetId: 'sec-current-password',
      });
    }

    const pwEval = evaluatePassword(newPassword);
    if (!newPassword) {
      const msg = 'Enter a new password meeting the checklist below.';
      fieldMap.newPassword = msg;
      errors.push({ field: 'New password', message: msg, targetId: 'sec-new-password' });
    } else if (!pwEval.isStrongEnough) {
      const msg = 'New password is too weak. Meet all password requirements below.';
      fieldMap.newPassword = msg;
      errors.push({ field: 'New password', message: msg, targetId: 'sec-new-password' });
    } else if (currentPassword && newPassword === currentPassword) {
      const msg = 'New password must be different from your current password.';
      fieldMap.newPassword = msg;
      errors.push({ field: 'New password', message: msg, targetId: 'sec-new-password' });
    }

    if (!confirmPassword) {
      const msg = 'Confirm your new password.';
      fieldMap.confirmPassword = msg;
      errors.push({
        field: 'Confirm password',
        message: msg,
        targetId: 'sec-confirm-password',
      });
    } else if (confirmPassword !== newPassword) {
      const msg = 'Passwords do not match.';
      fieldMap.confirmPassword = msg;
      errors.push({
        field: 'Confirm password',
        message: msg,
        targetId: 'sec-confirm-password',
      });
    }

    setPasswordFieldErrors(fieldMap);
    setPasswordErrors(errors);

    if (errors.length > 0) {
      setPasswordSummaryKey((k) => k + 1);
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFieldErrors({});
      setPasswordErrors([]);
    } catch (err) {
      if (isApiError(err) && err.status === 422 && err.fieldErrors) {
        const mapped = buildApiFieldErrorResult(err.fieldErrors, {
          currentPassword: {
            fieldKey: 'currentPassword',
            label: 'Current password',
            targetId: 'sec-current-password',
          },
          newPassword: {
            fieldKey: 'newPassword',
            label: 'New password',
            targetId: 'sec-new-password',
          },
        });
        setPasswordFieldErrors(mapped.fieldMap);
        setPasswordErrors(mapped.errors);
        setPasswordSummaryKey((k) => k + 1);
      }
    }
  };

  const handleConfirmEndSession = async () => {
    if (!sessionToEnd || revokeSessionMutation.isPending) return;
    try {
      await revokeSessionMutation.mutateAsync({
        sessionId: sessionToEnd.id,
        device: sessionToEnd.device,
        browser: sessionToEnd.browser,
      });
      setSessionToEnd(null);
    } catch {
      // Danger toast emitted by mutation.
    }
  };

  const handleConfirmEndAllOtherSessions = async () => {
    if (revokeAllSessionsMutation.isPending) return;
    try {
      await revokeAllSessionsMutation.mutateAsync({ otherCount: otherSessionsCount });
      setEndAllSessionsOpen(false);
    } catch {
      // Danger toast emitted by mutation.
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteAccountMutation.isPending) return;
    try {
      await deleteAccountMutation.mutateAsync({ confirmationText: 'DELETE' });
      bypassBlockerRef.current = true;
      setDeleteAccountOpen(false);
      clearAuthSession();
      navigate('/');
    } catch {
      // Danger toast emitted by mutation.
    }
  };

  // Save Notification Preferences
  const handleSaveNotificationPrefs = () => {
    if (updateNotifPrefsMutation.isPending) return;
    updateNotifPrefsMutation.mutate(notifPrefs);
  };

  // Instructor Public Profile Save
  const handleAddExpertiseTag = () => {
    const trimmed = newExpertiseTag.trim();
    if (!trimmed) return;
    if (expertiseTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setNewExpertiseTag('');
      return;
    }
    setExpertiseTags((prev) => [...prev, trimmed]);
    setNewExpertiseTag('');
  };

  const handleSavePublicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updateMeMutation.isPending) return;
    const errors: FormErrorItem[] = [];
    if (!publicHeadline.trim() || publicHeadline.trim().length < 3) {
      errors.push({
        field: 'Public headline',
        message: 'Enter a headline of at least 3 characters.',
        targetId: 'pub-headline',
      });
    }
    if (publicBio.length > 300) {
      errors.push({
        field: 'Public bio',
        message: 'Bio must be 300 characters or fewer.',
        targetId: 'pub-bio',
      });
    }
    if (!isValidOptionalUrl(publicWebsite)) {
      errors.push({
        field: 'Website',
        message: 'Enter a valid URL starting with http:// or https://.',
        targetId: 'pub-website',
      });
    }
    if (!isValidOptionalUrl(publicLinkedin)) {
      errors.push({
        field: 'LinkedIn',
        message: 'Enter a valid URL starting with http:// or https://.',
        targetId: 'pub-linkedin',
      });
    }
    if (!isValidOptionalUrl(publicGithub)) {
      errors.push({
        field: 'GitHub',
        message: 'Enter a valid URL starting with http:// or https://.',
        targetId: 'pub-github',
      });
    }

    setPublicErrors(errors);
    if (errors.length > 0) {
      setPublicSummaryKey((k) => k + 1);
      return;
    }

    try {
      await updateMeMutation.mutateAsync({
        payload: {
          title: publicHeadline.trim(),
          bio: publicBio.trim(),
          expertiseTags,
          links: {
            website: toNullableTrimmed(publicWebsite),
            linkedin: toNullableTrimmed(publicLinkedin),
            github: toNullableTrimmed(publicGithub),
          },
        },
        successTitle: 'Public instructor profile updated',
        successMessage: 'Students will see your updated bio, tags, and links on course pages.',
      });
    } catch (err) {
      if (isApiError(err) && err.status === 422 && err.fieldErrors) {
        const mapped = buildApiFieldErrorResult(err.fieldErrors, {
          title: { fieldKey: 'title', label: 'Public headline', targetId: 'pub-headline' },
          bio: { fieldKey: 'bio', label: 'Public bio', targetId: 'pub-bio' },
          website: { fieldKey: 'website', label: 'Website', targetId: 'pub-website' },
          linkedin: { fieldKey: 'linkedin', label: 'LinkedIn', targetId: 'pub-linkedin' },
          github: { fieldKey: 'github', label: 'GitHub', targetId: 'pub-github' },
        });
        setPublicErrors(mapped.errors);
        setPublicSummaryKey((k) => k + 1);
      }
    }
  };

  const instructorCoursesCount = rawUser?.coursesCount ?? 0;

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'notifications', label: 'Notifications' },
    ...(isInstructor ? [{ id: 'public-profile', label: 'Public profile' }] : []),
  ];

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs items={[{ label: 'Profile & account settings' }]} />

      {/* Header card with avatar hover camera trigger */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleOpenAvatarModal}
            aria-label="Update profile photo"
            className="group relative rounded-full focus:outline-none focus:ring-3 focus:ring-[#6D4AE0] focus:ring-offset-2 cursor-pointer shrink-0"
          >
            <Avatar src={user.avatar} name={user.name} size="xl" status="online" />
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-[#1E1B2E]/60 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold"
            >
              <Camera className="w-4 h-4" />
              <span>Edit</span>
            </span>
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip label={`${role} account`} variant="primary" />
              {isProfileDirty && (
                <StatusChip label="Unsaved changes" variant="warning" />
              )}
            </div>
            <h1 className="text-[28px] sm:text-[34px] font-display font-bold text-[#1E1B2E] mt-1">
              {user.name}
            </h1>
            <p className="text-[14px] text-[#5F5B75]">
              {user.title} • Joined {user.joinedAt}
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Camera className="w-4 h-4" />}
          onClick={handleOpenAvatarModal}
        >
          Change photo
        </Button>
      </div>

      {/* Navigation Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

      {/* TAB 1: PROFILE */}
      {activeTab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          noValidate
          className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E6E1F5]">
            <div>
              <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                Personal information
              </h2>
              <p className="text-[14px] text-[#5F5B75]">
                Updates appear immediately in your top bar, course discussions, and reviews.
              </p>
            </div>
          </div>

          <FormErrorSummary errors={profileErrors} summaryKey={profileSummaryKey} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <TextInput
              id="profile-name"
              label="Full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (profileFieldErrors.name) {
                  setProfileFieldErrors((prev) => ({ ...prev, name: '' }));
                }
              }}
              leftIcon={<UserIcon className="w-4 h-4" />}
              errorText={profileFieldErrors.name}
              required
            />

            <TextInput
              id="profile-headline"
              label="Headline"
              value={headline}
              onChange={(e) => {
                setHeadline(e.target.value);
                if (profileFieldErrors.headline) {
                  setProfileFieldErrors((prev) => ({ ...prev, headline: '' }));
                }
              }}
              placeholder="e.g., Frontend Engineer & React Learner"
              errorText={profileFieldErrors.headline}
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="profile-email"
                  className="text-[14px] font-semibold text-[#1E1B2E]"
                >
                  Email address
                </label>
                <StatusChip label="Verified" variant="success" />
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-[#5F5B75] pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="profile-email"
                  type="email"
                  value={user.email}
                  readOnly
                  aria-readonly="true"
                  className="w-full h-11 pl-10 pr-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[#5F5B75] text-[15px] cursor-default focus:outline-none"
                />
              </div>
              <p className="text-[12px] text-[#5F5B75]">
                Verified primary address cannot be changed directly.
              </p>
            </div>

            <TextInput
              id="profile-phone"
              label="Phone number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (profileFieldErrors.phone) {
                  setProfileFieldErrors((prev) => ({ ...prev, phone: '' }));
                }
              }}
              placeholder="+20 100 555 0142"
              leftIcon={<Phone className="w-4 h-4" />}
              errorText={profileFieldErrors.phone}
            />
          </div>

          <TextareaInput
            id="profile-bio"
            label="Short biography"
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              if (profileFieldErrors.bio) {
                setProfileFieldErrors((prev) => ({ ...prev, bio: '' }));
              }
            }}
            maxLengthCount={300}
            errorText={profileFieldErrors.bio}
            helperText="Tell learners and instructors about your background and focus."
          />

          <div className="pt-4 border-t border-[#E6E1F5] space-y-4">
            <h3 className="text-[18px] font-display font-bold text-[#1E1B2E]">
              Social & portfolio links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextInput
                id="profile-website"
                label="Website"
                value={website}
                onChange={(e) => {
                  setWebsite(e.target.value);
                  if (profileFieldErrors.website) {
                    setProfileFieldErrors((prev) => ({ ...prev, website: '' }));
                  }
                }}
                placeholder="https://yoursite.dev"
                leftIcon={<Globe className="w-4 h-4" />}
                errorText={profileFieldErrors.website}
              />
              <TextInput
                id="profile-linkedin"
                label="LinkedIn"
                value={linkedin}
                onChange={(e) => {
                  setLinkedin(e.target.value);
                  if (profileFieldErrors.linkedin) {
                    setProfileFieldErrors((prev) => ({ ...prev, linkedin: '' }));
                  }
                }}
                placeholder="https://linkedin.com/in/username"
                leftIcon={<Briefcase className="w-4 h-4" />}
                errorText={profileFieldErrors.linkedin}
              />
              <TextInput
                id="profile-github"
                label="GitHub"
                value={github}
                onChange={(e) => {
                  setGithub(e.target.value);
                  if (profileFieldErrors.github) {
                    setProfileFieldErrors((prev) => ({ ...prev, github: '' }));
                  }
                }}
                placeholder="https://github.com/username"
                leftIcon={<Code2 className="w-4 h-4" />}
                errorText={profileFieldErrors.github}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {isProfileDirty && (
              <Button
                type="button"
                variant="ghost"
                disabled={updateMeMutation.isPending}
                onClick={() => {
                  setName(user.name);
                  setHeadline(user.title);
                  setPhone(user.phone || '');
                  setBio(user.bio);
                  setWebsite(user.links?.website || '');
                  setLinkedin(user.links?.linkedin || '');
                  setGithub(user.links?.github || '');
                  setProfileErrors([]);
                  setProfileFieldErrors({});
                }}
              >
                Discard changes
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              loading={updateMeMutation.isPending}
              disabled={!isProfileDirty || updateMeMutation.isPending}
            >
              Save changes
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: SECURITY */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password */}
          <form
            onSubmit={handlePasswordSubmit}
            noValidate
            className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-5"
          >
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#E6E1F5]">
              <Lock className="w-5 h-5 text-[#6D4AE0]" />
              <div>
                <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                  Change password
                </h2>
                <p className="text-[14px] text-[#5F5B75]">
                  Use a strong unique password with uppercase letters, numbers, and symbols.
                </p>
              </div>
            </div>

            <FormErrorSummary errors={passwordErrors} summaryKey={passwordSummaryKey} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2 max-w-md">
                <PasswordInput
                  id="sec-current-password"
                  label="Current password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (passwordFieldErrors.currentPassword) {
                      setPasswordFieldErrors((prev) => ({ ...prev, currentPassword: '' }));
                    }
                  }}
                  placeholder="Enter your current password"
                  errorText={passwordFieldErrors.currentPassword}
                  required
                />
              </div>

              <PasswordInput
                id="sec-new-password"
                label="New password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordFieldErrors.newPassword) {
                    setPasswordFieldErrors((prev) => ({ ...prev, newPassword: '' }));
                  }
                }}
                placeholder="Create a strong password"
                errorText={passwordFieldErrors.newPassword}
                required
              />

              <PasswordInput
                id="sec-confirm-password"
                label="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordFieldErrors.confirmPassword) {
                    setPasswordFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                placeholder="Re-enter new password"
                errorText={passwordFieldErrors.confirmPassword}
                required
              />
            </div>

            <PasswordStrengthChecklist password={newPassword} />

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                loading={changePasswordMutation.isPending}
                disabled={changePasswordMutation.isPending}
              >
                Update password
              </Button>
            </div>
          </form>

          {/* Active Sessions */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E1F5]">
              <div>
                <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                  Active sessions
                </h2>
                <p className="text-[14px] text-[#5F5B75]">
                  Devices currently signed in to your EduHub account.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={revokeAllSessionsMutation.isPending}
                disabled={otherSessionsCount === 0 || revokeAllSessionsMutation.isPending}
                leftIcon={<LogOut className="w-4 h-4" />}
                onClick={() => setEndAllSessionsOpen(true)}
              >
                Log out of all other devices
              </Button>
            </div>

            {sessionsQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton variant="text" className="h-14 w-full" />
                <Skeleton variant="text" className="h-14 w-full" />
              </div>
            ) : sessionsQuery.isError ? (
              <QueryErrorState
                error={sessionsQuery.error}
                title="Could not load active sessions"
                onRetry={() => void sessionsQuery.refetch()}
              />
            ) : sessions.length === 0 ? (
              <EmptyState
                title="No active sessions found"
                description="Your current device session details will appear here once active."
              />
            ) : (
              <div className="divide-y divide-[#E6E1F5]">
                {sessions.map((sess) => {
                  const DeviceIcon =
                    sess.deviceType === 'mobile' ? (
                      <Smartphone className="w-5 h-5" />
                    ) : sess.deviceType === 'tablet' ? (
                      <Tablet className="w-5 h-5" />
                    ) : (
                      <Laptop className="w-5 h-5" />
                    );
                  const isRevokingThis =
                    revokeSessionMutation.isPending &&
                    revokeSessionMutation.variables?.sessionId === sess.id;
                  return (
                    <div
                      key={sess.id}
                      className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-[10px] bg-[#F3EFFF] text-[#6D4AE0] flex items-center justify-center shrink-0">
                          {DeviceIcon}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display font-bold text-[16px] text-[#1E1B2E]">
                              {sess.device}
                            </p>
                            {sess.isCurrent && (
                              <StatusChip label="This device" variant="success" />
                            )}
                          </div>
                          <p className="text-[13px] text-[#5F5B75]">
                            {sess.browser} • {sess.location}
                          </p>
                          <p className="text-[12px] text-[#5F5B75]/80 mt-0.5">
                            Last active: {sess.lastActive}
                          </p>
                        </div>
                      </div>

                      {!sess.isCurrent && (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={isRevokingThis}
                          disabled={isRevokingThis || revokeAllSessionsMutation.isPending}
                          leftIcon={<LogOut className="w-4 h-4" />}
                          onClick={() => setSessionToEnd(sess)}
                        >
                          Log out
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="rounded-[12px] bg-[#FEF2F2]/50 border border-[#DC2626]/35 p-6 sm:p-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEF2F2] border border-[#DC2626]/30 text-[#DC2626] flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h2 className="text-[20px] font-display font-bold text-[#1E1B2E]">
                  Danger zone
                </h2>
                <p className="text-[14px] text-[#5F5B75]">
                  Permanently delete your EduHub account, learning progress, and active sessions. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="danger"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => setDeleteAccountOpen(true)}
              >
                Delete account
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#E6E1F5]">
            <Bell className="w-5 h-5 text-[#6D4AE0]" />
            <div>
              <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                Notification preferences
              </h2>
              <p className="text-[14px] text-[#5F5B75]">
                Choose how EduHub alerts you across in-app notifications and email digests.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[520px]">
              <thead>
                <tr className="border-b border-[#E6E1F5] text-[13px] font-bold text-[#5F5B75]">
                  <th className="py-3 pr-4">Category</th>
                  <th className="py-3 px-4 text-center w-28">In-app</th>
                  <th className="py-3 pl-4 text-center w-28">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1F5]">
                {NOTIFICATION_ROWS.map((row) => {
                  const pref = notifPrefs[row.key] || { inApp: true, email: false };
                  return (
                    <tr key={row.key}>
                      <td className="py-4 pr-4">
                        <p className="font-semibold text-[15px] text-[#1E1B2E]">{row.label}</p>
                        <p className="text-[13px] text-[#5F5B75]">{row.description}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={pref.inApp}
                          aria-label={`${row.label} in-app notifications`}
                          onClick={() =>
                            setNotifPrefs((prev) => ({
                              ...prev,
                              [row.key]: { ...pref, inApp: !pref.inApp },
                            }))
                          }
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                            pref.inApp ? 'bg-[#6D4AE0]' : 'bg-[#E6E1F5]'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                              pref.inApp ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-4 pl-4 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={pref.email}
                          aria-label={`${row.label} email notifications`}
                          onClick={() =>
                            setNotifPrefs((prev) => ({
                              ...prev,
                              [row.key]: { ...pref, email: !pref.email },
                            }))
                          }
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                            pref.email ? 'bg-[#6D4AE0]' : 'bg-[#E6E1F5]'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                              pref.email ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              loading={updateNotifPrefsMutation.isPending}
              disabled={updateNotifPrefsMutation.isPending}
              onClick={handleSaveNotificationPrefs}
            >
              Save changes
            </Button>
          </div>
        </div>
      )}

      {/* TAB 4: PUBLIC PROFILE (Instructors only) */}
      {isInstructor && activeTab === 'public-profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSavePublicProfile}
            noValidate
            className="lg:col-span-7 rounded-[12px] bg-white border border-[#E6E1F5] p-6 sm:p-8 shadow-purple-sm space-y-5"
          >
            <div className="pb-4 border-b border-[#E6E1F5]">
              <h2 className="text-[22px] font-display font-bold text-[#1E1B2E]">
                Instructor public profile
              </h2>
              <p className="text-[14px] text-[#5F5B75]">
                Customize how your bio, expertise tags, and social links appear to prospective learners.
              </p>
            </div>

            <FormErrorSummary errors={publicErrors} summaryKey={publicSummaryKey} />

            <TextInput
              id="pub-headline"
              label="Instructor headline"
              value={publicHeadline}
              onChange={(e) => setPublicHeadline(e.target.value)}
              required
            />

            <TextareaInput
              id="pub-bio"
              label="Instructor biography"
              value={publicBio}
              onChange={(e) => setPublicBio(e.target.value)}
              maxLengthCount={300}
            />

            <div className="space-y-2">
              <label
                htmlFor="pub-tag-input"
                className="text-[14px] font-semibold text-[#1E1B2E] block"
              >
                Expertise tags
              </label>
              <div className="flex flex-wrap gap-2">
                {expertiseTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3EFFF] border border-[#E6E1F5] text-[13px] font-semibold text-[#3F2A9E]"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setExpertiseTags((prev) => prev.filter((t) => t !== tag))
                      }
                      aria-label={`Remove expertise tag ${tag}`}
                      className="text-[#5F5B75] hover:text-[#DC2626] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <TextInput
                  id="pub-tag-input"
                  value={newExpertiseTag}
                  onChange={(e) => setNewExpertiseTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddExpertiseTag();
                    }
                  }}
                  placeholder="Add an expertise tag (e.g., GraphQL)"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleAddExpertiseTag}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <TextInput
                id="pub-website"
                label="Website"
                value={publicWebsite}
                onChange={(e) => setPublicWebsite(e.target.value)}
                leftIcon={<Globe className="w-4 h-4" />}
              />
              <TextInput
                id="pub-linkedin"
                label="LinkedIn"
                value={publicLinkedin}
                onChange={(e) => setPublicLinkedin(e.target.value)}
                leftIcon={<Briefcase className="w-4 h-4" />}
              />
              <TextInput
                id="pub-github"
                label="GitHub"
                value={publicGithub}
                onChange={(e) => setPublicGithub(e.target.value)}
                leftIcon={<Code2 className="w-4 h-4" />}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={updateMeMutation.isPending}
                disabled={updateMeMutation.isPending}
              >
                Save changes
              </Button>
            </div>
          </form>

          {/* Live Preview Card */}
          <div className="lg:col-span-5 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-md space-y-4 lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#6D4AE0] uppercase tracking-wide">
                <Eye className="w-4 h-4" />
                Live learner preview
              </span>
              <StatusChip label="Verified instructor" variant="success" />
            </div>

            <div className="flex items-center gap-3.5 pt-1">
              <Avatar src={user.avatar} name={user.name} size="lg" status="online" />
              <div className="min-w-0">
                <h3 className="font-display font-bold text-[20px] text-[#1E1B2E] truncate">
                  {user.name}
                </h3>
                <p className="text-[13px] font-semibold text-[#6D4AE0]">
                  {publicHeadline || 'EduHub Instructor'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[13px]">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-[#F5B82E] text-[#F5B82E]" />
                <span className="font-bold text-[#1E1B2E]">4.9 instructor rating</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#6D4AE0]" />
                <span className="font-bold text-[#1E1B2E]">{instructorCoursesCount} courses</span>
              </div>
            </div>

            <p className="text-[14px] text-[#5F5B75] leading-relaxed">
              {publicBio || 'Add a biography to help students learn about your teaching background.'}
            </p>

            {expertiseTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {expertiseTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full bg-[#F3EFFF] text-[#3F2A9E] text-[12px] font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#E6E1F5] flex flex-wrap items-center gap-3 text-[13px] text-[#5F5B75]">
              {publicWebsite && (
                <span className="inline-flex items-center gap-1 text-[#6D4AE0] font-semibold">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Website</span>
                </span>
              )}
              {publicLinkedin && (
                <span className="inline-flex items-center gap-1 text-[#6D4AE0] font-semibold">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </span>
              )}
              {publicGithub && (
                <span className="inline-flex items-center gap-1 text-[#6D4AE0] font-semibold">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </span>
              )}
              {!publicWebsite && !publicLinkedin && !publicGithub && (
                <span className="inline-flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[#6D4AE0]" />
                  <span>Add social links to display here</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AVATAR UPLOAD & CIRCULAR CROP MODAL */}
      <Modal
        open={avatarModalOpen}
        onClose={handleCloseAvatarModal}
        title="Update profile photo"
        description={`Upload a JPG or PNG image (max ${maxAvatarMbLabel}) and adjust your circular crop.`}
        footer={
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              loading={updateMeMutation.isPending && avatarState !== 'uploading'}
              onClick={handleRemoveAvatar}
              disabled={avatarState === 'uploading' || updateMeMutation.isPending || !user.avatar}
            >
              Remove photo
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleCloseAvatarModal}
                disabled={avatarState === 'uploading'}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveAvatar}
                loading={avatarState === 'uploading'}
                disabled={!loadedImage || avatarState === 'error' || avatarState === 'uploading'}
              >
                Save photo
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <FileDropzone
            label="Choose a photo"
            acceptLabel={`JPG or PNG up to ${maxAvatarMbLabel}`}
            accept="image/jpeg,image/png"
            selectedFileName={pickedFileName}
            loading={avatarState === 'uploading'}
            progress={avatarProgress}
            errorText={avatarState === 'error' ? avatarError : undefined}
            onFilePicked={handleAvatarFilePicked}
            onRetry={() => {
              setAvatarState('idle');
              setAvatarError('');
            }}
          />

          {loadedImage ? (
            <div className="rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] p-4 space-y-4 flex flex-col items-center">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#5F5B75]">
                <Move className="w-3.5 h-3.5 text-[#6D4AE0]" />
                <span>Drag photo to reposition • Exports 256×256 JPEG</span>
              </div>
              <canvas
                ref={previewCanvasRef}
                width={PREVIEW_CANVAS_SIZE}
                height={PREVIEW_CANVAS_SIZE}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                aria-label="Circular avatar crop preview"
                className="w-48 h-48 rounded-full border-4 border-white shadow-purple-md cursor-grab active:cursor-grabbing touch-none bg-white"
              />
              <div className="w-full max-w-xs space-y-1">
                <div className="flex items-center justify-between text-[12px] font-semibold text-[#5F5B75]">
                  <label htmlFor="avatar-zoom-slider" className="inline-flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5 text-[#6D4AE0]" />
                    <span>Zoom</span>
                  </label>
                  <span className="font-bold text-[#6D4AE0]">{cropZoom.toFixed(2)}×</span>
                </div>
                <input
                  id="avatar-zoom-slider"
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={cropZoom}
                  onChange={(e) => setCropZoom(Number(e.target.value))}
                  disabled={avatarState === 'uploading'}
                  className="w-full accent-[#6D4AE0] cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3.5 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5]">
              <Avatar src={user.avatar} name={user.name} size="lg" />
              <div className="text-[13px] text-[#5F5B75]">
                <p className="font-semibold text-[#1E1B2E]">Current profile photo</p>
                <p>Select a new JPG or PNG above to preview and crop it.</p>
              </div>
            </div>
          )}

          {avatarState === 'success' && (
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#16A34A]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Photo saved successfully!</span>
            </div>
          )}
        </div>
      </Modal>

      {/* CONFIRMATION DIALOGS */}
      <ConfirmDialog
        open={Boolean(sessionToEnd)}
        onClose={() => setSessionToEnd(null)}
        title="Log out this device?"
        description={
          sessionToEnd ? (
            <>
              Are you sure you want to end the session on{' '}
              <strong className="text-[#1E1B2E]">{sessionToEnd.device}</strong> ({sessionToEnd.browser})?
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Log out session"
        tone="danger"
        loading={revokeSessionMutation.isPending}
        onConfirm={handleConfirmEndSession}
      />

      <ConfirmDialog
        open={endAllSessionsOpen}
        onClose={() => setEndAllSessionsOpen(false)}
        title="Log out of all other devices?"
        description="This will immediately sign out every browser and mobile device except the one you are currently using."
        confirmLabel="Log out all others"
        tone="danger"
        loading={revokeAllSessionsMutation.isPending}
        onConfirm={handleConfirmEndAllOtherSessions}
      />

      <ConfirmDialog
        open={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
        title="Delete your EduHub account?"
        description="This permanently removes your profile, saved progress, and workspace access. Type DELETE below to confirm."
        confirmLabel="Delete account"
        tone="danger"
        loading={deleteAccountMutation.isPending}
        requireTypedText="DELETE"
        requireTypedLabel="Type DELETE to confirm permanent deletion"
        onConfirm={handleConfirmDeleteAccount}
      />

      {/* UNSAVED CHANGES ROUTE BLOCKER DIALOG */}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Leave with unsaved changes?"
        description="You have unsaved edits on your profile form. If you leave now, those changes will be lost."
        confirmLabel="Leave page"
        cancelLabel="Stay and keep editing"
        tone="danger"
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
};
