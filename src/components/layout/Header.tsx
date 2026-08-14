import React from 'react';
import { Calendar, ShieldCheck, UserCheck } from 'lucide-react';
import { formatArabicDate } from '../../lib/utils';
import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';

export const Header: React.FC = () => {
  const todayStr = formatArabicDate(new Date().toISOString());
  const { currentRole, setCurrentRole } = useDataStore();
  const { setActiveTab } = useUIStore();

  const handleToggleRole = () => {
    const nextRole = currentRole === 'MANAGER' ? 'EMPLOYEE' : 'MANAGER';
    setCurrentRole(nextRole);
    if (nextRole === 'EMPLOYEE') {
      setActiveTab('pos');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Project Name (Gradient Blue Text) */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gradient-blue tracking-widest font-sans whitespace-nowrap">
            V8&nbsp;STANCE
          </h1>
        </div>

        {/* Right Info, Date & Role Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleToggleRole}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              currentRole === 'MANAGER'
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
            title="انقر للتبديل بين وضع المدير والموظف لتجربة الصلاحيات"
          >
            {currentRole === 'MANAGER' ? (
              <>
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>وضع المدير 👑</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>وضع الموظف 👤</span>
              </>
            )}
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 font-medium">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{todayStr}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
