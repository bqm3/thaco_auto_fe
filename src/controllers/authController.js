import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { signToken } from '../utils/jwt.js';

export async function login(req, res) {
  try {
    const { username = '', password = '' } = req.body;
    const cleanUsername = String(username).trim();

    if (!cleanUsername || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const userQuery = `
      SELECT u.id, u.username, u.password_hash, u.full_name, u.email, u.phone, u.is_active,
             r.code as role_code, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE LOWER(u.username) = LOWER($1);
    `;
    const userRes = await pool.query(userQuery, [cleanUsername]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Tài khoản đã bị tạm khóa. Vui lòng liên hệ Admin.' });
    }

    const isMatch = await bcrypt.compare(String(password), user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    // Query user's assigned organizations
    const orgsQuery = `
      SELECT o.id, o.code, o.name
      FROM user_organizations uo
      JOIN organizations o ON uo.organization_id = o.id
      WHERE uo.user_id = $1
      ORDER BY o.name ASC;
    `;
    const orgsRes = await pool.query(orgsQuery, [user.id]);
    const assignedOrgs = orgsRes.rows;

    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role_code
    });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role_code,
        role_name: user.role_name,
        assigned_orgs: assignedOrgs
      }
    });
  } catch (error) {
    console.error('Lỗi khi đăng nhập (Login error):', error);
    return res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập' });
  }
}

export async function getMe(req, res) {
  try {
    return res.json({ user: req.user });
  } catch (error) {
    console.error('Lỗi lấy thông tin cá nhân:', error);
    return res.status(500).json({ error: 'Lỗi lấy thông tin cá nhân' });
  }
}

export async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu cũ và mật khẩu mới' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
    }

    const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    const isMatch = await bcrypt.compare(oldPassword, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu cũ không chính xác' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

    return res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    return res.status(500).json({ error: 'Lỗi hệ thống khi đổi mật khẩu' });
  }
}
