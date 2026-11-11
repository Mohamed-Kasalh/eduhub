import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const OfflineBanner: React.FC = () => {
  const { addToast } = useApp();
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  const handleRetry = () => {
    const nowOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOnline(nowOnline);
    if (nowOnline) {
      addToast({
        title: 'Connection restored',
        message: 'You are back online.',
        variant: 'success',
      });
    } else {
      addToast({
        title: 'Still offline',
        message: 'Check your internet connection and try again.',
        variant: 'warning',
      });
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[70] w-full bg-[#1E1B2E] text-white border-b border-[#F59E0B]/50 px-4 py-2.5 shadow-purple-md"
    >
      <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-3 text-[13px] sm:text-[14px]">
        <div className="flex items-center gap-2.5">
          <WifiOff className="w-4 h-4 text-[#F5B82E] shrink-0" />
          <span className="font-semibold">
            You&apos;re offline. Some features may not work.
          </span>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-white/10 hover:bg-white/20 text-white font-bold text-[12px] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
};
