import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Goal, GoalAchievement } from '@koinsight/common/types';
import { db } from '../knex';
import { createGoal } from '../db/factories/goal-factory';
import { GoalsRepository } from './goals-repository';

function achievement(overrides: Partial<GoalAchievement> = {}): Omit<GoalAchievement, 'id'> {
  return {
    type: 'daily_minutes',
    period: '2026-06-10',
    target: 30,
    value: 45,
    achieved_at: new Date('2026-06-10T23:59:59'),
    ...overrides,
  };
}

describe(GoalsRepository, () => {
  beforeEach(async () => {
    await db('goal_achievement').del();
    await db('goal').del();
  });

  afterEach(async () => {
    await db('goal_achievement').del();
    await db('goal').del();
  });

  describe(GoalsRepository.getCurrentGoals, () => {
    it('returns all stored goals', async () => {
      await createGoal(db, { type: 'daily_minutes', target: 30 });
      await createGoal(db, { type: 'yearly_books', target: 12 });

      const goals = await GoalsRepository.getCurrentGoals();

      expect(goals).toHaveLength(2);
      expect(goals.map((g) => g.type).sort()).toEqual(['daily_minutes', 'yearly_books']);
    });

    it('returns an empty array when no goals exist', async () => {
      expect(await GoalsRepository.getCurrentGoals()).toEqual([]);
    });
  });

  describe(GoalsRepository.insertAchievements, () => {
    it('inserts the given achievements', async () => {
      await GoalsRepository.insertAchievements([
        achievement({ period: '2026-06-10' }),
        achievement({ period: '2026-06-11', value: 31 }),
      ]);

      const rows = await db<GoalAchievement>('goal_achievement').select('*');
      expect(rows).toHaveLength(2);
    });

    it('does nothing for an empty array', async () => {
      await GoalsRepository.insertAchievements([]);
      expect(await db('goal_achievement').select('*')).toHaveLength(0);
    });

    it('ignores rows that conflict on (type, period), keeping the original value', async () => {
      await GoalsRepository.insertAchievements([achievement({ value: 45 })]);
      await GoalsRepository.insertAchievements([achievement({ value: 999 })]);

      const rows = await db<GoalAchievement>('goal_achievement').select('*');
      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBe(45);
    });

    it('treats the same period under a different type as a separate achievement', async () => {
      await GoalsRepository.insertAchievements([
        achievement({ type: 'daily_minutes', period: '2026' }),
        achievement({ type: 'yearly_books', period: '2026' }),
      ]);

      expect(await db('goal_achievement').select('*')).toHaveLength(2);
    });
  });

  describe(GoalsRepository.getAchievements, () => {
    it('returns the stored achievement rows', async () => {
      await GoalsRepository.insertAchievements([achievement()]);

      const rows = await GoalsRepository.getAchievements();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ type: 'daily_minutes', period: '2026-06-10', value: 45 });
    });
  });

  describe(GoalsRepository.upsert, () => {
    it('inserts a goal that does not exist yet', async () => {
      await GoalsRepository.upsert('daily_minutes', 30);

      const goals = await db<Goal>('goal').select('*');
      expect(goals).toHaveLength(1);
      expect(goals[0]).toMatchObject({ type: 'daily_minutes', target: 30 });
    });

    it('updates the target of an existing goal instead of duplicating it', async () => {
      await GoalsRepository.upsert('daily_minutes', 30);
      await GoalsRepository.upsert('daily_minutes', 45);

      const goals = await db<Goal>('goal').where({ type: 'daily_minutes' });
      expect(goals).toHaveLength(1);
      expect(goals[0].target).toBe(45);
    });
  });
});
