import { GoalAchievement, Goal } from '@koinsight/common/types';
import { db } from '../../knex';
import { Knex } from 'knex';
import { createGoal } from '../factories/goal-factory';
import { createGoalAchievement } from '../factories/goal-achievement-factory';

const SEED_GOALS: Partial<Goal>[] = [
  {
    id: 1,
    type: 'daily_minutes',
    target: 60,
  },
  {
    id: 2,
    type: 'yearly_books',
    target: 10,
  },
];

const SEED_GOAL_ACHIEVEMENTS: Partial<GoalAchievement>[] = [
  {
    id: 1,
    type: 'daily_minutes',
    period: new Date().toDateString(),
    target: 60,
    value: 65,
    achieved_at: new Date(),
  },
  {
    id: 2,
    type: 'yearly_books',
    period: new Date().getFullYear().toString(),
    target: 10,
    value: 10,
    achieved_at: new Date(),
  },
];

export let SEEDED_GOALS: Goal[] = [];
export let SEEDED_ACHIEVEMENTS: GoalAchievement[] = [];

export async function seed(knex: Knex): Promise<void> {
  await knex('goal').del();
  await knex('goal_achievement').del();

  const goals = await Promise.all(SEED_GOALS.map((goal) => createGoal(db, goal)));
  SEEDED_GOALS = goals as Goal[];
  console.log(`✓ Seeded ${SEEDED_GOALS.length} goals`);

  const goal_achievements = await Promise.all(
    SEED_GOAL_ACHIEVEMENTS.map((achievement) => createGoalAchievement(db, achievement))
  );
  SEEDED_ACHIEVEMENTS = goal_achievements as GoalAchievement[];
  console.log(`✓ Seeded ${SEEDED_ACHIEVEMENTS.length} goal achievements`);
}
