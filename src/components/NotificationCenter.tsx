import React, { useState, useEffect } from 'react';
import { Bell, X, Check, MessageSquare, Phone, Send, AlertTriangle } from 'lucide-react';
import {
  getUnifiedNotifications,
  markNotificationAsRead,
} from '../services/notificationService';
import type { UnifiedNotificationRecord } from '../services/notificationService';

interface NotificationCenterProps {
  isOpen?: boolean;
  onClose?: () => void;
  standaloneTrigger?: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  standaloneTrigger = true,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [notifications, setNotifications] = useState<UnifiedNotificationRecord[]>([]);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
  };

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
        return <Send className="w-3 h-3 text-sky-500" />;
      case 'whatsapp':
        return <MessageSquare className="w-3 h-3 text-emerald-500" />;
      case 'sms':
        return <MessageSquare className="w-3 h-3 text-amber-500" />;
      case 'voice':
        return <Phone className="w-3 h-3 text-purple-500" />;
      default:
        return <Bell className="w-3 h-3 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string, failureReason?: string) => {
    switch (status) {
      case 'READ':
        return (
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-100 text-slate-500 rounded border border-slate-200">
            READ
          </span>
        );
      case 'FAILED':
        return (
          <span
            className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-rose-50 text-rose-700 rounded border border-rose-200 flex items-center gap-1"
            title={failureReason}
          >
            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
            <span>{failureReason || 'FAILED'}</span>
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
            SENT
          </span>
        );
    }
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button (shown when used as standalone trigger) */}
      {standaloneTrigger && (
        <button
          type="button"
          onClick={() => {
            loadNotifications();
            setInternalOpen(!internalOpen);
          }}
          className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200/60 transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-extrabold text-white animate-pulse shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200/90 shadow-dropdown z-50 overflow-hidden animate-fadeIn select-none">
          {/* Header */}
          <div className="p-3.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-slate-900">Notifications</span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {unreadCount} New
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  All Caught Up
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark read</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No active notifications in stream
              </div>
            ) : (
              notifications.map((n) => {
                const isEmergency = n.category === 'EMERGENCY';
                const isAppointment = n.category === 'APPOINTMENT';
                const isUnread = n.status !== 'READ';

                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkItemRead(n.id)}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 cursor-pointer transition-all ${
                      isEmergency
                        ? 'bg-rose-50/60 hover:bg-rose-50 border-rose-200/80'
                        : isAppointment
                        ? 'bg-blue-50/60 hover:bg-blue-50 border-blue-200/80'
                        : 'bg-slate-50/60 hover:bg-slate-50 border-slate-200/80'
                    } ${isUnread ? (isEmergency ? 'border-l-4 border-l-rose-600' : 'border-l-4 border-l-blue-600') : 'opacity-70'}`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        {getChannelIcon(n.channel)}
                        <span className="font-bold text-slate-900">{n.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 text-[8px] font-mono uppercase bg-white text-slate-500 rounded border border-slate-200 font-semibold">
                          {n.channel}
                        </span>
                        {getStatusBadge(n.status, n.failureReason)}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">{n.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;

