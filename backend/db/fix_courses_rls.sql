-- Fix RLS policies for courses table to allow inserts
-- Run this in your Supabase SQL Editor

-- Enable RLS on courses (if not already enabled)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Users can insert courses" ON courses;
DROP POLICY IF EXISTS "Users can update courses" ON courses;
DROP POLICY IF EXISTS "Users can delete courses" ON courses;

-- Create policies for courses
-- Anyone can view courses (public read)
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  USING (true);

-- Authenticated users can insert courses (for AI-generated courses)
CREATE POLICY "Users can insert courses"
  ON courses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update courses they created (if you add a created_by column later)
-- For now, allow authenticated users to update
CREATE POLICY "Users can update courses"
  ON courses FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Users can delete courses (if needed)
CREATE POLICY "Users can delete courses"
  ON courses FOR DELETE
  USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON courses TO authenticated;
GRANT SELECT ON courses TO anon;

RAISE NOTICE 'Fixed courses table RLS policies';



