-- Migration: Update agent roles
-- Description: Document the new agent role types (CBA, Team Leader, Organic)
-- Date: 2026-04-23

-- The agents.role column already supports VARCHAR(50), so no schema changes needed
-- This migration documents the valid role values:
-- 
-- NULL or empty string = CBA (Commission-Based Agent) - default role
-- 'Team Leader' = Team Leader role
-- 'Organic' = Organic agent role
--
-- Note: The role column is flexible and can accommodate additional roles in the future

-- Add comment to document the role types
COMMENT ON COLUMN agents.role IS 'Agent role: NULL/empty = CBA, "Team Leader" = Team Leader, "Organic" = Organic agent';

-- Optional: Update any existing agents with empty string to NULL for consistency
UPDATE agents SET role = NULL WHERE role = '';

COMMIT;
