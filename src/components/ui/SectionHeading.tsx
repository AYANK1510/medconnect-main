import React from 'react';

export interface SectionHeadingProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  tag?: string;
  className?: string;
  titleClassName?: string;
}

/**
 * Reusable Healthcare SaaS Section Heading
 * Typography scale, subtitle, action slot, optional status badge (Source Visual Authority)
 */
export const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  description,
  badge,
  actions,
  tag,
  className = '',
  titleClassName = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className}`}>
      <div className="space-y-1">
        {tag && (
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {tag}
          </p>
        )}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className={`text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight ${titleClassName}`}>
            {title}
          </h2>
          {badge && <div>{badge}</div>}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 font-normal max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};

export default SectionHeading;
