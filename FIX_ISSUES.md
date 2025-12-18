# Fix Guide for Current Issues

## Issue 1: 406 Errors on learning_preferences

**Problem**: The `learning_preferences` table might not exist or RLS policies are blocking access.

**Solution**: Run this SQL in your Supabase SQL Editor:

```sql
-- Run the contents of: backend/db/fix_learning_preferences_406.sql
```

Or run this directly:

```sql
-- Check if table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'learning_preferences') THEN
    CREATE TABLE learning_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
      goal TEXT,
      vibe TEXT CHECK (vibe IN ('saga', 'bootcamp', 'academic')),
      pace TEXT CHECK (pace IN ('blitz', 'moderate', 'deep')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_learning_preferences_student ON learning_preferences(student_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE learning_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own preferences" ON learning_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON learning_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON learning_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON learning_preferences;

-- Create RLS policies
CREATE POLICY "Users can view own preferences"
  ON learning_preferences FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Users can insert own preferences"
  ON learning_preferences FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update own preferences"
  ON learning_preferences FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can delete own preferences"
  ON learning_preferences FOR DELETE
  USING (auth.uid() = student_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON learning_preferences TO authenticated;
```

## Issue 2: Backend 500 Error on generate-course

**Problem**: Backend might not be running or API key not loaded.

**Solution**:

1. **Make sure backend is running**:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --port 8000
   ```

2. **Check your `.env` file** in the `backend` directory:
   ```
   GEMINI_API_KEY=your_new_api_key_here
   VITE_API_URL=http://localhost:8000
   ```

3. **Restart the backend** after updating the `.env` file.

## Issue 3: CORS Error on study-tool

**Problem**: Backend might not be running or CORS not configured.

**Solution**: 
- Make sure backend is running (see Issue 2)
- CORS is already configured in `backend/app/main.py` for `http://localhost:5173`

## Quick Fix Checklist

1. ✅ Run the SQL script above in Supabase SQL Editor
2. ✅ Check backend `.env` file has `GEMINI_API_KEY` set
3. ✅ Restart backend server: `cd backend && python -m uvicorn app.main:app --reload --port 8000`
4. ✅ Check backend logs for any errors
5. ✅ Refresh frontend and try again

## Verify Backend is Running

Open: http://localhost:8000/docs

You should see the FastAPI Swagger documentation. If not, the backend isn't running.



