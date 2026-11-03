import pool from '../config/db.js';

function cleanScreenData(input) {
  return {
    slug: String(input.slug || '').trim().toLowerCase(),
    name: String(input.name || '').trim(),
    organization_id: input.organization_id ? Number(input.organization_id) : null,
    sheet_url: String(input.sheet_url || input.sheetUrl || '').trim(),
    sheet_name: String(input.sheet_name || input.sheetName || 'LichHen').trim(),
    mode: input.mode === 'fixed' ? 'fixed' : 'auto',
    page_size: Math.max(1, Number(input.page_size || input.pageSize) || 6),
    min_row_h: Math.max(30, Number(input.min_row_h || input.minRowH) || 70),
    interval_sec: Math.max(2, Number(input.interval_sec || input.interval) || 10),
    refresh_sec: Math.max(10, Number(input.refresh_sec || input.refresh) || 60),
    anim: ['slide', 'fade', 'none'].includes(input.anim) ? input.anim : 'slide',
    date_mode: ['today', 'date', 'all'].includes(input.date_mode || input.dateMode) ? (input.date_mode || input.dateMode) : 'today',
    fixed_date: String(input.fixed_date || input.date || '').trim(),
    sort_time: input.sort_time !== undefined ? Boolean(input.sort_time) : (input.sortTime !== undefined ? Boolean(input.sortTime) : true),
    title: String(input.title || 'KHÁCH HÀNG ĐẶT LỊCH HẸN').trim(),
    date_label: String(input.date_label || input.dateLabel || 'NGÀY:').trim(),
    logo: String(input.logo || '').trim(),
    title_font_size: Math.max(12, Number(input.title_font_size || input.titleFontSize) || 48),
    date_font_size: Math.max(10, Number(input.date_font_size || input.dateFontSize) || 31),
    data_font_size: Math.max(10, Number(input.data_font_size || input.dataFontSize) || 24),
    color_head: input.color_head || input.colorHead || '#4472c4',
    color1: input.color1 || '#cfd5ea',
    color2: input.color2 || '#e9ebf5',
    color_text: input.color_text || input.colorText || '#00529c',
    color_title: input.color_title || input.colorTitle || '#ff0000',
    empty_message: String(input.empty_message || input.emptyMessage || 'Hôm nay chưa có lịch hẹn').trim(),
    load_error_message: String(input.load_error_message || input.loadErrorMessage || 'Không thể tải dữ liệu từ Google Sheet').trim()
  };
}

