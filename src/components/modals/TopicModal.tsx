import React, { useEffect, useState } from 'react';
import { CalendarCheck, X } from 'lucide-react';
import { useFocusFlow } from '../../context/FocusFlowContext';
import { LearningStatus } from '../../types/focusflow';
import { addDaysISO, formatReadableDate, getTodayISO } from '../../utils/dateUtils';

const SUBJECT_SUGGESTIONS = [
  'Algorithms',
  'Data Structures',
  'Web Engineering',
  'Databases',
  'Networking',
  'Mathematics',
  'Operating Systems',
  'System Design',
];

export const TopicModal: React.FC = () => {
  const {
    isTopicModalOpen,
    editingTopic,
    closeTopicModal,
    addTopic,
    updateTopic,
  } = useFocusFlow();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Algorithms');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<LearningStatus>('learned');
  const [learnedDate, setLearnedDate] = useState(getTodayISO());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isTopicModalOpen) return;
    setError('');
    if (editingTopic) {
      setTitle(editingTopic.title);
      setCategory(editingTopic.category);
      setNotes(editingTopic.notes);
      setStatus(editingTopic.status);
      setLearnedDate(editingTopic.learnedDate || getTodayISO());
    } else {
      setTitle('');
      setCategory('Algorithms');
      setNotes('');
      setStatus('learned');
      setLearnedDate(getTodayISO());
    }
  }, [isTopicModalOpen, editingTopic]);

  if (!isTopicModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a topic name.');
      return;
    }
    const payload = {
      title: title.trim(),
      category: category.trim() || 'General',
      notes: notes.trim(),
      status,
      learnedDate: status === 'learned' ? learnedDate || getTodayISO() : null,
    };
    if (editingTopic) {
      updateTopic(editingTopic.id, payload);
    } else {
      addTopic(payload);
    }
    closeTopicModal();
  };

  const previewDate = learnedDate || getTodayISO();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="topic-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-[#242936] bg-white dark:bg-[#13161C] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#1E222D] px-6 py-4">
          <h2 id="topic-modal-title" className="text-base font-semibold text-gray-900 dark:text-white">
            {editingTopic ? 'Edit Learning Topic' : 'Add Learning Topic'}
          </h2>
          <button
            type="button"
            onClick={closeTopicModal}
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
              Topic name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Data Structures – Graphs & BFS"
              autoFocus
              className="w-full rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#5C6476] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
              Subject / Category
            </label>
            <input
              type="text"
              list="topic-subjects"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Algorithms, Databases..."
              className="w-full rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            />
            <datalist id="topic-subjects">
              {SUBJECT_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
              Study notes & key takeaways
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summarize core concepts you want to recall during Day 1, 4, and 7 reviews..."
              className="w-full rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#5C6476] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
                Learning status
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] p-1">
                <button
                  type="button"
                  onClick={() => setStatus('in_progress')}
                  className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                    status === 'in_progress'
                      ? 'bg-white dark:bg-[#222736] text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-[#7C8496] hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  In Progress
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('learned')}
                  className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                    status === 'learned'
                      ? 'bg-white dark:bg-[#222736] text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-[#7C8496] hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  Learned
                </button>
              </div>
            </div>

            {status === 'learned' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
                  Initial learning date
                </label>
                <input
                  type="date"
                  value={learnedDate}
                  onChange={(e) => setLearnedDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                />
              </div>
            )}
          </div>

          {status === 'learned' && (
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 dark:bg-violet-500/10 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-violet-700 dark:text-violet-300 mb-2">
                <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Automated 1-4-7 follow-up schedule</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums text-gray-700 dark:text-gray-300">
                <div>
                  <span className="text-gray-500 dark:text-[#8E96A8]">Day 1:</span>{' '}
                  {formatReadableDate(addDaysISO(previewDate, 1))}
                </div>
                <div>
                  <span className="text-gray-500 dark:text-[#8E96A8]">Day 4:</span>{' '}
                  {formatReadableDate(addDaysISO(previewDate, 4))}
                </div>
                <div>
                  <span className="text-gray-500 dark:text-[#8E96A8]">Day 7:</span>{' '}
                  {formatReadableDate(addDaysISO(previewDate, 7))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-200 dark:border-[#1E222D]">
            <button
              type="button"
              onClick={closeTopicModal}
              className="rounded-xl border border-gray-200 dark:border-[#262B38] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1E28] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gray-900 dark:bg-violet-600 hover:bg-gray-800 dark:hover:bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              {editingTopic ? 'Save Topic' : 'Save Learning Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
