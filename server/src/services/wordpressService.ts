import axios, { AxiosResponse } from 'axios';
import { config } from '../config';
import logger from '../utils/logger';
import { WordPressConnectionTest } from '../../../shared/types';

export interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface WordPressPost {
  id?: number;
  title: {
    rendered?: string;
    raw: string;
  };
  content: {
    rendered?: string;
    raw: string;
  };
  status: 'draft' | 'publish' | 'private';
  categories: number[];
  tags?: number[];
  meta?: {
    [key: string]: any;
  };
  featured_media?: number;
  excerpt?: {
    raw: string;
  };
}

export interface WordPressUser {
  id: number;
  username: string;
  name: string;
  email: string;
  capabilities: {
    [key: string]: boolean;
  };
}

export class WordPressService {
  private static async makeRequest(
    url: string,
    username: string,
    password: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<AxiosResponse> {
    const fullUrl = `${url.replace(/\/$/, '')}/wp-json/wp/v2/${endpoint}`;
    
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    try {
      const response = await axios({
        method,
        url: fullUrl,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        data,
        timeout: config.wordpress.timeout,
      });

      return response;
    } catch (error: any) {
      logger.error('WordPress API request failed', {
        url: fullUrl,
        method,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      throw error;
    }
  }

  static async testConnection(
    url: string,
    username: string,
    password: string
  ): Promise<WordPressConnectionTest> {
    try {
      // Test basic connection
      const response = await this.makeRequest(url, username, password, '');
      
      // Get user info to check permissions
      const userResponse = await this.makeRequest(url, username, password, 'users/me');
      const user: WordPressUser = userResponse.data;
      
      // Check if user can publish posts
      const canPublish = user.capabilities.publish_posts || user.capabilities.edit_posts;
      
      // Get categories
      const categoriesResponse = await this.makeRequest(url, username, password, 'categories');
      const categories: WordPressCategory[] = categoriesResponse.data;

      return {
        success: true,
        version: response.headers['x-wp-version'] || 'Unknown',
        user_can_publish: canPublish,
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        })),
      };
    } catch (error: any) {
      let errorMessage = 'Connection failed';
      
      if (error.response) {
        switch (error.response.status) {
          case 401:
            errorMessage = 'Invalid username or password';
            break;
          case 403:
            errorMessage = 'Access denied - insufficient permissions';
            break;
          case 404:
            errorMessage = 'WordPress REST API not found - check URL or enable REST API';
            break;
          case 500:
            errorMessage = 'WordPress server error';
            break;
          default:
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Site not found - check URL';
      } else if (error.code === 'TIMEOUT') {
        errorMessage = 'Connection timeout';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  static async getCategories(
    url: string,
    username: string,
    password: string
  ): Promise<WordPressCategory[]> {
    const response = await this.makeRequest(url, username, password, 'categories?per_page=100');
    return response.data;
  }

  static async createPost(
    url: string,
    username: string,
    password: string,
    post: Omit<WordPressPost, 'id'>
  ): Promise<WordPressPost> {
    const response = await this.makeRequest(url, username, password, 'posts', 'POST', post);
    return response.data;
  }

  static async updatePost(
    url: string,
    username: string,
    password: string,
    postId: number,
    post: Partial<WordPressPost>
  ): Promise<WordPressPost> {
    const response = await this.makeRequest(url, username, password, `posts/${postId}`, 'POST', post);
    return response.data;
  }

  static async deletePost(
    url: string,
    username: string,
    password: string,
    postId: number
  ): Promise<boolean> {
    try {
      await this.makeRequest(url, username, password, `posts/${postId}`, 'DELETE');
      return true;
    } catch (error) {
      logger.error('Failed to delete WordPress post', { postId, error });
      return false;
    }
  }

  static async getPost(
    url: string,
    username: string,
    password: string,
    postId: number
  ): Promise<WordPressPost | null> {
    try {
      const response = await this.makeRequest(url, username, password, `posts/${postId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  static async uploadMedia(
    url: string,
    username: string,
    password: string,
    file: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ id: number; url: string }> {
    const fullUrl = `${url.replace(/\/$/, '')}/wp-json/wp/v2/media`;
    
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    try {
      const response = await axios({
        method: 'POST',
        url: fullUrl,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
        data: file,
        timeout: config.wordpress.timeout,
      });

      return {
        id: response.data.id,
        url: response.data.source_url,
      };
    } catch (error: any) {
      logger.error('WordPress media upload failed', {
        url: fullUrl,
        filename,
        error: error.message,
      });
      throw error;
    }
  }
}