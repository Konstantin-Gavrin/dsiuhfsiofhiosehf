import React, { useEffect, useState } from 'react';
import {
  getDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  getCurrentPrice,
  getForecast,
  getSavings,
  overrideDevice,
  getCommandHistory,
} from '../api';
import LogoutButton from '../components/LogoutButton';

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [savings, setSavings] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [vacationMode, setVacationMode] = useState(false);
  const [fixedPrice, setFixedPrice] = useState('0.15');
  const [newDeviceForm, setNewDeviceForm] = useState({
    name: '',
    description: '',
    address: '',
    threshold: 0.10,
    isCritical: false,
  });

  const token = localStorage.getItem('token');

  // Fetch devices on mount
  useEffect(() => {
    if (!token) {
      setError('Not authenticated');
      return;
    }
    loadData();
  }, [token]);

  // Refresh price every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (token) loadCurrentPrice();
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDevices(),
        loadCurrentPrice(),
        loadForecast(),
        loadSavings(),
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    const data = await getDevices(token);
    setDevices(data);
  };

  const loadCurrentPrice = async () => {
    try {
      const data = await getCurrentPrice();
      setCurrentPrice(data);
    } catch (e) {
      console.error('Failed to load current price:', e);
    }
  };

  const loadForecast = async () => {
    try {
      const data = await getForecast();
      setForecast(data.hours || []);
    } catch (e) {
      console.error('Failed to load forecast:', e);
    }
  };

  const loadSavings = async () => {
    try {
      const data = await getSavings(token, fixedPrice);
      setSavings(data);
    } catch (e) {
      console.error('Failed to load savings:', e);
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    try {
      await createDevice(token, newDeviceForm);
      setNewDeviceForm({
        name: '',
        description: '',
        address: '',
        threshold: 0.10,
        isCritical: false,
      });
      await loadDevices();
    } catch (e) {
      setError('Failed to add device: ' + e.message);
    }
  };

  const handleDeleteDevice = async (id) => {
    if (!window.confirm('Delete device?')) return;
    try {
      await deleteDevice(token, id);
      await loadDevices();
    } catch (e) {
      setError('Failed to delete device: ' + e.message);
    }
  };

  const handleUpdateThreshold = async (id, newThreshold) => {
    try {
      await updateDevice(token, id, { threshold: parseFloat(newThreshold) });
      await loadDevices();
    } catch (e) {
      setError('Failed to update threshold: ' + e.message);
    }
  };

  const handleOverride = async (id, status) => {
    try {
      await overrideDevice(token, id, status);
      // Simulate device status update
      setDevices(
        devices.map(d => (d.id === id ? { ...d, status } : d))
      );
    } catch (e) {
      setError('Failed to override device: ' + e.message);
    }
  };

  const handleVacationMode = async () => {
    setVacationMode(!vacationMode);
    // In real implementation, would turn off all non-critical devices
    const nonCriticalDevices = devices.filter(d => !d.isCritical);
    for (const device of nonCriticalDevices) {
      try {
        await overrideDevice(token, device.id, vacationMode ? 'ON' : 'OFF');
      } catch (e) {
        console.error(`Failed to override device ${device.id}:`, e);
      }
    }
  };

  const priceColor = currentPrice?.price_eur > (fixedPrice || 0.15) ? 'text-red-600' : 'text-green-600';

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Smart Grid Control Center</h1>
          <LogoutButton />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError('')} className="ml-2 font-bold">×</button>
          </div>
        )}

        {/* Current Price Display */}
        {currentPrice && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-2">Current Nord Pool Price</h2>
            <p className={`text-4xl font-bold ${priceColor}`}>
              €{currentPrice.price_eur?.toFixed(4) || 'N/A'} / kWh
            </p>
            <p className="text-gray-600 mt-2">
              Threshold: €{currentPrice.threshold_eur?.toFixed(4) || 'N/A'} / kWh
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {['overview', 'devices', 'forecast', 'savings', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded font-medium capitalize ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Quick Stats</h2>
              <div className="space-y-2">
                <p className="text-gray-600">Active Devices: <span className="font-bold">{devices.filter(d => d.status === 'ON').length}</span></p>
                <p className="text-gray-600">Total Devices: <span className="font-bold">{devices.length}</span></p>
                <p className="text-gray-600">Vacation Mode: <span className={`font-bold ${vacationMode ? 'text-red-600' : 'text-green-600'}`}>{vacationMode ? 'ON' : 'OFF'}</span></p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Vacation Mode</h2>
              <button
                onClick={handleVacationMode}
                className={`px-4 py-2 rounded text-white font-medium ${
                  vacationMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {vacationMode ? 'Exit Vacation Mode' : 'Enter Vacation Mode'}
              </button>
              <p className="text-sm text-gray-600 mt-2">
                {vacationMode
                  ? 'All non-critical devices are disabled. Critical devices remain active.'
                  : 'Enable to automatically manage non-critical devices based on price.'}
              </p>
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Your Devices</h2>
              {devices.length === 0 ? (
                <p className="text-gray-600">No devices yet. Add one below.</p>
              ) : (
                <div className="space-y-4">
                  {devices.map(device => (
                    <div key={device.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold">{device.name}</h3>
                          <p className="text-sm text-gray-600">{device.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded text-white font-medium ${
                          device.status === 'ON' ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                          {device.status || 'OFF'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <label className="text-xs text-gray-600">Address</label>
                          <p className="font-medium">{device.address}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Threshold (€/kWh)</label>
                          <input
                            type="number"
                            value={device.threshold}
                            onChange={(e) => handleUpdateThreshold(device.id, e.target.value)}
                            step="0.01"
                            className="w-full border rounded px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Critical</label>
                          <p className="font-medium">{device.isCritical ? 'Yes' : 'No'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOverride(device.id, 'ON')}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Turn ON
                        </button>
                        <button
                          onClick={() => handleOverride(device.id, 'OFF')}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Turn OFF
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device.id)}
                          className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Device Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Add New Device</h2>
              <form onSubmit={handleAddDevice} className="space-y-4">
                <input
                  type="text"
                  placeholder="Device Name"
                  value={newDeviceForm.name}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newDeviceForm.description}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Address (IP/API/MQTT)"
                  value={newDeviceForm.address}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, address: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
                <input
                  type="number"
                  placeholder="Threshold (€/kWh)"
                  step="0.01"
                  value={newDeviceForm.threshold}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, threshold: parseFloat(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newDeviceForm.isCritical}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, isCritical: e.target.checked })}
                    className="mr-2"
                  />
                  Mark as Critical (won't be disabled in vacation mode)
                </label>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium"
                >
                  Add Device
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Forecast Tab */}
        {activeTab === 'forecast' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">24-Hour Price Forecast</h2>
            {forecast.length === 0 ? (
              <p className="text-gray-600">Loading forecast...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Time</th>
                      <th className="px-4 py-2 text-left">Price (€/kWh)</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.slice(0, 24).map((hour, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">
                          {new Date(hour.timestamp).toLocaleTimeString()}
                        </td>
                        <td className={`px-4 py-2 font-bold ${
                          hour.price_eur > (fixedPrice || 0.15) ? 'text-red-600' : 'text-green-600'
                        }`}>
                          €{hour.price_eur?.toFixed(4)}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs text-white ${
                            hour.status === 'ON' ? 'bg-green-600' : 'bg-red-600'
                          }`}>
                            {hour.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Savings Tab */}
        {activeTab === 'savings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Set Fixed Price for Comparison</h2>
              <div className="flex gap-4">
                <input
                  type="number"
                  placeholder="Fixed Price (€/kWh)"
                  step="0.01"
                  value={fixedPrice}
                  onChange={(e) => {
                    setFixedPrice(e.target.value);
                    // Reload savings with new price
                    setTimeout(() => loadSavings(), 500);
                  }}
                  className="border rounded px-3 py-2 flex-1"
                />
              </div>
            </div>

            {savings && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-green-600 mb-2">Daily Savings</h3>
                  <p className="text-3xl font-bold">€{savings.daily?.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-2">vs. fixed price €{savings.fixedPrice}/kWh</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-green-600 mb-2">Weekly Savings</h3>
                  <p className="text-3xl font-bold">€{savings.weekly?.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-green-600 mb-2">Monthly Savings</h3>
                  <p className="text-3xl font-bold">€{savings.monthly?.toFixed(2)}</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">How Savings are Calculated</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your average consumption: 2 kW</li>
                <li>• Fixed price baseline: €{fixedPrice || 0.15}/kWh</li>
                <li>• Actual average price: €{savings?.actualAvgPrice?.toFixed(4)}/kWh</li>
                <li>• Daily savings = (Fixed - Actual) × 24 hours × 2 kW</li>
              </ul>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notifications
                </label>
                <p className="text-gray-600 text-sm">
                  Telegram and Discord notifications can be configured in the settings.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <p className="text-gray-600 text-sm">
                  Your Telegram Bot token or Discord Webhook can be added here.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
