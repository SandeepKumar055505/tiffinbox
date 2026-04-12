import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { auth as authApi } from '../../services/api';

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

  // Web OTP API integration
  useEffect(() => {
    if (step === 'otp' && 'OTPCredential' in window) {
      const controller = new AbortController();
      navigator.credentials.get({
        otp: { transport: ['sms'] },
        signal: controller.signal
      } as any).then((credential: any) => {
        if (credential) {
          setOtp(credential.code);
          handleVerifyOtp(credential.code);
        }
      }).catch(err => {
        console.log('Web OTP failed or cancelled:', err);
      });
      return () => controller.abort();
    }
  }, [step]);

  const handleShake = () => {
    setIsShaking(true);
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
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
      if ('vibrate' in navigator) navigator.vibrate(50);
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
      
      // Zenith Success: Sensorial Pulse
      if ('vibrate' in navigator) navigator.vibrate([30, 30, 100, 30, 200]);
      showToast('Identity verified. Welcome to the Circle.', 'success');
      
      await refresh();
      navigate('/', { replace: true });
    } catch (err: any) {
      handleShake();
      setOtp(''); // Clear on fail for security
      showToast(err.response?.data?.error || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    return cleaned;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bg-primary relative overflow-hidden">
      {/* Background Meshes */}
      <div className="absolute top-[-10%] -left-20 w-[40rem] h-[40rem] bg-accent/10 blur-[160px] rounded-full animate-mesh" />
      <div className="absolute bottom-[-10%] -right-20 w-[45rem] h-[45rem] bg-teal-500/10 blur-[180px] rounded-full animate-mesh" style={{ animationDelay: '5s' }} />

      <div className={`
        relative surface-liquid p-10 md:p-14 max-w-md w-full text-center space-y-10 
        animate-glass rounded-[3.5rem] shadow-elite ring-glass
        ${isShaking ? 'animate-shake' : ''}
      `}>
        <div className="space-y-4">
          <div className="text-6xl mb-6">🛡️</div>
          <h1 className="text-2xl font-black tracking-tight">Secure Your Service</h1>
          <p className="text-sm opacity-50 leading-relaxed font-medium px-4">
            {step === 'phone' 
              ? "We need your mobile number to coordinate your fresh tiffin deliveries."
              : `Enter the code sent to +91 ${phone}`}
          </p>
        </div>

        <div className="space-y-8">
          {step === 'phone' ? (
            <div className="space-y-6">
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                  <span className="text-xl">🇮🇳</span>
                  <span className="text-lg font-black opacity-40">+91</span>
                </div>
                <input
                  type="tel"
                  autoFocus
                  placeholder="98765 43210"
                  value={phone.replace(/(\d{5})(\d{0,5})/, '$1 $2').trim()}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                  className="w-full bg-bg-primary/40 border border-white/5 rounded-3xl py-6 pl-24 pr-8 text-2xl font-black tracking-widest focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all outline-none"
                />
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full btn-primary !py-5 !rounded-3xl shadow-glow-subtle disabled:grayscale disabled:opacity-30 disabled:scale-95 transition-all duration-500"
              >
                {loading ? 'Processing...' : 'Send Verification OTP'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <input
                ref={otpRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                placeholder="····"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                className="w-full bg-bg-primary/40 border border-white/5 rounded-3xl py-6 text-center text-4xl font-black tracking-[0.5em] focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-all outline-none"
              />
              
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => handleVerifyOtp()}
                  disabled={loading || otp.length < 4}
                  className="w-full btn-primary !py-5 !rounded-3xl shadow-glow-subtle disabled:grayscale disabled:opacity-30 disabled:scale-95 transition-all duration-500"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
                
                <button
                  onClick={() => { setStep('phone'); setOtp(''); }}
                  disabled={loading}
                  className="text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity"
                >
                  Change Phone Number
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-[10px] opacity-30 font-bold uppercase tracking-widest pt-4">
          Verified numbers ensure reliable delivery.
        </p>
      </div>
    </div>
  );
}
