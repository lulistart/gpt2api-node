// 全局变量
let messages = [];
let currentModel = 'gpt-5.3-codex';

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
  await loadModels();
});

// 加载服务状态
async function loadStatus() {
  try {
    const response = await fetch('/health');
    const data = await response.json();
    
    if (data.status === 'ok') {
      document.getElementById('serviceStatus').textContent = '运行中';
      document.getElementById('accountEmail').textContent = data.token.email || data.token.account_id || '未知';
      
      if (data.token.expired) {
        const expireDate = new Date(data.token.expired);
        document.getElementById('tokenExpire').textContent = expireDate.toLocaleString('zh-CN');
      }
    }
  } catch (error) {
    console.error('加载状态失败:', error);
    document.getElementById('serviceStatus').textContent = '离线';
    document.getElementById('serviceStatus').classList.remove('text-primary');
    document.getElementById('serviceStatus').classList.add('text-error');
  }
}

// 加载模型列表
async function loadModels() {
  try {
    const response = await fetch('/v1/models');
    const data = await response.json();
    
    const select = document.getElementById('modelSelect');
    select.innerHTML = '';
    
    data.data.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.id;
      select.appendChild(option);
    });
    
    if (data.data.length > 0) {
      currentModel = data.data[0].id;
      select.value = currentModel;
    }
    
    select.addEventListener('change', (e) => {
      currentModel = e.target.value;
    });
  } catch (error) {
    console.error('加载模型失败:', error);
  }
}

// 发送消息
async function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  // 添加用户消息
  messages.push({ role: 'user', content: message });
  appendMessage('user', message);
  input.value = '';
  
  // 显示加载状态
  const loadingId = appendMessage('assistant', '思考中...', true);
  
  try {
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: currentModel,
        messages: messages,
        stream: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // 移除加载消息
    document.getElementById(loadingId).remove();
    
    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = '';
    let messageId = null;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const json = JSON.parse(data);
            const content = json.choices[0]?.delta?.content;
            
            if (content) {
              assistantMessage += content;
              
              if (!messageId) {
                messageId = appendMessage('assistant', assistantMessage);
              } else {
                updateMessage(messageId, assistantMessage);
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
    
    // 保存助手消息
    if (assistantMessage) {
      messages.push({ role: 'assistant', content: assistantMessage });
    }
    
  } catch (error) {
    console.error('发送消息失败:', error);
    document.getElementById(loadingId).remove();
    appendMessage('system', '错误: ' + error.message);
  }
}

// 添加消息到聊天区域
function appendMessage(role, content, isLoading = false) {
  const container = document.getElementById('chatMessages');
  
  // 首次添加消息时清除欢迎文本
  if (container.children.length === 1 && container.children[0].classList.contains('text-center')) {
    container.innerHTML = '';
  }
  
  const messageId = 'msg-' + Date.now() + '-' + Math.random();
  const messageDiv = document.createElement('div');
  messageDiv.id = messageId;
  messageDiv.className = 'chat chat-message ' + (role === 'user' ? 'chat-end' : 'chat-start');
  
  let avatarClass = 'bg-primary';
  let avatarText = 'U';
  
  if (role === 'assistant') {
    avatarClass = 'bg-secondary';
    avatarText = 'AI';
  } else if (role === 'system') {
    avatarClass = 'bg-error';
    avatarText = '!';
  }
  
  messageDiv.innerHTML = `
    <div class="chat-image avatar">
      <div class="w-10 rounded-full ${avatarClass} flex items-center justify-center text-white font-bold">
        ${avatarText}
      </div>
    </div>
    <div class="chat-bubble ${role === 'user' ? 'chat-bubble-primary' : role === 'system' ? 'chat-bubble-error' : ''}">
      ${isLoading ? '<span class="loading loading-dots loading-sm"></span>' : escapeHtml(content)}
    </div>
  `;
  
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
  
  return messageId;
}

// 更新消息内容
function updateMessage(messageId, content) {
  const messageDiv = document.getElementById(messageId);
  if (messageDiv) {
    const bubble = messageDiv.querySelector('.chat-bubble');
    bubble.textContent = content;
  }
  
  const container = document.getElementById('chatMessages');
  container.scrollTop = container.scrollHeight;
}

// 清空聊天
function clearChat() {
  messages = [];
  const container = document.getElementById('chatMessages');
  container.innerHTML = '<div class="text-center text-base-content/50 py-8">开始对话吧！</div>';
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 显示设置
function showSettings() {
  alert('设置功能开发中...');
}

// 显示状态
async function showStatus() {
  await loadStatus();
  alert('状态已刷新！');
}

// 显示模型列表
async function showModels() {
  try {
    const response = await fetch('/v1/models');
    const data = await response.json();
    
    const modelList = data.data.map(m => m.id).join('\n');
    alert('可用模型:\n\n' + modelList);
  } catch (error) {
    alert('获取模型列表失败: ' + error.message);
  }
}
