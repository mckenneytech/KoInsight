import { Request, Response, Router } from 'express';
import { GoalsRepository } from './goals-repository';
import { GoalsService } from './goals-service';

const router = Router();

router.get('/current', async (_: Request, res: Response) => {
  const goals = await GoalsService.getCurrentWithProgress();

  res.status(200).json(goals);
});

router.get('/achievements', async (_: Request, res: Response) => {
  const goals = await GoalsService.getAchievements();

  res.status(200).json(goals);
});

router.put('/daily_minutes', async (req: Request, res: Response) => {
  const goal = req.body.target;
  if (goal < 0) {
    return res.status(400).json({ message: 'Invalid goal value' });
  }

  try {
    await GoalsRepository.upsert('daily_minutes', goal);
    res.status(200).json({ message: 'Goal updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating goal' });
  }
});

router.put('/yearly_books', async (req: Request, res: Response) => {
  const goal = req.body.target;
  if (goal < 0) {
    return res.status(400).json({ message: 'Invalid goal value' });
  }

  try {
    await GoalsRepository.upsert('yearly_books', goal);
    res.status(200).json({ message: 'Goal updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating goal' });
  }
});

export { router as goalsRouter };
