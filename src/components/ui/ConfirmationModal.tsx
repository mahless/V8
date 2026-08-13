import React from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info, CheckCircle2, Trash2 } from 'lucide-react';

export const ConfirmationModal: React.FC = () => {
  const { confirmModal, closeConfirmModal } = useUIStore();

  if (!confirmModal || !confirmModal.isOpen) return null;

  const {
    title,
    message,
    confirmText = 'تأكيد',
    cancelText = 'إلغاء',
    type = 'danger',
    onConfirm,
    onCancel,
  } = confirmModal;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    closeConfirmModal();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    closeConfirmModal();
  };

  const typeConfig = {
    danger: {
      icon: <Trash2 className="w-6 h-6 text-rose-600" />,
      bg: 'bg-rose-100/80',
      confirmButtonVariant: 'danger' as const,
      confirmButtonClass: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      bg: 'bg-amber-100/80',
      confirmButtonVariant: 'secondary' as const,
      confirmButtonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      icon: <Info className="w-6 h-6 text-blue-600" />,
      bg: 'bg-blue-100/80',
      confirmButtonVariant: 'primary' as const,
      confirmButtonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    success: {
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
      bg: 'bg-emerald-100/80',
      confirmButtonVariant: 'primary' as const,
      confirmButtonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  };

  const currentConfig = typeConfig[type] || typeConfig.danger;
  const isSingleAlert = !cancelText;

  return (
    <Modal isOpen={confirmModal.isOpen} onClose={handleCancel} maxWidth="sm">
      <div className="space-y-5 text-right" dir="rtl">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${currentConfig.bg}`}
          >
            {currentConfig.icon}
          </div>
          <div className="flex-1">
            <h4 className="text-base font-black text-slate-900 leading-snug">{title}</h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          {!isSingleAlert && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-slate-600 hover:bg-slate-100 text-xs px-4 h-9 font-bold"
            >
              {cancelText}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleConfirm}
            className={`text-xs px-5 h-9 font-black shadow-sm ${currentConfig.confirmButtonClass}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