export async function getPublicScreen(req, res) {
  try {
    const { slug } = req.params;
    const cleanSlug = String(slug).trim().toLowerCase();

    const queryText = `
      SELECT s.*, o.name as organization_name, o.code as organization_code
      FROM screens s
      LEFT JOIN organizations o ON s.organization_id = o.id
      WHERE s.slug = $1;
    `;
    const { rows } = await pool.query(queryText, [cleanSlug]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Đường dẫn màn hình không tồn tại' });
    }

    const s = rows[0];
    return res.json({
      ...s,
      sheetUrl: s.sheet_url,
      sheetName: s.sheet_name,
      pageSize: s.page_size,
      minRowH: s.min_row_h,
      interval: s.interval_sec,
      refresh: s.refresh_sec,
      dateMode: s.date_mode,
      date: s.fixed_date,
      sortTime: s.sort_time,
      dateLabel: s.date_label,
      titleFontSize: s.title_font_size,
      dateFontSize: s.date_font_size,
      dataFontSize: s.data_font_size,
      colorHead: s.color_head,
      colorText: s.color_text,
      colorTitle: s.color_title,
      emptyMessage: s.empty_message,
      loadErrorMessage: s.load_error_message
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin màn hình công khai:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy cấu hình màn hình' });
  }
}

export async function getAdminScreens(req, res) {
  try {
    const user = req.user;
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'id',
      order = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const allowedSort = {
      id: 's.id',
      name: 's.name',
      slug: 's.slug',
      created_at: 's.created_at',
      sheet_name: 's.sheet_name',
      organization_name: 'o.name'
    };
    const sortField = allowedSort[sortBy] || 's.id';
    const sortOrder = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];

    if (user.role !== 'ADMIN') {
      const allowedOrgs = user.org_ids.length > 0 ? user.org_ids : [-1];
      params.push(allowedOrgs);
      conditions.push(`(s.organization_id = ANY($${params.length}::int[]) OR s.organization_id IS NULL)`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      conditions.push(`(
        unaccent(s.name) ILIKE unaccent($${searchIdx}) OR s.name ILIKE $${searchIdx} OR
        unaccent(s.slug) ILIKE unaccent($${searchIdx}) OR s.slug ILIKE $${searchIdx} OR
        unaccent(COALESCE(s.sheet_name, '')) ILIKE unaccent($${searchIdx}) OR
        unaccent(COALESCE(o.name, '')) ILIKE unaccent($${searchIdx})
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total Count
    const countQuery = `
      SELECT COUNT(*)
      FROM screens s
      LEFT JOIN organizations o ON s.organization_id = o.id
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
      SELECT s.*, o.name as organization_name, o.code as organization_code
      FROM screens s
      LEFT JOIN organizations o ON s.organization_id = o.id
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const { rows } = await pool.query(dataQuery, params);
    const mapped = rows.map(s => ({
      ...s,
      sheetUrl: s.sheet_url,
      sheetName: s.sheet_name,
      pageSize: s.page_size,
      minRowH: s.min_row_h,
      interval: s.interval_sec,
      refresh: s.refresh_sec,
      dateMode: s.date_mode,
      date: s.fixed_date,
      sortTime: s.sort_time,
      dateLabel: s.date_label,
      titleFontSize: s.title_font_size,
      dateFontSize: s.date_font_size,
      dataFontSize: s.data_font_size,
      colorHead: s.color_head,
      colorText: s.color_text,
      colorTitle: s.color_title,
      emptyMessage: s.empty_message,
      loadErrorMessage: s.load_error_message
    }));

    return res.json({
      data: mapped,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách màn hình quản trị:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách màn hình' });
  }
}

export async function createScreen(req, res) {
  try {
    const user = req.user;
    const clean = cleanScreenData(req.body);

    if (!clean.slug || !clean.name) {
      return res.status(400).json({ error: 'Vui lòng điền Tên màn hình và Đường dẫn slug' });
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean.slug) || ['admin', 'api', 'assets'].includes(clean.slug)) {
      return res.status(400).json({ error: 'Đường dẫn chỉ gồm chữ thường, số và dấu gạch ngang' });
    }

    if (user.role !== 'ADMIN' && clean.organization_id && !user.org_ids.includes(clean.organization_id)) {
      return res.status(403).json({ error: 'Bạn không có quyền tạo màn hình cho đơn vị này' });
    }

    const check = await pool.query('SELECT id FROM screens WHERE slug = $1', [clean.slug]);
    if (check.rows.length > 0) {
      return res.status(409).json({ error: `Đường dẫn '/${clean.slug}' đã tồn tại` });
    }

    const insertQuery = `
      INSERT INTO screens (
        organization_id, slug, name, sheet_url, sheet_name, mode, page_size, min_row_h,
        interval_sec, refresh_sec, anim, date_mode, fixed_date, sort_time, title, date_label,
        logo, title_font_size, date_font_size, data_font_size, color_head, color1, color2,
        color_text, color_title, empty_message, load_error_message
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      ) RETURNING *;
    `;
    const { rows } = await pool.query(insertQuery, [
      clean.organization_id, clean.slug, clean.name, clean.sheet_url, clean.sheet_name, clean.mode,
      clean.page_size, clean.min_row_h, clean.interval_sec, clean.refresh_sec, clean.anim,
      clean.date_mode, clean.fixed_date, clean.sort_time, clean.title, clean.date_label,
      clean.logo, clean.title_font_size, clean.date_font_size, clean.data_font_size,
      clean.color_head, clean.color1, clean.color2, clean.color_text, clean.color_title,
      clean.empty_message, clean.load_error_message
    ]);

    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Lỗi tạo màn hình:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi tạo màn hình' });
  }
}

export async function updateScreen(req, res) {
  try {
    const { slug } = req.params;
    const user = req.user;
    const clean = cleanScreenData(req.body);

    const existingRes = await pool.query('SELECT * FROM screens WHERE slug = $1', [slug]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy màn hình' });
    }
    const screen = existingRes.rows[0];

    if (user.role !== 'ADMIN' && screen.organization_id && !user.org_ids.includes(screen.organization_id)) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa màn hình của đơn vị này' });
    }

    if (!clean.slug || !clean.name) {
      return res.status(400).json({ error: 'Vui lòng điền Tên màn hình và Đường dẫn slug' });
    }

    if (clean.slug !== screen.slug) {
      const check = await pool.query('SELECT id FROM screens WHERE slug = $1 AND id != $2', [clean.slug, screen.id]);
      if (check.rows.length > 0) {
        return res.status(409).json({ error: `Đường dẫn '/${clean.slug}' đã tồn tại` });
      }
    }

    const updateQuery = `
      UPDATE screens
      SET organization_id = $1, slug = $2, name = $3, sheet_url = $4, sheet_name = $5,
          mode = $6, page_size = $7, min_row_h = $8, interval_sec = $9, refresh_sec = $10,
          anim = $11, date_mode = $12, fixed_date = $13, sort_time = $14, title = $15,
          date_label = $16, logo = $17, title_font_size = $18, date_font_size = $19,
          data_font_size = $20, color_head = $21, color1 = $22, color2 = $23,
          color_text = $24, color_title = $25, empty_message = $26, load_error_message = $27,
          updated_at = NOW()
      WHERE id = $28
      RETURNING *;
    `;
    const { rows } = await pool.query(updateQuery, [
      clean.organization_id, clean.slug, clean.name, clean.sheet_url, clean.sheet_name, clean.mode,
      clean.page_size, clean.min_row_h, clean.interval_sec, clean.refresh_sec, clean.anim,
      clean.date_mode, clean.fixed_date, clean.sort_time, clean.title, clean.date_label,
      clean.logo, clean.title_font_size, clean.date_font_size, clean.data_font_size,
      clean.color_head, clean.color1, clean.color2, clean.color_text, clean.color_title,
      clean.empty_message, clean.load_error_message, screen.id
    ]);

    return res.json(rows[0]);
  } catch (error) {
    console.error('Lỗi cập nhật màn hình:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi cập nhật màn hình' });
  }
}

export async function deleteScreen(req, res) {
  try {
    const { slug } = req.params;
    const user = req.user;

    const existingRes = await pool.query('SELECT * FROM screens WHERE slug = $1', [slug]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy màn hình' });
    }
    const screen = existingRes.rows[0];

    if (user.role !== 'ADMIN' && screen.organization_id && !user.org_ids.includes(screen.organization_id)) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa màn hình của đơn vị này' });
    }

    await pool.query('DELETE FROM screens WHERE id = $1', [screen.id]);
    return res.json({ message: 'Xóa màn hình thành công' });
  } catch (error) {
    console.error('Lỗi xóa màn hình:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi xóa màn hình' });
  }
}
