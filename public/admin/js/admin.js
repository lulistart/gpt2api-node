// 全局变量
let currentPage = 'dashboard';

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadStats();
  await loadApiKeys();
  await loadRecentActivity();
});

// 检查认证状态
async function checkAuth() {
  try {
    const response = await fetch('/admin/auth/check');
    if (!response.ok) {
      window.location.href = '/admin/login.html';
    }
  } catch (error) {
    console.error('认证检查失败:', error);
    window.location.href = '/admin/login.html';
  }
}

// 加载统计数据
async function loadStats() {
  try {
    const response = await fetch('/admin/stats');
    const data = await response.json();
    
    document.getElementById('apiKeysCount').textContent = data.apiKeys || 0;
    document.getElementById('tokensCount').textContent = data.tokens || 0;
    document.getElementById('todayRequests').textContent = data.todayRequests || 0;
    document.getElementById('successRate').textContent = (data.successRate || 100) + '%';
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
}

// 加载最近活动记录
async function loadRecentActivity() {
  try {
    const response = await fetch('/admin/stats/recent-activity?limit=10');
    const activities = await response.json();
    
    const container = document.getElementById('recentActivity');
    
    if (activities.length === 0) {
      container.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fas fa-info-circle mr-2"></i>暂无活动记录</div>';
      return;
    }
    
    container.innerHTML = activities.map(activity => {
      const timeAgo = getTimeAgo(activity.time);
      return `
        <div class="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-0">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <i class="fas ${activity.icon} ${activity.color} text-sm"></i>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900">${escapeHtml(activity.title)}</p>
            <p class="text-xs text-gray-500 mt-0.5">${escapeHtml(activity.description)}</p>
          </div>
          <div class="flex-shrink-0">
            <span class="text-xs text-gray-400">${timeAgo}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('加载最近活动失败:', error);
  }
}

// 计算时间差
function getTimeAgo(timestamp) {
  if (!timestamp) return '未知';
  
  const now = new Date();
  const time = new Date(timestamp);
  const diff = Math.floor((now - time) / 1000); // 秒
  
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return time.toLocaleDateString('zh-CN');
}

// 切换页面
function switchPage(event, page) {
  event.preventDefault();
  currentPage = page;
  
  // 更新导航样式
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active', 'text-white');
    item.classList.add('text-gray-700');
  });
  event.currentTarget.classList.add('active');
  event.currentTarget.classList.remove('text-gray-700');
  
  // 隐藏所有页面
  document.getElementById('dashboardPage').classList.add('hidden');
  document.getElementById('apikeysPage').classList.add('hidden');
  document.getElementById('accountsPage').classList.add('hidden');
  document.getElementById('analyticsPage').classList.add('hidden');
  document.getElementById('settingsPage').classList.add('hidden');
  
  // 更新页面标题
  const titles = {
    dashboard: { title: '仪表盘', desc: '系统概览和实时数据' },
    apikeys: { title: 'API Keys', desc: 'API 密钥管理' },
    accounts: { title: '账号管理', desc: 'Tokens 账户管理' },
    analytics: { title: '数据分析', desc: 'API 请求统计和分析' },
    settings: { title: '系统设置', desc: '系统配置和偏好设置' }
  };
  
  document.getElementById('pageTitle').textContent = titles[page].title;
  document.getElementById('pageDesc').textContent = titles[page].desc;
  
  // 显示对应页面
  if (page === 'dashboard') {
    document.getElementById('dashboardPage').classList.remove('hidden');
  } else if (page === 'apikeys') {
    document.getElementById('apikeysPage').classList.remove('hidden');
    loadApiKeys();
  } else if (page === 'accounts') {
    document.getElementById('accountsPage').classList.remove('hidden');
    loadTokens();
    loadLoadBalanceStrategy();
  } else if (page === 'analytics') {
    document.getElementById('analyticsPage').classList.remove('hidden');
    loadAnalytics();
  } else if (page === 'settings') {
    document.getElementById('settingsPage').classList.remove('hidden');
  }
}

// 切换账号管理标签
// 已移除，不再需要

// ==================== API Keys 管理 ====================

async function loadApiKeys() {
  try {
    const response = await fetch('/admin/api-keys');
    const data = await response.json();
    
    const tbody = document.getElementById('apiKeysTable');
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">暂无 API Key</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.map(key => `
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="py-4 px-4 text-sm text-gray-900">${escapeHtml(key.name || '-')}</td>
        <td class="py-4 px-4">
          <code class="text-xs bg-gray-100 px-2 py-1 rounded">${escapeHtml(key.key.substring(0, 20))}...</code>
          <button onclick="copyToClipboard('${escapeHtml(key.key)}')" class="ml-2 text-gray-400 hover:text-gray-600">
            <i class="fas fa-copy"></i>
          </button>
        </td>
        <td class="py-4 px-4 text-sm text-gray-600">${key.usage_count || 0}</td>
        <td class="py-4 px-4 text-sm text-gray-600">${key.last_used_at ? new Date(key.last_used_at).toLocaleString('zh-CN') : '-'}</td>
        <td class="py-4 px-4">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${key.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
            ${key.is_active ? '启用' : '禁用'}
          </span>
        </td>
        <td class="py-4 px-4">
          <button onclick="toggleApiKey(${key.id}, ${key.is_active})" class="text-sm text-gray-600 hover:text-gray-900 mr-3">
            ${key.is_active ? '禁用' : '启用'}
          </button>
          <button onclick="deleteApiKey(${key.id})" class="text-sm text-red-600 hover:text-red-800">
            删除
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('加载 API Keys 失败:', error);
  }
}

function showCreateApiKeyModal() {
  document.getElementById('createApiKeyModal').classList.remove('hidden');
}

async function handleCreateApiKey(event) {
  event.preventDefault();
  
  const name = document.getElementById('apiKeyName').value;
  
  try {
    const response = await fetch('/admin/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      document.getElementById('createApiKeyModal').classList.add('hidden');
      document.getElementById('apiKeyName').value = '';
      alert('API Key 创建成功！\n\n' + data.key + '\n\n请妥善保存，此 Key 不会再次显示！');
      await loadApiKeys();
      await loadStats();
    } else {
      alert('创建失败: ' + (data.error || '未知错误'));
    }
  } catch (error) {
    alert('创建失败: ' + error.message);
  }
}

async function toggleApiKey(id, currentStatus) {
  try {
    const response = await fetch(`/admin/api-keys/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !currentStatus })
    });
    
    if (response.ok) {
      await loadApiKeys();
      await loadStats();
    }
  } catch (error) {
    alert('操作失败: ' + error.message);
  }
}

async function deleteApiKey(id) {
  if (!confirm('确定要删除此 API Key 吗？')) return;
  
  try {
    const response = await fetch(`/admin/api-keys/${id}`, { method: 'DELETE' });
    if (response.ok) {
      await loadApiKeys();
      await loadStats();
    }
  } catch (error) {
    alert('删除失败: ' + error.message);
  }
}

// ==================== Tokens 管理 ====================

let currentTokenPage = 1;
let tokenPageSize = 20;
let totalTokens = 0;
let selectedTokens = new Set();

async function loadTokens(page = 1) {
  try {
    currentTokenPage = page;
    selectedTokens.clear();
    updateBatchDeleteButton();
    
    const response = await fetch(`/admin/tokens?page=${page}&limit=${tokenPageSize}`);
    const result = await response.json();
    
    const data = result.data || [];
    const pagination = result.pagination || {};
    totalTokens = pagination.total || 0;
    
    // 更新账号总数显示
    const totalCountEl = document.getElementById('totalTokensCount');
    if (totalCountEl) {
      totalCountEl.textContent = totalTokens;
    }
    
    const tbody = document.getElementById('tokensTable');
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-8 text-gray-500">暂无 Token</td></tr>';
      updateTokenPagination(0, 0);
      return;
    }
    
    tbody.innerHTML = data.map(token => {
      // 计算额度百分比
      const quotaTotal = token.quota_total || 0;
      const quotaUsed = token.quota_used || 0;
      const quotaRemaining = token.quota_remaining || 0;
      const quotaPercent = quotaTotal > 0 ? Math.round((quotaUsed / quotaTotal) * 100) : 0;
      
      // 额度显示颜色
      let quotaColor = 'text-green-600';
      if (quotaPercent > 80) quotaColor = 'text-red-600';
      else if (quotaPercent > 50) quotaColor = 'text-yellow-600';
      
      // 额度显示文本
      let quotaText = '-';
      if (quotaTotal > 0) {
        quotaText = `<div class="text-xs ${quotaColor}">
          <div class="font-medium">${quotaRemaining.toLocaleString()} / ${quotaTotal.toLocaleString()}</div>
          <div class="text-gray-500">${quotaPercent}% 已用</div>
        </div>`;
      }
      
      return `
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="py-4 px-4">
          <input type="checkbox" class="token-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500" value="${token.id}" onchange="toggleTokenSelection(${token.id})" />
        </td>
        <td class="py-4 px-4 text-sm text-gray-900">${escapeHtml(token.name || '-')}</td>
        <td class="py-4 px-4">${quotaText}</td>
        <td class="py-4 px-4 text-sm font-medium text-gray-900">${token.total_requests || 0}</td>
        <td class="py-4 px-4 text-sm text-green-600">${token.success_requests || 0}</td>
        <td class="py-4 px-4 text-sm text-red-600">${token.failed_requests || 0}</td>
        <td class="py-4 px-4 text-sm text-gray-600">${token.expired_at ? new Date(token.expired_at).toLocaleString('zh-CN') : '-'}</td>
        <td class="py-4 px-4">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${token.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
            ${token.is_active ? '启用' : '禁用'}
          </span>
        </td>
        <td class="py-4 px-4">
          <button onclick="refreshTokenQuota(${token.id})" class="text-sm text-blue-600 hover:text-blue-800 mr-2" title="刷新额度">
            <i class="fas fa-sync-alt"></i>
          </button>
          <button onclick="toggleToken(${token.id}, ${token.is_active})" class="text-sm text-gray-600 hover:text-gray-900 mr-2">
            ${token.is_active ? '禁用' : '启用'}
          </button>
          <button onclick="deleteToken(${token.id})" class="text-sm text-red-600 hover:text-red-800">
            删除
          </button>
        </td>
      </tr>
      `;
    }).join('');
    
    updateTokenPagination(pagination.page, pagination.totalPages);
  } catch (error) {
    console.error('加载 Tokens 失败:', error);
  }
}

function updateTokenPagination(currentPage, totalPages) {
  const paginationEl = document.getElementById('tokenPagination');
  if (!paginationEl) return;
  
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }
  
  let html = '<div class="flex items-center justify-between mt-4">';
  html += `<div class="text-sm text-gray-600">共 ${totalTokens} 个账号，第 ${currentPage}/${totalPages} 页</div>`;
  html += '<div class="flex space-x-2">';
  
  // 上一页
  if (currentPage > 1) {
    html += `<button onclick="loadTokens(${currentPage - 1})" class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">上一页</button>`;
  } else {
    html += `<button disabled class="px-3 py-1 border border-gray-200 rounded text-gray-400 cursor-not-allowed">上一页</button>`;
  }
  
  // 页码
  const maxPages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
  let endPage = Math.min(totalPages, startPage + maxPages - 1);
  
  if (endPage - startPage < maxPages - 1) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }
  
  if (startPage > 1) {
    html += `<button onclick="loadTokens(1)" class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">1</button>`;
    if (startPage > 2) {
      html += `<span class="px-2 py-1">...</span>`;
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    if (i === currentPage) {
      html += `<button class="px-3 py-1 bg-blue-500 text-white rounded">${i}</button>`;
    } else {
      html += `<button onclick="loadTokens(${i})" class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">${i}</button>`;
    }
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="px-2 py-1">...</span>`;
    }
    html += `<button onclick="loadTokens(${totalPages})" class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">${totalPages}</button>`;
  }
  
  // 下一页
  if (currentPage < totalPages) {
    html += `<button onclick="loadTokens(${currentPage + 1})" class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">下一页</button>`;
  } else {
    html += `<button disabled class="px-3 py-1 border border-gray-200 rounded text-gray-400 cursor-not-allowed">下一页</button>`;
  }
  
  html += '</div></div>';
  paginationEl.innerHTML = html;
}

function showCreateTokenModal() {
  document.getElementById('createTokenModal').classList.remove('hidden');
}

function showImportTokenModal() {
  document.getElementById('importTokenModal').classList.remove('hidden');
  
  // 监听文件选择
  document.getElementById('tokenFileInput').addEventListener('change', handleFileSelect);
}

function closeImportModal() {
  document.getElementById('importTokenModal').classList.add('hidden');
  document.getElementById('tokenFileInput').value = '';
  document.getElementById('tokenJsonContent').value = '';
  document.getElementById('importPreview').classList.add('hidden');
}

function handleFileSelect(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  // 如果只有一个文件，直接读取
  if (files.length === 1) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('tokenJsonContent').value = e.target.result;
    };
    reader.onerror = function(e) {
      alert('文件读取失败: ' + e.target.error);
    };
    reader.readAsText(files[0]);
    return;
  }
  
  // 多个文件，合并成数组
  let allTokens = [];
  let filesRead = 0;
  const totalFiles = files.length;
  
  console.log(`开始读取 ${totalFiles} 个文件...`);
  
  Array.from(files).forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        console.log(`读取文件 ${index + 1}/${totalFiles}: ${file.name}`);
        const data = JSON.parse(e.target.result);
        // 如果是数组，展开；如果是对象，作为单个元素
        if (Array.isArray(data)) {
          allTokens = allTokens.concat(data);
          console.log(`文件 ${file.name} 包含 ${data.length} 个 token`);
        } else {
          allTokens.push(data);
          console.log(`文件 ${file.name} 包含 1 个 token`);
        }
      } catch (error) {
        console.error(`文件 ${file.name} 解析失败:`, error);
        alert(`文件 ${file.name} 解析失败: ${error.message}`);
      }
      
      filesRead++;
      // 所有文件都读取完成后，更新文本框
      if (filesRead === totalFiles) {
        console.log(`所有文件读取完成，共 ${allTokens.length} 个 token`);
        document.getElementById('tokenJsonContent').value = JSON.stringify(allTokens, null, 2);
      }
    };
    reader.onerror = function(e) {
      console.error(`文件 ${file.name} 读取失败:`, e.target.error);
      alert(`文件 ${file.name} 读取失败`);
      filesRead++;
      if (filesRead === totalFiles && allTokens.length > 0) {
        document.getElementById('tokenJsonContent').value = JSON.stringify(allTokens, null, 2);
      }
    };
    reader.readAsText(file);
  });
}

