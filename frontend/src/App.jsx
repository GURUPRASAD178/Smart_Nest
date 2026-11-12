import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import './dashboard.css';
import AutomationPanel from './AutomationPanel.jsx';

const TelemetryPanel = lazy(() => import('./TelemetryPanel.jsx'));

function DeviceCard({ device, busy, onCommand }) {
  const [brightness, setBrightness] = useState(device.brightness ?? 100);
  const [fanSpeed, setFanSpeed] = useState(device.fan_speed ?? 1);
  const isLight = device.device_type === 'light';
  const isFan = device.device_type === 'fan';

  useEffect(() => {
    setBrightness(device.brightness ?? 100);
    setFanSpeed(device.fan_speed ?? 1);
  }, [device.brightness, device.fan_speed]);

  const controlsChanged = isLight
    ? brightness !== (device.brightness ?? 100)
    : isFan && fanSpeed !== (device.fan_speed ?? 1);
  const icon = { fan: '◉', sensor: '⌁', plug: '▣', buzzer: '♬' }[device.device_type] || '☼';
  const label = { light: 'Light', fan: 'Fan', plug: 'Smart plug', buzzer: 'Buzzer', sensor: 'Sensor' }[device.device_type] || device.device_type;

  return <article className="device card">
    <div className="device-top"><div className={`device-icon ${device.state === 'on' ? 'active' : ''}`}>{icon}</div><span className={`pill ${device.is_online ? 'online' : 'offline'}`}>{device.is_online ? 'Online' : 'Offline'}</span></div>
    <div className="device-title"><h4>{device.name}</h4><span className="room-chip">{device.room || 'Unassigned'}</span></div>
    <p className="muted">{label} · {device.rated_power_watts} W · {device.is_simulated ? 'Simulated' : 'Physical'}</p>
    {isLight && <div className="device-control">
      <label htmlFor={`brightness-${device.id}`}><span>Brightness</span><strong>{brightness}%</strong></label>
      <input id={`brightness-${device.id}`} type="range" min="0" max="100" step="5" value={brightness} disabled={!device.is_online || busy} onChange={event => setBrightness(Number(event.target.value))}/>
      <button className="control-save" disabled={!device.is_online || busy || !controlsChanged} onClick={() => onCommand(device, { brightness })}>Apply brightness</button>
    </div>}
    {isFan && <div className="device-control">
      <label htmlFor={`fan-speed-${device.id}`}>Fan speed</label>
      <select id={`fan-speed-${device.id}`} value={fanSpeed} disabled={!device.is_online || busy} onChange={event => setFanSpeed(Number(event.target.value))}>
        <option value="1">1 · Quiet</option><option value="2">2 · Normal</option><option value="3">3 · Boost</option>
      </select>
      <button className="control-save" disabled={!device.is_online || busy || !controlsChanged} onClick={() => onCommand(device, { fan_speed: fanSpeed })}>Apply speed</button>
    </div>}
    <div className="device-bottom"><div><span className="muted small">Current state</span><strong className={device.state === 'on' ? 'state-on' : ''}>{device.device_type === 'sensor' ? 'MONITORING' : device.state.toUpperCase()}</strong></div>
      {device.device_type !== 'sensor' && <button className={device.state === 'on' ? 'toggle on' : 'toggle'} disabled={busy || !device.is_online} onClick={() => onCommand(device, { state: device.state === 'on' ? 'off' : 'on' })} aria-label={`Turn ${device.name} ${device.state === 'on' ? 'off' : 'on'}`}>{busy ? '…' : device.state === 'on' ? 'Turn off' : 'Turn on'}</button>}</div>
  </article>;
}

function Stat({ label, value, unit = '' }) {
  return <article className="stat card"><span className="muted">{label}</span><strong>{value ?? '—'}{unit}</strong></article>;
}

function MotionPanel({ detected, busy, demoMode, onSetDetection }) {
  return <section className="motion-panel card">
    <div className="motion-panel-info">
      <p className="eyebrow">IR BEAM SENSOR · SIMULATION</p>
      <h3>Entry detection</h3>
      <p className="muted">Simulate an interrupted beam. Add a Buzzer device, then create Motion rules for it and your LED; clearing the beam resets them.</p>
      <div className="motion-status" role="status" aria-live="polite">
        <span className={`dot ${detected ? 'bad' : ''}`}></span>
        {detected ? 'Beam interrupted · detection active' : 'Beam clear'}
      </div>
    </div>
    <div className="motion-actions">
      <button className="primary" disabled={!demoMode || busy || detected} onClick={() => onSetDetection(true)}>{busy ? 'Updating…' : 'Simulate beam break'}</button>
      <button className="ghost" disabled={!demoMode || busy || !detected} onClick={() => onSetDetection(false)}>Clear beam</button>
      {!demoMode && <small className="form-hint">Enable demo data to run the motion simulation.</small>}
    </div>
  </section>;
}

