import express from 'express';
import { Token } from '../models/index.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateAdmin);

// 获取所有 Tokens（支持分页）
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const allTokens = Token.getAll();
    const total = allTokens.length;
    const tokens = allTokens.slice(offset, offset + limit);
    
    // 隐藏敏感信息
    const maskedTokens = tokens.map(t => ({
      ...t,
      access_token: t.access_token ? '***' : null,
      refresh_token: t.refresh_token ? '***' : null,
      id_token: t.id_token ? '***' : null
    }));
    
    res.json({
      data: maskedTokens,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取 Tokens 失败:', error);
    res.status(500).json({ error: '获取 Tokens 失败' });
  }
});

// 创建 Token
router.post('/', async (req, res) => {
  try {
    const { name, access_token, refresh_token, id_token, email, account_id, expired_at, expired, last_refresh_at, last_refresh } = req.body;

    // 验证必需字段
    if (!access_token || !refresh_token) {
      return res.status(400).json({ error: 'access_token 和 refresh_token 是必需的' });
    }

    // 创建 Token 记录（支持旧字段名兼容）
    const id = Token.create({
      name: name || '未命名账户',
      email,
      account_id,
      access_token,
      refresh_token,
      id_token,
      expired_at: expired_at || expired || null,
      last_refresh_at: last_refresh_at || last_refresh || null
    });

    res.json({
      success: true,
      id,
      message: 'Token 添加成功'
    });
  } catch (error) {
    console.error('添加 Token 失败:', error);
    res.status(500).json({ error: '添加 Token 失败: ' + error.message });
  }
});

// 批量导入 Tokens
router.post('/import', async (req, res) => {
  try {
    const { tokens } = req.body;

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: '请提供有效的 tokens 数组' });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      try {
        // 验证必需字段
        if (!token.access_token || !token.refresh_token) {
          failedCount++;
          errors.push(`第 ${i + 1} 个 token: 缺少 access_token 或 refresh_token`);
          continue;
        }

        // 创建 Token 记录（支持旧字段名兼容）
        Token.create({
          name: token.name || token.email || token.account_id || `导入账户 ${i + 1}`,
          email: token.email,
          account_id: token.account_id,
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          id_token: token.id_token,
          expired_at: token.expired_at || token.expired || null,
          last_refresh_at: token.last_refresh_at || token.last_refresh || null
        });

        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`第 ${i + 1} 个 token: ${error.message}`);
      }
    }

    res.json({
      success: true,
      total: tokens.length,
      success: successCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `导入完成：成功 ${successCount} 个，失败 ${failedCount} 个`
    });
  } catch (error) {
    console.error('批量导入 Tokens 失败:', error);
    res.status(500).json({ error: '批量导入失败: ' + error.message });
  }
});

// 更新 Token
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    Token.toggleActive(id, is_active);
    res.json({ success: true });
  } catch (error) {
    console.error('更新 Token 失败:', error);
    res.status(500).json({ error: '更新 Token 失败' });
  }
});

// 手动刷新 Token
router.post('/:id/refresh', async (req, res) => {
  try {
    const { id } = req.params;
    const token = Token.findById(id);

    if (!token) {
      return res.status(404).json({ error: 'Token 不存在' });
    }

    // 这里需要调用 tokenManager 的刷新功能
    // 暂时返回提示
    res.json({
      success: false,
      message: 'Token 刷新功能需要集成到 tokenManager'
    });
  } catch (error) {
    console.error('刷新 Token 失败:', error);
    res.status(500).json({ error: '刷新 Token 失败' });
  }
});

// 删除 Token
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    Token.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('删除 Token 失败:', error);
    res.status(500).json({ error: '删除 Token 失败' });
  }
});

