import pool from '../config/db.js';

export async function getOrganizations(req, res) {
  try {
    const user = req.user;
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'name',
      order = 'asc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    // Allowed sort columns
    const allowedSortColumns = {
      id: 'o.id',
      code: 'o.code',
      name: 'o.name',
      created_at: 'o.created_at',
      post_count: 'post_count',
      screen_count: 'screen_count'
    };
    const sortField = allowedSortColumns[sortBy] || 'o.name';
    const sortOrder = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const conditions = [];
    const params = [];

    // Role-based filtering
    if (user.role !== 'ADMIN') {
      params.push(user.org_ids.length > 0 ? user.org_ids : [-1]);
      conditions.push(`o.id = ANY($${params.length}::int[])`);
    }

    // Search keyword with unaccent support
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      conditions.push(`(
        unaccent(o.name) ILIKE unaccent($${searchIdx}) OR o.name ILIKE $${searchIdx} OR
        unaccent(o.code) ILIKE unaccent($${searchIdx}) OR o.code ILIKE $${searchIdx} OR
        unaccent(COALESCE(o.address, '')) ILIKE unaccent($${searchIdx}) OR
        unaccent(COALESCE(o.description, '')) ILIKE unaccent($${searchIdx}) OR
        COALESCE(o.phone, '') ILIKE $${searchIdx} OR
        COALESCE(o.email, '') ILIKE $${searchIdx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countQuery = `SELECT COUNT(*) FROM organizations o ${whereClause};`;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Data query
    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataQuery = `
      SELECT o.id, o.code, o.name, o.address, o.phone, o.email, o.description, o.is_active, o.created_at,
             (SELECT COUNT(*) FROM posts p WHERE p.organization_id = o.id)::int AS post_count,
             (SELECT COUNT(*) FROM screens s WHERE s.organization_id = o.id)::int AS screen_count,
             (
               SELECT json_agg(json_build_object('id', u.id, 'full_name', u.full_name, 'username', u.username))
               FROM user_organizations uo
               JOIN users u ON uo.user_id = u.id
               WHERE uo.organization_id = o.id
             ) AS assigned_staff
      FROM organizations o
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
    console.error('Lỗi lấy danh sách đơn vị:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách đơn vị' });
  }
}

export async function getOrganizationById(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== 'ADMIN' && !user.org_ids.includes(Number(id))) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập đơn vị này' });
    }

    const { rows } = await pool.query(`
      SELECT o.*,
             (SELECT COUNT(*) FROM posts p WHERE p.organization_id = o.id)::int AS post_count,
             (SELECT COUNT(*) FROM screens s WHERE s.organization_id = o.id)::int AS screen_count
      FROM organizations o
      WHERE o.id = $1;
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn vị' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('Lỗi lấy chi tiết đơn vị:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy chi tiết đơn vị' });
  }
}

export async function createOrganization(req, res) {
  try {
    const { code, name, address, phone, email, description } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Mã đơn vị và Tên đơn vị là bắt buộc' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const cleanName = String(name).trim();

    // Check duplicate code
    const check = await pool.query('SELECT id FROM organizations WHERE code = $1', [cleanCode]);
    if (check.rows.length > 0) {
      return res.status(409).json({ error: `Mã đơn vị '${cleanCode}' đã tồn tại` });
    }

    const insertQuery = `
      INSERT INTO organizations (code, name, address, phone, email, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const { rows } = await pool.query(insertQuery, [
      cleanCode,
      cleanName,
      address ? String(address).trim() : null,
      phone ? String(phone).trim() : null,
      email ? String(email).trim() : null,
      description ? String(description).trim() : null
    ]);

    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Lỗi tạo mới đơn vị:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi tạo đơn vị' });
  }
}

export async function updateOrganization(req, res) {
  try {
    const { id } = req.params;
    const { code, name, address, phone, email, description, is_active } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Mã đơn vị và Tên đơn vị là bắt buộc' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const cleanName = String(name).trim();

    // Check duplicate code if altered
    const check = await pool.query('SELECT id FROM organizations WHERE code = $1 AND id != $2', [cleanCode, id]);
    if (check.rows.length > 0) {
      return res.status(409).json({ error: `Mã đơn vị '${cleanCode}' đã được sử dụng bởi đơn vị khác` });
    }

    const updateQuery = `
      UPDATE organizations
      SET code = $1, name = $2, address = $3, phone = $4, email = $5,
          description = $6, is_active = COALESCE($7, is_active), updated_at = NOW()
      WHERE id = $8
      RETURNING *;
    `;
    const { rows } = await pool.query(updateQuery, [
      cleanCode,
      cleanName,
      address ? String(address).trim() : null,
      phone ? String(phone).trim() : null,
      email ? String(email).trim() : null,
      description ? String(description).trim() : null,
      typeof is_active === 'boolean' ? is_active : null,
      id
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn vị cần cập nhật' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('Lỗi cập nhật đơn vị:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi cập nhật đơn vị' });
  }
}

export async function deleteOrganization(req, res) {
  try {
    const { id } = req.params;

    const postCountRes = await pool.query('SELECT COUNT(*) FROM posts WHERE organization_id = $1', [id]);
    const postCount = parseInt(postCountRes.rows[0].count, 10);

    if (postCount > 0) {
      return res.status(400).json({
        error: `Đơn vị này đang có ${postCount} bài viết. Vui lòng chuyển hoặc xóa bài viết trước khi xóa đơn vị.`
      });
    }

    const { rowCount } = await pool.query('DELETE FROM organizations WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn vị cần xóa' });
    }

    return res.json({ message: 'Xóa đơn vị thành công' });
  } catch (error) {
    console.error('Lỗi xóa đơn vị:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi xóa đơn vị' });
  }
}
