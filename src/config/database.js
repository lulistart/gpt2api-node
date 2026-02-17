import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/app.db');

// 确保数据库目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 初始化数据库表
export function initDatabase() {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // API Keys 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME,
      usage_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1
    )
  `);

  // Tokens 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      account_id TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      id_token TEXT,
      expired_at DATETIME,
      last_refresh_at DATETIME,
      total_requests INTEGER DEFAULT 0,
      success_requests INTEGER DEFAULT 0,
      failed_requests INTEGER DEFAULT 0,
      last_used_at DATETIME,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 为已存在的 tokens 表添加统计字段（如果不存在）
  try {
    db.exec(`ALTER TABLE tokens ADD COLUMN total_requests INTEGER DEFAULT 0`);
  } catch (e) {
    // 字段已存在，忽略错误
  }
  try {
    db.exec(`ALTER TABLE tokens ADD COLUMN success_requests INTEGER DEFAULT 0`);
  } catch (e) {
    // 字段已存在，忽略错误
  }
  try {
    db.exec(`ALTER TABLE tokens ADD COLUMN failed_requests INTEGER DEFAULT 0`);
  } catch (e) {
    // 字段已存在，忽略错误
  }
  try {
    db.exec(`ALTER TABLE tokens ADD COLUMN last_used_at DATETIME`);
  } catch (e) {
    // 字段已存在，忽略错误
  }
  try {
    db.exec(`ALTER TABLE tokens ADD COLUMN quota_total INTEGER DEFAULT 0`);
  } catch (e) {
    // 字段已存在，忽略错误
  }
  try {
    db.exec(`ALTER TABLE tokens ADD COLUMN quota_used INTEGER DEFAULT 0`);
  } catch (e) {
    // 字段已存在，忽略错误
  }
  try {
    db.exec(`ALTER TABLE tokens ADD COLUMN quota_remaining INTEGER DEFAULT 0`);
  } catch (e) {
    // 字段已存在，忽略错误
  }
  try {
    db.exec(`ALTER TABLE tokens ADD COLUMN last_quota_check DATETIME`);
  } catch (e) {
    // 字段已存在，忽略错误
  }

  // API 日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key_id INTEGER,
      token_id INTEGER,
      model TEXT,
      endpoint TEXT,
      status_code INTEGER,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (api_key_id) REFERENCES api_keys(id),
      FOREIGN KEY (token_id) REFERENCES tokens(id)
    )
  `);

  console.log('✓ 数据库表初始化完成');
}

export default db;
