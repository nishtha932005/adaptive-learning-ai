# Onboarding & Personalized Saga Journey Setup

## Overview
This system creates a personalized, AI-powered Python programming learning journey for each student after they verify their email and complete onboarding.

## Database Setup

### 1. Run the onboarding schema SQL
```sql
-- Run this in Supabase SQL Editor
\i backend/db/onboarding_schema.sql
```

This adds:
- `onboarding_completed` field to `students` table
- `python_skill_level`, `learning_goals`, `preferred_pace`, `interests` fields
- `personalized_saga_chapters` table for student-specific chapters
- `personalized_chapter_id` field to `saga_progress` table
- Function `initialize_personalized_saga_progress()` to set up progress tracking

### 2. Update students table trigger
The `handle_new_user()` function in `security_policies.sql` should set `onboarding_completed = FALSE` by default.

## Backend Setup

### 1. Install dependencies (if needed)
The personalization service uses the existing Gemini service.

### 2. Environment Variables
Ensure `GEMINI_API_KEY` is set in your `.env` file.

### 3. API Endpoint
The endpoint `/api/ai/personalize-saga` is now available:
- **Method**: POST
- **Request Body**:
  ```json
  {
    "python_skill_level": "beginner" | "intermediate" | "advanced",
    "learning_goals": ["web_dev", "data_science", ...],
    "preferred_pace": "slow" | "moderate" | "fast",
    "interests": ["algorithms", "apis", ...],
    "learning_style": "visual" | "text" | "interactive"
  }
  ```
- **Response**: List of personalized saga chapters

## Frontend Flow

### 1. Sign Up → Email Verification
- User signs up via `/signup`
- Receives email verification link
- Clicks link → email verified

### 2. Onboarding Form (`/onboarding`)
After email verification, `ProtectedRoute` redirects to `/onboarding` if `onboarding_completed = false`.

**Steps:**
1. **Step 1**: Select Python skill level (beginner/intermediate/advanced)
2. **Step 2**: Select learning goals (web dev, data science, automation, etc.)
3. **Step 3**: Choose preferred pace (slow/moderate/fast) and learning style
4. **Step 4**: Review and confirm

**On Submit:**
1. Saves preferences to `students` table
2. Calls `/api/ai/personalize-saga` to generate personalized chapters
3. Saves chapters to `personalized_saga_chapters` table
4. Initializes progress via `initialize_personalized_saga_progress()`
5. Sets `onboarding_completed = true`
6. Redirects to `/dashboard`

### 3. Dashboard Journey
- `SagaMap` component loads personalized chapters via `getSagaProgress()`
- Chapters are clickable and navigate to courses/quizzes/study room
- Progress is tracked in `saga_progress` table

## How It Works

### AI Personalization
The `PersonalizationService` uses Gemini AI to:
1. Analyze student preferences (skill level, goals, pace, interests)
2. Generate 5-7 personalized Python programming chapters
3. Each chapter includes:
   - Epic, gamified title
   - Specific Python topic
   - XP reward (based on difficulty)
   - Estimated time (based on pace)
   - Type (video/quiz/boss_fight)
   - Action links (course/quiz/study)

### Fallback
If AI generation fails, falls back to default Python journeys:
- **Beginner**: 5 chapters covering basics → OOP
- **Intermediate**: 4 chapters covering advanced topics → async
- **Advanced**: 2 chapters covering design patterns → production APIs

## Testing

### Test Onboarding Flow
1. Create a new account
2. Verify email
3. Should redirect to `/onboarding`
4. Complete the 4-step form
5. Should see "AI is crafting your personalized Python journey..."
6. Redirects to dashboard
7. Check `personalized_saga_chapters` table for your chapters
8. Check `saga_progress` table - first chapter should be "active"

### Test Personalized Journey
1. Go to Dashboard
2. "Your Journey" section should show personalized chapters
3. Click on active chapter → should navigate to appropriate page
4. Complete chapter → next chapter unlocks

## Next Steps (Mentor Assignment)

To add mentor assignment functionality:
1. Create mentor assignment form component
2. Add mentor-student relationship table
3. Allow mentors to assign courses/chapters to students
4. Update saga generation to consider mentor assignments

## Files Modified/Created

### Backend
- `backend/app/services/personalization.py` - AI personalization service
- `backend/app/models.py` - Added PersonalizeSagaRequest/Response models
- `backend/app/main.py` - Added `/api/ai/personalize-saga` endpoint
- `backend/db/onboarding_schema.sql` - Database schema for onboarding

### Frontend
- `frontend/src/pages/Onboarding.tsx` - Complete onboarding form
- `frontend/src/components/ProtectedRoute.tsx` - Checks onboarding completion
- `frontend/src/services/sagaService.ts` - Updated to use personalized chapters
- `frontend/src/context/AuthContext.tsx` - Minor update for email verification

## Notes

- The system focuses on **Python programming** as requested
- All chapters are personalized based on student preferences
- AI generates unique journeys, but falls back to defaults if needed
- Progress tracking works with both personalized and default chapters
- Onboarding is required before accessing dashboard



