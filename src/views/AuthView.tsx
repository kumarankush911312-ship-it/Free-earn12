import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { sendMobileOtp, verifyMobileOtp } from '../services/api';
import { OtpInput } from '../components/OtpInput';
import {
  Sparkles,
  Phone,
  Mail,
  Lock,
  User,
  Gift,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Award,
  KeyRound,
  RotateCcw,
  Edit2,
  Check,
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const {
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    loginWithMobile,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'register' | 'signin' | 'mobile'>('register');

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Register state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerMobile, setRegisterMobile] = useState('');
  const [referralCode, setReferralCode] = useState(() => {
    return localStorage.getItem('freeearn_pending_ref') || '';
  });
  const [hasReferral, setHasReferral] = useState(() => {
    return !!localStorage.getItem('freeearn_pending_ref');
  });

  // Mobile fast login state
  const [mobileOnly, setMobileOnly] = useState('');
  const [mobileName, setMobileName] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'otp'>('phone');
  const [otpInput, setOtpInput] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [smsNotification, setSmsNotification] = useState<{ otp: string; phone: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  useEffect(() => {
    // Check if referral in storage or URL
    const searchParams = new URLSearchParams(window.location.search);
    let ref = searchParams.get('ref');
    if (!ref && window.location.hash.includes('ref=')) {
      const hashQuery = window.location.hash.split('?')[1];
      if (hashQuery) {
        const hashParams = new URLSearchParams(hashQuery);
        ref = hashParams.get('ref');
      }
    }
    if (ref) {
      const cleanRef = ref.trim().toUpperCase();
      localStorage.setItem('freeearn_pending_ref', cleanRef);
      setReferralCode(cleanRef);
      setHasReferral(true);
      setActiveTab('register');
    }
  }, []);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    const res = await loginWithEmail(signInEmail, signInPassword);
    setLoading(false);

    if (res.success) {
      setSuccessMessage('Login successful! Redirecting...');
    } else {
      setErrorMessage(res.error || 'Sign in failed');
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    const res = await registerWithEmail(
      registerName,
      registerEmail,
      registerPassword,
      registerMobile,
      referralCode
    );
    setLoading(false);

    if (res.success) {
      setSuccessMessage('Registration successful! Welcome to Free Earn.');
    } else {
      setErrorMessage(res.error || 'Registration failed');
    }
  };

  // Step 1: Send OTP to Phone
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const clean = mobileOnly.replace(/[^0-9]/g, '');
    if (clean.length < 10) {
      setErrorMessage('Kripya 10-digit valid mobile number enter karein.');
      return;
    }

    setLoading(true);
    const res = await sendMobileOtp(mobileOnly, mobileName);
    setLoading(false);

    if (res.success) {
      setOtpStep('otp');
      setOtpCountdown(30);
      setSuccessMessage(`OTP sent to +91 ${clean.slice(-10)}!`);
      if (res.otp) {
        setSmsNotification({ otp: res.otp, phone: clean.slice(-10) });
      }
    } else {
      setErrorMessage(res.error || 'OTP send failed. Kripya punah koshish karein.');
    }
  };

  // Step 2: Verify OTP and Login
  const handleVerifyAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const clean = mobileOnly.replace(/[^0-9]/g, '');
    const cleanOtp = otpInput.trim();

    if (cleanOtp.length !== 6) {
      setErrorMessage('Kripya 6-digit OTP code enter karein.');
      return;
    }

    setLoading(true);
    const verifyRes = await verifyMobileOtp(mobileOnly, cleanOtp);
    if (!verifyRes.success) {
      setLoading(false);
      setErrorMessage(verifyRes.error || 'Galat OTP! Kripya check karke punah enter karein.');
      return;
    }

    // OTP Verified! Log user in
    const res = await loginWithMobile(
      mobileName.trim() || `Earner ${clean.slice(-4)}`,
      mobileOnly,
      referralCode
    );
    setLoading(false);

    if (res.success) {
      setSuccessMessage('OTP Verified! Welcome to Free Earn.');
    } else {
      setErrorMessage(res.error || 'Mobile login failed');
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setErrorMessage('');
    setLoading(true);
    const res = await sendMobileOtp(mobileOnly, mobileName);
    setLoading(false);

    if (res.success) {
      setOtpCountdown(30);
      setSuccessMessage('Naya OTP bhej diya gaya hai!');
      if (res.otp) {
        setSmsNotification({ otp: res.otp, phone: mobileOnly.replace(/[^0-9]/g, '').slice(-10) });
      }
    } else {
      setErrorMessage(res.error || 'Resend failed.');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const res = await loginWithGoogle();
    setLoading(false);

    if (res.success) {
      setSuccessMessage('Google Login successful!');
    } else {
      setErrorMessage(res.error || 'Google Sign-In failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 pt-8 pb-28 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Ambient Lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-80 h-80 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/80 backdrop-blur-xl z-10 animate-in fade-in duration-300">
        
        {/* Top App Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 items-center justify-center shadow-2xl shadow-indigo-600/40 mb-3 animate-float-3d">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-purple-200 tracking-tight">
            FREE EARN
          </h1>
          <p className="text-xs text-indigo-300/90 font-medium mt-0.5">
            Earn Smart. Earn Daily. Instant UPI & Bank Payouts.
          </p>

          {/* Referral Banner if present */}
          {referralCode && (
            <div className="mt-3 py-1.5 px-3 rounded-full bg-emerald-500/20 border border-emerald-500/30 inline-flex items-center space-x-1.5">
              <Gift className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-300">
                Referral Code <span className="font-extrabold text-white">{referralCode}</span> Applied (+50 Free Coins)
              </span>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 p-1 bg-slate-950/80 border border-indigo-900/40 rounded-2xl mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage('');
            }}
            className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'register'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setErrorMessage('');
            }}
            className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'signin'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('mobile');
              setErrorMessage('');
            }}
            className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'mobile'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Mobile OTP</span>
          </button>
        </div>

        {/* Error / Success Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold space-y-2">
            <div>{errorMessage}</div>
            {(errorMessage.toLowerCase().includes('google') || errorMessage.toLowerCase().includes('popup')) && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('mobile');
                  setErrorMessage('');
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all text-center block shadow-md"
              >
                👉 Use Fast Mobile Number Login
              </button>
            )}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
            {successMessage}
          </div>
        )}

        {/* TAB 1: Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleEmailRegister} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Apna Pura Naam"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="10-digit Mobile Number"
                  value={registerMobile}
                  onChange={(e) => setRegisterMobile(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Referral code accordion/input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center space-x-1">
                  <Gift className="w-3 h-3 text-pink-400" />
                  <span>Referral Code (Optional)</span>
                </label>
                <span className="text-[10px] text-emerald-400 font-bold">+50 Bonus Coins</span>
              </div>
              <input
                type="text"
                placeholder="e.g. ANKUSH07"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-indigo-900/50 rounded-xl text-sm font-mono text-indigo-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-sm font-extrabold shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <span>Create Account & Start Earning</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: Sign In Form */}
        {activeTab === 'signin' && (
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Email or Username</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="Apna Registered Email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Apna Password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-extrabold shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 3: Fast Mobile OTP Verification & Login */}
        {activeTab === 'mobile' && (
          <div className="space-y-4">
            {/* Real-time SMS Notification Simulation Banner */}
            {smsNotification && (
              <div className="p-3.5 bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-slate-950 border border-emerald-500/50 rounded-2xl space-y-2 shadow-xl shadow-emerald-950/50 animate-in fade-in slide-in-from-top-3 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[11px] font-black uppercase tracking-wider">SMS from FREE-EARN</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Just Now</span>
                </div>
                <p className="text-xs text-slate-200">
                  Your mobile verification OTP is{' '}
                  <strong className="text-emerald-300 font-mono text-base tracking-widest bg-emerald-900/60 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                    {smsNotification.otp}
                  </strong>
                  . Do not share it with anyone.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOtpInput(smsNotification.otp);
                    setSuccessMessage('OTP Auto-filled!');
                  }}
                  className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-[11px] font-extrabold flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/30 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Tap to Auto-Fill OTP ({smsNotification.otp})</span>
                </button>
              </div>
            )}

            {otpStep === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Apna Naam (e.g. Rahul Sharma)"
                      value={mobileName}
                      onChange={(e) => setMobileName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Mobile Number (10 Digits)</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 border-r border-slate-700 pr-2">
                      +91
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      maxLength={10}
                      value={mobileOnly}
                      onChange={(e) => setMobileOnly(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-14 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Referral Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. ANKUSH07"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-indigo-900/50 rounded-xl text-sm font-mono text-indigo-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-sm font-extrabold shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <span>Sending OTP...</span>
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      <span>Send OTP to Phone</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndLogin} className="space-y-4 animate-in fade-in duration-200">
                <div className="p-3 bg-slate-950/70 border border-indigo-900/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">OTP Sent To:</span>
                      <span className="text-xs font-bold text-white font-mono">
                        +91 {mobileOnly.slice(-10)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('phone');
                      setErrorMessage('');
                    }}
                    className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold flex items-center space-x-1 transition-all"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                </div>

                <div className="py-1">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5 mb-2.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Enter 6-Digit Verification Code</span>
                  </label>

                  <OtpInput
                    length={6}
                    value={otpInput}
                    onChange={(val) => {
                      setOtpInput(val);
                      if (errorMessage) setErrorMessage('');
                    }}
                    onComplete={(code) => {
                      setOtpInput(code);
                    }}
                    countdownSeconds={30}
                    onResend={handleResendOtp}
                    disabled={loading}
                    error={errorMessage}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpInput.trim().length !== 6}
                  className={`w-full py-3 rounded-xl text-white text-sm font-extrabold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center space-x-2 ${
                    otpInput.trim().length === 6
                      ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 shadow-emerald-600/30 cursor-pointer'
                      : 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-75'
                  }`}
                >
                  {loading ? (
                    <span>Verifying Code...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Verify OTP & Sign In</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Dynamic Context Switcher Buttons */}
        <div className="pt-2">
          {activeTab === 'register' && (
            <div className="p-3 bg-slate-950/80 border border-indigo-900/40 rounded-2xl flex items-center justify-between shadow-inner">
              <span className="text-xs text-slate-300 font-medium">Already have an account?</span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5 active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Login Button</span>
              </button>
            </div>
          )}

          {activeTab === 'signin' && (
            <div className="p-3 bg-slate-950/80 border border-purple-900/40 rounded-2xl flex items-center justify-between shadow-inner">
              <span className="text-xs text-slate-300 font-medium">New earner?</span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-md shadow-purple-600/30 transition-all flex items-center space-x-1.5 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Register Button</span>
              </button>
            </div>
          )}

          {activeTab === 'mobile' && (
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-[11px] text-slate-400 block text-center font-medium">Or choose another method:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Login Button</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-purple-900/40"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Register Button</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
            <span className="bg-slate-900 px-3 text-slate-400">Or continue with</span>
          </div>
        </div>

        {/* Google Fast Sign-in */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800/80 border border-slate-700 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center space-x-2.5 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Footer info: User Trust & Fair play notice */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-semibold">100% Verified Payouts</span>
          </div>

          <span className="text-slate-500 font-medium">
            256-Bit SSL Protected
          </span>
        </div>
      </div>

      {/* Persistent Bottom Bar with Login and Register Buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-slate-950/95 backdrop-blur-xl border-t border-indigo-500/30 shadow-[0_-10px_25px_rgba(0,0,0,0.8)]">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setErrorMessage('');
              setSuccessMessage('');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`py-3 px-3 rounded-2xl font-black text-xs flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95 ${
              activeTab === 'signin'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-600/40 border border-indigo-400/50'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-850 border border-slate-800 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>Login Button</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage('');
              setSuccessMessage('');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`py-3 px-3 rounded-2xl font-black text-xs flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95 ${
              activeTab === 'register'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-pink-600/40 border border-pink-400/50'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-850 border border-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Register Button</span>
          </button>
        </div>
      </div>
    </div>
  );
};
