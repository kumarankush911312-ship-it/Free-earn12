import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Home,
  Flame,
  Wallet,
  Users,
  User,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'earn' as const, label: 'Earn', icon: Flame, badge: 'Hot' },
    { id: 'wallet' as const, label: 'Wallet', icon: Wallet },
    { id: 'team' as const, label: 'Team', icon: Users },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl bg-slate-950/92 border-t border-indigo-500/30 pb-safe shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.7)]">
      <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn-3d relative flex flex-col items-center justify-center flex-1 py-1 group select-none transition-all duration-200"
            >
              {/* Active Tab 3D Glow Pill */}
              {isActive && (
                <span className="absolute -top-2 w-10 h-1.5 rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 shadow-md shadow-indigo-500/80" />
              )}

              <div
                className={`relative p-1.5 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-tr from-indigo-600/40 to-purple-600/40 text-indigo-300 scale-110 shadow-lg shadow-indigo-600/30 border border-indigo-400/40'
                    : 'text-slate-400 group-hover:text-indigo-300 group-hover:scale-105'
                }`}
              >
                <Icon className="w-5 h-5 drop-shadow-sm" />

                {tab.badge && !isActive && (
                  <span className="badge-3d absolute -top-1 -right-1.5 px-1.5 py-0.2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full text-[8px] font-black uppercase tracking-tighter">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[11px] font-bold tracking-tight mt-0.5 transition-colors ${
                  isActive ? 'text-white drop-shadow-sm' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
