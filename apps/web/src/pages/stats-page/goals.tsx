import { IconBook, IconClock } from '@tabler/icons-react';
import { Statistics } from '../../components/statistics/statistics';
import { useGoals } from '../../api/goals';

export function Goals() {
  const { data: goals } = useGoals();
  const daily = goals.find((g) => g.type === 'daily_minutes');
  const yearly = goals.find((g) => g.type === 'yearly_books');
  return (
    <Statistics
      data={[
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
  );
}
