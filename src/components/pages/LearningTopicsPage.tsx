import React, { useMemo, useState } from 'react';
import {
  BookCheck,
  Check,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useFocusFlow } from '../../context/FocusFlowContext';
import { formatReadableDate, getTodayISO } from '../../utils/dateUtils';

export const LearningTopicsPage: React.FC = () => {
  const {
    state,
    openCreateTopicModal,
    openEditTopicModal,
    deleteTopic,
    markTopicAsLearned,
    toggleFollowUpStatus,
  } = useFocusFlow();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'learned' | 'in_progress'>('all');

  const today = getTodayISO();

  const filteredTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.topics.filter((topic) => {
      if (statusFilter !== 'all' && topic.status !== statusFilter) return false;
      if (
        q &&
        !topic.title.toLowerCase().includes(q) &&
        !topic.category.toLowerCase().includes(q) &&
        !topic.notes.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [state.topics, query, statusFilter]);

  const learnedCount = state.topics.filter((t) => t.status === 'learned').length;
  const inProgressCount = state.topics.filter((t) => t.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Learning Topics
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#8E96A8] tabular-nums">
            {learnedCount} learned with active 1-4-7 follow-ups · {inProgressCount} in progress
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateTopicModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 dark:bg-violet-600 hover:bg-gray-800 dark:hover:bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Topic</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, subjects, or study notes..."
            className="w-full rounded-xl border border-gray-200 dark:border-[#242936] bg-gray-50 dark:bg-[#0D1015] pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#636B7D] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-[#0D1015] p-1 border border-gray-200/70 dark:border-[#222734] self-start sm:self-auto">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'learned', label: 'Learned' },
              { id: 'in_progress', label: 'In Progress' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-[#1E232F] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-[#7C8496] hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Topic Grid */}
      {filteredTopics.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] py-16 px-6 text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            No learning topics match your filter
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-[#7C8496]">
            Add a topic you studied to automatically schedule Day 1, Day 4, and Day 7 reviews.
          </p>
          <button
            type="button"
            onClick={openCreateTopicModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gray-900 dark:bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 dark:hover:bg-violet-500"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Learning Topic
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredTopics.map((topic) => {
            const topicFollowUps = state.followUps
              .filter((f) => f.topicId === topic.id)
              .sort((a, b) => a.stage - b.stage);
            const completedFollowUps = topicFollowUps.filter((f) => f.status === 'completed').length;
            const totalFollowUps = topicFollowUps.length || 3;
            const progressPct =
              topic.status === 'learned'
                ? Math.round((completedFollowUps / totalFollowUps) * 100)
                : 0;

            return (
              <article
                key={topic.id}
                className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-5 sm:p-6 flex flex-col justify-between gap-5"
              >
                <div>
                  {/* Title & Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
                        {topic.title}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-[#7C8496]">
                        <span>{topic.category}</span>
                        <span aria-hidden="true">·</span>
                        {topic.status === 'learned' && topic.learnedDate ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Learning completed {formatReadableDate(topic.learnedDate)}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditTopicModal(topic)}
                        aria-label={`Edit ${topic.title}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1E232E] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTopic(topic.id)}
                        aria-label={`Delete ${topic.title}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  {topic.notes && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-[#9CA3AF] leading-relaxed">
                      {topic.notes}
                    </p>
                  )}
                </div>

                {/* Follow-up Section */}
                {topic.status === 'in_progress' ? (
                  <div className="pt-4 border-t border-gray-100 dark:border-[#1E232E] flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-500 dark:text-[#7C8496]">
                      Mark learned to schedule Day 1, 4 &amp; 7 reminders
                    </span>
                    <button
                      type="button"
                      onClick={() => markTopicAsLearned(topic.id, today)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-3.5 py-2 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
                    >
                      <BookCheck className="w-3.5 h-3.5" />
                      <span>Mark as Learned</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-gray-100 dark:border-[#1E232E] space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Follow-up Progress
                      </span>
                      <span className="font-mono tabular-nums text-gray-500 dark:text-[#8E96A8]">
                        {completedFollowUps}/{topicFollowUps.length} completed ({progressPct}%)
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-[#1E232E] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-600 dark:bg-violet-500 transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* 1-4-7 Checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {topicFollowUps.map((fu) => {
                        const isDone = fu.status === 'completed';
                        const isDueToday = fu.scheduledDate === today && !isDone;
                        return (
                          <button
                            key={fu.id}
                            type="button"
                            onClick={() => toggleFollowUpStatus(fu.id)}
                            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                              isDone
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : isDueToday
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                : 'border-gray-200 dark:border-[#242936] bg-gray-50 dark:bg-[#0D1015] text-gray-700 dark:text-gray-300 hover:border-violet-500/40'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold">Day {fu.stage}</p>
                              <p className="text-[11px] font-mono tabular-nums opacity-80">
                                {formatReadableDate(fu.scheduledDate)}
                              </p>
                            </div>
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                isDone
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-gray-300 dark:border-[#3A4256]'
                              }`}
                            >
                              {isDone && <Check className="w-3 h-3 stroke-[2.5]" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
