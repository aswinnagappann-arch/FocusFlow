import React, { createContext, useContext, useEffect, useState } from 'react';
import { focusFlowRepository } from '../services/dataRepository';
import {
  getAccessToken,
  googleSignIn,
  initGoogleCalendarAuth,
  logoutGoogleCalendar,
} from '../services/googleCalendarAuth';
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  fetchGoogleCalendarEvents,
  GoogleCalendarEvent,
} from '../services/googleCalendarService';
import {
  ActivityItem,
  AppSettings,
  FocusFlowState,
  FollowUpSession,
  LearningTopic,
  NavPage,
  PushPermissionState,
  Task,
  UserProfile,
} from '../types/focusflow';
import { getTodayISO } from '../utils/dateUtils';
import { generateFollowUpsForTopic, syncFollowUpsWithTopic } from '../utils/spacedRepetition';

export interface TaskInput {
  title: string;
  description: string;
  category: string;
  priority: Task['priority'];
  dueDate: string;
  dueTime: string;
}

export interface TopicInput {
  title: string;
  category: string;
  notes: string;
  status: LearningTopic['status'];
  learnedDate: string | null;
}

interface FocusFlowContextValue {
  state: FocusFlowState;
  activePage: NavPage;
  setActivePage: (page: NavPage) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isCommandOpen: boolean;
  setIsCommandOpen: (open: boolean) => void;
  isTaskModalOpen: boolean;
  editingTask: Task | null;
  openCreateTaskModal: (presetDate?: string) => void;
  openEditTaskModal: (task: Task) => void;
  closeTaskModal: () => void;
  presetTaskDate: string | null;
  isTopicModalOpen: boolean;
  editingTopic: LearningTopic | null;
  openCreateTopicModal: () => void;
  openEditTopicModal: (topic: LearningTopic) => void;
  closeTopicModal: () => void;
  addTask: (input: TaskInput) => void;
  updateTask: (id: string, input: TaskInput) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;
  addTopic: (input: TopicInput) => void;
  updateTopic: (id: string, input: TopicInput) => void;
  deleteTopic: (id: string) => void;
  markTopicAsLearned: (id: string, dateISO?: string) => void;
  toggleFollowUpStatus: (followUpId: string) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetAllData: () => void;
  // Shared live focus timer
  timerSecondsLeft: number;
  timerPresetMinutes: number;
  isTimerRunning: boolean;
  timerLabel: string;
  setTimerLabel: (label: string) => void;
  setTimerPreset: (minutes: number) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  completeFocusSession: () => void;
  // Google Calendar Integration
  gcalUser: { displayName: string | null; email: string | null } | null;
  gcalConnected: boolean;
  gcalEvents: GoogleCalendarEvent[];
  gcalLoading: boolean;
  gcalError: string | null;
  connectGoogleCalendar: () => Promise<void>;
  disconnectGoogleCalendar: () => Promise<void>;
  refreshGoogleCalendarEvents: () => Promise<void>;
  syncTaskToGoogleCalendar: (task: Task) => Promise<void>;
  syncFollowUpToGoogleCalendar: (followUp: FollowUpSession) => Promise<void>;
  deleteGoogleCalendarEventById: (eventId: string) => Promise<void>;
  // Push Notifications
  pushPermission: PushPermissionState;
  requestPushPermission: () => Promise<PushPermissionState>;
}

const FocusFlowContext = createContext<FocusFlowContextValue | null>(null);

function makeActivity(
  type: ActivityItem['type'],
  title: string,
  detail: string
): ActivityItem {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title,
    detail,
    timestamp: new Date().toISOString(),
  };
}

