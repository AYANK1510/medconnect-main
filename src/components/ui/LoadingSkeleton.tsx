import React from 'react';

export type SkeletonVariant = 'text' | 'avatar' | 'card' | 'table-row' | 'button';

export interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
  className?: string;
  width?: string | number;
  height?: string | number;
}

/**
 * Reusable Healthcare SaaS Loading Skeleton
 * Shimmer pulse placeholder for cards, tables, text lines, and avatars (Source Visual Authority)
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  count = 1,
  className = '',
  width,
  height,
}) => {
  const baseStyles = 'bg-slate-200/80 animate-pulse rounded-lg';

  const renderSkeleton = (key: number) => {
    switch (variant) {
      case 'avatar':
        return (
          <div
            key={key}
            className={`w-10 h-10 rounded-full ${baseStyles} ${className}`}
            style={{ width, height }}
          />
        );

      case 'card':
        return (
          <div
            key={key}
            className={`bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 space-y-4 ${className}`}
          >
            <div className="flex items-center justify-between">
              <div className="w-1/3 h-4 bg-slate-200 animate-pulse rounded-md" />
              <div className="w-16 h-6 bg-slate-100 animate-pulse rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="w-full h-3 bg-slate-100 animate-pulse rounded" />
              <div className="w-4/5 h-3 bg-slate-100 animate-pulse rounded" />
            </div>
            <div className="pt-2 flex items-center gap-3">
              <div className="w-24 h-8 bg-slate-200 animate-pulse rounded-xl" />
              <div className="w-20 h-8 bg-slate-100 animate-pulse rounded-xl" />
            </div>
          </div>
        );

      case 'table-row':
        return (
          <div
            key={key}
            className={`flex items-center justify-between p-4 border-b border-slate-100 gap-4 ${className}`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="w-1/4 h-3.5 bg-slate-200 animate-pulse rounded" />
              <div className="w-1/3 h-2.5 bg-slate-100 animate-pulse rounded" />
            </div>
            <div className="w-20 h-6 bg-slate-100 animate-pulse rounded-full" />
            <div className="w-16 h-8 bg-slate-200 animate-pulse rounded-xl" />
          </div>
        );

      case 'button':
        return (
          <div
            key={key}
            className={`h-10 w-28 rounded-xl ${baseStyles} ${className}`}
            style={{ width, height }}
          />
        );

      case 'text':
      default:
        return (
          <div
            key={key}
            className={`h-4 w-full ${baseStyles} ${className}`}
            style={{ width, height }}
          />
        );
    }
  };

  if (count > 1) {
    return (
      <div className="space-y-3 w-full">
        {Array.from({ length: count }).map((_, i) => renderSkeleton(i))}
      </div>
    );
  }

  return renderSkeleton(0);
};

export default LoadingSkeleton;
