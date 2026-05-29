const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...authHeaders(),
    },
  });

  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const authApi = {
  login: (email, password) => api('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password) => api('/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
};

export const controlApi = {
  getControlCenter: () => api('/control-center'),
  refresh: () => api('/control-center/refresh', { method: 'POST' }),
  getForecast: () => api('/forecast'),
  getSavings: (period) => api(`/reports/savings?period=${period}`),
  setVacationMode: (enabled) => api('/vacation-mode', { method: 'POST', body: JSON.stringify({ enabled }) }),
};

export const deviceApi = {
  list: () => api('/devices'),
  create: (payload) => api('/devices', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => api(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id) => api(`/devices/${id}`, { method: 'DELETE' }),
  override: (id, mode) => api(`/devices/${id}/override`, { method: 'POST', body: JSON.stringify({ mode }) }),
};

export const usersApi = {
  list: () => api('/users'),
  update: (id, payload) => api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id) => api(`/users/${id}`, { method: 'DELETE' }),
};

export const notificationApi = {
  getSettings: () => api('/notifications/settings'),
  saveSettings: (channel, discordWebhookUrl, telegramChatId, telegramBotToken) =>
    api('/notifications/settings', {
      method: 'POST',
      body: JSON.stringify({ channel, discordWebhookUrl, telegramChatId, telegramBotToken }),
    }),
  test: () => api('/notifications/test', { method: 'POST' }),
};
