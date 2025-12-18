-- Fix 406 errors on learning_preferences table
-- Run this in your Supabase SQL Editor

-- Step 1: Check if table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'learning_preferences') THEN
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
    
    RAISE NOTICE 'Created learning_preferences table';
  ELSE
    RAISE NOTICE 'learning_preferences table already exists';
  END IF;
END $$;

-- Step 2: Enable RLS
ALTER TABLE learning_preferences ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own preferences" ON learning_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON learning_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON learning_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON learning_preferences;

-- Step 4: Create RLS policies
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

-- Step 5: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON learning_preferences TO authenticated;
GRANT USAGE ON SEQUENCE learning_preferences_id_seq TO authenticated;

RAISE NOTICE 'Fixed learning_preferences table and RLS policies';



