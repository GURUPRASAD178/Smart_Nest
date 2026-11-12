import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function TelemetryPanel({ readings, demoMode }) {
  const chartData = useMemo(() => readings
    .slice(0, 32)
    .slice()
    .reverse()
    .map(reading => ({
      time: new Date(reading.recorded_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      temperature: Number(reading.temperature),
      humidity: Number(reading.humidity),
    })), [readings]);

  return <section className="telemetry-grid">
    <article className="card chart-panel">
      <div className="panel-heading"><div><p className="eyebrow">ENVIRONMENT</p><h3>Live room telemetry</h3></div><span className="live-tag"><span className="dot"></span>{demoMode ? 'DEMO' : 'LIVE'}</span></div>
      {chartData.length ? <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#73e0c1" stopOpacity={0.28}/><stop offset="95%" stopColor="#73e0c1" stopOpacity={0}/></linearGradient>
            <linearGradient id="humidityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8ca9ff" stopOpacity={0.2}/><stop offset="95%" stopColor="#8ca9ff" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid stroke="#243248" strokeDasharray="3 5"/>
          <XAxis dataKey="time" tick={{ fill: '#8191a9', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24}/>
          <YAxis yAxisId="temperature" tick={{ fill: '#8191a9', fontSize: 10 }} tickLine={false} axisLine={false} width={34} domain={['auto', 'auto']}/>
          <YAxis yAxisId="humidity" orientation="right" tick={{ fill: '#8191a9', fontSize: 10 }} tickLine={false} axisLine={false} width={34} domain={[0, 100]}/>
          <Tooltip contentStyle={{ background: '#101a2a', border: '1px solid #30405a', borderRadius: 10, color: '#e7edf8' }} labelStyle={{ color: '#9eacc1' }} formatter={(value, name) => [`${Number(value).toFixed(1)}${name === 'Humidity' ? ' %' : ' °C'}`, name]}/>
          <Area yAxisId="temperature" type="monotone" dataKey="temperature" name="Temperature" stroke="#73e0c1" strokeWidth={2.5} fill="url(#temperatureFill)" activeDot={{ r: 4, strokeWidth: 0 }}/>
          <Area yAxisId="humidity" type="monotone" dataKey="humidity" name="Humidity" stroke="#8ca9ff" strokeWidth={2} fill="url(#humidityFill)" activeDot={{ r: 4, strokeWidth: 0 }}/>
        </AreaChart>
      </ResponsiveContainer> : <div className="empty chart-empty">Waiting for the first sensor reading…</div>}
      <div className="chart-legend"><span><i className="legend-temp"></i>Temperature (°C)</span><span><i className="legend-humidity"></i>Humidity (%)</span><span className="muted">Refreshes every 5 seconds</span></div>
    </article>
    <article className="card recent-panel">
      <div className="panel-heading"><div><p className="eyebrow">SENSOR HISTORY</p><h3>Recent readings</h3></div><span className="muted">{readings.length} loaded</span></div>
      {readings.length ? <div className="reading-list">{readings.slice(0, 7).map(reading => <div className="reading-row" key={reading.id}>
        <div><strong>{reading.device_id}</strong><span className="muted small">{new Date(reading.recorded_at).toLocaleTimeString()}</span></div>
        <div className="reading-values"><span>{Number(reading.temperature).toFixed(1)} °C</span><span>{Number(reading.humidity).toFixed(1)} %</span></div>
      </div>)}</div> : <div className="empty">Connect the Arduino gateway or enable demo data to begin.</div>}
    </article>
  </section>;
}
