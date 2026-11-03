import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import pool from './config/db.js';
import { runMigrations } from './db/migrate.js';
import { runSeeds } from './db/seed.js';

dotenv.config({ override: true });

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() as current_time, current_database() as db_name, current_schema() as current_schema;');
    return res.json({
      status: 'UP',
      time: new Date().toISOString(),
      database: dbRes.rows[0]
    });
  } catch (err) {
    return res.status(500).json({
      status: 'DOWN',
      error: err.message
    });
  }
});

// Mount API routes
app.use('/api', routes);

// 404 handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint API không tồn tại' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Lỗi hệ thống máy chủ'
  });
});

// Auto initialize database & start server
async function startServer() {
  try {
    console.log('🔄 Đang kiểm tra kết nối cơ sở dữ liệu PostgreSQL...');
    await runMigrations();

    // Check if roles or users need initial seed
    const checkUser = await pool.query('SELECT COUNT(*) FROM users;');
    if (parseInt(checkUser.rows[0].count, 10) === 0) {
      console.log('⚡ Chưa có tài khoản nào, tự động khởi tạo dữ liệu mẫu (Seed)...');
      await runSeeds();
    }

    app.listen(process.env.PORT, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`🚀 THACO AUTO HP Backend Server đang chạy tại:`);
      console.log(`   - Local:    http://localhost:${process.env.PORT}`);
      console.log(`   - Health:   http://localhost:${process.env.PORT}/api/health`);
      console.log(`   - Database: ${process.env.DB_NAME} (Schema: ${process.env.DB_SCHEMA})`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('❌ Không thể khởi động máy chủ:', error);
    process.exit(1);
  }
}

startServer();
