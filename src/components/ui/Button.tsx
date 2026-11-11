import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ComponentVisualState = 'default' | 'hover' | 'focus' | 'disabled' | 'loading' | 'error';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  error?: boolean;
  forceState?: ComponentVisualState;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  error = false,
  forceState,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...rest
}) => {
  const isDisabled = disabled || forceState === 'disabled' || loading || forceState === 'loading';
  const isLoading = loading || forceState === 'loading';
  const isError = error || forceState === 'error';
  const isHovered = forceState === 'hover';
  const isFocused = forceState === 'focus';

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-9 px-3.5 text-[14px] gap-1.5 rounded-[10px]',
    md: 'h-11 px-4.5 text-[16px] gap-2 rounded-[10px]',
    lg: 'h-13 px-6 text-[16px] gap-2.5 rounded-[10px]',
  };

  const variantBase: Record<ButtonVariant, string> = {
    primary: `bg-[#6D4AE0] text-white border border-transparent shadow-purple-sm ${
      isHovered ? 'bg-[#5A3AC7] shadow-purple-md -translate-y-[1px]' : 'hover:bg-[#5A3AC7] hover:shadow-purple-md'
    } active:bg-[#3F2A9E]`,
    secondary: `bg-[#F3EFFF] text-[#3F2A9E] border border-[#E6E1F5] ${
      isHovered
        ? 'bg-[#E6E1F5] border-[#A78BFA] text-[#1E1B2E]'
        : 'hover:bg-[#E6E1F5] hover:border-[#A78BFA] hover:text-[#1E1B2E]'
    }`,
    ghost: `bg-transparent text-[#1E1B2E] border border-transparent ${
      isHovered ? 'bg-[#F3EFFF] text-[#6D4AE0]' : 'hover:bg-[#F3EFFF] hover:text-[#6D4AE0]'
    }`,
    danger: `bg-[#DC2626] text-white border border-transparent shadow-sm ${
      isHovered ? 'bg-[#B91C1C] shadow-md' : 'hover:bg-[#B91C1C]'
    }`,
  };

  const focusRing = isFocused
    ? 'ring-3 ring-[#A78BFA] ring-offset-2 ring-offset-[#FAF8FF]'
    : 'focus:outline-none focus-visible:ring-3 focus-visible:ring-[#A78BFA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF8FF]';

  const errorClasses = isError
    ? 'ring-2 ring-[#DC2626] ring-offset-2 bg-[#FEF2F2] !text-[#DC2626] !border-[#DC2626]'
    : '';

  const disabledClasses = isDisabled
    ? 'opacity-55 cursor-not-allowed pointer-events-none transform-none shadow-none'
    : 'cursor-pointer transition-all duration-150';

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-semibold select-none ${sizeClasses[size]} ${
        variantBase[variant]
      } ${focusRing} ${errorClasses} ${disabledClasses} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{children || 'Loading...'}</span>
        </>
      ) : isError ? (
        <>
          <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
