'use client';

import { useState } from 'react';
import { Globe, ExternalLink, Copy, Check } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export default function PortalPage() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const toast = useToast();

  // Get the base URL for the portal
  const portalUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/agent` 
    : 'https://your-domain.com/agent';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopiedUrl(true);
      toast.success('Portal URL copied to clipboard!');
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  const handleOpenPortal = () => {
    window.open(portalUrl, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#00A191] mb-2">Agent Portal</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Access the public agent portal where agents can view their referral links and track applications
        </p>
      </div>

      {/* Portal Access Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-[#00A191]/10 rounded-full flex items-center justify-center">
            <Globe className="w-8 h-8 text-[#00A191]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Public Agent Portal</h2>
            <p className="text-gray-600 dark:text-gray-400">Share this portal with your agents</p>
          </div>
        </div>

        {/* Portal URL Display */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Portal URL
          </label>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm text-gray-900 dark:text-white break-all">
              {portalUrl}
            </div>
            <button
              onClick={handleCopyUrl}
              className="px-4 py-3 bg-[#00A191] text-white rounded-lg hover:bg-[#008c7a] transition-colors flex items-center gap-2"
              title="Copy URL"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-5 h-5" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Open Portal Button */}
        <button
          onClick={handleOpenPortal}
          className="w-full px-6 py-4 bg-gradient-to-r from-[#00A191] to-[#008c7a] text-white rounded-lg hover:from-[#008c7a] hover:to-[#007a6b] transition-all font-semibold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
        >
          <Globe className="w-6 h-6" />
          Open Agent Portal
          <ExternalLink className="w-5 h-5" />
        </button>

        {/* Info Section */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            What can agents do in the portal?
          </h3>
          <ul className="space-y-3 text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-[#00A191] rounded-full mt-2 flex-shrink-0"></div>
              <span>View their unique referral code and link</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-[#00A191] rounded-full mt-2 flex-shrink-0"></div>
              <span>Copy and share their referral link with potential subscribers</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-[#00A191] rounded-full mt-2 flex-shrink-0"></div>
              <span>Track applications submitted through their referral link</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-[#00A191] rounded-full mt-2 flex-shrink-0"></div>
              <span>Monitor their performance and subscriber count</span>
            </li>
          </ul>
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
            💡 How to use
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Share the portal URL with your agents. They can access it by entering their referral code 
            to view their personalized dashboard and referral link.
          </p>
        </div>
      </div>
    </div>
  );
}
