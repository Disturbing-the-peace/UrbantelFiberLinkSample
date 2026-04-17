'use client';

import { useState } from 'react';
import { authApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Eye, EyeOff, Lock, Upload, X } from 'lucide-react';
import ImageUpload from './ImageUpload';

interface FirstLoginModalProps {
  onComplete: () => void;
}

export default function FirstLoginModal({ onComplete }: FirstLoginModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      toast.error('Password is required');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await authApi.completeFirstLogin({
        new_password: newPassword,
        profile_picture_url: profilePicture || undefined,
      });
      
      toast.success('Password updated successfully! Welcome to UrbanTel FiberLink.');
      onComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipProfilePicture = () => {
    setShowImageUpload(false);
    setProfilePicture(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 rounded-t-xl">
          <div className="flex items-center gap-3 text-white">
            <Lock className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Welcome!</h2>
              <p className="text-teal-100 text-sm">First time login - Let's set up your account</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Password Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter new password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Must be at least 8 characters long
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Profile Picture Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Profile Picture (Optional)
            </label>
            
            {!showImageUpload && !profilePicture ? (
              <button
                type="button"
                onClick={() => setShowImageUpload(true)}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-teal-500 dark:hover:border-teal-500 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400"
              >
                <Upload className="w-5 h-5" />
                <span>Upload Profile Picture</span>
              </button>
            ) : showImageUpload ? (
              <div className="space-y-3">
                <ImageUpload
                  onUploadComplete={(url) => {
                    setProfilePicture(url);
                    setShowImageUpload(false);
                    toast.success('Profile picture uploaded successfully');
                  }}
                  folder="profile-pictures"
                  maxSizeMB={5}
                />
                <button
                  type="button"
                  onClick={handleSkipProfilePicture}
                  className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Skip for now
                </button>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setProfilePicture(null);
                    setShowImageUpload(false);
                  }}
                  className="absolute top-0 right-1/2 translate-x-16 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Setting up...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Complete Setup</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            You can update your profile picture later in Settings
          </p>
        </form>
      </div>
    </div>
  );
}
