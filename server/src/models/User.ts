import pool from '../config/database';
import bcrypt from 'bcryptjs';
import { User } from '../../../shared/types';

export class UserModel {
  static async create(email: string, password: string, name: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const query = `
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, created_at, updated_at
    `;
    
    const values = [email, hashedPassword, name];
    const result = await pool.query(query, values);
    
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    const query = `
      SELECT id, email, password_hash, name, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, name, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    return result.rows[0] || null;
  }

  static async update(id: string, updates: Partial<Pick<User, 'name' | 'email'>>): Promise<User | null> {
    const fields = [];
    const values = [];
    let valueIndex = 1;

    if (updates.name) {
      fields.push(`name = $${valueIndex++}`);
      values.push(updates.name);
    }

    if (updates.email) {
      fields.push(`email = $${valueIndex++}`);
      values.push(updates.email);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING id, email, name, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    
    return result.rows[0] || null;
  }

  static async updatePassword(id: string, newPassword: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const query = `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
    `;
    
    const result = await pool.query(query, [hashedPassword, id]);
    
    return result.rowCount > 0;
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    return result.rowCount > 0;
  }

  static async exists(email: string): Promise<boolean> {
    const query = 'SELECT 1 FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    return result.rows.length > 0;
  }
}