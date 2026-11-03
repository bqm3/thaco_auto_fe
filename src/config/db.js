import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5433,
  user: process.env.DB_USER || 'uicc',
  password: process.env.DB_PASSWORD || 'uicc_demo_password',
  database: process.env.DB_NAME || 'thaco_auto_hp',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', (client) => {
  const schema = process.env.DB_SCHEMA || 'thaco_hp';
  client.query(`SET search_path TO "${schema}", public`);
});

pool.on('error', (err) => {
  console.error('Unexpected database client error:', err.message);
});

export const query = (text, params) => pool.query(text, params);
export default pool;
