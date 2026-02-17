import express from 'express';
import fs from 'fs/promises';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateAdmin);

// 配置文件路径
const CONFIG_FILE = '.env';

// 获取负载均衡策略
router.get('/load-balance-strategy', async (req, res) => {
  try {
    const strategy = process.env.LOAD_BALANCE_STRATEGY || 'round-robin';
    res.json({ strategy });
  } catch (error) {
    console.error('获取策略失败:', error);
    res.status(500).json({ error: '获取策略失败' });
  }
});

// 更新负载均衡策略
router.post('/load-balance-strategy', async (req, res) => {
  try {
    const { strategy } = req.body;
    
    if (!['round-robin', 'random', 'least-used'].includes(strategy)) {
      return res.status(400).json({ error: '无效的策略' });
    }
    
    // 读取 .env 文件
    let envContent = '';
    try {
      envContent = await fs.readFile(CONFIG_FILE, 'utf-8');
    } catch (err) {
      // 文件不存在，创建新的
      envContent = '';
    }
    
    // 更新或添加 LOAD_BALANCE_STRATEGY
    const lines = envContent.split('\n');
    let found = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('LOAD_BALANCE_STRATEGY=')) {
        lines[i] = `LOAD_BALANCE_STRATEGY=${strategy}`;
        found = true;
        break;
      }
    }
    
    if (!found) {
      lines.push(`LOAD_BALANCE_STRATEGY=${strategy}`);
    }
    
    // 写回文件
    await fs.writeFile(CONFIG_FILE, lines.join('\n'), 'utf-8');
    
    // 更新环境变量
    process.env.LOAD_BALANCE_STRATEGY = strategy;
    
    res.json({ 
      success: true, 
      message: '策略已更新，将在下次请求时生效',
      strategy 
    });
  } catch (error) {
    console.error('更新策略失败:', error);
    res.status(500).json({ error: '更新策略失败' });
  }
});

export default router;
