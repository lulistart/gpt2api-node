import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { initDatabase } from './config/database.js';
import { Token, ApiLog } from './models/index.js';
import TokenManager from './tokenManager.js';
import ProxyHandler from './proxyHandler.js';
import { authenticateApiKey, authenticateAdmin } from './middleware/auth.js';

// 导入路由
import authRoutes from './routes/auth.js';
import apiKeysRoutes from './routes/apiKeys.js';
import tokensRoutes from './routes/tokens.js';
import statsRoutes from './routes/stats.js';
import settingsRoutes from './routes/settings.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MODELS_FILE = process.env.MODELS_FILE || './models.json';

// 初始化数据库
initDatabase();

// 中间件
app.use(express.json({ limit: '10mb' })); // 增加请求体大小限制以支持批量导入
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'gpt2api-node-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 生产环境设置为 true（需要 HTTPS）
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 小时
  }
}));
app.use(express.static(path.join(__dirname, '../public')));

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

// 创建 Token 管理器池
const tokenManagers = new Map();
let currentTokenIndex = 0; // 轮询索引

// 负载均衡策略
const LOAD_BALANCE_STRATEGY = process.env.LOAD_BALANCE_STRATEGY || 'round-robin';

// 获取可用的 Token Manager（支持多种策略）
function getAvailableTokenManager() {
  const activeTokens = Token.getActive();
  
  if (activeTokens.length === 0) {
    throw new Error('没有可用的 Token 账户');
  }

  let token;
  
  switch (LOAD_BALANCE_STRATEGY) {
    case 'random':
      // 随机策略：随机选择一个 token
      token = activeTokens[Math.floor(Math.random() * activeTokens.length)];
      break;
      
    case 'least-used':
      // 最少使用策略：选择总请求数最少的 token
      token = activeTokens.reduce((min, current) => {
        return (current.total_requests || 0) < (min.total_requests || 0) ? current : min;
      });
      break;
      
    case 'round-robin':
    default:
      // 轮询策略：按顺序选择下一个 token
      token = activeTokens[currentTokenIndex % activeTokens.length];
      currentTokenIndex = (currentTokenIndex + 1) % activeTokens.length;
      break;
  }
  
  if (!tokenManagers.has(token.id)) {
    // 创建临时 token 文件
    const tempTokenData = {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      id_token: token.id_token,
      account_id: token.account_id,
      email: token.email,
      expired_at: token.expired_at,
      last_refresh_at: token.last_refresh_at,
      type: 'codex'
    };
    
    // 使用内存中的 token 数据
    const manager = new TokenManager(null);
    manager.tokenData = tempTokenData;
    tokenManagers.set(token.id, { manager, tokenId: token.id });
  }

  return tokenManagers.get(token.id);
}

// ==================== 管理后台路由 ====================
app.use('/admin/auth', authRoutes);
app.use('/admin/api-keys', apiKeysRoutes);
app.use('/admin/tokens', tokensRoutes);
app.use('/admin/stats', statsRoutes);
app.use('/admin/settings', settingsRoutes);

// 根路径重定向到管理后台
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// ==================== 代理接口（需要 API Key） ====================

// OpenAI 兼容的聊天完成接口
app.post('/v1/chat/completions', authenticateApiKey, async (req, res) => {
  let tokenId = null;
  let success = false;
  let statusCode = 500;
  let errorMessage = null;
  const model = req.body.model || 'unknown';
  const apiKeyId = req.apiKey?.id || null;
  
  try {
    const { manager, tokenId: tid } = getAvailableTokenManager();
    tokenId = tid;
    const proxyHandler = new ProxyHandler(manager);
    
    const isStream = req.body.stream === true;
    
    if (isStream) {
      await proxyHandler.handleStreamRequest(req, res);
      success = true;
      statusCode = 200;
    } else {
      await proxyHandler.handleNonStreamRequest(req, res);
      success = true;
      statusCode = 200;
    }
    
    // 更新统计
    if (tokenId) {
      Token.updateUsage(tokenId, success);
    }
    
    // 记录日志
    ApiLog.create({
      api_key_id: apiKeyId,
      token_id: tokenId,
      model: model,
      endpoint: '/v1/chat/completions',
      status_code: statusCode,
      error_message: null
    });
    
  } catch (error) {
    console.error('代理请求失败:', error);
    statusCode = 500;
    errorMessage = error.message;
    
    // 更新失败统计
    if (tokenId) {
      Token.updateUsage(tokenId, false);
    }
    
    // 记录失败日志
    ApiLog.create({
      api_key_id: apiKeyId,
      token_id: tokenId,
      model: model,
      endpoint: '/v1/chat/completions',
      status_code: statusCode,
      error_message: errorMessage
    });
    
    res.status(500).json({
      error: {
        message: error.message,
        type: 'proxy_error'
      }
    });
  }
});

// 模型列表接口（公开）
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: modelsList
  });
});

// 健康检查（公开）
app.get('/health', (req, res) => {
  const activeTokens = Token.getActive();
  res.json({ 
    status: 'ok',
    tokens_count: activeTokens.length
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
  const activeTokens = Token.getActive();
  const allTokens = Token.getAll();
  const strategyNames = {
    'round-robin': '轮询',
    'random': '随机',
    'least-used': '最少使用'
  };
  
  console.log('=================================');
  console.log('🚀 GPT2API Node 管理系统已启动');
  console.log(`📡 监听端口: ${PORT}`);
  console.log(`⚖️  账号总数: ${allTokens.length} | 负载均衡: ${strategyNames[LOAD_BALANCE_STRATEGY] || LOAD_BALANCE_STRATEGY}`);
  console.log(`🔑 活跃账号: ${activeTokens.length} 个`);
  console.log('=================================');
  console.log(`\n管理后台: http://localhost:${PORT}/admin`);
  console.log(`API 接口: http://localhost:${PORT}/v1/chat/completions`);
  console.log(`\n首次使用请运行: npm run init-db`);
  console.log(`默认账户: admin / admin123\n`);
});
