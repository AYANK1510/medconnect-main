import React from 'react';

export type StatusType = 'online' | 'active' | 'critical' | 'waiting' | 'in-progress' | 'completed' | 'offline';
export type StatusSize = 'sm' | 'md' | 'lg';

export interface StatusIndicatorProps {
  status?: StatusType;
  label?: string;
  pulse?: boolean;
  size?: StatusSize;
  showLabel?: boolean;
  className?: string;
}

/**
 * Reusable Status Indicator
 * Pulsing dot or badge indicator with healthcare operational states (Source Visual Authority)
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status = 'active',
  label,
  pulse = true,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const statusConfig: Record<
    StatusType,
    { color: string; textColor: string; bgColor: string; borderColor: string; defaultLabel: string }
  > = {
    online: {
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200/80',
      defaultLabel: 'Operational',
    },
    active: {
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200/80',
      defaultLabel: 'Active',
    },
    critical: {
      color: 'bg-rose-500',
      textColor: 'text-rose-700',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200/80',
      defaultLabel: 'Emergency Active',
    },
    waiting: {
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200/80',
      defaultLabel: 'In Queue',
    },
    'in-progress': {
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200/80',
      defaultLabel: 'In Consultation',
    },
    completed: {
      color: 'bg-slate-400',
      textColor: 'text-slate-600',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200/80',
      defaultLabel: 'Completed',
    },
    offline: {
      color: 'bg-slate-300',
      textColor: 'text-slate-500',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      defaultLabel: 'Disconnected',
    },
  };

  const config = statusConfig[status] || statusConfig.active;
  const displayLabel = label || config.defaultLabel;

  const dotSizes: Record<StatusSize, string> = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      <span className="relative flex items-center justify-center">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${config.color}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full ${dotSizes[size] || dotSizes.md} ${config.color}`}
        />
      </span>
      {showLabel && <span>{displayLabel}</span>}
    </span>
  );
};

export default StatusIndicator;
