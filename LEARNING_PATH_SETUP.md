# Learning Path Setup Guide

## What's Been Implemented

### 1. LessonViewer Component (`frontend/src/pages/LessonViewer.tsx`)
- **Full-featured lesson viewer** that handles:
  - Video lessons with watch time tracking
  - Interactive quizzes with scoring
  - Progress tracking
  - XP rewards
  - Chapter completion

### 2. Saga Navigation (`frontend/src/components/dashboard/SagaMap.tsx`)
- **Updated click handler** to navigate to `/dashboard/lesson/:chapterId`
- Passes chapter details (type, topic, XP, time) as query params

### 3. Progress Tracking (`frontend/src/services/sagaService.ts`)
- **updateSagaFromActivity** - Updates progress as you learn
- **completeSagaChapter** - Marks chapters complete and unlocks next
- Handles both personalized and default chapters

### 4. Database Functions
- **complete_saga_chapter** - Needs to be updated to handle personalized chapters
- Run `backend/db/fix_complete_saga_chapter.sql` in Supabase

## Setup Steps

### Step 1: Run Database Migration
Run this SQL in Supabase SQL Editor:
```sql
-- File: backend/db/fix_complete_saga_chapter.sql
```

This updates the `complete_saga_chapter` function to handle both default and personalized chapters.

### Step 2: Test the Flow
1. Click on "The Awakening" (Chapter 1) in your dashboard
2. You should be taken to the LessonViewer
3. Content will be generated based on the chapter type
4. Complete the lesson/quiz
5. XP will be awarded
6. Next chapter will unlock automatically

## Features

### ✅ Clickable Chapters
- Active and completed chapters are clickable
- Locked chapters show a tooltip

### ✅ Content Generation
- Videos: AI-generated explanations
- Quizzes: Interactive questions with scoring
- Boss Fights: Challenging content

### ✅ Progress Tracking
- Watch time tracked for videos
- Quiz scores tracked
- Progress saved to database

### ✅ XP System
- XP awarded on completion
- Student XP updated in database
- Displayed in dashboard header

### ✅ Chapter Unlocking
- Next chapter automatically unlocked on completion
- Status updated: completed → active → locked

## How It Works

1. **Click Chapter** → Navigate to `/dashboard/lesson/:chapterId?type=video&topic=...&xp=500&time=30`
2. **Load Content** → Fetch chapter details, generate lesson/quiz content
3. **Track Progress** → Watch time, quiz answers, etc.
4. **Complete** → Update saga_progress, award XP, unlock next chapter
5. **Return to Dashboard** → See updated progress and unlocked chapters

## Troubleshooting

### Chapters Still Locked?
- Check if `saga_progress` entries exist
- Verify `initialize_personalized_saga_progress` was called
- Check RLS policies allow updates

### No Content Loading?
- Check backend API is running
- Verify Gemini API key is set
- Check browser console for errors

### XP Not Updating?
- Check `complete_saga_chapter` function ran successfully
- Verify student XP update query
- Check RLS policies on students table



