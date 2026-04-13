-- UrbanConnect ISP System - Supabase Storage Configuration
-- Migration: 004_storage_setup
-- Description: Storage bucket policies for customer document uploads

-- ============================================================================
-- STORAGE BUCKET POLICIES
-- ============================================================================
-- Note: The storage bucket 'customer-documents' must be created manually
-- in the Supabase dashboard before applying these policies.
--
-- Bucket Configuration:
--   - Name: customer-documents
--   - Public: No (private bucket)
--   - File size limit: 5MB per file
--   - Allowed MIME types: image/jpeg, image/png, image/webp
--
-- See STORAGE_SETUP_GUIDE.md for detailed instructions.
-- ============================================================================

-- ============================================================================
-- POLICY 1: Public Upload Access
-- ============================================================================
-- Allows public users to upload documents during application submission
-- This is required for the public application form to work
CREATE POLICY "Public can upload customer documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'customer-documents'
);

-- ============================================================================
-- POLICY 2: Staff Read Access
-- ============================================================================
-- Allows authenticated admin and superadmin users to view all documents
-- This is required for application review and subscriber management
CREATE POLICY "Staff can view customer documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'customer-documents' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
    AND users.is_active = true
  )
);

-- ============================================================================
-- POLICY 3: System Delete Access
-- ============================================================================
-- Allows system to delete documents during automated data purge
-- This is required for the 3-day data retention policy
CREATE POLICY "System can delete customer documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'customer-documents'
);

-- ============================================================================
-- POLICY 4: Staff Update Access (Optional)
-- ============================================================================
-- Allows staff to update document metadata if needed
CREATE POLICY "Staff can update customer documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'customer-documents' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
    AND users.is_active = true
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after applying policies to verify setup

-- Check if bucket exists
-- SELECT * FROM storage.buckets WHERE name = 'customer-documents';

-- Check applied policies
-- SELECT * FROM storage.policies WHERE bucket_id = 'customer-documents';

-- Test upload path format (example)
-- Path format: {application_id}/{document_type}_{timestamp}.{ext}
-- Example: 550e8400-e29b-41d4-a716-446655440000/house_photo_1704067200000.png

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON POLICY "Public can upload customer documents" ON storage.objects 
IS 'Allows public application form to upload customer documents';

COMMENT ON POLICY "Staff can view customer documents" ON storage.objects 
IS 'Allows admin and superadmin to view all customer documents for review';

COMMENT ON POLICY "System can delete customer documents" ON storage.objects 
IS 'Allows automated data purge system to delete documents after 3 days';

COMMENT ON POLICY "Staff can update customer documents" ON storage.objects 
IS 'Allows staff to update document metadata if needed';
