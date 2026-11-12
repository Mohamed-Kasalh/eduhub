import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  BookOpen,
  Compass,
  FileCheck2,
  Award,
  User,
  PlusCircle,
  HelpCircle,
  Users,
  MessageSquare,
  FolderKanban,
  Settings,
  ShieldAlert,
  ClipboardCheck,
  Flag,
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  Sparkles,
  X,
  Info,
} from 'lucide-react';
import { BrandLogo } from '../brand/BrandLogo';
import { Avatar, SearchInput, StatusChip } from '../ui';
import { useApp } from '../../context/AppContext';
import { useAuth, useLogoutMutation } from '../../api/hooks/useAuth';
import type { NotificationItem, UserRole } from '../../data/mockData';
import { useDialogA11y } from '../../hooks/useDialogA11y';

function getNotificationIcon(type: NotificationItem['type']) {
  switch (type) {
    case 'course':
      return {
        icon: <BookOpen className="w-4 h-4" />,
        bg: 'bg-[#F3EFFF] text-[#6D4AE0]',
      };
    case 'exam':
      return {
        icon: <FileCheck2 className="w-4 h-4" />,
        bg: 'bg-[#2563EB]/10 text-[#2563EB]',
      };
    case 'certificate':
      return {
        icon: <Award className="w-4 h-4" />,
        bg: 'bg-[#16A34A]/10 text-[#16A34A]',
      };
    case 'moderation':
      return {
        icon: <ShieldAlert className="w-4 h-4" />,
        bg: 'bg-[#F59E0B]/15 text-[#B45309]',
      };
    case 'system':
    default:
      return {
        icon: <Info className="w-4 h-4" />,
        bg: 'bg-[#5F5B75]/10 text-[#5F5B75]',
      };
  }
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  matchPrefixes?: string[];
}

