import { GoalAchievement } from '@koinsight/common/types';
import { faker } from '@faker-js/faker';
import { Knex } from 'knex';

type FakeGoalAchievement = Omit<GoalAchievement, 'id'>;

export function fakeGoalAchievement(
  overrides: Partial<FakeGoalAchievement> = {}
): FakeGoalAchievement {
  const goalAchievement: FakeGoalAchievement = {
    type: 'daily_minutes',
    period: faker.date.past().toString(),
    target: faker.number.int({ min: 1, max: 100 }),
    value: faker.number.int({ min: 0, max: 100 }),
    achieved_at: new Date(),
    ...overrides,
  };

  return goalAchievement;
}

export async function createGoalAchievement(
  db: Knex,
  overrides: Partial<FakeGoalAchievement> = {}
): Promise<GoalAchievement> {
  const goalAchievementData = fakeGoalAchievement(overrides);
  const [goalAchievement] = await db<GoalAchievement>('goal_achievement')
    .insert(goalAchievementData)
    .returning('*');

  return goalAchievement;
}
