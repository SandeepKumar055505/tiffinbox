import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { auth as authApi } from '../../services/api';
import { haptics } from '../../context/SensorialContext';

export default function PhoneVerificationPage() {
  const { user, refresh } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const otpRef = useRef<HTMLInputElement>(null);

  // Web OTP API — auto-fill from SMS
  useEffect(() => {
    if (step === 'otp' && 'OTPCredential' in window) {
      const controller = new AbortController();
      navigator.credentials.get({
        otp: { transport: ['sms'] },
        signal: controller.signal,
      } as any).then((credential: any) => {
        if (credential) {
          setOtp(credential.code);
          handleVerifyOtp(credential.code);
        }
      }).catch(() => {});
      return () => controller.abort();
    }
  }, [step]);

  const handleShake = () => {
    setIsShaking(true);
    haptics.error();
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      handleShake();
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }
    setLoading(true);
    try {
      await authApi.sendOtp(phone);
      showToast('OTP sent to +91 ' + phone, 'info');
      setStep('otp');
      haptics.impact();
    } catch (err: any) {
      handleShake();
      showToast(err.response?.data?.error || 'Failed to send OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (codeOverride?: string) => {
    const finalOtp = codeOverride || otp;
    if (finalOtp.length < 4) {
      handleShake();
      showToast('Please enter the 4-digit OTP.', 'error');
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyPhone(phone, finalOtp);
      haptics.success();
      showToast('Phone verified successfully!', 'success');
      await refresh();
      navigate('/', { replace: true });
    } catch (err: any) {
      handleShake();
      setOtp('');
      showToast(err.response?.data?.error || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (val: string) => val.replace(/\D/g, '').slice(0, 10);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-10%] -left-20 w-[40rem] h-[40rem] bg-accent/10 blur-[160px] rounded-full animate-mesh" />
      <div className="absolute bottom-[-10%] -right-20 w-[45rem] h-[45rem] bg-teal-500/10 blur-[180px] rounded-full animate-mesh" style={{ animationDelay: '5s' }} />

      <div className={`relative surface-liquid w-full max-w-sm mx-auto p-6 sm:p-10 text-center space-y-8 animate-glass rounded-3xl shadow-elite ring-glass ${isShaking ? 'animate-shake' : ''}`}>

        {/* Header */}
        <div className="space-y-3">
          <div className="text-5xl">🛡️</div>
          <h1 className="text-xl font-black tracking-tight">Verify Your Number</h1>
          <p className="text-xs opacity-50 leading-relaxed font-medium">
            {step === 'phone'
              ? 'We need your mobile number to coordinate your tiffin deliveries.'
              : `Enter the 4-digit code sent to +91 ${phone}`}
          </p>
        </div>

        {/* Step: Phone */}
        {step === 'phone' && (
          <div className="space-y-4">
            {/* Phone input — flag + code fixed, number fills remaining space */}
            <div className="flex items-center bg-bg-primary/40 border border-white/10 rounded-2xl overflow-hidden focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/20 transition-all">
              <div className="flex items-center gap-1.5 pl-4 pr-3 border-r border-white/10 shrink-0">
                <span className="text-lg">🇮🇳</span>
                <span className="text-sm font-black opacity-50">+91</span>
              </div>
              <input
                type="tel"
                autoFocus
                inputMode="numeric"
                placeholder="98765 43210"
                value={phone.replace(/(\d{5})(\d{0,5})/, '$1 $2').trim()}
                onChange={e => setPhone(formatPhone(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                className="flex-1 min-w-0 bg-transparent py-4 px-3 text-lg font-black tracking-widest outline-none"
              />
              {phone.length > 0 && (
                <span className={`pr-4 text-xs font-bold shrink-0 ${phone.length === 10 ? 'text-teal-400' : 'opacity-30'}`}>
                  {phone.length}/10
                </span>
              )}
            </div>

            <button
              onClick={handleSendOtp}
              disabled={loading || phone.length !== 10}
              className="w-full btn-primary py-4 rounded-2xl disabled:opacity-40 disabled:scale-95 transition-all duration-300"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <div className="space-y-4">
            <input
              ref={otpRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="· · · ·"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
              className="w-full bg-bg-primary/40 border border-white/10 rounded-2xl py-5 text-center text-4xl font-black tracking-[0.6em] focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all outline-none"
            />

            <button
              onClick={() => handleVerifyOtp()}
              disabled={loading || otp.length < 4}
              className="w-full btn-primary py-4 rounded-2xl disabled:opacity-40 disabled:scale-95 transition-all duration-300"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              onClick={() => { setStep('phone'); setOtp(''); }}
              disabled={loading}
              className="text-xs opacity-40 hover:opacity-80 transition-opacity font-semibold"
            >
              Change phone number
            </button>
          </div>
        )}

        <p className="text-[10px] opacity-25 font-bold uppercase tracking-widest">
          Verified numbers ensure reliable delivery
        </p>
      </div>
    </div>
  );
}
