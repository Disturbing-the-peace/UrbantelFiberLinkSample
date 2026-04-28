'use client';

import { useState } from 'react';
import { Building2, X } from 'lucide-react';
import { Branch } from '@/types';

interface BranchBadgeProps {
  primaryBranchName?: string;
  branches?: Branch[];
}

export default function BranchBadge({ primaryBranchName, branches }: BranchBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  // If no branches data, show simple badge
  if (!branches || branches.length === 0) {
    if (!primaryBranchName) return null;
    
    return (
      <div className="hidden sm:flex items-center px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {primaryBranchName}
        </span>
      </div>
    );
  }

  // Single branch - show simple badge
  if (branches.length === 1) {
    return (
      <div className="hidden sm:flex items-center px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <Building2 size={16} className="text-emerald-600 dark:text-emerald-400 mr-2" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {branches[0].name}
        </span>
      </div>
    );
  }

  // Multiple branches - show clickable badge with count
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900/70 transition-colors cursor-pointer"
        title="Click to view all branches"
      >
        <Building2 size={16} className="text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {branches.length} Branches
        </span>
        <div className="flex items-center justify-center w-5 h-5 bg-emerald-600 dark:bg-emerald-500 text-white text-xs font-bold rounded-full">
          {branches.length}
        </div>
      </button>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="text-emerald-600 dark:text-emerald-400" size={24} />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Your Branches
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You have access to {branches.length} branch{branches.length !== 1 ? 'es' : ''}. 
              You can view and manage data from all assigned branches.
            </p>

            {/* Branch List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {branches.map((branch, index) => (
                <div
                  key={branch.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {branch.name}
                    </h3>
                    {branch.address && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {branch.address}
                      </p>
                    )}
                  </div>
                  {primaryBranchName === branch.name && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
