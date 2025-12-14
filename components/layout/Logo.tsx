import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  textColor?: string;
  isCollapsed?: boolean; // When true, animates from "Popera." to "P."
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  onClick,
  textColor,
  isCollapsed = false
}) => {
  const sizeClasses = {
    sm: 'text-xl sm:text-2xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl md:text-5xl',
    xl: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
  };

  const dotSizeClasses = {
    sm: 'w-1 h-1 sm:w-1.5 sm:h-1.5',
    md: 'w-1.5 h-1.5 sm:w-2 sm:h-2',
    lg: 'w-2 h-2 sm:w-2.5 sm:h-2.5',
    xl: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
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
      {/* P - always visible */}
      <span className={textColorClass}>P</span>
      
      {/* "opera" - collapses on scroll with the dot "erasing" the letters */}
      <span 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${textColorClass}`}
        style={{ 
          maxWidth: isCollapsed ? '0px' : '200px',
          opacity: isCollapsed ? 0 : 1,
        }}
      >
        opera
      </span>
      
      {/* Orange dot - stays in place */}
      <span 
        className={`${dotSizeClasses[size]} rounded-full bg-[#e35e25] flex-shrink-0 transition-all duration-300`} 
        style={{ 
          marginLeft: isCollapsed ? '0.05em' : '0.05em',
          alignSelf: 'baseline',
        }} 
      />
    </Component>
  );
};

