import request from 'supertest';
import app from '../index';
import { db } from '../config/database';

describe('Sites API', () => {
  let authToken: string;
  let userId: string;
  let siteId: string;

  beforeAll(async () => {
    // Create test user
    const userResult = await db.query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ($1, $2, $3) RETURNING id`,
      ['Test User', 'sites-test@example.com', 'hashed_password']
    );
    userId = userResult.rows[0].id;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sites-test@example.com',
        password: 'password123',
      });

    if (loginResponse.status === 404) {
      // User doesn't exist, register first
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'sites-test@example.com',
          password: 'password123',
        });

      const loginResponse2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sites-test@example.com',
          password: 'password123',
        });

      authToken = loginResponse2.body.data.token;
    } else {
      authToken = loginResponse.body.data.token;
    }
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM wordpress_sites WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM users WHERE email = $1', ['sites-test@example.com']);
  });

  describe('POST /api/sites', () => {
    it('should create a new WordPress site', async () => {
      const siteData = {
        name: 'Test Pharmacy Site',
        url: 'https://test-pharmacy.com',
        username: 'admin',
        password: 'wp_password',
        region: '東京都渋谷区',
        pharmacy_name: 'テスト薬局',
        pharmacy_features: 'かかりつけ薬剤師在籍、24時間対応',
      };

      const response = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send(siteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(siteData.name);
      expect(response.body.data.url).toBe(siteData.url);
      expect(response.body.data.region).toBe(siteData.region);

      siteId = response.body.data.id;
    });

    it('should reject site creation with invalid URL', async () => {
      const siteData = {
        name: 'Invalid Site',
        url: 'not-a-valid-url',
        username: 'admin',
        password: 'wp_password',
        region: '東京都',
        pharmacy_name: 'テスト薬局',
      };

      const response = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send(siteData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject site creation without authentication', async () => {
      const siteData = {
        name: 'Unauthorized Site',
        url: 'https://unauthorized.com',
        username: 'admin',
        password: 'wp_password',
        region: '東京都',
        pharmacy_name: 'テスト薬局',
      };

      const response = await request(app)
        .post('/api/sites')
        .send(siteData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sites', () => {
    it('should get user sites', async () => {
      const response = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toBe('Test Pharmacy Site');
    });

    it('should reject unauthorized access', async () => {
      const response = await request(app)
        .get('/api/sites')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sites/:id', () => {
    it('should get specific site details', async () => {
      const response = await request(app)
        .get(`/api/sites/${siteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(siteId);
      expect(response.body.data.name).toBe('Test Pharmacy Site');
    });

    it('should reject access to non-existent site', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/sites/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/sites/:id', () => {
    it('should update site details', async () => {
      const updateData = {
        name: 'Updated Pharmacy Site',
        pharmacy_features: '更新された特徴',
      };

      const response = await request(app)
        .put(`/api/sites/${siteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.pharmacy_features).toBe(updateData.pharmacy_features);
    });

    it('should reject update with invalid data', async () => {
      const updateData = {
        url: 'invalid-url',
      };

      const response = await request(app)
        .put(`/api/sites/${siteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/sites/:id/test-connection', () => {
    it('should handle connection test (might fail due to test URL)', async () => {
      const response = await request(app)
        .post(`/api/sites/${siteId}/test-connection`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.success).toBeDefined();
      // Connection might fail with test URL, which is expected
    });
  });

  describe('DELETE /api/sites/:id', () => {
    it('should delete site', async () => {
      const response = await request(app)
        .delete(`/api/sites/${siteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify site is deleted
      const getResponse = await request(app)
        .get(`/api/sites/${siteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });
  });
});