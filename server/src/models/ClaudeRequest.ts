import pool from '../config/database';
import { ClaudeRequest, ClaudeRequestData, ClaudeResponseData } from '../../../shared/types';

export class ClaudeRequestModel {
  static async create(data: {
    site_id: string;
    post_id?: string;
    request_data: ClaudeRequestData;
  }): Promise<ClaudeRequest> {
    const query = `
      INSERT INTO claude_requests (site_id, post_id, request_data, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, site_id, post_id, request_data, response_data, 
                status, error_message, created_at, processed_at
    `;
    
    const values = [
      data.site_id,
      data.post_id || null,
      JSON.stringify(data.request_data),
      'pending',
    ];
    
    const result = await pool.query(query, values);
    
    return {
      ...result.rows[0],
      request_data: result.rows[0].request_data,
      response_data: result.rows[0].response_data,
    };
  }

  static async findById(id: string): Promise<ClaudeRequest | null> {
    const query = `
      SELECT id, site_id, post_id, request_data, response_data, 
             status, error_message, created_at, processed_at
      FROM claude_requests
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (!result.rows[0]) return null;
    
    return {
      ...result.rows[0],
      request_data: result.rows[0].request_data,
      response_data: result.rows[0].response_data,
    };
  }

  static async findBySiteId(siteId: string, page: number = 1, limit: number = 20): Promise<{
    requests: ClaudeRequest[];
    total: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM claude_requests WHERE site_id = $1';
    const countResult = await pool.query(countQuery, [siteId]);
    const total = parseInt(countResult.rows[0].count);
    
    // Get requests
    const query = `
      SELECT id, site_id, post_id, request_data, response_data, 
             status, error_message, created_at, processed_at
      FROM claude_requests
      WHERE site_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [siteId, limit, offset]);
    
    const requests = result.rows.map(row => ({
      ...row,
      request_data: row.request_data,
      response_data: row.response_data,
    }));
    
    return {
      requests,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async update(id: string, data: {
    response_data?: ClaudeResponseData;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    error_message?: string;
    post_id?: string;
  }): Promise<ClaudeRequest | null> {
    const fields = [];
    const values = [];
    let valueIndex = 1;

    if (data.response_data !== undefined) {
      fields.push(`response_data = $${valueIndex++}`);
      values.push(JSON.stringify(data.response_data));
    }

    if (data.status !== undefined) {
      fields.push(`status = $${valueIndex++}`);
      values.push(data.status);
      
      // Update processed_at when status changes to completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        fields.push(`processed_at = CURRENT_TIMESTAMP`);
      }
    }

    if (data.error_message !== undefined) {
      fields.push(`error_message = $${valueIndex++}`);
      values.push(data.error_message);
    }

    if (data.post_id !== undefined) {
      fields.push(`post_id = $${valueIndex++}`);
      values.push(data.post_id);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE claude_requests
      SET ${fields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING id, site_id, post_id, request_data, response_data, 
                status, error_message, created_at, processed_at
    `;

    const result = await pool.query(query, values);
    
    if (!result.rows[0]) return null;
    
    return {
      ...result.rows[0],
      request_data: result.rows[0].request_data,
      response_data: result.rows[0].response_data,
    };
  }

  static async getPendingRequests(limit: number = 10): Promise<ClaudeRequest[]> {
    const query = `
      SELECT id, site_id, post_id, request_data, response_data, 
             status, error_message, created_at, processed_at
      FROM claude_requests
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    
    return result.rows.map(row => ({
      ...row,
      request_data: row.request_data,
      response_data: row.response_data,
    }));
  }

  static async getByStatus(status: string, limit: number = 50): Promise<ClaudeRequest[]> {
    const query = `
      SELECT id, site_id, post_id, request_data, response_data, 
             status, error_message, created_at, processed_at
      FROM claude_requests
      WHERE status = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [status, limit]);
    
    return result.rows.map(row => ({
      ...row,
      request_data: row.request_data,
      response_data: row.response_data,
    }));
  }

  static async getRequestStats(siteId?: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM claude_requests
    `;
    
    const values = [];
    if (siteId) {
      query += ' WHERE site_id = $1';
      values.push(siteId);
    }
    
    const result = await pool.query(query, values);
    
    return {
      total: parseInt(result.rows[0].total),
      pending: parseInt(result.rows[0].pending),
      processing: parseInt(result.rows[0].processing),
      completed: parseInt(result.rows[0].completed),
      failed: parseInt(result.rows[0].failed),
    };
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM claude_requests WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    return result.rowCount > 0;
  }
}