import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Coins,
  Bell,
  Smartphone,
  Monitor,
  ShieldCheck,
  Sparkles,
  ArrowRightLeft,
} from 'lucide-react';

interface HeaderProps {
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNotifications, onOpenAuth }) => {
  const {
    user,
    isAdmin,
    activeTab,
    setActiveTab,
    isPhoneFrame,
    setIsPhoneFrame,
    settings,
    unreadNotificationCount,
  } = useApp();

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'Diamond':
        return 'from-cyan-400 to-blue-500 text-cyan-200 border-cyan-400/40';
      case 'Platinum':
        return 'from-purple-400 to-indigo-500 text-purple-200 border-purple-400/40';
      case 'Gold':
        return 'from-amber-400 to-yellow-500 text-amber-200 border-amber-400/40';
      case 'Silver':
        return 'from-slate-300 to-slate-400 text-slate-200 border-slate-400/40';
      default:
        return 'from-amber-600 to-orange-700 text-amber-200 border-orange-500/40';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/80 border-b border-indigo-900/40">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <div
          onClick={() => setActiveTab('home')}
          className="flex items-center space-x-2.5 cursor-pointer group select-none"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-purple-200">
                FREE EARN
              </span>
              {user && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-gradient-to-r ${getLevelColor(
                    user.level
                  )}`}
                >
                  {user.level}
                </span>
              )}
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE API</span>
              </span>
            </div>
            <p className="text-[10px] font-medium text-indigo-300/80 tracking-wide">
              Earn Smart. Earn Daily.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Toggle Phone Frame Simulator (Visible on desktop) */}
          <button
            onClick={() => setIsPhoneFrame((prev) => !prev)}
            className="btn-3d hidden md:flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 hover:text-white border-b-2 border-b-indigo-950 shadow-sm transition-colors"
            title={isPhoneFrame ? 'Switch to Full Width Web View' : 'Switch to Android Mobile Mockup'}
          >
            {isPhoneFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
          </button>

          {/* User Logged In / Coins Badge in 3D */}
          {user ? (
            <div
              onClick={() => setActiveTab('wallet')}
              className="btn-3d flex items-center space-x-2 bg-gradient-to-b from-indigo-950/90 to-slate-900 border-t border-indigo-400/40 border-b-3 border-indigo-950 px-3 py-1.5 rounded-xl cursor-pointer hover:border-indigo-400/80 transition-all shadow-lg shadow-indigo-950/60 group"
            >
              <div className="coin-3d w-6 h-6 flex items-center justify-center shadow-md">
                <Coins className="w-3.5 h-3.5 text-amber-950 font-black" />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs font-black text-white leading-none drop-shadow-sm">
                  {user.coins.toLocaleString()}
                </span>
                <span className="text-[10px] font-extrabold text-emerald-400 leading-none">
                  {settings.currencySymbol}
                  {(user.coins / settings.coinToCurrencyRatio).toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn-3d btn-3d-purple text-xs font-black px-4 py-1.5 rounded-xl text-white shadow-md hover:opacity-95 transition-opacity"
            >
              Sign In
            </button>
          )}

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="btn-3d relative w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-700/50 border-b-2 border-b-indigo-950 flex items-center justify-center text-indigo-300 hover:text-white transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-md animate-bounce">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
