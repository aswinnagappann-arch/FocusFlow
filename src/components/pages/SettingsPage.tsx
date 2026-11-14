import React, { useEffect, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  Download,
  Globe,
  Moon,
  RotateCcw,
  Sun,
} from 'lucide-react';
import { useFocusFlow } from '../../context/FocusFlowContext';
import { PWAInstallButton } from '../common/PWAInstallButton';

const TIMEZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export const SettingsPage: React.FC = () => {
  const {
    state,
    updateProfile,
    updateSettings,
    resetAllData,
    pushPermission,
    requestPushPermission,
    setActivePage,
  } = useFocusFlow();

  const [name, setName] = useState(state.profile.name);
  const [email, setEmail] = useState(state.profile.email);
  const [role, setRole] = useState(state.profile.role);
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setName(state.profile.name);
    setEmail(state.profile.email);
    setRole(state.profile.role);
  }, [state.profile]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: name.trim() || state.profile.name,
      email: email.trim() || state.profile.email,
      role: role.trim() || state.profile.role,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  const sendTestPush = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('FocusFlow Local Reminder Preview', {
        body: 'Local notifications are active for 1-4-7 task loops, 1-4-7 topic follow-ups, and calendar events.',
        icon: '/pwa-192x192.png',
      });
    }
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#8E96A8]">
          Manage your profile, appearance, timezone, local calendar, and notifications
        </p>
      </div>

      {/* Profile Settings */}
      <section className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Profile Settings
        </h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-[#242936] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
                Role or study track
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-[#242936] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-[#9CA3AF] mb-1.5">
              Account email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-[#242936] bg-gray-50 dark:bg-[#0D1015] px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              {savedNotice ? 'Profile changes saved.' : ''}
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 dark:bg-violet-600 hover:bg-gray-800 dark:hover:bg-violet-500 px-4 py-2 text-xs font-medium text-white transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Save Profile
            </button>
          </div>
        </form>
      </section>

      {/* Theme & Timezone */}
      <section className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Appearance &amp; Time Zone
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Interface Theme</p>
            <p className="text-xs text-gray-500 dark:text-[#7C8496]">
              Switch between Dark layout and Linear-inspired Light mode
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-[#0D1015] p-1 border border-gray-200/70 dark:border-[#222734] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'light' })}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                state.settings.theme === 'light'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 dark:text-[#7C8496] hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Light
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                state.settings.theme === 'dark'
                  ? 'bg-[#1E232F] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Dark
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-[#1E232E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white inline-flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-gray-400" />
              Time Zone
            </p>
            <p className="text-xs text-gray-500 dark:text-[#7C8496]">
              Used to schedule 1-4-7 task loops, learning follow-ups, and daily push reminders
            </p>
          </div>

          <select
            aria-label="Time zone"
            value={state.settings.timezone}
            onChange={(e) => updateSettings({ timezone: e.target.value })}
            className="rounded-xl border border-gray-200 dark:border-[#242936] bg-gray-50 dark:bg-[#0D1015] px-3 py-2 text-xs font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          >
            {!TIMEZONES.includes(state.settings.timezone) && (
              <option value={state.settings.timezone}>{state.settings.timezone}</option>
            )}
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Local Calendar Summary */}
      <section className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-teal-500" />
            Local Calendar
          </h2>
          <p className="text-xs text-gray-500 dark:text-[#7C8496] mt-0.5">
            All tasks, 1-4-7 reminder loops, learning follow-ups, and custom events run locally in your browser without external sign-in.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActivePage('calendar')}
          className="rounded-xl border border-gray-200 dark:border-[#262C3B] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1B1F2A] shrink-0 self-start sm:self-auto"
        >
          Open Calendar
        </button>
      </section>

      {/* Push Notifications Only */}
      <section className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2">
              <Bell className="w-4 h-4 text-violet-500" />
              Local Browser Notifications
            </h2>
            <p className="text-xs text-gray-500 dark:text-[#7C8496] mt-0.5">
              Receive local browser alerts for tasks, Day 1-4-7 task loops, and topic recalls.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium ${
                pushPermission === 'granted'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : pushPermission === 'denied'
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              Status:{' '}
              {pushPermission === 'granted'
                ? 'Enabled'
                : pushPermission === 'denied'
                ? 'Blocked by browser'
                : pushPermission === 'unsupported'
                ? 'Not supported'
                : 'Permission needed'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
            <button
              type="button"
              onClick={() => {
                void requestPushPermission();
              }}
              className="rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-medium text-white transition-colors"
            >
              Enable Push Notifications
            </button>
          )}
          {pushPermission === 'granted' && (
            <button
              type="button"
              onClick={sendTestPush}
              className="rounded-xl border border-gray-200 dark:border-[#262C3B] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1B1F2A]"
            >
              Send Test Push Notification
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-[#1E232E] space-y-4">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Tasks &amp; 1-4-7 Reminder Loop Alerts
              </p>
              <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                Notify on task due times and Day 1, Day 4, and Day 7 looped reminders
              </p>
            </div>
            <input
              type="checkbox"
              checked={state.settings.remindTasks}
              onChange={(e) => updateSettings({ remindTasks: e.target.checked })}
              className="h-4 w-4 accent-violet-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                1-4-7 Learning Follow-up Alerts
              </p>
              <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                Push reminders on Day 1, Day 4, and Day 7 after marking a topic learned
              </p>
            </div>
            <input
              type="checkbox"
              checked={state.settings.remindFollowups}
              onChange={(e) => updateSettings({ remindFollowups: e.target.checked })}
              className="h-4 w-4 accent-violet-600 rounded"
            />
          </label>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Daily Morning Digest Time
              </p>
              <p className="text-xs text-gray-500 dark:text-[#7C8496]">
                Receive one push summary of today&apos;s focus plan
              </p>
            </div>
            <input
              type="time"
              aria-label="Daily push summary time"
              value={state.settings.remindMorningAt}
              onChange={(e) => updateSettings({ remindMorningAt: e.target.value })}
              className="rounded-xl border border-gray-200 dark:border-[#242936] bg-gray-50 dark:bg-[#0D1015] px-3 py-1.5 text-xs font-mono text-gray-800 dark:text-gray-200"
            />
          </div>
        </div>
      </section>

      {/* Install & Data Management */}
      <section className="rounded-2xl border border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#13161C] p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          App &amp; Workspace Data
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <PWAInstallButton />
          <button
            type="button"
            onClick={exportBackup}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#262C3B] px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1B1F2A]"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON Backup
          </button>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear All Data
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  resetAllData();
                  setConfirmReset(false);
                }}
                className="rounded-xl bg-red-600 hover:bg-red-500 px-3.5 py-2 text-xs font-medium text-white"
              >
                Confirm Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-xl border border-gray-200 dark:border-[#262C3B] px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
