import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
}

export default function CancelRitualModal({ isOpen, onClose, onConfirm, isPending }: Props) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 pointer-events-auto shadow-xl">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto">
              <span className="text-xl">⚠️</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Cancel Subscription?</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Are you sure you want to cancel? Your remaining days will still be delivered.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 block">
              Why are you cancelling? (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us how we can improve..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 min-h-[80px] resize-none transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => onConfirm(reason)}
              disabled={isPending}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isPending ? 'Processing...' : 'Cancel Subscription'}
            </button>
            <button
              onClick={onClose}
              disabled={isPending}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Keep Subscription
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
