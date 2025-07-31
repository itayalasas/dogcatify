/*
  # Create email_confirmations table

  1. New Tables
    - `email_confirmations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `email` (text, email address)
      - `token_hash` (text, unique confirmation token)
      - `type` (text, type of confirmation: 'signup' or 'password_reset')
      - `is_confirmed` (boolean, confirmation status)
      - `expires_at` (timestamptz, token expiration)
      - `created_at` (timestamptz, creation timestamp)
      - `confirmed_at` (timestamptz, confirmation timestamp)

  2. Security
    - Enable RLS on `email_confirmations` table
    - Add policy for users to read their own confirmation records
    - Add policy for service role to manage all records

  3. Indexes
    - Index on token_hash for fast lookups
    - Index on user_id for user-specific queries
    - Index on expires_at for cleanup queries
*/

-- Create the email_confirmations table
CREATE TABLE IF NOT EXISTS email_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('signup', 'password_reset')),
  is_confirmed boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE email_confirmations ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_confirmations_token_hash ON email_confirmations(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_confirmations_user_id ON email_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_email_confirmations_expires_at ON email_confirmations(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_confirmations_type_confirmed ON email_confirmations(type, is_confirmed);

-- RLS Policies

-- Policy: Users can read their own confirmation records
CREATE POLICY "Users can read own email confirmations"
  ON email_confirmations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all records (for server-side operations)
CREATE POLICY "Service role can manage all email confirmations"
  ON email_confirmations
  FOR ALL
  TO service_role
  USING (true);

-- Policy: Allow public access for token verification (needed for confirmation links)
CREATE POLICY "Public can verify tokens"
  ON email_confirmations
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow public updates for confirmation (needed for confirmation process)
CREATE POLICY "Public can confirm tokens"
  ON email_confirmations
  FOR UPDATE
  TO anon
  USING (true);

-- Add email_confirmed column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_confirmed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_confirmed boolean DEFAULT false;
  END IF;
END $$;

-- Add email_confirmed_at column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_confirmed_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_confirmed_at timestamptz;
  END IF;
END $$;

-- Create a function to clean up expired tokens (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_email_confirmations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM email_confirmations 
  WHERE expires_at < now() AND is_confirmed = false;
END;
$$;

-- Create a function to check if user email is confirmed
CREATE OR REPLACE FUNCTION is_user_email_confirmed(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  confirmed boolean := false;
BEGIN
  SELECT email_confirmed INTO confirmed
  FROM profiles
  WHERE id = user_uuid;
  
  RETURN COALESCE(confirmed, false);
END;
$$;