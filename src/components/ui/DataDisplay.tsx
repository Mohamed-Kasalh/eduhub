import React from 'react';
import { Link } from 'react-router';
import {
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Home,
} from 'lucide-react';
import { Button, ComponentVisualState } from './Button';
import { CatMascot } from '../brand/BrandLogo';

export interface ProgressBarProps {
  value: number;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'orange' | 'gold' | 'danger';
  forceState?: ComponentVisualState;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  showValue = true,
  size = 'md',
  color = 'primary',
  forceState,
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const isLoading = forceState === 'loading';
  const isError = forceState === 'error';
  const isDisabled = forceState === 'disabled';
  const isHovered = forceState === 'hover';
  const isFocused = forceState === 'focus';

  const heightMap = {
    sm: 'h-2',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  const fillMap = {
    primary: 'bg-[#6D4AE0]',
    success: 'bg-[#16A34A]',
    orange: 'bg-[#F59E3B]',
    gold: 'bg-[#F5B82E]',
    danger: 'bg-[#DC2626]',
  };

  return (
    <div
      className={`flex flex-col gap-1.5 ${isDisabled ? 'opacity-50' : ''} ${
        isFocused ? 'ring-2 ring-[#A78BFA] rounded-[8px] p-1' : ''
      } ${className}`}
    >
      {(label || showValue) && (
        <div className="flex items-center justify-between text-[14px]">
          {label && <span className="font-semibold text-[#1E1B2E]">{label}</span>}
          {showValue && (
            <span
              className={`font-display font-bold ${
                isError ? 'text-[#DC2626]' : 'text-[#6D4AE0]'
              }`}
            >
              {isLoading ? 'Syncing...' : isError ? 'Sync failed' : `${clamped}%`}
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full bg-[#F3EFFF] rounded-full overflow-hidden border border-[#E6E1F5] ${
          heightMap[size]
        } ${isHovered ? 'shadow-purple-sm' : ''}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isError ? 'bg-[#DC2626]' : fillMap[color]
          } ${isLoading ? 'animate-pulse w-2/3' : ''}`}
          style={!isLoading ? { width: `${clamped}%` } : undefined}
        />
      </div>
      {isError && (
        <span className="text-[12px] text-[#DC2626]">
          Progress could not be saved. Check your connection and retry.
        </span>
      )}
    </div>
  );
};

export interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  forceState?: ComponentVisualState;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 84,
  strokeWidth = 8,
  label,
  forceState,
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const isError = forceState === 'error';
  const isLoading = forceState === 'loading';
  const isDisabled = forceState === 'disabled';
  const isFocused = forceState === 'focus';
  const isHovered = forceState === 'hover';

  const strokeColor = isError
    ? '#DC2626'
    : clamped === 100
    ? '#16A34A'
    : '#6D4AE0';

  return (
    <div
      className={`inline-flex flex-col items-center gap-1.5 ${
        isDisabled ? 'opacity-50' : ''
      } ${isFocused ? 'ring-3 ring-[#A78BFA] rounded-full p-1' : ''} ${
        isHovered ? 'scale-105 transition-transform' : ''
      }`}
    >
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#F3EFFF"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={isLoading ? circumference * 0.6 : offset}
            strokeLinecap="round"
            className={isLoading ? 'animate-spin origin-center' : 'transition-all duration-300'}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isError ? (
            <AlertCircle className="w-5 h-5 text-[#DC2626]" />
          ) : (
            <span className="font-display font-bold text-[18px] text-[#1E1B2E]">
              {clamped}%
            </span>
          )}
        </div>
      </div>
      {label && <span className="text-[12px] font-medium text-[#5F5B75]">{label}</span>}
    </div>
  );
};

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'busy' | 'offline';
  forceState?: ComponentVisualState;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  status,
  forceState,
  className = '',
}) => {
  const [imgError, setImgError] = React.useState(false);
  const isLoading = forceState === 'loading';
  const isError = forceState === 'error' || imgError;
  const isDisabled = forceState === 'disabled';
  const isFocused = forceState === 'focus';
  const isHovered = forceState === 'hover';

  const sizeMap = {
    sm: 'w-8 h-8 text-[12px]',
    md: 'w-10 h-10 text-[14px]',
    lg: 'w-12 h-12 text-[16px]',
    xl: 'w-16 h-16 text-[20px]',
  };

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  const statusColor = {
    online: 'bg-[#16A34A]',
    busy: 'bg-[#F59E0B]',
    offline: 'bg-[#5F5B75]',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 select-none ${
        sizeMap[size]
      } ${isDisabled ? 'opacity-50 grayscale' : ''} ${
        isFocused ? 'ring-3 ring-[#6D4AE0] ring-offset-2' : ''
      } ${isHovered ? 'ring-2 ring-[#A78BFA] shadow-purple-sm' : ''} ${
        isError ? 'ring-2 ring-[#DC2626] bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#F3EFFF] text-[#3F2A9E]'
      } border border-[#E6E1F5] font-display font-bold ${className}`}
      title={name}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 text-[#6D4AE0] animate-spin" />
      ) : src && !isError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColor[status]}`}
        />
      )}
    </div>
  );
};

export const Skeleton: React.FC<{
  variant?: 'text' | 'title' | 'circle' | 'card';
  className?: string;
}> = ({ variant = 'text', className = '' }) => {
  if (variant === 'card') {
    return (
      <div
        className={`rounded-[12px] bg-white border border-[#E6E1F5] p-4 space-y-3 shadow-purple-sm ${className}`}
      >
        <div className="h-40 w-full rounded-[10px] bg-[#F3EFFF] animate-pulse" />
        <div className="h-4 w-1/3 rounded-full bg-[#F3EFFF] animate-pulse" />
        <div className="h-5 w-4/5 rounded-full bg-[#F3EFFF] animate-pulse" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-8 w-24 rounded-[10px] bg-[#F3EFFF] animate-pulse" />
          <div className="h-8 w-16 rounded-[10px] bg-[#F3EFFF] animate-pulse" />
        </div>
      </div>
    );
  }
  if (variant === 'circle') {
    return <div className={`w-10 h-10 rounded-full bg-[#F3EFFF] animate-pulse ${className}`} />;
  }
  if (variant === 'title') {
    return <div className={`h-7 w-56 rounded-[8px] bg-[#F3EFFF] animate-pulse ${className}`} />;
  }
  return <div className={`h-4 w-full rounded-[6px] bg-[#F3EFFF] animate-pulse ${className}`} />;
};

/**
 * EmptyState uses the circular cropped CatMascot (one of the 3 allowed places: empty states, success screens, 404)
 */
export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionTo?: string;
  mood?: 'empty' | 'success';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  actionTo,
  mood = 'empty',
  className = '',
}) => {
  return (
    <div
      className={`rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm p-8 text-center flex flex-col items-center max-w-lg mx-auto ${className}`}
    >
      <CatMascot size="lg" mood={mood} className="mb-4" />
      <h3 className="text-[24px] font-display font-semibold text-[#1E1B2E] mb-2">{title}</h3>
      <p className="text-[16px] text-[#5F5B75] mb-6 max-w-md">{description}</p>
      {actionLabel &&
        (actionTo ? (
          <Link to={actionTo}>
            <Button variant="primary">{actionLabel}</Button>
          </Link>
        ) : (
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        ))}
    </div>
  );
};

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export const Breadcrumbs: React.FC<{
  items: BreadcrumbItem[];
  forceState?: ComponentVisualState;
  className?: string;
}> = ({ items, forceState, className = '' }) => {
  const isDisabled = forceState === 'disabled';

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center flex-wrap gap-1.5 text-[14px] ${
        isDisabled ? 'opacity-50 pointer-events-none' : ''
      } ${className}`}
    >
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-[#5F5B75] hover:text-[#6D4AE0] transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${idx}`}>
            <ChevronRight className="w-3.5 h-3.5 text-[#5F5B75]/60 shrink-0" />
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className={`text-[#5F5B75] hover:text-[#6D4AE0] transition-colors ${
                  forceState === 'hover' ? 'text-[#6D4AE0] underline' : ''
                } ${forceState === 'focus' ? 'ring-2 ring-[#A78BFA] rounded px-1' : ''}`}
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-[#1E1B2E]">{item.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  forceState?: ComponentVisualState;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  forceState,
}) => {
  const isDisabled = forceState === 'disabled';
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${
        isDisabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <button
        type="button"
        disabled={currentPage <= 1 || isDisabled}
        onClick={() => onPageChange(currentPage - 1)}
        className="h-10 px-3 rounded-[10px] border border-[#E6E1F5] bg-white text-[#1E1B2E] text-[14px] font-semibold inline-flex items-center gap-1 hover:border-[#A78BFA] hover:bg-[#F3EFFF] disabled:opacity-45 disabled:pointer-events-none cursor-pointer transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Previous</span>
      </button>
      {pages.map((p) => {
        const active = p === currentPage;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`w-10 h-10 rounded-[10px] text-[14px] font-semibold transition-all cursor-pointer ${
              active
                ? 'bg-[#6D4AE0] text-white shadow-purple-sm'
                : 'bg-white text-[#1E1B2E] border border-[#E6E1F5] hover:bg-[#F3EFFF] hover:border-[#A78BFA]'
            } ${forceState === 'focus' && active ? 'ring-3 ring-[#A78BFA]' : ''}`}
          >
            {p}
          </button>
        );
      })}
      <button
        type="button"
        disabled={currentPage >= totalPages || isDisabled}
        onClick={() => onPageChange(currentPage + 1)}
        className="h-10 px-3 rounded-[10px] border border-[#E6E1F5] bg-white text-[#1E1B2E] text-[14px] font-semibold inline-flex items-center gap-1 hover:border-[#A78BFA] hover:bg-[#F3EFFF] disabled:opacity-45 disabled:pointer-events-none cursor-pointer transition-all"
      >
        <span>Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
