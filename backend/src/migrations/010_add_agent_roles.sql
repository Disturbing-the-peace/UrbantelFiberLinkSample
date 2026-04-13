-- Migration: Add roles to agents table
-- Description: Add a role column to track agent roles (e.g., Team Leader)
-- Date: 2026-04-12

-- Add role column to agents table
ALTER TABLE agents 
ADD COLUMN role VARCHAR(50);

-- Add comment to explain the column
COMMENT ON COLUMN agents.role IS 'Agent role (e.g., Team Leader). NULL means no special role.';

-- Create index for faster role-based queries
CREATE INDEX idx_agents_role ON agents(role) WHERE role IS NOT NULL;

-- Update existing agents to have NULL role (no role assigned)
-- This is already the default, but making it explicit
UPDATE agents SET role = NULL WHERE role IS NULL;

-- Example: Set some agents as Team Leaders (optional - remove if not needed)
-- UPDATE agents SET role = 'Team Leader' WHERE id IN ('agent-id-1', 'agent-id-2');

COMMIT;
