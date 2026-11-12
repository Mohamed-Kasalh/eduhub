import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { onNetworkIssue } from '../../api/errors';
import { useApp } from '../../context/AppContext';

export const OfflineBanner: React.FC = () => {
  const { addToast } = useApp();
  const queryClient = useQueryClient();
  const [browserOffline, setBrowserOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [apiNetworkError, setApiNetworkError] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setBrowserOffline(false);
      setApiNetworkError(false);
      void queryClient.refetchQueries({ type: 'active' });
    };
    const handleOffline = () => setBrowserOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const unsubscribeNetwork = onNetworkIssue((offline) => {
      setApiNetworkError(offline);
    });
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeNetwork();
    };
  }, [queryClient]);

  if (!browserOffline && !apiNetworkError) return null;

  const handleRetry = async () => {
    const nowOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setBrowserOffline(!nowOnline);
    if (!nowOnline) {
      addToast({
        title: 'Still offline',
        message: 'Check your internet connection and try again.',
        variant: 'warning',
      });
      return;
    }

    setApiNetworkError(false);
    await queryClient.refetchQueries({ type: 'active' });
    addToast({
      title: 'Retrying connection',
      message: 'Refreshing active workspace data.',
      variant: 'info',
    });
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
            {browserOffline
              ? "You're offline. Some features may not work."
              : 'Network connection interrupted while reaching EduHub servers.'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void handleRetry()}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-white/10 hover:bg-white/20 text-white font-bold text-[12px] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
};
