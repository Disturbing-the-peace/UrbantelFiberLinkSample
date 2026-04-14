-- Migration: 013_add_team_leader_relationship
-- Description: Add team_leader_id to track which team leader an agent reports to

-- Add team_leader_id column to agents table
ALTER TABLE agents 
ADD COLUMN team_leader_id UUID REFERENCES agents(id) ON DELETE SET NULL;

-- Add comment to explain the column
COMMENT ON COLUMN agents.team_leader_id IS 'Reference to the team leader this agent reports to. NULL if agent is a team leader or has no team leader.';

-- Create index for faster team-based queries
CREATE INDEX idx_agents_team_leader_id ON agents(team_leader_id) WHERE team_leader_id IS NOT NULL;

-- Ensure team leaders don't have a team leader themselves (optional constraint)
-- This prevents circular references where a team leader reports to another agent
ALTER TABLE agents 
ADD CONSTRAINT check_team_leader_no_parent 
CHECK (
  (role = 'Team Leader' AND team_leader_id IS NULL) OR 
  (role IS NULL OR role != 'Team Leader')
);

COMMIT;
