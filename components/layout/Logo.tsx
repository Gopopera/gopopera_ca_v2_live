import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  textColor?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  onClick,
  textColor
}) => {
  const sizeClasses = {
    sm: 'text-xl sm:text-2xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl md:text-5xl',
    xl: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
  };

  const dotSizeClasses = {
    sm: 'w-0.5 h-0.5 sm:w-1 sm:h-1',
    md: 'w-1 h-1 sm:w-1.5 sm:h-1.5',
    lg: 'w-1.5 h-1.5 sm:w-2 sm:h-2',
    xl: 'w-2 h-2 sm:w-2.5 sm:h-2.5',
  };

  const Component = onClick ? 'button' : 'div';
  const baseClasses = `font-outfit font-bold tracking-tight inline-flex items-baseline ${sizeClasses[size]} ${className}`;
  const textColorClass = textColor || 'text-white';

  return (
    <Component
      onClick={onClick}
      className={baseClasses}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <span className={textColorClass}>Popera</span>
      <span className={`${dotSizeClasses[size]} rounded-full bg-[#e35e25] flex-shrink-0`} style={{ marginLeft: '0.05em', alignSelf: 'baseline' }} />
    </Component>
  );
};

