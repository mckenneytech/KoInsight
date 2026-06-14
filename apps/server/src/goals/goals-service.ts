import { GoalsRepository } from './goals-repository';
import { BookWithData, GoalAchievement, GoalWithProgress, PageStat } from '@koinsight/common/types';
import { StatsRepository } from '../stats/stats-repository';
import { format, getYear, startOfDay } from 'date-fns';
import { BooksRepository } from '../books/books-repository';

export const COMPLETION_THRESHOLD = 0.95;

export class GoalsService {
  static minutesPerDay(stats: PageStat[]): Map<string, number> {
    const byDay = new Map<string, number>();
    for (const s of stats) {
      const day = format(startOfDay(s.start_time), 'yyyy-MM-dd');
      byDay.set(day, (byDay.get(day) ?? 0) + s.duration);
    }
    for (const [day, seconds] of byDay) byDay.set(day, Math.round(seconds / 60));
    return byDay;
  }

  /** A book counts as completed once enough of its unique pages have been read. */
  static isCompleted(book: BookWithData): boolean {
    return !!book.total_pages && book.unique_read_pages / book.total_pages >= COMPLETION_THRESHOLD;
  }

  /** Completed-book count per year. Key = numeric year. last_open is seconds. */
  static booksCompletedPerYear(books: BookWithData[]): Map<number, number> {
    const byYear = new Map<number, number>();
    for (const book of books) {
      if (!this.isCompleted(book)) continue;
      const year = getYear(book.last_open * 1000);
      byYear.set(year, (byYear.get(year) ?? 0) + 1);
    }
    return byYear;
  }

  static minutesReadToday(stats: PageStat[], now: Date = new Date()): number {
    return this.minutesPerDay(stats).get(format(startOfDay(now), 'yyyy-MM-dd')) ?? 0;
  }

  static async calculateDailyGoalProgress(): Promise<number> {
    const stats = await StatsRepository.getAll();
    return this.minutesReadToday(stats);
  }

  static numberOfBooksReadThisYear(books: BookWithData[], now: Date = new Date()): number {
    return this.booksCompletedPerYear(books).get(getYear(now)) ?? 0;
  }

  static async calculateYearlyGoalProgress(): Promise<number> {
    const books = await BooksRepository.getAllWithData();
    return this.numberOfBooksReadThisYear(books);
  }

  static async getCurrentWithProgress(): Promise<GoalWithProgress[]> {
    const goals = await GoalsRepository.getCurrentGoals();
    for (const goal of goals) {
      if (goal.type === 'daily_minutes') {
        goal.progress = await GoalsService.calculateDailyGoalProgress();
        goal.achieved = goal.progress >= goal.target;
      } else if (goal.type === 'yearly_books') {
        goal.progress = await GoalsService.calculateYearlyGoalProgress();
        goal.achieved = goal.progress >= goal.target;
      }
    }
    return goals;
  }

  static async getAchievements(): Promise<GoalAchievement[]> {
    return GoalsRepository.getAchievements();
  }

  static async recordPreviousAchievements(): Promise<Omit<GoalAchievement, 'id'>[]> {
    const goals = await GoalsRepository.getCurrentGoals();
    const dailyGoal = goals.find((g) => g.type === 'daily_minutes');
    const yearlyGoal = goals.find((g) => g.type === 'yearly_books');

    const achievements: Omit<GoalAchievement, 'id'>[] = [];

    if (dailyGoal) {
      const stats = await StatsRepository.getAll();
      for (const [day, minutes] of this.minutesPerDay(stats)) {
        if (minutes >= dailyGoal.target) {
          achievements.push({
            type: 'daily_minutes',
            period: day,
            target: dailyGoal.target,
            value: minutes,
            achieved_at: new Date(`${day}T23:59:59`),
          });
        }
      }
    }

    if (yearlyGoal) {
      const books = await BooksRepository.getAllWithData();
      for (const [year, count] of this.booksCompletedPerYear(books)) {
        if (count >= yearlyGoal.target) {
          achievements.push({
            type: 'yearly_books',
            period: String(year),
            target: yearlyGoal.target,
            value: count,
            achieved_at: new Date(`${year}-12-31T23:59:59`),
          });
        }
      }
    }

    await GoalsRepository.insertAchievements(achievements);
    return achievements;
  }
}
