import React from 'react';
import {
  BookOpen,
  Check,
  Clock,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useFocusFlow } from '../../context/FocusFlowContext';
import { formatFullDate, formatTime12h, getTodayISO } from '../../utils/dateUtils';

export const TodaysFocusPage: React.FC = () => {
  const {
    state,
    toggleTaskStatus,
    toggleTaskReminderStatus,
    toggleFollowUpStatus,
    timerSecondsLeft,
    timerPresetMinutes,
    isTimerRunning,
    timerLabel,
    setTimerLabel,
    setTimerPreset,
    startTimer,
    pauseTimer,
    resetTimer,
    completeFocusSession,
  } = useFocusFlow();

  const today = getTodayISO();

  const todaysTasks = state.tasks.filter((t) => t.dueDate === today);
  const todaysTaskReminders = state.taskReminders.filter((r) => r.scheduledDate === today);
  const todaysFollowUps = state.followUps.filter((f) => f.scheduledDate === today);
  const todaysTopics = state.topics.filter(
    (tp) => tp.learnedDate === today || tp.status === 'in_progress'
  );

  const pendingTasks = todaysTasks.filter((t) => t.status === 'pending');
  const pendingTaskReminders = todaysTaskReminders.filter((r) => r.status === 'pending');
  const pendingFollowUps = todaysFollowUps.filter((f) => f.status === 'pending');

  const completedItems = [
    ...todaysTasks
      .filter((t) => t.status === 'completed')
      .map((t) => ({ id: t.id, kind: 'task' as const, title: t.title, meta: t.category })),
    ...todaysTaskReminders
      .filter((r) => r.status === 'completed')
      .map((r) => ({
        id: r.id,
        kind: 'taskReminder' as const,
        title: `${r.taskTitle} (Day ${r.stage} · Cycle ${r.cycle})`,
        meta: r.category,
      })),
    ...todaysFollowUps
      .filter((f) => f.status === 'completed')
      .map((f) => ({
        id: f.id,
        kind: 'followup' as const,
        title: `${f.topicName} (Day ${f.stage} Follow-up)`,
        meta: f.category,
      })),
  ];

  const totalDueToday =
    todaysTasks.length + todaysTaskReminders.length + todaysFollowUps.length;
  const completedCount = completedItems.length;
  const progressPct = totalDueToday > 0 ? Math.round((completedCount / totalDueToday) * 100) : 0;

  const mins = String(Math.floor(timerSecondsLeft / 60)).padStart(2, '0');
  const secs = String(timerSecondsLeft % 60).padStart(2, '0');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Progress */}
      <div className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-gray-500 dark:text-[#7C8496]">
              {formatFullDate(today)}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Today&apos;s Focus
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#8E96A8]">
              Distraction-free view of everything due today
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-3xl font-bold font-mono tabular-nums text-violet-600 dark:text-violet-400">
              {progressPct}%
            </p>
            <p className="text-xs text-gray-500 dark:text-[#7C8496] tabular-nums">
              {completedCount} of {totalDueToday} items completed
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 w-full rounded-full bg-gray-100 dark:bg-[#1E232E] overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-600 dark:bg-violet-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Simple Focus Session Section */}
      <section className="rounded-2xl border border-gray-900 dark:border-[#242938] bg-[#111318] dark:bg-[#080A0E] text-white p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div>
              <h2 className="text-base font-semibold text-white">Focus Session</h2>
              <p className="text-xs text-gray-400">
                Choose a duration and stay locked in on a single goal.
              </p>
            </div>

            <input
              type="text"
              value={timerLabel}
              onChange={(e) => setTimerLabel(e.target.value)}
              aria-label="Focus session label"
              placeholder="What are you focusing on?"
              className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
            />

            <div className="flex flex-wrap items-center gap-2">
              {[15, 25, 45].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTimerPreset(preset)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-colors ${
                    timerPresetMinutes === preset
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.12]'
                  }`}
                >
                  {preset}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <span className="text-5xl font-bold font-mono tabular-nums tracking-tight text-white">
              {mins}:{secs}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={isTimerRunning ? pauseTimer : startTimer}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition-colors whitespace-nowrap"
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Session</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Focus Session</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetTimer}
                aria-label="Reset timer"
                className="rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] p-2.5 text-gray-300 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={completeFocusSession}
                className="rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-3 py-2.5 text-xs font-medium text-gray-200 transition-colors whitespace-nowrap"
              >
                Log Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Reminders & Follow-ups Due Today */}
      <section className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Reminders &amp; Follow-ups Due Today ({pendingTaskReminders.length + pendingFollowUps.length})
        </h2>

        {pendingTaskReminders.length === 0 && pendingFollowUps.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-[#7C8496]">
            All scheduled 1-4-7 task reminders and topic follow-ups for today are complete.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-[#1D212B]">
            {pendingTaskReminders.map((rem) => (
              <div key={rem.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleTaskReminderStatus(rem.id)}
                    aria-label={`Complete Day ${rem.stage} reminder for ${rem.taskTitle}`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-300 dark:border-[#343B4D] hover:border-violet-500 transition-colors"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {rem.taskTitle}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                      Day {rem.stage} Task Reminder · Cycle {rem.cycle} · {rem.category}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 shrink-0">
                  Due today
                </span>
              </div>
            ))}
            {pendingFollowUps.map((fu) => (
              <div key={fu.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleFollowUpStatus(fu.id)}
                    aria-label={`Complete Day ${fu.stage} recall for ${fu.topicName}`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-300 dark:border-[#343B4D] hover:border-violet-500 transition-colors"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {fu.topicName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                      Day {fu.stage} Topic Recall · {fu.category}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 shrink-0">
                  Due today
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Today's Pending Tasks */}
      <section className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Today&apos;s Tasks ({pendingTasks.length})
        </h2>

        {pendingTasks.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-[#7C8496]">
            No remaining pending tasks for today.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-[#1D212B]">
            {pendingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleTaskStatus(task.id)}
                    aria-label={`Complete ${task.title}`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-300 dark:border-[#343B4D] hover:border-violet-500 transition-colors"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                      {task.category} · <span className="capitalize">{task.priority}</span>
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono tabular-nums text-gray-500 dark:text-[#7C8496] inline-flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatTime12h(task.dueTime)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Today's Learning Topics & Completed Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Today&apos;s Learning Topics
          </h2>
          {todaysTopics.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-[#7C8496]">
              No active topics logged today yet.
            </p>
          ) : (
            <div className="space-y-3">
              {todaysTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-[#1E232E] bg-gray-50/70 dark:bg-[#0F1218] p-3"
                >
                  <BookOpen className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {topic.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                      {topic.category} ·{' '}
                      {topic.status === 'learned' ? 'Learned today' : 'Currently studying'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Completed Today ({completedItems.length})
          </h2>
          {completedItems.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-[#7C8496]">
              Items you complete today will appear here.
            </p>
          ) : (
            <div className="space-y-2.5">
              {completedItems.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="flex items-center gap-3 text-sm text-gray-500 dark:text-[#8E96A8]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      item.kind === 'task'
                        ? toggleTaskStatus(item.id)
                        : item.kind === 'taskReminder'
                        ? toggleTaskReminderStatus(item.id)
                        : toggleFollowUpStatus(item.id)
                    }
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white"
                    aria-label={`Undo completion for ${item.title}`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <div className="min-w-0">
                    <p className="line-through truncate">{item.title}</p>
                    <p className="text-xs opacity-75">{item.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
