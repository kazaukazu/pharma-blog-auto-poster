import { db } from '../config/database';
import logger from './logger';

export interface SecurityEvent {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  details?: any;
}

// Log security events
export const logSecurityEvent = async (event: SecurityEvent): Promise<void> => {
  try {
    await db.query(
      `INSERT INTO security_events (event_type, severity, user_id, ip_address, user_agent, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        event.eventType,
        event.severity,
        event.userId || null,
        event.ipAddress,
        event.userAgent || null,
        event.details ? JSON.stringify(event.details) : null,
      ]
    );

    logger.warn('Security event logged', event);
  } catch (error) {
    logger.error('Failed to log security event:', error);
  }
};

// Check for suspicious activity patterns
export const checkSuspiciousActivity = async (userId: string, ipAddress: string): Promise<{
  isSuspicious: boolean;
  reasons: string[];
}> => {
  const reasons: string[] = [];
  let isSuspicious = false;

  try {
    // Check for rapid failed login attempts
    const failedLogins = await db.query(
      `SELECT COUNT(*) as count FROM security_events 
       WHERE event_type = 'failed_login' 
       AND (user_id = $1 OR ip_address = $2)
       AND created_at > NOW() - INTERVAL '15 minutes'`,
      [userId, ipAddress]
    );

    if (parseInt(failedLogins.rows[0]?.count || '0', 10) >= 5) {
      isSuspicious = true;
      reasons.push('Multiple failed login attempts');
    }

    // Check for unusual API activity
    const apiActivity = await db.query(
      `SELECT COUNT(*) as count FROM api_logs 
       WHERE (user_id = $1 OR ip_address = $2)
       AND status_code >= 400
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId, ipAddress]
    );

    if (parseInt(apiActivity.rows[0]?.count || '0', 10) >= 20) {
      isSuspicious = true;
      reasons.push('High error rate in API requests');
    }

    // Check for SQL injection attempts
    const sqlInjectionAttempts = await db.query(
      `SELECT COUNT(*) as count FROM security_events 
       WHERE event_type = 'sql_injection_attempt'
       AND (user_id = $1 OR ip_address = $2)
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId, ipAddress]
    );

    if (parseInt(sqlInjectionAttempts.rows[0]?.count || '0', 10) >= 3) {
      isSuspicious = true;
      reasons.push('SQL injection attempts detected');
    }

    // Check for access from multiple IPs for the same user
    if (userId) {
      const uniqueIPs = await db.query(
        `SELECT COUNT(DISTINCT ip_address) as count FROM api_logs 
         WHERE user_id = $1
         AND created_at > NOW() - INTERVAL '1 hour'`,
        [userId]
      );

      if (parseInt(uniqueIPs.rows[0]?.count || '0', 10) >= 5) {
        isSuspicious = true;
        reasons.push('Access from multiple IP addresses');
      }
    }

    return { isSuspicious, reasons };
  } catch (error) {
    logger.error('Error checking suspicious activity:', error);
    return { isSuspicious: false, reasons: [] };
  }
};

// Get security dashboard data
export const getSecurityDashboard = async (limit: number = 100) => {
  try {
    // Recent security events
    const recentEvents = await db.query(
      `SELECT event_type, severity, ip_address, user_agent, details, created_at
       FROM security_events
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    // Failed login attempts by IP
    const failedLoginsByIP = await db.query(
      `SELECT ip_address, COUNT(*) as count
       FROM security_events
       WHERE event_type = 'failed_login'
       AND created_at > NOW() - INTERVAL '24 hours'
       GROUP BY ip_address
       ORDER BY count DESC
       LIMIT 10`
    );

    // API error rates
    const apiErrorRates = await db.query(
      `SELECT 
         DATE_TRUNC('hour', created_at) as hour,
         COUNT(*) as total_requests,
         COUNT(*) FILTER (WHERE status_code >= 400) as error_requests
       FROM api_logs
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY DATE_TRUNC('hour', created_at)
       ORDER BY hour DESC`
    );

    // Top error URLs
    const topErrorUrls = await db.query(
      `SELECT url, COUNT(*) as count
       FROM api_logs
       WHERE status_code >= 400
       AND created_at > NOW() - INTERVAL '24 hours'
       GROUP BY url
       ORDER BY count DESC
       LIMIT 10`
    );

    return {
      recentEvents: recentEvents.rows,
      failedLoginsByIP: failedLoginsByIP.rows,
      apiErrorRates: apiErrorRates.rows,
      topErrorUrls: topErrorUrls.rows,
    };
  } catch (error) {
    logger.error('Error getting security dashboard data:', error);
    throw error;
  }
};

