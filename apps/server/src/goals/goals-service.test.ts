import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Book, BookWithData, Device, GoalAchievement, PageStat } from '@koinsight/common/types';
import { db } from '../knex';
import { createBook } from '../db/factories/book-factory';
import { createBookDevice } from '../db/factories/book-device-factory';
import { createDevice } from '../db/factories/device-factory';
import { createPageStat } from '../db/factories/page-stat-factory';
import { createGoal } from '../db/factories/goal-factory';
import { COMPLETION_THRESHOLD, GoalsService } from './goals-service';

/** StatsRepository.getAll() treats stored start_time as seconds, so seed it in seconds. */
function secondsAtNoon(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day, 12, 0, 0).getTime() / 1000;
}

describe(GoalsService.recordPreviousAchievements, () => {
  let device: Device;
  let book: Book;

  beforeEach(async () => {
    await db.raw('PRAGMA foreign_keys = OFF');
    await db('goal_achievement').del();
    await db('goal').del();
    await db('page_stat').del();
    await db('book_device').del();
    await db('book').del();
    await db('device').del();
    await db.raw('PRAGMA foreign_keys = ON');

    device = await createDevice(db);
    book = await createBook(db, { soft_deleted: false });
  });

  afterEach(async () => {
    await db.raw('PRAGMA foreign_keys = OFF');
    await db('goal_achievement').del();
    await db('goal').del();
    await db('page_stat').del();
    await db('book_device').del();
    await db('book').del();
    await db('device').del();
    await db.raw('PRAGMA foreign_keys = ON');
  });

  it('records an achievement only for days that meet the daily target', async () => {
    await createGoal(db, { type: 'daily_minutes', target: 30 });
    const bookDevice = await createBookDevice(db, book, device, { pages: 100 });

    // 2026-06-10: 30 minutes → meets the goal
    await createPageStat(db, book, bookDevice, device, {
      page: 1,
      start_time: secondsAtNoon(2026, 6, 10),
      duration: 30 * 60,
    });
    // 2026-06-11: 10 minutes → does not meet the goal
    await createPageStat(db, book, bookDevice, device, {
      page: 2,
      start_time: secondsAtNoon(2026, 6, 11),
      duration: 10 * 60,
    });

    await GoalsService.recordPreviousAchievements();

    const rows = await db<GoalAchievement>('goal_achievement').select('*');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: 'daily_minutes',
      period: '2026-06-10',
      target: 30,
      value: 30,
    });
  });

  it('does nothing when no goal is set', async () => {
    const bookDevice = await createBookDevice(db, book, device, { pages: 100 });
    await createPageStat(db, book, bookDevice, device, {
      page: 1,
      start_time: secondsAtNoon(2026, 6, 10),
      duration: 60 * 60,
    });

    const recorded = await GoalsService.recordPreviousAchievements();

    expect(recorded).toHaveLength(0);
    expect(await db('goal_achievement').select('*')).toHaveLength(0);
  });

  it('is idempotent across repeated syncs', async () => {
    await createGoal(db, { type: 'daily_minutes', target: 30 });
    const bookDevice = await createBookDevice(db, book, device, { pages: 100 });
    await createPageStat(db, book, bookDevice, device, {
      page: 1,
      start_time: secondsAtNoon(2026, 6, 10),
      duration: 30 * 60,
    });

    await GoalsService.recordPreviousAchievements();
    await GoalsService.recordPreviousAchievements();

    expect(await db('goal_achievement').select('*')).toHaveLength(1);
  });

  it('records a previously-missed day when a later sync delivers data for it', async () => {
    await createGoal(db, { type: 'daily_minutes', target: 30 });
    const bookDevice = await createBookDevice(db, book, device, { pages: 100 });

    // First sync: only 10 minutes on 2026-06-10 → not yet achieved.
    await createPageStat(db, book, bookDevice, device, {
      page: 1,
      start_time: secondsAtNoon(2026, 6, 10),
      duration: 10 * 60,
    });
    await GoalsService.recordPreviousAchievements();
    expect(await db('goal_achievement').select('*')).toHaveLength(0);

    // Later sync delivers more reading for that same past day, pushing it over target.
    await createPageStat(db, book, bookDevice, device, {
      page: 2,
      start_time: secondsAtNoon(2026, 6, 10),
      duration: 25 * 60,
    });
    await GoalsService.recordPreviousAchievements();

    const rows = await db<GoalAchievement>('goal_achievement').select('*');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ period: '2026-06-10', value: 35 });
  });
});

function fakeStat(overrides: Partial<PageStat> = {}): PageStat {
  return {
    book_md5: 'md5',
    device_id: 'device',
    page: 1,
    start_time: new Date(2026, 5, 10, 12).getTime(),
    duration: 60,
    total_pages: 100,
    ...overrides,
  };
}

function completableBook(overrides: Partial<BookWithData> = {}): BookWithData {
  return {
    total_pages: 100,
    unique_read_pages: 100,
    last_open: new Date(2026, 5, 10, 12).getTime() / 1000,
    ...overrides,
  } as BookWithData;
}

