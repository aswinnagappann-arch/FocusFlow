export type NavPage =
  | 'overview'
  | 'tasks'
  | 'topics'
  | 'calendar'
  | 'focus'
  | 'analytics'
  | 'settings';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
  status: TaskStatus;
  completedAt?: string;
  createdAt: string;
}

export type LearningStatus = 'in_progress' | 'learned';
export type FollowUpStage = 1 | 4 | 7;
export type FollowUpStatus = 'pending' | 'completed';

export interface LearningTopic {
  id: string;
  title: string;
  category: string;
  notes: string;
  learnedDate: string | null; // YYYY-MM-DD when marked learned
  status: LearningStatus;
  createdAt: string;
}

export interface FollowUpSession {
  id: string;
  topicId: string;
  topicName: string;
  category: string;
  stage: FollowUpStage;
  scheduledDate: string; // YYYY-MM-DD
  status: FollowUpStatus;
  completedAt?: string;
}

export type ActivityType =
  | 'task_completed'
  | 'task_created'
  | 'topic_learned'
  | 'topic_added'
  | 'followup_completed'
  | 'focus_session';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  timestamp: string; // ISO string
}

export interface FocusSessionLog {
  id: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  label: string;
  completedAt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
}

export type PushPermissionState =
  | 'default'
  | 'granted'
  | 'denied'
  | 'unsupported';

export interface AppSettings {
  theme: 'dark' | 'light';
  timezone: string;
  pushEnabled: boolean;
  remindFollowups: boolean;
  remindTasks: boolean;
  remindMorningAt: string;
}

export interface FocusFlowState {
  tasks: Task[];
  topics: LearningTopic[];
  followUps: FollowUpSession[];
  activities: ActivityItem[];
  focusLogs: FocusSessionLog[];
  profile: UserProfile;
  settings: AppSettings;
}
