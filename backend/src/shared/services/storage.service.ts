/**
 * Supabase Storage Helper Module
 * Provides utility functions for customer document storage operations
 */

import { supabase } from '../../shared/config/supabase';

/**
 * Document types that can be uploaded
 */
export type DocumentType = 
  | 'house_photo' 
  | 'government_id' 
  | 'id_selfie' 
  | 'signature'
  | 'proof_of_billing'
  | 'proof_of_income';

/**
 * Storage bucket name for customer documents
 */
export const CUSTOMER_DOCUMENTS_BUCKET = 'customer-documents';

/**
 * Maximum file size in bytes (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Allowed MIME types for uploads
 */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Generate a storage path for a document
 * Format: {applicationId}/{documentType}_{timestamp}.{extension}
 */
export function generateDocumentPath(
  applicationId: string,
  documentType: DocumentType,
  fileExtension: string
): string {
  const timestamp = Date.now();
  return `${applicationId}/${documentType}_${timestamp}.${fileExtension}`;
}

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Validate file before upload
 */
export function validateFile(file: {
  size: number;
  type: string;
}): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed. Only JPEG, PNG, and WebP images are supported.`,
    };
  }

  return { valid: true };
}

/**
 * Upload a document to storage
 * @param applicationId - UUID of the application
 * @param file - File buffer or Blob to upload
 * @param documentType - Type of document being uploaded
 * @param filename - Original filename (for extension extraction)
 * @returns Storage path of uploaded file
 */
export async function uploadDocument(
  applicationId: string,
  file: Buffer | Blob,
  documentType: DocumentType,
  filename: string
): Promise<string> {
  const fileExtension = getFileExtension(filename);
  const filePath = generateDocumentPath(applicationId, documentType, fileExtension);

  // Determine content type based on file extension
  let contentType = 'image/png'; // Default
  if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
    contentType = 'image/jpeg';
  } else if (fileExtension === 'webp') {
    contentType = 'image/webp';
  }

  const { data, error } = await supabase.storage
    .from(CUSTOMER_DOCUMENTS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: contentType,
    });

  if (error) {
    throw new Error(`Failed to upload document: ${error.message}`);
  }

  return data.path;
}

/**
 * Get a signed URL for viewing a document
 * @param filePath - Storage path of the document
 * @param expiresIn - URL expiry time in seconds (default: 1 hour)
 * @returns Signed URL for accessing the document
 */
export async function getDocumentUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(CUSTOMER_DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a document from storage
 * @param filePath - Storage path of the document to delete
 */
export async function deleteDocument(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(CUSTOMER_DOCUMENTS_BUCKET)
    .remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

/**
 * Delete all documents for an application
 * @param applicationId - UUID of the application
 */
export async function deleteApplicationDocuments(
  applicationId: string
): Promise<void> {
  // List all files in the application folder
  const { data: files, error: listError } = await supabase.storage
    .from(CUSTOMER_DOCUMENTS_BUCKET)
    .list(applicationId);

  if (listError) {
    throw new Error(`Failed to list documents: ${listError.message}`);
  }

  if (!files || files.length === 0) {
    return; // No files to delete
  }

  // Delete all files
  const filePaths = files.map((file) => `${applicationId}/${file.name}`);
  const { error: deleteError } = await supabase.storage
    .from(CUSTOMER_DOCUMENTS_BUCKET)
    .remove(filePaths);

  if (deleteError) {
    throw new Error(`Failed to delete documents: ${deleteError.message}`);
  }
}

/**
 * Get public URL for a document (for private buckets, use getDocumentUrl instead)
 * Note: This will not work for private buckets without proper policies
 */
export function getPublicUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(CUSTOMER_DOCUMENTS_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Check if a file exists in storage
 * @param filePath - Storage path to check
 * @returns True if file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .list(filePath.split('/')[0], {
        search: filePath.split('/')[1],
      });

    if (error) return false;
    return data && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get storage statistics for monitoring
 */
export async function getStorageStats(): Promise<{
  fileCount: number;
  totalSizeBytes: number;
  totalSizeMB: number;
}> {
  // Note: This requires service role access
  // For production, implement this as a backend API endpoint
  const { data, error } = await supabase.storage
    .from(CUSTOMER_DOCUMENTS_BUCKET)
    .list();

  if (error) {
    throw new Error(`Failed to get storage stats: ${error.message}`);
  }

  const fileCount = data?.length || 0;
  const totalSizeBytes = data?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;
  const totalSizeMB = Math.round((totalSizeBytes / 1024 / 1024) * 100) / 100;

  return {
    fileCount,
    totalSizeBytes,
    totalSizeMB,
  };
}
