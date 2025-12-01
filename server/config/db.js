/**
 * config/db.js
 * MySQL connection pool using mysql2/promise
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '10.202.138.231',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'pass',
  database: process.env.DB_NAME || 'chatapp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