// Clean up old logs (should be run periodically)
export const cleanupOldLogs = async (retentionDays: number = 30): Promise<void> => {
  try {
    // Clean up old API logs
    const apiLogsResult = await db.query(
      `DELETE FROM api_logs WHERE created_at < NOW() - INTERVAL '${retentionDays} days'`
    );

    // Clean up old security events (but keep critical ones longer)
    const securityEventsResult = await db.query(
      `DELETE FROM security_events 
       WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
       AND severity NOT IN ('high', 'critical')`
    );

    // Keep critical events for longer (90 days)
    const criticalEventsResult = await db.query(
      `DELETE FROM security_events 
       WHERE created_at < NOW() - INTERVAL '90 days'
       AND severity IN ('high', 'critical')`
    );

    logger.info('Security logs cleanup completed', {
      apiLogsDeleted: apiLogsResult.rowCount,
      securityEventsDeleted: securityEventsResult.rowCount,
      criticalEventsDeleted: criticalEventsResult.rowCount,
    });
  } catch (error) {
    logger.error('Error cleaning up old logs:', error);
    throw error;
  }
};

// Check for brute force attacks
export const detectBruteForceAttack = async (ipAddress: string, timeWindow: number = 15): Promise<boolean> => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM security_events 
       WHERE event_type IN ('failed_login', 'sql_injection_attempt', 'rate_limit_exceeded')
       AND ip_address = $1
       AND created_at > NOW() - INTERVAL '${timeWindow} minutes'`,
      [ipAddress]
    );

    const count = parseInt(result.rows[0]?.count || '0', 10);
    
    // More than 10 security events in the time window is considered suspicious
    if (count >= 10) {
      await logSecurityEvent({
        eventType: 'brute_force_detected',
        severity: 'high',
        ipAddress,
        details: { eventCount: count, timeWindow },
      });
      
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error detecting brute force attack:', error);
    return false;
  }
};

// Get IP reputation (simple scoring based on past behavior)
export const getIPReputation = async (ipAddress: string): Promise<{
  score: number; // 0-100, where 100 is best reputation
  level: 'excellent' | 'good' | 'neutral' | 'poor' | 'bad';
  details: any;
}> => {
  try {
    let score = 100; // Start with perfect score
    const details: any = {};

    // Check failed logins
    const failedLogins = await db.query(
      `SELECT COUNT(*) as count FROM security_events 
       WHERE event_type = 'failed_login' AND ip_address = $1
       AND created_at > NOW() - INTERVAL '7 days'`,
      [ipAddress]
    );
    details.failedLogins = parseInt(failedLogins.rows[0]?.count || '0', 10);
    score -= Math.min(details.failedLogins * 5, 40); // Max -40 points

    // Check security events
    const securityEvents = await db.query(
      `SELECT COUNT(*) as count FROM security_events 
       WHERE ip_address = $1 AND created_at > NOW() - INTERVAL '7 days'`,
      [ipAddress]
    );
    details.securityEvents = parseInt(securityEvents.rows[0]?.count || '0', 10);
    score -= Math.min(details.securityEvents * 3, 30); // Max -30 points

    // Check API error rate
    const apiStats = await db.query(
      `SELECT 
         COUNT(*) as total_requests,
         COUNT(*) FILTER (WHERE status_code >= 400) as error_requests
       FROM api_logs 
       WHERE ip_address = $1 AND created_at > NOW() - INTERVAL '7 days'`,
      [ipAddress]
    );
    
    const totalRequests = parseInt(apiStats.rows[0]?.total_requests || '0', 10);
    const errorRequests = parseInt(apiStats.rows[0]?.error_requests || '0', 10);
    
    if (totalRequests > 0) {
      const errorRate = (errorRequests / totalRequests) * 100;
      details.errorRate = errorRate;
      score -= Math.min(errorRate * 0.5, 20); // Max -20 points
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);
    details.score = score;

    let level: 'excellent' | 'good' | 'neutral' | 'poor' | 'bad';
    if (score >= 90) level = 'excellent';
    else if (score >= 70) level = 'good';
    else if (score >= 50) level = 'neutral';
    else if (score >= 30) level = 'poor';
    else level = 'bad';

    return { score, level, details };
  } catch (error) {
    logger.error('Error calculating IP reputation:', error);
    return { score: 50, level: 'neutral', details: { error: 'calculation_failed' } };
  }
};

export default {
  logSecurityEvent,
  checkSuspiciousActivity,
  getSecurityDashboard,
  cleanupOldLogs,
  detectBruteForceAttack,
  getIPReputation,
};