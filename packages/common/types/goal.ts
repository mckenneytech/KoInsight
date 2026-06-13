export type GoalType = 'daily_minutes' | 'yearly_books';

export type Goal = {
  id: number;
  type: GoalType;
  target: number;
  created_at: Date;
  updated_at: Date;
};

export type GoalWithProgress = Goal & {
  progress: number;
  achieved: boolean;
};

export type GoalAchievement = {
  id: number;
  type: GoalType;
  period: string;
  target: number;
  value: number;
  achieved_at: Date;
};

export type GetGoalsResponse = {
  currentGoals: GoalWithProgress[];
};
