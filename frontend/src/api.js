const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || JSON.stringify(body) || `Request failed: ${response.status}`);
  return body;
}
export const api = {
  devices: () => request('/devices/'),
  command: (id, state) => request(`/devices/${id}/command/`, { method: 'POST', body: JSON.stringify({ state }) }),
  readings: () => request('/sensors/readings/'),
  summary: () => request('/analytics/summary/'),
  evaluate: () => request('/automation/rules/evaluate/', { method: 'POST', body: '{}' }),
};
