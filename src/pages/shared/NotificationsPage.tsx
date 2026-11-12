import React, { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Bell,
  BookOpen,
  FileCheck2,
  Award,
  ShieldAlert,
  Info,
  CheckCheck,
  Check,
  Trash2,
  MailOpen,
} from 'lucide-react';
import {
  Breadcrumbs,
  Button,
  EmptyState,
  Pagination,
  QueryErrorState,
  Skeleton,
  StatusChip,
  Tabs,
} from '../../components/ui';
import type { NotificationItem, NotificationTypeDto } from '../../api/dto-types-bridge';
import {
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotifications,
  useToggleNotificationReadMutation,
} from '../../api/hooks/useProfileAndNotifications';

type NotificationTypeFilter = 'all' | NotificationItem['type'];
type NotificationReadTab = 'all' | 'unread';

const ITEMS_PER_PAGE = 8;

const TYPE_META: Record<
  NotificationItem['type'],
  { label: string; icon: React.ReactNode; chipClass: string }
> = {
  course: {
    label: 'Courses',
    icon: <BookOpen className="w-4 h-4" />,
    chipClass: 'bg-[#F3EFFF] text-[#6D4AE0]',
  },
  exam: {
    label: 'Exams',
    icon: <FileCheck2 className="w-4 h-4" />,
    chipClass: 'bg-[#2563EB]/10 text-[#2563EB]',
  },
  certificate: {
    label: 'Certificates',
    icon: <Award className="w-4 h-4" />,
    chipClass: 'bg-[#16A34A]/10 text-[#16A34A]',
  },
  moderation: {
    label: 'Moderation',
    icon: <ShieldAlert className="w-4 h-4" />,
    chipClass: 'bg-[#F59E0B]/15 text-[#B45309]',
  },
  system: {
    label: 'System',
    icon: <Info className="w-4 h-4" />,
    chipClass: 'bg-[#5F5B75]/10 text-[#5F5B75]',
  },
};

function getEmptyCopy(readTab: NotificationReadTab, typeFilter: NotificationTypeFilter): {
  title: string;
  description: string;
} {
  if (readTab === 'unread' && typeFilter === 'all') {
    return {
      title: 'No unread notifications',
      description: 'You have read every notification for your current workspace.',
    };
  }
  switch (typeFilter) {
    case 'course':
      return {
        title: readTab === 'unread' ? 'No unread course updates' : 'No course notifications',
        description: 'Lesson replies, syllabus updates, and enrollment alerts will appear here.',
      };
    case 'exam':
      return {
        title: readTab === 'unread' ? 'No unread exam alerts' : 'No exam notifications',
        description: 'Practice exam unlocks and final assessment scores will appear here.',
      };
    case 'certificate':
      return {
        title:
          readTab === 'unread' ? 'No unread certificate updates' : 'No certificate notifications',
        description: 'Verified graduate credential issuances and registry updates appear here.',
      };
    case 'moderation':
      return {
        title:
          readTab === 'unread' ? 'No unread moderation alerts' : 'No moderation notifications',
        description:
          'Course review queues and flagged comment alerts appear here for supervisors and admins.',
      };
    case 'system':
      return {
        title: readTab === 'unread' ? 'No unread system notices' : 'No system notifications',
        description: 'Platform maintenance updates and account security notices will appear here.',
      };
    default:
      return {
        title: 'You are all caught up',
        description: 'New course announcements, exam alerts, and replies will appear here.',
      };
  }
}

const VALID_NOTIFICATION_TYPES: ReadonlyArray<NotificationTypeDto> = [
  'course',
  'exam',
  'certificate',
  'moderation',
  'system',
];

function parseTypeParam(raw: string | null): NotificationTypeFilter {
  if (raw && (VALID_NOTIFICATION_TYPES as ReadonlyArray<string>).includes(raw)) {
    return raw as NotificationTypeDto;
  }
  return 'all';
}

