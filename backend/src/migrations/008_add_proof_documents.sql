-- Migration: Add proof of billing and proof of income columns
-- Created: 2026-04-08
-- Description: Adds columns for proof of billing and proof of income documents
--              Required based on plan price:
--              - Plans ≥ ₱2000: Proof of billing required
--              - Plans ≥ ₱3000: Proof of billing + Proof of income required
--              Documents must be dated within 3 months before application

-- Add proof of billing URL column
ALTER TABLE applications
ADD COLUMN proof_of_billing_url TEXT;

-- Add proof of income URL column
ALTER TABLE applications
ADD COLUMN proof_of_income_url TEXT;

-- Add comments to the columns
COMMENT ON COLUMN applications.proof_of_billing_url IS 'URL to proof of billing document (utility bills, etc.) - Required for plans ≥ ₱2000. Must be dated within 3 months of application.';
COMMENT ON COLUMN applications.proof_of_income_url IS 'URL to proof of income document (payslip, ITR, etc.) - Required for plans ≥ ₱3000. Must be dated within 3 months of application.';

-- Note: contact_number column already exists in the applications table from 001_initial_schema.sql
-- If for some reason it doesn't exist in your database, uncomment the following lines:

-- ALTER TABLE applications
-- ADD COLUMN contact_number VARCHAR(20);
-- 
-- COMMENT ON COLUMN applications.contact_number IS 'Customer contact phone number';
-- 
-- CREATE INDEX idx_applications_contact_number ON applications(contact_number);

-- Verify the columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'applications' 
    AND column_name IN ('proof_of_billing_url', 'proof_of_income_url', 'contact_number')
ORDER BY 
    column_name;
