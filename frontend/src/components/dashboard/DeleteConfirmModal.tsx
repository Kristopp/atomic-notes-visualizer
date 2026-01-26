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
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Delete Note?
          </h3>
          
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete <span className="font-semibold">"{noteTitle}"</span>?
          </p>
          
          {entityCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                This will permanently remove:
              </p>
              <ul className="text-sm text-yellow-700 space-y-1 ml-4">
                <li>• The note content</li>
                <li>• {entityCount} extracted {entityCount === 1 ? 'entity' : 'entities'}</li>
                <li>• All associated relationships</li>
              </ul>
            </div>
          )}
          
          <p className="text-sm text-gray-600 mb-6">
            This action cannot be undone.
          </p>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium"
            >
              Delete Note
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
