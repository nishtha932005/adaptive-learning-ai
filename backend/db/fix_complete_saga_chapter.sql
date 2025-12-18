-- Fix complete_saga_chapter function to handle both default and personalized chapters
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION complete_saga_chapter(
  student_uuid UUID,
  chapter_id_param TEXT,
  xp_earned_param INTEGER DEFAULT 0,
  time_spent_param INTEGER DEFAULT 0
)
RETURNS void AS $$
DECLARE
  next_chapter_id TEXT;
  next_personalized_chapter_id UUID;
  is_personalized BOOLEAN;
  current_chapter_number INTEGER;
BEGIN
  -- Check if this is a personalized chapter
  SELECT EXISTS (
    SELECT 1 FROM personalized_saga_chapters 
    WHERE id::text = chapter_id_param 
    AND student_id = student_uuid
  ) INTO is_personalized;

  IF is_personalized THEN
    -- Handle personalized chapter completion
    UPDATE saga_progress
    SET 
      status = 'completed',
      completed_at = NOW(),
      xp_earned = xp_earned_param,
      time_spent_minutes = time_spent_param,
      updated_at = NOW()
    WHERE student_id = student_uuid
      AND personalized_chapter_id::text = chapter_id_param;

    -- Get current chapter number
    SELECT chapter_number INTO current_chapter_number
    FROM personalized_saga_chapters
    WHERE id::text = chapter_id_param
    AND student_id = student_uuid;

    -- Find next personalized chapter
    SELECT id INTO next_personalized_chapter_id
    FROM personalized_saga_chapters
    WHERE student_id = student_uuid
      AND chapter_number = current_chapter_number + 1
    LIMIT 1;

    -- Activate next chapter if exists
    IF next_personalized_chapter_id IS NOT NULL THEN
      UPDATE saga_progress
      SET status = 'active', updated_at = NOW()
      WHERE student_id = student_uuid
        AND personalized_chapter_id = next_personalized_chapter_id;
    END IF;
  ELSE
    -- Handle default chapter completion
    UPDATE saga_progress
    SET 
      status = 'completed',
      completed_at = NOW(),
      xp_earned = xp_earned_param,
      time_spent_minutes = time_spent_param,
      updated_at = NOW()
    WHERE student_id = student_uuid
      AND chapter_id = chapter_id_param;

    -- Get current chapter number
    SELECT chapter_number INTO current_chapter_number
    FROM saga_chapters
    WHERE id = chapter_id_param;

    -- Find next default chapter
    SELECT id INTO next_chapter_id
    FROM saga_chapters
    WHERE chapter_number = current_chapter_number + 1
    LIMIT 1;

    -- Activate next chapter if exists
    IF next_chapter_id IS NOT NULL THEN
      UPDATE saga_progress
      SET status = 'active', updated_at = NOW()
      WHERE student_id = student_uuid
        AND chapter_id = next_chapter_id;
    END IF;
  END IF;

  -- Update student XP
  UPDATE students
  SET xp_points = xp_points + xp_earned_param
  WHERE id = student_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



