import React, { useState, useEffect } from 'react';
import { Bell, X, Check, MessageSquare, Phone, Send, AlertTriangle } from 'lucide-react';
import {
  getUnifiedNotifications,
  markNotificationAsRead,
} from '../services/notificationService';
import type { UnifiedNotificationRecord } from '../services/notificationService';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UnifiedNotificationRecord[]>([]);

  const loadNotifications = () => {
    const records = getUnifiedNotifications();
    setNotifications(records);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 2000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => n.status !== 'READ').length;

  const handleMarkAllRead = () => {
    notifications.forEach((n) => markNotificationAsRead(n.id));
    loadNotifications();
  };

  const handleMarkItemRead = (id: string) => {
    markNotificationAsRead(id);
    loadNotifications();
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'telegram':
        return <Send className="w-3 h-3 text-sky-400" />;
      case 'whatsapp':
        return <MessageSquare className="w-3 h-3 text-emerald-400" />;
      case 'sms':
        return <MessageSquare className="w-3 h-3 text-amber-400" />;
      case 'voice':
        return <Phone className="w-3 h-3 text-purple-400" />;
      default:
        return <Bell className="w-3 h-3 text-cyan-400" />;
    }
  };

  const getStatusBadge = (status: string, failureReason?: string) => {
    switch (status) {
      case 'READ':
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-800 text-slate-400 rounded">READ</span>;
      case 'FAILED':
        return (
          <span
            className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 rounded border border-rose-500/40 flex items-center space-x-1"
            title={failureReason}
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            <span>{failureReason || 'FAILED'}</span>
          </span>
        );
      default:
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40">SENT</span>;
    }
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          loadNotifications();
          setIsOpen(!isOpen);
        }}
        className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40 transition"
      >
        <Bell className="w-4 h-4 text-cyan-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 rounded-3xl glass-panel bg-slate-900/95 border border-slate-700 shadow-2xl z-50 overflow-hidden animate-slideUp">
          <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-xs text-white">Unified Notification Center</span>
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-cyan-400 hover:underline font-semibold flex items-center space-x-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark all read</span>
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">No active notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkItemRead(n.id)}
                  className={`p-3 rounded-2xl border text-xs space-y-1.5 cursor-pointer transition ${
                    n.category === 'EMERGENCY'
                      ? 'bg-rose-950/30 border-rose-500/40'
                      : n.category === 'APPOINTMENT'
                      ? 'bg-cyan-950/30 border-cyan-500/40'
                      : 'bg-slate-950 border-slate-800'
                  } ${n.status !== 'READ' ? 'border-l-4 border-l-cyan-400' : 'opacity-70'}`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center space-x-1.5">
                      {getChannelIcon(n.channel)}
                      <span className="font-bold text-slate-200">{n.title}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="px-1.5 py-0.5 text-[8px] font-mono uppercase bg-slate-800 text-slate-400 rounded">
                        {n.channel}
                      </span>
                      {getStatusBadge(n.status, n.failureReason)}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
