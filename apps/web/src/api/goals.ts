import useSWR from 'swr';
import { fetchFromAPI } from './api';
import { GoalAchievement, GoalWithProgress } from '@koinsight/common/types';

export function useGoals() {
  return useSWR('goals', () => fetchFromAPI<GoalWithProgress[]>('goals/current', 'GET'), {
    fallbackData: [],
  });
}

export function useAchievements() {
  return useSWR(
    'achievements',
    () => fetchFromAPI<GoalAchievement[]>('goals/achievements', 'GET'),
    {
      fallbackData: [],
    }
  );
}
