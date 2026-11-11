import React, { useState } from 'react';
import {
  ChevronDown,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react';
import { Button, ComponentVisualState } from './Button';
import { ToastMessage, ToastVariant } from '../../context/AppContext';
import { EmptyState } from './DataDisplay';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  content?: React.ReactNode;
}

export const Tabs: React.FC<{
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  forceState?: ComponentVisualState;
  className?: string;
}> = ({ tabs, activeTab, onChange, forceState, className = '' }) => {
  const isDisabled = forceState === 'disabled';
  const isError = forceState === 'error';
  const isLoading = forceState === 'loading';

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        role="tablist"
        className={`inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-[12px] bg-[#F3EFFF] border ${
          isError ? 'border-[#DC2626]' : 'border-[#E6E1F5]'
        } ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {tabs.map((tab, idx) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={`h-9 px-4 rounded-[10px] text-[14px] font-semibold inline-flex items-center gap-2 transition-all cursor-pointer ${
                active
                  ? 'bg-white text-[#6D4AE0] shadow-purple-sm'
                  : 'text-[#5F5B75] hover:text-[#1E1B2E] hover:bg-white/60'
              } ${forceState === 'focus' && idx === 0 ? 'ring-2 ring-[#6D4AE0]' : ''} ${
                forceState === 'hover' && idx === 1 ? 'bg-white/80 text-[#1E1B2E]' : ''
              }`}
            >
              {isLoading && active && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`px-2 py-0.5 text-[12px] rounded-full ${
                    active ? 'bg-[#F3EFFF] text-[#6D4AE0]' : 'bg-white text-[#5F5B75]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {isError && (
        <p className="text-[12px] text-[#DC2626] font-medium">
          Could not load tab content. Refresh or select another tab.
        </p>
      )}
      {tabs.find((t) => t.id === activeTab)?.content && (
        <div className="pt-1">{tabs.find((t) => t.id === activeTab)?.content}</div>
      )}
    </div>
  );
};

export interface AccordionItem {
  id: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

export const Accordion: React.FC<{
  items: AccordionItem[];
  defaultOpenId?: string;
  forceState?: ComponentVisualState;
  className?: string;
}> = ({ items, defaultOpenId, forceState, className = '' }) => {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? items[0]?.id ?? null);
  const isDisabled = forceState === 'disabled';
  const isError = forceState === 'error';
  const isLoading = forceState === 'loading';

