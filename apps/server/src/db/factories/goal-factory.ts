import { Goal } from '@koinsight/common/types';
import { faker } from '@faker-js/faker';
import { Knex } from 'knex';

type FakeGoal = Omit<Goal, 'id'>;

export function fakeGoal(overrides: Partial<FakeGoal> = {}): FakeGoal {
  const goal: FakeGoal = {
    type: 'daily_minutes',
    target: faker.number.int({ min: 1, max: 100 }),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };

  return goal;
}

export async function createGoal(db: Knex, overrides: Partial<FakeGoal> = {}): Promise<Goal> {
  const goalData = fakeGoal(overrides);
  const [goal] = await db<Goal>('goal').insert(goalData).returning('*');

  return goal;
}
