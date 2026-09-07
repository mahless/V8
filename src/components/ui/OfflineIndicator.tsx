import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, Wifi } from 'lucide-react';
import { useDataStore } from '../../stores/useDataStore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function OfflineIndicator() {
  const { isOffline, pendingSyncCount, isSyncing, syncPendingData } = useDataStore();

  return (
    <AnimatePresence>
      {(isOffline || pendingSyncCount > 0) && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className={cn(
            "fixed top-0 left-0 right-0 z-50 flex items-center justify-center p-2 text-sm font-medium shadow-md transition-colors",
            isOffline 
              ? "bg-amber-100 text-amber-800 border-b border-amber-200" 
              : isSyncing 
                ? "bg-blue-100 text-blue-800 border-b border-blue-200"
                : pendingSyncCount > 0 
                  ? "bg-emerald-100 text-emerald-800 border-b border-emerald-200"
                  : "bg-transparent"
          )}
        >
          <div className="flex items-center gap-3 px-4 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              {isOffline ? (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span>أنت الآن في وضع عدم الاتصال بالإنترنت (Offline Mode)</span>
                </>
              ) : isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري المزامنة مع الخادم...</span>
                </>
              ) : pendingSyncCount > 0 ? (
                <>
                  <Wifi className="w-4 h-4" />
                  <span>عاد الاتصال بالإنترنت</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تمت المزامنة بنجاح</span>
                </>
              )}
            </div>

            {pendingSyncCount > 0 && (
              <div className="flex items-center gap-3">
                <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold">
                  {pendingSyncCount} عملية معلقة
                </span>
                
                {!isOffline && !isSyncing && (
                  <button
                    onClick={() => syncPendingData()}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-md shadow-sm hover:bg-slate-50 transition-colors text-emerald-700 font-bold text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    مزامنة الآن
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
