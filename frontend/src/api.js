// Minimal API client for backend auth and device endpoints
const envApiUrl = import.meta.env.VITE_API_URL;
const API_URL = import.meta.env.PROD ? '/api' : (envApiUrl || '/api');

async function parseError(res, fallbackMessage) {
  try {
    const data = await res.json();
    return new Error(data?.error || fallbackMessage);
  } catch {
    return new Error(fallbackMessage);
  }
}

export async function login(email, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw await parseError(res, 'Login failed');
  return res.json();
}

export async function register(email, password) {
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw await parseError(res, 'Registration failed');
  return res.json();
}

export async function getDevices(token) {
  const res = await fetch(`${API_URL}/devices`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw await parseError(res, 'Failed to fetch devices');
  return res.json();
}
// Add more API methods as needed
