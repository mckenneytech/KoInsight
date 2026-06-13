import { GoalsRepository } from './goals-repository';
import { BookWithData, GoalWithProgress, PageStat } from '@koinsight/common/types';
import { StatsRepository } from '../stats/stats-repository';
import { isSameDay, isSameYear } from 'date-fns';
import { BooksRepository } from '../books/books-repository';

export class GoalsService {
  static minutesReadToday(stats: PageStat[], now: Date = new Date()): number {
    const seconds = stats
      .filter((s) => isSameDay(s.start_time, now)) // start_time is ms, isSameDay accepts it
      .reduce((acc, s) => acc + s.duration, 0);
    return Math.round(seconds / 60);
  }

  static async calculateDailyGoalProgress(): Promise<number> {
    const stats = await StatsRepository.getAll();
    return this.minutesReadToday(stats);
  }

  static numberOfBooksReadThisYear(books: BookWithData[], now: Date = new Date()): number {
    const COMPLETION_THRESHOLD = 0.95;
    return books.filter((book) => {
      if (!book.total_pages) return false;
      const completion = book.unique_read_pages / book.total_pages;
      const finishedThisYear = isSameYear(book.last_open * 1000, now);
      return completion >= COMPLETION_THRESHOLD && finishedThisYear;
    }).length;
  }

  static async calculateYearlyGoalProgress(): Promise<number> {
    const books = await BooksRepository.getAllWithData();
    return this.numberOfBooksReadThisYear(books);
  }

  static async getAllWithProgress(): Promise<GoalWithProgress[]> {
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
}
