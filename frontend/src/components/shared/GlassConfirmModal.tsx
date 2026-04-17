import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface GlassConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  variant?: 'default' | 'danger' | 'success' | 'whatsapp';
  icon?: React.ReactNode;
}

const GlassConfirmModal: React.FC<GlassConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  variant = 'default',
  icon,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if ('vibrate' in navigator) navigator.vibrate(5);
    onConfirm();
  };

  const btnColor =
    variant === 'whatsapp' ? 'bg-green-500 hover:bg-green-600' :
    variant === 'success'  ? 'bg-teal-600 hover:bg-teal-700' :
    (variant === 'danger' || isDangerous) ? 'bg-red-500 hover:bg-red-600' :
    'bg-amber-500 hover:bg-amber-600';

  const iconBg =
    variant === 'whatsapp' ? 'bg-green-50 text-green-600' :
    variant === 'success'  ? 'bg-teal-50 text-teal-600' :
    (variant === 'danger' || isDangerous) ? 'bg-red-50 text-red-500' :
    'bg-orange-50 text-orange-500';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
        <button onClick={onClose} className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
            {icon || <AlertTriangle size={24} />}
          </div>

          <h3 className="mb-1.5 text-lg font-bold text-gray-900">{title}</h3>
          <p className="mb-6 text-sm text-gray-500 leading-relaxed">{message}</p>

          <div className="flex w-full flex-col gap-2">
            <button
              onClick={handleConfirm}
              className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors ${btnColor}`}
            >
              {confirmText}
            </button>
            <button
              onClick={() => { if (onCancel) onCancel(); onClose(); }}
              className="w-full rounded-xl py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlassConfirmModal;
