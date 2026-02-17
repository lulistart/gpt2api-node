import axios from 'axios';

const CODEX_BASE_URL = 'https://chatgpt.com/backend-api/codex';
const CODEX_CLIENT_VERSION = '0.101.0';
const CODEX_USER_AGENT = 'codex_cli_rs/0.101.0 (Mac OS 26.0.1; arm64) Apple_Terminal/464';

/**
 * 代理处理器
 */
class ProxyHandler {
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
  }

  /**
   * 生成会话 ID
   */
  generateSessionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 转换 OpenAI 格式请求到 Codex 格式
   */
  transformRequest(openaiRequest) {
    const { model, messages, stream = true, stream_options, ...rest } = openaiRequest;

    // 提取 system 消息作为 instructions
    let instructions = '';
    const userMessages = [];
    
    for (const msg of messages) {
      if (msg.role === 'system') {
        // system 消息转为 instructions
        const content = Array.isArray(msg.content) 
          ? msg.content.map(c => c.text || c).join('\n')
          : msg.content;
        instructions += (instructions ? '\n' : '') + content;
      } else {
        // 其他消息保留
        userMessages.push(msg);
      }
    }

    // 转换消息格式
    const input = userMessages.map(msg => {
      const contentType = msg.role === 'assistant' ? 'output_text' : 'input_text';
      
      return {
        type: 'message',
        role: msg.role,
        content: Array.isArray(msg.content) 
          ? msg.content.map(c => {
              // 处理不同类型的内容
              if (c.type === 'text') {
                return { type: contentType, text: c.text || c };
              } else if (c.type === 'image_url') {
                // OpenAI 的 image_url 转换为 Codex 的 input_image
                return { 
                  type: 'input_image', 
                  image_url: c.image_url?.url || c.image_url 
                };
              } else {
                return c;
              }
            })
          : [{ type: contentType, text: msg.content }]
      };
    });

    // 移除 Codex 不支持的参数
    const codexRequest = {
      model: model || 'gpt-5.3-codex',
      input,
      instructions: instructions || '',
      stream,
      store: false  // 必须设置为 false
    };

    // 只保留 Codex 支持的参数
    if (rest.temperature !== undefined) codexRequest.temperature = rest.temperature;
    if (rest.max_tokens !== undefined) codexRequest.max_tokens = rest.max_tokens;
    if (rest.top_p !== undefined) codexRequest.top_p = rest.top_p;

    return codexRequest;
  }

  /**
   * 转换 Codex 响应到 OpenAI 格式
   */
  transformResponse(codexResponse, model, isStream = false, state = {}) {
    if (isStream) {
      // 流式响应处理
      const line = codexResponse.toString().trim();
      
      if (!line.startsWith('data:')) {
        return null;
      }

      const data = line.slice(5).trim();
      
      if (data === '[DONE]') {
        return 'data: [DONE]\n\n';
      }

      try {
        const parsed = JSON.parse(data);
        
        // 保存响应 ID 和创建时间
        if (parsed.type === 'response.created') {
          state.responseId = parsed.response?.id;
          state.createdAt = parsed.response?.created_at || Math.floor(Date.now() / 1000);
          state.model = parsed.response?.model || model;
          return null;
        }

        const responseId = state.responseId || 'chatcmpl-' + Date.now();
        const createdAt = state.createdAt || Math.floor(Date.now() / 1000);
        const modelName = state.model || model;
        
        // 处理不同类型的事件 - 根据原项目的实现
        if (parsed.type === 'response.output_text.delta') {
          // 文本增量更新
          return `data: ${JSON.stringify({
            id: responseId,
            object: 'chat.completion.chunk',
            created: createdAt,
            model: modelName,
            choices: [{
              index: 0,
              delta: { role: 'assistant', content: parsed.delta || '' },
              finish_reason: null
            }]
          })}\n\n`;
        } else if (parsed.type === 'response.reasoning_summary_text.delta') {
          // 推理内容增量
          return `data: ${JSON.stringify({
            id: responseId,
            object: 'chat.completion.chunk',
            created: createdAt,
            model: modelName,
            choices: [{
              index: 0,
              delta: { role: 'assistant', reasoning_content: parsed.delta || '' },
              finish_reason: null
            }]
          })}\n\n`;
        } else if (parsed.type === 'response.completed') {
          // 提取使用信息
          const usage = parsed.response?.usage || {};
          return `data: ${JSON.stringify({
            id: parsed.response_id || 'chatcmpl-' + Date.now(),
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [{
              index: 0,
              delta: {},
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: usage.input_tokens || 0,
              completion_tokens: usage.output_tokens || 0,
              total_tokens: usage.total_tokens || 0
            }
          })}\n\n`;
        }
      } catch (e) {
        // 忽略 JSON 解析错误，可能是不完整的数据
        return null;
      }

      return null;
    } else {
      // 非流式响应处理
      try {
        const parsed = typeof codexResponse === 'string' 
          ? JSON.parse(codexResponse) 
          : codexResponse;

        const response = parsed.response || {};
        const output = response.output || [];
        
        // 提取消息内容
        let content = '';
        for (const item of output) {
          if (item.type === 'message' && item.content) {
            for (const part of item.content) {
              if (part.type === 'output_text') {
                content += part.text || '';
              }
            }
          }
        }

        const usage = response.usage || {};

        return {
          id: response.id || 'chatcmpl-' + Date.now(),
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: model,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: content
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: usage.input_tokens || 0,
            completion_tokens: usage.output_tokens || 0,
            total_tokens: usage.total_tokens || 0
          }
        };
      } catch (e) {
        throw new Error(`转换响应失败: ${e.message}`);
      }
    }
  }

  /**
   * 处理流式请求
   */
  async handleStreamRequest(req, res) {
    try {
      const openaiRequest = req.body;
      console.log('收到请求:', JSON.stringify(openaiRequest, null, 2));
      
      const codexRequest = this.transformRequest(openaiRequest);
      console.log('转换后的 Codex 请求:', JSON.stringify(codexRequest, null, 2));
      
      const accessToken = await this.tokenManager.getValidToken();

      // 设置响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const response = await axios.post(
        `${CODEX_BASE_URL}/responses`,
        codexRequest,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': CODEX_USER_AGENT,
            'Version': CODEX_CLIENT_VERSION,
            'Openai-Beta': 'responses=experimental',
            'Session_id': this.generateSessionId(),
            'Accept': 'text/event-stream'
          },
          responseType: 'stream',
          timeout: 300000 // 5 分钟超时
        }
      );

      // 处理流式响应
      let buffer = '';
      const state = {}; // 用于保存响应 ID 和创建时间
      
      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        
        // 保留最后一行（可能不完整）
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            const transformed = this.transformResponse(line, openaiRequest.model, true, state);
            if (transformed) {
              res.write(transformed);
            }
          }
        }
      });

      response.data.on('end', () => {
        // 处理缓冲区中剩余的数据
        if (buffer.trim()) {
          const transformed = this.transformResponse(buffer, openaiRequest.model, true, state);
          if (transformed) {
            res.write(transformed);
          }
        }
        res.write('data: [DONE]\n\n');
        res.end();
      });

      response.data.on('error', (error) => {
        console.error('流式响应错误:', error.message);
        res.end();
      });

    } catch (error) {
      console.error('代理请求失败:', error.message);
      if (error.response) {
        console.error('响应状态:', error.response.status);
        console.error('响应头:', error.response.headers);
        
        // 尝试读取响应数据
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            console.error('响应数据:', error.response.data);
          } else if (error.response.data.on) {
            // 如果是流，尝试读取
            let data = '';
            error.response.data.on('data', chunk => {
              data += chunk.toString();
            });
            error.response.data.on('end', () => {
              console.error('响应数据:', data);
            });
          } else {
            try {
              console.error('响应数据:', JSON.stringify(error.response.data));
            } catch (e) {
              console.error('响应数据类型:', typeof error.response.data);
            }
          }
        }
      }
      
      if (!res.headersSent) {
        res.status(error.response?.status || 500).json({
          error: {
            message: error.response?.data?.error?.message || error.message,
            type: 'proxy_error',
            code: error.response?.status || 500
          }
        });
      }
    }
  }

  /**
   * 处理非流式请求
   */
  async handleNonStreamRequest(req, res) {
    try {
      const openaiRequest = req.body;
      console.log('收到请求:', JSON.stringify(openaiRequest, null, 2));
      
      const codexRequest = this.transformRequest({ ...openaiRequest, stream: false });
      console.log('转换后的 Codex 请求:', JSON.stringify(codexRequest, null, 2));
      
      const accessToken = await this.tokenManager.getValidToken();

      const response = await axios.post(
        `${CODEX_BASE_URL}/responses`,
        codexRequest,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': CODEX_USER_AGENT,
            'Version': CODEX_CLIENT_VERSION,
            'Openai-Beta': 'responses=experimental',
            'Session_id': this.generateSessionId()
          },
          timeout: 300000
        }
      );

      // 处理响应数据 - 查找 response.completed 事件
      let finalResponse = null;
      const lines = response.data.split('\n');
      
      for (const line of lines) {
        if (line.trim().startsWith('data:')) {
          const data = line.slice(5).trim();
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'response.completed') {
              finalResponse = parsed;
              break;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }

      if (!finalResponse) {
        throw new Error('未收到完整响应');
      }

      // 转换为 OpenAI 格式
      const transformed = this.transformNonStreamResponse(finalResponse, openaiRequest.model);
      res.json(transformed);

    } catch (error) {
      console.error('代理请求失败:', error.message);
      if (error.response) {
        console.error('响应状态:', error.response.status);
        console.error('响应头:', error.response.headers);
        try {
          console.error('响应数据:', typeof error.response.data === 'string' 
            ? error.response.data 
            : JSON.stringify(error.response.data));
        } catch (e) {
          console.error('响应数据无法序列化');
        }
      }
      
      res.status(error.response?.status || 500).json({
        error: {
          message: error.response?.data?.error?.message || error.message,
          type: 'proxy_error',
          code: error.response?.status || 500
        }
      });
    }
  }
}

export default ProxyHandler;
