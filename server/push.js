const { query } = require('./db');

let expoClient;
let ExpoClass;

async function getExpoClient() {
  if (!expoClient) {
    const expoModule = await import('expo-server-sdk');
    ExpoClass = expoModule.Expo;
    expoClient = new ExpoClass({
      accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
    });
  }

  return expoClient;
}

async function buildMessages(tokens, input) {
  await getExpoClient();

  return tokens.map((tokenRow) => {
    if (!ExpoClass.isExpoPushToken(tokenRow.expo_push_token)) {
      return {
        tokenRow,
        error: `${tokenRow.expo_push_token} is not a valid Expo push token.`,
      };
    }

    return {
      tokenRow,
      message: {
        to: tokenRow.expo_push_token,
        sound: 'default',
        channelId: 'attendance-alerts',
        title: input.title,
        body: input.body,
        data: {
          source: 'notif-app-web',
          sentAt: new Date().toISOString(),
          ...(input.data || {}),
        },
      },
    };
  });
}

async function logNotification(tokenRow, audience, input, ticket) {
  await query(
    `
      INSERT INTO push_notifications
        (push_token_id, audience, title, body, data, expo_ticket_id, ticket_status, ticket_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      tokenRow?.id ?? null,
      audience,
      input.title,
      input.body,
      JSON.stringify(input.data || {}),
      ticket?.id ?? null,
      ticket?.status ?? 'error',
      ticket?.message ?? null,
    ]
  );
}

async function sendPushNotifications(tokens, input, audience) {
  const expo = await getExpoClient();
  const prepared = await buildMessages(tokens, input);
  const validMessages = prepared.filter((item) => item.message);

  for (const item of prepared.filter((entry) => entry.error)) {
    await logNotification(item.tokenRow, audience, input, {
      status: 'error',
      message: item.error,
    });
  }

  const messages = validMessages.map((item) => item.message);
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  let cursor = 0;

  for (const chunk of chunks) {
    const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

    for (const ticket of ticketChunk) {
      const tokenRow = validMessages[cursor].tokenRow;
      await logNotification(tokenRow, audience, input, ticket);

      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        await query('UPDATE push_tokens SET is_active = FALSE WHERE id = ?', [tokenRow.id]);
      }

      tickets.push(ticket);
      cursor += 1;
    }
  }

  return {
    requested: tokens.length,
    sent: tickets.filter((ticket) => ticket.status === 'ok').length,
    failed:
      prepared.filter((entry) => entry.error).length +
      tickets.filter((ticket) => ticket.status !== 'ok').length,
  };
}

module.exports = {
  sendPushNotifications,
};
