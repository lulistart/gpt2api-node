import express from 'express';
import { User } from '../models/index.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = User.findByUsername(username);

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValid = await User.verifyPassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 使用 session 存储用户信息
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 登出
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('登出失败:', err);
      return res.status(500).json({ error: '登出失败' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// 检查认证状态
router.get('/check', authenticateAdmin, (req, res) => {
  res.json({ authenticated: true });
});

// 获取当前用户信息
router.get('/profile', authenticateAdmin, (req, res) => {
  const user = User.findById(req.session.userId);
  
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  res.json({
    id: user.id,
    username: user.username,
    created_at: user.created_at
  });
});

// 修改密码
router.post('/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少为 6 位' });
    }

    const user = User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const isValid = await User.verifyPassword(oldPassword, user.password);

    if (!isValid) {
      return res.status(401).json({ error: '旧密码错误' });
    }

    await User.updatePassword(user.id, newPassword);

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

export default router;
