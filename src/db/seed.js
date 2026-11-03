import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

export async function runSeeds() {
  console.log('🌱 Đang khởi tạo dữ liệu mẫu (seeding)...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Seed Roles
    console.log('- Đang seed bảng roles...');
    const rolesQuery = `
      INSERT INTO roles (code, name, description)
      VALUES 
        ('ADMIN', 'Quản trị viên', 'Toàn quyền quản trị đơn vị, nhân sự, posts và màn hình'),
        ('STAFF', 'Nhân viên', 'Quản lý các đơn vị và bài viết được phân quyền')
      ON CONFLICT (code) DO UPDATE 
      SET name = EXCLUDED.name, description = EXCLUDED.description
      RETURNING id, code;
    `;
    const rolesRes = await client.query(rolesQuery);
    const roleMap = {};
    for (const r of rolesRes.rows) {
      roleMap[r.code] = r.id;
    }

    // 2. Seed Organizations
    console.log('- Đang seed bảng organizations...');
    const orgs = [
      {
        code: 'HP01',
        name: 'THACO AUTO Hải Phòng - Chi nhánh Lê Hồng Phong',
        address: 'Số 336 Lê Hồng Phong, Đằng Lâm, Hải An, Hải Phòng',
        phone: '0225 3828 111',
        email: 'hp-lehongphong@thaco.com.vn',
        description: 'Trung tâm dịch vụ & showroom trọng điểm Lê Hồng Phong'
      },
      {
        code: 'HP02',
        name: 'THACO AUTO Hải Phòng - Chi nhánh Thủy Nguyên',
        address: 'Đường 359, TT Núi Đèo, Thủy Nguyên, Hải Phòng',
        phone: '0225 3828 222',
        email: 'hp-thuynguyen@thaco.com.vn',
        description: 'Chi nhánh bán hàng và dịch vụ bảo hành khu vực Thủy Nguyên'
      },
      {
        code: 'HP03',
        name: 'THACO AUTO Hải Phòng - Chi nhánh Kiến An',
        address: 'Số 15 Trần Tất Văn, Kiến An, Hải Phòng',
        phone: '0225 3828 333',
        email: 'hp-kienan@thaco.com.vn',
        description: 'Xưởng dịch vụ kỹ thuật cao Kiến An'
      }
    ];

    const orgMap = {};
    for (const org of orgs) {
      const res = await client.query(`
        INSERT INTO organizations (code, name, address, phone, email, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (code) DO UPDATE 
        SET name = EXCLUDED.name, address = EXCLUDED.address, phone = EXCLUDED.phone, email = EXCLUDED.email, description = EXCLUDED.description
        RETURNING id, code;
      `, [org.code, org.name, org.address, org.phone, org.email, org.description]);
      orgMap[res.rows[0].code] = res.rows[0].id;
    }

    // 3. Seed Users
    console.log('- Đang seed bảng users...');
    const adminPassHash = await bcrypt.hash('admin123', 10);
    const staffPassHash = await bcrypt.hash('123456', 10);

    const users = [
      {
        username: 'admin',
        password_hash: adminPassHash,
        full_name: 'Quản trị viên THACO HP',
        email: 'admin.hp@thaco.com.vn',
        phone: '0901234567',
        role_id: roleMap['ADMIN']
      },
      {
        username: 'nhanvien1',
        password_hash: staffPassHash,
        full_name: 'Nguyễn Văn An (NV Phụ trách HP01 & HP02)',
        email: 'nguyenvanan@thaco.com.vn',
        phone: '0912345678',
        role_id: roleMap['STAFF']
      },
      {
        username: 'nhanvien2',
        password_hash: staffPassHash,
        full_name: 'Trần Thị Bình (NV Phụ trách HP03)',
        email: 'tranthibinh@thaco.com.vn',
        phone: '0923456789',
        role_id: roleMap['STAFF']
      }
    ];

    const userMap = {};
    for (const u of users) {
      const res = await client.query(`
        INSERT INTO users (username, password_hash, full_name, email, phone, role_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (username) DO UPDATE 
        SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, email = EXCLUDED.email, phone = EXCLUDED.phone, role_id = EXCLUDED.role_id
        RETURNING id, username;
      `, [u.username, u.password_hash, u.full_name, u.email, u.phone, u.role_id]);
      userMap[res.rows[0].username] = res.rows[0].id;
    }

    // 4. Assign Organizations to Staff
    console.log('- Đang phân quyền đơn vị cho nhân viên (user_organizations)...');
    // Staff 1 (nhanvien1) -> HP01 and HP02
    await client.query(`
      INSERT INTO user_organizations (user_id, organization_id)
      VALUES ($1, $2), ($1, $3)
      ON CONFLICT DO NOTHING;
    `, [userMap['nhanvien1'], orgMap['HP01'], orgMap['HP02']]);

    // Staff 2 (nhanvien2) -> HP03
    await client.query(`
      INSERT INTO user_organizations (user_id, organization_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `, [userMap['nhanvien2'], orgMap['HP03']]);

    // 5. Seed Posts
    console.log('- Đang seed bảng posts...');
    const posts = [
      {
        organization_id: orgMap['HP01'],
        author_id: userMap['admin'],
        title: 'Chương trình bảo dưỡng định kỳ mùa đông 2026 tại Chi nhánh Lê Hồng Phong',
        slug: 'bao-duong-dinh-ky-mua-dong-2026-le-hong-phong',
        summary: 'Miễn phí kiểm tra 30 hạng mục và giảm 20% chi phí dầu máy nhớt cho tất cả các dòng xe du lịch Kia, Mazda, Peugeot.',
        content: '<p>THACO AUTO Hải Phòng trân trọng thông báo chương trình chăm sóc xe đặc biệt cho khách hàng đặt lịch hẹn trước...</p>',
        status: 'published'
      },
      {
        organization_id: orgMap['HP02'],
        author_id: userMap['nhanvien1'],
        title: 'Tri ân khách hàng dịch vụ tại Showroom Thủy Nguyên',
        slug: 'tri-an-khach-hang-dich-vu-thuy-nguyen',
        summary: 'Tặng phiếu rửa xe và quà tặng phụ kiện chính hãng khi làm bảo dưỡng cấp trung bình và lớn.',
        content: '<p>Nhằm nâng cao chất lượng phục vụ và tri ân quý khách hàng đã đồng hành cùng THACO AUTO Thủy Nguyên...</p>',
        status: 'published'
      },
      {
        organization_id: orgMap['HP03'],
        author_id: userMap['nhanvien2'],
        title: 'Quy trình tiếp nhận và đặt hẹn dịch vụ kỹ thuật cao Kiến An',
        slug: 'quy-trinh-tiep-nhan-hen-dich-vu-kien-an',
        summary: 'Hướng dẫn khách hàng đặt lịch hẹn online giúp tiết kiệm 50% thời gian chờ đợi.',
        content: '<p>Với hệ thống màn hình hiển thị trực quan thông tin đặt hẹn dịch vụ khách hàng có thể theo dõi tiến độ một cách minh bạch...</p>',
        status: 'published'
      }
    ];

    for (const post of posts) {
      const check = await client.query(`SELECT id FROM posts WHERE slug = $1`, [post.slug]);
      if (check.rows.length === 0) {
        await client.query(`
          INSERT INTO posts (organization_id, author_id, title, slug, summary, content, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [post.organization_id, post.author_id, post.title, post.slug, post.summary, post.content, post.status]);
      }
    }

    // 6. Seed Appointment Screens (migrated from config.json)
    console.log('- Đang seed bảng screens (màn hình hiển thị lịch hẹn)...');
    const screens = [
      {
        organization_id: orgMap['HP01'],
        slug: 'thaco-hai-phong-01',
        name: 'THACO Hải Phòng 01',
        sheet_url: 'https://docs.google.com/spreadsheets/d/1UXEL8KN-XNPi_Wr4wGDcT5hlT_Vv6ZaNxgLW2I__afc/edit?usp=sharing',
        sheet_name: 'LichHen',
        mode: 'auto',
        page_size: 6,
        min_row_h: 70,
        interval_sec: 15,
        refresh_sec: 60,
        anim: 'slide',
        date_mode: 'today',
        fixed_date: '',
        sort_time: true,
        title: 'KHÁCH HÀNG ĐẶT LỊCH HẸN',
        date_label: 'NGÀY:',
        logo: '',
        title_font_size: 48,
        date_font_size: 31,
        data_font_size: 24,
        color_head: '#4472c4',
        color1: '#cfd5ea',
        color2: '#e9ebf5',
        color_text: '#00529c',
        color_title: '#ff0000',
        empty_message: 'Hôm nay chưa có lịch hẹn',
        load_error_message: 'Không thể tải dữ liệu từ hệ thống'
      },
      {
        organization_id: orgMap['HP02'],
        slug: 'thaco-hai-phong-02',
        name: 'Thaco hải phòng 02',
        sheet_url: 'https://docs.google.com/spreadsheets/d/1GzvvuUYUdaEx78N8k9jFvoIdcK9roiwOYPe-ZYvKcKY/edit?gid=0#gid=0',
        sheet_name: '21/10/2026',
        mode: 'auto',
        page_size: 6,
        min_row_h: 70,
        interval_sec: 5,
        refresh_sec: 60,
        anim: 'slide',
        date_mode: 'today',
        fixed_date: '',
        sort_time: true,
        title: 'KHÁCH HÀNG ĐẶT LỊCH HẸN',
        date_label: 'NGÀY:',
        logo: '',
        title_font_size: 56,
        date_font_size: 40,
        data_font_size: 30,
        color_head: '#4472c4',
        color1: '#cfd5ea',
        color2: '#e9ebf5',
        color_text: '#00529c',
        color_title: '#012f5b',
        empty_message: 'Hôm nay chưa có lịch hẹn',
        load_error_message: 'Không thể tải dữ liệu từ Google Sheet'
      }
    ];

    for (const sc of screens) {
      await client.query(`
        INSERT INTO screens (
          organization_id, slug, name, sheet_url, sheet_name, mode, page_size, min_row_h,
          interval_sec, refresh_sec, anim, date_mode, fixed_date, sort_time, title, date_label,
          logo, title_font_size, date_font_size, data_font_size, color_head, color1, color2,
          color_text, color_title, empty_message, load_error_message
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        )
        ON CONFLICT (slug) DO UPDATE
        SET organization_id = EXCLUDED.organization_id,
            name = EXCLUDED.name,
            sheet_url = EXCLUDED.sheet_url,
            sheet_name = EXCLUDED.sheet_name,
            mode = EXCLUDED.mode,
            page_size = EXCLUDED.page_size,
            min_row_h = EXCLUDED.min_row_h,
            interval_sec = EXCLUDED.interval_sec,
            refresh_sec = EXCLUDED.refresh_sec,
            anim = EXCLUDED.anim,
            date_mode = EXCLUDED.date_mode,
            title = EXCLUDED.title,
            color_head = EXCLUDED.color_head,
            color1 = EXCLUDED.color1,
            color2 = EXCLUDED.color2,
            color_text = EXCLUDED.color_text,
            color_title = EXCLUDED.color_title;
      `, [
        sc.organization_id, sc.slug, sc.name, sc.sheet_url, sc.sheet_name, sc.mode, sc.page_size, sc.min_row_h,
        sc.interval_sec, sc.refresh_sec, sc.anim, sc.date_mode, sc.fixed_date, sc.sort_time, sc.title, sc.date_label,
        sc.logo, sc.title_font_size, sc.date_font_size, sc.data_font_size, sc.color_head, sc.color1, sc.color2,
        sc.color_text, sc.color_title, sc.empty_message, sc.load_error_message
      ]);
    }

    await client.query('COMMIT');
    console.log('✅ Seed dữ liệu thành công!');
    console.log('   - Tài khoản Admin: admin / admin123');
    console.log('   - Tài khoản NV 1: nhanvien1 / 123456 (Quản lý HP01, HP02)');
    console.log('   - Tài khoản NV 2: nhanvien2 / 123456 (Quản lý HP03)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi khi seed dữ liệu:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] === (await import('node:url')).fileURLToPath(import.meta.url)) {
  runSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
