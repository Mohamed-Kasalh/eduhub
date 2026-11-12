import React, { useState, useRef, useEffect, useId } from 'react';
import {
  Eye,
  EyeOff,
  Search,
  X,
  ChevronDown,
  UploadCloud,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { ComponentVisualState } from './Button';

interface BaseFieldProps {
  label?: string;
  helperText?: string;
  errorText?: string;
  loading?: boolean;
  disabled?: boolean;
  forceState?: ComponentVisualState;
  required?: boolean;
  className?: string;
}

function getControlSurfaceClasses(
  forceState?: ComponentVisualState,
  hasError?: boolean,
  isDisabled?: boolean
) {
  const base =
    'w-full rounded-[10px] bg-white text-[#1E1B2E] placeholder:text-[#5F5B75] text-[16px] transition-all duration-150 border';

  if (isDisabled || forceState === 'disabled') {
    return `${base} bg-[#F3EFFF]/50 text-[#5F5B75] border-[#E6E1F5] opacity-65 cursor-not-allowed`;
  }

  if (hasError || forceState === 'error') {
    return `${base} border-[#DC2626] bg-[#FEF2F2]/40 ring-2 ring-[#DC2626]/20 focus:outline-none focus:ring-3 focus:ring-[#DC2626]/30`;
  }

  if (forceState === 'focus') {
    return `${base} border-[#6D4AE0] ring-3 ring-[#A78BFA]/45 outline-none`;
  }

  if (forceState === 'hover') {
    return `${base} border-[#A78BFA] shadow-purple-sm`;
  }

  return `${base} border-[#E6E1F5] hover:border-[#A78BFA] focus:outline-none focus:border-[#6D4AE0] focus:ring-3 focus:ring-[#A78BFA]/40`;
}

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'disabled'>,
    BaseFieldProps {
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  helperText,
  errorText,
  loading = false,
  disabled = false,
  forceState,
  required,
  leftIcon,
  rightSlot,
  className = '',
  id,
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const isLoading = loading || forceState === 'loading';
  const isDisabled = disabled || forceState === 'disabled' || isLoading;
  const hasError = Boolean(errorText) || forceState === 'error';
  const resolvedError =
    errorText ||
    (forceState === 'error'
      ? 'Enter a valid email address such as name@domain.com to continue.'
      : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-[14px] font-semibold text-[#1E1B2E] flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-[#DC2626]">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3.5 text-[#5F5B75] pointer-events-none">{leftIcon}</span>
        )}
        <input
          id={inputId}
          disabled={isDisabled}
          aria-invalid={hasError ? true : undefined}
          className={`${getControlSurfaceClasses(forceState, hasError, isDisabled)} h-11 ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightSlot || isLoading || hasError ? 'pr-10' : 'pr-3.5'}`}
          {...rest}
        />
        <div className="absolute right-3.5 flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-[#6D4AE0] animate-spin" />
          ) : hasError ? (
            <AlertCircle className="w-4 h-4 text-[#DC2626]" />
          ) : (
            rightSlot
          )}
        </div>
      </div>
      {resolvedError ? (
        <p className="text-[12px] text-[#DC2626] font-medium flex items-center gap-1">
          <span>{resolvedError}</span>
        </p>
      ) : helperText ? (
        <p className="text-[12px] text-[#5F5B75]">{helperText}</p>
      ) : null}
    </div>
  );
};

