import rateLimit from 'express-rate-limit';

export function createRateLimiter() {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

/** Stricter limiter for AI chat (expensive calls) */
export const chatRateLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  message: { error: 'Chat rate limit reached. Please wait a moment.' },
});
