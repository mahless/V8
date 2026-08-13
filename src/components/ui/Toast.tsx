import React from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Toast: React.FC = () => {
  const { toastMessage, clearToast } = useUIStore();

  if (!toastMessage) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-200 bg-emerald-50/90 text-emerald-900',
    error: 'border-rose-200 bg-rose-50/90 text-rose-900',
    info: 'border-blue-200 bg-blue-50/90 text-blue-900',
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto z-50 max-w-sm animate-slide-up">
      <div
        className={cn(
          'flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-md transition-all',
          borders[toastMessage.type]
        )}
      >
        {icons[toastMessage.type]}
        <div className="flex-1">
          <h5 className="text-xs font-bold leading-snug">{toastMessage.title}</h5>
          <p className="text-xs opacity-90 mt-0.5 font-medium leading-relaxed">
            {toastMessage.message}
          </p>
        </div>
        <button
          onClick={clearToast}
          className="p-1 opacity-60 hover:opacity-100 rounded-lg transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
