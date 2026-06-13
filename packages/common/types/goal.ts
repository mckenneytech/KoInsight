export type GoalType = 'daily_minutes' | 'yearly_books';

export type GoalWithProgress = {
  id: number;
  type: GoalType;
  target: number;
  progress: number;
  achieved: boolean;
  created_at: Date;
  updated_at: Date;
};

export type GetGoalsResponse = {
  currentGoals: GoalWithProgress[];
};
