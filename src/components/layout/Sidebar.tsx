import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  LayoutGrid,
  Moon,
  Settings,
  Sun,
  Target,
  X,
} from 'lucide-react';
import { useFocusFlow } from '../../context/FocusFlowContext';
import { NavPage } from '../../types/focusflow';
import { getTodayISO } from '../../utils/dateUtils';
import { FocusFlowLogo } from '../common/FocusFlowLogo';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemConfig {
  id: NavPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { state, activePage, setActivePage, updateSettings } = useFocusFlow();
  const [imgFailed, setImgFailed] = useState(false);
  const isDark = state.settings.theme === 'dark';

  const today = getTodayISO();
  const pendingTasksCount = state.tasks.filter((t) => t.status === 'pending').length;
  const dueFollowUpsToday = state.followUps.filter(
    (f) => f.status === 'pending' && f.scheduledDate <= today
  ).length;

  const mainItems: NavItemConfig[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare, badge: pendingTasksCount || undefined },
    { id: 'topics', label: 'Learning Topics', icon: BookOpen },
    {
      id: 'calendar',
      label: 'Follow-up Calendar',
      icon: CalendarDays,
      badge: dueFollowUpsToday || undefined,
    },
  ];

  const toolItems: NavItemConfig[] = [
    { id: 'focus', label: "Today's Focus", icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const handleSelect = (page: NavPage) => {
    setActivePage(page);
    onCloseMobile();
  };

  const initials = state.profile.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const renderNavButton = (item: NavItemConfig) => {
    const Icon = item.icon;
    const isActive = activePage === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleSelect(item.id)}
        className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
          isActive
            ? 'bg-white dark:bg-[#1B1F2A] text-gray-900 dark:text-white shadow-xs border border-gray-200/80 dark:border-[#2A303E]'
            : 'text-gray-600 dark:text-[#8E96A8] hover:bg-gray-100/80 dark:hover:bg-[#171B24] hover:text-gray-900 dark:hover:text-gray-200 border border-transparent'
        }`}
      >
        <span className="flex items-center gap-3 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-400 dark:text-[#6B7285] group-hover:text-gray-700 dark:group-hover:text-gray-300'
            }`}
          />
          <span className="truncate">{item.label}</span>
        </span>
        {item.badge !== undefined && (
          <span
            className={`ml-2 text-xs font-mono tabular-nums ${
              isActive
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-400 dark:text-[#6B7285]'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#F3F4F7] dark:bg-[#101319] border-r border-gray-200 dark:border-[#1E222D] select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <button
          type="button"
          onClick={() => handleSelect('overview')}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg"
        >
          <FocusFlowLogo className="w-7 h-7 shrink-0" />
          <span className="text-[17px] font-bold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">
            FocusFlow
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-[#1B1F2A]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-2 space-y-6" aria-label="Primary Navigation">
        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-gray-400 dark:text-[#5F677A] uppercase">
            Main
          </p>
          <div className="space-y-1">{mainItems.map(renderNavButton)}</div>
        </div>

        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-gray-400 dark:text-[#5F677A] uppercase">
            Tools
          </p>
          <div className="space-y-1">{toolItems.map(renderNavButton)}</div>
        </div>
      </nav>

      {/* Bottom Pinned Section */}
      <div className="px-3.5 pb-4 pt-3 border-t border-gray-200/80 dark:border-[#1E222D] space-y-2">
        <PWAInstallButton compact />

        {/* Dark / Light Mode Switcher */}
        <div
          role="group"
          aria-label="Theme mode"
          className="grid grid-cols-2 gap-1 rounded-xl border border-gray-200/80 dark:border-[#222734] bg-gray-200/50 dark:bg-[#0B0D11] p-1"
        >
          <button
            type="button"
            onClick={() => updateSettings({ theme: 'light' })}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              !isDark
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-[#8E96A8] hover:text-gray-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5 shrink-0" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ theme: 'dark' })}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              isDark
                ? 'bg-[#1B1F2A] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Moon className="w-3.5 h-3.5 shrink-0" />
            <span>Dark</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleSelect('settings')}
          className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
            activePage === 'settings'
              ? 'bg-white dark:bg-[#1B1F2A] text-gray-900 dark:text-white shadow-xs border border-gray-200/80 dark:border-[#2A303E]'
              : 'text-gray-600 dark:text-[#8E96A8] hover:bg-gray-100/80 dark:hover:bg-[#171B24] hover:text-gray-900 dark:hover:text-gray-200 border border-transparent'
          }`}
        >
          <Settings
            className={`w-4 h-4 shrink-0 ${
              activePage === 'settings'
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-400 dark:text-[#6B7285] group-hover:text-gray-700 dark:group-hover:text-gray-300'
            }`}
          />
          <span>Settings</span>
        </button>

        {/* User Profile */}
        <button
          type="button"
          onClick={() => handleSelect('settings')}
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-gray-200/50 dark:hover:bg-[#171B24] transition-colors"
        >
          {!imgFailed && state.profile.avatarUrl ? (
            <img
              src={state.profile.avatarUrl}
              alt={state.profile.name}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-[#282D3A]"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-xs font-semibold text-violet-600 dark:text-violet-300 shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {state.profile.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-[#737B8C] truncate">
              {state.profile.role}
            </p>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[82vw] h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