describe(GoalsService.minutesPerDay, () => {
  it('sums durations per calendar day and converts seconds to rounded minutes', () => {
    const result = GoalsService.minutesPerDay([
      fakeStat({ start_time: new Date(2026, 5, 10, 8).getTime(), duration: 600 }), // 10 min
      fakeStat({ start_time: new Date(2026, 5, 10, 20).getTime(), duration: 330 }), // 5.5 min
      fakeStat({ start_time: new Date(2026, 5, 11, 8).getTime(), duration: 1200 }), // 20 min
    ]);

    expect(result.get('2026-06-10')).toBe(16); // 930s -> 15.5 -> 16
    expect(result.get('2026-06-11')).toBe(20);
  });

  it('returns an empty map for no stats', () => {
    expect(GoalsService.minutesPerDay([]).size).toBe(0);
  });
});

describe(GoalsService.minutesReadToday, () => {
  it('returns minutes read on the given day', () => {
    const now = new Date(2026, 5, 10, 23);
    const stats = [
      fakeStat({ start_time: new Date(2026, 5, 10, 9).getTime(), duration: 1800 }),
      fakeStat({ start_time: new Date(2026, 5, 9, 9).getTime(), duration: 1800 }),
    ];

    expect(GoalsService.minutesReadToday(stats, now)).toBe(30);
  });

  it('returns 0 when nothing was read that day', () => {
    const now = new Date(2026, 5, 12);
    expect(GoalsService.minutesReadToday([fakeStat()], now)).toBe(0);
  });
});

describe(GoalsService.isCompleted, () => {
  it('is completed once the read ratio reaches the threshold', () => {
    const total = 100;
    const atThreshold = Math.ceil(COMPLETION_THRESHOLD * total);
    expect(
      GoalsService.isCompleted(completableBook({ total_pages: total, unique_read_pages: atThreshold }))
    ).toBe(true);
    expect(
      GoalsService.isCompleted(
        completableBook({ total_pages: total, unique_read_pages: atThreshold - 1 })
      )
    ).toBe(false);
  });

  it('is never completed without a known page count', () => {
    expect(GoalsService.isCompleted(completableBook({ total_pages: 0 }))).toBe(false);
  });
});

describe(GoalsService.booksCompletedPerYear, () => {
  it('counts only completed books, bucketed by the year of last_open', () => {
    const result = GoalsService.booksCompletedPerYear([
      completableBook({ last_open: new Date(2025, 0, 1, 12).getTime() / 1000 }),
      completableBook({ last_open: new Date(2026, 2, 1, 12).getTime() / 1000 }),
      completableBook({ last_open: new Date(2026, 5, 1, 12).getTime() / 1000 }),
      completableBook({ unique_read_pages: 10 }), // not completed -> ignored
    ]);

    expect(result.get(2025)).toBe(1);
    expect(result.get(2026)).toBe(2);
  });
});

describe(GoalsService.numberOfBooksReadThisYear, () => {
  it('returns the completed-book count for the current year', () => {
    const now = new Date(2026, 5, 14);
    const books = [
      completableBook({ last_open: new Date(2026, 0, 1, 12).getTime() / 1000 }),
      completableBook({ last_open: new Date(2026, 4, 1, 12).getTime() / 1000 }),
      completableBook({ last_open: new Date(2025, 4, 1, 12).getTime() / 1000 }),
    ];

    expect(GoalsService.numberOfBooksReadThisYear(books, now)).toBe(2);
  });
});

describe(GoalsService.getCurrentWithProgress, () => {
  beforeEach(async () => {
    await db('goal').del();
  });

  afterEach(async () => {
    await db('goal').del();
  });

  it('attaches progress and achieved to each goal', async () => {
    const device = await createDevice(db);
    const book = await createBook(db, { soft_deleted: false });
    const bookDevice = await createBookDevice(db, book, device, { pages: 100 });

    // 40 minutes read "today" (start_time stored in seconds; getAll scales to ms).
    await createPageStat(db, book, bookDevice, device, {
      page: 1,
      start_time: Date.now() / 1000,
      duration: 40 * 60,
    });

    await createGoal(db, { type: 'daily_minutes', target: 30 });
    await createGoal(db, { type: 'yearly_books', target: 5 });

    const goals = await GoalsService.getCurrentWithProgress();
    const daily = goals.find((g) => g.type === 'daily_minutes')!;
    const yearly = goals.find((g) => g.type === 'yearly_books')!;

    expect(daily).toMatchObject({ progress: 40, achieved: true });
    expect(yearly).toMatchObject({ progress: 0, achieved: false });
  });
});

describe(GoalsService.getAchievements, () => {
  beforeEach(async () => {
    await db('goal_achievement').del();
  });

  afterEach(async () => {
    await db('goal_achievement').del();
  });

  it('returns the stored achievement rows', async () => {
    await db('goal_achievement').insert({
      type: 'daily_minutes',
      period: '2026-06-10',
      target: 30,
      value: 45,
      achieved_at: new Date('2026-06-10T23:59:59'),
    });

    const achievements = await GoalsService.getAchievements();

    expect(achievements).toHaveLength(1);
    expect(achievements[0]).toMatchObject({
      type: 'daily_minutes',
      period: '2026-06-10',
      value: 45,
    });
  });
});
