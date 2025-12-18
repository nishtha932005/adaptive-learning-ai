-- Refined Fix: Create/Update increment_student_xp function
-- This handles incremental XP rewards for student activities

-- Drop first to ensure type consistency if it already exists partially
DROP FUNCTION IF EXISTS public.increment_student_xp(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.increment_student_xp(student_uuid UUID, xp_amount INTEGER)
RETURNS void AS $$
BEGIN
  -- We use atomic update to students table
  -- COALESCE ensures we don't try to add to a NULL value
  UPDATE public.students
  SET xp_points = COALESCE(xp_points, 0) + xp_amount
  WHERE id = student_uuid;
  
  -- If you have a separate xp_history table, you could log it here too
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions explicitly
GRANT EXECUTE ON FUNCTION public.increment_student_xp(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_student_xp(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_student_xp(UUID, INTEGER) TO service_role;

-- Force a comment update (sometimes helps reset internal cache in some PG extensions)
COMMENT ON FUNCTION public.increment_student_xp IS 'Atomically increments a student''s XP points. Parameters: student_uuid (UUID), xp_amount (INTEGER).';
