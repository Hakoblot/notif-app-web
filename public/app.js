const health = document.querySelector('#health');
const tokensTable = document.querySelector('#tokensTable');
const logsTable = document.querySelector('#logsTable');
const pushForm = document.querySelector('#pushForm');
const refreshButton = document.querySelector('#refreshButton');
const sendStatus = document.querySelector('#sendStatus');

let tokens = [];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error || 'Request failed.');
  }

  return body;
}

function setHealth(ok, text) {
  health.className = `health ${ok ? 'ok' : 'bad'}`;
  health.textContent = text;
}

function renderTokens() {
  if (!tokens.length) {
    tokensTable.innerHTML = '<tr><td class="empty" colspan="6">No Expo push tokens yet.</td></tr>';
    return;
  }

  tokensTable.innerHTML = tokens
    .map(
      (token) => `
        <tr>
          <td>
            <input
              type="checkbox"
              class="token-checkbox"
              value="${token.id}"
              ${token.is_active ? '' : 'disabled'}
            />
          </td>
          <td>${escapeHtml(token.parent_name || '-')}</td>
          <td>${escapeHtml(token.student_name || '-')}</td>
          <td>${escapeHtml(token.platform)}</td>
          <td class="token">${escapeHtml(token.expo_push_token)}</td>
          <td>${token.is_active ? 'Active' : 'Disabled'}</td>
        </tr>
      `
    )
    .join('');
}

function renderLogs(logs) {
  if (!logs.length) {
    logsTable.innerHTML = '<tr><td class="empty" colspan="5">No push logs yet.</td></tr>';
    return;
  }

  logsTable.innerHTML = logs
    .map(
      (log) => `
        <tr>
          <td>${escapeHtml(log.audience)}</td>
          <td>${escapeHtml(log.parent_name || log.student_name || '-')}</td>
          <td>${escapeHtml(log.title)}</td>
          <td>${escapeHtml(log.ticket_status)}</td>
          <td class="token">${escapeHtml(log.expo_ticket_id || log.ticket_message || '-')}</td>
        </tr>
      `
    )
    .join('');
}

async function refresh() {
  const [tokenResult, logResult] = await Promise.all([
    api('/api/tokens'),
    api('/api/notifications'),
  ]);

  tokens = tokenResult.data;
  renderTokens();
  renderLogs(logResult.data);
}

async function checkHealth() {
  try {
    await api('/api/health');
    setHealth(true, 'Database connected');
  } catch (error) {
    setHealth(false, error.message);
  }
}

pushForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = pushForm.querySelector('button');
  const formData = Object.fromEntries(new FormData(pushForm).entries());
  const tokenIds = [...document.querySelectorAll('.token-checkbox:checked')].map((input) =>
    Number(input.value)
  );

  button.disabled = true;
  sendStatus.textContent = 'Sending...';

  try {
    const result = await api('/api/push/send', {
      method: 'POST',
      body: JSON.stringify({
        mode: formData.mode,
        tokenIds,
        title: formData.title,
        body: formData.body,
      }),
    });
    sendStatus.textContent = `${result.sent} sent, ${result.failed} failed`;
    await refresh();
  } catch (error) {
    sendStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

refreshButton.addEventListener('click', () => {
  refresh().catch((error) => {
    sendStatus.textContent = error.message;
  });
});

checkHealth();
refresh().catch((error) => {
  sendStatus.textContent = error.message;
});
