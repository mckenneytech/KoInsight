import { GoalAchievement, GoalType, GoalWithProgress } from '@koinsight/common/types';
import { db } from '../knex';

export class GoalsRepository {
  static async getCurrentGoals(): Promise<GoalWithProgress[]> {
    return db<GoalWithProgress>('goal').select('*');
  }

  static async getAchievements(): Promise<GoalAchievement[]> {
    return db<GoalAchievement>('goal_achievement').select('*');
  }

  static async insertAchievements(achievements: Omit<GoalAchievement, 'id'>[]): Promise<void> {
    if (!achievements.length) return;

    await db<GoalAchievement>('goal_achievement')
      .insert(achievements)
      .onConflict(['type', 'period'])
      .ignore();
  }

  static async upsert(type: GoalType, target: number) {
    return db('goal').insert({ type, target }).onConflict('type').merge(['target', 'updated_at']);
  }
}
