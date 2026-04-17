import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (shiftDates: boolean) => void;
  isPending?: boolean;
}

export default function ResumeConfirmModal({ isOpen, onClose, onConfirm, isPending }: Props) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5 pointer-events-auto shadow-xl">

          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mx-auto">
              <span className="text-2xl">✨</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Resume Subscription</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              How should we handle your remaining meals?
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => onConfirm(true)}
              disabled={isPending}
              className="w-full text-left p-4 rounded-xl border-2 border-teal-200 bg-teal-50 hover:border-teal-400 transition-colors disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-teal-700">Shift dates forward</p>
              <p className="text-xs text-teal-600 mt-0.5 opacity-80">Preserves all remaining meals — no days lost.</p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-500 mt-1 block">Recommended</span>
            </button>

            <button
              onClick={() => onConfirm(false)}
              disabled={isPending}
              className="w-full text-left p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-gray-700">Resume from tomorrow</p>
              <p className="text-xs text-gray-500 mt-0.5">Meals missed during pause will remain skipped.</p>
            </button>
          </div>

          <button
            onClick={onClose}
            disabled={isPending}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Keep paused
          </button>
        </div>
      </div>
    </>
  );
}
