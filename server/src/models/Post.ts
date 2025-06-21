import pool from '../config/database';
import { Post } from '../../../shared/types';

export class PostModel {
  static async create(data: {
    site_id: string;
    title: string;
    content?: string;
    topic_id?: string;
    template_id?: string;
    status?: string;
    scheduled_at?: Date;
    meta_description?: string;
    tags?: string[];
  }): Promise<Post> {
    const query = `
      INSERT INTO posts (
        site_id, title, content, topic_id, template_id, 
        status, scheduled_at, meta_description, tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, site_id, wordpress_post_id, title, content, 
                topic_id, template_id, status, scheduled_at, published_at,
                error_message, claude_request_id, meta_description, tags,
                estimated_reading_time, created_at, updated_at
    `;
    
    const values = [
      data.site_id,
      data.title,
      data.content || null,
      data.topic_id || null,
      data.template_id || null,
      data.status || 'draft',
      data.scheduled_at || null,
      data.meta_description || null,
      data.tags || [],
    ];
    
    const result = await pool.query(query, values);
    
    return result.rows[0];
  }

  static async findBySiteId(siteId: string, page: number = 1, limit: number = 20): Promise<{
    posts: Post[];
    total: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM posts WHERE site_id = $1';
    const countResult = await pool.query(countQuery, [siteId]);
    const total = parseInt(countResult.rows[0].count);
    
    // Get posts
    const query = `
      SELECT p.id, p.site_id, p.wordpress_post_id, p.title, p.content, 
             p.topic_id, p.template_id, p.status, p.scheduled_at, p.published_at,
             p.error_message, p.claude_request_id, p.meta_description, p.tags,
             p.estimated_reading_time, p.created_at, p.updated_at,
             t.title as topic_title, t.category as topic_category
      FROM posts p
      LEFT JOIN topics t ON p.topic_id = t.id
      WHERE p.site_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [siteId, limit, offset]);
    
    return {
      posts: result.rows,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async findById(id: string, siteId: string): Promise<Post | null> {
    const query = `
      SELECT p.id, p.site_id, p.wordpress_post_id, p.title, p.content, 
             p.topic_id, p.template_id, p.status, p.scheduled_at, p.published_at,
             p.error_message, p.claude_request_id, p.meta_description, p.tags,
             p.estimated_reading_time, p.created_at, p.updated_at,
             t.title as topic_title, t.category as topic_category
      FROM posts p
      LEFT JOIN topics t ON p.topic_id = t.id
      WHERE p.id = $1 AND p.site_id = $2
    `;
    
    const result = await pool.query(query, [id, siteId]);
    
    return result.rows[0] || null;
  }

  static async update(id: string, siteId: string, data: {
    title?: string;
    content?: string;
    topic_id?: string;
    template_id?: string;
    status?: string;
    scheduled_at?: Date;
    published_at?: Date;
    wordpress_post_id?: number;
    error_message?: string;
    claude_request_id?: string;
    meta_description?: string;
    tags?: string[];
    estimated_reading_time?: number;
  }): Promise<Post | null> {
    const fields = [];
    const values = [];
    let valueIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${valueIndex++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.findById(id, siteId);
    }

    values.push(id, siteId);

    const query = `
      UPDATE posts
      SET ${fields.join(', ')}
      WHERE id = $${valueIndex++} AND site_id = $${valueIndex}
      RETURNING id, site_id, wordpress_post_id, title, content, 
                topic_id, template_id, status, scheduled_at, published_at,
                error_message, claude_request_id, meta_description, tags,
                estimated_reading_time, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    
    return result.rows[0] || null;
  }

  static async delete(id: string, siteId: string): Promise<boolean> {
    const query = 'DELETE FROM posts WHERE id = $1 AND site_id = $2';
    const result = await pool.query(query, [id, siteId]);
    
    return result.rowCount > 0;
  }

  static async getScheduledPosts(limit: number = 100): Promise<Post[]> {
    const query = `
      SELECT p.id, p.site_id, p.wordpress_post_id, p.title, p.content, 
             p.topic_id, p.template_id, p.status, p.scheduled_at, p.published_at,
             p.error_message, p.claude_request_id, p.meta_description, p.tags,
             p.estimated_reading_time, p.created_at, p.updated_at
      FROM posts p
      INNER JOIN wordpress_sites ws ON p.site_id = ws.id
      WHERE p.status = 'scheduled' 
        AND p.scheduled_at <= CURRENT_TIMESTAMP
        AND ws.is_active = true
        AND ws.connection_status = 'connected'
      ORDER BY p.scheduled_at ASC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    
    return result.rows;
  }

  static async getFailedPosts(limit: number = 50): Promise<Post[]> {
    const query = `
      SELECT p.id, p.site_id, p.wordpress_post_id, p.title, p.content, 
             p.topic_id, p.template_id, p.status, p.scheduled_at, p.published_at,
             p.error_message, p.claude_request_id, p.meta_description, p.tags,
             p.estimated_reading_time, p.created_at, p.updated_at
      FROM posts p
      INNER JOIN wordpress_sites ws ON p.site_id = ws.id
      WHERE p.status = 'failed'
        AND ws.is_active = true
      ORDER BY p.updated_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    
    return result.rows;
  }

  static async getPostsByStatus(siteId: string, status: string): Promise<Post[]> {
    const query = `
      SELECT id, site_id, wordpress_post_id, title, content, 
             topic_id, template_id, status, scheduled_at, published_at,
             error_message, claude_request_id, meta_description, tags,
             estimated_reading_time, created_at, updated_at
      FROM posts
      WHERE site_id = $1 AND status = $2
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [siteId, status]);
    
    return result.rows;
  }

  static async getPostStats(siteId: string): Promise<{
    total: number;
    published: number;
    scheduled: number;
    draft: number;
    failed: number;
    processing: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing
      FROM posts
      WHERE site_id = $1
    `;
    
    const result = await pool.query(query, [siteId]);
    
    return {
      total: parseInt(result.rows[0].total),
      published: parseInt(result.rows[0].published),
      scheduled: parseInt(result.rows[0].scheduled),
      draft: parseInt(result.rows[0].draft),
      failed: parseInt(result.rows[0].failed),
      processing: parseInt(result.rows[0].processing),
    };
  }
}