export const PasswordInput: React.FC<Omit<TextInputProps, 'type'>> = ({
  label = 'Password',
  placeholder = 'Enter at least 8 characters',
  errorText,
  forceState,
  ...rest
}) => {
  const [visible, setVisible] = useState(false);
  const resolvedError =
    errorText ||
    (forceState === 'error'
      ? 'Password is too short. Add at least 8 characters including a number.'
      : undefined);

  return (
    <TextInput
      type={visible ? 'text' : 'password'}
      label={label}
      placeholder={placeholder}
      errorText={resolvedError}
      forceState={forceState}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-[#5F5B75] hover:text-[#6D4AE0] w-11 h-11 -mr-3.5 flex items-center justify-center rounded-[10px] cursor-pointer"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
      {...rest}
    />
  );
};

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'disabled'>,
    BaseFieldProps {
  options: SelectOption[];
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  options,
  helperText,
  errorText,
  loading = false,
  disabled = false,
  forceState,
  required,
  className = '',
  id,
  ...rest
}) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const isLoading = loading || forceState === 'loading';
  const isDisabled = disabled || forceState === 'disabled' || isLoading;
  const hasError = Boolean(errorText) || forceState === 'error';
  const resolvedError =
    errorText ||
    (forceState === 'error' ? 'Select a category from the list before saving.' : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="text-[14px] font-semibold text-[#1E1B2E] flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-[#DC2626]">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          id={selectId}
          disabled={isDisabled}
          aria-invalid={hasError ? true : undefined}
          className={`${getControlSurfaceClasses(
            forceState,
            hasError,
            isDisabled
          )} h-11 pl-3.5 pr-10 appearance-none cursor-pointer`}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3.5 pointer-events-none text-[#5F5B75]">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-[#6D4AE0] animate-spin" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </span>
      </div>
      {resolvedError ? (
        <p className="text-[12px] text-[#DC2626] font-medium">{resolvedError}</p>
      ) : helperText ? (
        <p className="text-[12px] text-[#5F5B75]">{helperText}</p>
      ) : null}
    </div>
  );
};

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'disabled' | 'onChange'>,
    BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmitSearch?: (value: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  label,
  value,
  onChange,
  onSubmitSearch,
  placeholder = 'Search courses, instructors, or topics...',
  helperText,
  errorText,
  loading = false,
  disabled = false,
  forceState,
  className = '',
  id,
  'aria-label': ariaLabel,
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const isLoading = loading || forceState === 'loading';
  const isDisabled = disabled || forceState === 'disabled' || isLoading;
  const hasError = Boolean(errorText) || forceState === 'error';
  const resolvedError =
    errorText ||
    (forceState === 'error'
      ? 'Search query cannot include special characters like < or >. Remove them and try again.'
      : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label htmlFor={inputId} className="text-[14px] font-semibold text-[#1E1B2E]">{label}</label>}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-[#5F5B75] absolute left-3.5 pointer-events-none" />
        <input
          id={inputId}
          type="text"
          value={value}
          disabled={isDisabled}
          aria-label={ariaLabel ?? label ?? placeholder ?? 'Search'}
          aria-invalid={hasError ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSubmitSearch) {
              onSubmitSearch(value);
            }
          }}
          placeholder={placeholder}
          className={`${getControlSurfaceClasses(forceState, hasError, isDisabled)} h-11 pl-10 pr-10`}
          {...rest}
        />
        <div className="absolute right-3 flex items-center">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-[#6D4AE0] animate-spin" />
          ) : value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="w-11 h-11 -mr-3 flex items-center justify-center text-[#5F5B75] hover:text-[#1E1B2E] rounded-full hover:bg-[#F3EFFF] cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      {resolvedError ? (
        <p className="text-[12px] text-[#DC2626] font-medium">{resolvedError}</p>
      ) : helperText ? (
        <p className="text-[12px] text-[#5F5B75]">{helperText}</p>
      ) : null}
    </div>
  );
};

export interface TextareaInputProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'disabled'>,
    BaseFieldProps {
  maxLengthCount?: number;
}

