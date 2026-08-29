import React from 'react';
import { cn, convertArabicDigitsToEnglish } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, type = 'text', onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!onChange) return;
      
      const original = e.target.value;
      if (original) {
        const converted = convertArabicDigitsToEnglish(original);
        if (converted !== original) {
          // Use Object.create to preserve the prototype chain of the SyntheticEvent
          const clonedEvent = Object.create(e);
          Object.defineProperty(clonedEvent, 'target', { value: { ...e.target, value: converted } });
          Object.defineProperty(clonedEvent, 'currentTarget', { value: { ...e.currentTarget, value: converted } });
          
          onChange(clonedEvent as React.ChangeEvent<HTMLInputElement>);
          return;
        }
      }
      
      onChange(e);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute right-3.5 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={type}
            onChange={handleChange}
            className={cn(
              'w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10',
              icon && 'pr-10',
              error && 'border-rose-500 bg-rose-50/30 focus:border-rose-600 focus:ring-rose-500/10',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
