import React from 'react';
import { AlertCircle, RotateCcw, ShieldCheck } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  onUseDemo?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onRetry, onUseDemo }) => {
  return (
    <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200/80 shadow-sm space-y-3 animate-fadeIn">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-xs text-rose-900">Connection Notice</h4>
          <p className="text-xs text-rose-700 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-1">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-xs transition flex items-center space-x-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        )}

        {onUseDemo && (
          <button
            onClick={onUseDemo}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition flex items-center space-x-1 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Switch to Demo Mode</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;
