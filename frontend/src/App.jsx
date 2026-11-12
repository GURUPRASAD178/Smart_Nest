import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import './dashboard.css';

const TelemetryPanel = lazy(() => import('./TelemetryPanel.jsx'));

function Stat({ label, value, unit = '' }) {
  return <article className="stat card"><span className="muted">{label}</span><strong>{value ?? '—'}{unit}</strong></article>;
}

export default function App() {
  const [devices, setDevices] = useState([]);
  const [readings, setReadings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState({});
  const [demoMode, setDemoMode] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [deviceData, readingData, summaryData] = await Promise.all([
        api.devices(),
        api.readings(),
        api.summary(),
      ]);
      setDevices(deviceData);
      setReadings(readingData);
      setSummary(summaryData);
      setLastUpdated(new Date());
      setError('');
    } catch (e) {
      setError(`${e.message}. Is the Django API running?`);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timer;

    const poll = async () => {
      try {
        const health = await api.health();
        if (!active) return;
        const isDemoMode = Boolean(health.demo_data_enabled);
        setDemoMode(isDemoMode);
        if (isDemoMode) await api.simulateReading();
        await refresh();
      } catch (e) {
        if (active) setError(`${e.message}. Is the Django API running?`);
      }

      if (active) timer = window.setTimeout(poll, 5000);
    };

    poll();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [refresh]);

  async function toggle(device) {
    const next = device.state === 'on' ? 'off' : 'on';
    setBusy(old => ({ ...old, [device.id]: true }));
    setNotice('');
    try {
      await api.command(device.id, next);
      await refresh();
      setNotice(`${device.name} turned ${next}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(old => ({ ...old, [device.id]: false }));
    }
  }

  async function evaluate() {
    setEvaluating(true);
    setNotice('');
    try {
      const result = await api.evaluate();
      const actionCount = result.actions?.length ?? 0;
      setNotice(result.message || `Rules evaluated. ${actionCount} action(s) executed.`);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setEvaluating(false);
    }
  }

  const latest = readings[0];
  return <main className="shell">
    <header className="topbar">
      <div className="brand"><div className="brand-icon">⌂</div><div><h1>SmartNest</h1><p>Intelligent home control</p></div></div>
      <div className="connection">
        <span className={`dot ${error ? 'bad' : ''}`}></span>
        <span>{error ? 'API unavailable' : demoMode ? 'Live demo feed' : 'Sensor feed connected'}</span>
        {lastUpdated && <span className="updated">Updated {lastUpdated.toLocaleTimeString()}</span>}
        <button className="ghost" onClick={refresh}>Refresh</button>
      </div>
    </header>
    <section className="welcome">
      <div><p className="eyebrow">HOME OVERVIEW</p><h2>Your home, in sync.</h2><p className="muted">Monitor conditions, control devices and run your automation rules.</p></div>
      <button onClick={evaluate} className="primary" disabled={evaluating}>{evaluating ? 'Evaluating…' : '▶ Evaluate rules'}</button>
    </section>
    {error && <div className="alert error">{error}</div>}
    {notice && <div className="alert success">{notice}</div>}
    <section className="stats">
      <Stat label="Temperature" value={latest ? Number(latest.temperature).toFixed(1) : '—'} unit={latest ? ' °C' : ''}/>
      <Stat label="Humidity" value={latest ? Number(latest.humidity).toFixed(1) : '—'} unit={latest ? ' %' : ''}/>
      <Stat label="Devices online" value={devices.filter(device => device.is_online).length}/>
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
    <Suspense fallback={<section className="telemetry-grid"><div className="card chart-panel chart-empty">Loading live telemetry…</div></section>}>
      <TelemetryPanel readings={readings} demoMode={demoMode}/>
    </Suspense>
    <footer>SmartNest · Academic IoT prototype · Energy values are estimates, not meter readings.</footer>
  </main>;
}
