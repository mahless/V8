import React, { useEffect, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUIStore } from './stores/useUIStore';
import { useDataStore } from './stores/useDataStore';
import { Layout } from './components/layout/Layout';

// Lazy loading view components to optimize initial JS bundle size and fast loading on low-end devices
const DashboardView = lazy(() => import('./features/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const POSView = lazy(() => import('./features/pos/POSView').then(m => ({ default: m.POSView })));
const VehiclesView = lazy(() => import('./features/vehicles/VehiclesView').then(m => ({ default: m.VehiclesView })));
const ServicesView = lazy(() => import('./features/services/ServicesView').then(m => ({ default: m.ServicesView })));
const InventoryView = lazy(() => import('./features/inventory/InventoryView').then(m => ({ default: m.InventoryView })));
const SalesHistoryView = lazy(() => import('./features/sales/SalesHistoryView').then(m => ({ default: m.SalesHistoryView })));
const ExpensesView = lazy(() => import('./features/expenses/ExpensesView').then(m => ({ default: m.ExpensesView })));
const ReportsView = lazy(() => import('./features/reports/ReportsView').then(m => ({ default: m.ReportsView })));
const SettingsView = lazy(() => import('./features/settings/SettingsView').then(m => ({ default: m.SettingsView })));
const LoginView = lazy(() => import('./features/auth/LoginView').then(m => ({ default: m.LoginView })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function App() {
  const { activeTab, setActiveTab } = useUIStore();
  const { fetchInitialData, currentRole, currentProfile, profiles } = useDataStore();

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Enforce role guard: if user is employee and on a manager-only tab, fallback to POS
  const isManagerOnlyTab = ['inventory', 'expenses', 'reports', 'settings'].includes(activeTab);

  useEffect(() => {
    if (currentRole === 'EMPLOYEE' && isManagerOnlyTab) {
      setActiveTab('pos');
    }
  }, [currentRole, activeTab, isManagerOnlyTab, setActiveTab]);

  const renderActiveTab = () => {
    if (currentRole === 'EMPLOYEE' && isManagerOnlyTab) {
      return <POSView />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'pos':
        return <POSView />;
      case 'vehicles':
        return <VehiclesView />;
      case 'services':
        return <ServicesView />;
      case 'inventory':
        return <InventoryView />;
      case 'sales':
        return <SalesHistoryView />;
      case 'expenses':
        return <ExpensesView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  if (currentProfile === null && profiles.length > 0) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white p-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-400">جاري تحميل شاشة الدخول...</p>
            </div>
          </div>
        }>
          <LoginView />
        </Suspense>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px] p-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-500">جاري تحميل الشاشة...</p>
            </div>
          </div>
        }>
          {renderActiveTab()}
        </Suspense>
      </Layout>
    </QueryClientProvider>
  );
}
