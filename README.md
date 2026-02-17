# GPT2API Node

基于 Node.js + Express 的 OpenAI Codex 反向代理服务，支持多账号管理、自动刷新 token、负载均衡，提供 OpenAI 兼容的 API 接口和完整的管理后台。

## 界面预览

<table>
  <tr>
    <td width="50%">
      <img src="screenshots/管理员登录.png" alt="管理员登录" />
      <p align="center">管理员登录</p>
    </td>
    <td width="50%">
      <img src="screenshots/仪表盘.png" alt="仪表盘" />
      <p align="center">仪表盘</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="screenshots/API keys.png" alt="API Keys管理" />
      <p align="center">API Keys 管理</p>
    </td>
    <td width="50%">
      <img src="screenshots/账号管理.png" alt="账号管理" />
      <p align="center">账号管理</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="screenshots/数据分析.png" alt="数据分析" />
      <p align="center">数据分析</p>
    </td>
    <td width="50%">
      <img src="screenshots/系统设置.png" alt="系统设置" />
      <p align="center">系统设置</p>
    </td>
  </tr>
</table>

## 功能特性

- ✅ OpenAI Codex 反向代理
- ✅ 完整的 Web 管理后台
- ✅ 多账号管理和批量导入
- ✅ 自动 Token 刷新机制
- ✅ 负载均衡（轮询/随机/最少使用）
- ✅ API Key 管理和认证
- ✅ 请求统计和数据分析
- ✅ 支持流式和非流式响应
- ✅ OpenAI API 兼容接口
- ✅ 批量删除账号功能
- ✅ 实时活动记录

## 快速开始

### 1. 安装依赖

```bash
cd gpt2api-node
npm install
```

### 2. 初始化数据库

```bash
npm run init-db
```

默认管理员账户：
- 用户名：`admin`
- 密码：`admin123`

### 3. 启动服务

```bash
npm start
```

开发模式（自动重启）：

```bash
npm run dev
```

### 4. 访问管理后台

打开浏览器访问：`http://localhost:3000/admin`

使用默认账户登录后，请立即修改密码。

## 管理后台功能

### 仪表盘
- 系统概览和实时统计
- API Keys 数量
- Token 账号数量
- 今日请求数和成功率
- 最近活动记录

### API Keys 管理
- 创建和管理 API Keys
- 查看使用统计
- 启用/禁用 API Key

### 账号管理
- 批量导入 Token（支持 JSON 文件）
- 手动添加账号
- 批量删除账号
- 查看账号额度和使用情况
- 刷新账号额度
- 负载均衡策略配置

### 数据分析
- 请求量趋势图表
- 模型使用分布
- 账号详细统计
- API 请求日志

### 系统设置
- 修改管理员密码
- 负载均衡策略设置

## 负载均衡策略

支持三种负载均衡策略：

1. **轮询（round-robin）**：按顺序依次使用每个账号
2. **随机（random）**：随机选择一个可用账号
3. **最少使用（least-used）**：选择请求次数最少的账号

可在管理后台的账号管理页面或通过环境变量配置。

## API 接口

### 聊天完成接口

**端点**: `POST /v1/chat/completions`

**请求头**:
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**请求示例**:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.3-codex",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "stream": false
  }'
```

**流式请求**:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.3-codex",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "stream": true
  }'
```

### 模型列表

**端点**: `GET /v1/models`

```bash
curl http://localhost:3000/v1/models
```

### 健康检查

**端点**: `GET /health`

```bash
curl http://localhost:3000/health
```

## 支持的模型

- `gpt-5.3-codex` - GPT 5.3 Codex（最新）
- `gpt-5.2` - GPT 5.2
- `gpt-5.2-codex` - GPT 5.2 Codex
- `gpt-5.1` - GPT 5.1
- `gpt-5.1-codex` - GPT 5.1 Codex
- `gpt-5.1-codex-mini` - GPT 5.1 Codex Mini（更快更便宜）
- `gpt-5.1-codex-max` - GPT 5.1 Codex Max
- `gpt-5` - GPT 5
- `gpt-5-codex` - GPT 5 Codex
- `gpt-5-codex-mini` - GPT 5 Codex Mini

## 在 Cherry Studio 中使用

