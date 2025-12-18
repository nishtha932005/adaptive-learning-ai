import axios from "axios";
import { supabase } from "../lib/supabase";

const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

export type DifficultyMode = "simplify" | "standard" | "deep_dive";

/**
 * Maps the difficulty slider value (0-100) to API mode strings
 */
export function mapSliderToDifficulty(sliderValue: number): DifficultyMode {
  if (sliderValue <= 30) return "simplify";
  if (sliderValue <= 70) return "standard";
  return "deep_dive";
}

/**
 * Generate an adaptive lesson using Gemini AI
 */
export async function generateLesson(
  topic: string,
  difficulty: number
): Promise<string> {
  const mode = mapSliderToDifficulty(difficulty);
  const response = await axios.post<{ content: string }>(
    `${API_BASE_URL}/api/ai/generate`,
    {
      topic,
      mode,
    }
  );
  return response.data.content;
}

// Study Room 2.0 – multi-tool API

export type StudyToolMode = "explain" | "summarize" | "quiz" | "socratic" | "visualize";

export interface QuizItem {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface StudyToolResponse {
  mode: StudyToolMode;
  content?: string | null;
  quiz?: QuizItem[] | null;
}

export async function runStudyTool(params: {
  tool_type: StudyToolMode;
  topic?: string;
  input_text?: string;
  difficulty?: number;
  diagram_type?: string;
  num_questions?: number;
  level?: "easy" | "standard" | "hard";
  detail?: "short" | "standard" | "deep";
}): Promise<StudyToolResponse> {
  const response = await axios.post<StudyToolResponse>(
    `${API_BASE_URL}/api/ai/study-tool`,
    params
  );
  return response.data;
}

/**
 * Fetch course details from Supabase
 */
export interface CourseModule {
  id: string;
  title: string;
  order: number;
  duration_minutes: number;
  is_locked: boolean;
  is_completed: boolean;
}

export interface CourseDetails {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  total_modules: number;
  modules: CourseModule[];
}

export async function getCourseDetails(courseId: string): Promise<CourseDetails> {
  try {
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseError) throw courseError;

    // Mock modules for now (in production, you'd have a modules table)
    const mockModules: CourseModule[] = Array.from({ length: course.total_modules || 5 }, (_, i) => ({
      id: `${courseId}-module-${i + 1}`,
      title: `Module ${i + 1}: ${course.title} Fundamentals`,
      order: i + 1,
      duration_minutes: 15 + Math.floor(Math.random() * 20),
      is_locked: i > 2, // First 3 unlocked
      is_completed: i < 1, // First one completed
    }));

    return {
      id: course.id,
      title: course.title,
      description: course.description || "No description available",
      thumbnail_url: course.thumbnail_url,
      total_modules: course.total_modules,
      modules: mockModules,
    };
  } catch (error) {
    console.error("Failed to fetch course details", error);
    // Graceful fallback
    return {
      id: courseId,
      title: "Sample Course",
      description: "This is a demo course. In production, real course data would be loaded here.",
      thumbnail_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
      total_modules: 5,
      modules: [
        {
          id: "demo-1",
          title: "Module 1: Introduction",
          order: 1,
          duration_minutes: 15,
          is_locked: false,
          is_completed: true,
        },
        {
          id: "demo-2",
          title: "Module 2: Core Concepts",
          order: 2,
          duration_minutes: 20,
          is_locked: false,
          is_completed: false,
        },
        {
          id: "demo-3",
          title: "Module 3: Advanced Topics",
          order: 3,
          duration_minutes: 25,
          is_locked: true,
          is_completed: false,
        },
      ],
    };
  }
}

