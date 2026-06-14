import useSWR from 'swr';
import { fetchFromAPI } from './api';
import { GoalAchievement, GoalType, GoalWithProgress } from '@koinsight/common/types';

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

export async function setGoal(type: GoalType, target: number) {
  return fetchFromAPI<{ message: string }>(`goals/${type}`, 'PUT', { target });
}

export async function refreshGoals() {
  return fetchFromAPI<{ message: string }>('goals/refresh', 'POST');
}