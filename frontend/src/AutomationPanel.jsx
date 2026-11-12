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
        if (value === 'motion') {
          return {
            ...old,
            sensor: value,
            operator: 'gte',
            threshold: '1',
            release_threshold: '0',
          };
        }
        const defaults = value === 'temperature'
          ? { threshold: '27', release_threshold: '26' }
          : { threshold: '60', release_threshold: '55' };
        return { ...old, sensor: value, operator: 'gte', ...defaults };
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
    <div className="section-heading"><div><p className="eyebrow">SMART ROUTINES</p><h3>Automations</h3></div><span className="muted">Rules run when a sensor reading or motion event arrives</span></div>
    <div className="automation-grid">
      <form className="card rule-form" onSubmit={submit}>
        <h4>Create a rule</h4>
        <label>Rule name<input required maxLength="120" value={draft.name} onChange={event => update('name', event.target.value)} placeholder="Warm room fan"/></label>
        <div className="rule-fields">
          <label>When<select value={draft.sensor} onChange={event => update('sensor', event.target.value)}>
            <option value="temperature">Temperature</option><option value="humidity">Humidity</option><option value="motion">Motion (beam break)</option>
          </select></label>
          {draft.sensor === 'motion' ? <label>Condition<input value="Beam is interrupted" readOnly/></label> : <label>Condition<select value={draft.operator} onChange={event => update('operator', event.target.value)}>
            {operators.map(operator => <option value={operator.value} key={operator.value}>{operator.label}</option>)}
          </select></label>}
        </div>
        {draft.sensor === 'motion' ? <p className="form-hint motion-rule-hint">The rule activates while the IR beam is blocked and resets when it clears.</p> : <>
          <label>Trigger threshold<input required type="number" step={draft.sensor === 'temperature' ? '0.1' : '1'} min={draft.sensor === 'temperature' ? '-20' : '0'} max={draft.sensor === 'temperature' ? '80' : '100'} value={draft.threshold} onChange={event => update('threshold', event.target.value)}/></label>
          <label>Reset threshold<input required type="number" step={draft.sensor === 'temperature' ? '0.1' : '1'} min={draft.sensor === 'temperature' ? '-20' : '0'} max={draft.sensor === 'temperature' ? '80' : '100'} value={draft.release_threshold} onChange={event => update('release_threshold', event.target.value)}/><small className="form-hint">Creates a dead band to prevent rapid switching.</small></label>
        </>}
        <div className="rule-fields">
          <label>Control device<select required value={draft.device} onChange={event => update('device', event.target.value)}>
            <option value="">Choose a device</option>{targetDevices.map(device => <option value={device.id} key={device.id}>{device.name} · {device.room}</option>)}
          </select></label>
          <label>Set state<select value={draft.target_state} onChange={event => update('target_state', event.target.value)}>
            <option value="on">On</option><option value="off">Off</option>
          </select></label>
        </div>
        {selectedDevice && ['light', 'fan'].includes(selectedDevice.device_type) && <label>{draft.sensor === 'motion' ? 'Output on detection' : 'Maximum response'}: {draft.calibration_percent}%<input type="range" min="1" max="100" step="1" value={draft.calibration_percent} onChange={event => update('calibration_percent', event.target.value)}/><small className="form-hint">{draft.sensor === 'motion' ? 'Set the light brightness or cap the fan speed while the beam is blocked.' : 'Output ramps from 20% at the trigger to this limit as the reading moves farther past it.'}</small></label>}
        <button className="primary" disabled={busy || targetDevices.length === 0}>{busy ? 'Saving…' : 'Save automation'}</button>
      </form>
      <div className="rule-list">
        {rules.length ? rules.map(rule => {
          const device = devices.find(item => item.id === rule.device);
          const operator = operators.find(item => item.value === rule.operator)?.label || rule.operator;
          const unit = rule.sensor === 'temperature' ? ' °C' : ' %';
          const releaseOperator = rule.operator === 'gt' || rule.operator === 'gte' ? '≤' : '≥';
          const condition = rule.sensor === 'motion'
            ? 'the IR beam is interrupted'
            : `${rule.sensor} is ${operator} ${rule.threshold}${unit}`;
          const reset = rule.sensor === 'motion'
            ? 'when the beam clears'
            : `at ${releaseOperator} ${rule.release_threshold ?? '—'}${unit}`;
          return <article className={`card rule-card ${rule.enabled ? 'enabled' : 'disabled'}`} key={rule.id}>
            <div className="rule-status"><span className={`dot ${rule.enabled ? '' : 'bad'}`}></span>{rule.enabled ? 'Enabled' : 'Paused'}</div>
            <h4>{rule.name}</h4>
            <p className="muted">If {condition}, set <strong>{device?.name || 'missing device'}</strong> {rule.target_state}; reset {reset}.</p>
            {['light', 'fan'].includes(device?.device_type) && <span className="rule-calibration">{rule.sensor === 'motion' ? 'Output on detection' : 'Output limit'} {rule.calibration_percent}%{rule.sensor !== 'motion' ? ' · proportional response' : ''}</span>}
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
