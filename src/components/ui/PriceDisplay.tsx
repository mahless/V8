import React from 'react';
import { cn, formatCurrency } from '../../lib/utils';

interface PriceDisplayProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amount,
  size = 'md',
  className,
}) => {
  const sizes = {
    sm: 'text-xs font-bold',
    md: 'text-sm font-extrabold',
    lg: 'text-lg font-black',
    xl: 'text-2xl sm:text-3xl font-black tracking-tight',
  };

  return (
    <span className={cn('text-slate-900 font-mono tracking-tight', sizes[size], className)}>
      {formatCurrency(amount)}
    </span>
  );
};
