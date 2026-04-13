import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  // Trigger Haptic Feedback on open if it's a dangerous modal
  React.useEffect(() => {
    if (isOpen && isDangerous && 'vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  }, [isOpen, isDangerous]);

  const handleConfirm = () => {
    if ('vibrate' in navigator) navigator.vibrate(5);
    onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white/80 p-8 shadow-2xl backdrop-blur-xl border border-white/20"
          >
            <button 
              onClick={onClose}
              className="absolute right-6 top-6 rounded-full p-2 text-gray-400 hover:bg-gray-100/50 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-500 ${
                variant === 'whatsapp' ? 'bg-green-500/10 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]' :
                variant === 'success' ? 'bg-teal-500/10 text-teal-500' :
                (variant === 'danger' || isDangerous) ? 'bg-red-500/10 text-red-500' : 
                'bg-orange-500/10 text-orange-500'
              }`}>
                {icon || <AlertTriangle size={32} />}
              </div>

              <h3 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
                {title}
              </h3>
              
              <p className="mb-8 text-gray-500 leading-relaxed px-2">
                {message}
              </p>

              <div className="flex w-full flex-col gap-3">
                <button
                  onClick={handleConfirm}
                  className={`w-full rounded-2xl py-4 font-semibold text-white shadow-lg transition-all active:scale-95 ${
                    variant === 'whatsapp' ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-200/50' :
                    variant === 'success' ? 'bg-gradient-to-r from-teal-500 to-teal-600 shadow-teal-200/50' :
                    (variant === 'danger' || isDangerous)
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-200/50' 
                      : 'bg-gradient-to-r from-orange-500 to-amber-600 shadow-orange-200/50'
                  }`}
                >
                  {confirmText}
                </button>
                
                <button
                  onClick={() => {
                    if (onCancel) onCancel();
                    onClose();
                  }}
                  className="w-full rounded-2xl py-4 font-semibold text-gray-500 hover:bg-gray-50 transition-colors active:scale-95"
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GlassConfirmModal;
