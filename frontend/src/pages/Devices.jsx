import React, { useEffect, useState } from 'react';
import { getDevices, overrideDevice } from '../api';
import LogoutButton from '../components/LogoutButton';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

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

  const handleToggleStatus = async (deviceId, currentStatus) => {
    setTogglingId(deviceId);
    const token = localStorage.getItem('token');
    const newStatus = currentStatus === 'ON' ? 'OFF' : 'ON';
    
    try {
      const updatedDevice = await overrideDevice(token, deviceId, newStatus);
      setDevices(devices.map(d => d.id === deviceId ? updatedDevice : d));
    } catch (e) {
      setError(`Failed to toggle device: ${e.message}`);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">My Devices</h1>
        <LogoutButton />
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-2 w-96">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="p-2 border rounded" required />
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className="p-2 border rounded" required />
        <input value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="Threshold" type="number" step="0.01" className="p-2 border rounded" required />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isCritical} onChange={e => setIsCritical(e.target.checked)} /> Critical
        </label>
        <button type="submit" className="bg-green-600 text-white p-2 rounded">Add Device</button>
        {addError && <div className="text-red-500">{addError}</div>}
      </form>
      <div className="space-y-2">
        <h2 className="text-xl font-bold mb-4">Devices</h2>
        {devices.length === 0 ? (
          <p className="text-gray-500">No devices yet</p>
        ) : (
          <ul className="space-y-2">
            {devices.map(d => (
              <li key={d.id} className="mb-3 p-4 border rounded bg-white shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <b className="text-lg">{d.name}</b>
                    <div className="text-gray-600 text-sm mt-1">
                      <p>Address: {d.address}</p>
                      <p>Threshold: {d.threshold} EUR</p>
                      {d.isCritical && <p className="text-red-600 font-semibold">[Critical]</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded text-white font-bold ${d.status === 'ON' ? 'bg-green-600' : 'bg-red-600'}`}>
                      {d.status}
                    </div>
                    <button 
                      onClick={() => handleToggleStatus(d.id, d.status)}
                      disabled={togglingId === d.id}
                      className={`px-3 py-1 rounded text-white font-semibold ${
                        togglingId === d.id 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : d.status === 'ON' 
                            ? 'bg-red-500 hover:bg-red-600' 
                            : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {togglingId === d.id ? 'Toggling...' : (d.status === 'ON' ? 'Turn OFF' : 'Turn ON')}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
