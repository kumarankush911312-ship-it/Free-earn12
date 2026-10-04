import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { sendMobileOtp, verifyMobileOtp } from '../services/api';
import { OtpInput } from '../components/OtpInput';
import { AppealModal } from '../components/AppealModal';
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
  KeyRound,
  RotateCcw,
  Edit2,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const {
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    setActiveTab: setAppActiveTab,
  } = useApp();

  // Exactly TWO tabs: Register or Sign In
  const [activeTab, setActiveTab] = useState<'register' | 'signin'>('register');

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

  // OTP Verification state
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [smsNotification, setSmsNotification] = useState<{ otp: string; phone: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [appealModalOpen, setAppealModalOpen] = useState(false);

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Read URL referral parameters (/r/CODE, ?ref=CODE or #/?ref=CODE)
  useEffect(() => {
    let ref: string | null = null;

    // 1. Check path /r/CODE or /ref/CODE
    const path = window.location.pathname;
    if (path.startsWith('/r/')) {
      ref = path.substring(3).split('/')[0].split('?')[0];
    } else if (path.startsWith('/ref/')) {
      ref = path.substring(5).split('/')[0].split('?')[0];
    }

    // 2. Check search params
    if (!ref) {
      const searchParams = new URLSearchParams(window.location.search);
      ref = searchParams.get('ref');
    }

    // 3. Check hash
    if (!ref && window.location.hash.includes('ref=')) {
      const hashQuery = window.location.hash.split('?')[1];
      if (hashQuery) {
        const hashParams = new URLSearchParams(hashQuery);
        ref = hashParams.get('ref');
      }
    }

    // 4. Check cached pending ref
    if (!ref) {
      ref = localStorage.getItem('freeearn_pending_ref');
    }

    if (ref) {
      const cleanRef = ref.trim().toUpperCase();
      localStorage.setItem('freeearn_pending_ref', cleanRef);
      setReferralCode(cleanRef);
      setActiveTab('register');
    }
  }, []);

  // STEP 1: Send OTP for Registration
  const handleSendRegistrationOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');

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
      setSuccessMessage(`OTP sent to +91 ${cleanMobile}! Valid for 5 mins.`);
      if (res.otp) {
        setSmsNotification({ otp: res.otp, phone: cleanMobile });
      }
    } else {
      setErrorMessage(res.error || 'OTP send failed. Kripya punah koshish karein.');
    }
  };

  // STEP 2: Verify Registration OTP
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
      setSuccessMessage('✓ Mobile number verified successfully!');
      return true;
    } else {
      setErrorMessage(res.error || 'Galat OTP! Kripya sahi 6-digit code dalein.');
      return false;
    }
  };

  // STEP 3: Complete Full Registration (Name, Mobile, OTP, Email, Password)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!registerName.trim()) {
      setErrorMessage('Kripya apna Full Name enter karein.');
      return;
    }

    const cleanMobile = registerMobile.replace(/[^0-9]/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      setErrorMessage('Kripya 10-digit valid Mobile Number enter karein.');
      return;
    }

    // Ensure OTP is verified
    if (!isMobileVerified) {
      if (!isOtpSent) {
        setErrorMessage('Kripya pehle "Get OTP" button par click karke OTP mangwayein.');
        return;
      }
      if (!registerOtp.trim() || registerOtp.trim().length !== 6) {
        setErrorMessage('Kripya SMS me aaya hua 6-digit OTP code enter karein.');
        return;
      }
      // Auto verify OTP now
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
      setSuccessMessage('Registration successful! Redirecting to Free Earn...');
    } else {
      setErrorMessage(res.error || 'Registration failed. Kripya details check karein.');
    }
  };

  // STEP 4: Login with Mobile Number + Password
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanMobile = signInMobile.trim();
    if (!cleanMobile) {
      setErrorMessage('Kripya apna Registered Mobile Number enter karein.');
      return;
    }

    if (!signInPassword) {
      setErrorMessage('Kripya apna Password enter karein.');
      return;
    }

    setLoading(true);
    // loginWithEmail accepts mobile number or email + password
    const res = await loginWithEmail(cleanMobile, signInPassword);
    setLoading(false);

    if (res.success) {
      setSuccessMessage('Login successful! Redirecting...');
    } else {
      setErrorMessage(res.error || 'Sign in failed. Mobile number ya Password galat hai.');
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 pt-6 pb-28 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Ambient Lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-80 h-80 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="flex items-center justify-center w-full max-w-md mb-4 px-1 z-20">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
          <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">Free Earn Official</span>
        </div>
      </div>

      <div className="relative w-full max-w-md bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/80 backdrop-blur-xl z-10 animate-in fade-in duration-300">
        {/* Top App Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex w-18 h-18 p-1 rounded-3xl bg-gradient-to-tr from-amber-400 via-purple-600 to-indigo-600 items-center justify-center shadow-2xl shadow-indigo-600/50 mb-3 animate-float-3d">
            <img src="/app-icon.svg" alt="Free Earn 3D App Icon" className="w-16 h-16 rounded-[22px] object-cover" />
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

        {/* Tab Selection: Only TWO Clean Tabs: Register & Sign In */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-indigo-900/40 rounded-2xl mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'register'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-pink-950/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Register (नया खाता)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'signin'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-indigo-300" />
            <span>Sign In (लॉगिन)</span>
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="mb-4">
            {errorMessage === 'This device or mobile number is already registered.' ||
            errorMessage.includes('already registered') ? (
              <div className="p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-left space-y-2.5 shadow-lg shadow-rose-950/50 animate-in fade-in">
                <div className="flex items-center space-x-2 text-rose-300 font-extrabold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>This device or mobile number is already registered.</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Strict Security Policy: 1 Physical Phone + 1 Mobile Number = 1 Account. Creating multiple accounts on the same phone is prohibited.
                </p>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin');
                      if (registerMobile) {
                        setSignInMobile(registerMobile.replace(/[^0-9]/g, '').slice(-10));
                      }
                      setErrorMessage('');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] shadow-md shadow-indigo-600/30 flex items-center justify-center space-x-1.5 transition-all active:scale-95"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Login with Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppealModalOpen(true)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition-all"
                  >
                    Replaced Phone?
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold space-y-2">
                <div>{errorMessage}</div>
              </div>
            )}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
            {successMessage}
          </div>
        )}

        {/* TAB 1: Complete Registration Form (Name, Mobile, OTP, Email, Password, Referral) */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            {/* 1. Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Full Name / पूरा नाम <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Apna Pura Naam (e.g. Rahul Sharma)"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 2. Mobile Number + Get OTP */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Mobile Number / मोबाइल नंबर <span className="text-rose-400">*</span>
                </label>
                {isMobileVerified && (
                  <span className="text-[10px] font-extrabold text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-slate-400 text-xs font-bold pointer-events-none">
                    <Phone className="w-3.5 h-3.5" />
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
                      const digits = e.target.value.replace(/[^0-9]/g, '');
                      setRegisterMobile(digits);
                      if (isMobileVerified) setIsMobileVerified(false);
                      if (isOtpSent) setIsOtpSent(false);
                    }}
                    className={`w-full pl-16 pr-3 py-2.5 bg-slate-950/80 border rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none ${
                      isMobileVerified
                        ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200'
                        : 'border-slate-700/80 focus:border-indigo-500'
                    }`}
                  />
                </div>

                {!isMobileVerified ? (
                  <button
                    type="button"
                    onClick={handleSendRegistrationOtp}
                    disabled={sendingOtp || otpCountdown > 0 || registerMobile.length < 10}
                    className={`px-3 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition-all shrink-0 flex items-center justify-center space-x-1 ${
                      registerMobile.length >= 10 && otpCountdown === 0
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95 shadow-indigo-600/30'
                        : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {sendingOtp ? (
                      <span>Sending...</span>
                    ) : otpCountdown > 0 ? (
                      <span>Resend ({otpCountdown}s)</span>
                    ) : isOtpSent ? (
                      <span>Resend OTP</span>
                    ) : (
                      <span>Get OTP</span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileVerified(false);
                      setIsOtpSent(false);
                      setRegisterOtp('');
                    }}
                    className="px-2.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold shrink-0 flex items-center space-x-1"
                    title="Change Mobile Number"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Change</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. Live Simulated SMS Push Card (Fast Testing & User Ease) */}
            {smsNotification && isOtpSent && !isMobileVerified && (
              <div className="p-3 bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-slate-950 border border-emerald-500/50 rounded-2xl space-y-2 shadow-xl shadow-emerald-950/50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-wider">SMS from FREE-EARN</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Just Now</span>
                </div>
                <p className="text-xs text-slate-200">
                  Your verification OTP is{' '}
                  <strong className="text-emerald-300 font-mono text-sm tracking-widest bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    {smsNotification.otp}
                  </strong>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRegisterOtp(smsNotification.otp);
                    handleVerifyRegistrationOtp(smsNotification.otp);
                  }}
                  className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-[11px] font-extrabold flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Tap to Auto-Fill & Verify OTP ({smsNotification.otp})</span>
                </button>
              </div>
            )}

            {/* 4. OTP Verification Input */}
            {isOtpSent && !isMobileVerified && (
              <div className="p-3 bg-slate-950/90 border border-indigo-900/50 rounded-2xl space-y-2 animate-in fade-in">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Enter 6-Digit OTP</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Sent to +91 {registerMobile.slice(-10)}</span>
                </label>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={registerOtp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setRegisterOtp(val);
                      if (val.length === 6) {
                        handleVerifyRegistrationOtp(val);
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-center text-base font-mono tracking-widest text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleVerifyRegistrationOtp(registerOtp)}
                    disabled={verifyingOtp || registerOtp.length !== 6}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      registerOtp.length === 6
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </div>
            )}

            {/* 5. Email Address */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Email Address / ईमेल <span className="text-rose-400">*</span>
              </label>
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

            {/* 6. Password with Show/Hide toggle */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Password / पासवर्ड 🔑 <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimum 6 characters"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 7. Referral Code (Optional) */}
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

            {/* Submit Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-extrabold shadow-lg shadow-purple-600/30 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Create Account & Start Earning</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: Sign In with Mobile Number + Password */}
        {activeTab === 'signin' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* 1. Mobile Number (Primary) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Registered Mobile Number / मोबाइल नंबर <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-slate-400 text-xs font-bold pointer-events-none">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+91</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="10-digit Mobile Number (e.g. 9876543210)"
                  value={signInMobile}
                  onChange={(e) => setSignInMobile(e.target.value)}
                  className="w-full pl-16 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Enter your 10-digit registered mobile number (or registered email).
              </p>
            </div>

            {/* 2. Password with Show/Hide toggle */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Password / पासवर्ड 🔑 <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showSignInPassword ? 'text' : 'password'}
                  required
                  placeholder="Apna Password Dalein"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-extrabold shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In with Mobile</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab Switcher helper */}
        <div className="pt-3">
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
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5 active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Go to Login</span>
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
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-md shadow-purple-600/30 transition-all flex items-center space-x-1.5 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Register Now</span>
              </button>
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
          className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800/80 border border-slate-700 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center space-x-2.5 shadow-sm active:scale-95 cursor-pointer"
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

      {/* Persistent Bottom Bar for Switching between Login & Register */}
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
            <span>Login (Sign In)</span>
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
            <span>Register (Sign Up)</span>
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
