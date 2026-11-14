import React from 'react';
import { Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import { useFocusFlow } from '../../context/FocusFlowContext';
import { FocusFlowLogo } from '../common/FocusFlowLogo';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    state,
    setIsCommandOpen,
    openCreateTaskModal,
    updateSettings,
    setActivePage,
  } = useFocusFlow();

  const isDark = state.settings.theme === 'dark';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-gray-200 dark:border-[#1E222D] bg-[#F7F8FA]/90 dark:bg-[#0B0D11]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 h-16">
      {/* Left: Mobile Menu + Brand on small screens OR Command Search Bar on desktop */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-[#171B24] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setActivePage('overview')}
          className="flex lg:hidden items-center gap-2 shrink-0"
        >
          <FocusFlowLogo className="w-6 h-6" />
          <span className="text-sm font-bold text-gray-900 dark:text-white">FocusFlow</span>
        </button>

        {/* Equa-inspired Integrated Search / Command Bar */}
        <button
          type="button"
          onClick={() => setIsCommandOpen(true)}
          className="hidden sm:flex items-center justify-between w-full max-w-md rounded-xl border border-gray-200 dark:border-[#222734] bg-white dark:bg-[#13161C] px-3.5 py-2 text-sm text-gray-400 dark:text-[#737B8C] hover:border-gray-300 dark:hover:border-[#32394B] transition-colors text-left"
        >
          <span className="flex items-center gap-2.5 truncate">
            <Search className="w-4 h-4 shrink-0 text-gray-400 dark:text-[#6B7285]" />
            <span className="truncate">Search tasks, topics, or type a command</span>
          </span>
          <kbd className="ml-3 hidden md:inline-flex items-center rounded-md border border-gray-200 dark:border-[#282E3D] bg-gray-50 dark:bg-[#191D26] px-1.5 py-0.5 text-[11px] font-mono text-gray-500 dark:text-[#8E96A8] shrink-0">
            ⌘ F
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => setIsCommandOpen(true)}
          aria-label="Search workspace"
          className="sm:hidden p-2 rounded-lg border border-gray-200 dark:border-[#222734] bg-white dark:bg-[#13161C] text-gray-600 dark:text-gray-300"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Dark / Light Mode Switch */}
        <div
          role="group"
          aria-label="Switch color theme"
          className="hidden sm:flex items-center gap-1 rounded-xl border border-gray-200 dark:border-[#222734] bg-gray-100 dark:bg-[#13161C] p-1"
        >
          <button
            type="button"
            onClick={() => updateSettings({ theme: 'light' })}
            aria-pressed={!isDark}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
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
            aria-pressed={isDark}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
              isDark
                ? 'bg-[#1F2430] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Moon className="w-3.5 h-3.5 shrink-0" />
            <span>Dark</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="sm:hidden p-2 rounded-xl border border-gray-200 dark:border-[#222734] bg-white dark:bg-[#13161C] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#191D26] transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => openCreateTaskModal()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 dark:bg-violet-600 hover:bg-gray-800 dark:hover:bg-violet-500 px-3.5 py-2 text-xs sm:text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>New Task</span>
        </button>
      </div>
    </header>
  );
};
