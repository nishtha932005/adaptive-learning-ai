-- ============================================
-- Security & Authentication Layer
-- Adaptive Learning System - Supabase RLS Policies
-- ============================================

-- STEP 1: Enable Row Level Security on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop existing public policies (clean slate)
DROP POLICY IF EXISTS "Allow public read access to students" ON students;
DROP POLICY IF EXISTS "Allow public read access to courses" ON courses;
DROP POLICY IF EXISTS "Allow public read access to enrollments" ON enrollments;

-- STEP 3: Create secure RLS policies

-- Students Table: Users can only view/update their own profile
CREATE POLICY "Users can view own profile"
  ON students FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON students FOR UPDATE
  USING (auth.uid() = id);

-- Enrollments Table: Users can only view their own enrollments
CREATE POLICY "Users can view own enrollments"
  ON enrollments FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Users can update own enrollments"
  ON enrollments FOR UPDATE
  USING (auth.uid() = student_id);

-- Courses Table: Public read access (catalog is public)
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  USING (true);

-- ============================================
-- STEP 4: Auto-create student profile on signup
-- ============================================

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new row into students table with the auth user's ID
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
    onboarding_completed
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),  -- Use metadata or email prefix
    new.email,
    0,  -- Default risk score
    0,  -- Default XP
    0,  -- Default streak
    0,  -- Default hours
    0,  -- Default modules
    'personal',  -- Default account type
    FALSE  -- Onboarding not completed yet
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: Grant necessary permissions
-- ============================================

-- Allow authenticated users to insert their own student record
CREATE POLICY "Users can insert own profile"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- Verification: Test the policies
-- ============================================
-- After running this script, sign up a new user via the frontend
-- Then run this query to verify the student record was auto-created:
-- 
-- SELECT s.*, u.email 
-- FROM students s
-- JOIN auth.users u ON u.id = s.id
-- WHERE u.email = 'your-test-email@example.com';

