import request from 'supertest';
import app from '../index';
import { db } from '../config/database';
import { createTestUser, createTestSite, createTestPost } from './setup';

describe('Analytics API', () => {
  let authToken: string;
  let userId: string;
  let siteId: string;

  beforeAll(async () => {
    // Create test user and site
    const user = await createTestUser({
      email: 'analytics-test@example.com',
    });
    userId = user.id;

    // Register and login
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Analytics Test User',
        email: 'analytics-test@example.com',
        password: 'password123',
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'analytics-test@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.data.token;

    // Create test site
    const siteResponse = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Site for Analytics',
        url: 'https://test-analytics.com',
        username: 'admin',
        password: 'wp_password',
        region: '北海道札幌市',
        pharmacy_name: 'テストアナリティクス薬局',
      });

    siteId = siteResponse.body.data.id;

    // Create test data for analytics
    await createTestAnalyticsData();
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM claude_requests WHERE site_id = $1', [siteId]);
    await db.query('DELETE FROM posts WHERE site_id = $1', [siteId]);
    await db.query('DELETE FROM schedules WHERE site_id = $1', [siteId]);
    await db.query('DELETE FROM wordpress_sites WHERE id = $1', [siteId]);
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  const createTestAnalyticsData = async () => {
    // Create test posts
    for (let i = 0; i < 10; i++) {
      await db.query(
        `INSERT INTO posts (site_id, title, content, excerpt, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${i} days')`,
        [
          siteId,
          `テスト記事 ${i + 1}`,
          `テスト記事の内容 ${i + 1}`,
          `テスト記事の要約 ${i + 1}`,
          i % 3 === 0 ? 'published' : i % 3 === 1 ? 'draft' : 'failed',
        ]
      );
    }

    // Create test Claude requests
    for (let i = 0; i < 8; i++) {
      await db.query(
        `INSERT INTO claude_requests (site_id, request_data, status, created_at, processed_at)
         VALUES ($1, $2, $3, NOW() - INTERVAL '${i} days', NOW() - INTERVAL '${i} days' + INTERVAL '30 seconds')`,
        [
          siteId,
          JSON.stringify({
            article_config: {
              topic: `テストトピック ${i + 1}`,
              tone: 'friendly',
              target_length: 2000,
              keywords: [`キーワード${i + 1}`],
            },
          }),
          i % 2 === 0 ? 'completed' : 'failed',
        ]
      );
    }

    // Create test schedule
    await db.query(
      `INSERT INTO schedules (site_id, frequency, time_slot, timezone, is_active, max_monthly_posts)
       VALUES ($1, 'weekly_2', 'morning', 'Asia/Tokyo', true, 50)`,
      [siteId]
    );
  };

  describe('GET /api/sites/:siteId/analytics', () => {
    it('should get analytics data for default period (30d)', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('30d');
      expect(response.body.data.startDate).toBeDefined();
      expect(response.body.data.endDate).toBeDefined();
      expect(Array.isArray(response.body.data.posts)).toBe(true);
      expect(Array.isArray(response.body.data.claude)).toBe(true);
      expect(Array.isArray(response.body.data.topTopics)).toBe(true);
      expect(Array.isArray(response.body.data.schedulePerformance)).toBe(true);
    });

    it('should get analytics data for 7 days period', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}/analytics?period=7d`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('7d');
    });

    it('should get analytics data for 90 days period', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}/analytics?period=90d`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('90d');
    });

    it('should get analytics data for 1 year period', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}/analytics?period=1y`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('1y');
    });

    it('should support timezone parameter', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}/analytics?timezone=Asia/Tokyo`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject access to non-existent site', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/sites/${fakeId}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sites/:siteId/stats', () => {
    it('should get site statistics summary', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_posts).toBeDefined();
      expect(response.body.data.published_posts).toBeDefined();
      expect(response.body.data.draft_posts).toBeDefined();
      expect(response.body.data.failed_posts).toBeDefined();
      expect(response.body.data.total_claude_requests).toBeDefined();
      expect(response.body.data.completed_claude_requests).toBeDefined();
      expect(response.body.data.failed_claude_requests).toBeDefined();
      expect(response.body.data.total_schedules).toBeDefined();
      expect(response.body.data.active_schedules).toBeDefined();
      expect(response.body.data.posts_7d).toBeDefined();
      expect(response.body.data.claude_requests_7d).toBeDefined();
      expect(response.body.data.posts_this_month).toBeDefined();
      expect(response.body.data.claude_requests_this_month).toBeDefined();
      expect(response.body.data.avg_processing_time).toBeDefined();

      // Verify data types
      expect(typeof response.body.data.total_posts).toBe('number');
      expect(typeof response.body.data.published_posts).toBe('number');
      expect(typeof response.body.data.avg_processing_time).toBe('number');
    });

    it('should return correct counts based on test data', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.total_posts).toBeGreaterThan(0);
      expect(response.body.data.total_claude_requests).toBeGreaterThan(0);
      expect(response.body.data.total_schedules).toBeGreaterThan(0);
    });
  });

  describe('GET /api/analytics/dashboard', () => {
    it('should get dashboard analytics for user', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.monthlyActivity).toBeDefined();
      expect(response.body.data.topSites).toBeDefined();

      // Check overview structure
      const overview = response.body.data.overview;
      expect(overview.site_count).toBeDefined();
      expect(overview.total_posts).toBeDefined();
      expect(overview.published_posts).toBeDefined();
      expect(overview.claude_requests).toBeDefined();
      expect(overview.posts_7d).toBeDefined();
      expect(overview.claude_requests_7d).toBeDefined();

      // Check arrays
      expect(Array.isArray(response.body.data.monthlyActivity)).toBe(true);
      expect(Array.isArray(response.body.data.topSites)).toBe(true);
    });

    it('should include monthly activity data', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const monthlyActivity = response.body.data.monthlyActivity;
      expect(Array.isArray(monthlyActivity)).toBe(true);

      // If there's data, check structure
      if (monthlyActivity.length > 0) {
        const activity = monthlyActivity[0];
        expect(activity.month).toBeDefined();
        expect(activity.posts_count).toBeDefined();
        expect(typeof activity.posts_count).toBe('number');
      }
    });

    it('should include top sites data', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const topSites = response.body.data.topSites;
      expect(Array.isArray(topSites)).toBe(true);

      // Should include our test site
      const testSite = topSites.find((site: any) => site.name === 'Test Site for Analytics');
      expect(testSite).toBeDefined();
      if (testSite) {
        expect(testSite.posts_count).toBeDefined();
        expect(testSite.published_count).toBeDefined();
        expect(typeof testSite.posts_count).toBe('number');
        expect(typeof testSite.published_count).toBe('number');
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Analytics Data Accuracy', () => {
    it('should accurately count posts by status', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { total_posts, published_posts, draft_posts, failed_posts } = response.body.data;

      // Verify total equals sum of status counts
      expect(total_posts).toBe(published_posts + draft_posts + failed_posts);
    });

    it('should accurately count Claude requests by status', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { total_claude_requests, completed_claude_requests, failed_claude_requests } = response.body.data;

      // Verify total equals sum of status counts
      expect(total_claude_requests).toBe(completed_claude_requests + failed_claude_requests);
    });

    it('should calculate processing time correctly', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { avg_processing_time } = response.body.data;

      // Should be a reasonable number (our test data uses 30 seconds)
      expect(avg_processing_time).toBeGreaterThan(0);
      expect(avg_processing_time).toBeLessThan(3600); // Less than 1 hour
    });
  });

  describe('Analytics Filters and Periods', () => {
    it('should filter data by date range correctly', async () => {
      const response7d = await request(app)
        .get(`/api/sites/${siteId}/analytics?period=7d`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response30d = await request(app)
        .get(`/api/sites/${siteId}/analytics?period=30d`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 30d should include more or equal data points than 7d
      expect(response30d.body.data.posts.length).toBeGreaterThanOrEqual(
        response7d.body.data.posts.length
      );
    });

    it('should group data by day correctly', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}/analytics?period=7d`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const posts = response.body.data.posts;
      if (posts.length > 0) {
        posts.forEach((dayData: any) => {
          expect(dayData.date).toBeDefined();
          expect(dayData.posts_count).toBeDefined();
          expect(dayData.published_count).toBeDefined();
          expect(dayData.draft_count).toBeDefined();
          expect(dayData.failed_count).toBeDefined();
          expect(typeof dayData.posts_count).toBe('string'); // From database COUNT
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid period parameter', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}/analytics?period=invalid`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid timezone parameter', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}/analytics?timezone=Invalid/Timezone`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200); // Should use default timezone

      expect(response.body.success).toBe(true);
    });
  });
});