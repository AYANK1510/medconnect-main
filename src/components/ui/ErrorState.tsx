import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import Button from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryAction?: React.ReactNode;
  className?: string;
}

/**
 * Reusable Healthcare SaaS Error State
 * Controlled warning/error box with alert icon, descriptive text, and retry button (Source Visual Authority)
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while fetching healthcare records. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
  secondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-10 rounded-2xl bg-white border border-rose-200/80 shadow-card ${className}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-3.5 shadow-sm">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-slate-500 font-normal max-w-sm mt-1.5 leading-relaxed">
        {message}
      </p>

      {(onRetry || secondaryAction) && (
        <div className="mt-5 flex items-center gap-3">
          {onRetry && (
            <Button
              variant="emergency"
              size="sm"
              onClick={onRetry}
              leftIcon={RotateCcw}
            >
              {retryLabel}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};

export default ErrorState;
