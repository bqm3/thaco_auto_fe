-- Schema initialization for THACO AUTO HP
CREATE SCHEMA IF NOT EXISTS thaco_hp;

SET search_path TO thaco_hp, public;

-- 1. Roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Organizations / Đơn vị table
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Organizations (1 nhân viên quản lý nhiều đơn vị)
CREATE TABLE IF NOT EXISTS user_organizations (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);

-- 5. Posts table
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  thumbnail VARCHAR(500),
  status VARCHAR(50) DEFAULT 'published', -- 'draft', 'published', 'archived'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Appointment Screens table (chuyển đổi từ MongoDB sang PostgreSQL)
CREATE TABLE IF NOT EXISTS screens (
  id SERIAL PRIMARY KEY,
  organization_id INT REFERENCES organizations(id) ON DELETE SET NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  sheet_url TEXT,
  sheet_name VARCHAR(100) DEFAULT 'LichHen',
  mode VARCHAR(20) DEFAULT 'auto',
  page_size INT DEFAULT 6,
  min_row_h INT DEFAULT 70,
  interval_sec INT DEFAULT 10,
  refresh_sec INT DEFAULT 60,
  anim VARCHAR(20) DEFAULT 'slide',
  date_mode VARCHAR(20) DEFAULT 'today',
  fixed_date VARCHAR(20) DEFAULT '',
  sort_time BOOLEAN DEFAULT TRUE,
  title VARCHAR(255) DEFAULT 'KHÁCH HÀNG ĐẶT LỊCH HẸN',
  date_label VARCHAR(100) DEFAULT 'NGÀY:',
  logo TEXT DEFAULT '',
  title_font_size INT DEFAULT 48,
  date_font_size INT DEFAULT 31,
  data_font_size INT DEFAULT 24,
  color_head VARCHAR(20) DEFAULT '#4472c4',
  color1 VARCHAR(20) DEFAULT '#cfd5ea',
  color2 VARCHAR(20) DEFAULT '#e9ebf5',
  color_text VARCHAR(20) DEFAULT '#00529c',
  color_title VARCHAR(20) DEFAULT '#ff0000',
  empty_message VARCHAR(255) DEFAULT 'Hôm nay chưa có lịch hẹn',
  load_error_message VARCHAR(255) DEFAULT 'Không thể tải dữ liệu từ Google Sheet',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_user_orgs_user ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_orgs_org ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_posts_org ON posts(organization_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_screens_slug ON screens(slug);
