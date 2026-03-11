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
      chapterNumber?: string;
      title?: string;
      videoId?: string;
      video_id?: string;
      lessons?: Array<string | { title?: string; content?: string; video_title?: string; youtube_title?: string; core_topic?: string }>;
    }>;
    lessons?: Array<string | { title?: string; content?: string; video_title?: string; youtube_title?: string; core_topic?: string }>;
  }>;
};

function normalizeLessonTitle(lesson: any, fallback: string): string {
  const clean = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const withoutBoilerplate = trimmed.replace(/^(chapter\s*\d+(?:\.\d+)?\s*[:\-]\s*|lesson\s*\d+(?:\.\d+)?\s*[:\-]\s*)/i, "");
    return withoutBoilerplate.trim() || trimmed;
  };

  if (typeof lesson === "string" && lesson.trim()) return clean(lesson);
  if (lesson && typeof lesson === "object") {
    const title = lesson.title || lesson.name || lesson.video_title || lesson.youtube_title || lesson.core_topic || lesson.content;
    if (typeof title === "string" && title.trim()) return clean(title);
  }
  return clean(fallback);
}

function toEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

function parseVideoIdFromEmbed(url: string): string {
  const match = /\/embed\/([A-Za-z0-9_-]{11})/.exec(url || "");
  return match?.[1] || "";
}

function getModuleChapters(module: NonNullable<GeneratedCourse["modules"]>[number], moduleIndex: number): Array<{ chapterNumber: string; title: string; videoId?: string | null }> {
  const chapters = Array.isArray(module.chapters) ? module.chapters : [];
  if (chapters.length > 0) {
    return chapters.map((chapter, chapterIndex) => {
      const chapterNumber = String(chapter.chapterNumber || `${moduleIndex + 1}.${chapterIndex + 1}`);
      const title = normalizeLessonTitle(chapter.title, `Chapter ${chapterNumber}`);
      return {
        chapterNumber,
        title: title.startsWith("Chapter ") ? title : `Chapter ${chapterNumber}: ${title}`,
        videoId: chapter.videoId || chapter.video_id || null,
      };
    });
  }

  // Backward compatibility for old modules[].lessons[].
  const directLessons = Array.isArray(module.lessons) ? module.lessons : [];
  return directLessons.map((lesson, idx) => {
    const chapterNumber = `${moduleIndex + 1}.${idx + 1}`;
    const title = normalizeLessonTitle(lesson, `Chapter ${chapterNumber}`);
    return {
      chapterNumber,
      title: title.startsWith("Chapter ") ? title : `Chapter ${chapterNumber}: ${title}`,
      videoId: null,
    };
  });
}

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

async function resolveChapterVideoUrl(chapterTitle: string, moduleTitle: string, contextTitle: string, usedVideoIds: Set<string>): Promise<string> {
  const searchQueries = [
    `${chapterTitle} tutorial`,
    `${chapterTitle} ${moduleTitle} tutorial`,
    `${chapterTitle} ${contextTitle} tutorial`,
  ];

  const cache = readVideoCache();

  for (const searchQuery of searchQueries) {
    const cacheKey = searchQuery.toLowerCase();
    if (cache[cacheKey]) {
      const cachedVideoId = parseVideoIdFromEmbed(cache[cacheKey]);
      if (!cachedVideoId || !usedVideoIds.has(cachedVideoId)) {
        if (cachedVideoId) usedVideoIds.add(cachedVideoId);
        return cache[cacheKey];
      }
    }

    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";
      const url = `${API_URL}/api/video/search?topic=${encodeURIComponent(searchQuery)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const videoUrl = data?.video_url;
        const videoId = data?.video_id || parseVideoIdFromEmbed(videoUrl || "");
        if (videoUrl && (!videoId || !usedVideoIds.has(videoId))) {
          if (videoId) usedVideoIds.add(videoId);
          cache[cacheKey] = videoUrl;
          writeVideoCache(cache);
          return videoUrl;
        }
      }
    } catch {
      // try next query
    }
  }

  // Distinct fallback pool to avoid chapter video duplication when searches fail.
  const fallbackIds = ["aircAruvnKk", "rfscVS0vtbw", "N4mEzFDjqtA", "kqtD5dpn9C8", "8mAITcNt710"];
  const unusedFallback = fallbackIds.find((id) => !usedVideoIds.has(id)) || fallbackIds[0];
  usedVideoIds.add(unusedFallback);
  return toEmbedUrl(unusedFallback);
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

  const usedVideoIds = new Set<string>();

  const modules = await Promise.all((course.modules || []).map(async (module, mIdx) => {
    const moduleTitle = String(module.title || `Module ${mIdx + 1}`);
    const chapters = getModuleChapters(module, mIdx);
    const chapterItems = chapters.length
      ? chapters
      : [{ chapterNumber: `${mIdx + 1}.1`, title: `Chapter ${mIdx + 1}.1: Introduction to ${moduleTitle}`, videoId: null }];

    const lessons = await Promise.all(chapterItems.map(async (chapter, cIdx) => {
      let videoUrl = "";
      const chapterVideoId = (chapter.videoId || "").trim();
      if (chapterVideoId && !usedVideoIds.has(chapterVideoId)) {
        usedVideoIds.add(chapterVideoId);
        videoUrl = toEmbedUrl(chapterVideoId);
      } else {
        videoUrl = await resolveChapterVideoUrl(chapter.title, moduleTitle, String(course.title || ""), usedVideoIds);
      }

      return {
        id: `${course.id}-m${mIdx + 1}-c${cIdx + 1}`,
        title: chapter.title,
        duration: "10:00",
        videoUrl,
        isCompleted: false,
      };
    }));

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
      return [...generatedSummaries];
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
    return [...generatedSummaries];
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
      throw new Error("Course not found");
    }

    // Until DB-backed modules are available, expose a single intro lesson.
    return {
      id: data.id,
      title: data.title,
      description: data.description || "",
      thumbnail: data.thumbnail_url,
      modules: [
        {
          id: `${data.id}-m1`,
          title: "Getting Started",
          lessons: [
            {
              id: `${data.id}-m1-l1`,
              title: `Introduction to ${data.title}`,
              duration: "10:00",
              videoUrl: "https://www.youtube.com/embed/rfscVS0vtbw",
              isCompleted: false,
            },
          ],
        },
      ],
    };
  } catch {
    throw new Error("Course not found");
  }
}


