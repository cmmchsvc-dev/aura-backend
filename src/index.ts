import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initializeFirebase } from './services/firebase';
import { authRouter } from './routes/auth';
import { chatRouter } from './routes/chat';
import { healthRouter } from './routes/health';
import { insightsRouter } from './routes/insights';
import { notificationsRouter } from './routes/notifications';
import { crisisRouter } from './routes/crisis';
import voiceRouter from './routes/voice';
import livekitRouter from './routes/livekit';
import { authMiddleware } from './middleware/auth';
import { createRateLimiter } from './middleware/rateLimiter';
import { logger } from './services/logger';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin
initializeFirebase();

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased for audio uploads
app.use(createRateLimiter());

// ... (health check)

// Protected routes
app.use('/api/auth', authRouter);
app.use('/api/voice', authMiddleware, voiceRouter); // New voice route
app.use('/api/livekit', livekitRouter); // LiveKit token generation (no auth required for MVP)
app.use('/api/chat', authMiddleware, chatRouter);
app.use('/api/health', authMiddleware, healthRouter);
app.use('/api/insights', authMiddleware, insightsRouter);
app.use('/api/notifications', authMiddleware, notificationsRouter);
app.use('/api/crisis', authMiddleware, crisisRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`🌌 Aura API running on port ${PORT}`);
});

export default app;