Cherry Studio 是一个支持多种 AI 服务的桌面客户端。配置步骤：

### 1. 创建 API Key

1. 访问管理后台：`http://localhost:3000/admin`
2. 进入 **API Keys** 页面
3. 点击 **创建 API Key**
4. 复制生成的 API Key（只显示一次）

### 2. 在 Cherry Studio 中配置

1. 打开 Cherry Studio
2. 进入 **设置** → **模型提供商**
3. 添加新的 **OpenAI 兼容** 提供商
4. 填写配置：
   - **名称**: GPT2API Node（或自定义名称）
   - **API 地址**: `http://localhost:3000/v1`
   - **API Key**: 粘贴刚才创建的 API Key
   - **模型**: 选择或手动输入模型名称（如 `gpt-5.3-codex`）

### 3. 开始使用

配置完成后，在 Cherry Studio 中选择刚才添加的提供商和模型，即可开始对话。

## 使用示例

### Python

```python
import openai

client = openai.OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="YOUR_API_KEY"
)

response = client.chat.completions.create(
    model="gpt-5.3-codex",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)
```

### JavaScript/Node.js

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'YOUR_API_KEY'
});

const response = await client.chat.completions.create({
  model: 'gpt-5.3-codex',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

console.log(response.choices[0].message.content);
```

## Token 管理

### 批量导入

1. 准备 JSON 文件，格式如下：

```json
[
  {
    "access_token": "your_access_token",
    "refresh_token": "your_refresh_token",
    "id_token": "your_id_token",
    "account_id": "account_id",
    "email": "email@example.com",
    "name": "账号名称"
  }
]
```

2. 在管理后台的账号管理页面点击 **导入 JSON**
3. 选择文件或粘贴 JSON 内容
4. 预览后确认导入

### 手动添加

在管理后台的账号管理页面点击 **手动添加**，填写必要信息。

### 自动刷新

服务会自动检测 token 是否过期，并在需要时自动刷新。

## 环境变量配置

创建 `.env` 文件：

```env
PORT=3000
SESSION_SECRET=your-secret-key-change-in-production
LOAD_BALANCE_STRATEGY=round-robin
MODELS_FILE=./models.json
```

## 项目结构

```
gpt2api-node/
├── src/
│   ├── index.js              # 主服务器文件
│   ├── tokenManager.js       # Token 管理模块
│   ├── proxyHandler.js       # 代理处理模块
│   ├── config/
│   │   └── database.js       # 数据库配置
│   ├── models/
│   │   └── index.js          # 数据模型
│   ├── routes/
│   │   ├── auth.js           # 认证路由
│   │   ├── apiKeys.js        # API Keys 路由
│   │   ├── tokens.js         # Tokens 路由
│   │   ├── stats.js          # 统计路由
│   │   └── settings.js       # 设置路由
│   ├── middleware/
│   │   └── auth.js           # 认证中间件
│   └── scripts/
│       └── initDatabase.js   # 数据库初始化脚本
├── public/
│   └── admin/                # 管理后台前端
│       ├── index.html
│       ├── login.html
│       └── js/
│           └── admin.js
├── database/
│   └── app.db                # SQLite 数据库
├── models.json               # 模型配置
├── package.json
└── README.md
```

## 注意事项

1. **安全性**: 
   - 首次登录后请立即修改管理员密码
   - 妥善保管 API Keys
   - 生产环境请使用 HTTPS

2. **网络要求**: 需要能够访问 `chatgpt.com` 和 `auth.openai.com`

3. **Token 有效期**: Token 会自动刷新，但如果 refresh_token 失效，需要重新获取

4. **并发限制**: 根据 OpenAI 账户限制，注意控制并发请求数量

## 故障排除

### 无法访问管理后台

确保服务已启动，访问 `http://localhost:3000/admin`

### 数据库初始化失败

删除 `database/app.db` 文件，重新运行 `npm run init-db`

### Token 刷新失败

可能是 refresh_token 已过期，需要重新导入新的 token

### API 请求失败

1. 检查 API Key 是否正确
2. 确保有可用的 Token 账号
3. 查看管理后台的请求日志

## 许可证

MIT License

## 相关项目

- [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) - 原始 Go 语言实现
