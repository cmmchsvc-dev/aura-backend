import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { analyzeUserPatterns, getWellnessProfile } from '../services/patternDetection';

export const insightsRouter = Router();

// Get wellness profile
insightsRouter.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = await getWellnessProfile(req.userId!);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wellness profile' });
  }
});

// Trigger pattern analysis
insightsRouter.post('/analyze', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await analyzeUserPatterns(req.userId!);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze patterns' });
  }
});
