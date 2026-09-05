import React from 'react';
import { useApp } from '../contexts/AppContext';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isEmergency = toast.type === 'emergency';
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl glass-panel shadow-2xl border flex items-start justify-between space-x-3 animate-slideRight ${
              isEmergency
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-900/30'
                : isSuccess
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-900/30'
                : isWarning
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-200 shadow-amber-900/30'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            <div className="flex items-start space-x-2.5">
              {isEmergency && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
              {!isEmergency && !isSuccess && !isWarning && <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />}

              <div className="space-y-0.5">
                <h4 className="font-bold text-xs">{toast.title}</h4>
                <p className="text-xs opacity-90 leading-tight">{toast.message}</p>
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-slate-800 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
