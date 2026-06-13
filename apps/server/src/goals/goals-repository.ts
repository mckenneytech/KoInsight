import { GoalWithProgress, GoalType } from '@koinsight/common/types';
import { db } from '../knex';
import { getYear } from 'date-fns';

export class GoalsRepository {
  static async getCurrentGoals(): Promise<GoalWithProgress[]> {
    return db<GoalWithProgress>('goal').select('*');
  }

  static async upsert(type: GoalType, target: number) {
    return db('goal').insert({ type, target }).onConflict('type').merge(['target', 'updated_at']);
  }
}
