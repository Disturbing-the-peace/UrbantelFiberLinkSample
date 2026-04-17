-- Migration: Add events table for calendar functionality
-- Description: Creates events table for admin to manage calendar events

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  color VARCHAR(7) DEFAULT '#00A191', -- Brand teal color
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create index for date queries
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY events_admin_all ON events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- Policy: Other users can only view events
CREATE POLICY events_users_read ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();

-- Insert sample events
INSERT INTO events (title, description, start_date, end_date, all_day, color) VALUES
  ('Company Meeting', 'Monthly all-hands meeting', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '2 hours', false, '#00A191'),
  ('System Maintenance', 'Scheduled system maintenance window', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '4 hours', false, '#EF4444'),
  ('Training Session', 'Agent onboarding training', NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days', true, '#3B82F6');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Events table created successfully';
END $$;
