import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  LayoutGrid,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Target,
  X,
} from 'lucide-react';
import { useFocusFlow } from '../../context/FocusFlowContext';
import { NavPage } from '../../types/focusflow';
import { formatReadableDate } from '../../utils/dateUtils';

export const CommandPaletteModal: React.FC = () => {
  const {
    state,
    isCommandOpen,
    setIsCommandOpen,
    setActivePage,
    openCreateTaskModal,
    openCreateTopicModal,
    openEditTaskModal,
    openEditTopicModal,
    updateSettings,
  } = useFocusFlow();

  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isCommandOpen) setQuery('');
  }, [isCommandOpen]);

  useEffect(() => {
    if (!isCommandOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCommandOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCommandOpen, setIsCommandOpen]);

  if (!isCommandOpen) return null;

  const q = query.trim().toLowerCase();

  const navActions: { id: NavPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Go to Overview', icon: LayoutGrid },
    { id: 'tasks', label: 'Go to My Tasks', icon: CheckSquare },
    { id: 'topics', label: 'Go to Learning Topics', icon: BookOpen },
    { id: 'calendar', label: 'Go to Follow-up Calendar', icon: CalendarDays },
    { id: 'focus', label: "Go to Today's Focus", icon: Target },
    { id: 'analytics', label: 'Go to Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Go to Settings', icon: Settings },
  ];

  const matchingNav = navActions.filter((n) => n.label.toLowerCase().includes(q));
  const matchingTasks = state.tasks
    .filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    )
    .slice(0, 5);
  const matchingTopics = state.topics
    .filter(
      (tp) =>
        !q ||
        tp.title.toLowerCase().includes(q) ||
        tp.category.toLowerCase().includes(q)
    )
    .slice(0, 4);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs pt-[12vh] p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => setIsCommandOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-gray-200 dark:border-[#262B38] bg-white dark:bg-[#13161C] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-[#1E222D] px-4 py-3.5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, learning topics, or jump to page..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#6B7285] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setIsCommandOpen(false)}
            aria-label="Close command palette"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Quick Actions */}
          <div>
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#6B7285]">
              Quick Actions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsCommandOpen(false);
                  openCreateTaskModal();
                }}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1B1F2A] transition-colors text-left"
              >
                <Plus className="w-4 h-4 text-violet-500 shrink-0" />
                <span>Create New Task</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCommandOpen(false);
                  openCreateTopicModal();
                }}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1B1F2A] transition-colors text-left"
              >
                <BookOpen className="w-4 h-4 text-violet-500 shrink-0" />
                <span>Add Learning Topic</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  updateSettings({
                    theme: state.settings.theme === 'dark' ? 'light' : 'dark',
                  });
                  setIsCommandOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1B1F2A] transition-colors text-left sm:col-span-2"
              >
                {state.settings.theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Moon className="w-4 h-4 text-violet-500 shrink-0" />
                )}
                <span>
                  {state.settings.theme === 'dark'
                    ? 'Switch to Light Mode'
                    : 'Switch to Dark Mode'}
                </span>
              </button>
            </div>
          </div>

          {/* Matching Tasks */}
          {matchingTasks.length > 0 && (
            <div>
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#6B7285]">
                Tasks
              </p>
              <div className="space-y-0.5">
                {matchingTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      setIsCommandOpen(false);
                      setActivePage('tasks');
                      openEditTaskModal(task);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#1B1F2A] transition-colors text-left"
                  >
                    <span className="truncate text-gray-800 dark:text-gray-200 pr-3">
                      {task.title}
                    </span>
                    <span className="text-xs font-mono text-gray-400 dark:text-[#737B8C] shrink-0">
                      {task.category} · {formatReadableDate(task.dueDate)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Topics */}
          {matchingTopics.length > 0 && (
            <div>
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#6B7285]">
                Learning Topics
              </p>
              <div className="space-y-0.5">
                {matchingTopics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      setIsCommandOpen(false);
                      setActivePage('topics');
                      openEditTopicModal(topic);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#1B1F2A] transition-colors text-left"
                  >
                    <span className="truncate text-gray-800 dark:text-gray-200 pr-3">
                      {topic.title}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-[#737B8C] shrink-0">
                      {topic.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          {matchingNav.length > 0 && (
            <div>
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#6B7285]">
                Navigation
              </p>
              <div className="space-y-0.5">
                {matchingNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActivePage(item.id);
                        setIsCommandOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1B1F2A] transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span>{item.label}</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
