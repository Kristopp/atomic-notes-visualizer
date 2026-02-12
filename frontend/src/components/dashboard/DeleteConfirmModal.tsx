/**
 * DeleteConfirmModal Component
 * Confirmation dialog for destructive actions
 */

interface DeleteConfirmModalProps {
  isOpen: boolean;
  noteTitle: string;
  entityCount: number;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  noteTitle,
  entityCount,
  isDeleting = false,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-white/40 backdrop-blur-md z-[100] animate-fade-in"
        onClick={onCancel}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
        <div className="spatial-glass rounded-hyper shadow-spatial-lift max-w-md w-full p-10 animate-fade-in pointer-events-auto overflow-hidden relative">

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-primary tracking-tight">
                Archive Research?
              </h3>
              <p className="text-[10px] text-red-500/70 font-bold uppercase tracking-[0.1em]">Destructive Action</p>
            </div>
          </div>

          <p className="text-text-secondary mb-8 font-medium text-sm leading-relaxed">
            Are you sure you want to permanently remove <span className="text-text-primary font-bold">"{noteTitle}"</span> from your research vault?
          </p>

          {entityCount > 0 && (
            <div className="bg-black/[0.02] rounded-2xl p-6 mb-8 border border-black/[0.01]">
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-4 opacity-40">
                Dependencies to be cleared:
              </p>
              <ul className="text-xs text-text-primary/70 space-y-3 font-semibold">
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Source Registry Entry
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  {entityCount} Extracted Concept Nodes
                </li>
              </ul>
            </div>
          )}

          <div className="flex gap-4 justify-end">
            <button
              onClick={onCancel}
              className="px-6 py-3 text-sm font-bold text-text-secondary hover:text-text-primary transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className={`px-8 py-3 text-sm font-bold text-white bg-red-500 rounded-2xl shadow-lg shadow-red-200 transition-all 
                ${isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600 active:scale-95'}`}
            >
              {isDeleting ? 'Archiving...' : 'Delete Note'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
