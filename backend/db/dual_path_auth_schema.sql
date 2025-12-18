-- ============================================
-- Dual-Path Authentication & Onboarding Schema
-- Supports Organizational (Student) and Personal (Learner) tracks
-- ============================================

-- ============================================
-- STEP 1: DROP EXISTING OBJECTS
-- ============================================

DROP TABLE IF EXISTS learning_preferences CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ============================================
-- STEP 2: CREATE ORGANIZATIONS TABLE FIRST
-- ============================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_code TEXT NOT NULL UNIQUE,
  mentor_id UUID REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 3: ALTER STUDENTS TABLE
-- ============================================

-- Add account type and organization fields
ALTER TABLE students 
DROP COLUMN IF EXISTS account_type,
DROP COLUMN IF EXISTS organization_id,
DROP COLUMN IF EXISTS class_code,
DROP COLUMN IF EXISTS learning_vibe,
DROP COLUMN IF EXISTS learning_goal,
DROP COLUMN IF EXISTS learning_pace;

ALTER TABLE students
ADD COLUMN account_type TEXT CHECK (account_type IN ('personal', 'organizational')) DEFAULT 'personal',
ADD COLUMN organization_id UUID REFERENCES organizations(id),
ADD COLUMN class_code TEXT,
ADD COLUMN learning_vibe TEXT CHECK (learning_vibe IN ('saga', 'bootcamp', 'academic')),
ADD COLUMN learning_goal TEXT,
ADD COLUMN learning_pace TEXT CHECK (learning_pace IN ('blitz', 'moderate', 'deep'));

-- ============================================
-- STEP 4: CREATE ORGANIZATION MEMBERS TABLE
-- (Now that organizations table exists)
-- ============================================

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, student_id)
);

-- ============================================
-- STEP 5: CREATE LEARNING PREFERENCES TABLE
-- ============================================

CREATE TABLE learning_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  goal TEXT,
  vibe TEXT CHECK (vibe IN ('saga', 'bootcamp', 'academic')),
  pace TEXT CHECK (pace IN ('blitz', 'moderate', 'deep')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 6: CREATE INDEXES
-- ============================================

CREATE INDEX idx_organizations_class_code ON organizations(class_code);
CREATE INDEX idx_organizations_mentor ON organizations(mentor_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_student ON organization_members(student_id);
CREATE INDEX idx_students_account_type ON students(account_type);
CREATE INDEX idx_students_org ON students(organization_id);

-- ============================================
-- STEP 7: ENABLE RLS
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 8: CREATE RLS POLICIES
-- ============================================

-- Organizations: Public read for class code verification, mentors can manage
CREATE POLICY "Anyone can view organizations"
  ON organizations FOR SELECT
  USING (true);

CREATE POLICY "Mentors can manage own organizations"
  ON organizations FOR ALL
  USING (auth.uid() = mentor_id);

-- Organization Members: Students can view their own memberships
CREATE POLICY "Students can view own memberships"
  ON organization_members FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own memberships"
  ON organization_members FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Learning Preferences: Students can manage their own
CREATE POLICY "Students can manage own preferences"
  ON learning_preferences FOR ALL
  USING (auth.uid() = student_id);

-- ============================================
-- STEP 9: CREATE FUNCTIONS
-- ============================================

-- Function to verify class code
CREATE OR REPLACE FUNCTION verify_class_code(code TEXT)
RETURNS TABLE(id UUID, name TEXT, mentor_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.name, o.mentor_id
  FROM organizations o
  WHERE o.class_code = code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join organization
CREATE OR REPLACE FUNCTION join_organization(student_uuid UUID, org_uuid UUID)
RETURNS void AS $$
BEGIN
  -- Update student account type
  UPDATE students
  SET account_type = 'organizational',
      organization_id = org_uuid
  WHERE id = student_uuid;
  
  -- Add to organization members
  INSERT INTO organization_members (organization_id, student_id)
  VALUES (org_uuid, student_uuid)
  ON CONFLICT (organization_id, student_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 10: INSERT MOCK ORGANIZATIONS (for testing)
-- ============================================

INSERT INTO organizations (name, class_code) VALUES
  ('Python Mastery Academy', 'PYTHON2024'),
  ('Data Science Bootcamp', 'DATA2024'),
  ('Web Dev Workshop', 'WEB2024')
ON CONFLICT (class_code) DO NOTHING;

-- ============================================
-- COMPLETE!
-- ============================================

