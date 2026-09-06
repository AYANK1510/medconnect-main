import React from 'react';

export type IconButtonVariant = 'ghost' | 'outline' | 'secondary' | 'primary' | 'emergency';
export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonRounded = 'lg' | 'xl' | 'full';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  badgeCount?: number;
  showDot?: boolean;
  rounded?: IconButtonRounded;
}

/**
 * Reusable Healthcare SaaS Icon Button
 * Accessible icon-only button with tooltip, status badge, and hover interactions (Source Visual Authority)
 */
export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'md',
  badgeCount,
  showDot = false,
  className = '',
  onClick,
  disabled = false,
  rounded = 'xl',
  ...props
}) => {
  const baseStyles = 'relative inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 focus:ring-offset-1';

  const sizeStyles: Record<IconButtonSize, string> = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const iconSizes: Record<IconButtonSize, string> = {
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
    lg: 'w-5 h-5',
  };

  const roundedStyles: Record<IconButtonRounded, string> = {
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  const variantStyles: Record<IconButtonVariant, string> = {
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-300',
    outline: 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm focus:ring-slate-300',
    secondary: 'text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-250 focus:ring-slate-300',
    primary: 'text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm focus:ring-blue-500/30',
    emergency: 'text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 focus:ring-rose-400',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${roundedStyles[rounded] || roundedStyles.xl} ${variantStyles[variant] || variantStyles.ghost} ${className}`}
      {...props}
    >
      <Icon className={iconSizes[size] || iconSizes.md} />

      {/* Optional Counter Badge */}
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}

      {/* Optional Dot Notification */}
      {showDot && !badgeCount && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
      )}
    </button>
  );
};

export default IconButton;
