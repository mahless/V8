import React from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useDataStore } from '../../stores/useDataStore';
import { NavigationTab } from '../../types';
import {
  LayoutDashboard,
  PlusCircle,
  Car,
  Package,
  Wrench,
  ReceiptText,
  BarChart3,
  Coins,
  Settings,
  Sparkles,
  ChevronLeft,
  LogOut,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useUIStore();
  const { currentRole, currentProfile, logout } = useDataStore();

  const allNavItems: { id: NavigationTab; label: string; icon: React.ReactNode; isPrimary?: boolean; managerOnly?: boolean }[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'pos', label: 'بدء عملية جديدة', icon: <PlusCircle className="w-5 h-5 text-blue-600" />, isPrimary: true },
    { id: 'vehicles', label: 'السيارات والعملاء', icon: <Car className="w-5 h-5" /> },
    { id: 'services', label: 'دليل الخدمات', icon: <Wrench className="w-5 h-5" /> },
    { id: 'inventory', label: 'المخزن والمنتجات', icon: <Package className="w-5 h-5" />, managerOnly: true },
    { id: 'sales', label: 'سجل العمليات', icon: <ReceiptText className="w-5 h-5" /> },
    { id: 'expenses', label: 'المصروفات', icon: <Coins className="w-5 h-5" />, managerOnly: true },
    { id: 'reports', label: 'التقارير والأداء', icon: <BarChart3 className="w-5 h-5" />, managerOnly: true },
    { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-5 h-5" />, managerOnly: true },
  ];

  const navItems = allNavItems.filter((item) => (currentRole === 'EMPLOYEE' ? !item.managerOnly : true));

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-l border-slate-200/80 shrink-0 select-none min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gradient-blue tracking-widest font-sans whitespace-nowrap">
            V8&nbsp;STANCE
          </h1>
          <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
            مركز خدمة و عناية بالسيارات
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
          القائمة الرئيسية
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer group',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : item.isPrimary
                  ? 'bg-blue-50/80 text-blue-700 hover:bg-blue-100/80 border border-blue-200/50'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn('transition-transform duration-150 group-hover:scale-105', isActive && 'text-white')}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronLeft className="w-4 h-4 opacity-80" />}
            </button>
          );
        })}
      </div>

      {/* Quick Footer / User Profile & Logout */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 space-y-2.5">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-100">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
            currentRole === 'MANAGER' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {currentRole === 'MANAGER' ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">
              {currentProfile ? currentProfile.full_name : 'مدير النظام الافتراضي'}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold truncate">
              {currentRole === 'MANAGER' ? 'مدير 👑' : 'موظف 👤'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            logout();
            setActiveTab('pos');
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 transition-all cursor-pointer shadow-2xs group"
        >
          <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};
