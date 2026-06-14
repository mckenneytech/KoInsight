import { IconBook, IconClock, IconPencil, IconRefresh } from '@tabler/icons-react';
import { Button, Group, Modal, NumberInput, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { Statistics } from '../../components/statistics/statistics';
import { refreshGoals, setGoal, useAchievements, useGoals } from '../../api/goals';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';

const DEFAULT_DAILY_TARGET = 30;
const DEFAULT_YEARLY_TARGET = 12;

export function Goals() {
  const { mutate } = useSWRConfig();

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

  const [editOpened, editHandlers] = useDisclosure(false);
  const [dailyTarget, setDailyTarget] = useState(DEFAULT_DAILY_TARGET);
  const [yearlyTarget, setYearlyTarget] = useState(DEFAULT_YEARLY_TARGET);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const openEdit = () => {
    // Prefill from the current goals (which may have loaded after first render).
    setDailyTarget(daily?.target ?? DEFAULT_DAILY_TARGET);
    setYearlyTarget(yearly?.target ?? DEFAULT_YEARLY_TARGET);
    editHandlers.open();
  };

  const onSave = async () => {
    try {
      setSaving(true);
      await Promise.all([
        setGoal('daily_minutes', dailyTarget),
        setGoal('yearly_books', yearlyTarget),
      ]);
      await mutate('goals');
      notifications.show({
        title: 'Goals updated',
        message: 'Your reading goals were saved.',
        color: 'green',
        position: 'top-center',
      });
      editHandlers.close();
    } catch (error) {
      notifications.show({
        title: 'Failed to update goals',
        message: '',
        color: 'red',
        position: 'top-center',
      });
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshGoals();
      await Promise.all([mutate('goals'), mutate('achievements')]);
      notifications.show({
        title: 'Goals refreshed',
        message: 'Recalculated progress and achievements.',
        color: 'green',
        position: 'top-center',
      });
    } catch (error) {
      notifications.show({
        title: 'Failed to refresh goals',
        message: '',
        color: 'red',
        position: 'top-center',
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Stack gap="md">
      <Group justify="flex-end" gap="sm">
        <Button
          variant="subtle"
          leftSection={<IconRefresh size={16} />}
          loading={refreshing}
          onClick={onRefresh}
        >
          Refresh
        </Button>
        <Button variant="subtle" leftSection={<IconPencil size={16} />} onClick={openEdit}>
          Edit goals
        </Button>
      </Group>

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

      <Modal opened={editOpened} onClose={editHandlers.close} title="Edit reading goals" centered>
        <Stack>
          <NumberInput
            label="Daily reading goal (minutes)"
            min={1}
            value={dailyTarget}
            onChange={(value) => setDailyTarget(Number(value))}
          />
          <NumberInput
            label="Books to read this year"
            min={1}
            value={yearlyTarget}
            onChange={(value) => setYearlyTarget(Number(value))}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={editHandlers.close}>
              Cancel
            </Button>
            <Button loading={saving} onClick={onSave}>
              Save goals
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
