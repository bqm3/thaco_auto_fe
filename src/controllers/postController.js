import pool from '../config/db.js';
import { slugify } from '../utils/slugify.js';

export async function getPosts(req, res) {
  try {
    const user = req.user;
    const {
      page = 1,
      limit = 10,
      organization_id,
      search,
      status,
      sortBy = 'created_at',
      order = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const allowedSort = {
      id: 'p.id',
      title: 'p.title',
      created_at: 'p.created_at',
      org_name: 'o.name',
      status: 'p.status'
    };
    const sortField = allowedSort[sortBy] || 'p.created_at';
    const sortOrder = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];

    // Role-based filtering
    if (user.role !== 'ADMIN') {
      const allowedOrgs = user.org_ids.length > 0 ? user.org_ids : [-1];
      params.push(allowedOrgs);
      conditions.push(`p.organization_id = ANY($${params.length}::int[])`);
    }

    // Specific organization filter
    if (organization_id) {
      const orgIdNum = Number(organization_id);
      if (user.role !== 'ADMIN' && !user.org_ids.includes(orgIdNum)) {
        return res.status(403).json({ error: 'Bạn không có quyền xem bài viết của đơn vị này' });
      }
      params.push(orgIdNum);
      conditions.push(`p.organization_id = $${params.length}`);
    }

    // Status filter
    if (status) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    // Search query with unaccent
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      conditions.push(`(
        unaccent(p.title) ILIKE unaccent($${searchIdx}) OR p.title ILIKE $${searchIdx} OR
        unaccent(COALESCE(p.summary, '')) ILIKE unaccent($${searchIdx}) OR
        unaccent(p.content) ILIKE unaccent($${searchIdx})
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count
    const countQuery = `
      SELECT COUNT(*)
      FROM posts p
      JOIN organizations o ON p.organization_id = o.id
      ${whereClause};
    `;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Data query
    params.push(limitNum);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataQuery = `
      SELECT p.id, p.title, p.slug, p.summary, p.content, p.thumbnail, p.status,
             p.created_at, p.updated_at,
             o.id AS organization_id, o.code AS org_code, o.name AS org_name,
             u.id AS author_id, u.full_name AS author_name, u.username AS author_username
      FROM posts p
      JOIN organizations o ON p.organization_id = o.id
      JOIN users u ON p.author_id = u.id
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
    console.error('Lỗi lấy danh sách bài viết:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách bài viết' });
  }
}

export async function getPostById(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const queryText = `
      SELECT p.id, p.title, p.slug, p.summary, p.content, p.thumbnail, p.status,
             p.created_at, p.updated_at,
             o.id AS organization_id, o.code AS org_code, o.name AS org_name,
             u.id AS author_id, u.full_name AS author_name, u.username AS author_username
      FROM posts p
      JOIN organizations o ON p.organization_id = o.id
      JOIN users u ON p.author_id = u.id
      WHERE p.id = $1;
    `;
    const { rows } = await pool.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết' });
    }

    const post = rows[0];

    if (user.role !== 'ADMIN' && !user.org_ids.includes(post.organization_id)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập bài viết của đơn vị này' });
    }

    return res.json(post);
  } catch (error) {
    console.error('Lỗi lấy chi tiết bài viết:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy chi tiết bài viết' });
  }
}

export async function createPost(req, res) {
  try {
    const user = req.user;
    const { title, summary, content, organization_id, thumbnail, status = 'published' } = req.body;

    if (!title || !content || !organization_id) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ Tiêu đề, Nội dung và Đơn vị trực thuộc' });
    }

    const orgIdNum = Number(organization_id);

    if (user.role !== 'ADMIN' && !user.org_ids.includes(orgIdNum)) {
      return res.status(403).json({ error: 'Bạn không có quyền tạo bài viết cho đơn vị này' });
    }

    const orgCheck = await pool.query('SELECT id, name FROM organizations WHERE id = $1', [orgIdNum]);
    if (orgCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Đơn vị không tồn tại' });
    }

    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = `post-${Date.now()}`;
    let uniqueSlug = baseSlug;

    const slugCheck = await pool.query('SELECT id FROM posts WHERE slug = $1', [uniqueSlug]);
    if (slugCheck.rows.length > 0) {
      uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
    }

    const insertQuery = `
      INSERT INTO posts (organization_id, author_id, title, slug, summary, content, thumbnail, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const { rows } = await pool.query(insertQuery, [
      orgIdNum,
      user.id,
      String(title).trim(),
      uniqueSlug,
      summary ? String(summary).trim() : null,
      String(content),
      thumbnail ? String(thumbnail).trim() : null,
      status || 'published'
    ]);

    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Lỗi tạo bài viết:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi tạo bài viết' });
  }
}

export async function updatePost(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    const { title, summary, content, organization_id, thumbnail, status } = req.body;

    const existing = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết cần sửa' });
    }

    const post = existing.rows[0];

    if (user.role !== 'ADMIN' && !user.org_ids.includes(post.organization_id)) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa bài viết của đơn vị này' });
    }

    const newOrgId = organization_id ? Number(organization_id) : post.organization_id;
    if (user.role !== 'ADMIN' && !user.org_ids.includes(newOrgId)) {
      return res.status(403).json({ error: 'Bạn không có quyền chuyển bài viết sang đơn vị này' });
    }

    let slug = post.slug;
    if (title && title.trim() !== post.title) {
      let baseSlug = slugify(title);
      const slugCheck = await pool.query('SELECT id FROM posts WHERE slug = $1 AND id != $2', [baseSlug, id]);
      if (slugCheck.rows.length > 0) {
        slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
      } else {
        slug = baseSlug;
      }
    }

    const updateQuery = `
      UPDATE posts
      SET title = COALESCE($1, title),
          slug = $2,
          summary = COALESCE($3, summary),
          content = COALESCE($4, content),
          organization_id = $5,
          thumbnail = COALESCE($6, thumbnail),
          status = COALESCE($7, status),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *;
    `;
    const { rows } = await pool.query(updateQuery, [
      title ? String(title).trim() : null,
      slug,
      summary !== undefined ? (summary ? String(summary).trim() : null) : null,
      content ? String(content) : null,
      newOrgId,
      thumbnail !== undefined ? (thumbnail ? String(thumbnail).trim() : null) : null,
      status || null,
      id
    ]);

    return res.json(rows[0]);
  } catch (error) {
    console.error('Lỗi cập nhật bài viết:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi cập nhật bài viết' });
  }
}

export async function deletePost(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const existing = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết cần xóa' });
    }

    const post = existing.rows[0];

    if (user.role !== 'ADMIN' && !user.org_ids.includes(post.organization_id)) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa bài viết của đơn vị này' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    return res.json({ message: 'Xóa bài viết thành công' });
  } catch (error) {
    console.error('Lỗi xóa bài viết:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi xóa bài viết' });
  }
}
