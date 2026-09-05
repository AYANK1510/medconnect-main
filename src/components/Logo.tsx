import React from 'react';
import { Activity } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const containerSizes = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      <div className={`${containerSizes[size]} bg-gradient-to-br from-teal-500/20 via-teal-500/10 to-emerald-500/20 border border-teal-500/40 flex items-center justify-center shadow-lg shadow-teal-500/10 relative overflow-hidden group`}>
        <div className="absolute inset-0 bg-teal-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Activity className={`${iconSizes[size]} text-teal-400 animate-pulse`} />
      </div>

      {showText && (
        <span className={`${textSizes[size]} font-extrabold tracking-tight text-white`}>
          MedConnect <span className="text-teal-400">Pulse</span>
        </span>
      )}
    </div>
  );
};
