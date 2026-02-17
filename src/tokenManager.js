import fs from 'fs/promises';
import axios from 'axios';

// OpenAI OAuth 配置
const TOKEN_URL = 'https://auth.openai.com/oauth/token';
const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';

/**
 * Token 管理器
 */
class TokenManager {
  constructor(tokenFilePath) {
    this.tokenFilePath = tokenFilePath;
    this.tokenData = null;
  }

  /**
   * 从文件加载 token
   */
  async loadToken() {
    try {
      const data = await fs.readFile(this.tokenFilePath, 'utf-8');
      this.tokenData = JSON.parse(data);
      console.log(`✓ Token 加载成功: ${this.tokenData.email || this.tokenData.account_id}`);
      return this.tokenData;
    } catch (error) {
      throw new Error(`加载 token 文件失败: ${error.message}`);
    }
  }

  /**
   * 保存 token 到文件
   */
  async saveToken(tokenData) {
    try {
      this.tokenData = tokenData;
      await fs.writeFile(this.tokenFilePath, JSON.stringify(tokenData, null, 2), 'utf-8');
      console.log('✓ Token 已保存到文件');
    } catch (error) {
      console.error(`保存 token 文件失败: ${error.message}`);
    }
  }

  /**
   * 检查 token 是否过期
   */
  isTokenExpired() {
    if (!this.tokenData || !this.tokenData.expired) {
      return true;
    }
    const expireTime = new Date(this.tokenData.expired);
    const now = new Date();
    // 提前 5 分钟刷新
    return expireTime.getTime() - now.getTime() < 5 * 60 * 1000;
  }

  /**
   * 刷新 access token
   */
  async refreshToken() {
    if (!this.tokenData || !this.tokenData.refresh_token) {
      throw new Error('没有可用的 refresh_token');
    }

    console.log('正在刷新 token...');

    try {
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: this.tokenData.refresh_token,
        scope: 'openid profile email'
      });

      const response = await axios.post(TOKEN_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      const { access_token, refresh_token, id_token, expires_in } = response.data;

      // 更新 token 数据
      const newTokenData = {
        ...this.tokenData,
        access_token,
        refresh_token: refresh_token || this.tokenData.refresh_token,
        id_token: id_token || this.tokenData.id_token,
        expired: new Date(Date.now() + expires_in * 1000).toISOString(),
        last_refresh: new Date().toISOString()
      };

      await this.saveToken(newTokenData);
      console.log('✓ Token 刷新成功');

      return newTokenData;
    } catch (error) {
      const errorMsg = error.response?.data || error.message;
      throw new Error(`Token 刷新失败: ${JSON.stringify(errorMsg)}`);
    }
  }

  /**
   * 获取有效的 access token（自动刷新）
   */
  async getValidToken() {
    if (!this.tokenData) {
      await this.loadToken();
    }

    if (this.isTokenExpired()) {
      await this.refreshToken();
    }

    return this.tokenData.access_token;
  }

  /**
   * 获取 token 信息
   */
  getTokenInfo() {
    return {
      email: this.tokenData?.email,
      account_id: this.tokenData?.account_id,
      expired: this.tokenData?.expired,
      type: this.tokenData?.type
    };
  }
}

export default TokenManager;
