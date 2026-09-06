import React from 'react';

export type BadgeVariant = 'blue' | 'green' | 'emergency' | 'warning' | 'neutral' | 'purple';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulseDot?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Reusable Healthcare SaaS Badge
 * Clean, soft pill badge with subtle borders and status tints (Source Visual Authority)
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  size = 'md',
  dot = false,
  pulseDot = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-semibold rounded-full select-none';

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2'
  };

  const variantStyles: Record<BadgeVariant, string> = {
    blue: 'bg-blue-50 text-blue-700 border border-blue-200/80',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    emergency: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/80',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/80',
  };

  const dotColors: Record<BadgeVariant, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    emergency: 'bg-rose-500',
    warning: 'bg-amber-500',
    neutral: 'bg-slate-500',
    purple: 'bg-purple-500',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.blue} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || 'bg-blue-500'} ${
            pulseDot ? 'animate-pulse' : ''
          }`}
        />
      )}
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
