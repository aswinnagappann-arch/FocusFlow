import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  FolderKanban,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useFocusFlow } from '../../context/FocusFlowContext';
import {
  addDaysISO,
  formatFullDate,
  formatReadableDate,
  formatRelativeTimestamp,
  formatTime12h,
  getDynamicGreeting,
  getTodayISO,
} from '../../utils/dateUtils';
import { SummaryCard } from '../common/SummaryCard';

export const OverviewPage: React.FC = () => {
  const {
    state,
    setActivePage,
    openCreateTaskModal,
    openCreateTopicModal,
    openEditTaskModal,
    toggleTaskStatus,
    toggleTaskReminderStatus,
    toggleFollowUpStatus,
    timerSecondsLeft,
    isTimerRunning,
    timerLabel,
    startTimer,
    pauseTimer,
    resetTimer,
  } = useFocusFlow();

  const [todayTaskFilter, setTodayTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const today = getTodayISO();
  const greeting = getDynamicGreeting();
  const firstName = state.profile.name.split(' ')[0] || state.profile.name;

  // Summary Metrics
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter((t) => t.status === 'completed').length;
  const activeTopics = state.topics.filter((t) => t.status === 'learned').length;
  const pendingFollowUps =
    state.followUps.filter((f) => f.status === 'pending').length +
    state.taskReminders.filter((r) => r.status === 'pending').length;

  // Today's Tasks
  const todaysTasks = state.tasks
    .filter((t) => t.dueDate === today)
    .filter((t) => {
      if (todayTaskFilter === 'pending') return t.status === 'pending';
      if (todayTaskFilter === 'completed') return t.status === 'completed';
      return true;
    })
    .sort((a, b) => a.dueTime.localeCompare(b.dueTime));

  // Upcoming Reminders (1-4-7 task reminders + 1-4-7 topic follow-ups)
  const upcomingItems = [
    ...state.taskReminders.map((r) => ({
      kind: 'taskReminder' as const,
      id: r.id,
      title: r.taskTitle,
      category: r.category,
      stageLabel: `Day ${r.stage} Task · C${r.cycle}`,
      stage: r.stage,
      scheduledDate: r.scheduledDate,
      status: r.status,
    })),
    ...state.followUps.map((f) => ({
      kind: 'followup' as const,
      id: f.id,
      title: f.topicName,
      category: f.category,
      stageLabel: `Day ${f.stage} Topic`,
      stage: f.stage,
      scheduledDate: f.scheduledDate,
      status: f.status,
    })),
  ]
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return a.scheduledDate.localeCompare(b.scheduledDate);
    })
    .slice(0, 6);

  // Weekly Productivity Bar Chart (7 days ending today)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const iso = addDaysISO(today, i - 6);
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dayLetter = dt.toLocaleDateString('en-US', { weekday: 'narrow' });
    const dayFull = dt.toLocaleDateString('en-US', { weekday: 'short' });
    const minutes = state.focusLogs
      .filter((l) => l.date === iso)
      .reduce((acc, l) => acc + l.durationMinutes, 0);
    const hours = Number((minutes / 60).toFixed(1));
    return { iso, dayLetter, dayFull, minutes, hours, isToday: iso === today };
  });

  const maxHours = Math.max(4, ...weekDays.map((d) => d.hours));
  const totalWeekMinutes = weekDays.reduce((acc, d) => acc + d.minutes, 0);
  const totalWeekHours = (totalWeekMinutes / 60).toFixed(1);

  // Activity dots matrix for 4th summary card (20 slots representing active vs upcoming)
  const completedFollowUpsCount =
    state.followUps.filter((f) => f.status === 'completed').length +
    state.taskReminders.filter((r) => r.status === 'completed').length;
  const totalFollowUpsCount = Math.max(1, state.followUps.length + state.taskReminders.length);
  const filledDots = Math.round((completedFollowUpsCount / totalFollowUpsCount) * 20);
  const followUpDots = Array.from({ length: 20 }, (_, i) => i < filledDots);

  // Timer formatting
  const mins = String(Math.floor(timerSecondsLeft / 60)).padStart(2, '0');
  const secs = String(timerSecondsLeft % 60).padStart(2, '0');

  return (
    <div className="space-y-6">
      {/* Top Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-gray-500 dark:text-[#7C8496] mb-1">
            {formatFullDate(today)}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white text-balance">
            {greeting}, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#8E96A8]">
            Let&apos;s make today productive. Learn. Organise. Remember.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateTaskModal(today)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 dark:bg-violet-600 hover:bg-gray-800 dark:hover:bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>New Task</span>
        </button>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Tasks"
          value={totalTasks}
          subtitle="Across schedule"
          icon={FolderKanban}
          iconBgClass="bg-gray-900 text-white dark:bg-[#1E2330] dark:text-gray-100"
          onClick={() => setActivePage('tasks')}
        />
        <SummaryCard
          title="Completed Tasks"
          value={completedTasks}
          subtitle={totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}% done` : 'No tasks yet'}
          icon={CheckCircle2}
          iconBgClass="bg-violet-600 text-white"
          onClick={() => setActivePage('tasks')}
        />
        <SummaryCard
          title="Active Learning Topics"
          value={activeTopics}
          subtitle="1-4-7 retention active"
          icon={BookOpen}
          iconBgClass="bg-gray-100 text-gray-700 dark:bg-[#1E232E] dark:text-violet-300"
          onClick={() => setActivePage('topics')}
        />
        <SummaryCard
          title="Upcoming Follow-ups"
          value={pendingFollowUps}
          subtitle="Scheduled recalls"
          icon={CalendarClock}
          iconBgClass="bg-amber-500/15 text-amber-600 dark:text-amber-400"
          onClick={() => setActivePage('calendar')}
          footerDots={followUpDots}
        />
      </div>

      {/* Productivity Trends + Focus Timer Row (Equa-inspired centerpiece) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Weekly Productivity Trends */}
        <section className="lg:col-span-8 rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Productivity Trends
              </h2>
              <p className="text-xs text-gray-500 dark:text-[#7C8496] mt-0.5">
                Daily focus hours over the last 7 days
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivePage('analytics')}
              className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline whitespace-nowrap"
            >
              View Analytics
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-end">
            <div className="sm:col-span-4 space-y-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums text-gray-900 dark:text-white">
                  {totalWeekHours}
                </span>
                <span className="text-sm font-medium text-gray-500 dark:text-[#8E96A8]">hrs</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                logged this week
              </p>
              <p className="text-xs font-medium text-gray-500 dark:text-[#8E96A8]">
                {totalWeekMinutes > 0
                  ? `${state.focusLogs.length} focus ${
                      state.focusLogs.length === 1 ? 'session' : 'sessions'
                    } recorded`
                  : 'No focus sessions logged yet'}
              </p>
            </div>

            {/* Pill Bar Chart */}
            <div className="sm:col-span-8">
              <div className="grid grid-cols-7 gap-2.5 sm:gap-3.5 items-end h-36 pt-6">
                {weekDays.map((day, idx) => {
                  const ratio = day.hours / maxHours;
                  const heightPct = Math.max(18, Math.round(ratio * 100));
                  const maxWeekHours = Math.max(...weekDays.map((d) => d.hours));
                  const isPeak = maxWeekHours > 0 && day.hours === maxWeekHours;
                  return (
                    <div
                      key={day.iso}
                      className="relative flex flex-col items-center h-full justify-end group"
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                    >
                      {(hoveredBarIndex === idx || (hoveredBarIndex === null && isPeak)) && (
                        <div className="absolute -top-1 rounded-md bg-gray-900 dark:bg-white px-2 py-0.5 text-[11px] font-mono tabular-nums text-white dark:text-gray-900 whitespace-nowrap shadow-sm z-10">
                          {day.hours}h
                        </div>
                      )}
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full max-w-[36px] rounded-full transition-transform duration-150 group-hover:scale-[1.03] ${
                          day.isToday
                            ? 'striped-bar border border-violet-500/40'
                            : isPeak
                            ? 'bg-violet-600 dark:bg-violet-500'
                            : day.hours > 1.5
                            ? 'bg-violet-400/75 dark:bg-violet-500/55'
                            : 'bg-gray-100 dark:bg-[#1E232E]'
                        }`}
                        title={`${day.dayFull}: ${day.hours} hours`}
                      />
                      <span
                        className={`mt-2 text-[11px] font-medium ${
                          day.isToday
                            ? 'text-violet-600 dark:text-violet-400'
                            : 'text-gray-400 dark:text-[#6B7285]'
                        }`}
                      >
                        {day.dayLetter}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Right: Equa-inspired Dark Focus Session Card */}
        <section className="lg:col-span-4 rounded-2xl border border-gray-900 dark:border-[#242938] bg-[#111318] dark:bg-[#080A0E] text-white p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">Focus Session</h2>
              <p className="text-xs text-gray-400 truncate mt-0.5">{timerLabel}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={isTimerRunning ? pauseTimer : startTimer}
                aria-label={isTimerRunning ? 'Pause focus session' : 'Start focus session'}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-900 hover:bg-gray-200 transition-colors"
              >
                {isTimerRunning ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={resetTimer}
                aria-label="Reset focus session"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="my-5 flex items-center justify-center">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-center w-full">
              <span className="text-4xl font-bold font-mono tracking-tight tabular-nums text-white">
                {mins}:{secs}
              </span>
              <p className="mt-1 text-xs text-gray-400">
                {isTimerRunning ? 'Session in progress' : 'Ready to focus'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActivePage('focus')}
            className="inline-flex items-center justify-between w-full rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3.5 py-2 text-xs font-medium text-gray-200 transition-colors"
          >
            <span>Open Today&apos;s Focus</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      </div>

      {/* Two-Column Actionable Workspace: Today's Tasks & Upcoming Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Section: Today's Tasks */}
        <section className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Today&apos;s Tasks
              </h2>
              <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                Scheduled for {formatReadableDate(today)}
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-[#0D1015] p-1 border border-gray-200/70 dark:border-[#222734]">
              {(['all', 'pending', 'completed'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTodayTaskFilter(tab)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                    todayTaskFilter === tab
                      ? 'bg-white dark:bg-[#1E232F] text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-[#7C8496] hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {todaysTasks.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-[#7C8496]">
                No {todayTaskFilter === 'all' ? '' : todayTaskFilter} tasks scheduled for today.
              </p>
              <button
                type="button"
                onClick={() => openCreateTaskModal(today)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#262C3A] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#191D26]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Task for Today
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-[#1D212B]">
              {todaysTasks.map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 py-3.5 first:pt-1 last:pb-1 group"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(task.id)}
                      aria-label={isDone ? `Mark ${task.title} pending` : `Mark ${task.title} completed`}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        isDone
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'border-gray-300 dark:border-[#343B4D] hover:border-violet-500'
                      }`}
                    >
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => openEditTaskModal(task)}
                    >
                      <p
                        className={`text-sm font-medium transition-colors ${
                          isDone
                            ? 'line-through text-gray-400 dark:text-[#636B7D]'
                            : 'text-gray-900 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400'
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-[#7C8496]">
                        <span>{task.category}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`capitalize font-medium ${
                            task.priority === 'high'
                              ? 'text-amber-600 dark:text-amber-400'
                              : task.priority === 'medium'
                              ? 'text-violet-600 dark:text-violet-400'
                              : 'text-gray-500 dark:text-[#7C8496]'
                          }`}
                        >
                          {task.priority} priority
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime12h(task.dueTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Section: Upcoming Reminders & Follow-ups */}
        <section className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Upcoming Reminders
              </h2>
              <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                1-4-7 task loops &amp; learning follow-ups
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivePage('topics')}
              className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline whitespace-nowrap"
            >
              Manage Topics
            </button>
          </div>

          {upcomingItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-[#7C8496]">
                Add a task or mark a learning topic as learned to generate your 1-4-7 local reminder schedule.
              </p>
              <button
                type="button"
                onClick={openCreateTopicModal}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#262C3A] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#191D26]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Learning Topic
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-[#1D212B]">
              {upcomingItems.map((item) => {
                const isDone = item.status === 'completed';
                const isDueToday = item.scheduledDate === today;
                const isOverdue = item.scheduledDate < today && !isDone;
                return (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="flex items-start gap-3 py-3.5 first:pt-1 last:pb-1"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        item.kind === 'taskReminder'
                          ? toggleTaskReminderStatus(item.id)
                          : toggleFollowUpStatus(item.id)
                      }
                      aria-label={`Toggle ${item.stageLabel} for ${item.title}`}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-300 dark:border-[#343B4D] hover:border-violet-500'
                      }`}
                    >
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm font-medium truncate ${
                            isDone
                              ? 'line-through text-gray-400 dark:text-[#636B7D]'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          {item.title}
                        </p>
                        <span
                          className={`text-xs font-medium shrink-0 ${
                            isDone
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isOverdue
                              ? 'text-red-500 dark:text-red-400'
                              : isDueToday
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-gray-500 dark:text-[#7C8496]'
                          }`}
                        >
                          {isDone
                            ? 'Completed'
                            : isOverdue
                            ? 'Overdue'
                            : isDueToday
                            ? 'Due today'
                            : 'Scheduled'}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-[#7C8496]">
                        <span
                          className={`font-medium ${
                            item.kind === 'taskReminder'
                              ? item.stage === 1
                                ? 'text-amber-600 dark:text-amber-400'
                                : item.stage === 4
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-teal-600 dark:text-teal-400'
                              : item.stage === 1
                              ? 'text-violet-600 dark:text-violet-400'
                              : item.stage === 4
                              ? 'text-sky-600 dark:text-sky-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.stageLabel}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {formatReadableDate(item.scheduledDate)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.category}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#1D212B] flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-[#7C8496]">
              Local Calendar 1-4-7 schedule
            </span>
            <button
              type="button"
              onClick={() => setActivePage('calendar')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
            >
              <span>View Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>

      {/* Bottom Section: Recent Activity Timeline */}
      <section className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h2>
          <span className="text-xs text-gray-500 dark:text-[#7C8496] tabular-nums">
            {state.activities.length} recent events
          </span>
        </div>

        {state.activities.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-[#7C8496] py-4">
            Complete tasks or mark learning topics to see your activity timeline.
          </p>
        ) : (
          <div className="space-y-3">
            {state.activities.slice(0, 6).map((act) => (
              <div
                key={act.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 py-2 border-b border-gray-100 dark:border-[#1B1F29] last:border-b-0"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-[#1A1F2B] text-gray-600 dark:text-violet-400">
                    {act.type === 'task_completed' || act.type === 'followup_completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : act.type === 'topic_learned' || act.type === 'topic_added' ? (
                      <BookOpen className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {act.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#7C8496] truncate">
                      {act.detail}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono tabular-nums text-gray-400 dark:text-[#6B7285] sm:ml-4 shrink-0 pl-9 sm:pl-0">
                  {formatRelativeTimestamp(act.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
