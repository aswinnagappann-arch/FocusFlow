import React, { useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useFocusFlow } from '../../context/FocusFlowContext';
import { TaskPriority } from '../../types/focusflow';
import { formatReadableDate, formatTime12h } from '../../utils/dateUtils';

export const MyTasksPage: React.FC = () => {
  const {
    state,
    openCreateTaskModal,
    openEditTaskModal,
    deleteTask,
    toggleTaskStatus,
  } = useFocusFlow();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = useMemo(() => {
    const set = new Set(state.tasks.map((t) => t.category));
    return ['all', ...Array.from(set).sort()];
  }, [state.tasks]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.tasks
      .filter((t) => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
        if (
          q &&
          !t.title.toLowerCase().includes(q) &&
          !t.description.toLowerCase().includes(q) &&
          !t.category.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
        return `${a.dueDate}T${a.dueTime}`.localeCompare(`${b.dueDate}T${b.dueTime}`);
      });
  }, [state.tasks, query, statusFilter, priorityFilter, categoryFilter]);

  const pendingCount = state.tasks.filter((t) => t.status === 'pending').length;
  const completedCount = state.tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            My Tasks
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#8E96A8] tabular-nums">
            {pendingCount} pending · {completedCount} completed
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateTaskModal()}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 dark:bg-violet-600 hover:bg-gray-800 dark:hover:bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks by title, description, or category..."
            className="w-full rounded-xl border border-gray-200 dark:border-[#242936] bg-gray-50 dark:bg-[#0D1015] pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#636B7D] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Status Filter */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-[#0D1015] p-1 border border-gray-200/70 dark:border-[#222734]">
            {(['all', 'pending', 'completed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                  statusFilter === s
                    ? 'bg-white dark:bg-[#1E232F] text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-[#7C8496] hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
            className="rounded-xl border border-gray-200 dark:border-[#242936] bg-gray-50 dark:bg-[#0D1015] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-gray-200 dark:border-[#242936] bg-gray-50 dark:bg-[#0D1015] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Linear-inspired Clean Task List */}
      <div className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              No matching tasks found
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-[#7C8496]">
              Adjust your search filters or create a new task to stay on track.
            </p>
            <button
              type="button"
              onClick={() => openCreateTaskModal()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gray-900 dark:bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 dark:hover:bg-violet-500"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-[#1D212B]">
            {filteredTasks.map((task) => {
              const isDone = task.status === 'completed';
              return (
                <div
                  key={task.id}
                  className="flex items-start sm:items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50/70 dark:hover:bg-[#171B24] transition-colors group"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(task.id)}
                      aria-label={isDone ? `Reopen ${task.title}` : `Complete ${task.title}`}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        isDone
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'border-gray-300 dark:border-[#343B4D] hover:border-violet-500'
                      }`}
                    >
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>

                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => openEditTaskModal(task)}
                    >
                      <p
                        className={`text-sm font-medium truncate ${
                          isDone
                            ? 'line-through text-gray-400 dark:text-[#636B7D]'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-[#7C8496] line-clamp-1">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-[#7C8496] sm:hidden">
                        <span>{task.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{task.priority}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {formatReadableDate(task.dueDate)} {formatTime12h(task.dueTime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop right-aligned tabular metadata + actions */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 dark:text-[#7C8496]">
                      <span className="w-24 truncate text-right">{task.category}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`w-14 text-right capitalize font-medium ${
                          task.priority === 'high'
                            ? 'text-amber-600 dark:text-amber-400'
                            : task.priority === 'medium'
                            ? 'text-violet-600 dark:text-violet-400'
                            : 'text-gray-500 dark:text-[#7C8496]'
                        }`}
                      >
                        {task.priority}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums inline-flex items-center gap-1 w-32 justify-end">
                        <Clock className="w-3 h-3 shrink-0" />
                        {formatReadableDate(task.dueDate)} · {formatTime12h(task.dueTime)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditTaskModal(task)}
                        aria-label={`Edit ${task.title}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#222735] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        aria-label={`Delete ${task.title}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
