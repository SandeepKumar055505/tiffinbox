import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { driverAuth } from '../../services/driverApi';

export default function DriverLoginPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await driverAuth.login(pin);
      localStorage.setItem('tb_driver_token', res.data.token);
      navigate('/driver');
    } catch {
      setError('Invalid PIN. Try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  function handleKey(digit: string) {
    if (pin.length < 8) setPin(p => p + digit);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-teal-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-3xl">🛵</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Driver Portal</h1>
          <p className="text-sm text-gray-400">Enter your delivery PIN</p>
        </div>

        {/* PIN display */}
        <div className="flex justify-center gap-3">
          {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold border-2 transition-all ${
                i < pin.length
                  ? 'border-teal-400 bg-teal-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-transparent'
              }`}
            >
              {i < pin.length ? '●' : '·'}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-red-400 font-medium">{error}</p>
        )}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key) => (
            <button
              key={key}
              disabled={!key || loading}
              onClick={() => {
                if (key === '⌫') setPin(p => p.slice(0, -1));
                else handleKey(key);
              }}
              className={`h-16 rounded-2xl text-xl font-bold transition-all active:scale-95 ${
                key === '⌫'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                  : key === ''
                  ? 'invisible'
                  : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit as any}
          disabled={pin.length < 4 || loading}
          className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-white py-4 rounded-2xl text-base font-bold transition-all active:scale-95"
        >
          {loading ? 'Verifying...' : 'Enter'}
        </button>
      </div>
    </div>
  );
}
