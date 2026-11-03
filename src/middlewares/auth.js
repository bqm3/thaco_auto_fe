import { verifyToken } from '../utils/jwt.js';
import pool from '../config/db.js';

export async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)thaco_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Bạn chưa đăng nhập hoặc thiếu token' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
    }

    // Query user with role
    const userQuery = `
      SELECT u.id, u.username, u.full_name, u.email, u.phone, u.is_active,
             r.code as role_code, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1;
    `;
    const userRes = await pool.query(userQuery, [decoded.userId]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại trên hệ thống' });
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa' });
    }

    // Query assigned organizations
    const orgsQuery = `
      SELECT o.id, o.code, o.name
      FROM user_organizations uo
      JOIN organizations o ON uo.organization_id = o.id
      WHERE uo.user_id = $1;
    `;
    const orgsRes = await pool.query(orgsQuery, [user.id]);
    const assignedOrgs = orgsRes.rows;
    const orgIds = assignedOrgs.map(o => o.id);

    req.user = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role_code, // 'ADMIN' or 'STAFF'
      role_name: user.role_name,
      org_ids: orgIds,
      assigned_orgs: assignedOrgs
    };

    next();
  } catch (error) {
    console.error('Lỗi xác thực (Auth error):', error);
    return res.status(500).json({ error: 'Lỗi xác thực hệ thống' });
  }
}
