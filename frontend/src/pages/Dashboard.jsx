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
  getVacationMode,
  setVacationMode,
  getNotificationSettings,
  saveNotificationSettings,
  testNotification,
} from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [chartData, setChartData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState({
    price: null,
    devices: null,
    forecast: null,
    savings: null,
  });
  const [newDeviceForm, setNewDeviceForm] = useState({
    name: '',
    description: '',
    address: '',
    threshold: 0.10,
    isCritical: false,
  });
  const [notificationChannel, setNotificationChannel] = useState('telegram');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      setError('Not authenticated');
      return;
    }
    loadData();
  }, [token]);

  // Refresh price every 30 seconds
  useEffect(() => {
    const priceInterval = setInterval(() => {
      if (token) loadCurrentPrice();
    }, 30000);
    return () => clearInterval(priceInterval);
  }, [token]);

  // Refresh devices every 60 seconds
  useEffect(() => {
    const devicesInterval = setInterval(() => {
      if (token) loadDevices();
    }, 60000);
    return () => clearInterval(devicesInterval);
  }, [token]);

  // Refresh forecast every 5 minutes
  useEffect(() => {
    const forecastInterval = setInterval(() => {
      if (token) loadForecast();
    }, 300000);
    return () => clearInterval(forecastInterval);
  }, [token]);

  // Refresh savings every 3 minutes
  useEffect(() => {
    const savingsInterval = setInterval(() => {
      if (token) loadSavings();
    }, 180000);
    return () => clearInterval(savingsInterval);
  }, [token]);

  // Update chart data when forecast or date changes
  useEffect(() => {
    if (forecast.length > 0 && selectedDate) {
      const filtered = forecast
        .filter(hour => {
          const hourDate = new Date(hour.timestamp * 1000).toISOString().split('T')[0];
          return hourDate === selectedDate;
        })
        .map(hour => ({
          timestamp: hour.timestamp,
          hour: new Date(hour.timestamp * 1000).getHours(),
          price: parseFloat(hour.price_eur),
          status: hour.status,
          threshold: parseFloat(fixedPrice),
          isPeak: parseFloat(hour.price_eur) > parseFloat(fixedPrice),
        }));
      console.log('Chart data updated:', filtered);
      setChartData(filtered);
    }
  }, [forecast, selectedDate, fixedPrice]);

  // Helper to format last updated time
  const formatLastUpdated = (date) => {
    if (!date) return 'never';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const LoadingBadge = ({ timestamp }) => (
    <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-700/50 px-3 py-1 rounded-full border border-slate-600/50">
      <span className="animate-pulse">●</span>
      <span>{formatLastUpdated(timestamp)}</span>
    </div>
  );

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDevices(),
        loadCurrentPrice(),
        loadForecast(),
        loadSavings(),
        loadVacationMode(),
        loadNotificationSettings(),
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
    setLastUpdated(prev => ({ ...prev, devices: new Date() }));
  };

  const loadCurrentPrice = async () => {
    try {
      const data = await getCurrentPrice();
      setCurrentPrice(data);
      setLastUpdated(prev => ({ ...prev, price: new Date() }));
    } catch (e) {
      console.error('Failed to load current price:', e);
    }
  };

  const loadVacationMode = async () => {
    try {
      const data = await getVacationMode(token);
      setVacationMode(data.vacationMode);
    } catch (e) {
      console.error('Failed to load vacation mode:', e);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const data = await getNotificationSettings(token);
      const channel = data?.channel || 'telegram';
      setNotificationChannel(channel);
      setTelegramBotToken(data?.telegramBotToken || '');
      setTelegramChatId(data?.telegramChatId || '');
      setDiscordWebhookUrl(data?.discordWebhookUrl || '');
    } catch (e) {
      console.error('Failed to load notification settings:', e);
    }
  };

  const loadForecast = async () => {
    try {
      const data = await getForecast();
      // Ensure we have an array
      const forecastArray = Array.isArray(data) ? data : (data?.hours || []);
      console.log('Forecast loaded:', forecastArray);
      setForecast(forecastArray);
      setLastUpdated(prev => ({ ...prev, forecast: new Date() }));
    } catch (e) {
      console.error('Failed to load forecast:', e);
      setForecast([]);
    }
  };

  const loadSavings = async () => {
    try {
      const data = await getSavings(token, fixedPrice);
      setSavings(data);
      setLastUpdated(prev => ({ ...prev, savings: new Date() }));
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
      setDevices(
        devices.map(d => (d.id === id ? { ...d, status } : d))
      );
    } catch (e) {
      setError('Failed to override device: ' + e.message);
    }
  };

  const handleVacationMode = async () => {
    const newVacationMode = !vacationMode;
    try {
      await setVacationMode(token, newVacationMode);
      setVacationMode(newVacationMode);
      await loadDevices(); // Reload devices to reflect new status
    } catch (e) {
      setError('Failed to set vacation mode: ' + e.message);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setNotificationMessage('');
      const payload = {
        channel: notificationChannel,
        discordWebhookUrl: notificationChannel === 'discord' ? discordWebhookUrl : '',
        telegramChatId: notificationChannel === 'telegram' ? telegramChatId : '',
        telegramBotToken: notificationChannel === 'telegram' ? telegramBotToken : '',
      };
      await saveNotificationSettings(token, payload);
      setNotificationMessage('Notification settings saved.');
    } catch (e) {
      setError('Failed to save notification settings: ' + e.message);
    }
  };

  const handleTestNotification = async () => {
    try {
      setNotificationMessage('');
      await testNotification(token);
      setNotificationMessage('Test notification sent.');
    } catch (e) {
      setError('Failed to send test notification: ' + e.message);
    }
  };

  const priceColor = currentPrice?.price_eur > (fixedPrice || 0.15) 
    ? 'from-red-500 to-red-600' 
    : 'from-green-500 to-emerald-600';

  const priceTextColor = currentPrice?.price_eur > (fixedPrice || 0.15) 
    ? 'text-red-600' 
    : 'text-green-600';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white">⚡ Smart Grid</h1>
            <p className="text-blue-200 text-sm mt-1">Nord Pool Control Center</p>
          </div>
          <LogoutButton />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-lg mb-6 flex justify-between items-center backdrop-blur-sm">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 font-bold text-xl">×</button>
          </div>
        )}

        {/* Current Price Display */}
        {currentPrice && (
          <div className={`bg-gradient-to-br ${priceColor} rounded-2xl shadow-2xl p-8 mb-8 text-white transform hover:scale-105 transition-transform duration-300`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-sm uppercase tracking-wide font-semibold">Current Nord Pool Price</p>
                <p className="text-6xl font-black mt-2">€{currentPrice.price_eur?.toFixed(4) || 'N/A'}</p>
                <p className="text-blue-100 text-sm mt-2">per kWh (incl. 22% VAT)</p>
              </div>
              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-blue-100">Your Threshold</p>
                <p className="text-3xl font-bold">€{currentPrice.threshold_eur?.toFixed(4)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {['overview', 'devices', 'forecast', 'savings', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-semibold capitalize transition-all duration-300 whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white backdrop-blur-sm'
              }`}
            >
              {tab === 'overview' && '📊 '}
              {tab === 'devices' && '🔌 '}
              {tab === 'forecast' && '📈 '}
              {tab === 'savings' && '💰 '}
              {tab === 'settings' && '⚙️ '}
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-white">Dashboard Overview</h2>
              <LoadingBadge timestamp={lastUpdated.devices} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Stats Card */}
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-md border border-blue-400/30 rounded-2xl p-8 text-white hover:border-blue-400/60 transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-blue-200 text-sm uppercase tracking-wide">Active Devices</p>
              <p className="text-5xl font-black mt-2">{devices.filter(d => d.status === 'ON').length}</p>
              <p className="text-blue-300 text-sm mt-2">of {devices.length} total</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-md border border-purple-400/30 rounded-2xl p-8 text-white hover:border-purple-400/60 transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-3">🌍</div>
              <p className="text-purple-200 text-sm uppercase tracking-wide">System Status</p>
              <p className="text-5xl font-black mt-2">✓</p>
              <p className="text-purple-300 text-sm mt-2">All systems online</p>
            </div>

            {/* Vacation Mode Card */}
            <div className={`bg-gradient-to-br ${vacationMode ? 'from-red-500/20 to-red-600/20' : 'from-green-500/20 to-emerald-600/20'} backdrop-blur-md border ${vacationMode ? 'border-red-400/30' : 'border-green-400/30'} rounded-2xl p-8 text-white transition-all duration-300`}>
              <div className="text-5xl mb-3">{vacationMode ? '🏖️' : '🏠'}</div>
              <p className="text-sm uppercase tracking-wide mb-4">{vacationMode ? 'Vacation Mode Active' : 'Normal Mode'}</p>
              <button
                onClick={handleVacationMode}
                className={`w-full py-3 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 ${
                  vacationMode
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg hover:shadow-red-500/50'
                    : 'bg-gradient-to-r from-green-600 to-emerald-700 hover:shadow-lg hover:shadow-green-500/50'
                }`}
              >
                {vacationMode ? 'Exit' : 'Enter'}
              </button>
            </div>
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="space-y-8">
            {/* Devices List */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">Your Devices</h2>
                <LoadingBadge timestamp={lastUpdated.devices} />
              </div>
              {devices.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-12 text-center text-white/70">
                  <div className="text-6xl mb-4">🔌</div>
                  <p className="text-xl">No devices yet. Add one below to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {devices.map(device => (
                    <div
                      key={device.id}
                      className="group bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-md border border-slate-600/30 rounded-2xl p-6 text-white hover:border-blue-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold">{device.name}</h3>
                          <p className="text-slate-400 text-sm mt-1">{device.description}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                          device.status === 'ON'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/50'
                            : 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/50'
                        }`}>
                          {device.status || 'OFF'}
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4 mb-4 backdrop-blur-sm border border-white/10">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Address</p>
                        <p className="font-mono text-sm text-white mt-1">{device.address}</p>
                      </div>

                      <div className="mb-4">
                        <label className="text-xs text-slate-400 uppercase tracking-wide block mb-2">Threshold (€/kWh)</label>
                        <input
                          type="number"
                          value={device.threshold}
                          onChange={(e) => handleUpdateThreshold(device.id, e.target.value)}
                          step="0.01"
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300"
                        />
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <input
                          type="checkbox"
                          checked={device.isCritical}
                          readOnly
                          className="w-4 h-4"
                        />
                        <label className="text-xs text-slate-400">Critical Device</label>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOverride(device.id, 'ON')}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/50"
                        >
                          ON
                        </button>
                        <button
                          onClick={() => handleOverride(device.id, 'OFF')}
                          className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/50"
                        >
                          OFF
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device.id)}
                          className="px-4 py-2 bg-white/10 hover:bg-red-600/50 text-white/70 hover:text-white rounded-lg font-semibold transition-all duration-300 border border-white/20 hover:border-red-400/50"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Device Form */}
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-blue-400/30 rounded-2xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-6">Add New Device</h2>
              <form onSubmit={handleAddDevice} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Device Name"
                  value={newDeviceForm.name}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, name: e.target.value })}
                  className="md:col-span-2 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300"
                  required
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newDeviceForm.description}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, description: e.target.value })}
                  className="md:col-span-2 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300"
                />
                <input
                  type="text"
                  placeholder="Address (IP/API/MQTT)"
                  value={newDeviceForm.address}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, address: e.target.value })}
                  className="md:col-span-2 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300"
                  required
                />
                <input
                  type="number"
                  placeholder="Threshold (€/kWh)"
                  step="0.01"
                  value={newDeviceForm.threshold}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, threshold: parseFloat(e.target.value) })}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300"
                  required
                />
                <label className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/10 cursor-pointer hover:bg-white/10 transition-all duration-300">
                  <input
                    type="checkbox"
                    checked={newDeviceForm.isCritical}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, isCritical: e.target.checked })}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <span className="font-semibold">Critical Device</span>
                </label>
                <button
                  type="submit"
                  className="md:col-span-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-3 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
                >
                  + Add Device
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Forecast Tab */}
        {activeTab === 'forecast' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-white">24-Hour Price Forecast</h2>
              <LoadingBadge timestamp={lastUpdated.forecast} />
            </div>
            {/* Date Navigation */}
            <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-md border border-slate-600/30 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => {
                    const prev = new Date(selectedDate);
                    prev.setDate(prev.getDate() - 1);
                    setSelectedDate(prev.toISOString().split('T')[0]);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  ← Previous Day
                </button>
                
                <div className="flex-1 text-center">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full max-w-xs mx-auto bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-center focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300"
                  />
                </div>

                <button
                  onClick={() => {
                    const next = new Date(selectedDate);
                    next.setDate(next.getDate() + 1);
                    setSelectedDate(next.toISOString().split('T')[0]);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  Next Day →
                </button>
              </div>
            </div>

            {/* Price Chart */}
            {forecast.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-md border border-slate-600/30 rounded-2xl p-8 text-center text-white">
                <p className="text-slate-400">Loading forecast...</p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-md border border-slate-600/30 rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-6">Price Forecast - {selectedDate}</h3>
                {chartData.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p>No data available for {selectedDate}</p>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 60, bottom: 40 }}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                        <XAxis 
                          dataKey="hour" 
                          stroke="rgba(203, 213, 225, 0.5)"
                          tickFormatter={(hour) => `${hour}:00`}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          stroke="rgba(203, 213, 225, 0.5)"
                          tickFormatter={(value) => `€${value.toFixed(3)}`}
                          width={60}
                          domain={['dataMin - 0.02', 'dataMax + 0.02']}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid rgba(59, 130, 246, 0.5)',
                            borderRadius: '8px',
                          }}
                          formatter={(value, name) => {
                            if (name === 'price') return [`€${value.toFixed(4)}/kWh`, 'Price'];
                            if (name === 'threshold') return [`€${value.toFixed(4)}/kWh`, 'Threshold'];
                            return value;
                          }}
                          labelFormatter={(label) => `${label}:00`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="price" 
                          stroke="#3b82f6" 
                          fill="url(#colorPrice)"
                          strokeWidth={3}
                          name="Price"
                          isAnimationActive={true}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="threshold" 
                          stroke="#ef4444" 
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          name="Your Threshold"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Hourly Details Table */}
            {chartData.length > 0 && (
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-md border border-slate-600/30 rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-6">Hourly Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/20">
                      <tr>
                        <th className="px-4 py-3 text-left">Hour</th>
                        <th className="px-4 py-3 text-left">Price (€/kWh)</th>
                        <th className="px-4 py-3 text-left">vs Threshold</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((hour, i) => (
                        <tr key={i} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 font-semibold">{hour.hour}:00</td>
                          <td className="px-4 py-3 font-bold text-blue-300">€{hour.price.toFixed(4)}</td>
                          <td className={`px-4 py-3 font-semibold ${hour.isPeak ? 'text-red-400' : 'text-green-400'}`}>
                            {hour.isPeak ? '↑ Above' : '↓ Below'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              hour.status === 'ON'
                                ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                                : 'bg-red-500/30 text-red-300 border border-red-500/50'
                            }`}>
                              {hour.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Savings Tab */}
        {activeTab === 'savings' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-white">Savings Calculator</h2>
              <LoadingBadge timestamp={lastUpdated.savings} />
            </div>
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-md border border-purple-400/30 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Fixed Price Baseline</h3>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm text-slate-300 uppercase tracking-wide block mb-2">Your Fixed Rate (€/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fixedPrice}
                    onChange={(e) => {
                      setFixedPrice(e.target.value);
                      setTimeout(() => loadSavings(), 500);
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-2xl font-bold placeholder-slate-400 focus:outline-none focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            {savings && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-md border border-green-400/30 rounded-2xl p-8 text-white hover:border-green-400/60 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/50">
                  <p className="text-green-200 text-sm uppercase tracking-wide font-semibold">Daily Savings</p>
                  <p className="text-5xl font-black mt-3">€{savings.daily?.toFixed(2)}</p>
                  <p className="text-green-300 text-sm mt-2 opacity-80">24 hours of optimization</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur-md border border-blue-400/30 rounded-2xl p-8 text-white hover:border-blue-400/60 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50">
                  <p className="text-blue-200 text-sm uppercase tracking-wide font-semibold">Weekly Savings</p>
                  <p className="text-5xl font-black mt-3">€{savings.weekly?.toFixed(2)}</p>
                  <p className="text-blue-300 text-sm mt-2 opacity-80">7 days of savings</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-md border border-purple-400/30 rounded-2xl p-8 text-white hover:border-purple-400/60 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50">
                  <p className="text-purple-200 text-sm uppercase tracking-wide font-semibold">Monthly Savings</p>
                  <p className="text-5xl font-black mt-3">€{savings.monthly?.toFixed(2)}</p>
                  <p className="text-purple-300 text-sm mt-2 opacity-80">30 days of optimization</p>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-cyan-500/20 to-blue-600/20 backdrop-blur-md border border-cyan-400/30 rounded-2xl p-8 text-white">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">💡 How Savings Work</h3>
              <ul className="space-y-3 text-sm text-cyan-100">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold flex-shrink-0">1.</span>
                  <span>Average Consumption: <span className="font-bold text-white">2 kW</span></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold flex-shrink-0">2.</span>
                  <span>Your Fixed Price: <span className="font-bold text-white">€{fixedPrice}/kWh</span></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold flex-shrink-0">3.</span>
                  <span>Actual Avg Price: <span className="font-bold text-white">€{savings?.actualAvgPrice?.toFixed(4)}/kWh</span></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 font-bold flex-shrink-0">4.</span>
                  <span>Daily Savings = (Fixed - Actual) × 24h × 2kW</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-orange-500/20 to-red-600/20 backdrop-blur-md border border-orange-400/30 rounded-2xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">🔔 Smart Notifications</h2>
              <p className="text-orange-100 mb-4">Configure alerts for price changes, device status, and system events</p>
              <div className="space-y-4">
                <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                  <label className="text-sm font-semibold text-orange-200 uppercase tracking-wide">Notification Channel</label>
                  <select
                    value={notificationChannel}
                    onChange={(e) => {
                      setNotificationChannel(e.target.value);
                      setNotificationMessage('');
                    }}
                    className="w-full mt-2 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-300"
                  >
                    <option value="telegram">Telegram</option>
                    <option value="discord">Discord</option>
                  </select>
                </div>
                {notificationChannel === 'telegram' ? (
                  <>
                    <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                      <label className="text-sm font-semibold text-orange-200 uppercase tracking-wide">Telegram Bot Token</label>
                      <input
                        type="password"
                        value={telegramBotToken}
                        onChange={(e) => setTelegramBotToken(e.target.value)}
                        placeholder="1234567890:ABCdefGHIjklmnoPQRstUVWxyz"
                        className="w-full mt-2 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-300"
                      />
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                      <label className="text-sm font-semibold text-orange-200 uppercase tracking-wide">Telegram Chat ID</label>
                      <input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="123456789"
                        className="w-full mt-2 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-300"
                      />
                    </div>
                  </>
                ) : (
                  <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                    <label className="text-sm font-semibold text-orange-200 uppercase tracking-wide">Discord Webhook URL</label>
                    <input
                      type="password"
                      value={discordWebhookUrl}
                      onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full mt-2 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-300"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleSaveNotifications}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white py-3 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/50"
                  >
                    Save Notification Settings
                  </button>
                  <button
                    onClick={handleTestNotification}
                    className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-bold transition-all duration-300 border border-white/20"
                  >
                    Send Test Notification
                  </button>
                </div>
                {notificationMessage && (
                  <div className="text-sm text-emerald-200">{notificationMessage}</div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500/20 to-purple-600/20 backdrop-blur-md border border-indigo-400/30 rounded-2xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">🔐 API Integration</h2>
              <p className="text-indigo-100 mb-4">Control your devices via API endpoints</p>
              <div className="bg-white/10 rounded-lg p-4 border border-white/10 font-mono text-sm text-indigo-300">
                <p>GET /api/price/current</p>
                <p>POST /api/devices/:id/override</p>
                <p>GET /api/forecast</p>
                <p>GET /api/savings</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