export const FocusFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<FocusFlowState>(() => focusFlowRepository.loadState());
  const [activePage, setActivePage] = useState<NavPage>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [presetTaskDate, setPresetTaskDate] = useState<string | null>(null);

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<LearningTopic | null>(null);

  // Live Focus Session Timer
  const [timerPresetMinutes, setTimerPresetMinutes] = useState(25);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerLabel, setTimerLabel] = useState('Deep Study & Recall');

  // Google Calendar Integration State
  const [gcalUser, setGcalUser] = useState<{
    displayName: string | null;
    email: string | null;
  } | null>(null);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalEvents, setGcalEvents] = useState<GoogleCalendarEvent[]>([]);
  const [gcalLoading, setGcalLoading] = useState(false);
  const [gcalError, setGcalError] = useState<string | null>(null);
  const [pushPermission, setPushPermission] = useState<PushPermissionState>(() =>
    typeof Notification === 'undefined'
      ? 'unsupported'
      : (Notification.permission as PushPermissionState)
  );

  const loadCalendarEventsWithToken = async (token: string) => {
    setGcalLoading(true);
    setGcalError(null);
    try {
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
      const events = await fetchGoogleCalendarEvents(token, timeMin, timeMax);
      setGcalEvents(events);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load Google Calendar events.';
      setGcalError(message);
    } finally {
      setGcalLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initGoogleCalendarAuth(
      (user, token) => {
        setGcalUser({ displayName: user.displayName, email: user.email });
        setGcalConnected(true);
        void loadCalendarEventsWithToken(token);
      },
      () => {
        setGcalUser(null);
        setGcalConnected(false);
        setGcalEvents([]);
      }
    );
    return () => unsubscribe();
  }, []);

  // Live Push Notification Scheduler for Tasks, 1-4-7 Follow-ups, and Google Calendar Events
  useEffect(() => {
    if (
      typeof Notification === 'undefined' ||
      pushPermission !== 'granted' ||
      !state.settings.pushEnabled
    ) {
      return;
    }

    const NOTIFIED_KEY = 'focusflow_notified_v1';
    const getNotifiedSet = (): Set<string> => {
      try {
        const raw = localStorage.getItem(NOTIFIED_KEY);
        return new Set(raw ? (JSON.parse(raw) as string[]) : []);
      } catch {
        return new Set();
      }
    };
    const saveNotifiedSet = (set: Set<string>) => {
      try {
        localStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(set).slice(-200)));
      } catch {
        // Ignore storage errors
      }
    };

    const parseMinutes = (hhmm: string): number | null => {
      const [h, m] = hhmm.split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    };

    const checkAndNotify = () => {
      const now = new Date();
      const today = getTodayISO();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const morningMins = parseMinutes(state.settings.remindMorningAt) ?? 8 * 60 + 30;
      const notified = getNotifiedSet();
      let changed = false;

      if (state.settings.remindTasks) {
        for (const task of state.tasks) {
          if (task.status !== 'pending' || task.dueDate !== today) continue;
          const dueMins = parseMinutes(task.dueTime);
          if (dueMins === null) continue;
          if (nowMins >= dueMins - 15 && nowMins <= dueMins + 30) {
            const key = `task:${task.id}:${task.dueDate}:${task.dueTime}`;
            if (!notified.has(key)) {
              new Notification(`Task Reminder: ${task.title}`, {
                body: `${task.category} · Due at ${task.dueTime}`,
                icon: '/pwa-192x192.png',
              });
              notified.add(key);
              changed = true;
            }
          }
        }
      }

      if (state.settings.remindFollowups && nowMins >= morningMins) {
        for (const fu of state.followUps) {
          if (fu.status !== 'pending' || fu.scheduledDate !== today) continue;
          const key = `followup:${fu.id}:${fu.scheduledDate}`;
          if (!notified.has(key)) {
            new Notification(`Day ${fu.stage} Recall Due: ${fu.topicName}`, {
              body: `1-4-7 spaced-repetition review scheduled for today (${fu.category}).`,
              icon: '/pwa-192x192.png',
            });
            notified.add(key);
            changed = true;
          }
        }
      }

      for (const ev of gcalEvents) {
        if (ev.startDate !== today || !ev.startTime) continue;
        const evMins = parseMinutes(ev.startTime);
        if (evMins === null) continue;
        if (nowMins >= evMins - 15 && nowMins <= evMins + 10) {
          const key = `gcal:${ev.id}:${ev.startDate}:${ev.startTime}`;
          if (!notified.has(key)) {
            new Notification(`Calendar Event: ${ev.summary}`, {
              body: `Starts at ${ev.startTime}${ev.location ? ` · ${ev.location}` : ''}`,
              icon: '/pwa-192x192.png',
            });
            notified.add(key);
            changed = true;
          }
        }
      }

      if (changed) {
        saveNotifiedSet(notified);
      }
    };

    checkAndNotify();
    const timerId = window.setInterval(checkAndNotify, 30000);
    return () => window.clearInterval(timerId);
  }, [
    pushPermission,
    state.settings.pushEnabled,
    state.settings.remindTasks,
    state.settings.remindFollowups,
    state.settings.remindMorningAt,
    state.tasks,
    state.followUps,
    gcalEvents,
  ]);

  // Persist state & sync theme class on <html>
  useEffect(() => {
    focusFlowRepository.saveState(state);
    const root = document.documentElement;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (state.settings.theme === 'dark') {
      root.classList.add('dark');
      themeColorMeta?.setAttribute('content', '#0B0D11');
    } else {
      root.classList.remove('dark');
      themeColorMeta?.setAttribute('content', '#F7F8FA');
    }
  }, [state]);

  // Global keyboard shortcuts (Cmd/Ctrl + K or Cmd/Ctrl + F for command bar)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Timer tick
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = window.setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          const today = getTodayISO();
          setState((curr) => ({
            ...curr,
            focusLogs: [
              ...curr.focusLogs,
              {
                id: `fl-${Date.now()}`,
                date: today,
                durationMinutes: timerPresetMinutes,
                label: timerLabel,
                completedAt: new Date().toISOString(),
              },
            ],
            activities: [
              makeActivity(
                'focus_session',
                timerLabel,
                `Completed ${timerPresetMinutes} min focus session`
              ),
              ...curr.activities,
            ].slice(0, 25),
          }));
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('FocusFlow Session Complete', {
              body: `Great work! You completed ${timerPresetMinutes} minutes on "${timerLabel}".`,
              icon: '/pwa-192x192.png',
            });
          }
          return timerPresetMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isTimerRunning, timerPresetMinutes, timerLabel]);

  const openCreateTaskModal = (presetDate?: string) => {
    setEditingTask(null);
    setPresetTaskDate(presetDate || null);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setPresetTaskDate(null);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
    setPresetTaskDate(null);
  };

  const openCreateTopicModal = () => {
    setEditingTopic(null);
    setIsTopicModalOpen(true);
  };

  const openEditTopicModal = (topic: LearningTopic) => {
    setEditingTopic(topic);
    setIsTopicModalOpen(true);
  };

  const closeTopicModal = () => {
    setIsTopicModalOpen(false);
    setEditingTopic(null);
  };

  const addTask = (input: TaskInput) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      ...input,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
      activities: [
        makeActivity('task_created', newTask.title, `${newTask.category} · Due ${newTask.dueDate}`),
        ...prev.activities,
      ].slice(0, 25),
    }));
  };

  const updateTask = (id: string, input: TaskInput) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...input } : t)),
    }));
  };

  const deleteTask = (id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  };

  const toggleTaskStatus = (id: string) => {
    setState((prev) => {
      const target = prev.tasks.find((t) => t.id === id);
      if (!target) return prev;
      const nextStatus: Task['status'] = target.status === 'completed' ? 'pending' : 'completed';
      const nextTasks = prev.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: nextStatus,
              completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
            }
          : t
      );
      const nextActivities =
        nextStatus === 'completed'
          ? [
              makeActivity('task_completed', target.title, `${target.category} · Marked completed`),
              ...prev.activities,
            ].slice(0, 25)
          : prev.activities;
      return {
        ...prev,
        tasks: nextTasks,
        activities: nextActivities,
      };
    });
  };

  const addTopic = (input: TopicInput) => {
    const isLearned = input.status === 'learned';
    const learnedDate = isLearned ? input.learnedDate || getTodayISO() : null;
    const newTopic: LearningTopic = {
      id: `topic-${Date.now()}`,
      title: input.title,
      category: input.category,
      notes: input.notes,
      status: input.status,
      learnedDate,
      createdAt: new Date().toISOString(),
    };

    setState((prev) => {
      const createdFollowUps = generateFollowUpsForTopic(newTopic, prev.followUps);
      const activity = isLearned
        ? makeActivity(
            'topic_learned',
            newTopic.title,
            'Marked as learned · Scheduled Day 1, Day 4 & Day 7 follow-ups'
          )
        : makeActivity('topic_added', newTopic.title, `${newTopic.category} · Added to study list`);
      return {
        ...prev,
        topics: [newTopic, ...prev.topics],
        followUps: [...prev.followUps, ...createdFollowUps],
        activities: [activity, ...prev.activities].slice(0, 25),
      };
    });
  };

  const updateTopic = (id: string, input: TopicInput) => {
    setState((prev) => {
      const existing = prev.topics.find((t) => t.id === id);
      if (!existing) return prev;
      const learnedDate =
        input.status === 'learned' ? input.learnedDate || existing.learnedDate || getTodayISO() : null;
      const updatedTopic: LearningTopic = {
        ...existing,
        title: input.title,
        category: input.category,
        notes: input.notes,
        status: input.status,
        learnedDate,
      };

      const nextFollowUps = syncFollowUpsWithTopic(updatedTopic, prev.followUps);
      const becameLearned = existing.status !== 'learned' && updatedTopic.status === 'learned';
      const nextActivities = becameLearned
        ? [
            makeActivity(
              'topic_learned',
              updatedTopic.title,
              'Marked as learned · Scheduled Day 1, Day 4 & Day 7 follow-ups'
            ),
            ...prev.activities,
          ].slice(0, 25)
        : prev.activities;

      return {
        ...prev,
        topics: prev.topics.map((t) => (t.id === id ? updatedTopic : t)),
        followUps: nextFollowUps,
        activities: nextActivities,
      };
    });
  };

  const deleteTopic = (id: string) => {
    setState((prev) => ({
      ...prev,
      topics: prev.topics.filter((t) => t.id !== id),
      followUps: prev.followUps.filter((f) => f.topicId !== id),
    }));
  };

  const markTopicAsLearned = (id: string, dateISO?: string) => {
    setState((prev) => {
      const target = prev.topics.find((t) => t.id === id);
      if (!target) return prev;
      const learnedDate = dateISO || target.learnedDate || getTodayISO();
      const updatedTopic: LearningTopic = {
        ...target,
        status: 'learned',
        learnedDate,
      };
      const newFollowUps = generateFollowUpsForTopic(updatedTopic, prev.followUps);
      const alreadyHadFollowUps = prev.followUps.some((f) => f.topicId === id);

      return {
        ...prev,
        topics: prev.topics.map((t) => (t.id === id ? updatedTopic : t)),
        followUps: [...prev.followUps, ...newFollowUps],
        activities: alreadyHadFollowUps
          ? prev.activities
          : [
              makeActivity(
                'topic_learned',
                updatedTopic.title,
                'Marked as learned · Scheduled Day 1, Day 4 & Day 7 follow-ups'
              ),
              ...prev.activities,
            ].slice(0, 25),
      };
    });
  };

  const toggleFollowUpStatus = (followUpId: string) => {
    setState((prev) => {
      const target = prev.followUps.find((f) => f.id === followUpId);
      if (!target) return prev;
      const nextStatus: 'pending' | 'completed' = target.status === 'completed' ? 'pending' : 'completed';
      return {
        ...prev,
        followUps: prev.followUps.map((f) =>
          f.id === followUpId
            ? {
                ...f,
                status: nextStatus,
                completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
              }
            : f
        ),
        activities:
          nextStatus === 'completed'
            ? [
                makeActivity(
                  'followup_completed',
                  target.topicName,
                  `Day ${target.stage} follow-up recall completed`
                ),
                ...prev.activities,
              ].slice(0, 25)
            : prev.activities,
      };
    });
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...profile },
    }));
  };

  const updateSettings = (settings: Partial<AppSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  };

  const resetAllData = () => {
    setState(focusFlowRepository.resetState());
  };

  const setTimerPreset = (minutes: number) => {
    setIsTimerRunning(false);
    setTimerPresetMinutes(minutes);
    setTimerSecondsLeft(minutes * 60);
  };

  const startTimer = () => setIsTimerRunning(true);
  const pauseTimer = () => setIsTimerRunning(false);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSecondsLeft(timerPresetMinutes * 60);
  };

  const completeFocusSession = () => {
    const elapsedMinutes = Math.max(
      1,
      Math.round((timerPresetMinutes * 60 - timerSecondsLeft) / 60) || timerPresetMinutes
    );
    setIsTimerRunning(false);
    setTimerSecondsLeft(timerPresetMinutes * 60);
    setState((prev) => ({
      ...prev,
      focusLogs: [
        ...prev.focusLogs,
        {
          id: `fl-${Date.now()}`,
          date: getTodayISO(),
          durationMinutes: elapsedMinutes,
          label: timerLabel,
          completedAt: new Date().toISOString(),
        },
      ],
      activities: [
        makeActivity('focus_session', timerLabel, `Logged ${elapsedMinutes} min focus session`),
        ...prev.activities,
      ].slice(0, 25),
    }));
  };

  const connectGoogleCalendar = async () => {
    setGcalLoading(true);
    setGcalError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGcalUser({
          displayName: result.user.displayName,
          email: result.user.email,
        });
        setGcalConnected(true);
        await loadCalendarEventsWithToken(result.accessToken);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Google Calendar sign-in was cancelled or failed.';
      setGcalError(message);
    } finally {
      setGcalLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    await logoutGoogleCalendar();
    setGcalUser(null);
    setGcalConnected(false);
    setGcalEvents([]);
    setGcalError(null);
  };

  const refreshGoogleCalendarEvents = async () => {
    const token = await getAccessToken();
    if (!token) {
      setGcalConnected(false);
      setGcalError('Session expired. Please sign in with Google again.');
      return;
    }
    await loadCalendarEventsWithToken(token);
  };

  const syncTaskToGoogleCalendar = async (task: Task) => {
    const token = await getAccessToken();
    if (!token) {
      setGcalConnected(false);
      throw new Error('Please sign in with Google first.');
    }
    const created = await createGoogleCalendarEvent(token, {
      summary: `[FocusFlow Task] ${task.title}`,
      description: `${task.category} · ${task.priority} priority${
        task.description ? `\n\n${task.description}` : ''
      }`,
      dateISO: task.dueDate,
      timeHHMM: task.dueTime,
      timeZone: state.settings.timezone,
    });
    setGcalEvents((prev) => [...prev, created]);
  };

  const syncFollowUpToGoogleCalendar = async (followUp: FollowUpSession) => {
    const token = await getAccessToken();
    if (!token) {
      setGcalConnected(false);
      throw new Error('Please sign in with Google first.');
    }
    const topic = state.topics.find((t) => t.id === followUp.topicId);
    const created = await createGoogleCalendarEvent(token, {
      summary: `[FocusFlow Day ${followUp.stage} Recall] ${followUp.topicName}`,
      description: `1-4-7 Spaced Repetition Review · ${followUp.category}${
        topic?.notes ? `\n\nNotes:\n${topic.notes}` : ''
      }`,
      dateISO: followUp.scheduledDate,
      timeZone: state.settings.timezone,
    });
    setGcalEvents((prev) => [...prev, created]);
  };

  const deleteGoogleCalendarEventById = async (eventId: string) => {
    const token = await getAccessToken();
    if (!token) {
      setGcalConnected(false);
      throw new Error('Please sign in with Google first.');
    }
    await deleteGoogleCalendarEvent(token, eventId);
    setGcalEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const requestPushPermission = async (): Promise<PushPermissionState> => {
    if (typeof Notification === 'undefined') {
      setPushPermission('unsupported');
      return 'unsupported';
    }
    const result = (await Notification.requestPermission()) as PushPermissionState;
    setPushPermission(result);
    if (result === 'granted') {
      updateSettings({ pushEnabled: true });
      new Notification('FocusFlow Push Notifications Active', {
        body: 'Alerts enabled for tasks, 1-4-7 follow-ups, and calendar events.',
        icon: '/pwa-192x192.png',
      });
    }
    return result;
  };

  return (
    <FocusFlowContext.Provider
      value={{
        state,
        activePage,
        setActivePage,
        searchQuery,
        setSearchQuery,
        isCommandOpen,
        setIsCommandOpen,
        isTaskModalOpen,
        editingTask,
        openCreateTaskModal,
        openEditTaskModal,
        closeTaskModal,
        presetTaskDate,
        isTopicModalOpen,
        editingTopic,
        openCreateTopicModal,
        openEditTopicModal,
        closeTopicModal,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        addTopic,
        updateTopic,
        deleteTopic,
        markTopicAsLearned,
        toggleFollowUpStatus,
        updateProfile,
        updateSettings,
        resetAllData,
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
      }}
    >
      {children}
    </FocusFlowContext.Provider>
  );
};

export function useFocusFlow() {
  const ctx = useContext(FocusFlowContext);
  if (!ctx) {
    throw new Error('useFocusFlow must be used inside FocusFlowProvider');
  }
  return ctx;
}
