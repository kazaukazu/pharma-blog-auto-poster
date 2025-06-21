import request from 'supertest';
import app from '../index';
import { db } from '../config/database';
import { createTestUser, createTestSite } from './setup';

describe('Claude API', () => {
  let authToken: string;
  let userId: string;
  let siteId: string;
  let claudeRequestId: string;

  beforeAll(async () => {
    // Create test user and site
    const user = await createTestUser({
      email: 'claude-test@example.com',
    });
    userId = user.id;

    // Register and login
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Claude Test User',
        email: 'claude-test@example.com',
        password: 'password123',
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'claude-test@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.data.token;

    // Create test site
    const siteResponse = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Site for Claude',
        url: 'https://test-claude.com',
        username: 'admin',
        password: 'wp_password',
        region: '大阪府大阪市',
        pharmacy_name: 'テストクロード薬局',
        pharmacy_features: 'AI記事生成対応薬局',
      });

    siteId = siteResponse.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM claude_requests WHERE site_id = $1', [siteId]);
    await db.query('DELETE FROM posts WHERE site_id = $1', [siteId]);
    await db.query('DELETE FROM wordpress_sites WHERE id = $1', [siteId]);
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  describe('POST /api/claude/:siteId/generate', () => {
    it('should create Claude article generation request', async () => {
      const requestData = {
        request_data: {
          site_info: {
            region: '大阪府大阪市',
            pharmacy_name: 'テストクロード薬局',
            pharmacy_features: 'AI記事生成対応薬局',
          },
          article_config: {
            topic: '花粉症薬の種類と使い分け',
            tone: 'friendly',
            target_length: 2000,
            keywords: ['花粉症薬', 'アレルギー', '抗ヒスタミン薬'],
            exclude_keywords: ['副作用'],
          },
          template: {
            structure: '導入→症状説明→薬の種類→使い分け→地域情報→まとめ',
            seo_focus: true,
          },
        },
        create_post: true,
      };

      const response = await request(app)
        .post(`/api/claude/${siteId}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.site_id).toBe(siteId);

      claudeRequestId = response.body.data.id;
    });

    it('should reject generation request with invalid data', async () => {
      const invalidRequestData = {
        request_data: {
          article_config: {
            // Missing required topic
            tone: 'friendly',
            target_length: 2000,
          },
        },
        create_post: true,
      };

      const response = await request(app)
        .post(`/api/claude/${siteId}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequestData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject generation for non-existent site', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const requestData = {
        request_data: {
          article_config: {
            topic: 'Test Topic',
            tone: 'friendly',
            target_length: 1000,
            keywords: ['test'],
          },
        },
        create_post: false,
      };

      const response = await request(app)
        .post(`/api/claude/${fakeId}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/claude/:siteId/requests', () => {
    it('should get Claude requests for a site', async () => {
      const response = await request(app)
        .get(`/api/claude/${siteId}/requests`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.requests)).toBe(true);
      expect(response.body.data.requests.length).toBeGreaterThan(0);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/claude/${siteId}/requests?page=1&limit=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
    });
  });

  describe('GET /api/claude/:siteId/requests/:id', () => {
    it('should get specific Claude request details', async () => {
      const response = await request(app)
        .get(`/api/claude/${siteId}/requests/${claudeRequestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(claudeRequestId);
      expect(response.body.data.status).toBeDefined();
    });

    it('should reject access to non-existent request', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/claude/${siteId}/requests/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/claude/:siteId/requests/:id/retry', () => {
    it('should handle retry request', async () => {
      // First, update the request status to failed to enable retry
      await db.query(
        'UPDATE claude_requests SET status = $1 WHERE id = $2',
        ['failed', claudeRequestId]
      );

      const response = await request(app)
        .post(`/api/claude/${siteId}/requests/${claudeRequestId}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject retry of non-failed request', async () => {
      // Update status to completed
      await db.query(
        'UPDATE claude_requests SET status = $1 WHERE id = $2',
        ['completed', claudeRequestId]
      );

      const response = await request(app)
        .post(`/api/claude/${siteId}/requests/${claudeRequestId}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/claude/:siteId/stats', () => {
    it('should get Claude statistics for site', async () => {
      const response = await request(app)
        .get(`/api/claude/${siteId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.completed).toBeDefined();
      expect(response.body.data.failed).toBeDefined();
      expect(response.body.data.processing).toBeDefined();
    });
  });

  describe('DELETE /api/claude/:siteId/requests/:id', () => {
    it('should delete Claude request', async () => {
      const response = await request(app)
        .delete(`/api/claude/${siteId}/requests/${claudeRequestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify request is deleted
      const getResponse = await request(app)
        .get(`/api/claude/${siteId}/requests/${claudeRequestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });
  });

  describe('Article Generation Validation', () => {
    it('should validate topic requirements', async () => {
      const requestData = {
        request_data: {
          site_info: {
            region: '東京都新宿区',
            pharmacy_name: 'テスト薬局',
          },
          article_config: {
            topic: '', // Empty topic
            tone: 'professional',
            target_length: 1500,
            keywords: ['薬'],
          },
        },
        create_post: false,
      };

      const response = await request(app)
        .post(`/api/claude/${siteId}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate target length requirements', async () => {
      const requestData = {
        request_data: {
          site_info: {
            region: '京都府京都市',
            pharmacy_name: 'テスト薬局',
          },
          article_config: {
            topic: '薬の保管方法',
            tone: 'neutral',
            target_length: 100, // Too short
            keywords: ['薬', '保管'],
          },
        },
        create_post: false,
      };

      const response = await request(app)
        .post(`/api/claude/${siteId}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate keywords requirements', async () => {
      const requestData = {
        request_data: {
          site_info: {
            region: '福岡県福岡市',
            pharmacy_name: 'テスト薬局',
          },
          article_config: {
            topic: '健康管理のポイント',
            tone: 'friendly',
            target_length: 2000,
            keywords: [], // Empty keywords
          },
        },
        create_post: false,
      };

      const response = await request(app)
        .post(`/api/claude/${siteId}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Pharmacy-specific Content', () => {
    it('should generate request with pharmacy context', async () => {
      const requestData = {
        request_data: {
          site_info: {
            region: '神奈川県横浜市',
            pharmacy_name: '横浜中央薬局',
            pharmacy_features: 'かかりつけ薬剤師制度対応、在宅医療支援',
          },
          article_config: {
            topic: 'かかりつけ薬剤師制度のメリット',
            tone: 'professional',
            target_length: 1800,
            keywords: ['かかりつけ薬剤師', '薬歴管理', '服薬指導'],
            exclude_keywords: ['費用', '料金'],
          },
          template: {
            structure: '制度概要→メリット→当薬局の取り組み→地域との連携→まとめ',
            seo_focus: true,
          },
        },
        create_post: true,
      };

      const response = await request(app)
        .post(`/api/claude/${siteId}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending');

      // Verify request data was stored correctly
      const request = await db.query(
        'SELECT request_data FROM claude_requests WHERE id = $1',
        [response.body.data.id]
      );

      const storedData = request.rows[0].request_data;
      expect(storedData.site_info.pharmacy_name).toBe('横浜中央薬局');
      expect(storedData.article_config.topic).toBe('かかりつけ薬剤師制度のメリット');
      expect(storedData.template.seo_focus).toBe(true);
    });
  });
});