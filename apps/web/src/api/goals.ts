import useSWR from 'swr';
import { fetchFromAPI } from './api';
import { GoalWithProgress } from '@koinsight/common/types';

export function useGoals() {
  return useSWR('goals', () => fetchFromAPI<GoalWithProgress[]>('goals/current', 'GET'), {
    fallbackData: [],
  });
}
