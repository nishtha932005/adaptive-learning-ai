-- ============================================
-- COMPLETE DATABASE SCHEMA
-- Adaptive Learning System - Complete Setup
-- Run this script to set up everything from scratch
-- ============================================

-- ============================================
-- STEP 1: DROP EXISTING OBJECTS
-- ============================================

-- Drop functions first (they depend on tables)
DROP FUNCTION IF EXISTS initialize_personalized_saga_progress(UUID) CASCADE;
DROP FUNCTION IF EXISTS initialize_saga_progress(UUID) CASCADE;
DROP FUNCTION IF EXISTS complete_saga_chapter(UUID, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop policies
DROP POLICY IF EXISTS "Students can view own personalized saga" ON personalized_saga_chapters;
DROP POLICY IF EXISTS "Students can insert own personalized saga" ON personalized_saga_chapters;
DROP POLICY IF EXISTS "Anyone can view saga chapters" ON saga_chapters;
DROP POLICY IF EXISTS "Students can view own saga progress" ON saga_progress;
DROP POLICY IF EXISTS "Students can update own saga progress" ON saga_progress;
DROP POLICY IF EXISTS "Students can insert own saga progress" ON saga_progress;
DROP POLICY IF EXISTS "Users can view own profile" ON students;
DROP POLICY IF EXISTS "Users can update own profile" ON students;
DROP POLICY IF EXISTS "Users can insert own profile" ON students;
DROP POLICY IF EXISTS "Users can view own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can update own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Allow public read access to students" ON students;
DROP POLICY IF EXISTS "Allow public read access to courses" ON courses;
DROP POLICY IF EXISTS "Allow public read access to enrollments" ON enrollments;

-- Drop tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS personalized_saga_chapters CASCADE;
DROP TABLE IF EXISTS saga_progress CASCADE;
DROP TABLE IF EXISTS saga_chapters CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_personalized_saga_student;
DROP INDEX IF EXISTS idx_personalized_saga_number;
DROP INDEX IF EXISTS idx_saga_progress_student;
DROP INDEX IF EXISTS idx_saga_progress_chapter;
DROP INDEX IF EXISTS idx_saga_progress_status;
DROP INDEX IF EXISTS idx_saga_chapters_number;

-- ============================================
-- STEP 2: ALTER STUDENTS TABLE
-- ============================================

-- Add onboarding fields to students table (drop columns first if they exist)
ALTER TABLE students 
DROP COLUMN IF EXISTS onboarding_completed,
DROP COLUMN IF EXISTS python_skill_level,
DROP COLUMN IF EXISTS learning_goals,
DROP COLUMN IF EXISTS preferred_pace,
DROP COLUMN IF EXISTS interests,
DROP COLUMN IF EXISTS personalized_saga_created,
DROP COLUMN IF EXISTS learning_style,
DROP COLUMN IF EXISTS technical_level;

-- Add columns fresh
ALTER TABLE students 
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN python_skill_level TEXT CHECK (python_skill_level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN learning_goals TEXT[],
ADD COLUMN preferred_pace TEXT CHECK (preferred_pace IN ('slow', 'moderate', 'fast')),
ADD COLUMN interests TEXT[],
ADD COLUMN personalized_saga_created BOOLEAN DEFAULT FALSE,
ADD COLUMN learning_style TEXT CHECK (learning_style IN ('visual', 'text', 'interactive')),
ADD COLUMN technical_level TEXT CHECK (technical_level IN ('beginner', 'intermediate', 'advanced'));

-- ============================================
-- STEP 3: CREATE SAGA TABLES
-- ============================================

-- Table: saga_chapters (default saga structure)
CREATE TABLE saga_chapters (
  id TEXT PRIMARY KEY,
  chapter_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 500,
  estimated_time_minutes INTEGER NOT NULL DEFAULT 30,
  type TEXT NOT NULL CHECK (type IN ('video', 'quiz', 'boss_fight')),
  prerequisite_chapter_id TEXT REFERENCES saga_chapters(id),
  course_id UUID REFERENCES courses(id),
  action_url TEXT,
  action_type TEXT CHECK (action_type IN ('course', 'quiz', 'study', 'competition', 'notes', 'dashboard')),
  action_params JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: personalized_saga_chapters (student-specific)
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

-- Table: saga_progress (tracks student progress)
CREATE TABLE saga_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  personalized_chapter_id UUID REFERENCES personalized_saga_chapters(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('completed', 'active', 'locked')),
  completed_at TIMESTAMPTZ,
  xp_earned INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, chapter_id)
);

-- Note: We don't add a foreign key constraint on chapter_id because:
-- 1. Default chapters use TEXT IDs from saga_chapters (e.g., "chapter-1")
-- 2. Personalized chapters use TEXT IDs like "personalized-{uuid}"
-- 3. The personalized_chapter_id field handles the FK for personalized chapters
-- Referential integrity is maintained through application logic and the personalized_chapter_id FK

-- ============================================
-- STEP 4: CREATE INDEXES
-- ============================================

CREATE INDEX idx_saga_chapters_number ON saga_chapters(chapter_number);
CREATE INDEX idx_saga_progress_student ON saga_progress(student_id);
CREATE INDEX idx_saga_progress_chapter ON saga_progress(chapter_id);
CREATE INDEX idx_saga_progress_status ON saga_progress(student_id, status);
CREATE INDEX idx_personalized_saga_student ON personalized_saga_chapters(student_id);
CREATE INDEX idx_personalized_saga_number ON personalized_saga_chapters(student_id, chapter_number);

-- ============================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE saga_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE saga_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalized_saga_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: CREATE RLS POLICIES
-- ============================================

-- Saga Chapters: Public read access
CREATE POLICY "Anyone can view saga chapters"
  ON saga_chapters FOR SELECT
  USING (true);

-- Personalized Saga Chapters: Students can only view their own
CREATE POLICY "Students can view own personalized saga"
  ON personalized_saga_chapters FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own personalized saga"
  ON personalized_saga_chapters FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own personalized saga"
  ON personalized_saga_chapters FOR UPDATE
  USING (auth.uid() = student_id);

-- Saga Progress: Students can only view/update their own
CREATE POLICY "Students can view own saga progress"
  ON saga_progress FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can update own saga progress"
  ON saga_progress FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own saga progress"
  ON saga_progress FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students: Users can only view/update their own profile
CREATE POLICY "Users can view own profile"
  ON students FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON students FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Enrollments: Users can only view/update their own
CREATE POLICY "Users can view own enrollments"
  ON enrollments FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Users can update own enrollments"
  ON enrollments FOR UPDATE
  USING (auth.uid() = student_id);

-- Courses: Public read access
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  USING (true);

-- ============================================
-- STEP 7: CREATE FUNCTIONS
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.students (
    id, 
    full_name, 
    email, 
    risk_score, 
    xp_points, 
    study_streak_days, 
    hours_studied, 
    modules_finished,
    account_type,
    onboarding_completed,
    personalized_saga_created
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    0,
    0,
    0,
    0,
    0,
    'personal',
    FALSE,
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize default saga progress
CREATE OR REPLACE FUNCTION initialize_saga_progress(student_uuid UUID)
RETURNS void AS $$
DECLARE
  chapter_record RECORD;
BEGIN
  FOR chapter_record IN SELECT id FROM saga_chapters ORDER BY chapter_number
  LOOP
    INSERT INTO saga_progress (student_id, chapter_id, status)
    VALUES (student_uuid, chapter_record.id, 'locked')
    ON CONFLICT (student_id, chapter_id) DO NOTHING;
  END LOOP;
  
  UPDATE saga_progress
  SET status = 'active'
  WHERE student_id = student_uuid
    AND chapter_id = (SELECT id FROM saga_chapters ORDER BY chapter_number LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize personalized saga progress
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

-- Function to complete a saga chapter
CREATE OR REPLACE FUNCTION complete_saga_chapter(
  student_uuid UUID,
  chapter_id_param TEXT,
  xp_earned_param INTEGER DEFAULT 0,
  time_spent_param INTEGER DEFAULT 0
)
RETURNS void AS $$
DECLARE
  next_chapter_id TEXT;
BEGIN
  UPDATE saga_progress
  SET 
    status = 'completed',
    completed_at = NOW(),
    xp_earned = xp_earned_param,
    time_spent_minutes = time_spent_param,
    updated_at = NOW()
  WHERE student_id = student_uuid
    AND chapter_id = chapter_id_param;

  UPDATE students
  SET xp_points = xp_points + xp_earned_param
  WHERE id = student_uuid;

  SELECT sc.id INTO next_chapter_id
  FROM saga_chapters sc
  WHERE sc.chapter_number = (
    SELECT chapter_number + 1
    FROM saga_chapters
    WHERE id = chapter_id_param
  )
  LIMIT 1;

  IF next_chapter_id IS NOT NULL THEN
    UPDATE saga_progress
    SET status = 'active', updated_at = NOW()
    WHERE student_id = student_uuid
      AND chapter_id = next_chapter_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 8: CREATE TRIGGER
-- ============================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 9: INSERT DEFAULT DATA
-- ============================================

-- Insert default saga chapters
INSERT INTO saga_chapters (
  id, 
  chapter_number, 
  title, 
  subtitle, 
  xp_reward, 
  estimated_time_minutes, 
  type, 
  action_type, 
  action_url, 
  action_params
) VALUES
  ('chapter-1', 1, 'The Awakening', 'Python Basics Refresher', 500, 30, 'video', 'course', '/dashboard/courses', '{"highlight": "python-basics"}'::jsonb),
  ('chapter-2', 2, 'The First Trial', 'Data Structures Logic', 750, 45, 'quiz', 'quiz', '/dashboard/study', '{"mode": "quiz", "topic": "Data Structures", "difficulty": "standard"}'::jsonb),
  ('chapter-3', 3, 'The Neural Link', 'Introduction to Deep Learning', 1000, 60, 'video', 'course', '/dashboard/courses', '{"highlight": "deep-learning"}'::jsonb),
  ('chapter-4', 4, 'The Void', 'Backpropagation Maths', 1250, 75, 'boss_fight', 'study', '/dashboard/study', '{"mode": "explain", "topic": "Backpropagation", "difficulty": 80}'::jsonb),
  ('chapter-5', 5, 'Ascension', 'Building a Transformer from Scratch', 1500, 90, 'boss_fight', 'study', '/dashboard/study', '{"mode": "visualize", "topic": "Transformer Architecture", "diagram_type": "Flowchart"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  action_type = EXCLUDED.action_type,
  action_url = EXCLUDED.action_url,
  action_params = EXCLUDED.action_params;

-- Set prerequisites
UPDATE saga_chapters SET prerequisite_chapter_id = 'chapter-1' WHERE id = 'chapter-2';
UPDATE saga_chapters SET prerequisite_chapter_id = 'chapter-2' WHERE id = 'chapter-3';
UPDATE saga_chapters SET prerequisite_chapter_id = 'chapter-3' WHERE id = 'chapter-4';
UPDATE saga_chapters SET prerequisite_chapter_id = 'chapter-4' WHERE id = 'chapter-5';

-- ============================================
-- COMPLETE!
-- ============================================
-- Schema setup complete. All tables, functions, policies, and triggers are created.
-- Default saga chapters are inserted.
-- New users will automatically get a student profile created.
-- ============================================

