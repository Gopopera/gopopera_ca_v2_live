import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * GlassCard - Liquid glass styled card for mini examples
 * Uses backdrop blur and low opacity for premium "liquid glass" effect
 */
export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl p-6 shadow-lg ${className}`}>
      {children}
    </div>
  );
};

