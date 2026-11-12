import { useState } from 'react';

const operators = [
  { value: 'gte', label: 'at least (≥)' },
  { value: 'gt', label: 'greater than (>)' },
  { value: 'lte', label: 'at most (≤)' },
  { value: 'lt', label: 'less than (<)' },
];

export default function AutomationPanel({ rules, devices, busy, onCreate, onToggle, onDelete }) {
  const [draft, setDraft] = useState({
    name: '',
    sensor: 'temperature',
    operator: 'gte',
    threshold: '27',
    release_threshold: '26',
    calibration_percent: '100',
    device: '',
    target_state: 'on',
  });
  const targetDevices = devices.filter(device => device.device_type !== 'sensor' && device.is_online);
  const selectedDevice = targetDevices.find(device => device.id === Number(draft.device));

  async function submit(event) {
    event.preventDefault();
    const created = await onCreate({
      ...draft,
      threshold: Number(draft.threshold),
      release_threshold: Number(draft.release_threshold),
      calibration_percent: Number(draft.calibration_percent),
      device: Number(draft.device),
      enabled: true,
    });
    if (created) setDraft(old => ({ ...old, name: '' }));
  }

  function update(field, value) {
    setDraft(old => {
      if (field === 'sensor') {
        const defaults = value === 'temperature'
          ? { threshold: '27', release_threshold: '26' }
          : { threshold: '60', release_threshold: '55' };
        return { ...old, sensor: value, ...defaults };
      }
      if (field === 'threshold' || field === 'operator') {
        const threshold = field === 'threshold' ? value : old.threshold;
        const operator = field === 'operator' ? value : old.operator;
        const gap = old.sensor === 'temperature' ? 1 : 5;
        const minimum = old.sensor === 'temperature' ? -20 : 0;
        const maximum = old.sensor === 'temperature' ? 80 : 100;
        const proposedRelease = operator === 'gt' || operator === 'gte'
          ? Number(threshold) - gap
          : Number(threshold) + gap;
        const release = Math.max(minimum, Math.min(maximum, proposedRelease));
        return {
          ...old,
          [field]: value,
          release_threshold: String(Number(release.toFixed(old.sensor === 'temperature' ? 1 : 0))),
        };
      }
      return { ...old, [field]: value };
    });
  }

  return <section className="automation-section">
    <div className="section-heading"><div><p className="eyebrow">SMART ROUTINES</p><h3>Automations</h3></div><span className="muted">Enabled rules run when a new sensor reading arrives</span></div>
    <div className="automation-grid">
      <form className="card rule-form" onSubmit={submit}>
        <h4>Create a rule</h4>
        <label>Rule name<input required maxLength="120" value={draft.name} onChange={event => update('name', event.target.value)} placeholder="Warm room fan"/></label>
        <div className="rule-fields">
          <label>When<select value={draft.sensor} onChange={event => update('sensor', event.target.value)}>
            <option value="temperature">Temperature</option><option value="humidity">Humidity</option>
          </select></label>
          <label>Condition<select value={draft.operator} onChange={event => update('operator', event.target.value)}>
            {operators.map(operator => <option value={operator.value} key={operator.value}>{operator.label}</option>)}
          </select></label>
        </div>
        <label>Trigger threshold<input required type="number" step={draft.sensor === 'temperature' ? '0.1' : '1'} min={draft.sensor === 'temperature' ? '-20' : '0'} max={draft.sensor === 'temperature' ? '80' : '100'} value={draft.threshold} onChange={event => update('threshold', event.target.value)}/></label>
        <label>Reset threshold<input required type="number" step={draft.sensor === 'temperature' ? '0.1' : '1'} min={draft.sensor === 'temperature' ? '-20' : '0'} max={draft.sensor === 'temperature' ? '80' : '100'} value={draft.release_threshold} onChange={event => update('release_threshold', event.target.value)}/><small className="form-hint">Creates a dead band to prevent rapid switching.</small></label>
        <div className="rule-fields">
          <label>Control device<select required value={draft.device} onChange={event => update('device', event.target.value)}>
            <option value="">Choose a device</option>{targetDevices.map(device => <option value={device.id} key={device.id}>{device.name} · {device.room}</option>)}
          </select></label>
          <label>Set state<select value={draft.target_state} onChange={event => update('target_state', event.target.value)}>
            <option value="on">On</option><option value="off">Off</option>
          </select></label>
        </div>
        {selectedDevice && ['light', 'fan'].includes(selectedDevice.device_type) && <label>Maximum response: {draft.calibration_percent}%<input type="range" min="1" max="100" step="1" value={draft.calibration_percent} onChange={event => update('calibration_percent', event.target.value)}/><small className="form-hint">Output ramps from 20% at the trigger to this limit as the reading moves farther past it.</small></label>}
        <button className="primary" disabled={busy || targetDevices.length === 0}>{busy ? 'Saving…' : 'Save automation'}</button>
      </form>
      <div className="rule-list">
        {rules.length ? rules.map(rule => {
          const device = devices.find(item => item.id === rule.device);
          const operator = operators.find(item => item.value === rule.operator)?.label || rule.operator;
          const unit = rule.sensor === 'temperature' ? ' °C' : ' %';
          const releaseOperator = rule.operator === 'gt' || rule.operator === 'gte' ? '≤' : '≥';
          return <article className={`card rule-card ${rule.enabled ? 'enabled' : 'disabled'}`} key={rule.id}>
            <div className="rule-status"><span className={`dot ${rule.enabled ? '' : 'bad'}`}></span>{rule.enabled ? 'Enabled' : 'Paused'}</div>
            <h4>{rule.name}</h4>
            <p className="muted">If {rule.sensor} is {operator} {rule.threshold}{unit}, set <strong>{device?.name || 'missing device'}</strong> {rule.target_state}; reset at {releaseOperator} {rule.release_threshold ?? '—'}{unit}.</p>
            {['light', 'fan'].includes(device?.device_type) && <span className="rule-calibration">Output limit {rule.calibration_percent}% · proportional response</span>}
            <div className="rule-actions">
              <button className="ghost" disabled={busy} onClick={() => onToggle(rule)}>{rule.enabled ? 'Pause' : 'Enable'}</button>
              <button className="rule-delete" disabled={busy} onClick={() => onDelete(rule)}>Delete</button>
            </div>
          </article>;
        }) : <div className="card empty">No routines yet. Create one to automate your simulated devices.</div>}
      </div>
    </div>
  </section>;
}
