import request from 'supertest';
import app from '../index';
import { db } from '../config/database';
import { createTestUser, createTestSite } from './setup';

describe('Schedules API', () => {
  let authToken: string;
  let userId: string;
  let siteId: string;
  let scheduleId: string;

  beforeAll(async () => {
    // Create test user and site
    const user = await createTestUser({
      email: 'schedules-test@example.com',
    });
    userId = user.id;

    // Register and login
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Schedules Test User',
        email: 'schedules-test@example.com',
        password: 'password123',
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'schedules-test@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.data.token;

    // Create test site
    const siteResponse = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Site for Schedules',
        url: 'https://test-schedules.com',
        username: 'admin',
        password: 'wp_password',
        region: '愛知県名古屋市',
        pharmacy_name: 'テストスケジュール薬局',
      });

    siteId = siteResponse.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM schedules WHERE site_id = $1', [siteId]);
    await db.query('DELETE FROM wordpress_sites WHERE id = $1', [siteId]);
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  describe('POST /api/:siteId/schedules', () => {
    it('should create a new schedule', async () => {
      const scheduleData = {
        frequency: 'weekly_2',
        time_slot: 'morning',
        timezone: 'Asia/Tokyo',
        skip_holidays: true,
        max_monthly_posts: 50,
      };

      const response = await request(app)
        .post(`/api/${siteId}/schedules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.frequency).toBe(scheduleData.frequency);
      expect(response.body.data.time_slot).toBe(scheduleData.time_slot);
      expect(response.body.data.is_active).toBe(true);

      scheduleId = response.body.data.id;
    });

    it('should create schedule with specific time', async () => {
      const scheduleData = {
        frequency: 'daily',
        time_slot: 'specific',
        specific_time: '14:30',
        timezone: 'Asia/Tokyo',
        skip_holidays: false,
        max_monthly_posts: 100,
      };

      const response = await request(app)
        .post(`/api/${siteId}/schedules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.time_slot).toBe('specific');
      expect(response.body.data.specific_time).toBe('14:30');
    });

    it('should create schedule with custom cron expression', async () => {
      const scheduleData = {
        frequency: 'custom',
        time_slot: 'morning',
        cron_expression: '0 9 * * 1,3,5', // Mon, Wed, Fri at 9:00
        timezone: 'Asia/Tokyo',
        skip_holidays: true,
        max_monthly_posts: 75,
      };

      const response = await request(app)
        .post(`/api/${siteId}/schedules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.frequency).toBe('custom');
      expect(response.body.data.cron_expression).toBe('0 9 * * 1,3,5');
    });

    it('should reject schedule creation with invalid data', async () => {
      const invalidScheduleData = {
        frequency: 'invalid_frequency',
        time_slot: 'morning',
        max_monthly_posts: 1000, // Too high
      };

      const response = await request(app)
        .post(`/api/${siteId}/schedules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidScheduleData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject schedule without specific time when required', async () => {
      const scheduleData = {
        frequency: 'weekly_1',
        time_slot: 'specific',
        // Missing specific_time
        timezone: 'Asia/Tokyo',
        max_monthly_posts: 50,
      };

      const response = await request(app)
        .post(`/api/${siteId}/schedules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject schedule without cron expression when custom', async () => {
      const scheduleData = {
        frequency: 'custom',
        time_slot: 'evening',
        // Missing cron_expression
        timezone: 'Asia/Tokyo',
        max_monthly_posts: 30,
      };

      const response = await request(app)
        .post(`/api/${siteId}/schedules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/:siteId/schedules', () => {
    it('should get schedules for a site', async () => {
      const response = await request(app)
        .get(`/api/${siteId}/schedules`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include next execution times', async () => {
      const response = await request(app)
        .get(`/api/${siteId}/schedules`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const schedule = response.body.data.find((s: any) => s.id === scheduleId);
      expect(schedule).toBeDefined();
      expect(schedule.next_executions).toBeDefined();
    });
  });

  describe('GET /api/:siteId/schedules/:id', () => {
    it('should get specific schedule details', async () => {
      const response = await request(app)
        .get(`/api/${siteId}/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(scheduleId);
      expect(response.body.data.frequency).toBe('weekly_2');
    });

    it('should reject access to non-existent schedule', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/${siteId}/schedules/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/:siteId/schedules/:id', () => {
    it('should update schedule', async () => {
      const updateData = {
        frequency: 'weekly_3',
        time_slot: 'afternoon',
        max_monthly_posts: 60,
      };

      const response = await request(app)
        .put(`/api/${siteId}/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.frequency).toBe(updateData.frequency);
      expect(response.body.data.time_slot).toBe(updateData.time_slot);
      expect(response.body.data.max_monthly_posts).toBe(updateData.max_monthly_posts);
    });

    it('should reject update with invalid data', async () => {
      const invalidData = {
        frequency: 'invalid',
        max_monthly_posts: -10,
      };

      const response = await request(app)
        .put(`/api/${siteId}/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/:siteId/schedules/:id/toggle', () => {
    it('should toggle schedule active status', async () => {
      // Disable schedule
      const disableResponse = await request(app)
        .post(`/api/${siteId}/schedules/${scheduleId}/toggle`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ is_active: false })
        .expect(200);

      expect(disableResponse.body.success).toBe(true);
      expect(disableResponse.body.data.is_active).toBe(false);

      // Enable schedule
      const enableResponse = await request(app)
        .post(`/api/${siteId}/schedules/${scheduleId}/toggle`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ is_active: true })
        .expect(200);

      expect(enableResponse.body.success).toBe(true);
      expect(enableResponse.body.data.is_active).toBe(true);
    });
  });

  describe('POST /api/test-schedule', () => {
    it('should test valid cron expression', async () => {
      const response = await request(app)
        .post('/api/test-schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cron_expression: '0 9 * * 1-5', // Weekdays at 9:00
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.next_executions).toBeDefined();
    });

    it('should reject invalid cron expression', async () => {
      const response = await request(app)
        .post('/api/test-schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cron_expression: 'invalid cron', // Invalid format
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/:siteId/monthly-limit', () => {
    it('should get monthly posting limit information', async () => {
      const response = await request(app)
        .get(`/api/${siteId}/monthly-limit`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.limit).toBeDefined();
      expect(response.body.data.currentCount).toBeDefined();
      expect(response.body.data.canPost).toBeDefined();
    });
  });

  describe('GET /api/upcoming', () => {
    it('should get upcoming scheduled posts', async () => {
      const response = await request(app)
        .get('/api/upcoming')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Schedule Validation', () => {
    it('should validate timezone', async () => {
      const scheduleData = {
        frequency: 'daily',
        time_slot: 'morning',
        timezone: 'Invalid/Timezone',
        max_monthly_posts: 30,
      };

      const response = await request(app)
        .post(`/api/${siteId}/schedules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate max monthly posts range', async () => {
      const scheduleData = {
        frequency: 'daily',
        time_slot: 'morning',
        timezone: 'Asia/Tokyo',
        max_monthly_posts: 1000, // Too high
      };

      const response = await request(app)
        .post(`/api/${siteId}/schedules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/:siteId/schedules/:id', () => {
    it('should delete schedule', async () => {
      const response = await request(app)
        .delete(`/api/${siteId}/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify schedule is deleted
      const getResponse = await request(app)
        .get(`/api/${siteId}/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });
  });
});