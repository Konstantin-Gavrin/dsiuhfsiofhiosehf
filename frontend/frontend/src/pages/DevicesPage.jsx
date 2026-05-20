/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { deviceApi } from '../api';
import TopBar from '../components/TopBar';

const initialForm = {
  name: '',
  address: 'mock://device',
  threshold: '0.10',
  powerKw: '1',
  isCritical: false,
};

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const rows = await deviceApi.list();
      setDevices(rows);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addDevice = async (e) => {
    e.preventDefault();
    try {
      await deviceApi.create({
        ...form,
        threshold: Number(form.threshold),
        powerKw: Number(form.powerKw),
      });
      setForm(initialForm);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="page">
      <TopBar />
      {error && <div className="card" style={{ color: '#b00020' }}>{error}</div>}

      <section className="card">
        <h3>Add device</h3>
        <form onSubmit={addDevice} className="row">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" required />
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" required />
          <input type="number" step="0.001" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} placeholder="Threshold" required />
          <input type="number" step="0.1" value={form.powerKw} onChange={(e) => setForm({ ...form, powerKw: e.target.value })} placeholder="Power kW" required />
          <label>
            <input type="checkbox" checked={form.isCritical} onChange={(e) => setForm({ ...form, isCritical: e.target.checked })} /> Critical
          </label>
          <button type="submit">Create</button>
        </form>
      </section>

      <section className="card">
        <h3>Devices</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Status</th>
              <th>Threshold</th>
              <th>Override</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.address}</td>
                <td>{d.lastStatus}</td>
                <td>{d.threshold}</td>
                <td>{d.manualOverride ? d.manualStatus : 'auto'}</td>
                <td className="row">
                  <button onClick={() => deviceApi.override(d.id, 'ON').then(load)}>Force ON</button>
                  <button className="secondary" onClick={() => deviceApi.override(d.id, 'OFF').then(load)}>Force OFF</button>
                  <button className="secondary" onClick={() => deviceApi.override(d.id, null).then(load)}>Auto</button>
                  <button className="danger" onClick={() => deviceApi.remove(d.id).then(load)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