function parsePageParam(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export const NotificationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const readTab: NotificationReadTab =
    searchParams.get('status') === 'unread' ? 'unread' : 'all';
  const typeFilter = parseTypeParam(searchParams.get('type'));
  const currentPage = parsePageParam(searchParams.get('page'));

  const notificationsQuery = useNotifications({
    status: readTab,
    type: typeFilter,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });
  const summaryQuery = useNotifications({ status: 'all', type: 'all', page: 1, limit: 1 });

  const markReadMutation = useMarkNotificationReadMutation();
  const toggleReadMutation = useToggleNotificationReadMutation();
  const markAllMutation = useMarkAllNotificationsReadMutation();
  const deleteMutation = useDeleteNotificationMutation();

  const items = notificationsQuery.data?.items ?? [];
  const meta = notificationsQuery.data?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const totalFiltered = meta?.total ?? items.length;
  const unreadCount = meta?.unreadCount ?? summaryQuery.data?.meta.unreadCount ?? 0;
  const totalAllCount = summaryQuery.data?.meta.total ?? totalFiltered;

  const updateParams = (patch: {
    status?: NotificationReadTab;
    type?: NotificationTypeFilter;
    page?: number;
  }) => {
    const next = new URLSearchParams(searchParams);
    const nextStatus = patch.status ?? readTab;
    const nextType = patch.type ?? typeFilter;
    const nextPage = patch.page ?? currentPage;

    if (nextStatus === 'all') next.delete('status');
    else next.set('status', nextStatus);

    if (nextType === 'all') next.delete('type');
    else next.set('type', nextType);

    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));

    setSearchParams(next);
  };

  useEffect(() => {
    if (meta && currentPage > totalPages) {
      const next = new URLSearchParams(searchParams);
      if (totalPages <= 1) next.delete('page');
      else next.set('page', String(totalPages));
      setSearchParams(next, { replace: true });
    }
  }, [meta, currentPage, totalPages, searchParams, setSearchParams]);

  const handleSelectReadTab = (tabId: string) => {
    updateParams({ status: tabId === 'unread' ? 'unread' : 'all', page: 1 });
  };

  const handleSelectType = (nextType: NotificationTypeFilter) => {
    updateParams({ type: nextType, page: 1 });
  };

  const handleDelete = (id: string, title: string) => {
    deleteMutation.mutate({ notificationId: id, title });
  };

  const emptyCopy = useMemo(() => getEmptyCopy(readTab, typeFilter), [readTab, typeFilter]);
  const isFiltered = readTab !== 'all' || typeFilter !== 'all';

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs items={[{ label: 'Notifications' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[34px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
            Notifications
          </h1>
          <p className="text-[16px] text-[#5F5B75]">
            Course replies, exam results, certificates, moderation queues, and system updates.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={markAllMutation.isPending}
          disabled={unreadCount === 0 || markAllMutation.isPending}
          leftIcon={<CheckCheck className="w-4 h-4" />}
          onClick={() => markAllMutation.mutate()}
        >
          Mark all as read
        </Button>
      </div>

      {/* All / Unread tabs + Type filter chips */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 sm:p-5 shadow-purple-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: 'all', label: 'All', count: totalAllCount },
              { id: 'unread', label: 'Unread', count: unreadCount },
            ]}
            activeTab={readTab}
            onChange={handleSelectReadTab}
          />
          <p className="text-[13px] font-semibold text-[#5F5B75]">
            Showing {totalFiltered} {totalFiltered === 1 ? 'notification' : 'notifications'}
            {notificationsQuery.isFetching && !notificationsQuery.isLoading ? ' • Updating…' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E6E1F5]">
          <button
            type="button"
            onClick={() => handleSelectType('all')}
            className={`h-9 px-3.5 rounded-full text-[13px] font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              typeFilter === 'all'
                ? 'bg-[#6D4AE0] text-white border-[#6D4AE0] shadow-purple-sm'
                : 'bg-[#FAF8FF] text-[#5F5B75] border-[#E6E1F5] hover:border-[#A78BFA] hover:text-[#1E1B2E]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>All types</span>
          </button>
          {(Object.keys(TYPE_META) as Array<NotificationItem['type']>).map((key) => {
            const metaInfo = TYPE_META[key];
            const active = typeFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectType(key)}
                className={`h-9 px-3.5 rounded-full text-[13px] font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#6D4AE0] text-white border-[#6D4AE0] shadow-purple-sm'
                    : 'bg-white text-[#5F5B75] border-[#E6E1F5] hover:border-[#A78BFA] hover:text-[#1E1B2E]'
                }`}
              >
                {metaInfo.icon}
                <span>{metaInfo.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {notificationsQuery.isLoading ? (
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-5 shadow-purple-sm space-y-4">
          <Skeleton variant="text" className="h-20 w-full" />
          <Skeleton variant="text" className="h-20 w-full" />
          <Skeleton variant="text" className="h-20 w-full" />
          <Skeleton variant="text" className="h-20 w-full" />
        </div>
      ) : notificationsQuery.isError && !notificationsQuery.data ? (
        <QueryErrorState
          error={notificationsQuery.error}
          title="Could not load notifications"
          onRetry={() => void notificationsQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={emptyCopy.title}
          description={emptyCopy.description}
          actionLabel={isFiltered ? 'Show all notifications' : 'Browse courses'}
          onAction={
            isFiltered
              ? () => {
                  updateParams({ status: 'all', type: 'all', page: 1 });
                }
              : undefined
          }
          actionTo={isFiltered ? undefined : '/courses'}
        />
      ) : (
        <div className="space-y-5">
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm divide-y divide-[#E6E1F5]">
            {items.map((n) => {
              const typeInfo = TYPE_META[n.type];
              const isTogglingThis =
                toggleReadMutation.isPending &&
                toggleReadMutation.variables?.notificationId === n.id;
              const isDeletingThis =
                deleteMutation.isPending && deleteMutation.variables?.notificationId === n.id;
              return (
                <div
                  key={n.id}
                  className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    !n.read ? 'bg-[#F3EFFF]/40' : 'hover:bg-[#FAF8FF]'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${typeInfo.chipClass}`}
                    >
                      {typeInfo.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[17px] font-display font-bold text-[#1E1B2E]">
                          {n.title}
                        </h2>
                        <StatusChip label={typeInfo.label} variant="neutral" dot={false} />
                        {!n.read && <StatusChip label="Unread" variant="primary" />}
                      </div>
                      <p className="text-[14px] text-[#5F5B75] mt-1">{n.message}</p>
                      <p className="text-[12px] text-[#5F5B75]/80 mt-1">{n.createdAt}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={isTogglingThis}
                      disabled={isTogglingThis || isDeletingThis}
                      leftIcon={
                        n.read ? (
                          <MailOpen className="w-3.5 h-3.5" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )
                      }
                      onClick={() =>
                        toggleReadMutation.mutate({
                          notificationId: n.id,
                          currentlyRead: n.read,
                        })
                      }
                    >
                      {n.read ? 'Mark as unread' : 'Mark as read'}
                    </Button>
                    <Link
                      to={n.link}
                      onClick={() => {
                        if (!n.read) {
                          markReadMutation.mutate(n.id);
                        }
                      }}
                    >
                      <Button size="sm" variant="secondary">
                        Open item
                      </Button>
                    </Link>
                    <button
                      type="button"
                      disabled={isDeletingThis}
                      onClick={() => handleDelete(n.id, n.title)}
                      aria-label={`Delete notification: ${n.title}`}
                      className="h-9 w-9 rounded-[10px] border border-[#E6E1F5] text-[#5F5B75] hover:text-[#DC2626] hover:border-[#DC2626]/40 hover:bg-[#FEF2F2] disabled:opacity-45 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[13px] text-[#5F5B75]">
                Page {currentPage} of {totalPages} ({totalFiltered} total)
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => updateParams({ page })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
