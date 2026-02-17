import express from 'express';
import { ApiKey } from '../models/index.js';
import { authenticateAdmin, generateApiKey } from '../middleware/auth.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateAdmin);

// 获取所有 API Keys
router.get('/', (req, res) => {
  try {
    const keys = ApiKey.getAll();
    res.json(keys);
  } catch (error) {
    console.error('获取 API Keys 失败:', error);
    res.status(500).json({ error: '获取 API Keys 失败' });
  }
});

// 创建新的 API Key
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    const key = generateApiKey();
    
    const id = ApiKey.create(key, name || '未命名');
    
    res.json({
      success: true,
      id,
      key, // 只在创建时返回完整的 key
      name,
      message: '请保存此 API Key，之后将无法再次查看完整密钥'
    });
  } catch (error) {
    console.error('创建 API Key 失败:', error);
    res.status(500).json({ error: '创建 API Key 失败' });
  }
});

// 更新 API Key
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    ApiKey.toggleActive(id, is_active);
    res.json({ success: true });
  } catch (error) {
    console.error('更新 API Key 失败:', error);
    res.status(500).json({ error: '更新 API Key 失败' });
  }
});

// 删除 API Key
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    ApiKey.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('删除 API Key 失败:', error);
    res.status(500).json({ error: '删除 API Key 失败' });
  }
});

export default router;
