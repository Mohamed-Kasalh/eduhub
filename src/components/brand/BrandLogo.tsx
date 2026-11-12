import React from 'react';
import { Link } from 'react-router';
import { handleImageError } from '../../utils/imageFallback';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  chip?: boolean;
  to?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<BrandLogoProps['size']>, string> = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

/**
 * Renders the official EduHub logo exactly as provided:
 * - Never redrawn, recolored, or stretched (uses object-contain on a 1:1 box)
 * - Placed strictly on white or light surfaces, never on purple backgrounds
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  chip = false,
  to = '/',
  className = '',
}) => {
  const content = (
    <div
      className={`inline-flex items-center gap-2.5 ${
        chip
          ? 'bg-white px-3.5 py-2 rounded-[12px] border border-[#E6E1F5] shadow-purple-sm'
          : 'bg-white/95 px-2 py-1 rounded-[10px]'
      } ${className}`}
    >
      <img
        src="/eduhub-logo.png"
        alt="EduHub logo"
        onError={handleImageError}
        className={`${SIZE_CLASSES[size]} object-contain shrink-0 select-none`}
        draggable={false}
      />
      {showText && (
        <div className="flex flex-col leading-none pr-1">
          <span className="font-display font-bold text-[22px] tracking-tight text-[#1E1B2E]">
            Edu<span className="text-[#6D4AE0]">Hub</span>
          </span>
          <span className="text-[12px] text-[#5F5B75] font-medium">
            Learn without limits
          </span>
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4AE0] rounded-[12px]"
      >
        {content}
      </Link>
    );
  }

  return content;
};

interface CatMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  mood?: 'empty' | 'success' | '404';
  className?: string;
}

const MASCOT_SIZES: Record<NonNullable<CatMascotProps['size']>, string> = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-40 h-40',
};

/**
 * Circular crop of the EduHub cat mascot.
 * Used strictly in empty states, success screens, and the 404 page.
 */
export const CatMascot: React.FC<CatMascotProps> = ({
  size = 'lg',
  mood = 'empty',
  className = '',
}) => {
  const ringStyle =
    mood === 'success'
      ? 'border-[#16A34A]/30 shadow-[0_0_0_4px_#FFFFFF,0_8px_24px_rgba(22,163,74,0.18)]'
      : mood === '404'
      ? 'border-[#F59E3B]/40 shadow-[0_0_0_4px_#FFFFFF,0_8px_24px_rgba(245,158,59,0.2)]'
      : 'border-[#E6E1F5] shadow-[0_0_0_4px_#FFFFFF,0_8px_24px_rgba(109,74,224,0.15)]';

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-white border-2 ${ringStyle} ${MASCOT_SIZES[size]} shrink-0 select-none ${className}`}
      title="EduHub mascot"
    >
      <img
        src="/eduhub-logo.png"
        alt="EduHub cat mascot"
        onError={handleImageError}
        className="w-full h-full object-cover object-[50%_24%] scale-[1.35]"
        draggable={false}
      />
    </div>
  );
};
