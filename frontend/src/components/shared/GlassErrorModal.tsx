import React from 'react';
import { AlertCircle } from 'lucide-react';

interface GlassErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  requestId?: string;
  onClose: () => void;
}

export default function GlassErrorModal({ isOpen, title, message, requestId, onClose }: GlassErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="h-1 bg-rose-500" />
        <div className="p-8 text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center">
              <AlertCircle size={24} className="text-rose-500" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
            {requestId && (
              <p className="font-mono text-[10px] text-gray-300 pt-1">ref: {requestId}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