let importData = null;

function previewImport() {
  const jsonContent = document.getElementById('tokenJsonContent').value.trim();
  
  if (!jsonContent) {
    alert('请先选择文件或粘贴 JSON 内容');
    return;
  }
  
  try {
    importData = JSON.parse(jsonContent);
    
    if (!Array.isArray(importData)) {
      importData = [importData];
    }
    
    // 验证数据格式
    const validTokens = importData.filter(token => {
      return token.access_token && token.refresh_token;
    });
    
    if (validTokens.length === 0) {
      alert('JSON 格式错误：未找到有效的 token 数据\n\n每个 token 必须包含 access_token 和 refresh_token 字段');
      return;
    }
    
    // 显示预览
    document.getElementById('importCount').textContent = validTokens.length;
    const listEl = document.getElementById('importList');
    listEl.innerHTML = validTokens.map((token, index) => `
      <li class="flex items-center space-x-2">
        <i class="fas fa-check-circle text-green-500"></i>
        <span>${index + 1}. ${escapeHtml(token.name || token.email || token.account_id || 'Token ' + (index + 1))}</span>
      </li>
    `).join('');
    
    document.getElementById('importPreview').classList.remove('hidden');
    importData = validTokens;
    
  } catch (error) {
    alert('JSON 解析失败：' + error.message);
  }
}

