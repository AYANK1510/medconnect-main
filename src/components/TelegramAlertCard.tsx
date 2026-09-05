import React from 'react';
import { Send, CheckCircle2, ShieldAlert } from 'lucide-react';

interface TelegramAlertCardProps {
  hospitalName: string;
  resourceName: string;
  quantity: number;
  distanceKm: number;
  requestId: string;
  onAccept?: () => void;
}

export const TelegramAlertCard: React.FC<TelegramAlertCardProps> = ({
  hospitalName,
  resourceName,
  quantity,
  distanceKm,
  onAccept
}) => {
  return (
    <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-5 space-y-4 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Send className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white tracking-wide">TELEGRAM REGIONAL DISPATCH ALERT</span>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 rounded-full border border-sky-500/40">
          BOT BROADCAST
        </span>
      </div>

      <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
        <div className="font-bold text-rose-400 flex items-center space-x-1">
          <ShieldAlert className="w-4 h-4" />
          <span>CRITICAL RESOURCE EMERGENCY</span>
        </div>
        
        <div className="space-y-1 text-slate-300 pt-1 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Requesting Facility:</span>
            <span className="text-white font-bold">{hospitalName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Needed Resource:</span>
            <span className="text-teal-300 font-bold uppercase">{resourceName.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Required Quantity:</span>
            <span className="text-white font-bold">{quantity} Units</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Haversine Radius:</span>
            <span className="text-emerald-400 font-bold">{distanceKm} km away</span>
          </div>
        </div>
      </div>

      {onAccept && (
        <button
          onClick={onAccept}
          className="w-full py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Accept Request & Reserve Inventory</span>
        </button>
      )}
    </div>
  );
};
