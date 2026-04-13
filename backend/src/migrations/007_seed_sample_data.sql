-- UrbanConnect ISP System - Sample Test Data
-- Migration: 007_seed_sample_data
-- Description: Creates sample applications, subscribers, and commissions for testing

-- ============================================================================
-- SAMPLE APPLICATIONS
-- ============================================================================

-- Get agent and plan IDs for reference
DO $$
DECLARE
  agent1_id UUID;
  agent2_id UUID;
  agent3_id UUID;
  plan1_id UUID;
  plan2_id UUID;
  plan3_id UUID;
BEGIN
  -- Get agent IDs
  SELECT id INTO agent1_id FROM agents WHERE referral_code = 'AGENT001' LIMIT 1;
  SELECT id INTO agent2_id FROM agents WHERE referral_code = 'AGENT002' LIMIT 1;
  SELECT id INTO agent3_id FROM agents WHERE referral_code = 'AGENT003' LIMIT 1;
  
  -- Get plan IDs
  SELECT id INTO plan1_id FROM plans WHERE name = 'Netflix 1558' LIMIT 1;
  SELECT id INTO plan2_id FROM plans WHERE name = 'Super FiberX Max' LIMIT 1;
  SELECT id INTO plan3_id FROM plans WHERE name = 'GameChanger EZ 1800' LIMIT 1;

  -- Insert sample applications (Submitted status)
  INSERT INTO applications (
    first_name, middle_name, last_name, birthday, contact_number, email,
    address, latitude, longitude, plan_id, agent_id, status, created_at
  ) VALUES
    ('Maria', 'Cruz', 'Garcia', '1990-05-15', '+639171111111', 'maria.garcia@example.com',
     '123 Main St, Quezon City', 14.6760, 121.0437, plan1_id, agent1_id, 'Submitted', NOW() - INTERVAL '5 days'),
    ('Jose', 'Ramos', 'Santos', '1985-08-20', '+639172222222', 'jose.santos@example.com',
     '456 Rizal Ave, Manila', 14.5995, 120.9842, plan2_id, agent2_id, 'Under Review', NOW() - INTERVAL '3 days'),
    ('Ana', 'Lopez', 'Reyes', '1992-03-10', '+639173333333', 'ana.reyes@example.com',
     '789 Bonifacio St, Makati', 14.5547, 121.0244, plan3_id, agent3_id, 'Approved', NOW() - INTERVAL '2 days');

  -- Insert sample applications (Activated - will become subscribers)
  INSERT INTO applications (
    first_name, middle_name, last_name, birthday, contact_number, email,
    address, latitude, longitude, plan_id, agent_id, status, created_at, updated_at, activated_at
  ) VALUES
    ('Carlos', 'Mendoza', 'Cruz', '1988-11-25', '+639174444444', 'carlos.cruz@example.com',
     '321 Luna St, Pasig', 14.5764, 121.0851, plan1_id, agent1_id, 'Activated', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ('Elena', 'Torres', 'Fernandez', '1995-07-18', '+639175555555', 'elena.fernandez@example.com',
     '654 Aguinaldo Ave, Paranaque', 14.4793, 121.0198, plan2_id, agent2_id, 'Activated', NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
    ('Roberto', 'Diaz', 'Martinez', '1987-09-30', '+639176666666', 'roberto.martinez@example.com',
     '987 Quezon Blvd, Caloocan', 14.6488, 120.9830, plan3_id, agent3_id, 'Activated', NOW() - INTERVAL '20 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days');

END $$;

-- ============================================================================
-- SAMPLE SUBSCRIBERS (from activated applications)
-- ============================================================================

-- Subscribers are just applications with status 'Activated'
-- No separate table needed - the applications table serves both purposes

-- ============================================================================
-- SAMPLE COMMISSIONS (auto-created from activated applications)
-- ============================================================================

-- Create commissions for activated applications
INSERT INTO commissions (agent_id, subscriber_id, amount, status, date_activated)
SELECT 
  a.agent_id,
  a.id as subscriber_id,
  (p.price * 0.60) as amount,
  'Eligible' as status,
  a.activated_at as date_activated
FROM applications a
JOIN plans p ON a.plan_id = p.id
WHERE a.status = 'Activated'
AND NOT EXISTS (
  SELECT 1 FROM commissions c WHERE c.subscriber_id = a.id
);

-- Mark one commission as Paid for testing
UPDATE commissions
SET status = 'Paid', date_paid = NOW() - INTERVAL '2 days'
WHERE id = (SELECT id FROM commissions ORDER BY date_activated LIMIT 1);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check counts
SELECT 'Applications' as table_name, COUNT(*) as count FROM applications
UNION ALL
SELECT 'Activated Applications (Subscribers)', COUNT(*) FROM applications WHERE status = 'Activated'
UNION ALL
SELECT 'Commissions', COUNT(*) FROM commissions;

-- View sample data
SELECT 
  a.first_name || ' ' || a.last_name as applicant,
  a.status,
  ag.name as agent,
  p.name as plan
FROM applications a
JOIN agents ag ON a.agent_id = ag.id
JOIN plans p ON a.plan_id = p.id
ORDER BY a.created_at DESC;

SELECT 
  a.first_name || ' ' || a.last_name as subscriber,
  ag.name as agent,
  p.name as plan,
  c.amount as commission,
  c.status as commission_status
FROM applications a
JOIN agents ag ON a.agent_id = ag.id
JOIN plans p ON a.plan_id = p.id
LEFT JOIN commissions c ON c.subscriber_id = a.id
WHERE a.status = 'Activated'
ORDER BY a.activated_at DESC;

-- ============================================================================
-- NOTES
-- ============================================================================
-- This seed data creates:
-- - 6 sample applications (3 in various stages, 3 activated)
-- - 3 activated applications (these are the "subscribers")
-- - 3 commissions (1 Paid, 2 Eligible)
--
-- Note: There is no separate subscribers table. Applications with status 'Activated'
-- are considered subscribers in this system.
--
-- You can run this migration multiple times safely as it uses the existing
-- agents and plans from the previous seed data.
