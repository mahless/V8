import React, { useState } from 'react';
import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ShieldCheck, UserCheck, Key, LogIn, Lock, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { profiles, loginWithPin, setCurrentRole } = useDataStore();
  const { showToast, setActiveTab } = useUIStore();

  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    profiles[0]?.id || ''
  );
  const [pinInput, setPinInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // If no profiles exist in DB yet, fallback for first-time Manager access
    if (profiles.length === 0) {
      if (pinInput.trim() === '1234' || pinInput.trim() === '0000') {
        setCurrentRole('MANAGER');
        setActiveTab('pos');
        showToast('مرحباً بك 👑', 'تم تسجيل الدخول كـ مدير النظام الافتراضي', 'success');
      } else {
        setErrorMessage('رمز الدخول الافتراضي للمدير هو 1234');
      }
      return;
    }

    if (!selectedProfileId) {
      setErrorMessage('يرجى اختيار الموظف من القائمة أولاً');
      return;
    }

    if (!pinInput.trim()) {
      setErrorMessage('يرجى إدخال رمز الدخول السريع (PIN Code)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithPin(selectedProfileId, pinInput.trim());
      if (res.success) {
        showToast(
          `أهلاً بك 👋`,
          `تم تسجيل الدخول بنجاح كـ ${selectedProfile?.full_name || 'موظف'}`,
          'success'
        );
        setActiveTab('pos');
      } else {
        setErrorMessage(res.error || 'فشل تسجيل الدخول، تحقق من رمز PIN');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ في الاتصال';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black text-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans select-none">
      <div className="w-full max-w-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-500/25 mb-1 transform hover:scale-105 transition-transform duration-300">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-widest font-sans drop-shadow-md">
            V8&nbsp;STANCE
          </h1>
          <p className="text-xs text-blue-200 font-bold tracking-wider">
            نظام إدارة المغسلة وخدمات السيارات
          </p>
        </div>

        {/* Login Premium Card */}
        <Card className="bg-white/95 backdrop-blur-2xl border-slate-100 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.3)] rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
              <Lock className="w-3.5 h-3.5" />
              <span>تسجيل الدخول للنظام</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              اختر اسمك وأدخل رمز الدخول
            </h2>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            {/* 1. Staff Members Directory Selection */}
            {profiles.length > 0 ? (
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  1. اختر الحساب / الموظف:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                  {profiles.map((p) => {
                    const isSelected = selectedProfileId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedProfileId(p.id);
                          setErrorMessage(null);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-600/30 text-slate-900 shadow-sm'
                            : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            p.role === 'MANAGER' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {p.role === 'MANAGER' ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-900 block truncate">{p.full_name}</span>
                            <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                              {p.role === 'MANAGER' ? 'مدير' : 'موظف 👤'}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold text-center">
                👑 الدخول كـ مدير النظام الافتراضي (رمز الدخول 1234)
              </div>
            )}

            {/* 2. PIN Code Input (Strict Black Text Color & Mobile Numeric Keyboard) */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                2. أدخل رمز الدخول السريع (PIN Code):
              </label>

              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setErrorMessage(null);
                  }}
                  maxLength={8}
                  required
                  autoFocus
                  style={{ color: '#0f172a' }} // Explicit strict black color
                  className="w-full text-center text-2xl font-black tracking-[0.5em] py-3.5 px-4 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all shadow-inner"
                />
                <Key className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Login Submit Button */}
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-4 h-auto text-base rounded-2xl shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35 transition-all cursor-pointer"
              icon={<LogIn className="w-5 h-5 text-white" />}
            >
              تسجيل الدخول للنظام 🚀
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
