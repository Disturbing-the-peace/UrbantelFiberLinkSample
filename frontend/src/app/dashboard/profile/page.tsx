'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { User, Mail, Shield, Calendar, Camera, Upload, X, Check, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get display name
  const getDisplayName = () => {
    if (user?.full_name) return user.full_name;
    const name = user?.email.split('@')[0] || '';
    return name
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  // Get initials
  const getInitials = () => {
    if (user?.full_name) {
      const parts = user.full_name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return user.full_name.substring(0, 2).toUpperCase();
    }
    const parts = user?.email.split('@')[0].split('.') || [];
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user?.email.substring(0, 2).toUpperCase() || 'U';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setUploadMessage({ type: 'error', text: 'Image must be less than 2MB' });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    if (!user?.id) return;

    setUploading(true);
    setUploadMessage(null);

    try {
      const supabase = getSupabaseClient();
      
      // Delete old profile picture if exists
      if (user.profile_picture_url) {
        const oldPath = user.profile_picture_url.split('/').slice(-2).join('/');
        await supabase.storage.from('profile-pictures').remove([oldPath]);
      }

      // Upload new profile picture
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update user record
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_picture_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshUser();
      setUploadMessage({ type: 'success', text: 'Profile picture updated successfully' });
      
      // Clear message after 3 seconds
      setTimeout(() => setUploadMessage(null), 3000);
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadMessage({ type: 'error', text: error.message || 'Failed to upload profile picture' });
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user?.id || !user.profile_picture_url) return;

    setUploading(true);
    setUploadMessage(null);

    try {
      const supabase = getSupabaseClient();
      
      // Delete from storage
      const oldPath = user.profile_picture_url.split('/').slice(-2).join('/');
      await supabase.storage.from('profile-pictures').remove([oldPath]);

      // Update user record
      const { error } = await supabase
        .from('users')
        .update({ profile_picture_url: null })
        .eq('id', user.id);

      if (error) throw error;

      await refreshUser();
      setPreviewUrl(null);
      setUploadMessage({ type: 'success', text: 'Profile picture removed' });
      
      setTimeout(() => setUploadMessage(null), 3000);
    } catch (error: any) {
      setUploadMessage({ type: 'error', text: error.message || 'Failed to remove profile picture' });
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#00A191] dark:text-[#14B8A6]">Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">View and manage your profile information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 p-6">
          <div className="flex flex-col items-center text-center">
            {/* Avatar with Upload */}
            <div className="relative mb-4">
              {user.profile_picture_url || previewUrl ? (
                <img
                  src={previewUrl || user.profile_picture_url || ''}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00A191] to-[#14B8A6] flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                  {getInitials()}
                </div>
              )}
              
              {/* Upload Button Overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border-2 border-gray-200 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            
            {/* Upload Message */}
            {uploadMessage && (
              <div
                className={`w-full mb-3 p-2 rounded-lg text-xs flex items-center gap-1 ${
                  uploadMessage.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {uploadMessage.type === 'success' ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <X className="w-3 h-3" />
                )}
                {uploadMessage.text}
              </div>
            )}
            
            {/* Name */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {getDisplayName()}
            </h2>
            
            {/* Role Badge */}
            <span className="inline-block px-3 py-1 text-sm font-medium text-[#00A191] dark:text-[#14B8A6] bg-teal-100 dark:bg-teal-900/30 rounded-full capitalize mb-4">
              {user.role}
            </span>
            
            {/* Email */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{user.email}</p>
            
            {/* Action Buttons */}
            <div className="w-full space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full px-4 py-2 bg-[#00A191] text-white rounded-lg hover:bg-[#008c7a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Change Photo'}
              </button>
              
              {user.profile_picture_url && (
                <button
                  onClick={handleRemovePhoto}
                  disabled={uploading}
                  className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Remove Photo
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Details Card */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Account Details</h3>
          
          <div className="space-y-6">
            {/* Full Name */}
            <div className="flex items-start gap-4 pb-6 border-b border-gray-100 dark:border-gray-700">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Full Name</p>
                <p className="text-base text-gray-900 dark:text-gray-100">{user.full_name || 'Not set'}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4 pb-6 border-b border-gray-100 dark:border-gray-700">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email Address</p>
                <p className="text-base text-gray-900 dark:text-gray-100">{user.email}</p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-start gap-4 pb-6 border-b border-gray-100 dark:border-gray-700">
              <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Role</p>
                <p className="text-base text-gray-900 dark:text-gray-100 capitalize">{user.role}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {user.role === 'superadmin' 
                    ? 'Full system access with all administrative privileges'
                    : 'Standard administrative access'}
                </p>
              </div>
            </div>

            {/* Account Status */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Account Status</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <p className="text-base text-gray-900 dark:text-gray-100">Active</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Member since {new Date(user.created_at || '').toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

