'use client';

import { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';

interface ImageUploadProps {
  label: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
  required?: boolean;
  onImageChange: (name: string, file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
}

export default function ImageUpload({
  label,
  name,
  description,
  icon,
  required = false,
  onImageChange,
  accept = 'image/*',
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      setPreview(null);
      onImageChange(name, null);
      return;
    }

    // Check if it's an image or document
    const isImage = file.type.startsWith('image/');
    const isDocument = file.type === 'application/pdf' || 
                       file.type === 'application/msword' || 
                       file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // Validate file type based on accept prop
    if (accept.includes('image') && !isImage && !isDocument) {
      setError('Please select a valid image file');
      return;
    }

    if (accept.includes('.pdf') || accept.includes('.doc')) {
      if (!isImage && !isDocument) {
        setError('Please select a valid file (PDF, DOCX, or image)');
        return;
      }
    }

    // Validate file size (before compression)
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setError(null);

    // If it's a document (PDF/DOCX), don't compress, just pass it through
    if (isDocument) {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      onImageChange(name, file);
      return;
    }

    // If it's an image, compress it
    setIsCompressing(true);

    try {
      // Compression options
      const options = {
        maxSizeMB: 1, // Compress to max 1MB
        maxWidthOrHeight: 1920, // Max dimension
        useWebWorker: true,
        fileType: 'image/png', // Convert to PNG
      };

      // Compress the image
      const compressedFile = await imageCompression(file, options);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(compressedFile);
      setPreview(previewUrl);
      
      // Pass compressed file to parent
      onImageChange(name, compressedFile);
    } catch (err) {
      console.error('Error compressing image:', err);
      setError('Failed to compress image. Please try again.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onImageChange(name, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border-2 border-gray-200 dark:border-gray-600 rounded-xl p-4 sm:p-6 hover:border-blue-300 dark:hover:border-blue-500 transition-all bg-white dark:bg-gray-800">
      <div className="flex items-start gap-4 mb-4">
        {icon && (
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <label htmlFor={name} className="block text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-start space-x-4">
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            id={name}
            name={name}
            accept={accept}
            onChange={handleFileChange}
            disabled={isCompressing}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-medium
              file:bg-blue-50 file:text-blue-700
              dark:file:bg-blue-900 dark:file:text-blue-200
              hover:file:bg-blue-100 dark:hover:file:bg-blue-800
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          {isCompressing && (
            <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 flex items-center">
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Compressing image...
            </p>
          )}
          
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Max size: {maxSizeMB}MB
          </p>
        </div>
        
        {preview && (
          <div className="relative">
            {accept.includes('.pdf') || accept.includes('.doc') ? (
              // Document preview
              <div className="w-24 h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-md border-2 border-green-500">
                <svg className="w-12 h-12 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
            ) : (
              // Image preview
              <img
                src={preview}
                alt="Preview"
                className="w-24 h-24 object-cover rounded-md border-2 border-green-500"
              />
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
            >
              ×
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-xs py-1 text-center rounded-b-md">
              ✓ Uploaded
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
