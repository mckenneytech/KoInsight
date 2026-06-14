import { Goal, GoalAchievement } from '@koinsight/common/types';
import { db } from '../../knex';
import { Knex } from 'knex';
import { createGoal } from '../factories/goal-factory';
import { StatsRepository } from '../../stats/stats-repository';
import { BooksRepository } from '../../books/books-repository';
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

  const stats = await StatsRepository.getAll(); // start_time in ms
  const books = await BooksRepository.getAllWithData(); // last_open in seconds

  // One row per day whose total minutes met the daily target.
  const dailyAchievements: Omit<GoalAchievement, 'id'>[] = [...GoalsService.minutesPerDay(stats)]
    .filter(([, minutes]) => minutes >= DAILY_TARGET)
    .map(([day, minutes]) => ({
      type: 'daily_minutes',
      period: day,
      target: DAILY_TARGET,
      value: minutes,
      achieved_at: new Date(`${day}T23:59:59`),
    }));

  // One row per year whose completed-book count met the yearly target.
  const yearlyAchievements: Omit<GoalAchievement, 'id'>[] = [
    ...GoalsService.booksCompletedPerYear(books),
  ]
    .filter(([, count]) => count >= YEARLY_TARGET)
    .map(([year, count]) => ({
      type: 'yearly_books',
      period: String(year),
      target: YEARLY_TARGET,
      value: count,
      achieved_at: new Date(`${year}-12-31T23:59:59`),
    }));

  const achievements = [...dailyAchievements, ...yearlyAchievements];
  if (achievements.length) await knex('goal_achievement').insert(achievements);

  console.log(`✓ Seeded ${SEEDED_GOALS.length} goals and ${achievements.length} achievements`);
}
