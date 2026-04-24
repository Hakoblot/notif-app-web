const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool;

function envBool(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
}

function sslConfig() {
  if (!envBool(process.env.DB_SSL, true)) {
    return undefined;
  }

  const ssl = {
    rejectUnauthorized: envBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
  };

  if (process.env.DB_SSL_CA_PATH) {
    const caPath = path.resolve(process.cwd(), process.env.DB_SSL_CA_PATH);
    ssl.ca = fs.readFileSync(caPath, 'utf8');
  }

  return ssl;
}

function configFromUrl(databaseUrl) {
  const url = new URL(databaseUrl);

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    ssl: sslConfig(),
    waitForConnections: true,
    connectionLimit: 8,
    queueLimit: 0,
  };
}

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is missing. Create .env from .env.example.');
    }

    pool = mysql.createPool(configFromUrl(process.env.DATABASE_URL));
  }

  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);

  return rows;
}

async function initDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS push_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      expo_push_token VARCHAR(255) NOT NULL UNIQUE,
      parent_name VARCHAR(120) NULL,
      student_name VARCHAR(120) NULL,
      platform VARCHAR(40) NOT NULL DEFAULT 'unknown',
      device_name VARCHAR(160) NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_push_tokens_student_name (student_name),
      INDEX idx_push_tokens_active (is_active)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS push_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      push_token_id INT NULL,
      audience VARCHAR(40) NOT NULL,
      title VARCHAR(160) NOT NULL,
      body VARCHAR(500) NOT NULL,
      data JSON NULL,
      expo_ticket_id VARCHAR(120) NULL,
      ticket_status VARCHAR(40) NOT NULL DEFAULT 'queued',
      ticket_message VARCHAR(500) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_push_notifications_push_token
        FOREIGN KEY (push_token_id) REFERENCES push_tokens(id)
        ON DELETE SET NULL,
      INDEX idx_push_notifications_ticket_id (expo_ticket_id),
      INDEX idx_push_notifications_created_at (created_at)
    )
  `);
}

module.exports = {
  initDatabase,
  query,
};
