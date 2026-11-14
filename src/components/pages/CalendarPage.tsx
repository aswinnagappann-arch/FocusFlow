import React, { useMemo, useState } from 'react';
import {
  Bell,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useFocusFlow } from '../../context/FocusFlowContext';
import { GoogleCalendarEvent } from '../../services/googleCalendarService';
import { FollowUpSession, Task } from '../../types/focusflow';
import {
  formatFullDate,
  formatReadableDate,
  formatTime12h,
  getMonthGridDates,
  getStartOfWeek,
  getTodayISO,
  toISODate,
} from '../../utils/dateUtils';
import { GoogleSignInButton } from '../common/GoogleSignInButton';
import {
  ConfirmGoogleCalendarActionModal,
  PendingGCalAction,
} from '../modals/ConfirmGoogleCalendarActionModal';

type CalendarView = 'month' | 'week' | 'agenda';

type SelectedEvent =
  | { kind: 'followup'; item: FollowUpSession }
  | { kind: 'task'; item: Task }
  | { kind: 'gcal'; item: GoogleCalendarEvent }
  | null;

export const CalendarPage: React.FC = () => {
  const {
    state,
    toggleFollowUpStatus,
    toggleTaskStatus,
    openCreateTaskModal,
    openEditTaskModal,
    gcalUser,
    gcalConnected,
    gcalEvents,
    gcalLoading,
    gcalError,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    refreshGoogleCalendarEvents,
    syncTaskToGoogleCalendar,
    syncFollowUpToGoogleCalendar,
    deleteGoogleCalendarEventById,
    pushPermission,
    requestPushPermission,
    updateSettings,
  } = useFocusFlow();

  const todayISO = getTodayISO();
  const [view, setView] = useState<CalendarView>('month');
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [selectedDayISO, setSelectedDayISO] = useState<string>(todayISO);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>(null);
  const [pendingAction, setPendingAction] = useState<PendingGCalAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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
      { followUps: FollowUpSession[]; tasks: Task[]; gcal: GoogleCalendarEvent[] }
    > = {};
    const ensure = (iso: string) => {
      if (!map[iso]) map[iso] = { followUps: [], tasks: [], gcal: [] };
    };
    for (const fu of state.followUps) {
      ensure(fu.scheduledDate);
      map[fu.scheduledDate].followUps.push(fu);
    }
    for (const t of state.tasks) {
      ensure(t.dueDate);
      map[t.dueDate].tasks.push(t);
    }
    for (const ev of gcalEvents) {
      ensure(ev.startDate);
      map[ev.startDate].gcal.push(ev);
    }
    return map;
  }, [state.followUps, state.tasks, gcalEvents]);

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

  const headerTitle =
    view === 'month'
      ? cursorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : view === 'week'
      ? `Week of ${formatReadableDate(toISODate(weekDates[0]))} – ${formatReadableDate(
          toISODate(weekDates[6])
        )}`
      : formatFullDate(selectedDayISO);

  const stageStyles = (stage: 1 | 4 | 7, completed: boolean) => {
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

  const selectedDayEvents = eventsByDate[selectedDayISO] || {
    followUps: [],
    tasks: [],
    gcal: [],
  };

  const activeModalFollowUp =
    selectedEvent?.kind === 'followup'
      ? state.followUps.find((f) => f.id === selectedEvent.item.id) || null
      : null;
  const activeModalTask =
    selectedEvent?.kind === 'task'
      ? state.tasks.find((t) => t.id === selectedEvent.item.id) || null
      : null;
  const activeModalGCal =
    selectedEvent?.kind === 'gcal'
      ? gcalEvents.find((g) => g.id === selectedEvent.item.id) || null
      : null;

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    window.setTimeout(() => setActionNotice(null), 3500);
  };

  const requestSyncFollowUp = (fu: FollowUpSession) => {
    setPendingAction({
      type: 'create',
      title: 'Sync Follow-up to Google Calendar?',
      description: `This will add "[FocusFlow Day ${fu.stage} Recall] ${fu.topicName}" to your primary Google Calendar on ${formatFullDate(
        fu.scheduledDate
      )}.`,
      confirmLabel: 'Confirm & Sync',
      onConfirm: async () => {
        setActionBusy(true);
        try {
          await syncFollowUpToGoogleCalendar(fu);
          setPendingAction(null);
          setSelectedEvent(null);
          showNotice(`Synced Day ${fu.stage} recall for "${fu.topicName}" to Google Calendar.`);
        } finally {
          setActionBusy(false);
        }
      },
    });
  };

  const requestSyncTask = (task: Task) => {
    setPendingAction({
      type: 'create',
      title: 'Sync Task to Google Calendar?',
      description: `This will add "[FocusFlow Task] ${task.title}" to your primary Google Calendar on ${formatFullDate(
        task.dueDate
      )} at ${formatTime12h(task.dueTime)}.`,
      confirmLabel: 'Confirm & Sync',
      onConfirm: async () => {
        setActionBusy(true);
        try {
          await syncTaskToGoogleCalendar(task);
          setPendingAction(null);
          setSelectedEvent(null);
          showNotice(`Synced "${task.title}" to Google Calendar.`);
        } finally {
          setActionBusy(false);
        }
      },
    });
  };

  const requestDeleteGCalEvent = (ev: GoogleCalendarEvent) => {
    setPendingAction({
      type: 'delete',
      title: 'Delete Google Calendar Event?',
      description: `Are you sure you want to permanently delete "${ev.summary}" (${formatFullDate(
        ev.startDate
      )}) from your primary Google Calendar?`,
      confirmLabel: 'Delete Event',
      onConfirm: async () => {
        setActionBusy(true);
        try {
          await deleteGoogleCalendarEventById(ev.id);
          setPendingAction(null);
          setSelectedEvent(null);
          showNotice(`Deleted "${ev.summary}" from Google Calendar.`);
        } finally {
          setActionBusy(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Follow-up Calendar
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#8E96A8]">
            1-4-7 learning reminders, task deadlines, and Google Calendar events
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateTaskModal(selectedDayISO)}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 dark:bg-violet-600 hover:bg-gray-800 dark:hover:bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task on {formatReadableDate(selectedDayISO)}</span>
        </button>
      </div>

      {/* Google Calendar Connection Banner */}
      <div className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Google Calendar Sync
          </p>
          {gcalConnected ? (
            <p className="text-xs text-gray-500 dark:text-[#8E96A8] mt-0.5 truncate">
              Connected as {gcalUser?.email || gcalUser?.displayName || 'Google Account'} ·{' '}
              <span className="font-mono tabular-nums">{gcalEvents.length}</span> events loaded
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-[#8E96A8] mt-0.5">
              Sign in with Google to view your primary calendar events and sync 1-4-7 reminders.
            </p>
          )}
          {gcalError && (
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">{gcalError}</p>
          )}
          {actionNotice && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{actionNotice}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!gcalConnected ? (
            <GoogleSignInButton
              onClick={() => {
                void connectGoogleCalendar();
              }}
              disabled={gcalLoading}
            />
          ) : (
            <>
              <button
                type="button"
                disabled={gcalLoading}
                onClick={() => {
                  void refreshGoogleCalendarEvents();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#252A38] px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1B1F2A] transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${gcalLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void disconnectGoogleCalendar();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#252A38] px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-[#1B1F2A] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Calendar Notifications Status Bar */}
      <div className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Calendar Push Notifications
            </p>
            <p className="text-xs text-gray-500 dark:text-[#8E96A8]">
              {pushPermission === 'granted' && state.settings.pushEnabled
                ? 'Active for tasks, 1-4-7 follow-ups, and synced Google Calendar events.'
                : pushPermission === 'denied'
                ? 'Blocked in browser settings — allow notifications for this site to receive alerts.'
                : pushPermission === 'unsupported'
                ? 'Browser notifications are unavailable in this environment; Google Calendar popup alerts still apply on synced events.'
                : 'Enable browser push notifications to receive live alerts for all scheduled work.'}
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
                <span>Tasks</span>
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.settings.remindFollowups}
                  onChange={(e) => updateSettings({ remindFollowups: e.target.checked })}
                  className="h-3.5 w-3.5 accent-violet-600 rounded"
                />
                <span>1-4-7 Follow-ups</span>
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
          {/* Explicit text legend (never color-only) */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-[#8E96A8]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-violet-500" />
              Day 1
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-sky-500" />
              Day 4
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-emerald-500" />
              Day 7
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-gray-400 dark:bg-gray-500" />
              Task
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-teal-500" />
              GCal
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
              const dayEvents = eventsByDate[iso] || { followUps: [], tasks: [], gcal: [] };
              const totalEvents =
                dayEvents.followUps.length + dayEvents.tasks.length + dayEvents.gcal.length;

              return (
                <div
                  key={iso}
                  onClick={() => {
                    setSelectedDayISO(iso);
                    setCursorDate(d);
                  }}
                  className={`min-h-[96px] sm:min-h-[116px] p-2 cursor-pointer transition-colors ${
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
                    {dayEvents.followUps.slice(0, 2).map((fu) => (
                      <button
                        key={fu.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent({ kind: 'followup', item: fu });
                        }}
                        className={`block w-full truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-85 ${stageStyles(
                          fu.stage,
                          fu.status === 'completed'
                        )}`}
                      >
                        D{fu.stage} · {fu.topicName}
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
                    {dayEvents.gcal.slice(0, 2).map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent({ kind: 'gcal', item: ev });
                        }}
                        className="block w-full truncate rounded-md border border-teal-500/25 bg-teal-500/10 px-1.5 py-0.5 text-left text-[11px] font-medium text-teal-700 dark:text-teal-300 transition-opacity hover:opacity-85"
                      >
                        GCal · {ev.summary}
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
            const dayEvents = eventsByDate[iso] || { followUps: [], tasks: [], gcal: [] };
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
                  {dayEvents.followUps.map((fu) => (
                    <button
                      key={fu.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent({ kind: 'followup', item: fu });
                      }}
                      className={`block w-full rounded-lg border p-2 text-left text-xs ${stageStyles(
                        fu.stage,
                        fu.status === 'completed'
                      )}`}
                    >
                      <span className="block font-semibold">Day {fu.stage} Recall</span>
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

                  {dayEvents.gcal.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent({ kind: 'gcal', item: ev });
                      }}
                      className="block w-full rounded-lg border border-teal-500/25 bg-teal-500/10 p-2 text-left text-xs text-teal-700 dark:text-teal-300"
                    >
                      <span className="block font-semibold truncate">GCal · {ev.summary}</span>
                      <span className="block text-[11px] font-mono opacity-80">
                        {ev.startTime ? formatTime12h(ev.startTime) : 'All day'}
                      </span>
                    </button>
                  ))}

                  {dayEvents.followUps.length === 0 &&
                    dayEvents.tasks.length === 0 &&
                    dayEvents.gcal.length === 0 && (
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
                Agenda for {formatFullDate(selectedDayISO)}
              </h3>
              <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                Click any item to view details, mark complete, or sync with Google Calendar
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCreateTaskModal(selectedDayISO)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#252A38] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1A1E28]"
            >
              <Plus className="w-3.5 h-3.5" />
              New Task This Day
            </button>
          </div>

          {selectedDayEvents.followUps.length === 0 &&
          selectedDayEvents.tasks.length === 0 &&
          selectedDayEvents.gcal.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-[#7C8496]">
              No follow-ups, tasks, or Google Calendar events scheduled for{' '}
              {formatReadableDate(selectedDayISO)}.
            </p>
          ) : (
            <div className="space-y-2.5">
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
                        Day {fu.stage} Follow-up · {fu.category}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium shrink-0 ${stageStyles(
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
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-gray-500 dark:text-[#7C8496] inline-flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatTime12h(task.dueTime)}
                  </span>
                </div>
              ))}

              {selectedDayEvents.gcal.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent({ kind: 'gcal', item: ev })}
                  className="flex items-center justify-between gap-3 rounded-xl border border-teal-500/25 bg-teal-500/5 dark:bg-teal-500/10 p-3.5 cursor-pointer hover:border-teal-500/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {ev.summary}
                    </p>
                    <p className="text-xs text-teal-700 dark:text-teal-300">
                      Google Calendar{ev.location ? ` · ${ev.location}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-teal-700 dark:text-teal-300 shrink-0">
                    {ev.startTime ? formatTime12h(ev.startTime) : 'All day'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Event Detail Modal */}
      {(activeModalFollowUp || activeModalTask || activeModalGCal) && (
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
                  {activeModalFollowUp
                    ? `Day ${activeModalFollowUp.stage} Learning Follow-up`
                    : activeModalTask
                    ? 'Scheduled Task'
                    : 'Google Calendar Event'}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {activeModalFollowUp
                    ? activeModalFollowUp.topicName
                    : activeModalTask
                    ? activeModalTask.title
                    : activeModalGCal?.summary}
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
                  {gcalConnected && (
                    <button
                      type="button"
                      onClick={() => requestSyncFollowUp(activeModalFollowUp)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#252A38] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1B1F2A]"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Sync to Google Calendar
                    </button>
                  )}
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
                  {gcalConnected && (
                    <button
                      type="button"
                      onClick={() => requestSyncTask(activeModalTask)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#252A38] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1B1F2A]"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Sync to Google Calendar
                    </button>
                  )}
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

            {activeModalGCal && (
              <div className="space-y-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
                <p className="font-mono text-xs text-gray-500 dark:text-[#8E96A8]">
                  {formatFullDate(activeModalGCal.startDate)} ·{' '}
                  {activeModalGCal.startTime ? formatTime12h(activeModalGCal.startTime) : 'All day'}
                </p>
                {activeModalGCal.location && (
                  <p className="text-xs">Location: {activeModalGCal.location}</p>
                )}
                {activeModalGCal.description && (
                  <div className="rounded-xl border border-gray-200 dark:border-[#222734] bg-gray-50 dark:bg-[#0D1015] p-3 text-xs leading-relaxed whitespace-pre-wrap">
                    {activeModalGCal.description}
                  </div>
                )}
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => requestDeleteGCalEvent(activeModalGCal)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Event
                  </button>
                  {activeModalGCal.htmlLink && (
                    <a
                      href={activeModalGCal.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 dark:bg-violet-600 hover:bg-gray-800 dark:hover:bg-violet-500 px-4 py-2 text-xs font-medium text-white transition-colors"
                    >
                      <span>Open in Google Calendar</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmGoogleCalendarActionModal
        action={pendingAction}
        busy={actionBusy}
        onCancel={() => {
          if (!actionBusy) setPendingAction(null);
        }}
      />
    </div>
  );
};
