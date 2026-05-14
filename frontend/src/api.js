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

export async function createDevice(token, device) {
  const res = await fetch(`${API_URL}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(device)
  });
  if (!res.ok) throw await parseError(res, 'Failed to create device');
  return res.json();
}

export async function updateDevice(token, id, updates) {
  const res = await fetch(`${API_URL}/devices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw await parseError(res, 'Failed to update device');
  return res.json();
}

export async function deleteDevice(token, id) {
  const res = await fetch(`${API_URL}/devices/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw await parseError(res, 'Failed to delete device');
  return res.ok;
}

export async function getCurrentPrice() {
  const res = await fetch(`${API_URL}/price/current`);
  if (!res.ok) throw await parseError(res, 'Failed to fetch price');
  return res.json();
}

export async function getForecast() {
  const res = await fetch(`${API_URL}/forecast`);
  if (!res.ok) throw await parseError(res, 'Failed to fetch forecast');
  return res.json();
}

export async function getSavings(token, fixedPrice) {
  const res = await fetch(`${API_URL}/savings?fixedPrice=${fixedPrice}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw await parseError(res, 'Failed to fetch savings');
  return res.json();
}

export async function overrideDevice(token, id, status) {
  const res = await fetch(`${API_URL}/devices/${id}/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw await parseError(res, 'Failed to override device');
  return res.json();
}

export async function getCommandHistory(token, deviceId) {
  const res = await fetch(`${API_URL}/commands/${deviceId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw await parseError(res, 'Failed to fetch command history');
  return res.json();
}
// Add more API methods as needed
