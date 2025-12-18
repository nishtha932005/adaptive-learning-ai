-- Migration: Fix saga_progress foreign key constraint to support personalized chapters
-- Run this in your Supabase SQL editor

-- Step 1: Drop the existing foreign key constraint if it exists
ALTER TABLE saga_progress
DROP CONSTRAINT IF EXISTS saga_progress_chapter_id_fkey;

-- Step 2: Update the initialize_personalized_saga_progress function
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



