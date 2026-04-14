-- Migration: 012_remove_messenger_link
-- Description: Removes messenger_link column from agents table as Facebook Messenger integration is not working

-- Remove messenger_link column from agents table
ALTER TABLE agents DROP COLUMN IF EXISTS messenger_link;

-- Add comment for documentation
COMMENT ON TABLE agents IS 'Sales agents with unique referral codes for customer applications (messenger integration removed)';
