    -- ============================================
    -- Saga System Schema
    -- Dynamic RPG-style learning roadmap
    -- ============================================

    -- Table: saga_chapters (defines the saga structure)
    CREATE TABLE IF NOT EXISTS saga_chapters (
    id TEXT PRIMARY KEY,
    chapter_number INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 500,
    estimated_time_minutes INTEGER NOT NULL DEFAULT 30,
  type TEXT NOT NULL CHECK (type IN ('video', 'quiz', 'boss_fight')),
  prerequisite_chapter_id TEXT REFERENCES saga_chapters(id),
  -- Links to actual resources
  course_id UUID REFERENCES courses(id),
  action_url TEXT, -- For custom navigation (e.g., /dashboard/study?mode=quiz&topic=...)
    action_type TEXT CHECK (action_type IN ('course', 'quiz', 'study', 'competition', 'notes', 'dashboard')),
    action_params JSONB, -- Store additional params like quiz topic, difficulty, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Table: saga_progress (tracks student progress through saga)
    CREATE TABLE IF NOT EXISTS saga_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    chapter_id TEXT NOT NULL REFERENCES saga_chapters(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('completed', 'active', 'locked')),
    completed_at TIMESTAMPTZ,
    xp_earned INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, chapter_id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_saga_progress_student ON saga_progress(student_id);
    CREATE INDEX IF NOT EXISTS idx_saga_progress_chapter ON saga_progress(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_saga_progress_status ON saga_progress(student_id, status);
    CREATE INDEX IF NOT EXISTS idx_saga_chapters_number ON saga_chapters(chapter_number);

    -- Enable RLS
    ALTER TABLE saga_chapters ENABLE ROW LEVEL SECURITY;
    ALTER TABLE saga_progress ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    -- Everyone can read saga chapters (public catalog)
    CREATE POLICY "Anyone can view saga chapters"
    ON saga_chapters FOR SELECT
    USING (true);

    -- Students can only view their own progress
    CREATE POLICY "Students can view own saga progress"
    ON saga_progress FOR SELECT
    USING (auth.uid() = student_id);

    -- Students can update their own progress
    CREATE POLICY "Students can update own saga progress"
    ON saga_progress FOR UPDATE
    USING (auth.uid() = student_id);

    -- Students can insert their own progress
    CREATE POLICY "Students can insert own saga progress"
    ON saga_progress FOR INSERT
    WITH CHECK (auth.uid() = student_id);

    -- Function to initialize saga progress for a new student
    CREATE OR REPLACE FUNCTION initialize_saga_progress(student_uuid UUID)
    RETURNS void AS $$
    DECLARE
    chapter_record RECORD;
    BEGIN
    -- Insert locked status for all chapters
    FOR chapter_record IN SELECT id FROM saga_chapters ORDER BY chapter_number
    LOOP
        INSERT INTO saga_progress (student_id, chapter_id, status)
        VALUES (student_uuid, chapter_record.id, 'locked')
        ON CONFLICT (student_id, chapter_id) DO NOTHING;
    END LOOP;
    
    -- Unlock the first chapter
    UPDATE saga_progress
    SET status = 'active'
    WHERE student_id = student_uuid
        AND chapter_id = (SELECT id FROM saga_chapters ORDER BY chapter_number LIMIT 1);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Function to update saga progress when a chapter is completed
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
    -- Mark current chapter as completed
    UPDATE saga_progress
    SET 
        status = 'completed',
        completed_at = NOW(),
        xp_earned = xp_earned_param,
        time_spent_minutes = time_spent_param,
        updated_at = NOW()
    WHERE student_id = student_uuid
        AND chapter_id = chapter_id_param;

    -- Update student XP
    UPDATE students
    SET xp_points = xp_points + xp_earned_param
    WHERE id = student_uuid;

    -- Unlock next chapter
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

    -- Insert default saga chapters with action links
    INSERT INTO saga_chapters (id, chapter_number, title, subtitle, xp_reward, estimated_time_minutes, type, action_type, action_url, action_params) VALUES
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

