import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { db } from '../config/database';
import logger from '../utils/logger';

// Input sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    
    // Remove potential XSS patterns
    return str
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<[^>]+>/g, '') // Remove all HTML tags
      .trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  // Sanitize body, query, and params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// SQL injection prevention through parameter validation
export const validateSqlParams = (req: Request, res: Response, next: NextFunction) => {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\#|\/\*|\*\/)/gi,
    /((\%27)|(\')|((\%3D)|(=)))/gi,
    /((\%2B)|(\+))/gi,
    /((\%20)|(\ ))/gi,
  ];

  const checkForSqlInjection = (value: any): boolean => {
    if (typeof value !== 'string') return false;
    
    return sqlInjectionPatterns.some(pattern => pattern.test(value));
  };

  const validateObject = (obj: any): boolean => {
    if (obj === null || obj === undefined) return false;
    
    if (typeof obj === 'string') {
      return checkForSqlInjection(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(validateObject);
    }
    
    if (typeof obj === 'object') {
      return Object.values(obj).some(validateObject);
    }
    
    return false;
  };

  // Check all inputs for SQL injection patterns
  const hasSqlInjection = [req.body, req.query, req.params]
    .some(validateObject);

  if (hasSqlInjection) {
    logger.warn('SQL injection attempt detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
    });

    return res.status(400).json({
      success: false,
      error: '不正な入力が検出されました',
    });
  }

  next();
};

// Content Security Policy
export const setSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  next();
};

// Advanced rate limiting based on user behavior
export const createAdaptiveRateLimit = (options: {
  windowMs?: number;
  maxRequests?: number;
  identifier?: (req: Request) => string;
}) => {
  const { windowMs = 15 * 60 * 1000, maxRequests = 100, identifier } = options;

  return rateLimit({
    windowMs,
    max: async (req) => {
      // Default max
      let max = maxRequests;

      // Increase limit for authenticated users
      if (req.user) {
        max *= 2;
      }

      // Check user's recent behavior
      try {
        const userId = req.user?.id;
        if (userId) {
          const recent = await db.query(
            'SELECT COUNT(*) as count FROM api_logs WHERE user_id = $1 AND created_at > NOW() - INTERVAL \'1 hour\' AND status_code >= 400',
            [userId]
          );
          
          const errorCount = parseInt(recent.rows[0]?.count || '0', 10);
          
          // Reduce limit for users with many errors
          if (errorCount > 10) {
            max = Math.floor(max * 0.5);
          }
        }
      } catch (error) {
        logger.error('Error checking user behavior for rate limiting:', error);
      }

      return max;
    },
    keyGenerator: identifier || ((req) => {
      return req.user?.id || req.ip;
    }),
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        url: req.url,
      });

      res.status(429).json({
        success: false,
        error: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Slow down middleware for suspicious activity
export const createSlowDown = (options: {
  windowMs?: number;
  delayAfter?: number;
  delayMs?: number;
}) => {
  const { windowMs = 15 * 60 * 1000, delayAfter = 50, delayMs = 100 } = options;

  return slowDown({
    windowMs,
    delayAfter,
    delayMs,
    keyGenerator: (req) => req.user?.id || req.ip,
    onLimitReached: (req) => {
      logger.warn('Slow down triggered', {
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        url: req.url,
      });
    },
  });
};

// Request logging for security analysis
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log request details
  const requestLog = {
    ip: req.ip,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
  };

  // Track response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    // Log security-relevant responses
    if (res.statusCode >= 400) {
      logger.warn('Security-relevant response', {
        ...requestLog,
        statusCode: res.statusCode,
        duration,
        responseSize: data ? data.length : 0,
      });

      // Store in database for analysis
      db.query(
        `INSERT INTO api_logs (user_id, ip_address, method, url, status_code, duration_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          req.user?.id || null,
          req.ip,
          req.method,
          req.url,
          res.statusCode,
          duration,
        ]
      ).catch(error => {
        logger.error('Failed to log API request:', error);
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

// Validate file uploads
export const validateFileUpload = (allowedTypes: string[], maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next();
    }

    const file = req.file;

    // Check file size
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: `ファイルサイズが大きすぎます。最大 ${Math.floor(maxSize / 1024 / 1024)}MB まで`,
      });
    }

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: '許可されていないファイル形式です',
      });
    }

    // Check for potentially dangerous file names
    const dangerousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.php$/i,
      /\.jsp$/i,
      /\.asp$/i,
      /\.js$/i,
      /\.html$/i,
      /\.htm$/i,
    ];

    if (dangerousPatterns.some(pattern => pattern.test(file.originalname))) {
      logger.warn('Dangerous file upload attempt', {
        ip: req.ip,
        userId: req.user?.id,
        filename: file.originalname,
        mimetype: file.mimetype,
      });

      return res.status(400).json({
        success: false,
        error: '危険なファイル形式が検出されました',
      });
    }

    next();
  };
};

// IP whitelist/blacklist
export const ipFilter = (whitelist: string[] = [], blacklist: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip;

    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(clientIp)) {
      logger.warn('Blocked IP access attempt', {
        ip: clientIp,
        userAgent: req.get('User-Agent'),
        url: req.url,
      });

      return res.status(403).json({
        success: false,
        error: 'アクセスが拒否されました',
      });
    }

    // Check whitelist if configured
    if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
      logger.warn('Non-whitelisted IP access attempt', {
        ip: clientIp,
        userAgent: req.get('User-Agent'),
        url: req.url,
      });

      return res.status(403).json({
        success: false,
        error: 'アクセスが許可されていません',
      });
    }

    next();
  };
};

export default {
  sanitizeInput,
  validateSqlParams,
  setSecurityHeaders,
  createAdaptiveRateLimit,
  createSlowDown,
  securityLogger,
  validateFileUpload,
  ipFilter,
};