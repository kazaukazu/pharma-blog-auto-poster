import pool from '../config/database';
import { PostingSchedule } from '../../../shared/types';

export class PostingScheduleModel {
  static async create(data: {
    site_id: string;
    frequency: string;
    time_slot: string;
    specific_time?: string;
    timezone?: string;
    skip_holidays?: boolean;
    max_monthly_posts?: number;
    cron_expression?: string;
  }): Promise<PostingSchedule> {
    const query = `
      INSERT INTO posting_schedules (
        site_id, frequency, time_slot, specific_time, timezone,
        skip_holidays, max_monthly_posts, cron_expression
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, site_id, frequency, time_slot, specific_time, timezone,
                skip_holidays, max_monthly_posts, cron_expression, is_active,
                created_at, updated_at
    `;
    
    const values = [
      data.site_id,
      data.frequency,
      data.time_slot,
      data.specific_time || null,
      data.timezone || 'Asia/Tokyo',
      data.skip_holidays !== undefined ? data.skip_holidays : true,
      data.max_monthly_posts || 100,
      data.cron_expression || null,
    ];
    
    const result = await pool.query(query, values);
    
    return result.rows[0];
  }

  static async findBySiteId(siteId: string): Promise<PostingSchedule[]> {
    const query = `
      SELECT id, site_id, frequency, time_slot, specific_time, timezone,
             skip_holidays, max_monthly_posts, cron_expression, is_active,
             created_at, updated_at
      FROM posting_schedules
      WHERE site_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [siteId]);
    
    return result.rows;
  }

  static async findById(id: string, siteId: string): Promise<PostingSchedule | null> {
    const query = `
      SELECT id, site_id, frequency, time_slot, specific_time, timezone,
             skip_holidays, max_monthly_posts, cron_expression, is_active,
             created_at, updated_at
      FROM posting_schedules
      WHERE id = $1 AND site_id = $2
    `;
    
    const result = await pool.query(query, [id, siteId]);
    
    return result.rows[0] || null;
  }

  static async update(id: string, siteId: string, data: {
    frequency?: string;
    time_slot?: string;
    specific_time?: string;
    timezone?: string;
    skip_holidays?: boolean;
    max_monthly_posts?: number;
    cron_expression?: string;
    is_active?: boolean;
  }): Promise<PostingSchedule | null> {
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
      UPDATE posting_schedules
      SET ${fields.join(', ')}
      WHERE id = $${valueIndex++} AND site_id = $${valueIndex}
      RETURNING id, site_id, frequency, time_slot, specific_time, timezone,
                skip_holidays, max_monthly_posts, cron_expression, is_active,
                created_at, updated_at
    `;

    const result = await pool.query(query, values);
    
    return result.rows[0] || null;
  }

  static async delete(id: string, siteId: string): Promise<boolean> {
    const query = 'DELETE FROM posting_schedules WHERE id = $1 AND site_id = $2';
    const result = await pool.query(query, [id, siteId]);
    
    return result.rowCount > 0;
  }

  static async getActiveSchedules(): Promise<PostingSchedule[]> {
    const query = `
      SELECT ps.id, ps.site_id, ps.frequency, ps.time_slot, ps.specific_time, 
             ps.timezone, ps.skip_holidays, ps.max_monthly_posts, ps.cron_expression, 
             ps.is_active, ps.created_at, ps.updated_at
      FROM posting_schedules ps
      INNER JOIN wordpress_sites ws ON ps.site_id = ws.id
      WHERE ps.is_active = true 
        AND ws.is_active = true
        AND ws.connection_status = 'connected'
      ORDER BY ps.created_at ASC
    `;
    
    const result = await pool.query(query);
    
    return result.rows;
  }

  static async getSchedulesBySite(siteId: string): Promise<PostingSchedule | null> {
    const query = `
      SELECT id, site_id, frequency, time_slot, specific_time, timezone,
             skip_holidays, max_monthly_posts, cron_expression, is_active,
             created_at, updated_at
      FROM posting_schedules
      WHERE site_id = $1 AND is_active = true
      LIMIT 1
    `;
    
    const result = await pool.query(query, [siteId]);
    
    return result.rows[0] || null;
  }

  static async checkMonthlyPostLimit(siteId: string): Promise<{
    currentCount: number;
    limit: number;
    canPost: boolean;
  }> {
    // Get current month's post count
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const countQuery = `
      SELECT COUNT(*) as count
      FROM posts
      WHERE site_id = $1 
        AND status = 'published'
        AND published_at >= $2 
        AND published_at <= $3
    `;

    const countResult = await pool.query(countQuery, [siteId, startOfMonth, endOfMonth]);
    const currentCount = parseInt(countResult.rows[0].count);

    // Get schedule limit
    const scheduleQuery = `
      SELECT max_monthly_posts
      FROM posting_schedules
      WHERE site_id = $1 AND is_active = true
      LIMIT 1
    `;

    const scheduleResult = await pool.query(scheduleQuery, [siteId]);
    const limit = scheduleResult.rows[0]?.max_monthly_posts || 100;

    return {
      currentCount,
      limit,
      canPost: currentCount < limit,
    };
  }

  static async getUpcomingSchedules(limit: number = 10): Promise<Array<PostingSchedule & { 
    next_execution?: Date;
    site_name?: string;
  }>> {
    const query = `
      SELECT ps.id, ps.site_id, ps.frequency, ps.time_slot, ps.specific_time, 
             ps.timezone, ps.skip_holidays, ps.max_monthly_posts, ps.cron_expression, 
             ps.is_active, ps.created_at, ps.updated_at,
             ws.name as site_name
      FROM posting_schedules ps
      INNER JOIN wordpress_sites ws ON ps.site_id = ws.id
      WHERE ps.is_active = true 
        AND ws.is_active = true
        AND ws.connection_status = 'connected'
      ORDER BY ps.created_at ASC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    
    // In a real implementation, you would calculate next_execution based on cron expression
    return result.rows.map(row => ({
      ...row,
      next_execution: new Date(Date.now() + 24 * 60 * 60 * 1000), // Placeholder
    }));
  }
}