-- Migration: 025_remove_branch_code
-- Description: Remove redundant code field from branches table (UUID already provides uniqueness)

-- ============================================================================
-- DROP INDEX ON CODE COLUMN
-- ============================================================================
DROP INDEX IF EXISTS idx_branches_code;

-- ============================================================================
-- REMOVE CODE COLUMN FROM BRANCHES TABLE
-- ============================================================================
ALTER TABLE branches DROP COLUMN IF EXISTS code;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify the column is removed
DO $
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'branches' 
    AND column_name = 'code'
  ) THEN
    RAISE EXCEPTION 'Failed to remove code column from branches table';
  ELSE
    RAISE NOTICE '✓ Successfully removed code column from branches table';
  END IF;
END $;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE branches IS 'Branch locations - name serves as human-readable identifier, UUID provides uniqueness';

