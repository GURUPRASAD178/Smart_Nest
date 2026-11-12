import React, { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

function Stat({ label, value, unit = '' }) {
  return <article className="stat card"><span className="muted">{label}</span><strong>{value ?? '—'}{unit}</strong></article>;
}
export default function App() {
  const [devices, setDevices] = useState([]);
  const [readings, setReadings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [d, r, s] = await Promise.all([api.devices(), api.readings(), api.summary()]);
      setDevices(d); setReadings(r); setSummary(s); setError('');
    } catch (e) { setError(`${e.message}. Is the Django API running?`); }
  }, []);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 5000); return () => clearInterval(timer); }, [refresh]);

  async function toggle(device) {
    const next = device.state === 'on' ? 'off' : 'on';
    setBusy(old => ({ ...old, [device.id]: true })); setNotice('');
    try {
      await api.command(device.id, next);
      await refresh();
      setNotice(`${device.name} turned ${next}.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(old => ({ ...old, [device.id]: false })); }
  }
  async function evaluate() {
    try {
      const result = await api.evaluate();
      setNotice(result.message || `Rules evaluated. ${result.actions.length} action(s) executed.`);
      await refresh();
    } catch (e) { setError(e.message); }
  }
  const latest = readings[0];
  return <main className="shell">
    <header className="topbar">
      <div className="brand"><div className="brand-icon">⌂</div><div><h1>SmartNest</h1><p>Intelligent home control</p></div></div>
      <div className="connection"><span className={`dot ${error ? 'bad' : ''}`}></span>{error ? 'API unavailable' : 'API connected'}<button className="ghost" onClick={refresh}>Refresh</button></div>
    </header>
    <section className="welcome"><div><p className="eyebrow">HOME OVERVIEW</p><h2>Your home, in sync.</h2><p className="muted">Monitor conditions, control devices and run your automation rules.</p></div><button onClick={evaluate} className="primary">▶ Evaluate rules</button></section>
    {error && <div className="alert error">{error}</div>}
    {notice && <div className="alert success">{notice}</div>}
    <section className="stats">
      <Stat label="Temperature" value={latest ? Number(latest.temperature).toFixed(1) : '—'} unit={latest ? ' °C' : ''}/>
      <Stat label="Humidity" value={latest ? Number(latest.humidity).toFixed(1) : '—'} unit={latest ? ' %' : ''}/>
      <Stat label="Devices online" value={devices.filter(d => d.is_online).length}/>
      <Stat label="Estimated active load" value={summary?.estimated_active_power_watts ?? '—'} unit={summary ? ' W' : ''}/>
    </section>
    <section className="section-heading"><div><p className="eyebrow">CONTROL CENTER</p><h3>Your devices</h3></div><span className="muted">{devices.length} registered</span></section>
    <section className="device-grid">
      {devices.map(device => <article className="device card" key={device.id}>
        <div className="device-top"><div className={`device-icon ${device.state === 'on' ? 'active' : ''}`}>{device.device_type === 'fan' ? '◉' : device.device_type === 'sensor' ? '⌁' : '☼'}</div><span className={`pill ${device.is_online ? 'online' : 'offline'}`}>{device.is_online ? 'Online' : 'Offline'}</span></div>
        <h4>{device.name}</h4><p className="muted">{device.device_type} · {device.is_simulated ? 'Simulator' : 'Physical device'}</p>
        <div className="device-bottom"><div><span className="muted small">Current state</span><strong className={device.state === 'on' ? 'state-on' : ''}>{device.state.toUpperCase()}</strong></div>
        <button className={device.state === 'on' ? 'toggle on' : 'toggle'} disabled={busy[device.id] || !device.is_online || device.device_type === 'sensor'} onClick={() => toggle(device)} aria-label={`Turn ${device.name} ${device.state === 'on' ? 'off' : 'on'}`}>{busy[device.id] ? '…' : device.state === 'on' ? 'Turn off' : 'Turn on'}</button></div>
      </article>)}
      {devices.length === 0 && !error && <div className="card empty">No devices yet. Run <code>python manage.py seed_devices</code> in the backend.</div>}
    </section>
    <section className="section-heading"><div><p className="eyebrow">ENVIRONMENT</p><h3>Recent sensor readings</h3></div><span className="muted">{readings.length} records loaded</span></section>
    <section className="card readings">
      {readings.slice(0, 8).length ? <div className="reading-list">{readings.slice(0, 8).map(r => <div className="reading-row" key={r.id}><div><strong>{r.device_id}</strong><span className="muted small">{new Date(r.recorded_at).toLocaleString()}</span></div><div className="reading-values"><span>{Number(r.temperature).toFixed(1)} °C</span><span>{Number(r.humidity).toFixed(1)} %</span></div></div>)}</div> : <div className="empty"><div className="empty-icon">⌁</div><strong>No sensor data yet</strong><p className="muted">Connect the Arduino gateway or post a test reading to begin.</p><code>POST /api/sensors/readings/</code></div>}
    </section>
    <footer>SmartNest · Academic IoT prototype · Energy values are estimates, not meter readings.</footer>
  </main>;
}
