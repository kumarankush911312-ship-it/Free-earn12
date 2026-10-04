import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { sendMobileOtp, verifyMobileOtp } from '../services/api';
import { AppealModal } from './AppealModal';
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
  Edit2,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, setActiveTab: setAppActiveTab } = useApp();

  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');

  // Sign In state (Mobile Number + Password)
  const [signInMobile, setSignInMobile] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Register state (Name, Mobile, OTP, Email, Password, Referral)
  const [registerName, setRegisterName] = useState('');
  const [registerMobile, setRegisterMobile] = useState('');
  const [registerOtp, setRegisterOtp] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [referralCode, setReferralCode] = useState(() => {
    return localStorage.getItem('freeearn_pending_ref') || '';
  });

  // OTP state
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [smsNotification, setSmsNotification] = useState<{ otp: string; phone: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [appealModalOpen, setAppealModalOpen] = useState(false);

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  useEffect(() => {
    if (isOpen) {
      const pendingRef = localStorage.getItem('freeearn_pending_ref');
      if (pendingRef) {
        setReferralCode(pendingRef);
        setActiveTab('register');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Send Registration OTP
  const handleSendRegistrationOtp = async () => {
    setErrorMessage('');
    const cleanMobile = registerMobile.replace(/[^0-9]/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      setErrorMessage('Kripya 10-digit valid Mobile Number enter karein.');
      return;
    }

    setSendingOtp(true);
    const res = await sendMobileOtp(cleanMobile, registerName.trim(), 'register');
    setSendingOtp(false);

    if (res.success) {
      setIsOtpSent(true);
      setOtpCountdown(30);
      if (res.otp) {
        setSmsNotification({ otp: res.otp, phone: cleanMobile });
      }
    } else {
      setErrorMessage(res.error || 'OTP send failed. Kripya punah koshish karein.');
    }
  };

  // Verify Registration OTP
  const handleVerifyRegistrationOtp = async (codeToVerify?: string) => {
    setErrorMessage('');
    const code = (codeToVerify || registerOtp).trim();
    const cleanMobile = registerMobile.replace(/[^0-9]/g, '').slice(-10);

    if (cleanMobile.length !== 10) {
      setErrorMessage('Kripya 10-digit mobile number enter karein.');
      return false;
    }
    if (!code || code.length !== 6) {
      setErrorMessage('Kripya 6-digit OTP code enter karein.');
      return false;
    }

    setVerifyingOtp(true);
    const res = await verifyMobileOtp(cleanMobile, code);
    setVerifyingOtp(false);

    if (res.success) {
      setIsMobileVerified(true);
      return true;
    } else {
      setErrorMessage(res.error || 'Galat OTP! Kripya sahi 6-digit code dalein.');
      return false;
    }
  };

  // Sign-In with Mobile + Password
  const handleMobileSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const cleanMobile = signInMobile.trim();
    if (!cleanMobile) {
      setErrorMessage('Kripya apna Mobile Number enter karein.');
      setLoading(false);
      return;
    }

    const res = await loginWithEmail(cleanMobile, signInPassword);
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Sign in failed. Mobile number ya password galat hai.');
    }
  };

  // Registration with Name, Mobile, OTP, Email, Password
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!registerName.trim()) {
      setErrorMessage('Kripya apna Full Name enter karein.');
      return;
    }

    const cleanMobile = registerMobile.replace(/[^0-9]/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      setErrorMessage('Kripya 10-digit valid Mobile Number enter karein.');
      return;
    }

    if (!isMobileVerified) {
      if (!isOtpSent) {
        setErrorMessage('Kripya pehle "Get OTP" par click karein.');
        return;
      }
      if (!registerOtp.trim() || registerOtp.trim().length !== 6) {
        setErrorMessage('Kripya 6-digit OTP code enter karein.');
        return;
      }
      const verified = await handleVerifyRegistrationOtp(registerOtp.trim());
      if (!verified) return;
    }

    if (!registerEmail.trim() || !registerEmail.includes('@')) {
      setErrorMessage('Kripya ek valid Email address enter karein.');
      return;
    }

    if (!registerPassword || registerPassword.length < 6) {
      setErrorMessage('Password kam se kam 6 characters ka hona chahiye.');
      return;
    }

    setLoading(true);
    const res = await registerWithEmail(
      registerName.trim(),
      registerEmail.trim(),
      registerPassword,
      cleanMobile,
      referralCode.trim()
    );
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Registration failed');
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding & Admin Link */}
        <div className="text-center mb-5">
          <div className="inline-flex w-14 h-14 p-0.5 rounded-2xl bg-gradient-to-tr from-amber-400 via-purple-600 to-indigo-600 items-center justify-center shadow-lg shadow-indigo-600/40 mb-2">
            <img src="/app-icon.svg" alt="Free Earn" className="w-full h-full rounded-[14px] object-cover" />
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">FREE EARN</h3>
          <p className="text-xs text-indigo-300">Earn Daily & Instant UPI Withdrawals</p>
        </div>

        {/* Tab Selection: Exactly TWO Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-indigo-900/40 rounded-2xl mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setErrorMessage('');
            }}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'signin'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-indigo-300" />
            <span>Sign In (लॉगिन)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage('');
            }}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'register'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Register (नया खाता)</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4">
            {errorMessage === 'This device or mobile number is already registered.' ||
            errorMessage.includes('already registered') ? (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-left space-y-2">
                <div className="flex items-center space-x-2 text-rose-300 font-extrabold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>This device or mobile number is already registered.</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Strict Rule: 1 Phone + 1 Mobile = 1 Account.
                </p>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin');
                      if (registerMobile) setSignInMobile(registerMobile);
                      setErrorMessage('');
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs"
                  >
                    Login with Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppealModalOpen(true)}
                    className="py-1.5 px-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700"
                  >
                    Replaced Phone?
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {/* TAB 1: Sign In with Mobile Number + Password */}
        {activeTab === 'signin' && (
          <form onSubmit={handleMobileSignIn} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Registered Mobile Number / मोबाइल नंबर
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-slate-400 text-xs font-bold pointer-events-none">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+91</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="10-digit Mobile Number"
                  value={signInMobile}
                  onChange={(e) => setSignInMobile(e.target.value)}
                  className="w-full pl-16 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Password / पासवर्ड 🔑</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showSignInPassword ? 'text' : 'password'}
                  required
                  placeholder="Apna Password Dalein"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-extrabold shadow-md flex items-center justify-center space-x-2"
            >
              {loading ? <span>Signing In...</span> : <span>Sign In with Mobile</span>}
            </button>
          </form>
        )}

        {/* TAB 2: Register Form (Name, Mobile, OTP, Email, Password, Referral) */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            {/* 1. Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Full Name / पूरा नाम</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Apna Pura Naam"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 2. Mobile Number + Get OTP */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300">Mobile Number</label>
                {isMobileVerified && (
                  <span className="text-[10px] font-extrabold text-emerald-400 flex items-center space-x-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-slate-400 text-xs font-bold pointer-events-none">
                    <Phone className="w-3 h-3 text-indigo-400" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    disabled={isMobileVerified}
                    placeholder="10-digit Number"
                    value={registerMobile}
                    onChange={(e) => {
                      setRegisterMobile(e.target.value.replace(/[^0-9]/g, ''));
                      if (isMobileVerified) setIsMobileVerified(false);
                      if (isOtpSent) setIsOtpSent(false);
                    }}
                    className="w-full pl-14 pr-2 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {!isMobileVerified ? (
                  <button
                    type="button"
                    onClick={handleSendRegistrationOtp}
                    disabled={sendingOtp || otpCountdown > 0 || registerMobile.length < 10}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      registerMobile.length >= 10 && otpCountdown === 0
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {sendingOtp ? 'Sending...' : otpCountdown > 0 ? `${otpCountdown}s` : 'Get OTP'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileVerified(false);
                      setIsOtpSent(false);
                    }}
                    className="px-2 py-1 bg-slate-800 text-indigo-300 text-xs rounded-xl"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* OTP Simulation SMS */}
            {smsNotification && isOtpSent && !isMobileVerified && (
              <div className="p-2.5 bg-emerald-950/90 border border-emerald-500/50 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-emerald-400 font-bold text-[10px]">
                  <span>SMS from FREE-EARN</span>
                  <span className="font-mono">OTP: {smsNotification.otp}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRegisterOtp(smsNotification.otp);
                    handleVerifyRegistrationOtp(smsNotification.otp);
                  }}
                  className="w-full py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold"
                >
                  Tap to Auto-Fill & Verify OTP ({smsNotification.otp})
                </button>
              </div>
            )}

            {/* OTP Input */}
            {isOtpSent && !isMobileVerified && (
              <div className="p-2.5 bg-slate-950/90 border border-indigo-900/50 rounded-xl space-y-1.5">
                <label className="text-[10px] font-bold text-slate-300">Enter 6-Digit OTP</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6-digit OTP"
                    value={registerOtp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setRegisterOtp(val);
                      if (val.length === 6) handleVerifyRegistrationOtp(val);
                    }}
                    className="flex-1 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono text-sm text-amber-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleVerifyRegistrationOtp(registerOtp)}
                    disabled={verifyingOtp || registerOtp.length !== 6}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
                  >
                    Verify
                  </button>
                </div>
              </div>
            )}

            {/* 3. Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Email Address / ईमेल</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 4. Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Password / पासवर्ड 🔑</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimum 6 characters"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 5. Referral Code */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Referral Code (Optional) <span className="text-emerald-400">+50 Coins</span>
              </label>
              <input
                type="text"
                placeholder="e.g. ANKUSH07"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-950/80 border border-indigo-900/50 rounded-xl text-xs font-mono text-indigo-300 uppercase focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white text-xs font-extrabold shadow-md flex items-center justify-center space-x-1.5"
            >
              {loading ? <span>Creating Account...</span> : <span>Register & Start Earning</span>}
            </button>
          </form>
        )}

        {/* Google Sign In */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white flex items-center justify-center space-x-2"
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

      {/* Replaced Phone Appeal Modal */}
      <AppealModal
        isOpen={appealModalOpen}
        onClose={() => setAppealModalOpen(false)}
        mode="replaced_phone"
        initialMobile={registerMobile || signInMobile}
      />
    </div>
  );
};
