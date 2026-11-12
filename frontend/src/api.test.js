import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API client', () => {
  it.each([
    ['devices', () => api.devices(), '/api/devices/'],
    ['sensor readings', () => api.readings(), '/api/sensors/readings/'],
    ['analytics summary', () => api.summary(), '/api/analytics/summary/'],
    ['automation evaluation', () => api.evaluate(), '/api/automation/rules/evaluate/'],
  ])('routes %s through the same-origin API proxy', async (_name, call, path) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await call();

    expect(fetchMock).toHaveBeenCalledWith(path, expect.any(Object));
  });

  it('sends device commands as JSON through the API proxy', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.command(7, 'on');

    expect(fetchMock).toHaveBeenCalledWith('/api/devices/7/command/', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ state: 'on' }),
      headers: { 'Content-Type': 'application/json' },
    }));
  });
});
