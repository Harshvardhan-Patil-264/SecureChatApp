/**
 * config/db.js
 * MySQL connection pool using mysql2/promise
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'pass',
  database: process.env.DB_NAME || 'chatapp',
  ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 20,       // more concurrent queries
  queueLimit: 0,
  enableKeepAlive: true,     // keep TCP connections warm — no reconnect latency
  keepAliveInitialDelay: 0,
  connectTimeout: 10000
});

module.exports = pool;
