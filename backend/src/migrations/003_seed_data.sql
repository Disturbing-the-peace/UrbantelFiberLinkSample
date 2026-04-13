-- UrbanConnect ISP System - Seed Data
-- Migration: 003_seed_data
-- Description: Initial data for development and testing

-- ============================================================================
-- SAMPLE PLANS
-- ============================================================================
-- Residential Plans
INSERT INTO plans (name, category, speed, price, inclusions) VALUES
  (
    'Home Basic',
    'Residential',
    '50 Mbps',
    999.00,
    ARRAY['Unlimited data', 'Free installation', '24/7 customer support']
  ),
  (
    'Home Plus',
    'Residential',
    '100 Mbps',
    1499.00,
    ARRAY['Unlimited data', 'Free installation', '24/7 customer support', 'Free Wi-Fi router']
  ),
  (
    'Home Premium',
    'Residential',
    '200 Mbps',
    1999.00,
    ARRAY['Unlimited data', 'Free installation', '24/7 customer support', 'Free Wi-Fi router', 'Priority support']
  ),
  (
    'Home Ultra',
    'Residential',
    '500 Mbps',
    2999.00,
    ARRAY['Unlimited data', 'Free installation', '24/7 customer support', 'Free Wi-Fi router', 'Priority support', 'Static IP option']
  );

-- Business Plans
INSERT INTO plans (name, category, speed, price, inclusions) VALUES
  (
    'Business Starter',
    'Business',
    '100 Mbps',
    2499.00,
    ARRAY['Unlimited data', 'Free installation', '24/7 priority support', 'Static IP', 'SLA guarantee']
  ),
  (
    'Business Pro',
    'Business',
    '300 Mbps',
    4999.00,
    ARRAY['Unlimited data', 'Free installation', '24/7 priority support', 'Static IP', 'SLA guarantee', 'Dedicated account manager']
  ),
  (
    'Business Enterprise',
    'Business',
    '1 Gbps',
    9999.00,
    ARRAY['Unlimited data', 'Free installation', '24/7 priority support', 'Multiple static IPs', 'SLA guarantee', 'Dedicated account manager', 'Custom solutions']
  );

-- ============================================================================
-- SAMPLE AGENTS
-- ============================================================================
INSERT INTO agents (name, referral_code, contact_number, email, messenger_link) VALUES
  (
    'Juan Dela Cruz',
    'AGENT001',
    '+639171234567',
    'juan.delacruz@example.com',
    'https://m.me/juandelacruz'
  ),
  (
    'Maria Santos',
    'AGENT002',
    '+639181234567',
    'maria.santos@example.com',
    'https://m.me/mariasantos'
  ),
  (
    'Pedro Reyes',
    'AGENT003',
    '+639191234567',
    'pedro.reyes@example.com',
    'https://m.me/pedroreyes'
  );

-- ============================================================================
-- NOTES
-- ============================================================================
-- User accounts should be created via Supabase Auth, not directly in the users table
-- The users table will be populated automatically when staff members sign up
-- Initial superadmin account should be created manually via Supabase dashboard

COMMENT ON TABLE plans IS 'Seeded with 7 sample plans (4 Residential, 3 Business)';
COMMENT ON TABLE agents IS 'Seeded with 3 sample agents for testing';
