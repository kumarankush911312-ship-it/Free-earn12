import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Bell, CheckCheck, Gift, ArrowDownCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationsAsRead } = useApp();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'reward':
        return <Gift className="w-4 h-4 text-emerald-400" />;
      case 'withdrawal':
        return <ArrowDownCircle className="w-4 h-4 text-indigo-400" />;
      case 'task':
        return <CheckCircle2 className="w-4 h-4 text-cyan-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-sm h-full bg-slate-900 border-l border-indigo-900/40 p-5 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-indigo-900/40">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              <p className="text-[10px] text-slate-400">{notifications.length} recent alerts</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={markNotificationsAsRead}
              className="p-1.5 text-xs text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-300">No new notifications</p>
              <p className="text-[10px] text-slate-500 mt-1">
                You’ll get updates when rewards are credited or tasks are verified.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-2xl border transition-all ${
                  n.read
                    ? 'bg-slate-950/40 border-slate-800/50 text-slate-300'
                    : 'bg-indigo-950/40 border-indigo-500/30 text-white shadow-sm shadow-indigo-950/40'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5 p-1.5 rounded-xl bg-slate-800/80 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white truncate">{n.title}</h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 ml-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{n.message}</p>
                    <span className="text-[9px] text-slate-500 mt-1 block">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
