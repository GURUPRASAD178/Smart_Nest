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
  health: () => request('/health/'),
  devices: () => request('/devices/'),
  createDevice: device => request('/devices/', { method: 'POST', body: JSON.stringify(device) }),
  command: (id, command) => request(`/devices/${id}/command/`, {
    method: 'POST',
    body: JSON.stringify(typeof command === 'string' ? { state: command } : command),
  }),
  bulkCommand: state => request('/devices/bulk-command/', { method: 'POST', body: JSON.stringify({ state }) }),
  readings: () => request('/sensors/readings/'),
  simulateReading: () => request('/sensors/simulate/', { method: 'POST', body: '{}' }),
  motionEvents: () => request('/sensors/motion/'),
  simulateMotion: detected => request('/sensors/motion/simulate/', {
    method: 'POST',
    body: JSON.stringify({ detected }),
  }),
  summary: () => request('/analytics/summary/'),
  rules: () => request('/automation/rules/'),
  createRule: rule => request('/automation/rules/', { method: 'POST', body: JSON.stringify(rule) }),
  updateRule: (id, changes) => request(`/automation/rules/${id}/`, { method: 'PATCH', body: JSON.stringify(changes) }),
  deleteRule: id => request(`/automation/rules/${id}/`, { method: 'DELETE' }),
  evaluate: () => request('/automation/rules/evaluate/', { method: 'POST', body: '{}' }),
};
