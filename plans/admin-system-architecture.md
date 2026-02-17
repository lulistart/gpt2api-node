# GPT2API Node - API 网关后台管理系统架构设计

## 1. 系统概述

构建一个专业的 API 网关后台管理系统，用于管理 OpenAI Codex 代理服务的用户、API Keys 和 Token 账户。

## 2. 核心功能模块

### 2.1 用户认证模块
- 管理员登录/登出
- 密码修改
- Session 管理
- JWT Token 认证

### 2.2 API Key 管理模块
- 创建 API Key（自动生成）
- 删除 API Key
- 列表展示（包含创建时间、最后使用时间、使用次数）
- API Key 权限控制（可选：限流、配额）

### 2.3 Token 账户管理模块
- JSON 文件导入（支持 CLIProxyAPI 格式）
- 账户列表展示
- 账户状态监控（Token 过期时间、刷新状态）
- 账户删除
- 自动 Token 刷新

### 2.4 统计监控模块
- API 调用统计
- 使用量统计
- 错误日志
- 实时状态监控

## 3. 技术架构

### 3.1 后端技术栈
```
- Node.js + Express
- SQLite（轻量级数据库）
- bcrypt（密码加密）
- jsonwebtoken（JWT 认证）
- multer（文件上传）
- express-session（会话管理）
```

### 3.2 前端技术栈
```
- HTML5 + TailwindCSS + DaisyUI
- Vanilla JavaScript（无框架，保持轻量）
- Fetch API（HTTP 请求）
```

### 3.3 数据库设计

#### 表结构

**users 表**（管理员用户）
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- bcrypt 加密
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**api_keys 表**（API 密钥）
```sql
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,  -- sk-xxx 格式
  name TEXT,  -- 密钥名称/备注
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1
);
```

**tokens 表**（OpenAI Token 账户）
```sql
CREATE TABLE tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,  -- 账户名称/备注
  email TEXT,
  account_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  id_token TEXT,
  expired_at DATETIME,
  last_refresh_at DATETIME,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**api_logs 表**（API 调用日志）
```sql
CREATE TABLE api_logs (
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
);
```

## 4. API 接口设计

### 4.1 认证接口
```
POST   /admin/login          # 管理员登录
POST   /admin/logout         # 管理员登出
POST   /admin/change-password # 修改密码
GET    /admin/profile        # 获取当前用户信息
```

### 4.2 API Key 管理接口
```
GET    /admin/api-keys       # 获取 API Key 列表
POST   /admin/api-keys       # 创建新的 API Key
DELETE /admin/api-keys/:id   # 删除 API Key
PATCH  /admin/api-keys/:id   # 更新 API Key（启用/禁用）
```

### 4.3 Token 管理接口
```
GET    /admin/tokens         # 获取 Token 列表
POST   /admin/tokens/import  # 导入 Token JSON 文件
DELETE /admin/tokens/:id     # 删除 Token
POST   /admin/tokens/:id/refresh # 手动刷新 Token
```

### 4.4 统计接口
```
GET    /admin/stats/overview # 总览统计
GET    /admin/stats/usage    # 使用量统计
GET    /admin/logs           # 获取日志
```

### 4.5 代理接口（需要 API Key 认证）
```
POST   /v1/chat/completions  # OpenAI 兼容接口
GET    /v1/models            # 模型列表
```

## 5. 前端界面设计

### 5.1 布局结构
```
┌─────────────────────────────────────────┐
│  顶部导航栏（Logo、用户信息、登出）      │
├──────────┬──────────────────────────────┤
│          │                              │
│  左侧    │                              │
│  导航    │        主内容区域             │
│  菜单    │                              │
│          │                              │
│  - 仪表盘│                              │
│  - API Keys                            │
│  - Tokens│                              │
│  - 日志  │                              │
│  - 设置  │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

### 5.2 页面列表
1. **登录页面** - 管理员登录
2. **仪表盘** - 总览统计、快速操作
3. **API Keys 管理** - 列表、创建、删除
4. **Tokens 管理** - 列表、导入、删除、刷新
5. **日志查看** - API 调用日志、错误日志
6. **设置页面** - 密码修改、系统配置

## 6. 安全设计

### 6.1 认证机制
- 管理后台使用 JWT Token 认证
- API 代理使用 API Key 认证
- 密码使用 bcrypt 加密存储

### 6.2 权限控制
- 所有 `/admin/*` 接口需要登录认证
- API Key 验证中间件
- CORS 配置

### 6.3 安全措施
- 密码强度验证
- 登录失败次数限制
- API Key 格式：`sk-` + 32位随机字符
- Token 自动刷新机制

## 7. 部署方案

### 7.1 目录结构
```
gpt2api-node/
├── src/
│   ├── index.js              # 主入口
│   ├── config/
│   │   └── database.js       # 数据库配置
│   ├── middleware/
│   │   ├── auth.js           # 认证中间件
│   │   └── apiKey.js         # API Key 验证
│   ├── models/
│   │   ├── User.js
│   │   ├── ApiKey.js
│   │   └── Token.js
│   ├── routes/
│   │   ├── admin.js          # 管理接口
│   │   ├── apiKeys.js
│   │   ├── tokens.js
│   │   └── proxy.js          # 代理接口
│   ├── services/
│   │   ├── tokenManager.js   # Token 管理服务
│   │   └── proxyHandler.js   # 代理处理服务
│   └── utils/
│       ├── crypto.js         # 加密工具
│       └── logger.js         # 日志工具
├── public/
│   ├── admin/
│   │   ├── index.html        # 管理后台
│   │   ├── login.html        # 登录页
│   │   ├── css/
│   │   └── js/
│   └── assets/
├── database/
│   └── app.db                # SQLite 数据库
├── package.json
└── README.md
```

### 7.2 环境变量
```env
PORT=3000
JWT_SECRET=your-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
DATABASE_PATH=./database/app.db
```

## 8. 实施计划

### 阶段 1：数据库和认证（核心）
1. 创建数据库模型
2. 实现用户认证系统
3. 创建初始管理员账户

### 阶段 2：API Key 管理
1. API Key 生成和存储
2. API Key 验证中间件
3. API Key 管理接口

### 阶段 3：Token 管理
1. Token 导入功能
2. Token 自动刷新
3. Token 管理接口

### 阶段 4：前端界面
1. 登录页面
2. 管理后台布局
3. 各功能页面实现

### 阶段 5：统计和日志
1. API 调用日志记录
2. 统计数据展示
3. 日志查询功能

## 9. 技术难点和解决方案

### 9.1 多 Token 负载均衡
**问题**：多个 Token 账户如何分配请求？
**方案**：
- 轮询策略
- 根据 Token 状态（过期时间、使用次数）智能选择
- 失败自动切换

### 9.2 Token 自动刷新
**问题**：Token 过期前自动刷新
**方案**：
- 定时任务检查即将过期的 Token
- 请求失败时触发刷新
- 刷新失败通知管理员

### 9.3 并发请求处理
**问题**：高并发下的性能
**方案**：
- 连接池管理
- 请求队列
- 缓存机制

## 10. 后续扩展

- 多用户支持（不同权限级别）
- API Key 配额限制
- Webhook 通知
- 更详细的统计报表
- Docker 部署支持
- 集群部署支持
