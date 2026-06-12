export type GoalType = 'daily_minutes' | 'yearly_books';

export type Goal = {
  id: number;
  type: GoalType;
  target: number;
  progress: number;
  achieved: boolean;
};

export type GetGoalsResponse = {
  currentGoals: Goal[];
};
