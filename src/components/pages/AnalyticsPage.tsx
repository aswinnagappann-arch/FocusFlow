import React, { useMemo } from 'react';
import { BookOpen, CheckCircle2, Clock, Repeat } from 'lucide-react';
import { useFocusFlow } from '../../context/FocusFlowContext';
import { addDaysISO, formatReadableDate, getTodayISO } from '../../utils/dateUtils';
import { SummaryCard } from '../common/SummaryCard';

export const AnalyticsPage: React.FC = () => {
  const { state } = useFocusFlow();
  const today = getTodayISO();

  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter((t) => t.status === 'completed').length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const learnedTopics = state.topics.filter((t) => t.status === 'learned').length;
  const totalTopics = state.topics.length;

  const totalFollowUps = state.followUps.length;
  const completedFollowUps = state.followUps.filter((f) => f.status === 'completed').length;
  const followUpRate =
    totalFollowUps > 0 ? Math.round((completedFollowUps / totalFollowUps) * 100) : 0;

  const totalFocusMinutes = state.focusLogs.reduce((acc, l) => acc + l.durationMinutes, 0);
  const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);

  // Weekly Focus & Output (7 days)
  const weeklySeries = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDaysISO(today, i - 6);
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const label = dt.toLocaleDateString('en-US', { weekday: 'short' });
      const minutes = state.focusLogs
        .filter((l) => l.date === iso)
        .reduce((acc, l) => acc + l.durationMinutes, 0);
      const tasksDone = state.tasks.filter(
        (t) => t.status === 'completed' && t.dueDate === iso
      ).length;
      const followUpsDone = state.followUps.filter(
        (f) => f.status === 'completed' && f.scheduledDate === iso
      ).length;
      return {
        iso,
        label,
        hours: Number((minutes / 60).toFixed(1)),
        minutes,
        itemsDone: tasksDone + followUpsDone,
      };
    });
  }, [state.focusLogs, state.tasks, state.followUps, today]);

  const maxMinutes = Math.max(120, ...weeklySeries.map((d) => d.minutes));

  // 1-4-7 Stage Breakdown
  const stageBreakdown = ([1, 4, 7] as const).map((stage) => {
    const items = state.followUps.filter((f) => f.stage === stage);
    const done = items.filter((f) => f.status === 'completed').length;
    const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
    return { stage, total: items.length, done, pct };
  });

  // Monthly Activity (28 days ending today)
  const monthlyCells = useMemo(() => {
    return Array.from({ length: 28 }, (_, idx) => {
      const iso = addDaysISO(today, idx - 27);
      const focusMins = state.focusLogs
        .filter((l) => l.date === iso)
        .reduce((acc, l) => acc + l.durationMinutes, 0);
      const tasksCount = state.tasks.filter((t) => t.dueDate === iso && t.status === 'completed').length;
      const fuCount = state.followUps.filter(
        (f) => f.scheduledDate === iso && f.status === 'completed'
      ).length;
      const score = (focusMins > 0 ? 1 : 0) + (focusMins >= 120 ? 1 : 0) + tasksCount + fuCount;
      return { iso, score, focusMins, tasksCount, fuCount };
    });
  }, [state.focusLogs, state.tasks, state.followUps, today]);

  // Category Distribution
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of state.tasks) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    for (const tp of state.topics) {
      counts[tp.category] = (counts[tp.category] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [state.tasks, state.topics]);

  const maxCategoryCount = Math.max(1, ...categoryStats.map(([, c]) => c));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#8E96A8]">
          Track task completion, 1-4-7 recall consistency, and weekly study momentum
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          title="Tasks Completed"
          value={completedTasks}
          subtitle={`${taskCompletionRate}% of ${totalTasks} total`}
          icon={CheckCircle2}
          iconBgClass="bg-violet-600 text-white"
        />
        <SummaryCard
          title="Topics Learned"
          value={learnedTopics}
          subtitle={`Out of ${totalTopics} tracked`}
          icon={BookOpen}
          iconBgClass="bg-gray-900 text-white dark:bg-[#1E2330]"
        />
        <SummaryCard
          title="Follow-up Rate"
          value={`${followUpRate}%`}
          subtitle={`${completedFollowUps}/${totalFollowUps} recalls`}
          icon={Repeat}
          iconBgClass="bg-emerald-600/15 text-emerald-600 dark:text-emerald-400"
        />
        <SummaryCard
          title="Focus Logged"
          value={`${totalFocusHours}h`}
          subtitle="Total deep work"
          icon={Clock}
          iconBgClass="bg-amber-500/15 text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Weekly Productivity + 1-4-7 Cadence Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6">
          <div className="flex items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Weekly Productivity
              </h2>
              <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                Focus hours logged over the past 7 days
              </p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3 items-end h-48 pt-4">
            {weeklySeries.map((day) => {
              const heightPct = Math.max(12, Math.round((day.minutes / maxMinutes) * 100));
              return (
                <div key={day.iso} className="flex flex-col items-center h-full justify-end">
                  <span className="text-[11px] font-mono tabular-nums text-gray-500 dark:text-[#8E96A8] mb-1.5">
                    {day.hours}h
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[38px] rounded-xl transition-all ${
                      day.iso === today
                        ? 'striped-bar border border-violet-500/40'
                        : day.minutes >= 150
                        ? 'bg-violet-600 dark:bg-violet-500'
                        : 'bg-violet-400/60 dark:bg-violet-500/45'
                    }`}
                  />
                  <span className="mt-2 text-xs font-medium text-gray-500 dark:text-[#7C8496]">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              1-4-7 Recall Completion
            </h2>
            <p className="text-xs text-gray-500 dark:text-[#7C8496] mt-0.5">
              Completion rate across spaced-repetition stages
            </p>

            <div className="mt-6 space-y-5">
              {stageBreakdown.map((item) => (
                <div key={item.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      Day {item.stage} Review
                    </span>
                    <span className="font-mono tabular-nums text-gray-500 dark:text-[#8E96A8]">
                      {item.done}/{item.total} ({item.pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-[#1E232E] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.stage === 1
                          ? 'bg-violet-500'
                          : item.stage === 4
                          ? 'bg-sky-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-xs text-gray-500 dark:text-[#7C8496]">
            Consistent Day 1, 4, and 7 recalls significantly strengthen long-term memory retention.
          </p>
        </section>
      </div>

      {/* Monthly Activity Heatmap & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Monthly Activity
              </h2>
              <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                28-day focus &amp; completion cadence
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-[#7C8496]">
              <span>Less</span>
              <span className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-[#1D222D]" />
              <span className="w-3 h-3 rounded-sm bg-violet-300 dark:bg-violet-500/40" />
              <span className="w-3 h-3 rounded-sm bg-violet-500 dark:bg-violet-500/75" />
              <span className="w-3 h-3 rounded-sm bg-violet-600 dark:bg-violet-400" />
              <span>More</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthlyCells.map((cell) => {
              const colorClass =
                cell.score === 0
                  ? 'bg-gray-100 dark:bg-[#1A1F29]'
                  : cell.score === 1
                  ? 'bg-violet-200 dark:bg-violet-500/35'
                  : cell.score === 2
                  ? 'bg-violet-400 dark:bg-violet-500/65'
                  : 'bg-violet-600 dark:bg-violet-500';
              return (
                <div
                  key={cell.iso}
                  title={`${formatReadableDate(cell.iso)}: ${cell.focusMins}m focus · ${
                    cell.tasksCount + cell.fuCount
                  } completed`}
                  className={`h-9 rounded-lg ${colorClass} flex items-center justify-center text-[11px] font-mono tabular-nums ${
                    cell.score >= 2
                      ? 'text-white'
                      : 'text-gray-500 dark:text-[#737B8C]'
                  }`}
                >
                  {cell.iso.slice(-2)}
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Focus by Subject
          </h2>
          <p className="text-xs text-gray-500 dark:text-[#7C8496] mt-0.5 mb-5">
            Combined tasks &amp; learning topics per category
          </p>

          {categoryStats.length === 0 ? (
            <p className="py-8 text-sm text-gray-500 dark:text-[#7C8496]">
              Add tasks or learning topics to view your subject distribution.
            </p>
          ) : (
            <div className="space-y-4">
              {categoryStats.map(([cat, count]) => (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-200 truncate pr-2">
                      {cat}
                    </span>
                    <span className="font-mono tabular-nums text-gray-500 dark:text-[#8E96A8]">
                      {count} items
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-[#1E232E] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gray-900 dark:bg-violet-500"
                      style={{ width: `${Math.round((count / maxCategoryCount) * 100)}%` }}
                    />
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