const ROLE_MENUS: Record<Exclude<UserRole, 'guest'>, NavItem[]> = {
  student: [
    { label: 'Dashboard', to: '/student/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    {
      label: 'My courses',
      to: '/student/courses',
      icon: <BookOpen className="w-5 h-5" />,
      matchPrefixes: ['/student/courses', '/student/progress', '/learn'],
    },
    { label: 'Browse courses', to: '/courses', icon: <Compass className="w-5 h-5" /> },
    {
      label: 'Exams',
      to: '/exam/course-1',
      icon: <FileCheck2 className="w-5 h-5" />,
      matchPrefixes: ['/exam'],
    },
    {
      label: 'Certificates',
      to: '/certificates',
      icon: <Award className="w-5 h-5" />,
      matchPrefixes: ['/certificates'],
    },
    { label: 'Profile', to: '/profile', icon: <User className="w-5 h-5" /> },
  ],
  instructor: [
    {
      label: 'Dashboard',
      to: '/instructor/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    { label: 'My courses', to: '/instructor/courses', icon: <BookOpen className="w-5 h-5" /> },
    {
      label: 'Create course',
      to: '/instructor/courses/new',
      icon: <PlusCircle className="w-5 h-5" />,
    },
    {
      label: 'Question bank',
      to: '/instructor/question-bank',
      icon: <HelpCircle className="w-5 h-5" />,
      matchPrefixes: ['/instructor/question-bank', '/instructor/exam-settings'],
    },
    { label: 'Students', to: '/instructor/students', icon: <Users className="w-5 h-5" /> },
    { label: 'Comments', to: '/instructor/comments', icon: <MessageSquare className="w-5 h-5" /> },
    { label: 'Profile', to: '/profile', icon: <User className="w-5 h-5" /> },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Users', to: '/admin/users', icon: <Users className="w-5 h-5" /> },
    { label: 'Courses', to: '/admin/courses', icon: <BookOpen className="w-5 h-5" /> },
    { label: 'Categories', to: '/admin/categories', icon: <FolderKanban className="w-5 h-5" /> },
    { label: 'Certificates', to: '/admin/certificates', icon: <Award className="w-5 h-5" /> },
    { label: 'Settings', to: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
  ],
  supervisor: [
    {
      label: 'Dashboard',
      to: '/supervisor/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: 'Comment moderation',
      to: '/supervisor/comments',
      icon: <ShieldAlert className="w-5 h-5" />,
    },
    {
      label: 'Course review',
      to: '/supervisor/course-review',
      icon: <ClipboardCheck className="w-5 h-5" />,
    },
    { label: 'Reports', to: '/supervisor/reports', icon: <Flag className="w-5 h-5" /> },
    { label: 'Profile', to: '/profile', icon: <User className="w-5 h-5" /> },
  ],
};

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    sidebarCollapsed: collapsed,
    setSidebarCollapsed: setCollapsed,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    searchQuery,
    setSearchQuery,
  } = useApp();
  const { role, user } = useAuth();
  const logoutMutation = useLogoutMutation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const mobileDrawerRef = useDialogA11y(mobileDrawerOpen, () => setMobileDrawerOpen(false));
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'all' | 'unread'>('all');

  const location = useLocation();
  const navigate = useNavigate();
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);

  const activeRole: Exclude<UserRole, 'guest'> = role === 'guest' ? 'student' : role;
  const activeUser = user ?? {
    name: 'EduHub User',
    email: '',
    avatar: '',
  };
  const menuItems = ROLE_MENUS[activeRole];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const popoverNotifications =
    notifTab === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  useEffect(() => {
    setMobileDrawerOpen(false);
    setAvatarMenuOpen(false);
    setNotifPopoverOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setNotifPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const isItemActive = (item: NavItem) => {
    if (location.pathname === item.to) return true;
    if (item.matchPrefixes) {
      return item.matchPrefixes.some((prefix) => location.pathname.startsWith(prefix));
    }
    return false;
  };

  const handleLogout = async () => {
    setAvatarMenuOpen(false);
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Handled inside useLogoutMutation (local session always cleared).
    } finally {
      navigate('/login');
    }
  };

  const renderSidebarLinks = (isCollapsedMode: boolean) => (
    <nav className="flex-1 px-3 py-4 space-y-1.5" aria-label={`${activeRole} navigation`}>
      {menuItems.map((item) => {
        const active = isItemActive(item);
        return (
          <div key={item.to} className="relative group">
            <Link
              to={item.to}
              title={isCollapsedMode ? item.label : undefined}
              className={`relative flex items-center ${
                isCollapsedMode ? 'justify-center px-2' : 'px-3.5 gap-3'
              } h-11 rounded-[10px] text-[15px] font-semibold transition-all ${
                active
                  ? 'bg-[#F3EFFF] text-[#6D4AE0]'
                  : 'text-[#5F5B75] hover:bg-[#FAF8FF] hover:text-[#1E1B2E]'
              }`}
            >
              {/* Active item primary left bar */}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#6D4AE0]"
                />
              )}
              <span className={`shrink-0 ${active ? 'text-[#6D4AE0]' : 'text-[#5F5B75]'}`}>
                {item.icon}
              </span>
              {!isCollapsedMode && <span className="truncate">{item.label}</span>}
            </Link>

            {/* Icon-only collapsed mode tooltip */}
            {isCollapsedMode && (
              <div
                role="tooltip"
                className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-3 py-1.5 rounded-[8px] bg-[#1E1B2E] text-white text-[13px] font-semibold whitespace-nowrap shadow-purple-md"
              >
                {item.label}
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-4 mt-4 border-t border-[#E6E1F5]">
        <div className="relative group">
          <Link
            to="/design-system"
            title={isCollapsedMode ? 'Design system' : undefined}
            className={`relative flex items-center ${
              isCollapsedMode ? 'justify-center px-2' : 'px-3.5 gap-3'
            } h-10 rounded-[10px] text-[14px] font-semibold transition-all ${
              location.pathname === '/design-system'
                ? 'bg-[#F3EFFF] text-[#6D4AE0]'
                : 'text-[#5F5B75] hover:bg-[#FAF8FF] hover:text-[#6D4AE0]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#F59E3B] shrink-0" />
            {!isCollapsedMode && <span>Design system</span>}
          </Link>
          {isCollapsedMode && (
            <div
              role="tooltip"
              className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-3 py-1.5 rounded-[8px] bg-[#1E1B2E] text-white text-[13px] font-semibold whitespace-nowrap shadow-purple-md"
            >
              Design system
            </div>
          )}
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-[#FAF8FF] text-[#1E1B2E]">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-screen bg-white border-r border-[#E6E1F5] transition-all duration-200 z-30 shrink-0 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo on top on white surface */}
        <div
          className={`h-20 border-b border-[#E6E1F5] flex items-center ${
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <BrandLogo size="sm" showText={!collapsed} />
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="w-11 h-11 flex items-center justify-center rounded-[10px] text-[#5F5B75] hover:text-[#6D4AE0] hover:bg-[#F3EFFF] cursor-pointer"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="w-11 h-11 flex items-center justify-center rounded-[10px] text-[#5F5B75] hover:text-[#6D4AE0] hover:bg-[#F3EFFF] cursor-pointer"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {renderSidebarLinks(collapsed)}

        {/* Role indicator footer inside sidebar */}
        <div className="p-3 border-t border-[#E6E1F5] bg-[#FAF8FF]/60">
          {collapsed ? (
            <div className="flex justify-center">
              <Avatar
                src={activeUser.avatar}
                name={activeUser.name}
                size="sm"
                status="online"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  src={activeUser.avatar}
                  name={activeUser.name}
                  size="sm"
                  status="online"
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#1E1B2E] truncate">
                    {activeUser.name}
                  </p>
                  <p className="text-[12px] text-[#5F5B75] capitalize">{activeRole} workspace</p>
                </div>
              </div>
              <StatusChip label={activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} variant="primary" dot={false} />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Slide-in Drawer Sidebar */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex bg-[#1E1B2E]/50 backdrop-blur-xs">
          <aside
            ref={mobileDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation"
            tabIndex={-1}
            className="w-72 max-w-[85vw] bg-white h-full border-r border-[#E6E1F5] shadow-purple-lg flex flex-col focus:outline-none"
          >
            <div className="h-20 px-4 border-b border-[#E6E1F5] flex items-center justify-between">
              <BrandLogo size="sm" showText />
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-11 h-11 flex items-center justify-center rounded-[10px] text-[#5F5B75] hover:bg-[#F3EFFF] cursor-pointer"
                aria-label="Close sidebar drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderSidebarLinks(false)}
          </aside>
          <div className="flex-1" onClick={() => setMobileDrawerOpen(false)} />
        </div>
      )}

      {/* Main Column: Top Bar + Page Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Logged-in Top Bar */}
        <header className="sticky top-0 z-20 h-20 bg-white/95 backdrop-blur-md border-b border-[#E6E1F5] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden w-11 h-11 flex items-center justify-center rounded-[10px] border border-[#E6E1F5] text-[#1E1B2E] hover:bg-[#F3EFFF] cursor-pointer shrink-0"
              aria-label="Open navigation drawer"
              aria-expanded={mobileDrawerOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmitSearch={(q) => {
                  setSearchQuery(q);
                  navigate('/courses');
                }}
                placeholder="Global search across courses, lessons, exams, or users..."
              />
            </div>
          </div>

          {/* Right Actions: Notifications Bell + Avatar Menu */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Notifications Bell with Badge */}
            <div className="relative" ref={notifMenuRef}>
              <button
                type="button"
                onClick={() => setNotifPopoverOpen((v) => !v)}
                className="relative w-11 h-11 rounded-[10px] bg-white border border-[#E6E1F5] hover:border-[#A78BFA] hover:bg-[#F3EFFF]/60 flex items-center justify-center text-[#1E1B2E] transition-all cursor-pointer"
                aria-label="Open notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#F59E3B] text-white text-[11px] font-bold flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifPopoverOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-lg overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[#E6E1F5] flex items-center justify-between bg-[#FAF8FF]">
                    <span className="font-display font-bold text-[16px] text-[#1E1B2E]">
                      Notifications ({unreadCount} unread)
                    </span>
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      disabled={unreadCount === 0}
                      className="text-[12px] font-semibold text-[#6D4AE0] hover:underline disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  </div>

                  {/* All / Unread Popover Tabs */}
                  <div
                    role="tablist"
                    aria-label="Filter notifications"
                    className="px-3 py-2 border-b border-[#E6E1F5] bg-white flex items-center gap-1.5"
                  >
                    {(
                      [
                        { id: 'all', label: `All (${notifications.length})` },
                        { id: 'unread', label: `Unread (${unreadCount})` },
                      ] as const
                    ).map((tab) => {
                      const active = notifTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          role="tab"
                          type="button"
                          aria-selected={active}
                          onClick={() => setNotifTab(tab.id)}
                          className={`px-3 py-1 rounded-[8px] text-[12px] font-bold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#F3EFFF] text-[#6D4AE0]'
                              : 'text-[#5F5B75] hover:bg-[#FAF8FF] hover:text-[#1E1B2E]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="divide-y divide-[#E6E1F5] max-h-72 overflow-y-auto">
                    {popoverNotifications.length === 0 ? (
                      <div className="px-4 py-8 text-center space-y-1">
                        <p className="text-[14px] font-bold text-[#1E1B2E]">
                          {notifTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                        </p>
                        <p className="text-[12px] text-[#5F5B75]">
                          {notifTab === 'unread'
                            ? 'You have read all updates in this workspace.'
                            : 'Course updates and alerts will appear here.'}
                        </p>
                      </div>
                    ) : (
                      popoverNotifications.slice(0, 6).map((n) => {
                        const typeMeta = getNotificationIcon(n.type);
                        return (
                          <Link
                            key={n.id}
                            to={n.link}
                            onClick={() => {
                              markNotificationRead(n.id);
                              setNotifPopoverOpen(false);
                            }}
                            className={`flex items-start gap-3 px-4 py-3 hover:bg-[#FAF8FF] transition-colors ${
                              !n.read ? 'bg-[#F3EFFF]/40' : ''
                            }`}
                          >
                            <span
                              className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5 ${typeMeta.bg}`}
                            >
                              {typeMeta.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[13px] font-semibold text-[#1E1B2E] leading-snug">
                                  {n.title}
                                </p>
                                {!n.read && (
                                  <span
                                    aria-label="Unread"
                                    className="w-2 h-2 rounded-full bg-[#6D4AE0] shrink-0 mt-1.5"
                                  />
                                )}
                              </div>
                              <p className="text-[12px] text-[#5F5B75] mt-0.5 line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-[11px] text-[#5F5B75]/80 mt-1">{n.createdAt}</p>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                  <div className="p-2.5 border-t border-[#E6E1F5] bg-[#FAF8FF] text-center">
                    <Link
                      to="/notifications"
                      onClick={() => setNotifPopoverOpen(false)}
                      className="text-[13px] font-semibold text-[#6D4AE0] hover:underline"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Menu (Profile, Settings, Log out) */}
            <div className="relative" ref={avatarMenuRef}>
              <button
                type="button"
                onClick={() => setAvatarMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-[12px] border border-[#E6E1F5] bg-white hover:border-[#A78BFA] transition-all cursor-pointer"
                aria-label="Open user menu"
              >
                <Avatar
                  src={activeUser.avatar}
                  name={activeUser.name}
                  size="sm"
                  status="online"
                />
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-[14px] font-bold text-[#1E1B2E]">
                    {activeUser.name}
                  </p>
                  <p className="text-[12px] text-[#5F5B75] capitalize">{activeRole}</p>
                </div>
              </button>

              {avatarMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-lg py-1.5 z-50">
                  <div className="px-4 py-2.5 border-b border-[#E6E1F5]">
                    <p className="text-[14px] font-bold text-[#1E1B2E]">
                      {activeUser.name}
                    </p>
                    <p className="text-[12px] text-[#5F5B75] truncate">
                      {activeUser.email}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-semibold text-[#1E1B2E] hover:bg-[#F3EFFF] hover:text-[#6D4AE0]"
                  >
                    <User className="w-4 h-4 text-[#6D4AE0]" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    to={activeRole === 'admin' ? '/admin/settings' : '/profile'}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-semibold text-[#1E1B2E] hover:bg-[#F3EFFF] hover:text-[#6D4AE0]"
                  >
                    <Settings className="w-4 h-4 text-[#6D4AE0]" />
                    <span>Settings</span>
                  </Link>
                  <div className="my-1 border-t border-[#E6E1F5]" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace Container (max-w-[1200px] 8px grid) */}
        <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-8 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
};
