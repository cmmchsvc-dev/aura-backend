import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../services/firebase';
import { logger } from '../services/logger';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

/**
 * Firebase Auth middleware — validates Bearer token
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.userId = decoded.uid;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    logger.warn('Auth token verification failed:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
