-- Migration 031: Remove signature_url column
-- Description: Consolidate government_id_url and signature_url into single column
-- Reason: Frontend uploads one combined image (ID with signatures), no need for duplicate storage

-- IMPORTANT: After running this migration, run the cleanup script to delete duplicate files:
--   Windows: .\src\migrations\run-031-cleanup.ps1
--   Linux/Mac: ./src/migrations/run-031-cleanup.sh
--
-- The cleanup script will:
--   1. Find all 'signature' files in Supabase Storage
--   2. Delete them (they're duplicates of government_id files)
--   3. Free up storage space

-- The signature_url column is redundant as it stores the same image as government_id_url
-- This migration removes the duplicate column to simplify the schema

BEGIN;

-- Drop the signature_url column from applications table
ALTER TABLE applications DROP COLUMN IF EXISTS signature_url;

-- Add comment explaining the change
COMMENT ON COLUMN applications.government_id_url IS 'Government-issued ID with signatures on paper (combined image)';

COMMIT;
