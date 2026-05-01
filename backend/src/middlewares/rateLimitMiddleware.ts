import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number; // time window in milliseconds
  maxRequests: number; // max requests per window
}

interface StoredRequest {
  timestamps: number[];
}

// Simple in-memory rate limit store
const store = new Map<string, StoredRequest>();

const getKey = (req: Request, keyPrefix: string): string => {
  const userId = (req as any).user?.userId || 'anonymous';
  return `${keyPrefix}:${userId}`;
};

const cleanOldTimestamps = (timestamps: number[], now: number, windowMs: number): number[] => {
  return timestamps.filter(ts => now - ts < windowMs);
};

export const createRateLimiter = (config: RateLimitConfig) => {
  return (keyPrefix: string) => (req: Request, res: Response, next: NextFunction) => {
    const key = getKey(req, keyPrefix);
    const now = Date.now();
    const { windowMs, maxRequests } = config;

    let record = store.get(key);
    if (!record) {
      record = { timestamps: [] };
      store.set(key, record);
    }

    record.timestamps = cleanOldTimestamps(record.timestamps, now, windowMs);

    if (record.timestamps.length >= maxRequests) {
      const resetTime = new Date(record.timestamps[0] + windowMs);
      res.set('Retry-After', Math.ceil((resetTime.getTime() - now) / 1000).toString());
      return res.status(429).json({
        error: 'Muitas requisições. Tente novamente mais tarde.',
        retryAfter: resetTime.toISOString(),
      });
    }

    record.timestamps.push(now);
    next();
  };
};

// Preset configurations
export const rateLimits = {
  // Sensitive operations: 5 requests per 15 minutes
  sensitive: createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5 }),

  // Moderation: 20 requests per 10 minutes
  moderation: createRateLimiter({ windowMs: 10 * 60 * 1000, maxRequests: 20 }),

  // General management: 50 requests per 5 minutes
  management: createRateLimiter({ windowMs: 5 * 60 * 1000, maxRequests: 50 }),
};
