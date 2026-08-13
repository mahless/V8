import React from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { Button } from '../ui/Button';
import { Calendar, Wrench } from 'lucide-react';
import { formatArabicDate } from '../../lib/utils';

export const Header: React.FC = () => {
  const { setActiveTab } = useUIStore();

  const todayStr = formatArabicDate(new Date().toISOString());

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Project Name (Gradient Blue Text) */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gradient-blue tracking-widest font-sans whitespace-nowrap">
            V8&nbsp;STANCE
          </h1>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 font-medium">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{todayStr}</span>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setActiveTab('services')}
            icon={<Wrench className="w-4 h-4 text-blue-600" />}
            className="text-xs py-2 px-3 border-slate-200/80 hidden sm:flex"
          >
            دليل الخدمات
          </Button>
        </div>
      </div>
    </header>
  );
};

