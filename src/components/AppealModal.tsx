import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { submitSecurityAppeal } from '../services/security';
import { X, ShieldAlert, Send, CheckCircle2 } from 'lucide-react';

interface AppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export const AppealModal: React.FC<AppealModalProps> = ({
  isOpen,
  onClose,
  initialMessage,
}) => {
  const { user } = useApp();
  const [appealText, setAppealText] = useState(initialMessage || '');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responseMsg, setResponseMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !appealText.trim()) return;

    setLoading(true);
    const res = await submitSecurityAppeal(user.uid, appealText.trim());
    setLoading(false);

    if (res.success) {
      setSubmitted(true);
      setResponseMsg(res.message || 'Appeal submitted successfully.');
    }
  };

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
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">Security Review & Appeal</h3>
            <p className="text-xs text-slate-400">Fair Play & Account Integrity Team</p>
          </div>
        </div>

        {submitted ? (
          <div className="space-y-4 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-200">{responseMsg}</p>
            <p className="text-[11px] text-slate-400">
              Our compliance team will review your account ledger and device telemetry within 24 hours.
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
            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
              "Suspicious activity detected. Please try again later or contact support."
            </div>

            <p className="text-xs text-slate-300">
              If you believe this was triggered by a network delay or false positive, please share brief details below:
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Your Explanation / Issue Details
              </label>
              <textarea
                required
                rows={4}
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                placeholder="e.g. My WiFi disconnected while completing the task, please verify my completion."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !appealText.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Submitting Appeal...' : 'Submit Appeal to Admin'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
