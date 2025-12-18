-- ============================================
-- ORGANIZATIONAL TRACK SCHEMA (FIXED)
-- ============================================

-- Drop tables if they exist to ensure clean state (CASCADE will handle dependencies)
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 1. Add Role to Students (Idempotent)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='role') THEN
        ALTER TABLE students ADD COLUMN role TEXT DEFAULT 'student' CHECK (role IN ('student', 'mentor'));
    END IF;
END $$;

-- 2. Organizations Table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- For students to join (e.g., "CLASS-2024")
  mentor_id UUID NOT NULL REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Organization Members (Link Students to Org)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, student_id)
);

-- 4. Assignments Table (Courses assigned to students)
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes
CREATE INDEX idx_org_members_student ON organization_members(student_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_assignments_student ON assignments(student_id);
CREATE INDEX idx_assignments_course ON assignments(course_id);

-- 6. RLS Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Organizations: Mentors can iterate, Students can view joined
CREATE POLICY "Mentors can manage their organizations"
  ON organizations
  USING (auth.uid() = mentor_id);

CREATE POLICY "Students can view organizations they are memebers of"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = organizations.id 
      AND student_id = auth.uid()
    )
  );

-- Members: Public read (or restricted to org scope)
CREATE POLICY "View organization members"
  ON organization_members FOR SELECT
  USING (
    student_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE id = organization_id 
      AND mentor_id = auth.uid()
    )
  );

CREATE POLICY "Students can join organizations"
  ON organization_members FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Assignments: Mentors manage, Students view own
CREATE POLICY "Mentors manage assignments"
  ON assignments
  USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE id = organization_id 
      AND mentor_id = auth.uid()
    )
  );

CREATE POLICY "Students view own assignments"
  ON assignments FOR SELECT
  USING (student_id = auth.uid());
