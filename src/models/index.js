import db from '../config/database.js';
import bcrypt from 'bcrypt';

export class User {
  static findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  }

  static findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  static async create(username, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(
      username,
      hashedPassword
    );
    return result.lastInsertRowid;
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      hashedPassword,
      id
    );
  }

  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }
}

export class ApiKey {
  static getAll() {
    return db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all();
  }

  static findByKey(key) {
    return db.prepare('SELECT * FROM api_keys WHERE key = ? AND is_active = 1').get(key);
  }

  static create(key, name) {
    const result = db.prepare('INSERT INTO api_keys (key, name) VALUES (?, ?)').run(key, name);
    return result.lastInsertRowid;
  }

  static delete(id) {
    db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  }

  static updateUsage(id) {
    db.prepare('UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  }

  static toggleActive(id, isActive) {
    db.prepare('UPDATE api_keys SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
  }
}

export class Token {
  static getAll() {
    return db.prepare('SELECT * FROM tokens ORDER BY created_at DESC').all();
  }

  static getActive() {
    return db.prepare('SELECT * FROM tokens WHERE is_active = 1').all();
  }

  static findById(id) {
    return db.prepare('SELECT * FROM tokens WHERE id = ?').get(id);
  }

  static create(data) {
    const result = db.prepare(`
      INSERT INTO tokens (name, email, account_id, access_token, refresh_token, id_token, expired_at, last_refresh_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name || null,
      data.email || null,
      data.account_id || null,
      data.access_token,
      data.refresh_token,
      data.id_token || null,
      data.expired_at || null,
      data.last_refresh_at || new Date().toISOString()
    );
    return result.lastInsertRowid;
  }

  static update(id, data) {
    db.prepare(`
      UPDATE tokens
      SET access_token = ?, refresh_token = ?, id_token = ?, expired_at = ?, last_refresh_at = ?
      WHERE id = ?
    `).run(
      data.access_token,
      data.refresh_token,
      data.id_token || null,
      data.expired_at || null,
      new Date().toISOString(),
      id
    );
  }

  static delete(id) {
    // 先删除相关的 api_logs 记录
    db.prepare('DELETE FROM api_logs WHERE token_id = ?').run(id);
    // 再删除 token
    db.prepare('DELETE FROM tokens WHERE id = ?').run(id);
  }

  static toggleActive(id, isActive) {
    db.prepare('UPDATE tokens SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
  }

  static updateUsage(id, success = true) {
    if (success) {
      db.prepare(`
        UPDATE tokens
        SET total_requests = total_requests + 1,
            success_requests = success_requests + 1,
            last_used_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);
    } else {
      db.prepare(`
        UPDATE tokens
        SET total_requests = total_requests + 1,
            failed_requests = failed_requests + 1,
            last_used_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);
    }
  }

  static updateQuota(id, quota) {
    db.prepare(`
      UPDATE tokens
      SET quota_total = ?,
          quota_used = ?,
          quota_remaining = ?,
          last_quota_check = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      quota.total || 0,
      quota.used || 0,
      quota.remaining || 0,
      id
    );
  }
}

export class ApiLog {
  static create(data) {
    db.prepare(`
      INSERT INTO api_logs (api_key_id, token_id, model, endpoint, status_code, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.api_key_id || null,
      data.token_id || null,
      data.model || null,
      data.endpoint || null,
      data.status_code || null,
      data.error_message || null
    );
  }

  static getRecent(limit = 100) {
    return db.prepare('SELECT * FROM api_logs ORDER BY created_at DESC LIMIT ?').all(limit);
  }

  static getStats() {
    return {
      total: db.prepare('SELECT COUNT(*) as count FROM api_logs').get().count,
      success: db.prepare('SELECT COUNT(*) as count FROM api_logs WHERE status_code >= 200 AND status_code < 300').get().count,
      error: db.prepare('SELECT COUNT(*) as count FROM api_logs WHERE status_code >= 400').get().count
    };
  }
}
