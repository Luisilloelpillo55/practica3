-- Migration: Add priority column to existing tickets table
-- This script adds the missing priority column if it doesn't exist

ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'moderada';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tickets' AND column_name = 'priority';
