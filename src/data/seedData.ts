import avatarImg from '../assets/images/avatar_focusflow_user_1794579671097.jpg';
import { FocusFlowState } from '../types/focusflow';

export function createInitialSeedState(): FocusFlowState {
  return {
    profile: {
      name: 'Alex Morgan',
      email: '',
      role: 'Personal Workspace',
      avatarUrl: avatarImg,
    },
    settings: {
      theme: 'dark',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
      pushEnabled: true,
      remindFollowups: true,
      remindTasks: true,
      remindMorningAt: '08:30',
    },
    tasks: [],
    taskReminders: [],
    localEvents: [],
    topics: [],
    followUps: [],
    focusLogs: [],
    activities: [],
  };
}