export const TextareaInput: React.FC<TextareaInputProps> = ({
  label,
  helperText,
  errorText,
  loading = false,
  disabled = false,
  forceState,
  required,
  maxLengthCount,
  value,
  className = '',
  id,
  ...rest
}) => {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const isLoading = loading || forceState === 'loading';
  const isDisabled = disabled || forceState === 'disabled' || isLoading;
  const hasError = Boolean(errorText) || forceState === 'error';
  const resolvedError =
    errorText ||
    (forceState === 'error'
      ? 'Course description needs at least 30 characters so students know what they will learn.'
      : undefined);

  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={textareaId} className="text-[14px] font-semibold text-[#1E1B2E] flex items-center gap-1">
            <span>{label}</span>
            {required && <span className="text-[#DC2626]">*</span>}
          </label>
        )}
        {maxLengthCount && (
          <span className="text-[12px] text-[#5F5B75]">
            {currentLength} / {maxLengthCount}
          </span>
        )}
      </div>
      <div className="relative">
        <textarea
          id={textareaId}
          value={value}
          disabled={isDisabled}
          aria-invalid={hasError ? true : undefined}
          rows={4}
          className={`${getControlSurfaceClasses(forceState, hasError, isDisabled)} p-3.5 resize-y`}
          {...rest}
        />
        {isLoading && (
          <Loader2 className="w-4 h-4 text-[#6D4AE0] animate-spin absolute right-3.5 top-3.5" />
        )}
      </div>
      {resolvedError ? (
        <p className="text-[12px] text-[#DC2626] font-medium">{resolvedError}</p>
      ) : helperText ? (
        <p className="text-[12px] text-[#5F5B75]">{helperText}</p>
      ) : null}
    </div>
  );
};

