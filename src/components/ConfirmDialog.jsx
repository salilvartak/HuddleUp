import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function ConfirmDialog() {
  const { confirmConfig, hideConfirm } = useAppContext();
  if (!confirmConfig) return null;

  const { title, message, confirmLabel = 'Delete', onConfirm } = confirmConfig;
  const handleConfirm = () => { onConfirm(); hideConfirm(); };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1a1a1a]/40" onClick={hideConfirm} />
      <div className="relative w-full max-w-[380px] bg-background-surface border-2 border-border-default shadow-[6px_6px_0px_var(--shadow-color)] p-7 flex flex-col gap-6">
        <div>
          <h3 className="text-lg font-black text-text-primary mb-2">{title}</h3>
          <p className="text-sm text-text-muted leading-relaxed font-medium">{message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={hideConfirm} className="px-5 py-2 font-bold text-sm bg-background-surface border-2 border-border-default shadow-neo-sm hover:bg-background-hover active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100">
            Cancel
          </button>
          <button onClick={handleConfirm} className="px-5 py-2 font-bold text-sm bg-red-500 text-white border-2 border-border-default shadow-neo-sm hover:bg-red-600 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