export default function App() {
  const [devices, setDevices] = useState([]);
  const [readings, setReadings] = useState([]);
  const [motionEvents, setMotionEvents] = useState([]);
  const [rules, setRules] = useState([]);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [creatingDevice, setCreatingDevice] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [motionBusy, setMotionBusy] = useState(false);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [roomFilter, setRoomFilter] = useState('*');
  const [newDevice, setNewDevice] = useState({ name: '', room: 'Living Room', device_type: 'light' });
  const [demoMode, setDemoMode] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [deviceData, readingData, motionData, summaryData, ruleData] = await Promise.all([
        api.devices(),
        api.readings(),
        api.motionEvents(),
        api.summary(),
        api.rules(),
      ]);
      setDevices(deviceData);
      setReadings(readingData);
      setMotionEvents(motionData);
      setSummary(summaryData);
      setRules(ruleData);
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

  async function runCommand(device, command) {
    setBusy(old => ({ ...old, [device.id]: true }));
    setNotice('');
    try {
      await api.command(device.id, command);
      await refresh();
      if (command.state) setNotice(`${device.name} turned ${command.state}.`);
      else if (command.brightness !== undefined) setNotice(`${device.name} brightness set to ${command.brightness}%.`);
      else if (command.fan_speed !== undefined) setNotice(`${device.name} speed set to ${command.fan_speed}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(old => ({ ...old, [device.id]: false }));
    }
  }

  async function turnAllOff() {
    setBulkBusy(true);
    setNotice('');
    try {
      const result = await api.bulkCommand('off');
      await refresh();
      const skipped = result.skipped_offline ? ` ${result.skipped_offline} offline device(s) skipped.` : '';
      setNotice(`${result.updated} device(s) turned off.${skipped}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBulkBusy(false);
    }
  }

  async function addDevice(event) {
    event.preventDefault();
    setCreatingDevice(true);
    setNotice('');
    try {
      const device = await api.createDevice(newDevice);
      await refresh();
      setNewDevice({ name: '', room: newDevice.room, device_type: 'light' });
      setShowDeviceForm(false);
      setNotice(`${device.name} added to ${device.room}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreatingDevice(false);
    }
  }

  async function createRule(rule) {
    setSavingRule(true);
    setNotice('');
    try {
      await api.createRule(rule);
      await refresh();
      setNotice('Automation saved. It will run when a new sensor reading arrives.');
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setSavingRule(false);
    }
  }

  async function toggleRule(rule) {
    setSavingRule(true);
    try {
      await api.updateRule(rule.id, { enabled: !rule.enabled });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingRule(false);
    }
  }

  async function deleteRule(rule) {
    setSavingRule(true);
    try {
      await api.deleteRule(rule.id);
      await refresh();
      setNotice(`Automation "${rule.name}" deleted.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingRule(false);
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

  async function setMotionDetection(detected) {
    setMotionBusy(true);
    setNotice('');
    try {
      const event = await api.simulateMotion(detected);
      await refresh();
      const actionCount = event.actions?.length ?? 0;
      setNotice(`${detected ? 'Beam interruption detected' : 'Beam cleared'}. ${actionCount} device action(s) applied.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setMotionBusy(false);
    }
  }

  const latest = readings[0];
  const motionDetected = Boolean(motionEvents[0]?.detected);
  const rooms = [...new Set(devices.map(device => device.room || 'Unassigned'))].sort();
  const visibleDevices = devices.filter(device => roomFilter === '*' || (device.room || 'Unassigned') === roomFilter);
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
    <MotionPanel detected={motionDetected} busy={motionBusy} demoMode={demoMode} onSetDetection={setMotionDetection}/>
    <section className="section-heading device-heading">
      <div><p className="eyebrow">CONTROL CENTER</p><h3>Your devices</h3><span className="muted">{devices.length} registered</span></div>
      <div className="dashboard-controls">
        <label className="room-filter" htmlFor="room-filter"><span>Room</span><select id="room-filter" value={roomFilter} onChange={event => setRoomFilter(event.target.value)}>
          <option value="*">All rooms</option>{rooms.map(room => <option key={room}>{room}</option>)}
        </select></label>
        <button className="ghost" disabled={bulkBusy || !devices.some(device => device.state === 'on' && device.device_type !== 'sensor' && device.is_online)} onClick={turnAllOff}>{bulkBusy ? 'Switching…' : 'All off'}</button>
        <button className="primary" onClick={() => setShowDeviceForm(open => !open)}>{showDeviceForm ? 'Cancel' : '+ Add device'}</button>
      </div>
    </section>
    {showDeviceForm && <form className="card device-form" onSubmit={addDevice}>
      <label>Device name<input required maxLength="100" value={newDevice.name} onChange={event => setNewDevice(old => ({ ...old, name: event.target.value }))} placeholder="e.g. Reading lamp"/></label>
      <label>Room<input required maxLength="60" value={newDevice.room} onChange={event => setNewDevice(old => ({ ...old, room: event.target.value }))} placeholder="e.g. Study"/></label>
      <label>Device type<select value={newDevice.device_type} onChange={event => setNewDevice(old => ({ ...old, device_type: event.target.value }))}>
        <option value="light">Light</option><option value="fan">Fan</option><option value="plug">Smart plug</option><option value="buzzer">Buzzer</option><option value="sensor">Sensor</option>
      </select></label>
      <button className="primary" disabled={creatingDevice}>{creatingDevice ? 'Adding…' : 'Add device'}</button>
    </form>}
    <section className="device-grid">
      {visibleDevices.map(device => <DeviceCard key={device.id} device={device} busy={Boolean(busy[device.id])} onCommand={runCommand}/>)}
      {visibleDevices.length === 0 && devices.length > 0 && <div className="card empty">No devices in this room.</div>}
      {devices.length === 0 && !error && <div className="card empty">No devices yet. Use Add device to get started.</div>}
    </section>
    <AutomationPanel
      rules={rules}
      devices={devices}
      busy={savingRule}
      onCreate={createRule}
      onToggle={toggleRule}
      onDelete={deleteRule}
    />
    <Suspense fallback={<section className="telemetry-grid"><div className="card chart-panel chart-empty">Loading live telemetry…</div></section>}>
      <TelemetryPanel readings={readings} demoMode={demoMode}/>
    </Suspense>
    <footer>SmartNest · Academic IoT prototype · Energy values are estimates, not meter readings.</footer>
  </main>;
}
