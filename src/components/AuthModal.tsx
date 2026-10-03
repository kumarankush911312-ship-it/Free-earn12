import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { sendMobileOtp, verifyMobileOtp } from '../services/api';
import { OtpInput } from './OtpInput';
import {
  X,
  Phone,
  User,
  Gift,
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  RotateCcw,
  Edit2,
  Check,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, loginWithMobile } = useApp();

  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'mobile'>('signin');

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

  // Countdown timer for Resend OTP
  React.useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  React.useEffect(() => {
    if (isOpen) {
      const pendingRef = localStorage.getItem('freeearn_pending_ref');
      if (pendingRef) {
        setReferralCode(pendingRef);
        setHasReferral(true);
        setActiveTab('register');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Real Email/Password Sign-In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const res = await loginWithEmail(signInEmail, signInPassword);
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Sign in failed');
    }
  };

  // Real Email/Password Registration
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
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
      onClose();
    } else {
      setErrorMessage(res.error || 'Registration failed');
    }
  };

  // Step 1: Send OTP to Phone
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

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
      setErrorMessage(verifyRes.error || 'Galat OTP! Kripya check karke punah dalein.');
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
      onClose();
    } else {
      setErrorMessage(res.error || 'Mobile sign in failed');
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
      if (res.otp) {
        setSmsNotification({ otp: res.otp, phone: mobileOnly.replace(/[^0-9]/g, '').slice(-10) });
      }
    } else {
      setErrorMessage(res.error || 'Resend failed.');
    }
  };

  // Real Google Sign-In with Firebase
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');

    const res = await loginWithGoogle();
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Google Sign-In failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl shadow-indigo-950/80 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center space-x-1.5">
              <span>Free Earn</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Real Firebase Auth
              </span>
            </h2>
            <p className="text-xs text-indigo-300/80">Earn Smart. Earn Daily.</p>
          </div>
        </div>

        {/* Tabs: Sign In / Create Account / Mobile */}
        <div className="grid grid-cols-3 p-1 bg-slate-950/80 border border-indigo-900/40 rounded-2xl mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setErrorMessage('');
            }}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
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
              setActiveTab('register');
              setErrorMessage('');
            }}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
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
              setActiveTab('mobile');
              setErrorMessage('');
            }}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'mobile'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Mobile</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
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

        {/* ================= TAB 1: REAL EMAIL/PASSWORD SIGN IN ================= */}
        {activeTab === 'signin' && (
          <form onSubmit={handleEmailSignIn} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-indigo-900/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-indigo-900/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-3d btn-3d-emerald w-full py-2.5 px-4 rounded-xl text-white font-black text-xs shadow-xl flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Authenticating with Firebase...' : 'Sign In'}</span>
            </button>
          </form>
        )}

        {/* ================= TAB 2: REAL EMAIL/PASSWORD REGISTRATION ================= */}
        {activeTab === 'register' && (
          <form onSubmit={handleEmailRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-indigo-900/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-indigo-900/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Min 6 chars"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950/70 border border-indigo-900/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mobile (UPI/Payout)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={registerMobile}
                    onChange={(e) => setRegisterMobile(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950/70 border border-indigo-900/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Referral code accordion */}
            <div>
              <button
                type="button"
                onClick={() => setHasReferral(!hasReferral)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>{hasReferral ? 'Remove referral code' : 'Have a friend’s referral code? (+50 Coins bonus)'}</span>
              </button>

              {hasReferral && (
                <div className="mt-1.5">
                  <input
                    type="text"
                    placeholder="Enter code (e.g. FE7489A)"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 bg-slate-950/70 border border-indigo-900/50 rounded-xl text-xs text-white placeholder-slate-500 uppercase tracking-wider focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-3d btn-3d-purple w-full py-2.5 px-4 rounded-xl text-white font-black text-xs shadow-xl flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Creating Real Account...' : 'Create Account & Get 100 Coins'}</span>
            </button>
          </form>
        )}

        {/* ================= TAB 3: REAL MOBILE AUTH WITH 2-STEP OTP ================= */}
        {activeTab === 'mobile' && (
          <div className="space-y-3.5">
            {/* Real-time SMS Notification Simulation Banner */}
            {smsNotification && (
              <div className="p-3 bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border border-emerald-500/50 rounded-2xl space-y-1.5 shadow-lg shadow-emerald-950/40 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-wider">SMS from FREE-EARN</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Just Now</span>
                </div>
                <p className="text-[11px] text-slate-200">
                  Your OTP code is{' '}
                  <strong className="text-emerald-300 font-mono text-sm tracking-widest bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    {smsNotification.otp}
                  </strong>
                  .
                </p>
                <button
                  type="button"
                  onClick={() => setOtpInput(smsNotification.otp)}
                  className="w-full py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold flex items-center justify-center space-x-1 transition-all"
                >
                  <Check className="w-3 h-3" />
                  <span>Tap to Auto-Fill OTP ({smsNotification.otp})</span>
                </button>
              </div>
            )}

            {otpStep === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={mobileName}
                      onChange={(e) => setMobileName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-indigo-900/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    10-Digit Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      maxLength={10}
                      value={mobileOnly}
                      onChange={(e) => setMobileOnly(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-indigo-900/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-3d btn-3d-emerald w-full py-2.5 px-4 rounded-xl text-white font-black text-xs shadow-xl flex items-center justify-center space-x-2"
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
              <form onSubmit={handleVerifyAndLogin} className="space-y-3.5 animate-in fade-in duration-200">
                <div className="p-2.5 bg-slate-950/70 border border-indigo-900/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <div>
                      <span className="text-[9px] text-slate-400 block font-semibold">OTP Sent To:</span>
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
                    className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-bold flex items-center space-x-1"
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
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-black text-xs shadow-xl flex items-center justify-center space-x-2 transition-all ${
                    otpInput.trim().length === 6
                      ? 'btn-3d btn-3d-emerald cursor-pointer'
                      : 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-70'
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

        {/* Bottom Switcher: Login Button & Register Button */}
        <div className="pt-2">
          {activeTab === 'register' && (
            <div className="p-2.5 bg-slate-950/70 border border-indigo-900/40 rounded-xl flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Already registered?</span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setErrorMessage('');
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1"
              >
                <Lock className="w-3 h-3" />
                <span>Login Button</span>
              </button>
            </div>
          )}

          {activeTab === 'signin' && (
            <div className="p-2.5 bg-slate-950/70 border border-purple-900/40 rounded-xl flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Don't have an account?</span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMessage('');
                }}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Register Button</span>
              </button>
            </div>
          )}

          {activeTab === 'mobile' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setErrorMessage('');
                }}
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center space-x-1"
              >
                <Lock className="w-3 h-3 text-indigo-400" />
                <span>Login Button</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMessage('');
                }}
                className="py-1.5 px-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-semibold text-xs flex items-center justify-center space-x-1"
              >
                <Sparkles className="w-3 h-3 text-yellow-300" />
                <span>Register Button</span>
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500 bg-slate-900 px-2">
            Or Real Google Account
          </div>
        </div>

        {/* Real Google Sign-in */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center space-x-2.5"
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
      </div>
    </div>
  );
};
