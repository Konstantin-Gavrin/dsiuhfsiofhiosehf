import React, { useEffect, useState } from 'react';
import { getDevices } from '../api';
import LogoutButton from '../components/LogoutButton';

export default function Dashboard() {
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <LogoutButton />
      </div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div>Welcome to the Smart Grid Control Center!</div>
      <h2 className="text-xl mt-6 mb-2">Your Devices</h2>
      <ul>
        {devices.map(d => (
          <li key={d.id} className="mb-2 p-2 border rounded">
            <b>{d.name}</b> — {d.address} (Threshold: {d.threshold})
          </li>
        ))}
      </ul>
    </div>
  );
}
