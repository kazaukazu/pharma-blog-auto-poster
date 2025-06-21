import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import logger from '../utils/logger';

const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req: Request) => req.ip,
  points: config.rateLimit.maxRequests,
  duration: config.rateLimit.windowMs / 1000,
});

const authRateLimiter = new RateLimiterMemory({
  keyGenerator: (req: Request) => req.ip,
  points: 5, // 5 attempts
  duration: 15 * 60, // 15 minutes
  blockDuration: 15 * 60, // 15 minutes
});

export const generalRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    
    logger.warn('Rate limit exceeded', { 
      ip: req.ip, 
      path: req.path, 
      method: req.method 
    });

    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      retryAfter: secs
    });
  }
};

export const authRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authRateLimiter.consume(req.ip);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    
    logger.warn('Auth rate limit exceeded', { 
      ip: req.ip, 
      path: req.path, 
      method: req.method 
    });

    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts',
      retryAfter: secs
    });
  }
};