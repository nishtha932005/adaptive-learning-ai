# 🚀 Deployment Guide - Adaptive Learning System

## Pre-Deployment Checklist

### 1. Environment Variables Setup

**Backend (`backend/.env`)**
```bash
GEMINI_API_KEY=your-gemini-api-key
```

**Frontend (`frontend/.env`)**
```bash
VITE_SUPABASE_URL=https://ptltgkqhbkkgonifgydn.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. Database Setup (Supabase)

1. Go to Supabase Dashboard → SQL Editor
2. Run `backend/db/security_policies.sql` (creates tables, RLS policies, and auth trigger)
3. Verify tables exist: `students`, `courses`, `enrollments`

### 3. Install Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

---

## Local Development

### Backend
```bash
cd backend
source venv/bin/activate  # Windows: .\venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

Visit: `http://localhost:5173`

---

## Production Deployment

### Backend (Railway / Render / Fly.io)

1. **Dockerfile** (create `backend/Dockerfile`):
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

2. Set environment variable: `GEMINI_API_KEY`
3. Deploy command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel / Netlify)

1. Build command: `npm run build`
2. Output directory: `dist`
3. Environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## Testing

### Run Backend Tests
```bash
cd backend
pip install pytest httpx
python -m pytest tests/ -v
```

### Manual Testing Checklist
- [ ] Landing page loads at `/`
- [ ] Signup creates new user + student profile
- [ ] Login redirects to `/dashboard`
- [ ] Dashboard shows user's courses and risk score
- [ ] Study Room generates AI lessons
- [ ] Theme toggle works (light/dark)
- [ ] Logout redirects to landing page

---

## Security Notes

- ✅ CORS restricted to specific origins
- ✅ RLS enabled on all Supabase tables
- ✅ Auth tokens managed by Supabase
- ✅ API keys stored in environment variables (never committed)

---

## Troubleshooting

**"No student data found"**
→ Run `backend/db/security_policies.sql` to enable the auth trigger

**"Failed to resolve import @supabase/supabase-js"**
→ Run `npm install @supabase/supabase-js` in frontend

**CORS errors**
→ Check `backend/app/main.py` origins match your frontend URL

