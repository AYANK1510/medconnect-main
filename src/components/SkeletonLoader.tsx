import React from 'react';

export const SkeletonCard: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-slate-200 rounded-md"></div>
        <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
      </div>
      <div className="h-5 w-3/4 bg-slate-200 rounded-md"></div>
      <div className="space-y-2 pt-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-3 w-full bg-slate-100 rounded-md"></div>
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

export default SkeletonCard;