export interface OtpInputProps extends BaseFieldProps {
  length?: number;
  value: string[];
  onChange: (next: string[]) => void;
  autoFocusFirst?: boolean;
  shake?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  label = 'Verification code',
  length = 6,
  value,
  onChange,
  autoFocusFirst = false,
  shake = false,
  helperText,
  errorText,
  loading = false,
  disabled = false,
  forceState,
  className = '',
}) => {
  const groupId = useId();
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const isLoading = loading || forceState === 'loading';
  const isDisabled = disabled || forceState === 'disabled' || isLoading;
  const hasError = Boolean(errorText) || forceState === 'error';
  const resolvedError =
    errorText ||
    (forceState === 'error'
      ? 'That 6-digit code has expired or is incorrect. Check your inbox or request a new code.'
      : undefined);

  useEffect(() => {
    if (autoFocusFirst && !isDisabled) {
      refs.current[0]?.focus();
    }
  }, [autoFocusFirst, isDisabled]);

  const handleDigitChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (value[index]) {
        const next = [...value];
        next[index] = '';
        onChange(next);
      } else if (index > 0) {
        const next = [...value];
        next[index - 1] = '';
        onChange(next);
        refs.current[index - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (isDisabled) return;
    const pastedDigits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pastedDigits) return;
    const next = Array.from({ length }, (_, idx) => pastedDigits[idx] || value[idx] || '');
    onChange(next);
    const targetFocusIndex = Math.min(pastedDigits.length, length - 1);
    refs.current[targetFocusIndex]?.focus();
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <label htmlFor={`${groupId}-0`} className="text-[14px] font-semibold text-[#1E1B2E]">{label}</label>}
      <div className={`flex items-center gap-2 sm:gap-3 ${shake ? 'animate-shake' : ''}`}>
        {Array.from({ length }).map((_, idx) => (
          <input
            key={idx}
            id={`${groupId}-${idx}`}
            ref={(el) => {
              refs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            disabled={isDisabled}
            value={value[idx] || ''}
            onChange={(e) => handleDigitChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            aria-label={`${label} digit ${idx + 1} of ${length}`}
            className={`${getControlSurfaceClasses(
              forceState && idx === 0 ? forceState : hasError ? 'error' : undefined,
              hasError,
              isDisabled
            )} !w-11 !h-12 sm:!w-12 sm:!h-13 text-center font-display font-bold text-[20px]`}
          />
        ))}
        {isLoading && <Loader2 className="w-5 h-5 text-[#6D4AE0] animate-spin ml-1" />}
      </div>
      {resolvedError ? (
        <p className="text-[12px] text-[#DC2626] font-medium flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{resolvedError}</span>
        </p>
      ) : helperText ? (
        <p className="text-[12px] text-[#5F5B75]">{helperText}</p>
      ) : null}
    </div>
  );
};

export interface FileDropzoneProps extends BaseFieldProps {
  acceptLabel?: string;
  accept?: string;
  onFileSelect?: (fileName: string) => void;
  onFilePicked?: (file: File) => void;
  progress?: number;
  selectedFileName?: string | null;
  onRetry?: () => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  label = 'Upload course thumbnail or syllabus PDF',
  acceptLabel = 'PNG, JPG, WebP, or PDF up to 10 MB',
  accept,
  helperText,
  errorText,
  loading = false,
  disabled = false,
  forceState,
  onFileSelect,
  onFilePicked,
  progress,
  selectedFileName,
  onRetry,
  className = '',
}) => {
  const fileInputId = useId();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const displayFileName = selectedFileName !== undefined ? selectedFileName : selectedFile;
  const isLoading = loading || forceState === 'loading';
  const isDisabled = disabled || forceState === 'disabled' || isLoading;
  const hasError = Boolean(errorText) || forceState === 'error';
  const isHovered = dragActive || forceState === 'hover';
  const isFocused = forceState === 'focus';

  const resolvedError =
    errorText ||
    (forceState === 'error'
      ? 'File exceeds the 10 MB limit. Compress the image or choose a smaller file.'
      : undefined);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || isDisabled) return;
    const file = files[0];
    setSelectedFile(file.name);
    onFileSelect?.(file.name);
    onFilePicked?.(file);
  };

  const displayProgress = typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : 64;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label htmlFor={fileInputId} className="text-[14px] font-semibold text-[#1E1B2E]">{label}</label>}
      <div
        role="button"
        aria-label={label || 'Upload file'}
        tabIndex={isDisabled ? -1 : 0}
        onClick={() => !isDisabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDisabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-[12px] border-2 border-dashed p-5 text-center transition-all duration-150 ${
          isDisabled
            ? 'bg-[#F3EFFF]/40 border-[#E6E1F5] opacity-60 cursor-not-allowed'
            : hasError
            ? 'bg-[#FEF2F2]/50 border-[#DC2626] text-[#DC2626] cursor-pointer'
            : isFocused
            ? 'bg-[#F3EFFF]/70 border-[#6D4AE0] ring-3 ring-[#A78BFA]/45 cursor-pointer'
            : isHovered
            ? 'bg-[#F3EFFF] border-[#6D4AE0] shadow-purple-sm cursor-pointer'
            : 'bg-white border-[#E6E1F5] hover:border-[#6D4AE0] hover:bg-[#F3EFFF]/50 cursor-pointer'
        }`}
      >
        <input
          id={fileInputId}
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={isDisabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="flex flex-col items-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="w-7 h-7 text-[#6D4AE0] animate-spin" />
              <p className="text-[14px] font-semibold text-[#1E1B2E]">
                Uploading file ({displayProgress}%)...
              </p>
              <div className="w-44 h-2 rounded-full bg-[#F3EFFF] border border-[#E6E1F5] overflow-hidden">
                <div
                  className="h-full bg-[#6D4AE0] transition-all duration-150"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>
            </>
          ) : displayFileName && !hasError ? (
            <>
              <CheckCircle2 className="w-7 h-7 text-[#16A34A]" />
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[#1E1B2E]">
                <FileText className="w-4 h-4 text-[#6D4AE0]" />
                <span>{displayFileName}</span>
              </div>
              <span className="text-[12px] text-[#6D4AE0] font-semibold">
                Click to replace file
              </span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-[#F3EFFF] flex items-center justify-center text-[#6D4AE0]">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-[14px] font-semibold text-[#1E1B2E]">
                Click to choose a file <span className="font-normal text-[#5F5B75]">or drag and drop here</span>
              </p>
              <p className="text-[12px] text-[#5F5B75]">{acceptLabel}</p>
            </>
          )}
        </div>
      </div>
      {resolvedError ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-[#DC2626] font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{resolvedError}</span>
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={() => {
                onRetry();
                inputRef.current?.click();
              }}
              className="text-[12px] font-bold text-[#6D4AE0] hover:underline cursor-pointer min-h-[36px] px-2"
            >
              Retry
            </button>
          )}
        </div>
      ) : helperText ? (
        <p className="text-[12px] text-[#5F5B75]">{helperText}</p>
      ) : null}
    </div>
  );
};
