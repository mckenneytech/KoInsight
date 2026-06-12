import { Goal, GoalType } from '@koinsight/common/types';
import { db } from '../knex';
import { getYear } from 'date-fns';

export class GoalsRepository {
  static async getAll(): Promise<Goal[]> {
    return db<Goal>('goal').select('*');
  }

  static async getById(id: number): Promise<Goal | undefined> {
    return db<Goal>('goal').where({ id }).first();
  }

  static async insert(goal: Partial<Goal>): Promise<number[]> {
    return db<Goal>('goal').insert(goal);
  }

  static periodFor(type: GoalType, now = new Date()): string {
    return type === 'yearly_books' ? String(getYear(now)) : 'current';
  }

  static async upsert(type: GoalType, target: number) {
    return db('goal').insert({ type, target }).onConflict('type').merge(['target', 'updated_at']);
  }
}
