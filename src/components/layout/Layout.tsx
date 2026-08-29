import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Toast } from '../ui/Toast';
import { ReceiptModal } from '../ui/ReceiptModal';
import { ConfirmationModal } from '../ui/ConfirmationModal';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isPrinting, setIsPrinting] = React.useState(false);

  React.useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  if (isPrinting) {
    return (
      <div className="bg-white min-h-screen text-black" dir="rtl">
        <ReceiptModal />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-[#0f172a] font-['Cairo',sans-serif] dir-rtl" dir="rtl">
      {/* Desktop Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Touch Mobile Bottom Navigation */}
      <BottomNav />

      {/* Toast Notification Container */}
      <Toast />

      {/* Global Thermal Receipt Modal */}
      <ReceiptModal />

      {/* Global In-App Confirmation / Alert Modal */}
      <ConfirmationModal />
    </div>
  );
};
