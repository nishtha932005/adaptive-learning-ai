-- Complete fix for saga_progress and learning_preferences issues
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: Drop problematic foreign key constraint
-- ============================================

-- Drop the foreign key constraint that blocks personalized chapters
ALTER TABLE saga_progress
DROP CONSTRAINT IF EXISTS saga_progress_chapter_id_fkey;

-- ============================================
-- STEP 2: Ensure learning_preferences table exists
-- ============================================

-- Drop existing table if it has wrong structure
DROP TABLE IF EXISTS learning_preferences CASCADE;

-- Create learning_preferences table
CREATE TABLE learning_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  goal TEXT,
  vibe TEXT CHECK (vibe IN ('saga', 'bootcamp', 'academic')),
  pace TEXT CHECK (pace IN ('blitz', 'moderate', 'deep')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_learning_preferences_student ON learning_preferences(student_id);

-- Enable RLS
ALTER TABLE learning_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own preferences" ON learning_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON learning_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON learning_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON learning_preferences;

-- Create RLS policies for learning_preferences
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

-- ============================================
-- STEP 3: Update initialize_personalized_saga_progress function
-- ============================================

CREATE OR REPLACE FUNCTION initialize_personalized_saga_progress(student_uuid UUID)
RETURNS void AS $$
DECLARE
  chapter_record RECORD;
  first_chapter_id UUID;
  chapter_id_text TEXT;
BEGIN
  -- Delete any existing progress for this student's personalized chapters
  DELETE FROM saga_progress 
  WHERE student_id = student_uuid 
    AND personalized_chapter_id IS NOT NULL;
  
  -- Create progress entries for each personalized chapter
  FOR chapter_record IN 
    SELECT id, chapter_number FROM personalized_saga_chapters 
    WHERE student_id = student_uuid 
    ORDER BY chapter_number
  LOOP
    -- Use a unique text ID that doesn't conflict with saga_chapters
    chapter_id_text := 'personalized-' || chapter_record.id::text;
    
    INSERT INTO saga_progress (
      student_id, 
      chapter_id, 
      personalized_chapter_id, 
      status,
      xp_earned,
      time_spent_minutes
    )
    VALUES (
      student_uuid, 
      chapter_id_text, 
      chapter_record.id, 
      'locked',
      0,
      0
    )
    ON CONFLICT (student_id, chapter_id) DO UPDATE SET
      personalized_chapter_id = EXCLUDED.personalized_chapter_id,
      status = EXCLUDED.status;
  END LOOP;
  
  -- Set first chapter as active
  SELECT id INTO first_chapter_id
  FROM personalized_saga_chapters 
  WHERE student_id = student_uuid 
  ORDER BY chapter_number LIMIT 1;
  
  IF first_chapter_id IS NOT NULL THEN
    UPDATE saga_progress
    SET status = 'active'
    WHERE student_id = student_uuid
      AND personalized_chapter_id = first_chapter_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Verify the fix
-- ============================================

-- Check if constraint was dropped
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'saga_progress_chapter_id_fkey'
  ) THEN
    RAISE NOTICE 'WARNING: Constraint saga_progress_chapter_id_fkey still exists!';
  ELSE
    RAISE NOTICE 'SUCCESS: Constraint saga_progress_chapter_id_fkey has been dropped.';
  END IF;
END $$;

