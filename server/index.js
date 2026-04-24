require('dotenv').config();

const cors = require('cors');
const express = require('express');
const path = require('path');

const { initDatabase, query } = require('./db');
const { sendPushNotifications } = require('./push');

const app = express();
const port = Number(process.env.PORT || 3001);
const publicDir = path.join(__dirname, '..', 'public');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicDir));

function required(value, field) {
  if (!value || !String(value).trim()) {
    const error = new Error(`${field} is required.`);
    error.status = 400;
    throw error;
  }

  return String(value).trim();
}

app.get('/api/health', async (_request, response, next) => {
  try {
    await query('SELECT 1 AS ok');
    response.json({ ok: true, database: 'connected' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/tokens', async (request, response, next) => {
  try {
    const expoPushToken = required(request.body.expoPushToken, 'Expo push token');
    const parentName = request.body.parentName ? String(request.body.parentName).trim() : null;
    const studentName = request.body.studentName ? String(request.body.studentName).trim() : null;
    const platform = request.body.platform ? String(request.body.platform).trim() : 'unknown';
    const deviceName = request.body.deviceName ? String(request.body.deviceName).trim() : null;

    await query(
      `
        INSERT INTO push_tokens
          (expo_push_token, parent_name, student_name, platform, device_name, is_active)
        VALUES (?, ?, ?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE
          parent_name = VALUES(parent_name),
          student_name = VALUES(student_name),
          platform = VALUES(platform),
          device_name = VALUES(device_name),
          is_active = TRUE,
          last_registered_at = CURRENT_TIMESTAMP
      `,
      [expoPushToken, parentName, studentName, platform, deviceName]
    );

    const rows = await query(
      `
        SELECT id, expo_push_token, parent_name, student_name, platform, device_name, is_active, last_registered_at
        FROM push_tokens
        WHERE expo_push_token = ?
      `,
      [expoPushToken]
    );

    response.status(201).json({ data: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get('/api/tokens', async (_request, response, next) => {
  try {
    const rows = await query(`
      SELECT id, expo_push_token, parent_name, student_name, platform, device_name, is_active, last_registered_at
      FROM push_tokens
      ORDER BY last_registered_at DESC, id DESC
      LIMIT 200
    `);

    response.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/tokens/:id', async (request, response, next) => {
  try {
    await query('UPDATE push_tokens SET is_active = ? WHERE id = ?', [
      Boolean(request.body.isActive),
      request.params.id,
    ]);

    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/push/send', async (request, response, next) => {
  try {
    const title = required(request.body.title, 'Title');
    const body = required(request.body.body, 'Body');
    const mode = request.body.mode === 'selected' ? 'selected' : 'all';
    const selectedIds = Array.isArray(request.body.tokenIds) ? request.body.tokenIds : [];

    const tokens =
      mode === 'selected'
        ? await query(
            `
              SELECT id, expo_push_token
              FROM push_tokens
              WHERE is_active = TRUE AND id IN (${selectedIds.map(() => '?').join(',') || 'NULL'})
            `,
            selectedIds
          )
        : await query('SELECT id, expo_push_token FROM push_tokens WHERE is_active = TRUE');

    if (!tokens.length) {
      const error = new Error('No active Expo push tokens matched this send.');
      error.status = 400;
      throw error;
    }

    const result = await sendPushNotifications(
      tokens,
      {
        title,
        body,
        data: {
          type: request.body.type || 'manual_message',
        },
      },
      mode
    );

    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/notifications', async (_request, response, next) => {
  try {
    const rows = await query(`
      SELECT
        push_notifications.id,
        push_notifications.audience,
        push_notifications.title,
        push_notifications.body,
        push_notifications.ticket_status,
        push_notifications.ticket_message,
        push_notifications.expo_ticket_id,
        push_notifications.created_at,
        push_tokens.parent_name,
        push_tokens.student_name
      FROM push_notifications
      LEFT JOIN push_tokens ON push_tokens.id = push_notifications.push_token_id
      ORDER BY push_notifications.id DESC
      LIMIT 100
    `);

    response.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  response.status(error.status || 500).json({
    error: error.message || 'Unexpected server error.',
  });
});

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`notif-app-web running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Could not initialize database.');
    console.error(error);
    process.exitCode = 1;
  });
