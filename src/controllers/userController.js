import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

export async function getRoles(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM roles ORDER BY id ASC;');
    return res.json(rows);
  } catch (error) {
    console.error('Lỗi lấy danh sách vai trò:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách vai trò' });
  }
}

export async function getUsers(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      sortBy = 'id',
      order = 'asc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const allowedSort = {
      id: 'u.id',
      username: 'u.username',
      full_name: 'u.full_name',
      created_at: 'u.created_at',
      role_code: 'r.code',
      is_active: 'u.is_active'
    };
    const sortField = allowedSort[sortBy] || 'u.id';
    const sortOrder = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const conditions = [];
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      conditions.push(`(
        unaccent(u.username) ILIKE unaccent($${searchIdx}) OR u.username ILIKE $${searchIdx} OR
        unaccent(u.full_name) ILIKE unaccent($${searchIdx}) OR u.full_name ILIKE $${searchIdx} OR
        COALESCE(u.email, '') ILIKE $${searchIdx} OR
        COALESCE(u.phone, '') ILIKE $${searchIdx}
      )`);
    }

    if (role && role.trim()) {
      params.push(role.trim().toUpperCase());
      conditions.push(`r.code = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total Count
    const countQuery = `
      SELECT COUNT(*)
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ${whereClause};
    `;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Data Query
    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataQuery = `
      SELECT u.id, u.username, u.full_name, u.email, u.phone, u.is_active, u.created_at,
             r.id AS role_id, r.code AS role_code, r.name AS role_name,
             COALESCE(
               (
                 SELECT json_agg(json_build_object('id', o.id, 'code', o.code, 'name', o.name))
                 FROM user_organizations uo
                 JOIN organizations o ON uo.organization_id = o.id
                 WHERE uo.user_id = u.id
               ),
               '[]'::json
             ) AS assigned_orgs
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;
    const { rows } = await pool.query(dataQuery, params);

    return res.json({
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách người dùng:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách người dùng' });
  }
}

export async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const queryText = `
      SELECT u.id, u.username, u.full_name, u.email, u.phone, u.is_active, u.created_at,
             r.id AS role_id, r.code AS role_code, r.name AS role_name,
             COALESCE(
               (
                 SELECT json_agg(json_build_object('id', o.id, 'code', o.code, 'name', o.name))
                 FROM user_organizations uo
                 JOIN organizations o ON uo.organization_id = o.id
                 WHERE uo.user_id = u.id
               ),
               '[]'::json
             ) AS assigned_orgs
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1;
    `;
    const { rows } = await pool.query(queryText, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    return res.json(rows[0]);
  } catch (error) {
    console.error('Lỗi lấy thông tin người dùng:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy thông tin người dùng' });
  }
}

export async function createUser(req, res) {
  const client = await pool.connect();
  try {
    const { username, password, full_name, email, phone, role_id, org_ids = [] } = req.body;

    if (!username || !password || !full_name || !role_id) {
      return res.status(400).json({ error: 'Vui lòng điền đủ Tên đăng nhập, Mật khẩu, Họ tên và Vai trò' });
    }

    const cleanUsername = String(username).trim().toLowerCase();

    // Check duplicate
    const checkUser = await client.query('SELECT id FROM users WHERE LOWER(username) = $1', [cleanUsername]);
    if (checkUser.rows.length > 0) {
      return res.status(409).json({ error: `Tên đăng nhập '${cleanUsername}' đã tồn tại` });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');

    const insertUserQuery = `
      INSERT INTO users (username, password_hash, full_name, email, phone, role_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, full_name, email, phone, role_id, created_at;
    `;
    const userRes = await client.query(insertUserQuery, [
      cleanUsername,
      passwordHash,
      String(full_name).trim(),
      email ? String(email).trim() : null,
      phone ? String(phone).trim() : null,
      Number(role_id)
    ]);
    const newUser = userRes.rows[0];

    // Assign organizations if any
    if (Array.isArray(org_ids) && org_ids.length > 0) {
      for (const orgId of org_ids) {
        await client.query(`
          INSERT INTO user_organizations (user_id, organization_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, [newUser.id, orgId]);
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({ message: 'Tạo tài khoản thành công', user: newUser });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Lỗi tạo người dùng:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi tạo người dùng' });
  } finally {
    client.release();
  }
}

export async function updateUser(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { full_name, email, phone, role_id, is_active, password, org_ids } = req.body;

    const check = await client.query('SELECT id, username FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng cần sửa' });
    }

    await client.query('BEGIN');

    // Update fields
    let updateQuery = `
      UPDATE users
      SET full_name = COALESCE($1, full_name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          role_id = COALESCE($4, role_id),
          is_active = COALESCE($5, is_active),
          updated_at = NOW()
    `;
    const params = [
      full_name ? String(full_name).trim() : null,
      email !== undefined ? (email ? String(email).trim() : null) : null,
      phone !== undefined ? (phone ? String(phone).trim() : null) : null,
      role_id ? Number(role_id) : null,
      typeof is_active === 'boolean' ? is_active : null
    ];

    if (password && String(password).trim().length >= 6) {
      const hash = await bcrypt.hash(String(password).trim(), 10);
      updateQuery += `, password_hash = $6 WHERE id = $7 RETURNING *;`;
      params.push(hash, id);
    } else {
      updateQuery += ` WHERE id = $6 RETURNING *;`;
      params.push(id);
    }

    const { rows } = await client.query(updateQuery, params);

    // Update assigned organizations if provided
    if (Array.isArray(org_ids)) {
      await client.query('DELETE FROM user_organizations WHERE user_id = $1', [id]);
      for (const orgId of org_ids) {
        await client.query(`
          INSERT INTO user_organizations (user_id, organization_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, [id, orgId]);
      }
    }

    await client.query('COMMIT');
    return res.json({ message: 'Cập nhật tài khoản thành công', user: rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Lỗi cập nhật người dùng:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi cập nhật người dùng' });
  } finally {
    client.release();
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'Bạn không thể tự xóa tài khoản của chính mình' });
    }

    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    return res.json({ message: 'Xóa người dùng thành công' });
  } catch (error) {
    console.error('Lỗi xóa người dùng:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi xóa người dùng' });
  }
}
