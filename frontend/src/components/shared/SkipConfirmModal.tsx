import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mealType: string;
  date: string;
  isPending?: boolean;
}

export default function SkipConfirmModal({ isOpen, onClose, onConfirm, mealType, date, isPending }: Props) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 pointer-events-auto shadow-xl">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mx-auto">
              <span className="text-xl">⏭️</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Skip this meal?</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              You're requesting to skip <span className="font-semibold capitalize">{mealType}</span> on{' '}
              <span className="font-semibold">{date}</span>. Admin will review your request and notify you.
            </p>
            <p className="text-xs text-orange-500 font-medium">
              This action cannot be undone once approved.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isPending ? 'Submitting...' : 'Yes, Request Skip'}
            </button>
            <button
              onClick={onClose}
              disabled={isPending}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Keep this meal
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
