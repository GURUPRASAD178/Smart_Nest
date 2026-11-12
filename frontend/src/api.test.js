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
    ['motion events', () => api.motionEvents(), '/api/sensors/motion/'],
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

  it('sends simulated beam state through the motion API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ detected: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.simulateMotion(true);

    expect(fetchMock).toHaveBeenCalledWith('/api/sensors/motion/simulate/', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ detected: true }),
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

  it('creates and updates automation rules through the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 3 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const rule = {
      name: 'Warm room fan',
      sensor: 'temperature',
      operator: 'gte',
      threshold: 27,
      device: 2,
      target_state: 'on',
      enabled: true,
    };

    await api.createRule(rule);
    await api.updateRule(3, { enabled: false });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/automation/rules/', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(rule),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/automation/rules/3/', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ enabled: false }),
    }));
  });

  it('lists and deletes automation rules through the API', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 3 }] })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await api.rules();
    await api.deleteRule(3);

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/automation/rules/', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/automation/rules/3/', expect.objectContaining({ method: 'DELETE' }));
  });
});
