import React from 'react';

export const SkeletonCard: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div className="p-5 rounded-3xl glass-panel bg-slate-900/80 border border-slate-800 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-slate-800 rounded-lg skeleton-shimmer"></div>
        <div className="h-5 w-16 bg-slate-800 rounded-full skeleton-shimmer"></div>
      </div>
      <div className="h-6 w-3/4 bg-slate-800 rounded-lg skeleton-shimmer"></div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-3 w-full bg-slate-800/60 rounded-md skeleton-shimmer"></div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} rows={2} />
      ))}
    </div>
  );
};
