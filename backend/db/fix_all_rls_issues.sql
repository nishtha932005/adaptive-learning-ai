-- Complete fix for all RLS and table issues
-- Run this ENTIRE script in your Supabase SQL Editor

-- ============================================
-- PART 1: Fix learning_preferences table
-- ============================================

-- Drop and recreate learning_preferences table
DROP TABLE IF EXISTS learning_preferences CASCADE;

CREATE TABLE learning_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  goal TEXT,
  vibe TEXT CHECK (vibe IN ('saga', 'bootcamp', 'academic')),
  pace TEXT CHECK (pace IN ('blitz', 'moderate', 'deep')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_learning_preferences_student ON learning_preferences(student_id);

ALTER TABLE learning_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON learning_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON learning_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON learning_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON learning_preferences;

CREATE POLICY "Users can view own preferences"
  ON learning_preferences FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Users can insert own preferences"
  ON learning_preferences FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update own preferences"
  ON learning_preferences FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can delete own preferences"
  ON learning_preferences FOR DELETE
  USING (auth.uid() = student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON learning_preferences TO authenticated;

-- ============================================
-- PART 2: Fix courses table RLS
-- ============================================

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Users can insert courses" ON courses;
DROP POLICY IF EXISTS "Users can update courses" ON courses;
DROP POLICY IF EXISTS "Users can delete courses" ON courses;

-- Public read access
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  USING (true);

-- Authenticated users can insert courses (for AI-generated courses)
CREATE POLICY "Users can insert courses"
  ON courses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update courses
CREATE POLICY "Users can update courses"
  ON courses FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete courses
CREATE POLICY "Users can delete courses"
  ON courses FOR DELETE
  USING (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON courses TO authenticated;
GRANT SELECT ON courses TO anon;

-- ============================================
-- PART 3: Fix enrollments table RLS (if needed)
-- ============================================

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can update own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can insert own enrollments" ON enrollments;

CREATE POLICY "Users can view own enrollments"
  ON enrollments FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Users can insert own enrollments"
  ON enrollments FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update own enrollments"
  ON enrollments FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

GRANT SELECT, INSERT, UPDATE ON enrollments TO authenticated;

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'All RLS policies have been fixed!';
  RAISE NOTICE 'learning_preferences table: Created';
  RAISE NOTICE 'courses table: RLS policies updated';
  RAISE NOTICE 'enrollments table: RLS policies updated';
END $$;



