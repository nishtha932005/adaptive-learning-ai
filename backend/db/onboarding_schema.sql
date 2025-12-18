-- ============================================
-- Onboarding Schema
-- Adds onboarding fields and personalized saga support
-- ============================================

-- Add onboarding fields to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS python_skill_level TEXT CHECK (python_skill_level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS learning_goals TEXT[], -- Array of goals like ['web_dev', 'data_science', 'automation']
ADD COLUMN IF NOT EXISTS preferred_pace TEXT CHECK (preferred_pace IN ('slow', 'moderate', 'fast')),
ADD COLUMN IF NOT EXISTS interests TEXT[], -- Array of interests
ADD COLUMN IF NOT EXISTS personalized_saga_created BOOLEAN DEFAULT FALSE;

-- Drop table if it exists with wrong schema (to fix course_id type)
DROP TABLE IF EXISTS personalized_saga_chapters CASCADE;

-- Table for personalized saga chapters (student-specific)
CREATE TABLE personalized_saga_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 500,
  estimated_time_minutes INTEGER NOT NULL DEFAULT 30,
  type TEXT NOT NULL CHECK (type IN ('video', 'quiz', 'boss_fight')),
  course_id UUID REFERENCES courses(id),
  action_url TEXT,
  action_type TEXT CHECK (action_type IN ('course', 'quiz', 'study', 'competition', 'notes', 'dashboard')),
  action_params JSONB,
  prerequisite_chapter_id UUID REFERENCES personalized_saga_chapters(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, chapter_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_personalized_saga_student ON personalized_saga_chapters(student_id);
CREATE INDEX IF NOT EXISTS idx_personalized_saga_number ON personalized_saga_chapters(student_id, chapter_number);

-- RLS Policies
ALTER TABLE personalized_saga_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own personalized saga"
  ON personalized_saga_chapters FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own personalized saga"
  ON personalized_saga_chapters FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Update saga_progress to support personalized chapters
ALTER TABLE saga_progress
ADD COLUMN IF NOT EXISTS personalized_chapter_id UUID REFERENCES personalized_saga_chapters(id);

-- Function to create personalized saga progress
CREATE OR REPLACE FUNCTION initialize_personalized_saga_progress(student_uuid UUID)
RETURNS void AS $$
DECLARE
  chapter_record RECORD;
  first_chapter_id UUID;
BEGIN
  -- Insert locked status for all personalized chapters
  FOR chapter_record IN 
    SELECT id, chapter_number FROM personalized_saga_chapters 
    WHERE student_id = student_uuid 
    ORDER BY chapter_number
  LOOP
    INSERT INTO saga_progress (student_id, chapter_id, personalized_chapter_id, status)
    VALUES (student_uuid, 'personalized-' || chapter_record.id::text, chapter_record.id, 'locked')
    ON CONFLICT (student_id, chapter_id) DO UPDATE SET
      personalized_chapter_id = EXCLUDED.personalized_chapter_id;
  END LOOP;
  
  -- Get first chapter ID
  SELECT id INTO first_chapter_id
  FROM personalized_saga_chapters 
  WHERE student_id = student_uuid 
  ORDER BY chapter_number LIMIT 1;
  
  -- Unlock the first chapter
  IF first_chapter_id IS NOT NULL THEN
    UPDATE saga_progress
    SET status = 'active'
    WHERE student_id = student_uuid
      AND personalized_chapter_id = first_chapter_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