// 批量删除 Tokens
router.post('/batch-delete', (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供有效的 ids 数组' });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      
      try {
        Token.delete(id);
        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`ID ${id}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      total: ids.length,
      success: successCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `批量删除完成：成功 ${successCount} 个，失败 ${failedCount} 个`
    });
  } catch (error) {
    console.error('批量删除 Tokens 失败:', error);
    res.status(500).json({ error: '批量删除失败: ' + error.message });
  }
});

// 刷新 Token 额度
router.post('/:id/quota', async (req, res) => {
  try {
    const { id } = req.params;
    const token = Token.findById(id);

    if (!token) {
      return res.status(404).json({ error: 'Token 不存在' });
    }

    // OpenAI Codex API 没有直接的额度查询接口
    // 我们根据以下信息估算额度：
    // 1. 从 ID Token 解析订阅类型（免费/付费）
    // 2. 根据请求统计估算使用情况
    // 3. 根据失败率判断是否接近额度上限
    
    let planType = 'free';  // 默认免费
    let totalQuota = 50000;  // 免费账号默认额度
    
    // 尝试从 id_token 解析订阅信息
    if (token.id_token) {
      try {
        const parts = token.id_token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          const authInfo = payload['https://api.openai.com/auth'];
          if (authInfo && authInfo.chatgpt_plan_type) {
            planType = authInfo.chatgpt_plan_type.toLowerCase();
            // 根据订阅类型设置额度
            if (planType.includes('plus') || planType.includes('pro')) {
              totalQuota = 500000;  // 付费账号更高额度
            } else if (planType.includes('team')) {
              totalQuota = 1000000;
            }
          }
        }
      } catch (e) {
        console.warn('解析 ID Token 失败:', e.message);
      }
    }
    
    // 根据请求统计估算已使用额度
    // 假设每次成功请求消耗约 100 tokens
    const estimatedUsed = (token.success_requests || 0) * 100;
    const remaining = Math.max(0, totalQuota - estimatedUsed);
    
    // 如果失败率很高，可能接近额度上限
    const failureRate = token.total_requests > 0
      ? (token.failed_requests || 0) / token.total_requests
      : 0;
    
    const quota = {
      total: totalQuota,
      used: estimatedUsed,
      remaining: remaining,
      plan_type: planType,
      failure_rate: Math.round(failureRate * 100)
    };

    // 更新数据库
    Token.updateQuota(id, quota);

    res.json({
      success: true,
      quota,
      message: '额度已更新（基于请求统计估算）'
    });
  } catch (error) {
    console.error('刷新额度失败:', error);
    res.status(500).json({ error: '刷新额度失败: ' + error.message });
  }
});

// 批量刷新所有 Token 额度
router.post('/quota/refresh-all', async (req, res) => {
  try {
    const tokens = Token.getAll();
    let successCount = 0;
    let failedCount = 0;
    
    for (const token of tokens) {
      try {
        let planType = 'free';
        let totalQuota = 50000;
        
        // 解析 ID Token 获取订阅类型
        if (token.id_token) {
          try {
            const parts = token.id_token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
              const authInfo = payload['https://api.openai.com/auth'];
              if (authInfo && authInfo.chatgpt_plan_type) {
                planType = authInfo.chatgpt_plan_type.toLowerCase();
                if (planType.includes('plus') || planType.includes('pro')) {
                  totalQuota = 500000;
                } else if (planType.includes('team')) {
                  totalQuota = 1000000;
                }
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
        
        const estimatedUsed = (token.success_requests || 0) * 100;
        const remaining = Math.max(0, totalQuota - estimatedUsed);
        
        const quota = {
          total: totalQuota,
          used: estimatedUsed,
          remaining: remaining
        };
        
        Token.updateQuota(token.id, quota);
        successCount++;
      } catch (error) {
        console.error(`刷新 Token ${token.id} 额度失败:`, error);
        failedCount++;
      }
    }
    
    res.json({
      success: true,
      total: tokens.length,
      success: successCount,
      failed: failedCount,
      message: `批量刷新完成：成功 ${successCount} 个，失败 ${failedCount} 个`
    });
  } catch (error) {
    console.error('批量刷新额度失败:', error);
    res.status(500).json({ error: '批量刷新失败: ' + error.message });
  }
});

export default router;
