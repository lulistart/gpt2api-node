import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import TokenManager from './tokenManager.js';
import ProxyHandler from './proxyHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN_FILE = process.env.TOKEN_FILE || './token.json';
const MODELS_FILE = process.env.MODELS_FILE || './models.json';

// 中间件
app.use(express.json());

// 初始化 Token 管理器和代理处理器
const tokenManager = new TokenManager(TOKEN_FILE);
const proxyHandler = new ProxyHandler(tokenManager);

// 加载模型列表
let modelsList = [];
try {
  const modelsData = await fs.readFile(MODELS_FILE, 'utf-8');
  modelsList = JSON.parse(modelsData);
  console.log(`✓ 加载了 ${modelsList.length} 个模型`);
} catch (err) {
  console.warn('⚠ 无法加载模型列表，使用默认列表');
  modelsList = [
    { id: 'gpt-5.3-codex', object: 'model', created: 1770307200, owned_by: 'openai' },
    { id: 'gpt-5.2-codex', object: 'model', created: 1765440000, owned_by: 'openai' }
  ];
}

// 启动时加载 token
await tokenManager.loadToken().catch(err => {
  console.error('❌ 启动失败:', err.message);
  console.error('请确保 token.json 文件存在且格式正确');
  process.exit(1);
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    token: tokenManager.getTokenInfo()
  });
});

// OpenAI 兼容的聊天完成接口
app.post('/v1/chat/completions', async (req, res) => {
  const isStream = req.body.stream === true;
  
  if (isStream) {
    await proxyHandler.handleStreamRequest(req, res);
  } else {
    await proxyHandler.handleNonStreamRequest(req, res);
  }
});

// 模型列表接口
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: modelsList
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: {
      message: err.message || '内部服务器错误',
      type: 'server_error'
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 GPT2API Node 服务已启动');
  console.log(`📡 监听端口: ${PORT}`);
  console.log(`👤 账户: ${tokenManager.getTokenInfo().email || tokenManager.getTokenInfo().account_id}`);
  console.log(`⏰ Token 过期时间: ${tokenManager.getTokenInfo().expired}`);
  console.log('=================================');
  console.log(`\n接口地址:`);
  console.log(`  - 聊天: POST http://localhost:${PORT}/v1/chat/completions`);
  console.log(`  - 模型: GET  http://localhost:${PORT}/v1/models`);
  console.log(`  - 健康: GET  http://localhost:${PORT}/health\n`);
});
