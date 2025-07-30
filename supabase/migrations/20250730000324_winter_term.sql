/*
  # Add biometric authentication support to profiles

  1. New Columns
    - `biometric_enabled` (boolean) - Whether biometric auth is enabled for the user
    - `biometric_enabled_at` (timestamptz) - When biometric auth was enabled

  2. Security
    - Users can only update their own biometric settings
*/

-- Add biometric_enabled column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS biometric_enabled boolean DEFAULT false;

-- Add biometric_enabled_at column to track when it was enabled
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS biometric_enabled_at timestamptz;

-- Create policy for users to update their own biometric settings
CREATE POLICY IF NOT EXISTS "Users can update own biometric settings"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);