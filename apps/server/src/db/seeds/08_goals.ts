import { Goal, GoalAchievement, PageStat, BookWithData } from '@koinsight/common/types';
import { db } from '../../knex';
import { Knex } from 'knex';
import { format, startOfDay, getYear } from 'date-fns';
import { createGoal } from '../factories/goal-factory';
import { StatsRepository } from '../../stats/stats-repository';
import { BooksRepository } from '../../books/books-repository';

const DAILY_TARGET = 60;
const YEARLY_TARGET = 10;
const COMPLETION_THRESHOLD = 0.95;

const SEED_GOALS: Partial<Goal>[] = [
  { type: 'daily_minutes', target: DAILY_TARGET },
  { type: 'yearly_books', target: YEARLY_TARGET },
];

export let SEEDED_GOALS: Goal[] = [];

// One row per day whose total minutes met the daily target.
function dailyAchievements(stats: PageStat[]): Omit<GoalAchievement, 'id'>[] {
  const secondsPerDay = new Map<string, number>(); // start_time is ms, duration is seconds
  for (const s of stats) {
    const day = format(startOfDay(s.start_time), 'yyyy-MM-dd');
    secondsPerDay.set(day, (secondsPerDay.get(day) ?? 0) + s.duration);
  }

  return [...secondsPerDay.entries()]
    .map(([day, seconds]) => ({ day, minutes: Math.round(seconds / 60) }))
    .filter(({ minutes }) => minutes >= DAILY_TARGET)
    .map(({ day, minutes }) => ({
      type: 'daily_minutes' as const,
      period: day,
      target: DAILY_TARGET,
      value: minutes,
      achieved_at: new Date(`${day}T23:59:59`),
    }));
}

// One row per year whose completed-book count met the yearly target.
function yearlyAchievements(books: BookWithData[]): Omit<GoalAchievement, 'id'>[] {
  const booksPerYear = new Map<number, number>();
  for (const book of books) {
    if (!book.total_pages) continue;
    if (book.unique_read_pages / book.total_pages < COMPLETION_THRESHOLD) continue;
    const year = getYear(book.last_open * 1000); // last_open is seconds
    booksPerYear.set(year, (booksPerYear.get(year) ?? 0) + 1);
  }

  return [...booksPerYear.entries()]
    .filter(([, count]) => count >= YEARLY_TARGET)
    .map(([year, count]) => ({
      type: 'yearly_books' as const,
      period: String(year),
      target: YEARLY_TARGET,
      value: count,
      achieved_at: new Date(`${year}-12-31T23:59:59`),
    }));
}

export async function seed(knex: Knex): Promise<void> {
  await knex('goal').del();
  await knex('goal_achievement').del();

  SEEDED_GOALS = (await Promise.all(SEED_GOALS.map((g) => createGoal(db, g)))) as Goal[];

  const stats = await StatsRepository.getAll();
  const books = await BooksRepository.getAllWithData();

  const achievements = [...dailyAchievements(stats), ...yearlyAchievements(books)];
  if (achievements.length) await knex('goal_achievement').insert(achievements);

  console.log(`✓ Seeded ${SEEDED_GOALS.length} goals and ${achievements.length} achievements`);
}
