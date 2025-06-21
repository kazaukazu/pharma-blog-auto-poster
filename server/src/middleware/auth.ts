import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger from '../utils/logger';
import { logSecurityEvent, checkSuspiciousActivity } from '../utils/securityMonitor';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const ipAddress = req.ip;

  if (!token) {
    await logSecurityEvent({
      eventType: 'auth_missing_token',
      severity: 'low',
      ipAddress,
      userAgent: req.get('User-Agent'),
    });

    return res.status(401).json({ 
      success: false, 
      error: 'Access token required' 
    });
  }

  jwt.verify(token, config.jwt.secret, async (err, user) => {
    if (err) {
      await logSecurityEvent({
        eventType: 'auth_invalid_token',
        severity: 'medium',
        ipAddress,
        userAgent: req.get('User-Agent'),
        details: { tokenPrefix: token.substring(0, 20), error: err.message },
      });

      logger.warn('Invalid token attempt', { token: token.substring(0, 20), ip: ipAddress });
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }

    const userData = user as any;
    req.user = userData;

    // Check for suspicious activity
    try {
      const { isSuspicious, reasons } = await checkSuspiciousActivity(userData.id, ipAddress);
      if (isSuspicious) {
        await logSecurityEvent({
          eventType: 'suspicious_activity_detected',
          severity: 'high',
          userId: userData.id,
          ipAddress,
          userAgent: req.get('User-Agent'),
          details: { reasons },
        });

        logger.warn('Suspicious activity detected', {
          userId: userData.id,
          ip: ipAddress,
          reasons,
        });

        // Still allow the request but log it for monitoring
      }
    } catch (error) {
      logger.error('Error checking suspicious activity:', error);
    }

    next();
  });
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (!err) {
      req.user = user as any;
    }
    next();
  });
};