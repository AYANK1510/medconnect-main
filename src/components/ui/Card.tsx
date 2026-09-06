import React from 'react';

export type CardVariant = 'default' | 'hover' | 'elevated' | 'subtle' | 'emergencyAccent' | 'primaryAccent';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

/**
 * Reusable Healthcare SaaS Card
 * Large radius (rounded-2xl), soft border, very subtle shadow, generous padding (Source Visual Authority)
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles = 'bg-white rounded-2xl border transition-all duration-200';

  const variantStyles: Record<CardVariant, string> = {
    default: 'border-slate-200/80 shadow-card',
    hover: 'border-slate-200/80 hover:border-slate-300 shadow-card hover:shadow-card-hover cursor-pointer',
    elevated: 'border-slate-100 shadow-dropdown',
    subtle: 'bg-slate-50/50 border-slate-200/60 shadow-none',
    emergencyAccent: 'border-rose-200 bg-gradient-to-b from-rose-50/20 to-white shadow-card',
    primaryAccent: 'border-blue-200 bg-gradient-to-b from-blue-50/20 to-white shadow-card',
  };

  return (
    <div
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.default} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-5 sm:p-6 pb-2 sm:pb-3 flex items-start justify-between gap-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '', as: Component = 'h3', ...props }) => {
  return (
    <Component className={`text-base sm:text-lg font-bold text-slate-900 tracking-tight ${className}`} {...props}>
      {children}
    </Component>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, className = '', ...props }) => {
  return (
    <p className={`text-xs sm:text-sm text-slate-500 font-normal leading-relaxed mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-5 sm:p-6 pt-2 sm:pt-3 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-5 sm:p-6 pt-0 border-t border-slate-100 flex items-center justify-between gap-3 mt-2 ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
