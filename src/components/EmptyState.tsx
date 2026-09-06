import React from 'react';
import { ShieldCheck, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = ShieldCheck,
}) => {
  return (
    <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-card text-center space-y-4 max-w-md mx-auto my-6 animate-fadeIn">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600 shadow-sm">
        <Icon className="w-7 h-7 text-blue-600" />
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-base text-slate-900">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs transition shadow-sm inline-flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;
