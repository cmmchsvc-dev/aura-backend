import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { getFirestore } from '../services/firebase';
import { manualCrisisTrigger, CRISIS_RESOURCES } from '../services/crisisDetection';

export const crisisRouter = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number'),
  email: z.string().email(),
  relationship: z.string().max(50).optional(),
});

// Add crisis contact
crisisRouter.post('/contacts', validate(contactSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const contactsSnap = await db
      .collection('users').doc(req.userId!)
      .collection('crisisContacts')
      .count()
      .get();

    if (contactsSnap.data().count >= 3) {
      res.status(400).json({ error: 'Maximum 3 crisis contacts allowed' });
      return;
    }

    const ref = await db
      .collection('users').doc(req.userId!)
      .collection('crisisContacts')
      .add({ ...req.body, addedAt: new Date() });

    res.json({ id: ref.id, success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add contact' });
  }
});

// Get crisis contacts
crisisRouter.get('/contacts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db
      .collection('users').doc(req.userId!)
      .collection('crisisContacts')
      .get();

    const contacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ contacts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Remove crisis contact
crisisRouter.delete('/contacts/:contactId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    await db
      .collection('users').doc(req.userId!)
      .collection('crisisContacts')
      .doc(req.params.contactId as string)
      .delete();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove contact' });
  }
});

// Manual "I need help" button
crisisRouter.post('/help', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await manualCrisisTrigger(req.userId!);
    res.json({
      success: true,
      message: 'Your Crisis Circle has been notified. Help is on the way.',
      resources: CRISIS_RESOURCES,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger alert' });
  }
});

// Get crisis resources
crisisRouter.get('/resources', async (_req: AuthenticatedRequest, res: Response) => {
  res.json({ resources: CRISIS_RESOURCES });
});
