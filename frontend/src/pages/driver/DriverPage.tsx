import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverDelivery } from '../../services/driverApi';

const STATUS_META: Record<string, { label: string; bg: string; dot: string }> = {
  preparing:        { label: 'Preparing',        bg: 'bg-blue-500/15 border-blue-500/30',    dot: 'bg-blue-400' },
  out_for_delivery: { label: 'Out for Delivery',  bg: 'bg-yellow-500/15 border-yellow-500/30', dot: 'bg-yellow-400' },
  delivered:        { label: 'Delivered',          bg: 'bg-teal-500/15 border-teal-500/30',    dot: 'bg-teal-400' },
  failed:           { label: 'Failed',             bg: 'bg-red-500/15 border-red-500/30',      dot: 'bg-red-400' },
};

const MEAL_ICON: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

export default function DriverPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Fail reason modal
  const [failModal, setFailModal] = useState<{ id: number } | null>(null);
  const [failReason, setFailReason] = useState('');

  // OTP verification modal
  const [otpModal, setOtpModal] = useState<{ id: number; person: string } | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['driver-manifest'],
    queryFn: () => driverDelivery.manifest().then(r => r.data),
    refetchInterval: 60_000,
  });

  const update = useMutation({
    mutationFn: ({ id, status, fail_reason, otp }: { id: number; status: string; fail_reason?: string; otp?: string }) =>
      driverDelivery.updateStatus(id, { status, fail_reason, otp }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-manifest'] });
      setFailModal(null);
      setFailReason('');
      setOtpModal(null);
      setOtpValue('');
      setOtpError('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Something went wrong';
      const left = err?.response?.data?.attempts_left;
      setOtpError(left !== undefined ? `${msg} (${left} attempts left)` : msg);
    },
  });

  function openOtpModal(item: any) {
    setOtpModal({ id: item.id, person: item.person_name || item.user_name });
    setOtpValue('');
    setOtpError('');
  }

  function handleOtpKey(digit: string) {
    if (otpValue.length < 4) setOtpValue(v => v + digit);
  }

  function confirmDelivery() {
    if (!otpModal || otpValue.length < 4) return;
    setOtpError('');
    update.mutate({ id: otpModal.id, status: 'delivered', otp: otpValue });
  }

  function logout() {
    localStorage.removeItem('tb_driver_token');
    navigate('/driver/login');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse text-sm">Loading deliveries...</div>
      </div>
    );
  }

  const routes: Record<string, any[]> = data?.routes || {};
  const total = data?.total || 0;
  const delivered = Object.values(routes).flat().filter((i: any) => i.delivery_status === 'delivered').length;

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-sm">Today's Deliveries</p>
          <p className="text-xs text-gray-500">{delivered}/{total} delivered · {data?.date}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="text-xs text-teal-400 bg-teal-500/10 px-3 py-1.5 rounded-lg border border-teal-500/20"
          >
            Refresh
          </button>
          <button
            onClick={logout}
            className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-teal-500 transition-all duration-500"
            style={{ width: `${(delivered / total) * 100}%` }}
          />
        </div>
      )}

      {total === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <span className="text-4xl">✅</span>
          <p className="text-gray-400 text-sm">No deliveries dispatched yet today</p>
          <p className="text-gray-600 text-xs">Check back after kitchen marks meals as preparing</p>
        </div>
      )}

      {/* Route groups */}
      <div className="space-y-6 p-4">
        {Object.entries(routes).map(([area, items]) => (
          <div key={area}>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-bold text-teal-400 uppercase tracking-widest">{area}</p>
              <div className="flex-1 h-px bg-white/5" />
              <p className="text-xs text-gray-600">{items.length} stops</p>
            </div>

            <div className="space-y-3">
              {items.map((item: any) => {
                const meta = STATUS_META[item.delivery_status];
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 space-y-3 ${meta?.bg || 'bg-white/5 border-white/10'}`}
                  >
                    {/* Status + meal type */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${meta?.dot}`} />
                        <span className="text-xs font-bold text-gray-300">{meta?.label}</span>
                      </div>
                      <span className="text-sm">{MEAL_ICON[item.meal_type]}</span>
                    </div>

                    {/* Person + item */}
                    <div>
                      <p className="text-white font-bold text-base leading-tight">{item.person_name || item.user_name}</p>
                      <p className="text-gray-400 text-sm">{item.item_name}</p>
                    </div>

                    {/* Address + phone */}
                    <div className="space-y-1">
                      <p className="text-gray-500 text-xs leading-relaxed">{item.address}</p>
                      <a
                        href={`tel:${item.user_phone}`}
                        className="inline-flex items-center gap-1.5 text-teal-400 text-sm font-semibold"
                      >
                        📞 {item.user_phone}
                      </a>
                    </div>

                    {/* Action buttons */}
                    {item.delivery_status === 'preparing' && (
                      <button
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: item.id, status: 'out_for_delivery' })}
                        className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 disabled:opacity-50 text-yellow-400 border border-yellow-500/30 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                      >
                        🛵 Pick up & Go
                      </button>
                    )}

                    {item.delivery_status === 'out_for_delivery' && (
                      <div className="space-y-2 pt-1">
                        <p className="text-xs text-yellow-400/80 text-center">
                          User received OTP on their phone — ask them for it
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            disabled={update.isPending}
                            onClick={() => openOtpModal(item)}
                            className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                          >
                            ✓ Verify OTP & Deliver
                          </button>
                          <button
                            disabled={update.isPending}
                            onClick={() => { setFailModal({ id: item.id }); setFailReason(''); }}
                            className="bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-400 border border-red-500/30 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                          >
                            ✗ Failed
                          </button>
                        </div>
                      </div>
                    )}

                    {item.delivery_status === 'delivered' && (
                      <div className="text-center text-teal-400 text-sm font-bold py-2">
                        ✓ Delivered
                      </div>
                    )}

                    {item.delivery_status === 'failed' && item.fail_reason && (
                      <p className="text-xs text-red-400 italic">Reason: {item.fail_reason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* OTP verification modal */}
      {otpModal && (
        <>
          <div className="fixed inset-0 bg-black/70 z-40" onClick={() => { setOtpModal(null); setOtpError(''); }} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-3xl p-6 space-y-5 border-t border-white/10">
            <div className="text-center space-y-1">
              <h3 className="text-white font-bold text-lg">Confirm Delivery</h3>
              <p className="text-gray-400 text-sm">Ask <span className="text-white font-semibold">{otpModal.person}</span> for their OTP</p>
              <p className="text-gray-600 text-xs">They received it on their phone when you picked up</p>
            </div>

            {/* OTP dots display */}
            <div className="flex justify-center gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold border-2 transition-all ${
                    i < otpValue.length
                      ? 'border-teal-400 bg-teal-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-transparent'
                  }`}
                >
                  {i < otpValue.length ? '●' : '·'}
                </div>
              ))}
            </div>

            {otpError && (
              <p className="text-center text-sm text-red-400 font-medium">{otpError}</p>
            )}

            {/* Number pad */}
            <div className="grid grid-cols-3 gap-2">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key) => (
                <button
                  key={key}
                  disabled={!key || update.isPending}
                  onClick={() => {
                    setOtpError('');
                    if (key === '⌫') setOtpValue(v => v.slice(0, -1));
                    else handleOtpKey(key);
                  }}
                  className={`h-14 rounded-2xl text-xl font-bold transition-all active:scale-95 ${
                    key === '⌫'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : key === ''
                      ? 'invisible'
                      : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setOtpModal(null); setOtpValue(''); setOtpError(''); }}
                className="flex-1 py-3.5 rounded-xl text-gray-400 bg-white/5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                disabled={otpValue.length < 4 || update.isPending}
                onClick={confirmDelivery}
                className="flex-1 bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-white py-3.5 rounded-xl text-sm font-bold active:scale-95"
              >
                {update.isPending ? 'Verifying...' : 'Confirm Delivered'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Fail reason modal */}
      {failModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setFailModal(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-3xl p-6 space-y-4 border-t border-white/10">
            <h3 className="text-white font-bold text-lg">Mark as Failed</h3>
            <p className="text-gray-400 text-sm">What went wrong? (optional)</p>
            <textarea
              value={failReason}
              onChange={e => setFailReason(e.target.value)}
              placeholder="e.g. Customer not at home, wrong address..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-red-400/50 resize-none min-h-[80px]"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setFailModal(null)}
                className="flex-1 py-3.5 rounded-xl text-gray-400 bg-white/5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                disabled={update.isPending}
                onClick={() => update.mutate({ id: failModal.id, status: 'failed', fail_reason: failReason || undefined })}
                className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white py-3.5 rounded-xl text-sm font-bold active:scale-95"
              >
                {update.isPending ? 'Saving...' : 'Confirm Failed'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
