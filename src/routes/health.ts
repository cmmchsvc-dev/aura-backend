import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { getFirestore } from '../services/firebase';
import { checkBiometricCrisis, triggerCrisisCircle } from '../services/crisisDetection';

export const healthRouter = Router();

const healthDataSchema = z.object({
  heartRate: z.number().min(30).max(250).optional(),
  steps: z.number().min(0).optional(),
  stressLevel: z.number().min(0).max(100).optional(),
  sleepQuality: z.number().min(0).max(100).optional(),
  sleepDuration: z.number().min(0).max(24).optional(),
  mood: z.number().min(1).max(10).optional(),
  isExercising: z.boolean().optional(),
  source: z.enum(['apple_health', 'google_fit', 'manual']).default('manual'),
  timestamp: z.string().datetime().optional(),
});

const batchSchema = z.object({
  data: z.array(healthDataSchema).max(100),
});

// Submit single health data point
healthRouter.post('/data', validate(healthDataSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const data = {
      ...req.body,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
    };

    await db.collection('users').doc(req.userId!).collection('healthData').add(data);

    // Also update latest biometrics
    if (data.heartRate || data.stressLevel) {
      await db.collection('users').doc(req.userId!).collection('biometrics').add({
        heartRate: data.heartRate,
        stressLevel: data.stressLevel ? getStressLabel(data.stressLevel) : undefined,
        sleepQuality: data.sleepQuality ? getSleepLabel(data.sleepQuality) : undefined,
        steps: data.steps,
        timestamp: data.timestamp,
      });
    }

    // Check for crisis
    if (data.heartRate) {
      const crisis = await checkBiometricCrisis(req.userId!, data.heartRate, data.isExercising || false);
      if (crisis) {
        await triggerCrisisCircle(req.userId!, crisis);
        res.json({ saved: true, crisis: true, message: 'Crisis alert triggered' });
        return;
      }
    }

    res.json({ saved: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save health data' });
  }
});

// Batch submit health data
healthRouter.post('/batch', validate(batchSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const batch = db.batch();

    for (const item of req.body.data) {
      const ref = db.collection('users').doc(req.userId!).collection('healthData').doc();
      batch.set(ref, {
        ...item,
        timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
      });
    }

    await batch.commit();
    res.json({ saved: true, count: req.body.data.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save batch data' });
  }
});

// Get health data for a time range
healthRouter.get('/data', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const days = parseInt(req.query.days as string) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const snap = await db
      .collection('users').doc(req.userId!)
      .collection('healthData')
      .where('timestamp', '>', since)
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get();

    const data = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate?.()?.toISOString(),
    }));

    res.json({ data, count: data.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health data' });
  }
});

// Get latest biometrics summary
healthRouter.get('/latest', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db
      .collection('users').doc(req.userId!)
      .collection('biometrics')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (snap.empty) {
      res.json({ data: null });
      return;
    }

    res.json({ data: snap.docs[0].data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch latest biometrics' });
  }
});

function getStressLabel(level: number): string {
  if (level < 25) return 'low';
  if (level < 50) return 'moderate';
  if (level < 75) return 'high';
  return 'very_high';
}

function getSleepLabel(quality: number): string {
  if (quality < 25) return 'poor';
  if (quality < 50) return 'fair';
  if (quality < 75) return 'good';
  return 'excellent';
}
