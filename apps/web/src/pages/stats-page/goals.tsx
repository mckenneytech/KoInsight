import { IconBook, IconClock } from '@tabler/icons-react';
import { Statistics } from '../../components/statistics/statistics';
import { useAchievements, useGoals } from '../../api/goals';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';

export function Goals() {
  const { data: goals } = useGoals();
  const daily = goals.find((g) => g.type === 'daily_minutes');
  const yearly = goals.find((g) => g.type === 'yearly_books');

  const { data: achievements } = useAchievements();
  const days = achievements
    .filter((a) => a.type === 'daily_minutes')
    .map((a) => a.period)
    .sort();

  let run = 0;
  let longestStreak = 0;
  let prev: string | null = null;
  for (const day of days) {
    run = prev && differenceInCalendarDays(parseISO(day), parseISO(prev)) === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = day;
  }

  const lastDay = days.at(-1) ?? null;
  const today = format(new Date(), 'yyyy-MM-dd');
  const currentStreak =
    lastDay && differenceInCalendarDays(parseISO(today), parseISO(lastDay)) <= 1 ? run : 0;

  return (
    <>
      <Statistics
        data={[
          {
            label: 'Current reading streak',
            value: currentStreak,
            icon: IconClock,
          },
          {
            label: 'Longest reading streak',
            value: longestStreak,
            icon: IconClock,
          },
          {
            label: 'Daily reading goal',
            value: daily ? `${daily.progress}/${daily.target} min` : 'Not set',
            icon: IconClock,
          },
          {
            label: 'Books this year',
            value: yearly ? `${yearly.progress}/${yearly.target} books` : 'Not set',
            icon: IconBook,
          },
        ]}
      />
    </>
  );
}
