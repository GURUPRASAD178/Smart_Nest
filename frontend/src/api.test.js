import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API client', () => {
  it.each([
    ['API health', () => api.health(), '/api/health/'],
    ['devices', () => api.devices(), '/api/devices/'],
    ['sensor readings', () => api.readings(), '/api/sensors/readings/'],
    ['demo sensor readings', () => api.simulateReading(), '/api/sensors/simulate/'],
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

  it('sends device-specific control values as JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ brightness: 35 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.command(7, { brightness: 35 });

    expect(fetchMock).toHaveBeenCalledWith('/api/devices/7/command/', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ brightness: 35 }),
    }));
  });

  it('creates room-aware devices through the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 8 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const device = { name: 'Kitchen Light', room: 'Kitchen', device_type: 'light' };

    await api.createDevice(device);

    expect(fetchMock).toHaveBeenCalledWith('/api/devices/', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(device),
    }));
  });

  it('sends bulk device commands through the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updated: 4 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.bulkCommand('off');

    expect(fetchMock).toHaveBeenCalledWith('/api/devices/bulk-command/', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ state: 'off' }),
    }));
  });
});
