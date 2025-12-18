# Dual-Path Authentication & Onboarding System

## Overview
This system splits users into two distinct tracks:
1. **Organizational (Student)**: Joins via Class Code, restricted permissions
2. **Personal (Learner)**: Standard email signup, full AI permissions, personalized UI

## Database Setup

### Run the SQL Schema
```sql
-- Execute in Supabase SQL Editor
\i backend/db/dual_path_auth_schema.sql
```

This creates:
- `organizations` table with class codes
- `organization_members` table for student-org relationships
- `learning_preferences` table for personal account preferences
- Updates `students` table with `account_type`, `learning_vibe`, `learning_pace`, etc.
- Functions: `verify_class_code()`, `join_organization()`

### Mock Organizations (for testing)
The schema includes these test class codes:
- `PYTHON2024` - Python Mastery Academy
- `DATA2024` - Data Science Bootcamp
- `WEB2024` - Web Dev Workshop

## Frontend Components

### 1. Split Signup Page (`frontend/src/pages/Signup.tsx`)
**Features:**
- Two-card layout: Independent Learner vs Join Classroom
- Class code verification before organizational signup
- Personal path opens PersonalWizard modal
- Organizational path collects email/password after code verification

### 2. Personal Onboarding Wizard (`frontend/src/components/onboarding/PersonalWizard.tsx`)
**3-Step Flow:**
1. **The Goal**: What are you building? (text input)
2. **The Vibe**: Choose learning style
   - 🎮 **The Saga**: Gamified RPG map
   - ⚡ **The Bootcamp**: Fast-paced checklist
   - 📚 **The Academic**: Theory-heavy cards
3. **The Pace**: Time commitment
   - Blitz: 15-30 min/day (summaries only)
   - Moderate: 1-2 hours/day (balanced)
   - Deep: 2+ hours/day (detailed with quizzes)

### 3. Dashboard (`frontend/src/pages/Dashboard.tsx`)
**Conditional Rendering:**

**Organizational Accounts:**
- Shows organization badge
- Saga Map visible (shows assigned courses only)
- **AI Generator: HIDDEN**
- Guided UI

**Personal Accounts:**
- **AI Generator: VISIBLE** (prominent button)
- Layout based on `learning_vibe`:
  - `saga`: Vertical RPG Map (SagaMap component)
  - `bootcamp`: Compact Checklist (BootcampView component)
  - `academic`: Grid of Textbook Cards (AcademicView component)

### 4. AI Course Generator (`frontend/src/components/AICourseGenerator.tsx`)
**Features:**
- Modal interface
- Only accessible to personal accounts
- Takes topic input
- Uses student's `pace` preference to adjust content depth
- Calls `/api/ai/generate-course` endpoint
- Auto-enrolls student in generated course

## Backend API

### `/api/ai/generate-course` (POST)
**Request:**
```json
{
  "topic": "Building REST APIs with FastAPI",
  "pace": "blitz|moderate|deep",
  "student_id": "uuid"
}
```

**Response:**
```json
{
  "course": {
    "title": "Course title",
    "description": "Course description",
    "difficulty": "beginner|intermediate|advanced",
    "modules": [...]
  }
}
```

**Logic:**
- If `pace === 'blitz'`: Generate summary modules only
- If `pace === 'moderate'`: Generate balanced modules with exercises
- If `pace === 'deep'`: Generate detailed modules with quizzes and projects

## User Flow

### Organizational Path:
1. User clicks "Join a Classroom"
2. Enters Class Code → Verified
3. Enters Email/Password → Account created
4. Auto-joined to organization
5. Dashboard shows assigned courses (no AI generator)

### Personal Path:
1. User clicks "Independent Learner"
2. PersonalWizard opens:
   - Step 1: Enter goal
   - Step 2: Choose vibe (Saga/Bootcamp/Academic)
   - Step 3: Choose pace (Blitz/Moderate/Deep)
3. Account created with preferences
4. Dashboard shows:
   - AI Generator button (visible)
   - Layout based on chosen vibe

## Files Created/Modified

### New Files:
- `backend/db/dual_path_auth_schema.sql` - Database schema
- `frontend/src/components/onboarding/PersonalWizard.tsx` - Personal onboarding
- `frontend/src/components/AICourseGenerator.tsx` - AI course generator
- `frontend/src/components/dashboard/BootcampView.tsx` - Bootcamp layout
- `frontend/src/components/dashboard/AcademicView.tsx` - Academic layout

### Modified Files:
- `frontend/src/pages/Signup.tsx` - Split signup page
- `frontend/src/pages/Dashboard.tsx` - Conditional rendering
- `frontend/src/context/AuthContext.tsx` - Return user data on signup
- `backend/app/main.py` - Added `/api/ai/generate-course` endpoint

## Testing

### Test Organizational Signup:
1. Go to `/signup`
2. Click "Join a Classroom"
3. Enter class code: `PYTHON2024`
4. Complete signup form
5. Verify dashboard shows organization badge
6. Verify AI Generator is hidden

### Test Personal Signup:
1. Go to `/signup`
2. Click "Independent Learner"
3. Complete 3-step wizard:
   - Enter goal: "Building a Full Stack App"
   - Choose vibe: "The Bootcamp"
   - Choose pace: "Blitz"
4. Verify dashboard shows:
   - AI Generator button
   - Bootcamp checklist view

### Test AI Course Generator:
1. As personal account, click "Generate Course"
2. Enter topic: "React Hooks"
3. Verify course is generated and enrolled

## Notes

- Class codes are case-insensitive (automatically uppercased)
- Personal accounts can switch vibes by updating `learning_vibe` in database
- Organizational accounts cannot generate courses (enforced in UI)
- All preferences are saved to `learning_preferences` table
- Dashboard automatically detects account type and renders accordingly



