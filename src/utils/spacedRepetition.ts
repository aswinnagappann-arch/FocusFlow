import { FollowUpSession, FollowUpStage, LearningTopic } from '../types/focusflow';
import { addDaysISO } from './dateUtils';

export const FOLLOW_UP_STAGES: FollowUpStage[] = [1, 4, 7];

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
    // If reverted to in_progress, keep no pending unstarted follow-ups or remove uncompleted
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
