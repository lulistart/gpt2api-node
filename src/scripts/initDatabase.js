import bcrypt from 'bcrypt';
import db, { initDatabase } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

// 初始化数据库
initDatabase();

// 创建默认管理员账户
const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';

try {
  // 检查是否已存在管理员
  const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(defaultUsername);
  
  if (!existingUser) {
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(
      defaultUsername,
      hashedPassword
    );
    
    console.log('✓ 默认管理员账户已创建');
    console.log(`  用户名: ${defaultUsername}`);
    console.log(`  密码: ${defaultPassword}`);
    console.log('  请登录后立即修改密码！');
  } else {
    console.log('✓ 管理员账户已存在');
  }
  
  console.log('\n数据库初始化完成！');
  process.exit(0);
} catch (error) {
  console.error('❌ 初始化失败:', error);
  process.exit(1);
}
