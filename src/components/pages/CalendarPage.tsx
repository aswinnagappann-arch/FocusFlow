import React, { useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Plus,
  Repeat,
  Trash2,
  X,
} from 'lucide-react';
import { useFocusFlow } from '../../context/FocusFlowContext';
import {
  FollowUpSession,
  LocalCalendarEvent,
  Task,
  TaskReminderSession,
} from '../../types/focusflow';
import {
  formatFullDate,
  formatReadableDate,
  formatTime12h,
  getMonthGridDates,
  getStartOfWeek,
  getTodayISO,
  toISODate,
} from '../../utils/dateUtils';

type CalendarView = 'month' | 'week' | 'agenda';

type SelectedEvent =
  | { kind: 'taskReminder'; item: TaskReminderSession }
  | { kind: 'followup'; item: FollowUpSession }
  | { kind: 'task'; item: Task }
  | { kind: 'localEvent'; item: LocalCalendarEvent }
  | null;

export const CalendarPage: React.FC = () => {
  const {
    state,
    toggleTaskReminderStatus,
    toggleFollowUpStatus,
    toggleTaskStatus,
    openCreateTaskModal,
    openEditTaskModal,
    addLocalEvent,
    deleteLocalEvent,
    pushPermission,
    requestPushPermission,
    updateSettings,
  } = useFocusFlow();

  const todayISO = getTodayISO();
  const [view, setView] = useState<CalendarView>('month');
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [selectedDayISO, setSelectedDayISO] = useState<string>(todayISO);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>(null);

  // Add Local Event Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evDescription, setEvDescription] = useState('');
  const [evDate, setEvDate] = useState(todayISO);
  const [evTime, setEvTime] = useState('09:00');
  const [evColor, setEvColor] = useState<LocalCalendarEvent['color']>('teal');
  const [evError, setEvError] = useState('');

  const monthDates = useMemo(
    () => getMonthGridDates(cursorDate.getFullYear(), cursorDate.getMonth()),
    [cursorDate]
  );

  const weekDates = useMemo(() => {
    const start = getStartOfWeek(cursorDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursorDate]);

  const eventsByDate = useMemo(() => {
    const map: Record<
      string,
      {
        taskReminders: TaskReminderSession[];
        followUps: FollowUpSession[];
        tasks: Task[];
        localEvents: LocalCalendarEvent[];
      }
    > = {};
    const ensure = (iso: string) => {
      if (!map[iso]) {
        map[iso] = { taskReminders: [], followUps: [], tasks: [], localEvents: [] };
      }
    };
    for (const rem of state.taskReminders) {
      ensure(rem.scheduledDate);
      map[rem.scheduledDate].taskReminders.push(rem);
    }
    for (const fu of state.followUps) {
      ensure(fu.scheduledDate);
      map[fu.scheduledDate].followUps.push(fu);
    }
    for (const t of state.tasks) {
      ensure(t.dueDate);
      map[t.dueDate].tasks.push(t);
    }
    for (const ev of state.localEvents) {
      ensure(ev.date);
      map[ev.date].localEvents.push(ev);
    }
    return map;
  }, [state.taskReminders, state.followUps, state.tasks, state.localEvents]);

  const navigatePeriod = (dir: -1 | 1) => {
    const next = new Date(cursorDate);
    if (view === 'month') {
      next.setMonth(next.getMonth() + dir);
    } else if (view === 'week') {
      next.setDate(next.getDate() + dir * 7);
    } else {
      next.setDate(next.getDate() + dir);
      setSelectedDayISO(toISODate(next));
    }
    setCursorDate(next);
  };

  const jumpToToday = () => {
    const now = new Date();
    setCursorDate(now);
    setSelectedDayISO(todayISO);
  };

  const openAddLocalEvent = (presetDate?: string) => {
    setEvTitle('');
    setEvDescription('');
    setEvDate(presetDate || selectedDayISO || todayISO);
    setEvTime('09:00');
    setEvColor('teal');
    setEvError('');
    setIsEventModalOpen(true);
  };

  const handleCreateLocalEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) {
      setEvError('Please enter an event title.');
      return;
    }
    addLocalEvent({
      title: evTitle.trim(),
      description: evDescription.trim(),
      date: evDate || todayISO,
      time: evTime || '09:00',
      color: evColor,
    });
    setIsEventModalOpen(false);
  };

  const exportLocalICS = () => {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FocusFlow//Local Calendar//EN',
    ];

    const formatICSDate = (iso: string) => iso.replace(/-/g, '');
    const escapeText = (txt: string) => txt.replace(/[\n\r]+/g, '\\n').replace(/,/g, '\\,');

    for (const rem of state.taskReminders) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${rem.id}@focusflow.local`,
        `DTSTART;VALUE=DATE:${formatICSDate(rem.scheduledDate)}`,
        `SUMMARY:${escapeText(`[Day ${rem.stage} · Cycle ${rem.cycle}] ${rem.taskTitle}`)}`,
        `DESCRIPTION:${escapeText(`1-4-7 Task Reminder (${rem.category})`)}`,
        'END:VEVENT'
      );
    }

    for (const fu of state.followUps) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${fu.id}@focusflow.local`,
        `DTSTART;VALUE=DATE:${formatICSDate(fu.scheduledDate)}`,
        `SUMMARY:${escapeText(`[Day ${fu.stage} Recall] ${fu.topicName}`)}`,
        `DESCRIPTION:${escapeText(`1-4-7 Topic Follow-up (${fu.category})`)}`,
        'END:VEVENT'
      );
    }

    for (const t of state.tasks) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${t.id}@focusflow.local`,
        `DTSTART;VALUE=DATE:${formatICSDate(t.dueDate)}`,
        `SUMMARY:${escapeText(t.title)}`,
        `DESCRIPTION:${escapeText(`${t.category} · ${t.priority} priority`)}`,
        'END:VEVENT'
      );
    }

    for (const ev of state.localEvents) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${ev.id}@focusflow.local`,
        `DTSTART;VALUE=DATE:${formatICSDate(ev.date)}`,
        `SUMMARY:${escapeText(ev.title)}`,
        `DESCRIPTION:${escapeText(ev.description || 'Local Calendar Event')}`,
        'END:VEVENT'
      );
    }

    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusflow-local-calendar-${todayISO}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const headerTitle =
    view === 'month'
      ? cursorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : view === 'week'
      ? `Week of ${formatReadableDate(toISODate(weekDates[0]))} – ${formatReadableDate(
          toISODate(weekDates[6])
        )}`
      : formatFullDate(selectedDayISO);

  const taskReminderStageStyles = (stage: 1 | 4 | 7, completed: boolean) => {
    if (completed) {
      return 'bg-gray-100 dark:bg-[#1B1F29] text-gray-400 dark:text-[#636B7D] line-through border-gray-200 dark:border-[#242936]';
    }
    if (stage === 1) {
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25';
    }
    if (stage === 4) {
      return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25';
    }
    return 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25';
  };

  const followUpStageStyles = (stage: 1 | 4 | 7, completed: boolean) => {
    if (completed) {
      return 'bg-gray-100 dark:bg-[#1B1F29] text-gray-400 dark:text-[#636B7D] line-through border-gray-200 dark:border-[#242936]';
    }
    if (stage === 1) {
      return 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25';
    }
    if (stage === 4) {
      return 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25';
    }
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
  };

  const localEventColorStyles = (color: LocalCalendarEvent['color']) => {
    if (color === 'violet') {
      return 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300';
    }
    if (color === 'amber') {
      return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    }
    return 'border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300';
  };

  const selectedDayEvents = eventsByDate[selectedDayISO] || {
    taskReminders: [],
    followUps: [],
    tasks: [],
    localEvents: [],
  };

  const activeModalTaskReminder =
    selectedEvent?.kind === 'taskReminder'
      ? state.taskReminders.find((r) => r.id === selectedEvent.item.id) || null
      : null;
  const activeModalFollowUp =
    selectedEvent?.kind === 'followup'
      ? state.followUps.find((f) => f.id === selectedEvent.item.id) || null
      : null;
  const activeModalTask =
    selectedEvent?.kind === 'task'
      ? state.tasks.find((t) => t.id === selectedEvent.item.id) || null
      : null;
  const activeModalLocalEvent =
    selectedEvent?.kind === 'localEvent'
      ? state.localEvents.find((ev) => ev.id === selectedEvent.item.id) || null
      : null;

  const pendingReminderCount = state.taskReminders.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Local Calendar
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#8E96A8]">
            Runs locally in your browser · 1-4-7 task reminder loops, learning recalls, and events
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => openAddLocalEvent(selectedDayISO)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#262C3B] bg-white dark:bg-[#13161C] hover:bg-gray-50 dark:hover:bg-[#1B1F2A] px-3.5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors whitespace-nowrap"
          >
            <CalendarDays className="w-4 h-4 text-teal-500" />
            <span>Add Local Event</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateTaskModal(selectedDayISO)}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 dark:bg-violet-600 hover:bg-gray-800 dark:hover:bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task on {formatReadableDate(selectedDayISO)}</span>
          </button>
        </div>
      </div>

      {/* Local Calendar Status & ICS Export */}
      <div className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
            <Repeat className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Offline-Ready Local Schedule ({pendingReminderCount} active 1-4-7 reminders)
            </p>
            <p className="text-xs text-gray-500 dark:text-[#8E96A8]">
              Every new task automatically schedules Day 1, Day 4, and Day 7 reminders and loops into the next cycle after Day 7.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={exportLocalICS}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#262C3B] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1B1F2A] transition-colors shrink-0 self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export .ics File</span>
        </button>
      </div>

      {/* Local Push Notifications Bar */}
      <div className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Local Reminder Push Notifications
            </p>
            <p className="text-xs text-gray-500 dark:text-[#8E96A8]">
              {pushPermission === 'granted' && state.settings.pushEnabled
                ? 'Active for Day 1-4-7 task reminders, tasks, 1-4-7 topic follow-ups, and local events.'
                : pushPermission === 'denied'
                ? 'Blocked in browser settings — allow notifications for this site to receive alerts.'
                : pushPermission === 'unsupported'
                ? 'Browser notifications are unavailable in this environment; all reminders remain tracked on your Local Calendar.'
                : 'Enable browser notifications to receive live local alerts on Day 1, Day 4, and Day 7.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {pushPermission === 'granted' ? (
            <>
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.settings.remindTasks}
                  onChange={(e) => updateSettings({ remindTasks: e.target.checked })}
                  className="h-3.5 w-3.5 accent-violet-600 rounded"
                />
                <span>Tasks &amp; 1-4-7 Loop</span>
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.settings.remindFollowups}
                  onChange={(e) => updateSettings({ remindFollowups: e.target.checked })}
                  className="h-3.5 w-3.5 accent-violet-600 rounded"
                />
                <span>1-4-7 Topics</span>
              </label>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Enabled
              </span>
            </>
          ) : (
            pushPermission !== 'unsupported' &&
            pushPermission !== 'denied' && (
              <button
                type="button"
                onClick={() => {
                  void requestPushPermission();
                }}
                className="rounded-xl bg-violet-600 hover:bg-violet-500 px-3.5 py-1.5 text-xs font-medium text-white transition-colors whitespace-nowrap"
              >
                Enable Push Notifications
              </button>
            )
          )}
        </div>
      </div>

      {/* Controls & Legend */}
      <div className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigatePeriod(-1)}
              aria-label="Previous period"
              className="p-2 rounded-lg border border-gray-200 dark:border-[#242936] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1B1F2A]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={jumpToToday}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#242936] text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1B1F2A]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => navigatePeriod(1)}
              aria-label="Next period"
              className="p-2 rounded-lg border border-gray-200 dark:border-[#242936] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1B1F2A]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{headerTitle}</h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-[#8E96A8]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-amber-500" />
              Task Day 1
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-rose-500" />
              Task Day 4
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-teal-500" />
              Task Day 7
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-violet-500" />
              Topic Follow-up
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-gray-400 dark:bg-gray-500" />
              Task Due
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-[#0D1015] p-1 border border-gray-200/70 dark:border-[#222734]">
            {(['month', 'week', 'agenda'] as CalendarView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  view === v
                    ? 'bg-white dark:bg-[#1E232F] text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-[#7C8496] hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {view === 'month' && (
        <div className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-[#1E232E] bg-gray-50/60 dark:bg-[#0F1218]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
              <div
                key={dayName}
                className="py-2.5 text-center text-xs font-medium text-gray-500 dark:text-[#7C8496]"
              >
                {dayName}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 dark:divide-[#1D212B]">
            {monthDates.map((d) => {
              const iso = toISODate(d);
              const inMonth = d.getMonth() === cursorDate.getMonth();
              const isToday = iso === todayISO;
              const isSelected = iso === selectedDayISO;
              const dayEvents = eventsByDate[iso] || {
                taskReminders: [],
                followUps: [],
                tasks: [],
                localEvents: [],
              };
              const totalEvents =
                dayEvents.taskReminders.length +
                dayEvents.followUps.length +
                dayEvents.tasks.length +
                dayEvents.localEvents.length;

              return (
                <div
                  key={iso}
                  onClick={() => {
                    setSelectedDayISO(iso);
                    setCursorDate(d);
                  }}
                  className={`min-h-[96px] sm:min-h-[120px] p-2 cursor-pointer transition-colors ${
                    inMonth
                      ? 'bg-white dark:bg-[#13161C]'
                      : 'bg-gray-50/50 dark:bg-[#0D1015]/60 text-gray-400 dark:text-[#52596B]'
                  } ${
                    isSelected
                      ? 'ring-1 ring-inset ring-violet-500/60 bg-violet-500/[0.03] dark:bg-violet-500/[0.05]'
                      : 'hover:bg-gray-50 dark:hover:bg-[#171B24]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-mono tabular-nums ${
                        isToday
                          ? 'bg-violet-600 text-white font-semibold'
                          : inMonth
                          ? 'text-gray-700 dark:text-gray-200'
                          : 'text-gray-400 dark:text-[#555C6E]'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    {totalEvents > 0 && (
                      <span className="text-[10px] font-mono tabular-nums text-gray-400 dark:text-[#6B7285] sm:hidden">
                        {totalEvents}
                      </span>
                    )}
                  </div>

                  <div className="hidden sm:block space-y-1">
                    {dayEvents.taskReminders.slice(0, 2).map((rem) => (
                      <button
                        key={rem.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent({ kind: 'taskReminder', item: rem });
                        }}
                        className={`block w-full truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-85 ${taskReminderStageStyles(
                          rem.stage,
                          rem.status === 'completed'
                        )}`}
                      >
                        D{rem.stage} · {rem.taskTitle}
                      </button>
                    ))}
                    {dayEvents.followUps.slice(0, 1).map((fu) => (
                      <button
                        key={fu.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent({ kind: 'followup', item: fu });
                        }}
                        className={`block w-full truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-85 ${followUpStageStyles(
                          fu.stage,
                          fu.status === 'completed'
                        )}`}
                      >
                        Topic D{fu.stage} · {fu.topicName}
                      </button>
                    ))}
                    {dayEvents.tasks.slice(0, 1).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent({ kind: 'task', item: task });
                        }}
                        className={`block w-full truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-85 ${
                          task.status === 'completed'
                            ? 'bg-gray-100 dark:bg-[#1B1F29] text-gray-400 dark:text-[#636B7D] line-through border-gray-200 dark:border-[#242936]'
                            : 'bg-gray-100 dark:bg-[#1B202C] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#282F3F]'
                        }`}
                      >
                        {task.title}
                      </button>
                    ))}
                    {dayEvents.localEvents.slice(0, 1).map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent({ kind: 'localEvent', item: ev });
                        }}
                        className={`block w-full truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-85 ${localEventColorStyles(
                          ev.color
                        )}`}
                      >
                        Event · {ev.title}
                      </button>
                    ))}
                    {totalEvents > 4 && (
                      <p className="text-[10px] text-gray-400 dark:text-[#737B8C] pl-1">
                        +{totalEvents - 4} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDates.map((d) => {
            const iso = toISODate(d);
            const isToday = iso === todayISO;
            const dayEvents = eventsByDate[iso] || {
              taskReminders: [],
              followUps: [],
              tasks: [],
              localEvents: [],
            };
            return (
              <div
                key={iso}
                onClick={() => setSelectedDayISO(iso)}
                className={`rounded-2xl border p-3.5 min-h-[220px] flex flex-col gap-2.5 cursor-pointer transition-colors ${
                  isToday
                    ? 'border-violet-500/50 bg-violet-500/[0.03] dark:bg-[#151822]'
                    : 'border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C]'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#1E232E]">
                  <span className="text-xs font-medium text-gray-500 dark:text-[#8E96A8]">
                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span
                    className={`text-xs font-mono tabular-nums px-2 py-0.5 rounded-md ${
                      isToday
                        ? 'bg-violet-600 text-white font-semibold'
                        : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {d.getDate()}
                  </span>
                </div>

                <div className="space-y-1.5 flex-1">
                  {dayEvents.taskReminders.map((rem) => (
                    <button
                      key={rem.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent({ kind: 'taskReminder', item: rem });
                      }}
                      className={`block w-full rounded-lg border p-2 text-left text-xs ${taskReminderStageStyles(
                        rem.stage,
                        rem.status === 'completed'
                      )}`}
                    >
                      <span className="block font-semibold">
                        Day {rem.stage} · Cycle {rem.cycle}
                      </span>
                      <span className="block truncate opacity-90">{rem.taskTitle}</span>
                    </button>
                  ))}

                  {dayEvents.followUps.map((fu) => (
                    <button
                      key={fu.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent({ kind: 'followup', item: fu });
                      }}
                      className={`block w-full rounded-lg border p-2 text-left text-xs ${followUpStageStyles(
                        fu.stage,
                        fu.status === 'completed'
                      )}`}
                    >
                      <span className="block font-semibold">Topic Day {fu.stage}</span>
                      <span className="block truncate opacity-90">{fu.topicName}</span>
                    </button>
                  ))}

                  {dayEvents.tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent({ kind: 'task', item: task });
                      }}
                      className={`block w-full rounded-lg border p-2 text-left text-xs ${
                        task.status === 'completed'
                          ? 'bg-gray-100 dark:bg-[#1B1F29] text-gray-400 dark:text-[#636B7D] line-through border-gray-200 dark:border-[#242936]'
                          : 'bg-gray-50 dark:bg-[#191D27] text-gray-800 dark:text-gray-200 border-gray-200 dark:border-[#262C3B]'
                      }`}
                    >
                      <span className="block font-medium truncate">{task.title}</span>
                      <span className="block text-[11px] font-mono opacity-75">
                        {formatTime12h(task.dueTime)}
                      </span>
                    </button>
                  ))}

                  {dayEvents.localEvents.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent({ kind: 'localEvent', item: ev });
                      }}
                      className={`block w-full rounded-lg border p-2 text-left text-xs ${localEventColorStyles(
                        ev.color
                      )}`}
                    >
                      <span className="block font-semibold truncate">{ev.title}</span>
                      <span className="block text-[11px] font-mono opacity-80">
                        {formatTime12h(ev.time)}
                      </span>
                    </button>
                  ))}

                  {dayEvents.taskReminders.length === 0 &&
                    dayEvents.followUps.length === 0 &&
                    dayEvents.tasks.length === 0 &&
                    dayEvents.localEvents.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-[#5C6476] pt-2">
                        No events
                      </p>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DAILY AGENDA VIEW (and Selected Day Panel below Month View) */}
      {(view === 'agenda' || view === 'month') && (
        <section className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Local Agenda for {formatFullDate(selectedDayISO)}
              </h3>
              <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                Complete a Day 7 task reminder to automatically loop into the next 1-4-7 cycle
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAddLocalEvent(selectedDayISO)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#252A38] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1A1E28]"
              >
                <Plus className="w-3.5 h-3.5" />
                Local Event
              </button>
              <button
                type="button"
                onClick={() => openCreateTaskModal(selectedDayISO)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#252A38] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1A1E28]"
              >
                <Plus className="w-3.5 h-3.5" />
                Task This Day
              </button>
            </div>
          </div>

          {selectedDayEvents.taskReminders.length === 0 &&
          selectedDayEvents.followUps.length === 0 &&
          selectedDayEvents.tasks.length === 0 &&
          selectedDayEvents.localEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-[#7C8496]">
              No reminders, tasks, or local events scheduled for{' '}
              {formatReadableDate(selectedDayISO)}.
            </p>
          ) : (
            <div className="space-y-2.5">
              {selectedDayEvents.taskReminders.map((rem) => (
                <div
                  key={rem.id}
                  onClick={() => setSelectedEvent({ kind: 'taskReminder', item: rem })}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-[#222734] bg-gray-50/70 dark:bg-[#0F1218] p-3.5 cursor-pointer hover:border-violet-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskReminderStatus(rem.id);
                      }}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        rem.status === 'completed'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-300 dark:border-[#3A4256]'
                      }`}
                    >
                      {rem.status === 'completed' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          rem.status === 'completed'
                            ? 'line-through text-gray-400 dark:text-[#636B7D]'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {rem.taskTitle}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                        Day {rem.stage} Reminder · Cycle {rem.cycle} · {rem.category}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium shrink-0 ${taskReminderStageStyles(
                      rem.stage,
                      rem.status === 'completed'
                    )}`}
                  >
                    Day {rem.stage} · C{rem.cycle}
                  </span>
                </div>
              ))}

              {selectedDayEvents.followUps.map((fu) => (
                <div
                  key={fu.id}
                  onClick={() => setSelectedEvent({ kind: 'followup', item: fu })}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-[#222734] bg-gray-50/70 dark:bg-[#0F1218] p-3.5 cursor-pointer hover:border-violet-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollowUpStatus(fu.id);
                      }}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        fu.status === 'completed'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-300 dark:border-[#3A4256]'
                      }`}
                    >
                      {fu.status === 'completed' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          fu.status === 'completed'
                            ? 'line-through text-gray-400 dark:text-[#636B7D]'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {fu.topicName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                        Topic Day {fu.stage} Follow-up · {fu.category}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium shrink-0 ${followUpStageStyles(
                      fu.stage,
                      fu.status === 'completed'
                    )}`}
                  >
                    Day {fu.stage}
                  </span>
                </div>
              ))}

              {selectedDayEvents.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedEvent({ kind: 'task', item: task })}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-[#222734] bg-gray-50/70 dark:bg-[#0F1218] p-3.5 cursor-pointer hover:border-violet-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskStatus(task.id);
                      }}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        task.status === 'completed'
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'border-gray-300 dark:border-[#3A4256]'
                      }`}
                    >
                      {task.status === 'completed' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          task.status === 'completed'
                            ? 'line-through text-gray-400 dark:text-[#636B7D]'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                        {task.category} · {task.priority} priority
                        {task.reminderEnabled ? ' · 1-4-7 loop' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-gray-500 dark:text-[#7C8496] inline-flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatTime12h(task.dueTime)}
                  </span>
                </div>
              ))}

              {selectedDayEvents.localEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent({ kind: 'localEvent', item: ev })}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors ${localEventColorStyles(
                    ev.color
                  )}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {ev.title}
                    </p>
                    <p className="text-xs opacity-85 truncate">
                      Local Calendar Event{ev.description ? ` · ${ev.description}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums shrink-0">
                    {formatTime12h(ev.time)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Add Local Event Modal */}
      {isEventModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsEventModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-[#242936] bg-white dark:bg-[#13161C] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#1E222D] px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Add Local Calendar Event
              </h3>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                aria-label="Close event modal"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLocalEvent} className="p-6 space-y-4">
              {evError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
                  {evError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
                  Event title
                </label>
                <input
                  type="text"
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder="e.g., Weekly Review Session"
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={evDescription}
                  onChange={(e) => setEvDescription(e.target.value)}
                  placeholder="Details or location..."
                  className="w-full rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={evDate}
                    onChange={(e) => setEvDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] px-3 py-2 text-sm font-mono text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
                    Time
                  </label>
                  <input
                    type="time"
                    value={evTime}
                    onChange={(e) => setEvTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-[#252A38] bg-gray-50 dark:bg-[#0D1015] px-3 py-2 text-sm font-mono text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
                  Color tag
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['teal', 'violet', 'amber'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEvColor(c)}
                      className={`rounded-xl border py-1.5 text-xs font-medium capitalize transition-colors ${
                        evColor === c
                          ? localEventColorStyles(c)
                          : 'border-gray-200 dark:border-[#252A38] text-gray-500 dark:text-[#8E96A8]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-[#1E222D]">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="rounded-xl border border-gray-200 dark:border-[#262B38] px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gray-900 dark:bg-violet-600 hover:bg-gray-800 dark:hover:bg-violet-500 px-4 py-2 text-xs font-medium text-white"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {(activeModalTaskReminder ||
        activeModalFollowUp ||
        activeModalTask ||
        activeModalLocalEvent) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-[#242936] bg-white dark:bg-[#13161C] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
                  {activeModalTaskReminder
                    ? `Day ${activeModalTaskReminder.stage} Task Reminder · Cycle ${activeModalTaskReminder.cycle}`
                    : activeModalFollowUp
                    ? `Day ${activeModalFollowUp.stage} Learning Follow-up`
                    : activeModalTask
                    ? 'Scheduled Task'
                    : 'Local Calendar Event'}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {activeModalTaskReminder
                    ? activeModalTaskReminder.taskTitle
                    : activeModalFollowUp
                    ? activeModalFollowUp.topicName
                    : activeModalTask
                    ? activeModalTask.title
                    : activeModalLocalEvent?.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                aria-label="Close event details"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeModalTaskReminder && (
              <div className="space-y-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
                <p>
                  Category:{' '}
                  <strong className="text-gray-900 dark:text-white">
                    {activeModalTaskReminder.category}
                  </strong>
                </p>
                <p className="font-mono text-xs text-gray-500 dark:text-[#8E96A8]">
                  Scheduled {formatFullDate(activeModalTaskReminder.scheduledDate)} at{' '}
                  {formatTime12h(activeModalTaskReminder.scheduledTime)}
                </p>
                {activeModalTaskReminder.stage === 7 &&
                  activeModalTaskReminder.status === 'pending' && (
                    <p className="rounded-xl border border-teal-500/25 bg-teal-500/10 p-3 text-xs text-teal-700 dark:text-teal-300">
                      Completing this Day 7 reminder will automatically loop into Cycle{' '}
                      {activeModalTaskReminder.cycle + 1} (Day 1, Day 4, and Day 7).
                    </p>
                  )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => toggleTaskReminderStatus(activeModalTaskReminder.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-medium text-white transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {activeModalTaskReminder.status === 'completed'
                      ? 'Mark as Pending'
                      : 'Complete Reminder'}
                  </button>
                </div>
              </div>
            )}

            {activeModalFollowUp && (
              <div className="space-y-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
                <p>
                  Category:{' '}
                  <strong className="text-gray-900 dark:text-white">
                    {activeModalFollowUp.category}
                  </strong>
                </p>
                <p>
                  Scheduled Date:{' '}
                  <span className="font-mono text-gray-900 dark:text-white">
                    {formatFullDate(activeModalFollowUp.scheduledDate)}
                  </span>
                </p>
                {(() => {
                  const topic = state.topics.find((t) => t.id === activeModalFollowUp.topicId);
                  return topic?.notes ? (
                    <div className="rounded-xl border border-gray-200 dark:border-[#222734] bg-gray-50 dark:bg-[#0D1015] p-3 text-xs leading-relaxed">
                      {topic.notes}
                    </div>
                  ) : null;
                })()}
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => toggleFollowUpStatus(activeModalFollowUp.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-medium text-white transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {activeModalFollowUp.status === 'completed'
                      ? 'Mark as Pending'
                      : 'Mark Follow-up Completed'}
                  </button>
                </div>
              </div>
            )}

            {activeModalTask && (
              <div className="space-y-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
                <p>
                  {activeModalTask.category} ·{' '}
                  <span className="capitalize">{activeModalTask.priority} priority</span>
                </p>
                <p className="font-mono text-xs text-gray-500 dark:text-[#8E96A8]">
                  Due {formatFullDate(activeModalTask.dueDate)} at{' '}
                  {formatTime12h(activeModalTask.dueTime)}
                </p>
                {activeModalTask.description && (
                  <div className="rounded-xl border border-gray-200 dark:border-[#222734] bg-gray-50 dark:bg-[#0D1015] p-3 text-xs leading-relaxed">
                    {activeModalTask.description}
                  </div>
                )}
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const t = activeModalTask;
                      setSelectedEvent(null);
                      openEditTaskModal(t);
                    }}
                    className="rounded-xl border border-gray-200 dark:border-[#252A38] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1B1F2A]"
                  >
                    Edit Task
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTaskStatus(activeModalTask.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-medium text-white transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {activeModalTask.status === 'completed' ? 'Reopen Task' : 'Mark Completed'}
                  </button>
                </div>
              </div>
            )}

            {activeModalLocalEvent && (
              <div className="space-y-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
                <p className="font-mono text-xs text-gray-500 dark:text-[#8E96A8]">
                  {formatFullDate(activeModalLocalEvent.date)} ·{' '}
                  {formatTime12h(activeModalLocalEvent.time)}
                </p>
                {activeModalLocalEvent.description && (
                  <div className="rounded-xl border border-gray-200 dark:border-[#222734] bg-gray-50 dark:bg-[#0D1015] p-3 text-xs leading-relaxed whitespace-pre-wrap">
                    {activeModalLocalEvent.description}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      deleteLocalEvent(activeModalLocalEvent.id);
                      setSelectedEvent(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Event
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
