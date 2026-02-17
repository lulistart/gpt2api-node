# GPT2API Node

基于 Node.js + Express 的 OpenAI Codex 反向代理服务，支持 JSON 文件导入 token，自动刷新 token，提供 OpenAI 兼容的 API 接口。

## 功能特性

- ✅ OpenAI Codex 反向代理
- ✅ 自动 Token 刷新机制
- ✅ 支持流式和非流式响应
- ✅ OpenAI API 兼容接口
- ✅ JSON 文件导入 Token
- ✅ 简单易用的配置

## 快速开始

### 1. 安装依赖

```bash
cd gpt2api-node
npm install
```

### 2. 配置 Token

从 CLIProxyAPI 或其他来源获取 token 文件，复制到项目根目录并命名为 `token.json`：

```json
{
  "id_token": "your_id_token_here",
  "access_token": "your_access_token_here",
  "refresh_token": "your_refresh_token_here",
  "account_id": "your_account_id",
  "email": "your_email@example.com",
  "type": "codex",
  "expired": "2026-12-31T23:59:59.000Z",
  "last_refresh": "2026-01-01T00:00:00.000Z"
}
```

### 3. 配置环境变量（可选）

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

```env
PORT=3000
TOKEN_FILE=./token.json
```

### 4. 启动服务

```bash
npm start
```

开发模式（自动重启）：

```bash
npm run dev
```

## API 接口

### 聊天完成接口

**端点**: `POST /v1/chat/completions`

**请求示例**:

```bash
curl http://localhost:3000/v1/chat/completions \
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
- `gpt-5.3-codex-spark` - GPT 5.3 Codex Spark（超快速编码模型）
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

### 1. 启动代理服务

```bash
cd gpt2api-node
npm start
```

### 2. 在 Cherry Studio 中配置

1. 打开 Cherry Studio
2. 进入 **设置** → **模型提供商**
3. 添加新的 **OpenAI 兼容** 提供商
4. 填写配置：
   - **名称**: GPT2API Node（或自定义名称）
   - **API 地址**: `http://localhost:3000/v1`
   - **API Key**: 随意填写（如 `dummy`），不会被验证
   - **模型**: 选择或手动输入模型名称（如 `gpt-5.3-codex`）

### 3. 开始使用

配置完成后，在 Cherry Studio 中选择刚才添加的提供商和模型，即可开始对话。

### 可用模型列表

在 Cherry Studio 中可以使用以下任意模型：
- `gpt-5.3-codex` - 推荐，最新版本
- `gpt-5.3-codex-spark` - 超快速编码
- `gpt-5.2-codex` - 稳定版本
- `gpt-5.1-codex` - 较旧版本
- 其他 GPT-5 系列模型

## 使用示例

### Python

```python
import openai

client = openai.OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="dummy"  # 不需要真实的 API key
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
  apiKey: 'dummy'
});

const response = await client.chat.completions.create({
  model: 'gpt-5.3-codex',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

console.log(response.choices[0].message.content);
```

### cURL

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.3-codex",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is the capital of France?"}
    ]
  }'
```

## Token 管理

### 自动刷新

服务会自动检测 token 是否过期（提前 5 分钟），并在需要时自动刷新。刷新后的 token 会自动保存到文件中。

### 手动导入

如果你有从 CLIProxyAPI 导出的 token 文件，直接复制为 `token.json` 即可使用。

### Token 文件格式

Token 文件必须包含以下字段：

- `access_token`: 访问令牌
- `refresh_token`: 刷新令牌
- `id_token`: ID 令牌（可选）
- `account_id`: 账户 ID（可选）
- `email`: 邮箱（可选）
- `expired`: 过期时间（ISO 8601 格式）
- `type`: 类型（固定为 "codex"）

## 项目结构

```
gpt2api-node/
├── src/
│   ├── index.js           # 主服务器文件
│   ├── tokenManager.js    # Token 管理模块
│   └── proxyHandler.js    # 代理处理模块
├── package.json
├── .env.example
├── token.example.json
├── .gitignore
└── README.md
```

## 注意事项

1. **Token 安全**: 请妥善保管 `token.json` 文件，不要提交到版本控制系统
2. **网络要求**: 需要能够访问 `chatgpt.com` 和 `auth.openai.com`
3. **Token 有效期**: Token 会自动刷新，但如果 refresh_token 失效，需要重新获取
4. **并发限制**: 根据 OpenAI 账户限制，注意控制并发请求数量

## 故障排除

### Token 加载失败

确保 `token.json` 文件存在且格式正确，参考 `token.example.json`。

### Token 刷新失败

可能是 refresh_token 已过期，需要重新从 CLIProxyAPI 获取新的 token。

### 代理请求失败

检查网络连接，确保能够访问 OpenAI 服务。

## 许可证

MIT License

## 相关项目

- [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) - 原始 Go 语言实现
