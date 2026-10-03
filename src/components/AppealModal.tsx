import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { submitSecurityAppeal, submitDeviceAppeal } from '../services/security';
import { X, ShieldAlert, Send, CheckCircle2, Smartphone } from 'lucide-react';

interface AppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
  initialMobile?: string;
  mode?: 'security' | 'replaced_phone';
}

export const AppealModal: React.FC<AppealModalProps> = ({
  isOpen,
  onClose,
  initialMessage,
  initialMobile = '',
  mode = 'security',
}) => {
  const { user } = useApp();
  const [appealText, setAppealText] = useState(initialMessage || '');
  const [mobileInput, setMobileInput] = useState(initialMobile);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responseMsg, setResponseMsg] = useState('');
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealText.trim()) return;

    setLoading(true);
    setFormError('');
    if (mode === 'replaced_phone') {
      const cleanMobile = mobileInput.replace(/[^0-9]/g, '').slice(-10);
      const res = await submitDeviceAppeal({
        mobile: cleanMobile,
        name: nameInput.trim() || 'Earner User',
        reason: appealText.trim(),
      });
      setLoading(false);
      if (res.success) {
        setSubmitted(true);
        setResponseMsg(res.message || 'Phone replacement appeal submitted to admin successfully.');
      } else {
        setFormError(res.error || 'Submission failed. Kripya punah try karein.');
      }
    } else {
      if (!user) return;
      const res = await submitSecurityAppeal(user.uid, appealText.trim());
      setLoading(false);
      if (res.success) {
        setSubmitted(true);
        setResponseMsg(res.message || 'Appeal submitted successfully.');
      } else {
        setFormError(res.error || 'Submission failed. Kripya punah try karein.');
      }
    }
  };

  const isReplacedPhone = mode === 'replaced_phone';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl shadow-rose-950/80">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            isReplacedPhone
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
          }`}>
            {isReplacedPhone ? <Smartphone className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">
              {isReplacedPhone ? 'Replaced Phone Verification' : 'Security Review & Appeal'}
            </h3>
            <p className="text-xs text-slate-400">
              {isReplacedPhone ? '1 Phone = 1 Account Admin Review' : 'Fair Play & Account Integrity Team'}
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="space-y-4 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-200">{responseMsg}</p>
            <p className="text-[11px] text-slate-400">
              {isReplacedPhone
                ? 'The admin team will verify your phone replacement and unlock your account within 24 hours.'
                : 'Our compliance team will review your account ledger and device telemetry within 24 hours.'}
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                {formError}
              </div>
            )}
            <div className={`p-3 rounded-2xl text-xs ${
              isReplacedPhone
                ? 'bg-indigo-950/40 border border-indigo-800/40 text-indigo-300'
                : 'bg-rose-950/40 border border-rose-800/40 text-rose-300'
            }`}>
              {isReplacedPhone
                ? 'Did you buy a new phone or replace your device? Submit your registered phone number for admin verification and device transfer.'
                : 'If you believe this was triggered by a network delay or false positive, please share brief details below:'}
            </div>

            {isReplacedPhone && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Registered Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobileInput}
                    onChange={(e) => setMobileInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="10-digit registered number"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {isReplacedPhone ? 'Reason / New Phone Details' : 'Your Explanation / Issue Details'}
              </label>
              <textarea
                required
                rows={3}
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                placeholder={isReplacedPhone ? 'e.g. Bought a new phone (Redmi Note 13), please unlink my old phone and approve this device.' : 'Describe what happened...'}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !appealText.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-black text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Submitting Appeal...' : 'Submit to Admin for Review'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