  return (
    <div
      className={`space-y-2.5 ${isDisabled ? 'opacity-55 pointer-events-none' : ''} ${className}`}
    >
      {items.map((item, idx) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className={`rounded-[12px] bg-white border transition-all overflow-hidden ${
              isError && idx === 0
                ? 'border-[#DC2626] bg-[#FEF2F2]/30'
                : isOpen
                ? 'border-[#A78BFA] shadow-purple-sm'
                : 'border-[#E6E1F5] hover:border-[#A78BFA]'
            } ${forceState === 'focus' && idx === 0 ? 'ring-3 ring-[#A78BFA]/45' : ''}`}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF8FF] transition-colors"
            >
              <div>
                <h4 className="font-display font-semibold text-[18px] text-[#1E1B2E]">
                  {item.title}
                </h4>
                {item.subtitle && (
                  <p className="text-[14px] text-[#5F5B75]">{item.subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isLoading && idx === 0 && (
                  <Loader2 className="w-4 h-4 text-[#6D4AE0] animate-spin" />
                )}
                <ChevronDown
                  className={`w-5 h-5 text-[#6D4AE0] transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>
            {isOpen && (
              <div className="px-5 pb-4 pt-1 text-[16px] text-[#5F5B75] border-t border-[#E6E1F5]/70">
                {isError && idx === 0 ? (
                  <p className="text-[#DC2626] text-[14px] font-medium">
                    Failed to load lesson list for this module. Click to retry.
                  </p>
                ) : (
                  item.content
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  forceState,
  emptyTitle = 'No records match your filters',
  emptyDescription = 'Try clearing your search query or adjusting the status filter.',
  onRetry,
}: {
  columns: TableColumn<T>[];
  data: T[];
  forceState?: ComponentVisualState;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
}) {
  const isLoading = forceState === 'loading';
  const isError = forceState === 'error';
  const isDisabled = forceState === 'disabled';

  if (isError) {
    return (
      <div className="rounded-[12px] bg-[#FEF2F2] border border-[#DC2626]/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-[#DC2626] shrink-0" />
          <div>
            <h4 className="font-display font-bold text-[18px] text-[#1E1B2E]">
              Could not load table records
            </h4>
            <p className="text-[14px] text-[#5F5B75]">
              The server took too long to respond. Check your network and reload the table.
            </p>
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={onRetry}>
          Reload table
        </Button>
      </div>
    );
  }

  if (!isLoading && data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel="Reset filters"
        onAction={onRetry}
      />
    );
  }

  return (
    <div
      className={`rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm overflow-hidden ${
        isDisabled ? 'opacity-55 pointer-events-none' : ''
      } ${forceState === 'focus' ? 'ring-3 ring-[#A78BFA]/45' : ''}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F3EFFF]/70 border-b border-[#E6E1F5] text-[14px] font-semibold text-[#1E1B2E]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3.5 px-4 ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E1F5] text-[14px]">
            {isLoading
              ? Array.from({ length: 4 }).map((_, rIdx) => (
                  <tr key={rIdx}>
                    {columns.map((col) => (
                      <td key={col.key} className="py-4 px-4">
                        <div className="h-4 w-3/4 rounded-full bg-[#F3EFFF] animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.map((row, rIdx) => (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      forceState === 'hover' && rIdx === 0
                        ? 'bg-[#F3EFFF]/65'
                        : 'hover:bg-[#FAF8FF]'
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`py-3.5 px-4 text-[#1E1B2E] ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, description, children, footer }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B2E]/50 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-6 py-4 border-b border-[#E6E1F5] flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-[24px] text-[#1E1B2E]">{title}</h3>
            {description && <p className="text-[14px] text-[#5F5B75] mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[10px] text-[#5F5B75] hover:text-[#1E1B2E] hover:bg-[#F3EFFF] cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 text-[16px] text-[#1E1B2E] max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 bg-[#FAF8FF] border-t border-[#E6E1F5] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  side?: 'left' | 'right';
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, side = 'right', children, footer }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-[#1E1B2E]/50 backdrop-blur-xs">
      <div className="flex-1" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-md bg-white h-full shadow-purple-lg border-[#E6E1F5] flex flex-col justify-between ${
          side === 'left' ? 'order-first border-r' : 'border-l'
        }`}
      >
        <div className="px-6 py-4 border-b border-[#E6E1F5] flex items-center justify-between">
          <h3 className="font-display font-bold text-[22px] text-[#1E1B2E]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[10px] text-[#5F5B75] hover:text-[#1E1B2E] hover:bg-[#F3EFFF] cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 bg-[#FAF8FF] border-t border-[#E6E1F5] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const ToastCard: React.FC<{
  title: string;
  message?: string;
  variant?: ToastVariant;
  onDismiss?: () => void;
  forceState?: ComponentVisualState;
}> = ({ title, message, variant = 'success', onDismiss, forceState }) => {
  const styles: Record<ToastVariant, { border: string; icon: React.ReactNode; bg: string }> = {
    success: {
      border: 'border-[#16A34A]/30',
      bg: 'bg-white',
      icon: <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />,
    },
    warning: {
      border: 'border-[#F59E0B]/40',
      bg: 'bg-white',
      icon: <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0" />,
    },
    danger: {
      border: 'border-[#DC2626]/35',
      bg: 'bg-white',
      icon: <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />,
    },
    info: {
      border: 'border-[#2563EB]/30',
      bg: 'bg-white',
      icon: <Info className="w-5 h-5 text-[#2563EB] shrink-0" />,
    },
  };

  const activeVariant = forceState === 'error' ? 'danger' : variant;
  const s = styles[activeVariant];

  return (
    <div
      className={`rounded-[12px] ${s.bg} border ${s.border} shadow-purple-md p-4 flex items-start gap-3 min-w-[280px] max-w-md ${
        forceState === 'disabled' ? 'opacity-50' : ''
      } ${forceState === 'focus' ? 'ring-2 ring-[#6D4AE0]' : ''}`}
    >
      {forceState === 'loading' ? (
        <Loader2 className="w-5 h-5 text-[#6D4AE0] animate-spin shrink-0 mt-0.5" />
      ) : (
        <span className="mt-0.5">{s.icon}</span>
      )}
      <div className="flex-1 text-left">
        <p className="text-[14px] font-bold text-[#1E1B2E]">{title}</p>
        {message && <p className="text-[12px] text-[#5F5B75] mt-0.5">{message}</p>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-[#5F5B75] hover:text-[#1E1B2E] p-1 rounded-md cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export const ToastViewport: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard
            title={t.title}
            message={t.message}
            variant={t.variant}
            onDismiss={() => onDismiss(t.id)}
          />
        </div>
      ))}
    </div>
  );
};
