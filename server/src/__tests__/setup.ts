import { db } from '../config/database';
import logger from '../utils/logger';

// Test database setup
export const setupTestDatabase = async () => {
  try {
    // Ensure test tables exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS test_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS test_sites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        username VARCHAR(255) NOT NULL,
        password_encrypted TEXT NOT NULL,
        region VARCHAR(100),
        pharmacy_name VARCHAR(255),
        pharmacy_features TEXT,
        is_active BOOLEAN DEFAULT true,
        connection_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    logger.info('Test database setup completed');
  } catch (error) {
    logger.error('Test database setup failed:', error);
    throw error;
  }
};

// Clean up test data
export const cleanupTestDatabase = async () => {
  try {
    await db.query('DELETE FROM test_sites');
    await db.query('DELETE FROM test_users');
    await db.query('DELETE FROM security_events WHERE user_id IN (SELECT id FROM users WHERE email LIKE %test%)');
    await db.query('DELETE FROM api_logs WHERE user_id IN (SELECT id FROM users WHERE email LIKE %test%)');
    
    logger.info('Test database cleanup completed');
  } catch (error) {
    logger.error('Test database cleanup failed:', error);
  }
};

// Mock external services for testing
export const mockExternalServices = () => {
  // Mock WordPress API calls
  jest.mock('../services/wordpressService', () => ({
    testConnection: jest.fn().mockResolvedValue({ success: true }),
    createPost: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com/post/123' }),
    updatePost: jest.fn().mockResolvedValue({ id: 123, url: 'https://example.com/post/123' }),
    deletePost: jest.fn().mockResolvedValue({ success: true }),
    getCategories: jest.fn().mockResolvedValue([
      { id: 1, name: 'Health' },
      { id: 2, name: 'Medicine' },
    ]),
  }));

  // Mock Claude API calls
  jest.mock('../services/claudeService', () => ({
    generateArticle: jest.fn().mockResolvedValue({
      title: 'Generated Article Title',
      content: 'Generated article content...',
      excerpt: 'Article excerpt',
    }),
  }));

  // Mock email service
  jest.mock('../services/emailService', () => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
  }));
};

// Test utilities
export const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz', // bcrypt hash for 'password123'
  };

  const userData = { ...defaultUser, ...overrides };
  
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash) 
     VALUES ($1, $2, $3) RETURNING *`,
    [userData.name, userData.email, userData.password_hash]
  );

  return result.rows[0];
};

export const createTestSite = async (userId: string, overrides = {}) => {
  const defaultSite = {
    name: 'Test Pharmacy Site',
    url: 'https://test-pharmacy.com',
    username: 'admin',
    password_encrypted: 'encrypted_password',
    region: '東京都渋谷区',
    pharmacy_name: 'テスト薬局',
    pharmacy_features: 'かかりつけ薬剤師在籍',
  };

  const siteData = { ...defaultSite, ...overrides };
  
  const result = await db.query(
    `INSERT INTO wordpress_sites (user_id, name, url, username, password_encrypted, region, pharmacy_name, pharmacy_features) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [userId, siteData.name, siteData.url, siteData.username, siteData.password_encrypted, 
     siteData.region, siteData.pharmacy_name, siteData.pharmacy_features]
  );

  return result.rows[0];
};

export const createTestPost = async (siteId: string, overrides = {}) => {
  const defaultPost = {
    title: 'Test Article',
    content: 'Test article content...',
    excerpt: 'Test excerpt',
    status: 'draft',
    wordpress_id: null,
  };

  const postData = { ...defaultPost, ...overrides };
  
  const result = await db.query(
    `INSERT INTO posts (site_id, title, content, excerpt, status, wordpress_id) 
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [siteId, postData.title, postData.content, postData.excerpt, postData.status, postData.wordpress_id]
  );

  return result.rows[0];
};

// Test data generators
export const generateTestUserData = (overrides = {}) => ({
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  password: 'password123',
  ...overrides,
});

export const generateTestSiteData = (overrides = {}) => ({
  name: 'Test Pharmacy Site',
  url: 'https://test-pharmacy.com',
  username: 'admin',
  password: 'wp_password',
  region: '東京都渋谷区',
  pharmacy_name: 'テスト薬局',
  pharmacy_features: 'かかりつけ薬剤師在籍、24時間対応',
  ...overrides,
});

export const generateTestPostData = (overrides = {}) => ({
  title: 'Test Article Title',
  content: 'Test article content with detailed information...',
  excerpt: 'Brief excerpt of the article',
  categories: [1, 2],
  tags: ['health', 'medicine'],
  ...overrides,
});

export default {
  setupTestDatabase,
  cleanupTestDatabase,
  mockExternalServices,
  createTestUser,
  createTestSite,
  createTestPost,
  generateTestUserData,
  generateTestSiteData,
  generateTestPostData,
};