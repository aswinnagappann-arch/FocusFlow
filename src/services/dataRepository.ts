import { createInitialSeedState } from '../data/seedData';
import { AppSettings, FocusFlowState } from '../types/focusflow';

const STORAGE_KEY = 'focusflow_workspace_v2';
const LEGACY_STORAGE_KEY = 'focusflow_workspace_v1';
const SETTINGS_KEY = 'focusflow_settings_v1';

export interface FocusFlowRepository {
  loadState(): FocusFlowState;
  saveState(state: FocusFlowState): void;
  resetState(): FocusFlowState;
}

class LocalStorageRepository implements FocusFlowRepository {
  loadState(): FocusFlowState {
    const seed = createInitialSeedState();
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.saveState(seed);
        return seed;
      }
      const parsed = JSON.parse(raw) as Partial<FocusFlowState>;
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : seed.tasks,
        taskReminders: Array.isArray(parsed.taskReminders)
          ? parsed.taskReminders
          : seed.taskReminders,
        localEvents: Array.isArray(parsed.localEvents) ? parsed.localEvents : seed.localEvents,
        topics: Array.isArray(parsed.topics) ? parsed.topics : seed.topics,
        followUps: Array.isArray(parsed.followUps) ? parsed.followUps : seed.followUps,
        activities: Array.isArray(parsed.activities) ? parsed.activities : seed.activities,
        focusLogs: Array.isArray(parsed.focusLogs) ? parsed.focusLogs : seed.focusLogs,
        profile: parsed.profile ? { ...seed.profile, ...parsed.profile } : seed.profile,
        settings: parsed.settings ? { ...seed.settings, ...parsed.settings } : seed.settings,
      };
    } catch {
      return seed;
    }
  }

  saveState(state: FocusFlowState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      this.saveSettingsOnly(state.settings);
    } catch {
      // Ignore storage quota exceptions
    }
  }

  saveSettingsOnly(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme: settings.theme }));
    } catch {
      // Ignore
    }
  }

  resetState(): FocusFlowState {
    const seed = createInitialSeedState();
    this.saveState(seed);
    return seed;
  }
}

export const focusFlowRepository: FocusFlowRepository = new LocalStorageRepository();
