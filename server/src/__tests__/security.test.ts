import request from 'supertest';
import app from '../index';
import { db } from '../config/database';
import { 
  sanitizeInput,
  validateSqlParams,
  logSecurityEvent,
  checkSuspiciousActivity,
  getIPReputation
} from '../middleware/security';
import securityMonitor from '../utils/securityMonitor';

describe('Security', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create test user for security tests
    const userResult = await db.query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ($1, $2, $3) RETURNING id`,
      ['Security Test User', 'security-test@example.com', 'hashed_password']
    );
    testUserId = userResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM security_events WHERE user_id = $1', [testUserId]);
    await db.query('DELETE FROM api_logs WHERE user_id = $1', [testUserId]);
    await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts', async () => {
      const maliciousData = {
        name: '<script>alert("XSS")</script>Test Name',
        email: 'test@example.com<iframe src="evil.com"></iframe>',
        description: 'javascript:alert("XSS")',
      };

      // Test registration endpoint with malicious data
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...maliciousData,
          password: 'password123',
        });

      // Should not contain script tags or javascript: protocols
      if (response.body.data?.user) {
        expect(response.body.data.user.name).not.toContain('<script>');
        expect(response.body.data.user.name).not.toContain('</script>');
        expect(response.body.data.user.email).not.toContain('<iframe>');
        expect(response.body.data.user.email).not.toContain('javascript:');
      }
    });

    it('should detect SQL injection attempts', async () => {
      const sqlInjectionData = {
        email: "admin@example.com'; DROP TABLE users; --",
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(sqlInjectionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('不正な入力');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting after multiple requests', async () => {
      const requests = [];
      
      // Make multiple requests rapidly
      for (let i = 0; i < 50; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'nonexistent@example.com',
              password: 'wrongpassword',
            })
        );
      }

      const responses = await Promise.allSettled(requests);
      
      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events', async () => {
      await securityMonitor.logSecurityEvent({
        eventType: 'test_security_event',
        severity: 'medium',
        userId: testUserId,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        details: { test: true },
      });

      // Verify event was logged
      const result = await db.query(
        'SELECT * FROM security_events WHERE user_id = $1 AND event_type = $2',
        [testUserId, 'test_security_event']
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].severity).toBe('medium');
    });

    it('should detect suspicious activity', async () => {
      // Create multiple failed login events
      for (let i = 0; i < 6; i++) {
        await securityMonitor.logSecurityEvent({
          eventType: 'failed_login',
          severity: 'medium',
          userId: testUserId,
          ipAddress: '192.168.1.100',
          userAgent: 'Test Agent',
        });
      }

      const { isSuspicious, reasons } = await securityMonitor.checkSuspiciousActivity(
        testUserId,
        '192.168.1.100'
      );

      expect(isSuspicious).toBe(true);
      expect(reasons).toContain('Multiple failed login attempts');
    });
  });

  describe('IP Reputation', () => {
    it('should calculate IP reputation based on behavior', async () => {
      const testIP = '10.0.0.1';

      // Log some bad behavior
      await securityMonitor.logSecurityEvent({
        eventType: 'failed_login',
        severity: 'medium',
        ipAddress: testIP,
        userAgent: 'Test Agent',
      });

      // Add some API logs with errors
      await db.query(
        `INSERT INTO api_logs (ip_address, method, url, status_code, duration_ms, created_at)
         VALUES ($1, 'POST', '/api/auth/login', 401, 100, NOW())`,
        [testIP]
      );

      const reputation = await securityMonitor.getIPReputation(testIP);

      expect(reputation.score).toBeLessThan(100);
      expect(reputation.level).toBeDefined();
      expect(['excellent', 'good', 'neutral', 'poor', 'bad']).toContain(reputation.level);
    });
  });

  describe('Brute Force Detection', () => {
    it('should detect brute force attacks', async () => {
      const attackIP = '172.16.0.1';

      // Simulate brute force attack
      for (let i = 0; i < 12; i++) {
        await securityMonitor.logSecurityEvent({
          eventType: 'failed_login',
          severity: 'medium',
          ipAddress: attackIP,
          userAgent: 'Attack Bot',
        });
      }

      const isBruteForce = await securityMonitor.detectBruteForceAttack(attackIP);
      expect(isBruteForce).toBe(true);
    });
  });

  describe('Security Headers', () => {
    it('should set proper security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    });
  });

  describe('Authentication Security', () => {
    it('should log failed authentication attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);

      // Check if security event was logged
      const events = await db.query(
        `SELECT * FROM security_events 
         WHERE event_type = 'failed_login' 
         AND created_at > NOW() - INTERVAL '1 minute'`
      );

      expect(events.rows.length).toBeGreaterThan(0);
    });

    it('should detect invalid token attempts', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(403);

      expect(response.body.success).toBe(false);

      // Check if security event was logged
      const events = await db.query(
        `SELECT * FROM security_events 
         WHERE event_type = 'auth_invalid_token' 
         AND created_at > NOW() - INTERVAL '1 minute'`
      );

      expect(events.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Data Protection', () => {
    it('should not expose sensitive information in error responses', async () => {
      const response = await request(app)
        .get('/api/sites/invalid-uuid-format')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      // Error should not contain database details or internal paths
      expect(response.body.error).not.toContain('Database');
      expect(response.body.error).not.toContain('/var/');
      expect(response.body.error).not.toContain('SELECT');
      expect(response.body.error).not.toContain('postgres');
    });
  });
});