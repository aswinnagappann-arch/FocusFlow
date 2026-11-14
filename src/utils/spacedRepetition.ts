import {
  FollowUpSession,
  FollowUpStage,
  LearningTopic,
  Task,
  TaskReminderSession,
  TaskReminderStage,
} from '../types/focusflow';
import { addDaysISO, getTodayISO } from './dateUtils';

export const FOLLOW_UP_STAGES: FollowUpStage[] = [1, 4, 7];
export const TASK_REMINDER_STAGES: TaskReminderStage[] = [1, 4, 7];

/**
 * Generates Day 1, Day 4, and Day 7 follow-up sessions for a learned topic,
 * strictly preventing duplicate stage entries for the same topicId.
 */
export function generateFollowUpsForTopic(
  topic: LearningTopic,
  existingFollowUps: FollowUpSession[]
): FollowUpSession[] {
  if (topic.status !== 'learned' || !topic.learnedDate) {
    return [];
  }

  const existingStages = new Set(
    existingFollowUps
      .filter((f) => f.topicId === topic.id)
      .map((f) => f.stage)
  );

  const created: FollowUpSession[] = [];

  for (const stage of FOLLOW_UP_STAGES) {
    if (!existingStages.has(stage)) {
      created.push({
        id: `fu-${topic.id}-d${stage}`,
        topicId: topic.id,
        topicName: topic.title,
        category: topic.category,
        stage,
        scheduledDate: addDaysISO(topic.learnedDate, stage),
        status: 'pending',
      });
    }
  }

  return created;
}

/**
 * Synchronizes topic metadata (title, category, or updated learnedDate)
 * onto existing follow-ups without duplicating sessions.
 */
export function syncFollowUpsWithTopic(
  topic: LearningTopic,
  existingFollowUps: FollowUpSession[]
): FollowUpSession[] {
  if (topic.status !== 'learned' || !topic.learnedDate) {
    return existingFollowUps.filter((f) => f.topicId !== topic.id);
  }

  const updated = existingFollowUps.map((f) => {
    if (f.topicId !== topic.id) return f;
    return {
      ...f,
      topicName: topic.title,
      category: topic.category,
      scheduledDate: addDaysISO(topic.learnedDate!, f.stage),
    };
  });

  const missing = generateFollowUpsForTopic(topic, updated);
  return [...updated, ...missing];
}

/**
 * Generates a 1-4-7 reminder cycle (Day +1, Day +4, Day +7) for a task,
 * deduplicating by (taskId, cycle, stage) so duplicate reminders are never created.
 */
export function generateTaskReminderCycle(
  task: Task,
  existingReminders: TaskReminderSession[],
  cycle = 1,
  baseDateISO?: string
): TaskReminderSession[] {
  if (!task.reminderEnabled) {
    return [];
  }

  const anchorDate = baseDateISO || task.dueDate || getTodayISO();
  const existingKeys = new Set(
    existingReminders
      .filter((r) => r.taskId === task.id && r.cycle === cycle)
      .map((r) => r.stage)
  );

  const created: TaskReminderSession[] = [];

  for (const stage of TASK_REMINDER_STAGES) {
    if (!existingKeys.has(stage)) {
      created.push({
        id: `tr-${task.id}-c${cycle}-d${stage}`,
        taskId: task.id,
        taskTitle: task.title,
        category: task.category,
        stage,
        cycle,
        scheduledDate: addDaysISO(anchorDate, stage),
        scheduledTime: task.dueTime,
        status: 'pending',
      });
    }
  }

  return created;
}

/**
 * Synchronizes task edits onto its 1-4-7 reminders, or removes/creates Cycle 1
 * when reminderEnabled is toggled.
 */
export function syncTaskRemindersWithTask(
  task: Task,
  existingReminders: TaskReminderSession[]
): TaskReminderSession[] {
  if (!task.reminderEnabled) {
    return existingReminders.filter((r) => r.taskId !== task.id);
  }

  const hasAnyForTask = existingReminders.some((r) => r.taskId === task.id);
  if (!hasAnyForTask) {
    return [
      ...existingReminders,
      ...generateTaskReminderCycle(task, existingReminders, 1, task.dueDate),
    ];
  }

  return existingReminders.map((r) => {
    if (r.taskId !== task.id) return r;
    const updated: TaskReminderSession = {
      ...r,
      taskTitle: task.title,
      category: task.category,
      scheduledTime: task.dueTime,
    };
    if (r.cycle === 1 && r.status === 'pending') {
      updated.scheduledDate = addDaysISO(task.dueDate, r.stage);
    }
    return updated;
  });
}

/**
 * Generates the next 1-4-7 reminder loop (Cycle N + 1) when Day 7 of Cycle N
 * is completed on a looping task.
 */
export function generateNextTaskReminderLoop(
  task: Task,
  completedDay7Reminder: TaskReminderSession,
  allReminders: TaskReminderSession[]
): TaskReminderSession[] {
  if (!task.reminderEnabled || task.loopReminders === false) {
    return [];
  }
  if (completedDay7Reminder.stage !== 7) {
    return [];
  }
  const nextCycle = completedDay7Reminder.cycle + 1;
  const today = getTodayISO();
  const nextAnchor =
    completedDay7Reminder.scheduledDate > today ? completedDay7Reminder.scheduledDate : today;
  return generateTaskReminderCycle(task, allReminders, nextCycle, nextAnchor);
}
