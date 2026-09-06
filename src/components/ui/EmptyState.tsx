import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
  bordered?: boolean;
  className?: string;
}

/**
 * Reusable Healthcare SaaS Empty State
 * Clean illustration container, title, description, and primary CTA (Source Visual Authority)
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no active entries in this queue or view right now.',
  actionLabel,
  onAction,
  actionIcon,
  children,
  bordered = true,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl ${
        bordered ? 'bg-white border border-slate-200/80 shadow-card' : 'bg-transparent'
      } ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-sm">
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-slate-500 font-normal max-w-sm mt-1.5 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <div className="mt-6">
          <Button
            variant="primary"
            size="md"
            onClick={onAction}
            leftIcon={actionIcon}
          >
            {actionLabel}
          </Button>
        </div>
      )}

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
};

export default EmptyState;
