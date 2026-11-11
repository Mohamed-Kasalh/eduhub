import React from 'react';
import { Sparkles, Award, Loader2, AlertCircle } from 'lucide-react';
import { ComponentVisualState } from './Button';

export type ChipVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'orange'
  | 'gold';

export interface StatusChipProps {
  label: string;
  variant?: ChipVariant;
  dot?: boolean;
  forceState?: ComponentVisualState;
  onClick?: () => void;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  label,
  variant = 'primary',
  dot = true,
  forceState,
  onClick,
  className = '',
}) => {
  const isLoading = forceState === 'loading';
  const isDisabled = forceState === 'disabled';
  const isError = forceState === 'error';
  const isHovered = forceState === 'hover';
  const isFocused = forceState === 'focus';

  const palette: Record<ChipVariant, string> = {
    primary: 'bg-[#F3EFFF] text-[#6D4AE0] border-[#E6E1F5]',
    success: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25',
    warning: 'bg-[#F59E0B]/12 text-[#B45309] border-[#F59E0B]/30',
    danger: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/25',
    info: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25',
    neutral: 'bg-white text-[#5F5B75] border-[#E6E1F5]',
    orange: 'bg-[#F59E3B]/15 text-[#B45309] border-[#F59E3B]/35',
    gold: 'bg-[#F5B82E]/20 text-[#92400E] border-[#F5B82E]/40',
  };

  const stateClasses = isDisabled
    ? 'opacity-50 cursor-not-allowed'
    : isError
    ? '!bg-[#FEF2F2] !text-[#DC2626] !border-[#DC2626] ring-2 ring-[#DC2626]/25'
    : isFocused
    ? 'ring-2 ring-[#6D4AE0] ring-offset-1'
    : isHovered
    ? 'brightness-95 shadow-purple-sm scale-[1.02]'
    : onClick
    ? 'hover:brightness-95 cursor-pointer'
    : '';

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !isDisabled ? 0 : undefined}
      onClick={!isDisabled ? onClick : undefined}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold border transition-all ${palette[variant]} ${stateClasses} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isError ? (
        <AlertCircle className="w-3 h-3 text-[#DC2626]" />
      ) : dot ? (
        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      ) : null}
      <span>{label}</span>
    </span>
  );
};

/**
 * Signature Die-Cut Sticker Tag — used strictly on "Featured" tags
 * White outer outline + thin dashed inner stroke
 */
export const FeaturedStickerTag: React.FC<{
  label?: string;
  className?: string;
}> = ({ label = 'Featured', className = '' }) => {
  return (
    <span
      className={`sticker-tag bg-[#F5B82E] text-[#1E1B2E] px-3 py-1 text-[12px] font-bold select-none ${className}`}
    >
      <Sparkles className="w-3.5 h-3.5 text-[#3F2A9E] shrink-0" />
      <span>{label}</span>
    </span>
  );
};

/**
 * Signature Die-Cut Sticker Badge — used strictly on Achievement Badges
 * White outer outline + thin dashed inner stroke
 */
export const AchievementStickerBadge: React.FC<{
  title: string;
  subtitle?: string;
  color?: 'purple' | 'gold' | 'orange' | 'green';
  earned?: boolean;
  className?: string;
}> = ({ title, subtitle, color = 'purple', earned = true, className = '' }) => {
  const colorMap = {
    purple: 'bg-[#F3EFFF] text-[#3F2A9E] border-[#6D4AE0]',
    gold: 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]',
    orange: 'bg-[#FFEDD5] text-[#9A3412] border-[#F59E3B]',
    green: 'bg-[#DCFCE7] text-[#166534] border-[#16A34A]',
  };

  return (
    <div
      className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-[12px] border-[1.5px] border-dashed shadow-[0_0_0_3.5px_#FFFFFF,0_6px_16px_rgba(109,74,224,0.16)] ${
        colorMap[color]
      } ${!earned ? 'opacity-55 grayscale' : ''} ${className}`}
    >
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xs shrink-0">
        <Award className="w-4 h-4 text-[#6D4AE0]" />
      </div>
      <div className="flex flex-col text-left">
        <span className="font-display font-bold text-[15px] leading-tight">{title}</span>
        {subtitle && <span className="text-[12px] opacity-85">{subtitle}</span>}
      </div>
    </div>
  );
};
