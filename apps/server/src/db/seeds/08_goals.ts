import { Goal } from '@koinsight/common/types';
import { db } from '../../knex';
import { Knex } from 'knex';
import { createGoal } from '../factories/goal-factory';
import { GoalsService } from '../../goals/goals-service';

const DAILY_TARGET = 60;
const YEARLY_TARGET = 10;

const SEED_GOALS: Partial<Goal>[] = [
  { type: 'daily_minutes', target: DAILY_TARGET },
  { type: 'yearly_books', target: YEARLY_TARGET },
];

export let SEEDED_GOALS: Goal[] = [];

export async function seed(knex: Knex): Promise<void> {
  await knex('goal').del();
  await knex('goal_achievement').del();

  SEEDED_GOALS = (await Promise.all(SEED_GOALS.map((g) => createGoal(db, g)))) as Goal[];

  // Backfill achievements from the seeded reading history using the same logic the
  // app runs on every sync, so the seed stays in sync with real behaviour.
  const achievements = await GoalsService.recordPreviousAchievements();

  console.log(`✓ Seeded ${SEEDED_GOALS.length} goals and ${achievements.length} achievements`);
}