async function handleImportTokens() {
  if (!importData || importData.length === 0) {
    alert('请先预览导入数据');
    return;
  }
  
  if (!confirm(`确定要导入 ${importData.length} 个账户吗？`)) {
    return;
  }
  
  try {
    const response = await fetch('/admin/tokens/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens: importData })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`导入成功！\n成功：${data.success || 0} 个\n失败：${data.failed || 0} 个`);
      closeImportModal();
      await loadTokens();
      await loadStats();
    } else {
      alert('导入失败: ' + (data.error || '未知错误'));
    }
  } catch (error) {
    alert('导入失败: ' + error.message);
  }
}

async function handleCreateToken(event) {
  event.preventDefault();
  
  const name = document.getElementById('tokenName').value;
  const access_token = document.getElementById('accessToken').value;
  const refresh_token = document.getElementById('refreshToken').value;
  
  try {
    const response = await fetch('/admin/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, access_token, refresh_token })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      document.getElementById('createTokenModal').classList.add('hidden');
      document.getElementById('tokenName').value = '';
      document.getElementById('accessToken').value = '';
      document.getElementById('refreshToken').value = '';
      alert('Token 添加成功！');
      await loadTokens();
      await loadStats();
    } else {
      alert('添加失败: ' + (data.error || '未知错误'));
    }
  } catch (error) {
    alert('添加失败: ' + error.message);
  }
}

