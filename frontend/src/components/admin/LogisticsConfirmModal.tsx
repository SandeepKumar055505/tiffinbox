import React, { useState } from 'react';
import { haptics } from '../../context/SensorialContext';

/**
 * Logistics Confirm Modal (Ω.3)
 * A high-fidelity, non-reversal status anchor for the 'Universal Architect'.
 * Designed for absolute administrative sovereignity.
 */

interface LogisticsConfirmModalProps {
  title: string;
  message: string;
  confirmText: string;
  type: 'primary' | 'danger' | 'info';
  onConfirm: (data: { proof_image_url?: string; fail_reason?: string }) => void;
  onCancel: () => void;
  requireProof?: boolean;
}

const FAIL_REASONS = [
  'Gourmet Route Blockage',
  'Gate-Cipher Drift',
  'Recipient Silently Absent',
  'Logistical Drifter Error',
  'Sovereign Access Denied'
];

export default function LogisticsConfirmModal({
  title,
  message,
  confirmText,
  type,
  onConfirm,
  onCancel,
  requireProof = false
}: LogisticsConfirmModalProps) {
  const [proof, setProof] = useState<string>('');
  const [failReason, setFailReason] = useState<string>(FAIL_REASONS[0]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProof(reader.result as string);
      setIsUploading(false);
      haptics.success();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
       <div
         className="surface-liquid w-full max-w-[500px] p-8 space-y-8 rounded-[4rem] shadow-elite border-white/5 ring-1 ring-white/10"
       >
          <div className="space-y-2 text-center">
             <h2 className="text-h1 !text-3xl tracking-tighter">{title}</h2>
             <p className="text-[11px] opacity-50 font-black tracking-tight uppercase px-6">{message}</p>
          </div>

          <div className="space-y-6">
             {type === 'danger' && (
               <div className="space-y-3">
                 <p className="text-label-caps opacity-40">Fail Reason Scrutiny</p>
                 <select 
                   value={failReason}
                   onChange={(e) => setFailReason(e.target.value)}
                   className="w-full surface-glass p-5 rounded-[2rem] outline-none border-white/5 ring-1 ring-white/10 text-sm font-bold appearance-none bg-transparent"
                 >
                    {FAIL_REASONS.map(r => <option key={r} value={r} className="bg-zinc-900">{r}</option>)}
                 </select>
               </div>
             )}

             <div className="space-y-3">
                <p className="text-label-caps opacity-40">{type === 'danger' ? 'Optional Scene Capture' : 'Mandatory Proof'}</p>
                <label className="block relative cursor-pointer group">
                   <div className="surface-glass h-40 rounded-[3rem] border-dashed border-2 border-white/10 flex flex-col items-center justify-center gap-3 group-hover:bg-white/5 transition-all">
                      {proof ? (
                        <img src={proof} className="w-full h-full object-cover rounded-[3rem]" alt="Proof" />
                      ) : (
                        <>
                          <span className="text-4xl">{isUploading ? '⌛' : '📸'}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest">{isUploading ? 'Anchoring...' : 'Click to Capture Proof'}</span>
                        </>
                      )}
                   </div>
                   <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                </label>
             </div>
          </div>

          <div className="flex flex-col gap-3">
             <button
               onClick={() => onConfirm({ proof_image_url: proof, fail_reason: type === 'danger' ? failReason : undefined })}
               disabled={requireProof && !proof || isUploading}
               className={`btn-primary !py-6 rounded-[3rem] font-bold tracking-[0.2em] uppercase transition-all ${type === 'danger' ? '!bg-red-600' : '!bg-teal-600'} disabled:opacity-30`}
             >
               {confirmText}
             </button>
             <button
               onClick={onCancel}
               className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
             >
               Relinquish manifestation
             </button>
          </div>
       </div>
    </div>
  );
}
