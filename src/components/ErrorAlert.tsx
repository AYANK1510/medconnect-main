import React from 'react';
import { AlertCircle, RotateCcw, ShieldCheck } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  onUseDemo?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onRetry, onUseDemo }) => {
  return (
    <div className="p-5 rounded-2xl glass-panel bg-rose-950/40 border border-rose-500/40 space-y-3 animate-fadeIn">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-xs text-rose-200">Connection Warning</h4>
          <p className="text-xs text-rose-300/90">{message}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-1">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-500/30 transition flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        )}

        {onUseDemo && (
          <button
            onClick={onUseDemo}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-500/30 transition flex items-center space-x-1"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Switch to Demo Mode</span>
          </button>
        )}
      </div>
    </div>
  );
};
