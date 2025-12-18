-- ============================================
-- Fix course_id type mismatch
-- Run this if you get the foreign key constraint error
-- ============================================

-- Drop the foreign key constraint if it exists (with wrong type)
ALTER TABLE personalized_saga_chapters 
DROP CONSTRAINT IF EXISTS personalized_saga_chapters_course_id_fkey;

-- Alter the column type if table exists
DO $$
BEGIN
  -- Check if column exists and is TEXT, then alter it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personalized_saga_chapters' 
    AND column_name = 'course_id' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE personalized_saga_chapters 
    ALTER COLUMN course_id TYPE UUID USING NULL;
  END IF;
END $$;

-- Re-add the foreign key constraint with correct type
ALTER TABLE personalized_saga_chapters 
ADD CONSTRAINT personalized_saga_chapters_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES courses(id);

-- Also fix saga_chapters if needed
ALTER TABLE saga_chapters 
DROP CONSTRAINT IF EXISTS saga_chapters_course_id_fkey;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'saga_chapters' 
    AND column_name = 'course_id' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE saga_chapters 
    ALTER COLUMN course_id TYPE UUID USING NULL;
  END IF;
END $$;

ALTER TABLE saga_chapters 
ADD CONSTRAINT saga_chapters_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES courses(id);



