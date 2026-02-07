/**
 * DeleteConfirmModal Component
 * Confirmation dialog for destructive actions
 */

interface DeleteConfirmModalProps {
  isOpen: boolean;
  noteTitle: string;
  entityCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  noteTitle,
  entityCount,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] animate-fadeIn"
        onClick={onCancel}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
        <div className="glass rounded-3xl shadow-2xl max-w-md w-full p-10 border border-white/5 industrial-border animate-slideIn pointer-events-auto overflow-hidden relative">
          {/* Warning Glow */}
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />

          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-mono uppercase tracking-tighter">
                Purge Unit?
              </h3>
              <p className="text-[9px] text-red-500/70 font-bold uppercase tracking-[0.2em] font-mono">Destructive Action Required</p>
            </div>
          </div>

          <p className="text-slate-400 mb-8 font-medium font-mono text-xs leading-relaxed uppercase">
            Are you sure you want to permanently remove <span className="text-white">"{noteTitle}"</span> from the data vault?
          </p>

          {entityCount > 0 && (
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 mb-8 font-mono">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-4">
                Associated Dependencies:
              </p>
              <ul className="text-[10px] text-slate-300 space-y-3 font-bold uppercase tracking-tight">
                <li className="flex items-center gap-3">
                  <div className="w-1 h-1 rounded-full bg-red-500" />
                  Source Registry Entry
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1 h-1 rounded-full bg-red-500" />
                  {entityCount} Extracted Concept Nodes
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1 h-1 rounded-full bg-red-500" />
                  All Mapped Neural Edges
                </li>
              </ul>
            </div>
          )}

          <div className="flex gap-4 justify-end pt-4 border-t border-white/5">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all font-mono"
            >
              Abort
            </button>
            <button
              onClick={onConfirm}
              className="px-8 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded transition-all shadow-[0_0_20px_rgba(239,68,68,0.1)] font-mono hover:border-red-500/50"
            >
              Confirm Purge
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
