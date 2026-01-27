/**
 * DeleteConfirmModal Component
 * Confirmation dialog before deleting a note
 */
import React from 'react';

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
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="glass rounded-2xl shadow-2xl max-w-md w-full p-8 border border-white/10 animate-slideIn">
          <h3 className="text-2xl font-bold text-white mb-6">
            Delete Note?
          </h3>

          <p className="text-slate-300 mb-6 font-medium">
            Are you sure you want to delete <span className="text-indigo-400">"{noteTitle}"</span>?
          </p>

          {entityCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 mb-6">
              <p className="text-sm text-amber-400 font-bold uppercase tracking-widest mb-3">
                Permanently Removing:
              </p>
              <ul className="text-sm text-amber-200/70 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-amber-500" />
                  Note content
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-amber-500" />
                  {entityCount} extracted entities
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-amber-500" />
                  All associated relationships
                </li>
              </ul>
            </div>
          )}

          <p className="text-xs text-slate-500 mb-8 italic">
            Disclaimer: This action is irreversible.
          </p>

          <div className="flex gap-4 justify-end">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-red-500/80 hover:bg-red-500 rounded-xl transition-all shadow-lg shadow-red-500/20"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