async function toggleToken(id, currentStatus) {
  try {
    const response = await fetch(`/admin/tokens/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !currentStatus })
    });
    
    if (response.ok) {
      await loadTokens();
      await loadStats();
    }
  } catch (error) {
    alert('操作失败: ' + error.message);
  }
}

async function deleteToken(id) {
  if (!confirm('确定要删除此 Token 吗？')) return;
  
  try {
    const response = await fetch(`/admin/tokens/${id}`, { method: 'DELETE' });
    if (response.ok) {
      await loadTokens(currentTokenPage);
      await loadStats();
    }
  } catch (error) {
    alert('删除失败: ' + error.message);
  }
}

async function refreshTokenQuota(id) {
  try {
    const response = await fetch(`/admin/tokens/${id}/quota`, { method: 'POST' });
    const data = await response.json();
    
    if (response.ok) {
      await loadTokens(currentTokenPage);
      if (data.quota) {
        alert(`额度已更新\n总额度: ${data.quota.total.toLocaleString()}\n已使用: ${data.quota.used.toLocaleString()}\n剩余: ${data.quota.remaining.toLocaleString()}`);
      }
    } else {
      alert('刷新额度失败: ' + (data.error || '未知错误'));
    }
  } catch (error) {
    alert('刷新额度失败: ' + error.message);
  }
}

async function refreshAllQuotas() {
  if (!confirm('确定要刷新所有账号的额度吗？这可能需要一些时间。')) {
    return;
  }
  
  try {
    const response = await fetch('/admin/tokens/quota/refresh-all', { method: 'POST' });
    const data = await response.json();
    
    if (response.ok) {
      await loadTokens(currentTokenPage);
      alert(`批量刷新完成\n成功: ${data.success || 0} 个\n失败: ${data.failed || 0} 个`);
    } else {
      alert('批量刷新失败: ' + (data.error || '未知错误'));
    }
  } catch (error) {
    alert('批量刷新失败: ' + error.message);
  }
}

// ==================== 批量删除功能 ====================

function toggleTokenSelection(id) {
  if (selectedTokens.has(id)) {
    selectedTokens.delete(id);
  } else {
    selectedTokens.add(id);
  }
  updateBatchDeleteButton();
  updateSelectAllCheckbox();
}

function toggleSelectAll() {
  const checkbox = document.getElementById('selectAllTokens');
  const checkboxes = document.querySelectorAll('.token-checkbox');
  
  if (checkbox.checked) {
    checkboxes.forEach(cb => {
      const id = parseInt(cb.value);
      selectedTokens.add(id);
      cb.checked = true;
    });
  } else {
    selectedTokens.clear();
    checkboxes.forEach(cb => {
      cb.checked = false;
    });
  }
  
  updateBatchDeleteButton();
}

function updateSelectAllCheckbox() {
  const checkbox = document.getElementById('selectAllTokens');
  const checkboxes = document.querySelectorAll('.token-checkbox');
  
  if (checkboxes.length === 0) {
    checkbox.checked = false;
    return;
  }
  
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkbox.checked = allChecked;
}

function updateBatchDeleteButton() {
  const btn = document.getElementById('batchDeleteBtn');
  const countSpan = document.getElementById('selectedCount');
  
  if (selectedTokens.size > 0) {
    btn.classList.remove('hidden');
    countSpan.textContent = selectedTokens.size;
  } else {
    btn.classList.add('hidden');
  }
}

async function batchDeleteTokens() {
  if (selectedTokens.size === 0) {
    alert('请先选择要删除的账号');
    return;
  }
  
  if (!confirm(`确定要删除选中的 ${selectedTokens.size} 个账号吗？此操作不可恢复！`)) {
    return;
  }
  
  try {
    const ids = Array.from(selectedTokens);
    const response = await fetch('/admin/tokens/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`批量删除完成\n成功: ${data.success || 0} 个\n失败: ${data.failed || 0} 个`);
      selectedTokens.clear();
      await loadTokens(currentTokenPage);
      await loadStats();
    } else {
      alert('批量删除失败: ' + (data.error || '未知错误'));
    }
  } catch (error) {
    alert('批量删除失败: ' + error.message);
  }
}

// ==================== 日志管理 ====================

async function loadAnalytics() {
  // 加载统计数据
  await loadAnalyticsStats();
  // 加载图表
  await loadCharts();
  // 加载模型统计
  await loadModelStats();
  // 加载日志
  await loadLogs();
}

let currentTimeRange = '24h';

function changeTimeRange(range) {
  currentTimeRange = range;
  
  // 更新按钮样式
  document.querySelectorAll('.time-range-btn').forEach(btn => {
    btn.classList.remove('bg-blue-500', 'text-white');
    btn.classList.add('text-gray-700', 'hover:bg-gray-100');
  });
  event.target.classList.add('bg-blue-500', 'text-white');
  event.target.classList.remove('text-gray-700', 'hover:bg-gray-100');
  
  // 重新加载数据
  loadAnalytics();
}

async function loadAnalyticsStats() {
  try {
    const response = await fetch(`/admin/stats/analytics?range=${currentTimeRange}`);
    const data = await response.json();
    
    document.getElementById('totalRequests').textContent = data.totalRequests || 0;
    document.getElementById('successRequests').textContent = data.successRequests || 0;
    document.getElementById('failedRequests').textContent = data.failedRequests || 0;
    document.getElementById('avgResponseTime').textContent = (data.avgResponseTime || 0) + 'ms';
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
}

let requestTrendChart = null;
let modelDistributionChart = null;

async function loadCharts() {
  try {
    const response = await fetch(`/admin/stats/charts?range=${currentTimeRange}`);
    const data = await response.json();
    
    // 请求量趋势图
    const trendCtx = document.getElementById('requestTrendChart').getContext('2d');
    if (requestTrendChart) {
      requestTrendChart.destroy();
    }
    requestTrendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: data.trendLabels || [],
        datasets: [{
          label: '请求数',
          data: data.trendData || [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    
    // 模型使用分布饼图
    const distCtx = document.getElementById('modelDistributionChart').getContext('2d');
    if (modelDistributionChart) {
      modelDistributionChart.destroy();
    }
    modelDistributionChart = new Chart(distCtx, {
      type: 'pie',
      data: {
        labels: data.modelLabels || [],
        datasets: [{
          data: data.modelData || [],
          backgroundColor: [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
            '#ec4899'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  } catch (error) {
    console.error('加载图表失败:', error);
  }
}

async function loadModelStats() {
  try {
    const response = await fetch(`/admin/stats/accounts?range=${currentTimeRange}`);
    const data = await response.json();
    
    const tbody = document.getElementById('accountStatsTable');
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">暂无数据</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.map(account => `
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="py-4 px-4 text-sm font-medium text-gray-900">${escapeHtml(account.name)}</td>
        <td class="py-4 px-4 text-sm text-gray-600">${account.requests}</td>
        <td class="py-4 px-4">
          <span class="text-sm font-medium ${account.successRate >= 95 ? 'text-green-600' : account.successRate >= 80 ? 'text-yellow-600' : 'text-red-600'}">
            ${account.successRate}%
          </span>
        </td>
        <td class="py-4 px-4 text-sm text-gray-600">${account.avgResponseTime}ms</td>
        <td class="py-4 px-4 text-sm text-gray-500">${account.lastUsed ? new Date(account.lastUsed).toLocaleString('zh-CN') : '-'}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('加载账号统计失败:', error);
  }
}

async function loadLogs() {
  try {
    const response = await fetch(`/admin/stats/logs?limit=50&range=${currentTimeRange}`);
    const data = await response.json();
    
    const tbody = document.getElementById('logsTable');
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">暂无日志</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.map(log => `
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="py-3 px-4 text-xs text-gray-600">${new Date(log.created_at).toLocaleString('zh-CN')}</td>
        <td class="py-3 px-4 text-xs text-gray-600">${log.api_key_name || log.api_key_id || '-'}</td>
        <td class="py-3 px-4 text-xs text-gray-600">${escapeHtml(log.model || '-')}</td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${log.status_code >= 200 && log.status_code < 300 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
            ${log.status_code}
          </span>
        </td>
        <td class="py-3 px-4 text-xs text-gray-600">${log.response_time || '-'}ms</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('加载日志失败:', error);
  }
}

// ==================== 工具函数 ====================

async function handleLogout() {
  if (!confirm('确定要退出登录吗？')) return;
  
  try {
    await fetch('/admin/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
  } catch (error) {
    window.location.href = '/admin/login.html';
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('已复制到剪贴板！');
  }).catch(() => {
    alert('复制失败，请手动复制');
  });
}

// ==================== 负载均衡策略管理 ====================

async function loadLoadBalanceStrategy() {
  try {
    const response = await fetch('/admin/settings/load-balance-strategy');
    const data = await response.json();
    
    const select = document.getElementById('loadBalanceStrategy');
    if (select && data.strategy) {
      select.value = data.strategy;
    }
  } catch (error) {
    console.error('加载负载均衡策略失败:', error);
  }
}

async function changeLoadBalanceStrategy() {
  const select = document.getElementById('loadBalanceStrategy');
  const strategy = select.value;
  
  try {
    const response = await fetch('/admin/settings/load-balance-strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('负载均衡策略已更新为：' + (strategy === 'round-robin' ? '轮询' : strategy === 'random' ? '随机' : '最少使用'));
    } else {
      alert('更新失败: ' + (data.error || '未知错误'));
    }
  } catch (error) {
    alert('更新失败: ' + error.message);
  }
}

// ==================== 修改密码 ====================

function showChangePasswordModal() {
  document.getElementById('changePasswordModal').classList.remove('hidden');
}

function closeChangePasswordModal() {
  document.getElementById('changePasswordModal').classList.add('hidden');
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
}

async function handleChangePassword(event) {
  event.preventDefault();
  
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (newPassword !== confirmPassword) {
    alert('两次输入的新密码不一致');
    return;
  }
  
  if (newPassword.length < 6) {
    alert('密码长度至少 6 位');
    return;
  }
  
  try {
    const response = await fetch('/admin/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: currentPassword, newPassword })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('密码修改成功，请重新登录');
      closeChangePasswordModal();
      window.location.href = '/admin/login.html';
    } else {
      alert('修改失败: ' + (data.error || '未知错误'));
    }
  } catch (error) {
    alert('修改失败: ' + error.message);
  }
}

// ==================== 工具函数 ====================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
