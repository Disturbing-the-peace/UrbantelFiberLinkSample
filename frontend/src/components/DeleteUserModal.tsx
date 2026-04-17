'use client';

import { useState } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userEmail: string;
  loading?: boolean;
}

export default function DeleteUserModal({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
  loading = false,
}: DeleteUserModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  if (!isOpen) return null;

  const handleFirstConfirm = () => {
    setStep(2);
  };

  const handleFinalConfirm = () => {
    if (confirmText === 'DELETE') {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!loading) {
      setStep(1);
      setConfirmText('');
      onClose();
    }
  };

  const isConfirmValid = confirmText === 'DELETE';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 rounded-t-xl relative">
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Delete User</h2>
              <p className="text-red-100 text-sm">Permanent action - cannot be undone</p>
            </div>
          </div>
          {!loading && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="p-6">
          {step === 1 ? (
            <>
              {/* Warning Message */}
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <p className="font-semibold mb-2">⚠️ WARNING: This action is PERMANENT!</p>
                    <p className="mb-2">You are about to permanently delete:</p>
                    <p className="font-mono bg-white dark:bg-gray-900 px-2 py-1 rounded border border-red-300 dark:border-red-700">
                      {userEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* What will be deleted */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  This user will be removed from:
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    Authentication system
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    User database
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    All access permissions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    Associated data and records
                  </li>
                </ul>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFirstConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Final Confirmation */}
              <div className="mb-6">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  To confirm permanent deletion, type <span className="font-mono font-bold text-red-600 dark:text-red-400">DELETE</span> below:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
                  autoFocus
                  disabled={loading}
                />
                {confirmText && !isConfirmValid && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Text must match exactly: DELETE
                  </p>
                )}
              </div>

              {/* User Info Reminder */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-6">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Deleting user:</p>
                <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{userEmail}</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalConfirm}
                  disabled={!isConfirmValid || loading}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
