import pool from '../config/database';
import { WordPressSite } from '../../../shared/types';
import { EncryptionService } from '../utils/encryption';

export class WordPressSiteModel {
  static async create(data: {
    user_id: string;
    name: string;
    url: string;
    username: string;
    password: string;
    region: string;
    pharmacy_name: string;
    pharmacy_features?: string;
    category_id?: number;
  }): Promise<WordPressSite> {
    const encryptedCredentials = EncryptionService.encryptCredentials(data.username, data.password);
    
    const query = `
      INSERT INTO wordpress_sites (
        user_id, name, url, encrypted_credentials, region, 
        pharmacy_name, pharmacy_features, category_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, name, url, region, pharmacy_name, 
                pharmacy_features, category_id, is_active, 
                connection_status, last_connection_check, created_at, updated_at
    `;
    
    const values = [
      data.user_id,
      data.name,
      data.url,
      encryptedCredentials,
      data.region,
      data.pharmacy_name,
      data.pharmacy_features || null,
      data.category_id || null,
    ];
    
    const result = await pool.query(query, values);
    
    return result.rows[0];
  }

  static async findByUserId(userId: string): Promise<WordPressSite[]> {
    const query = `
      SELECT id, user_id, name, url, region, pharmacy_name, 
             pharmacy_features, category_id, is_active, 
             connection_status, last_connection_check, created_at, updated_at
      FROM wordpress_sites
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    return result.rows;
  }

  static async findById(id: string, userId: string): Promise<WordPressSite | null> {
    const query = `
      SELECT id, user_id, name, url, region, pharmacy_name, 
             pharmacy_features, category_id, is_active, 
             connection_status, last_connection_check, created_at, updated_at
      FROM wordpress_sites
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await pool.query(query, [id, userId]);
    
    return result.rows[0] || null;
  }

  static async findByIdWithCredentials(id: string, userId: string): Promise<(WordPressSite & { credentials: { username: string; password: string } }) | null> {
    const query = `
      SELECT id, user_id, name, url, encrypted_credentials, region, 
             pharmacy_name, pharmacy_features, category_id, is_active, 
             connection_status, last_connection_check, created_at, updated_at
      FROM wordpress_sites
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await pool.query(query, [id, userId]);
    
    if (!result.rows[0]) return null;
    
    const site = result.rows[0];
    const credentials = EncryptionService.decryptCredentials(site.encrypted_credentials);
    
    return {
      ...site,
      credentials,
      encrypted_credentials: undefined,
    };
  }

  static async update(id: string, userId: string, data: {
    name?: string;
    url?: string;
    username?: string;
    password?: string;
    region?: string;
    pharmacy_name?: string;
    pharmacy_features?: string;
    category_id?: number;
    is_active?: boolean;
  }): Promise<WordPressSite | null> {
    const fields = [];
    const values = [];
    let valueIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${valueIndex++}`);
      values.push(data.name);
    }

    if (data.url !== undefined) {
      fields.push(`url = $${valueIndex++}`);
      values.push(data.url);
    }

    if (data.username !== undefined && data.password !== undefined) {
      const encryptedCredentials = EncryptionService.encryptCredentials(data.username, data.password);
      fields.push(`encrypted_credentials = $${valueIndex++}`);
      values.push(encryptedCredentials);
    }

    if (data.region !== undefined) {
      fields.push(`region = $${valueIndex++}`);
      values.push(data.region);
    }

    if (data.pharmacy_name !== undefined) {
      fields.push(`pharmacy_name = $${valueIndex++}`);
      values.push(data.pharmacy_name);
    }

    if (data.pharmacy_features !== undefined) {
      fields.push(`pharmacy_features = $${valueIndex++}`);
      values.push(data.pharmacy_features);
    }

    if (data.category_id !== undefined) {
      fields.push(`category_id = $${valueIndex++}`);
      values.push(data.category_id);
    }

    if (data.is_active !== undefined) {
      fields.push(`is_active = $${valueIndex++}`);
      values.push(data.is_active);
    }

    if (fields.length === 0) {
      return this.findById(id, userId);
    }

    values.push(id, userId);

    const query = `
      UPDATE wordpress_sites
      SET ${fields.join(', ')}
      WHERE id = $${valueIndex++} AND user_id = $${valueIndex}
      RETURNING id, user_id, name, url, region, pharmacy_name, 
                pharmacy_features, category_id, is_active, 
                connection_status, last_connection_check, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    
    return result.rows[0] || null;
  }

  static async updateConnectionStatus(id: string, status: 'connected' | 'error' | 'unknown'): Promise<void> {
    const query = `
      UPDATE wordpress_sites
      SET connection_status = $1, last_connection_check = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    await pool.query(query, [status, id]);
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM wordpress_sites WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    
    return result.rowCount > 0;
  }

  static async getActiveScheduledSites(): Promise<WordPressSite[]> {
    const query = `
      SELECT DISTINCT ws.id, ws.user_id, ws.name, ws.url, ws.region, 
             ws.pharmacy_name, ws.pharmacy_features, ws.category_id, 
             ws.is_active, ws.connection_status, ws.last_connection_check, 
             ws.created_at, ws.updated_at
      FROM wordpress_sites ws
      INNER JOIN posting_schedules ps ON ws.id = ps.site_id
      WHERE ws.is_active = true 
        AND ps.is_active = true
        AND ws.connection_status = 'connected'
    `;
    
    const result = await pool.query(query);
    
    return result.rows;
  }
}