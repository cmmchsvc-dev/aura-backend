import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { chatRateLimiter } from '../middleware/rateLimiter';
import { chat, detectCrisisLanguage, generateAudioResponse } from '../services/aiCompanion';
import { triggerCrisisCircle } from '../services/crisisDetection';
import { getFirestore } from '../services/firebase';

export const chatRouter = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
});

const exerciseSchema = z.object({
  type: z.enum(['breathing', 'grounding', 'body_scan', 'gratitude']),
});

// Send a chat message
chatRouter.post('/message', chatRateLimiter, validate(chatSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, conversationId } = req.body;
    const convId = conversationId || uuidv4();

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(req.userId!).get();
    const subscription = userDoc.data()?.subscription || 'free';

    if (subscription === 'free') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const msgCount = await db
        .collection('users').doc(req.userId!)
        .collection('conversations').doc(convId)
        .collection('messages')
        .where('role', '==', 'user')
        .where('timestamp', '>', today)
        .count()
        .get();

      if (msgCount.data().count >= 5) {
        res.status(429).json({
          error: 'Daily message limit reached',
          upgrade: true,
          message: "You've used your 5 free messages today. Upgrade to Plus for unlimited conversations. 💜",
        });
        return;
      }
    }

    const result = await chat(req.userId!, message, convId);

    if (result.isCrisis) {
      await triggerCrisisCircle(req.userId!, {
        userId: req.userId!,
        type: 'chat',
        severity: 'critical',
        description: 'Crisis language detected in chat',
        timestamp: new Date(),
        notifiedContacts: false,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get conversation history
chatRouter.get('/history/:conversationId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db
      .collection('users').doc(req.userId!)
      .collection('conversations').doc(req.params.conversationId as string)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .limit(100)
      .get();

    const messages = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate?.()?.toISOString(),
    }));

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// List conversations
chatRouter.get('/conversations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db
      .collection('users').doc(req.userId!)
      .collection('conversations')
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();

    const conversations = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      updatedAt: d.data().updatedAt?.toDate?.()?.toISOString(),
    }));

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get guided exercise (Updated to remove direct service call)
chatRouter.post('/exercise', validate(exerciseSchema), async (req: AuthenticatedRequest, res: Response) => {
  res.json({ content: "Guided exercises are temporarily unavailable while we update our cloud service.", type: req.body.type });
});

const audioSchema = z.object({
  audio: z.string(),
  mimeType: z.string().optional().default('audio/webm'),
});

chatRouter.post('/audio', chatRateLimiter, validate(audioSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { audio } = req.body;
    const db = getFirestore();
    
    // Generate response (Fixed: Now takes only 1 argument)
    const result = await generateAudioResponse(audio);

    await db
      .collection('users').doc(req.userId!)
      .collection('audioMessages')
      .add({
        timestamp: new Date(),
        hasAudioResponse: !!result.audio,
      });

    res.json(result);
  } catch (error) {
    console.error('Audio chat error:', error);
    res.status(500).json({ error: 'Failed to process audio message' });
  }
});