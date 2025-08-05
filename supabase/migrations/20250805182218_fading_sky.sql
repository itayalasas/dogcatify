/*
  # Add medical history access tokens table

  1. New Tables
    - `medical_history_tokens`
      - `id` (uuid, primary key)
      - `pet_id` (uuid, foreign key to pets)
      - `token` (text, unique)
      - `expires_at` (timestamp)
      - `created_by` (uuid, foreign key to profiles)
      - `accessed_at` (timestamp, nullable)
      - `access_count` (integer, default 0)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `medical_history_tokens` table
    - Add policy for pet owners to create tokens
    - Add policy for public access to valid tokens (for veterinarians)

  3. Indexes
    - Index on token for fast lookup
    - Index on expires_at for cleanup
    - Index on pet_id for owner queries
*/

CREATE TABLE IF NOT EXISTS medical_history_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  accessed_at timestamptz,
  access_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE medical_history_tokens ENABLE ROW LEVEL SECURITY;

-- Policy for pet owners to create tokens for their pets
CREATE POLICY "Pet owners can create tokens for their pets"
  ON medical_history_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pets 
      WHERE pets.id = medical_history_tokens.pet_id 
      AND pets.owner_id = auth.uid()
    )
  );

-- Policy for pet owners to view their tokens
CREATE POLICY "Pet owners can view their tokens"
  ON medical_history_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pets 
      WHERE pets.id = medical_history_tokens.pet_id 
      AND pets.owner_id = auth.uid()
    )
  );

-- Policy for public access to valid tokens (for veterinarians)
CREATE POLICY "Public can access valid tokens"
  ON medical_history_tokens
  FOR SELECT
  TO anon
  USING (expires_at > now());

-- Policy for service role to update access tracking
CREATE POLICY "Service role can update access tracking"
  ON medical_history_tokens
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_medical_history_tokens_token ON medical_history_tokens(token);
CREATE INDEX IF NOT EXISTS idx_medical_history_tokens_expires_at ON medical_history_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_medical_history_tokens_pet_id ON medical_history_tokens(pet_id);

-- Function to clean up expired tokens (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_medical_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM medical_history_tokens 
  WHERE expires_at < now() - interval '1 day';
END;
$$;