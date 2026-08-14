import React, { useState } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { NavigationTab } from '../../types';
import {
  LayoutDashboard,
  PlusCircle,
  Car,
  Package,
  Wrench,
  ReceiptText,
  Menu,
  X,
  Coins,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '../../lib/utils';

import { useDataStore } from '../../stores/useDataStore';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useUIStore();
  const { currentRole } = useDataStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const allPrimaryMobileTabs: { id: NavigationTab; label: string; icon: React.ReactNode; isPrimary?: boolean; managerOnly?: boolean }[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'services', label: 'الخدمات', icon: <Wrench className="w-5 h-5" />, managerOnly: true },
    { id: 'pos', label: 'بدء عملية جديدة', icon: <PlusCircle className="w-6 h-6" />, isPrimary: true },
    { id: 'inventory', label: 'المخزن', icon: <Package className="w-5 h-5" />, managerOnly: true },
  ];

  const allMoreTabs: { id: NavigationTab; label: string; icon: React.ReactNode; managerOnly?: boolean }[] = [
    { id: 'vehicles', label: 'السيارات والعملاء', icon: <Car className="w-5 h-5" /> },
    { id: 'sales', label: 'سجل العمليات', icon: <ReceiptText className="w-5 h-5" /> },
    { id: 'expenses', label: 'المصروفات', icon: <Coins className="w-5 h-5" />, managerOnly: true },
    { id: 'reports', label: 'التقارير والأداء', icon: <BarChart3 className="w-5 h-5" />, managerOnly: true },
    { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-5 h-5" />, managerOnly: true },
  ];

  const primaryMobileTabs = allPrimaryMobileTabs.filter((t) => (currentRole === 'EMPLOYEE' ? !t.managerOnly : true));
  const moreTabs = allMoreTabs.filter((t) => (currentRole === 'EMPLOYEE' ? !t.managerOnly : true));

  const isMoreActive = moreTabs.some((t) => t.id === activeTab);

  return (
    <>
      {/* More Menu Modal / Sheet */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsMoreOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">القائمة الكاملة</h3>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {moreTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMoreOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl font-bold text-xs transition-colors cursor-pointer text-right',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Navbar */}
      <nav className="md:hidden fixed bottom-0 right-0 left-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 py-1.5 z-40 shadow-lg">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {primaryMobileTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            if (tab.isPrimary) {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex flex-col items-center justify-center relative -top-3 cursor-pointer group"
                >
                  <div className="w-13 h-13 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-transform active:scale-95 border-2 border-white">
                    {tab.icon}
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 mt-0.5">{tab.label}</span>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[52px] cursor-pointer',
                  isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
                )}
              >
                <span className={cn('transition-transform', isActive && 'scale-110')}>{tab.icon}</span>
                <span className="text-[10px] mt-1">{tab.label}</span>
              </button>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[52px] cursor-pointer',
              isMoreActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            )}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-1">المزيد</span>
          </button>
        </div>
      </nav>
    </>
  );
};
