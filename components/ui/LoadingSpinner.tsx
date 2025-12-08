// components/ui/LoadingSpinner.tsx
import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';
type SpinnerColor = 'blue' | 'green' | 'red' | 'yellow' | 'indigo' | 'purple' | 'pink' | 'gray';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
  label?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
};

const colorClasses: Record<SpinnerColor, string> = {
  blue: 'border-t-blue-500 border-b-blue-500',
  green: 'border-t-green-500 border-b-green-500',
  red: 'border-t-red-500 border-b-red-500',
  yellow: 'border-t-yellow-500 border-b-yellow-500',
  indigo: 'border-t-indigo-500 border-b-indigo-500',
  purple: 'border-t-purple-500 border-b-purple-500',
  pink: 'border-t-pink-500 border-b-pink-500',
  gray: 'border-t-gray-500 border-b-gray-500',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  className = '',
  label = 'Chargement...',
}) => {
  const spinnerClasses = [
    'animate-spin',
    'rounded-full',
    sizeClasses[size],
    colorClasses[color],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className="inline-flex flex-col items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className={spinnerClasses}>
        <span className="sr-only">{label}</span>
      </div>
      {size !== 'sm' && (
        <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">{label}</span>
      )}
    </div>
  );
};
export default LoadingSpinner;
