import React from 'react';
import { cn } from '../../lib/utils';
import { Car } from 'lucide-react';

interface PlateBadgeProps {
  plateDisplay?: string;
  letters?: string;
  numbers?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PlateBadge: React.FC<PlateBadgeProps> = ({
  plateDisplay,
  letters,
  numbers,
  size = 'md',
  className,
}) => {
  let displayLetters = letters || '';
  let displayNumbers = numbers || '';

  if (plateDisplay && (!letters || !numbers)) {
    const parts = plateDisplay.trim().split(/\s+/);
    if (parts.length >= 2) {
      displayNumbers = parts[parts.length - 1];
      displayLetters = parts.slice(0, parts.length - 1).join(' ');
    } else {
      displayLetters = plateDisplay;
    }
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5 min-w-[90px]',
    md: 'text-sm px-3 py-1 min-w-[120px]',
    lg: 'text-base px-4 py-1.5 min-w-[150px]',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-between bg-gradient-to-b from-amber-50 to-amber-100/60 border-2 border-slate-900 rounded-lg font-bold text-slate-900 shadow-2xs select-none dir-rtl',
        sizes[size],
        className
      )}
      dir="rtl"
    >
      <div className="flex items-center gap-1.5 text-blue-800 shrink-0">
        <Car className="w-3.5 h-3.5 opacity-80" />
        <span className="tracking-widest text-slate-900 font-extrabold">{displayLetters}</span>
      </div>
      <div className="w-[1px] h-4 bg-slate-900/30 mx-1"></div>
      <span className="font-mono font-extrabold text-blue-900 tracking-wider">{displayNumbers}</span>
    </div>
  );
};
