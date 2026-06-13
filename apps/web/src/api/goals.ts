import useSWR from 'swr';
import { fetchFromAPI } from './api';
import { GetGoalsResponse } from '@koinsight/common/types';

export function useGoals() {
  return useSWR(
    'goals',
    () => fetchFromAPI<GetGoalsResponse>('goals', 'GET').then((r) => r.currentGoals),
    {
      fallbackData: [],
    }
  );
}
