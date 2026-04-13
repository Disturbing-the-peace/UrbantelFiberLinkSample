-- UrbanConnect ISP System - Real Plans Data
-- Migration: 003_seed_data_urbanconnect
-- Description: Inserts actual UrbanConnect ISP plans

-- ============================================================================
-- CLEAR EXISTING DATA
-- ============================================================================
-- Clear existing plans (if you've already run the sample seed data)
DELETE FROM plans;

-- ============================================================================
-- URBANCONNECT PLANS
-- ============================================================================

-- FiberX High-End
INSERT INTO plans (name, category, speed, price, inclusions) VALUES
('FiberX 3500', 'Residential', '1000 Mbps', 3500.00, ARRAY['WiFi-6', 'BlastTV', 'XCLSV perks', 'Unlimited Data']);

-- GameChanger (Gaming)
INSERT INTO plans (name, category, speed, price, inclusions) VALUES
('GameChanger EZ 1800', 'Residential', '400 Mbps', 1800.00, ARRAY['Gaming optimized', 'Low latency', 'Unlimited Data']),
('GameChanger ELITE 5000', 'Residential', '1000 Mbps', 5000.00, ARRAY['Gaming optimized', 'Ultra-low latency', 'Priority routing', 'Unlimited Data']);

-- FiberX Time of Day
INSERT INTO plans (name, category, speed, price, inclusions) VALUES
('FiberX Day Plan', 'Residential', '600 Mbps Day / 400 Mbps Night', 1699.00, ARRAY['Time-based speed', 'Unlimited Data', 'Perfect for day users']),
('FiberX Night Plan', 'Residential', '400 Mbps Day / 600 Mbps Night', 1699.00, ARRAY['Time-based speed', 'Unlimited Data', 'Perfect for night users']);

-- FiberX Netflix Bundles
INSERT INTO plans (name, category, speed, price, inclusions) VALUES
('Netflix 1558', 'Residential', '200 Mbps', 1558.00, ARRAY['Netflix Basic included', 'Unlimited Data', 'Free WiFi Router']),
('Netflix 1798', 'Residential', '400 Mbps', 1798.00, ARRAY['Netflix Basic included', 'Unlimited Data', 'Free WiFi Router']),
('Netflix 1998', 'Residential', '500 Mbps', 1998.00, ARRAY['Netflix Standard included', 'Unlimited Data', 'Free WiFi Router']),
('Netflix 2298', 'Residential', '600 Mbps', 2298.00, ARRAY['Netflix Premium included', 'Unlimited Data', 'Free WiFi Router']);

-- Super FiberX (with SkyTV/Xperience Hub)
INSERT INTO plans (name, category, speed, price, inclusions) VALUES
('Super FiberX Play', 'Residential', '200 Mbps', 1349.00, ARRAY['SkyTV/Xperience Hub', 'Unlimited Data', 'Free WiFi Router']),
('Super FiberX Max', 'Residential', '400 Mbps', 1599.00, ARRAY['SkyTV/Xperience Hub', 'Unlimited Data', 'Free WiFi Router']),
('Super FiberX Prime', 'Residential', '800 Mbps', 2099.00, ARRAY['SkyTV/Xperience Hub', 'Unlimited Data', 'Free WiFi Router']),
('Super FiberX Ultra', 'Residential', '1000 Mbps', 2599.00, ARRAY['SkyTV/Xperience Hub', 'Unlimited Data', 'Free WiFi Router']);

-- ============================================================================
-- SAMPLE AGENTS (Keep these for testing)
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
-- VERIFICATION
-- ============================================================================
-- Check plans count (should be 13 plans, all Residential)
SELECT COUNT(*) as total_plans FROM plans;
SELECT category, COUNT(*) as count FROM plans GROUP BY category;

-- View all plans
SELECT name, speed, price FROM plans ORDER BY price;

-- ============================================================================
-- NOTES
-- ============================================================================
COMMENT ON TABLE plans IS 'Seeded with 13 UrbanConnect ISP plans (all Residential)';
COMMENT ON TABLE agents IS 'Seeded with 3 sample agents for testing';

-- Note: All plans are categorized as 'Residential' since UrbanConnect doesn't have
-- separate Business plans in the provided list. If you need Business plans later,
-- you can add them or update the category for specific plans.
