import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "x-client-info": "adaptive-learning@1.0.0",
    },
  },
});

export interface DashboardStudent {
  id: string;
  full_name: string;
  email: string;
  risk_score: number;
  xp_points: number;
  study_streak_days: number;
  hours_studied: number;
  modules_finished: number;
}

export interface DashboardCourse {
  id: string;
  title: string;
  difficulty: string;
  thumbnail_url: string;
  total_modules: number;
  progress_pct: number;
  is_current_focus: boolean;
}

export interface DashboardData {
  student: DashboardStudent;
  courses: DashboardCourse[];
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  // Fetch the authenticated user's student profile
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("id", userId)
    .single();

  if (studentError || !student) {
    throw new Error(
      studentError?.message || "No student profile found. Please contact support."
    );
  }

  // Fetch enrollments with course details for this student
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select(
      `
      progress_pct,
      is_current_focus,
      last_accessed,
      courses (
        id,
        title,
        difficulty,
        thumbnail_url,
        total_modules
      )
    `
    )
    .eq("student_id", userId)
    .order("last_accessed", { ascending: false });

  if (enrollError) {
    throw new Error(enrollError.message || "Failed to fetch enrollments");
  }

  const courses: DashboardCourse[] = (enrollments || []).map((e: any) => ({
    id: e.courses.id,
    title: e.courses.title,
    difficulty: e.courses.difficulty,
    thumbnail_url: e.courses.thumbnail_url,
    total_modules: e.courses.total_modules,
    progress_pct: e.progress_pct,
    is_current_focus: e.is_current_focus,
  }));

  return {
    student,
    courses,
  };
}


