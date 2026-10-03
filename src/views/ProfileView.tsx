import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  User,
  Phone,
  Mail,
  Shield,
  HelpCircle,
  FileText,
  Lock,
  LogOut,
  Edit2,
  Check,
  ChevronRight,
  Sparkles,
  Award,
  Smartphone,
  ShieldAlert,
  Headphones,
  CheckCircle2,
} from 'lucide-react';

interface ProfileViewProps {
  onOpenAuth: () => void;
  onOpenFaq: () => void;
  onOpenTerms: () => void;
  onOpenContact: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onOpenAuth,
  onOpenFaq,
  onOpenTerms,
  onOpenContact,
}) => {
  const { user, logout, updateUserContact, isAdmin, setActiveTab } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) return;

    await updateUserContact(name, mobile);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  if (!user) {
    return (
      <div className="py-20 text-center space-y-4 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
          <User className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white">Join Free Earn Today</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Sign in with your mobile number to start earning daily coins, complete tasks, and cashout to UPI.
        </p>
        <button
          onClick={onOpenAuth}
          className="py-3 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Profile Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 p-6 border border-indigo-500/30 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white">{user.name}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {user.level}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">{user.mobile || 'No mobile set'}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">UID: {user.uid}</p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 text-indigo-400 hover:text-white rounded-xl bg-slate-800/80 transition-colors"
            title="Edit Profile"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {saveSuccess && (
          <div className="mt-3 p-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile updated successfully!</span>
          </div>
        )}

        {/* Edit Profile Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-4 pt-4 border-t border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-indigo-900 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number</label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-indigo-900 rounded-xl text-xs text-white"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* User Stats Grid */}
        <div className="mt-5 grid grid-cols-2 gap-2 pt-4 border-t border-indigo-900/50">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-indigo-950">
            <span className="text-[10px] text-slate-400 block">Referral Code</span>
            <span className="text-xs font-bold text-indigo-300 font-mono">{user.referralCode}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-indigo-950">
            <span className="text-[10px] text-slate-400 block">Account Status</span>
            <span className="text-xs font-bold text-emerald-400">● Active Verified</span>
          </div>
        </div>
      </div>

      {/* Settings & Support Links */}
      <div className="glass-card rounded-3xl p-2 border border-indigo-900/40 divide-y divide-indigo-950">
        <button
          onClick={onOpenFaq}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-indigo-950/30 rounded-2xl transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                FAQ & Earning Rules
              </h4>
              <p className="text-[10px] text-slate-400">Coin values, payout minimums & verification</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={onOpenContact}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-indigo-950/30 rounded-2xl transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                Help Center & Support
              </h4>
              <p className="text-[10px] text-slate-400">Email, WhatsApp & problem reporting</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={onOpenTerms}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-indigo-950/30 rounded-2xl transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                Terms of Service & Privacy
              </h4>
              <p className="text-[10px] text-slate-400">Anti-fraud rules, Fair Play & legal info</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={onOpenAuth}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-indigo-950/30 rounded-2xl transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                Switch / Register Another Account
              </h4>
              <p className="text-[10px] text-slate-400">Login with email, phone, or test a new referral registration</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={logout}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-rose-950/20 rounded-2xl transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-400">Logout</h4>
              <p className="text-[10px] text-slate-400">End your current session on this device</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* App Branding Footer */}
      <div className="text-center pt-3 pb-2 text-slate-400 space-y-1">
        <p className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">
          Free Earn • v2.4.0
        </p>
        <p className="text-[10px]">“Earn Smart. Earn Daily.”</p>
      </div>
    </div>
  );
};
