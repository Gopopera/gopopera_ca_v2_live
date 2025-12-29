import React from 'react';

interface MetricSkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

/**
 * Reusable skeleton component for loading metrics
 * Shows animated pulse effect while data is loading
 */
export const MetricSkeleton: React.FC<MetricSkeletonProps> = ({ 
  width = 'w-8', 
  height = 'h-5',
  className = ''
}) => (
  <span 
    className={`inline-block ${width} ${height} bg-gray-200 animate-pulse rounded ${className}`}
    aria-label="Loading"
  />
);

