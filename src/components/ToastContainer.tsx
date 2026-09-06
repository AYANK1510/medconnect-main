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
            className={`pointer-events-auto p-4 rounded-2xl shadow-dropdown border flex items-start justify-between space-x-3 animate-slideRight ${
              isEmergency
                ? 'bg-rose-50/95 border-rose-200 text-rose-900 shadow-rose-500/10'
                : isSuccess
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-500/10'
                : isWarning
                ? 'bg-amber-50/95 border-amber-200 text-amber-900 shadow-amber-500/10'
                : 'bg-white border-slate-200/90 text-slate-900'
            }`}
          >
            <div className="flex items-start space-x-2.5">
              {isEmergency && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
              {!isEmergency && !isSuccess && !isWarning && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}

              <div className="space-y-0.5">
                <h4 className="font-bold text-xs">{toast.title}</h4>
                <p className="text-xs opacity-90 leading-tight">{toast.message}</p>
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
