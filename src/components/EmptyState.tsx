import React from 'react';
import { ShieldCheck, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = ShieldCheck,
}) => {
  return (
    <div className="p-8 rounded-3xl glass-panel bg-slate-900/50 border border-slate-800 text-center space-y-4 max-w-md mx-auto my-6 animate-fadeIn">
      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
        <Icon className="w-7 h-7 text-cyan-400" />
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-base text-white">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold text-xs hover:bg-cyan-500/30 transition inline-flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4 text-cyan-400" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
