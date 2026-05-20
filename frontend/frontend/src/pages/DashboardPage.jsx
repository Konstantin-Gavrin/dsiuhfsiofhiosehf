/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import { controlApi, notificationApi } from '../api';
import TopBar from '../components/TopBar';

export default function DashboardPage() {
  const [control, setControl] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState('day');
  const [channel, setChannel] = useState('discord');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');

  const deviceCount = useMemo(() => control?.devices?.length || 0, [control]);

  const load = async () => {
    try {
      const [c, f, r] = await Promise.all([
        controlApi.getControlCenter(),
        controlApi.getForecast(),
        controlApi.getSavings(period),
      ]);
      setControl(c);
      setForecast(f.forecast || []);
      setReport(r);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [period]);

  return (
    <main className="page">
      <TopBar />

      {error && <div className="card" style={{ color: '#b00020' }}>{error}</div>}

      <div className="row">
        <section className="card" style={{ flex: 1 }}>
          <h3>Control Center</h3>
          <div>Current price: <strong>{control?.currentPrice?.toFixed?.(6) ?? '-'} EUR/kWh</strong></div>
          <div>Devices: <strong>{deviceCount}</strong></div>
          <div>Data freshness: {control?.stale ? 'stale' : 'live'}</div>
          <div className="row" style={{ marginTop: 10 }}>
            <button onClick={() => controlApi.refresh().then(load)}>Run automation now</button>
            <button className="secondary" onClick={() => controlApi.setVacationMode(true).then(load)}>Enable vacation mode</button>
            <button className="secondary" onClick={() => controlApi.setVacationMode(false).then(load)}>Disable vacation mode</button>
          </div>
        </section>

        <section className="card" style={{ flex: 1 }}>
          <h3>Savings report</h3>
          <div className="row">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
          <div>Fixed cost: {report?.fixedCost ?? '-'} EUR</div>
          <div>Real cost: {report?.realCost ?? '-'} EUR</div>
          <div>Saved: <strong>{report?.savedEur ?? '-'} EUR ({report?.savedPercent ?? '-'}%)</strong></div>
        </section>
      </div>

      <section className="card">
        <h3>24h forecast with planned actions</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {forecast.slice(0, 24).map((item) => (
              <tr key={item.timestamp}>
                <td>{new Date(item.timestamp).toLocaleString()}</td>
                <td>{item.priceEur.toFixed(6)} EUR/kWh</td>
                <td>{item.actions.map((a) => `${a.name}:${a.target}`).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h3>Notifications</h3>
        <div className="row">
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="discord">Discord webhook</option>
            <option value="telegram">Telegram chat id</option>
          </select>
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Webhook URL or Chat ID" />
          <button onClick={() => notificationApi.saveSettings(channel, target)}>Save</button>
          <button className="secondary" onClick={() => notificationApi.test()}>Send test</button>
        </div>
      </section>
    </main>
  );
}
