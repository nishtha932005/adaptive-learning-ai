import { supabase } from "../lib/supabase";
import type { Course } from "../types";

const GENERATED_COURSES_STORAGE_KEY = "ai_generated_courses_v1";
const LESSON_VIDEO_CACHE_KEY = "ai_lesson_videos_v1";

type GeneratedCourse = {
  id?: string;
  title?: string;
  description?: string;
  modules?: Array<{
    title?: string;
    chapters?: Array<{
      title?: string;
      lessons?: Array<string | { title?: string; content?: string }>;
    }>;
  }>;
};

function readGeneratedCourses(): GeneratedCourse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GENERATED_COURSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readVideoCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LESSON_VIDEO_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeVideoCache(cache: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LESSON_VIDEO_CACHE_KEY, JSON.stringify(cache));
}

async function resolveLessonVideoUrl(lessonTitle: string, contextTitle: string): Promise<string> {
  const searchQuery = `${lessonTitle} tutorial programming ${contextTitle}`.trim();
  const cacheKey = searchQuery.toLowerCase();
  const cache = readVideoCache();
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  try {
    const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";
    const url = `${API_URL}/api/video/search?topic=${encodeURIComponent(searchQuery)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data?.video_url) {
        cache[cacheKey] = data.video_url;
        writeVideoCache(cache);
        return data.video_url;
      }
    }
  } catch {
    // fall through to fallback
  }

  // Conservative educational fallback if search fails.
  return "https://www.youtube.com/embed/aircAruvnKk";
}

function generatedToCourseSummary(course: GeneratedCourse): Course | null {
  if (!course?.id || !course?.title) return null;
  return {
    id: String(course.id),
    title: String(course.title),
    description: String(course.description || ""),
    thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    modules: [],
  };
}

async function generatedToCourseDetail(course: GeneratedCourse): Promise<Course | null> {
  if (!course?.id || !course?.title) return null;

  const modules = await Promise.all((course.modules || []).map(async (module, mIdx) => {
    const lessonArrays = await Promise.all((module.chapters || []).map(async (chapter, cIdx) => {
      const chapterTitle = String(chapter.title || `Chapter ${cIdx + 1}`);
      const rawLessons = Array.isArray(chapter.lessons) ? chapter.lessons : [];

      if (rawLessons.length === 0) {
        const fallbackTitle = `${chapterTitle}: Introduction`;
        const fallbackVideoUrl = await resolveLessonVideoUrl(fallbackTitle, String(course.title || ""));
        return [
          {
            id: `${course.id}-m${mIdx + 1}-c${cIdx + 1}-l1`,
            title: fallbackTitle,
            duration: "10:00",
            videoUrl: fallbackVideoUrl,
            isCompleted: false,
          },
        ];
      }

      return Promise.all(rawLessons.map(async (lesson, lIdx) => {
        const lessonTitle =
          typeof lesson === "string"
            ? lesson
            : String(lesson?.title || lesson?.content || `Lesson ${lIdx + 1}`);
        const fullTitle = `${chapterTitle}: ${lessonTitle}`;
        const videoUrl = await resolveLessonVideoUrl(fullTitle, String(course.title || ""));
        return {
          id: `${course.id}-m${mIdx + 1}-c${cIdx + 1}-l${lIdx + 1}`,
          title: fullTitle,
          duration: "10:00",
          videoUrl,
          isCompleted: false,
        };
      }));
    }));

    const lessons = lessonArrays.flat();

    return {
      id: `${course.id}-m${mIdx + 1}`,
      title: String(module.title || `Module ${mIdx + 1}`),
      lessons,
    };
  }));

  return {
    id: String(course.id),
    title: String(course.title),
    description: String(course.description || ""),
    thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    modules,
  };
}

const MOCK_COURSES: Course[] = [
  {
    id: "advanced-neural-networks",
    title: "Advanced Neural Networks",
    description:
      "Deep dive into modern neural network architectures, optimization tricks, and production-grade training workflows.",
    thumbnail:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    modules: [
      {
        id: "m1",
        title: "Foundations & Intuition",
        lessons: [
          {
            id: "m1-l1",
            title: "From Linear Models to Deep Networks",
            duration: "14:32",
            videoUrl: "https://www.youtube.com/embed/aircAruvnKk",
            isCompleted: false,
          },
          {
            id: "m1-l2",
            title: "Activation Functions & Non-Linearity",
            duration: "11:08",
            videoUrl: "https://www.youtube.com/embed/1O4vC5c0OVs",
            isCompleted: false,
          },
        ],
      },
      {
        id: "m2",
        title: "Architectures in Practice",
        lessons: [
          {
            id: "m2-l1",
            title: "Convolutional Neural Networks (CNNs)",
            duration: "18:20",
            videoUrl: "https://www.youtube.com/embed/YRhxdVk_sIs",
            isCompleted: false,
          },
          {
            id: "m2-l2",
            title: "Attention & Transformers",
            duration: "21:42",
            videoUrl: "https://www.youtube.com/embed/U0s0f995w14",
            isCompleted: false,
          },
        ],
      },
    ],
  },
  {
    id: "react-mastery",
    title: "React Mastery",
    description:
      "From fundamentals to advanced patterns, hooks, performance, and production deployment.",
    thumbnail:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
    modules: [
      {
        id: "rm1",
        title: "Core Concepts",
        lessons: [
          {
            id: "rm1-l1",
            title: "Components & Props",
            duration: "12:10",
            videoUrl: "https://www.youtube.com/embed/Ke90Tje7VS0",
            isCompleted: false,
          },
          {
            id: "rm1-l2",
            title: "State & Lifecycle",
            duration: "15:20",
            videoUrl: "https://www.youtube.com/embed/DPnqb74Smug",
            isCompleted: false,
          },
        ],
      },
    ],
  },
  {
    id: "ml-systems-design",
    title: "ML Systems Design",
    description:
      "Designing, deploying and monitoring machine learning systems in the real world.",
    thumbnail:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    modules: [
      {
        id: "ml1",
        title: "End-to-End Pipelines",
        lessons: [
          {
            id: "ml1-l1",
            title: "Feature Pipelines",
            duration: "16:30",
            videoUrl: "https://www.youtube.com/embed/06-AZXmwHjo",
            isCompleted: false,
          },
        ],
      },
    ],
  },
];

export async function getAllCourses(): Promise<Course[]> {
  const generatedSummaries = readGeneratedCourses()
    .map(generatedToCourseSummary)
    .filter((c): c is Course => !!c);

  try {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, description, thumbnail_url")
      .order("title", { ascending: true });

    if (error || !data || data.length === 0) {
      return [...generatedSummaries, ...MOCK_COURSES];
    }

    const dbCourses = data.map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description || "",
      thumbnail: c.thumbnail_url,
      modules: [], // modules will be loaded on course detail
    }));

    return [...generatedSummaries, ...dbCourses];
  } catch {
    return [...generatedSummaries, ...MOCK_COURSES];
  }
}

export async function getCourseById(courseId: string): Promise<Course> {
  const generatedMatch = readGeneratedCourses().find((c) => String(c?.id) === courseId);
  if (generatedMatch) {
    const mapped = await generatedToCourseDetail(generatedMatch);
    if (mapped) {
      return mapped;
    }
  }

  try {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, description, thumbnail_url")
      .eq("id", courseId)
      .single();

    if (error || !data) {
      const fallback = MOCK_COURSES.find((c) => c.id === courseId);
      return fallback || MOCK_COURSES[0];
    }

    // TODO: if you later add modules/lessons tables to Supabase, fetch and map them here.
    return {
      id: data.id,
      title: data.title,
      description: data.description || "",
      thumbnail: data.thumbnail_url,
      modules: MOCK_COURSES[0].modules, // temporary: provide rich mock modules so player works
    };
  } catch {
    const fallback = MOCK_COURSES.find((c) => c.id === courseId);
    return fallback || MOCK_COURSES[0];
  }
}


