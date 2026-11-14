import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useFocusFlow } from '../../context/FocusFlowContext';
import { TaskPriority } from '../../types/focusflow';
import { getTodayISO } from '../../utils/dateUtils';

const CATEGORY_SUGGESTIONS = [
  'Study',
  'Engineering',
  'Mathematics',
  'CS Systems',
  'Algorithms',
  'Databases',
  'Planning',
  'Personal',
];

export const TaskModal: React.FC = () => {
  const {
    isTaskModalOpen,
    editingTask,
    presetTaskDate,
    closeTaskModal,
    addTask,
    updateTask,
  } = useFocusFlow();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Study');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState(getTodayISO());
  const [dueTime, setDueTime] = useState('17:00');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isTaskModalOpen) return;
    setError('');
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setCategory(editingTask.category);
      setPriority(editingTask.priority);
      setDueDate(editingTask.dueDate);
      setDueTime(editingTask.dueTime);
    } else {
      setTitle('');
      setDescription('');
      setCategory('Study');
      setPriority('medium');
      setDueDate(presetTaskDate || getTodayISO());
      setDueTime('17:00');
    }
  }, [isTaskModalOpen, editingTask, presetTaskDate]);

  if (!isTaskModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a task title.');
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim() || 'General',
      priority,
      dueDate: dueDate || getTodayISO(),
      dueTime: dueTime || '17:00',
    };
    if (editingTask) {
      updateTask(editingTask.id, payload);
    } else {
      addTask(payload);
    }
    closeTaskModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-[#242936] bg-white dark:bg-[#13161C] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#1E222D] px-6 py-4">
          <h2 id="task-modal-title" className="text-base font-semibold text-gray-900 dark:text-white">
            {editingTask ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            type="button"
            onClick={closeTaskModal}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1B1F2A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
              Task title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Complete Database Normalization exercises"
              autoFocus
              className="w-full rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#5C6476] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes, links, or checklist details..."
              className="w-full rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#5C6476] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
                Category
              </label>
              <input
                type="text"
                list="task-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Study, Engineering..."
                className="w-full rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              />
              <datalist id="task-categories">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] p-1">
                {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`rounded-lg py-1.5 text-xs font-medium capitalize transition-colors ${
                      priority === p
                        ? 'bg-white dark:bg-[#222736] text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 dark:text-[#7C8496] hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2.5 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
                Due time
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2.5 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-[#737B8C]">
            Everyday tasks stay in your task schedule and do not generate 1-4-7 spaced-repetition reminders.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-200 dark:border-[#1E222D]">
            <button
              type="button"
              onClick={closeTaskModal}
              className="rounded-xl border border-gray-200 dark:border-[#262B38] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1E28] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gray-900 dark:bg-violet-600 hover:bg-gray-800 dark:hover:bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
