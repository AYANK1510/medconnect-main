import React from 'react';
import { HeartPulse } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showSubtitle?: boolean;
  subtitle?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = true,
  subtitle = 'Connected Healthcare Platform',
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const containerSizes = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-11 h-11 rounded-2xl',
  };

  const textSizes = {
    sm: 'text-sm sm:text-base',
    md: 'text-base font-extrabold',
    lg: 'text-xl sm:text-2xl font-extrabold',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div
        className={`${containerSizes[size]} bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm shrink-0`}
      >
        <HeartPulse className={`${iconSizes[size]} transition-transform duration-200 group-hover:scale-105`} />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizes[size]} tracking-tight text-slate-900 flex items-center gap-1 leading-tight`}>
            MedConnect <span className="text-blue-600 font-extrabold">Pulse</span>
          </span>
          {showSubtitle && (
            <p className="text-[10px] text-slate-500 font-medium hidden sm:block leading-none mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;

