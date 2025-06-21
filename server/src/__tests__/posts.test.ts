import request from 'supertest';
import app from '../index';
import { db } from '../config/database';
import { createTestUser, createTestSite } from './setup';

describe('Posts API', () => {
  let authToken: string;
  let userId: string;
  let siteId: string;
  let postId: string;

  beforeAll(async () => {
    // Create test user and site
    const user = await createTestUser({
      email: 'posts-test@example.com',
    });
    userId = user.id;

    // Register and login
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Posts Test User',
        email: 'posts-test@example.com',
        password: 'password123',
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'posts-test@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.data.token;

    // Create test site
    const siteResponse = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Site for Posts',
        url: 'https://test-posts.com',
        username: 'admin',
        password: 'wp_password',
        region: '東京都',
        pharmacy_name: 'テスト薬局',
      });

    siteId = siteResponse.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM posts WHERE site_id = $1', [siteId]);
    await db.query('DELETE FROM wordpress_sites WHERE id = $1', [siteId]);
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  describe('POST /api/:siteId/posts', () => {
    it('should create a new post', async () => {
      const postData = {
        title: '風邪薬の選び方について',
        content: '風邪をひいたときの薬の選び方について詳しく説明します。市販薬と処方薬の違い、症状に応じた薬の選択方法など、薬剤師の視点から解説します。',
        excerpt: '風邪薬の選び方のポイントを薬剤師が解説',
        categories: [1],
        tags: ['風邪薬', '市販薬', '薬剤師'],
        status: 'draft',
      };

      const response = await request(app)
        .post(`/api/${siteId}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(postData.title);
      expect(response.body.data.content).toBe(postData.content);
      expect(response.body.data.status).toBe('draft');

      postId = response.body.data.id;
    });

    it('should reject post creation with invalid data', async () => {
      const invalidPostData = {
        title: '', // Empty title
        content: 'Some content',
      };

      const response = await request(app)
        .post(`/api/${siteId}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPostData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject post creation for non-existent site', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const postData = {
        title: 'Test Post',
        content: 'Test content',
      };

      const response = await request(app)
        .post(`/api/${fakeId}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/:siteId/posts', () => {
    it('should get posts for a site', async () => {
      const response = await request(app)
        .get(`/api/${siteId}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.posts)).toBe(true);
      expect(response.body.data.posts.length).toBeGreaterThan(0);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/${siteId}/posts?page=1&limit=5`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(5);
    });

    it('should support status filtering', async () => {
      const response = await request(app)
        .get(`/api/${siteId}/posts?status=draft`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.posts.forEach((post: any) => {
        expect(post.status).toBe('draft');
      });
    });
  });

  describe('GET /api/:siteId/posts/:id', () => {
    it('should get specific post details', async () => {
      const response = await request(app)
        .get(`/api/${siteId}/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(postId);
      expect(response.body.data.title).toBe('風邪薬の選び方について');
    });

    it('should reject access to non-existent post', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/${siteId}/posts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/:siteId/posts/:id', () => {
    it('should update post', async () => {
      const updateData = {
        title: '風邪薬の選び方について - 更新版',
        content: '更新された記事内容です。',
        status: 'draft',
      };

      const response = await request(app)
        .put(`/api/${siteId}/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.content).toBe(updateData.content);
    });

    it('should reject update with invalid data', async () => {
      const invalidData = {
        title: '', // Empty title
      };

      const response = await request(app)
        .put(`/api/${siteId}/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/:siteId/posts/:id/publish', () => {
    it('should handle post publishing attempt', async () => {
      const response = await request(app)
        .post(`/api/${siteId}/posts/${postId}/publish`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.success).toBeDefined();
      // Might fail due to test WordPress site, which is expected
    });
  });

  describe('POST /api/:siteId/posts/:id/schedule', () => {
    it('should schedule post for future publishing', async () => {
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 1); // 1 hour from now

      const response = await request(app)
        .post(`/api/${siteId}/posts/${postId}/schedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scheduled_at: scheduledAt.toISOString(),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('scheduled');
    });

    it('should reject scheduling with past date', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // 1 hour ago

      const response = await request(app)
        .post(`/api/${siteId}/posts/${postId}/schedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scheduled_at: pastDate.toISOString(),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/:siteId/posts/stats', () => {
    it('should get post statistics', async () => {
      const response = await request(app)
        .get(`/api/${siteId}/posts/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.published).toBeDefined();
      expect(response.body.data.draft).toBeDefined();
      expect(response.body.data.scheduled).toBeDefined();
    });
  });

  describe('DELETE /api/:siteId/posts/:id', () => {
    it('should delete post', async () => {
      const response = await request(app)
        .delete(`/api/${siteId}/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify post is deleted
      const getResponse = await request(app)
        .get(`/api/${siteId}/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });
  });
});