import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { getFirestore } from '../services/firebase';

export const notificationsRouter = Router();

const tokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

// Register push notification token
notificationsRouter.post('/token', validate(tokenSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    await db.collection('users').doc(req.userId!).set({
      pushToken: req.body.token,
      pushPlatform: req.body.platform,
    }, { merge: true });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register token' });
  }
});

// Get notification preferences
notificationsRouter.get('/preferences', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const doc = await db.collection('users').doc(req.userId!).get();
    const prefs = doc.data()?.notificationPreferences || {
      dailyCheckIn: true,
      patternAlerts: true,
      crisisAlerts: true,
      weeklySummary: true,
      quietHoursStart: 22,
      quietHoursEnd: 7,
    };
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update notification preferences
notificationsRouter.put('/preferences', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    await db.collection('users').doc(req.userId!).set({
      notificationPreferences: req.body,
    }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});
