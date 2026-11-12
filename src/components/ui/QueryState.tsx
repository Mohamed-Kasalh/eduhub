import React from 'react';
import { AlertCircle, Lock, RefreshCw, SearchX } from 'lucide-react';
import { Button } from './Button';
import { getErrorMessage, isForbiddenError, isNotFoundError } from '../../api/errors';

export interface QueryErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

/** Displays a structured error, 403, or 404 card with an inline Retry action for React Query failures. */
export const QueryErrorState: React.FC<QueryErrorStateProps> = ({
  error,
  title,
  onRetry,
  compact = false,
  className = '',
}) => {
  const is404 = isNotFoundError(error);
  const is403 = isForbiddenError(error);
  const message = getErrorMessage(error, 'We could not load this content right now.');

  const resolvedTitle =
    title ??
    (is404
      ? 'Resource not found'
      : is403
      ? 'Access restricted'
      : 'Unable to load data');

  const Icon = is404 ? SearchX : is403 ? Lock : AlertCircle;

  if (compact) {
    return (
      <div
        role="alert"
        className={`rounded-[12px] bg-[#FEF2F2] border border-[#DC2626]/25 p-3.5 flex flex-wrap items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <Icon className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#1E1B2E]">{resolvedTitle}</p>
            <p className="text-[12px] text-[#5F5B75] break-words">{message}</p>
          </div>
        </div>
        {onRetry && !is403 && !is404 && (
          <Button
            type="button"
            size="sm"
            variant="danger"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={onRetry}
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`rounded-[12px] bg-white border border-[#DC2626]/25 shadow-purple-sm p-6 sm:p-8 text-center flex flex-col items-center gap-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[#FEF2F2] border border-[#DC2626]/20 text-[#DC2626] flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="font-display font-bold text-[20px] text-[#1E1B2E]">{resolvedTitle}</h3>
        <p className="text-[14px] text-[#5F5B75] leading-relaxed">{message}</p>
      </div>
      {onRetry && !is403 && !is404 && (
        <Button
          type="button"
          size="md"
          variant="primary"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </div>
  );
};
