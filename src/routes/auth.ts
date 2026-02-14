import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getFirestore } from '../services/firebase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';

export const authRouter = Router();

const profileSchema = z.object({
  displayName: z.string().min(1).max(50),
  personality: z.enum(['warm', 'direct', 'playful', 'zen']),
  goals: z.array(z.enum(['reduce_stress', 'better_sleep', 'more_active', 'emotional_support'])),
});

// Create/update user profile (called after Firebase Auth sign-up)
authRouter.post('/profile', authMiddleware, validate(profileSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    await db.collection('users').doc(req.userId!).set({
      ...req.body,
      createdAt: new Date(),
      subscription: 'free',
      onboardingComplete: true,
    }, { merge: true });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// Get user profile
authRouter.get('/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const doc = await db.collection('users').doc(req.userId!).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json(doc.data());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Delete account and all data
authRouter.delete('/account', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    // Delete user document and subcollections
    const userRef = db.collection('users').doc(req.userId!);
    const subcollections = ['conversations', 'healthData', 'biometrics', 'patterns', 'predictions', 'crisisContacts', 'crisisEvents'];

    for (const sub of subcollections) {
      const snap = await userRef.collection(sub).get();
      const batch = db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    await userRef.delete();
    res.json({ success: true, message: 'Account and all data deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});
