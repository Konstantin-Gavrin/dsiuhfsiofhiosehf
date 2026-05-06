import React, { useEffect, useState } from 'react';
import { getDevices } from '../api';
import LogoutButton from '../components/LogoutButton';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      return;
    }
    getDevices(token)
      .then(setDevices)
      .catch(e => setError(e.message));
  }, []);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [threshold, setThreshold] = useState('');
  const [isCritical, setIsCritical] = useState(false);
  const [addError, setAddError] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, address, threshold: parseFloat(threshold), isCritical })
      });
      if (!res.ok) throw new Error('Failed to add device');
      const newDevice = await res.json();
      setDevices([...devices, newDevice]);
      setName(''); setAddress(''); setThreshold(''); setIsCritical(false);
    } catch (e) {
      setAddError(e.message);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">My Devices</h1>
        <LogoutButton />
      </div>
      <h1 className="text-2xl font-bold mb-4">My Devices</h1>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2 w-96">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="p-2 border rounded" required />
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className="p-2 border rounded" required />
        <input value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="Threshold" type="number" step="0.01" className="p-2 border rounded" required />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isCritical} onChange={e => setIsCritical(e.target.checked)} /> Critical
        </label>
        <button type="submit" className="bg-green-600 text-white p-2 rounded">Add Device</button>
        {addError && <div className="text-red-500">{addError}</div>}
      </form>
      <ul>
        {devices.map(d => (
          <li key={d.id} className="mb-2 p-2 border rounded">
            <b>{d.name}</b> — {d.address} (Threshold: {d.threshold}) {d.isCritical ? '[Critical]' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
