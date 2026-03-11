import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const GENERATED_COURSES_STORAGE_KEY = "ai_generated_courses_v1";

export interface GeneratedChapter {
  chapterNumber?: string;
  title: string;
  videoId?: string | null;
}

export interface GeneratedModule {
  title: string;
  chapters: GeneratedChapter[];
  lessons?: string[];
}

export interface GeneratedCourse {
  id?: string;
  title: string;
  description: string;
  modules: GeneratedModule[];
  generated_at?: string;
}

interface CourseContextValue {
  generatedCourses: GeneratedCourse[];
  latestGeneratedCourse: GeneratedCourse | null;
  addGeneratedCourse: (course: GeneratedCourse) => GeneratedCourse;
  resetCourses: () => void;
}

const CourseContext = createContext<CourseContextValue | undefined>(undefined);

function getStorageKeyForUser(userId: string | undefined): string {
  if (!userId) return "";
  return `${GENERATED_COURSES_STORAGE_KEY}_${userId}`;
}

function toCourseId(title: string) {
  return (
    "ai-" +
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
  );
}

function readInitialCourses(userId: string | undefined): GeneratedCourse[] {
  if (typeof window === "undefined") return [];

  const key = getStorageKeyForUser(userId);
  if (!key) return [];

  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeGeneratedCourse).filter((c): c is GeneratedCourse => !!c);
  } catch {
    return [];
  }
}

function normalizeLessonTitle(value: unknown, idx: number): string {
  const clean = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    const withoutBoilerplate = trimmed.replace(/^(chapter\s*\d+(?:\.\d+)?\s*[:\-]\s*|lesson\s*\d+(?:\.\d+)?\s*[:\-]\s*)/i, "");
    return withoutBoilerplate.trim() || trimmed;
  };

  if (typeof value === "string" && value.trim()) return clean(value);
  if (value && typeof value === "object") {
    const anyValue = value as any;
    const title = anyValue.title || anyValue.name || anyValue.video_title || anyValue.youtube_title || anyValue.core_topic;
    if (typeof title === "string" && title.trim()) return clean(title);
  }
  return clean(`Lesson ${idx}`);
}

function normalizeModule(module: any): GeneratedModule {
  const title = String(module?.title || "").trim();

  const directChapters = Array.isArray(module?.chapters) ? module.chapters : [];
  if (directChapters.length > 0) {
    const chapters = directChapters.map((chapter: any, idx: number) => {
      const chapterNumber = String(chapter?.chapterNumber || chapter?.chapter_number || "").trim() || undefined;
      const chapterTitle =
        typeof chapter === "string"
          ? normalizeLessonTitle(chapter, idx + 1)
          : normalizeLessonTitle(chapter?.title || chapter?.name || chapter?.core_topic, idx + 1);

      return {
        chapterNumber,
        title: chapterTitle,
        videoId: chapter?.videoId || chapter?.video_id || null,
      };
    });

    return {
      title,
      chapters,
    };
  }

  // Backward compatibility for previously stored modules[].lessons[].
  const directLessons = Array.isArray(module?.lessons)
    ? module.lessons
    : [];

  const chapters = (directLessons.length ? directLessons : ["Introduction"])
    .map((lesson: any, idx: number) => ({
      chapterNumber: `${idx + 1}`,
      title: normalizeLessonTitle(lesson, idx + 1),
      videoId: null,
    }));

  return {
    title,
    chapters,
  };
}

function normalizeGeneratedCourse(course: any): GeneratedCourse | null {
  if (!course || typeof course !== "object") return null;
  const modules = Array.isArray(course.modules) ? course.modules.map(normalizeModule) : [];

  return {
    id: course.id,
    title: String(course.title || "").trim(),
    description: String(course.description || "").trim(),
    generated_at: course.generated_at,
    modules,
  };
}

function persistCourses(courses: GeneratedCourse[], userId: string | undefined) {
  if (typeof window === "undefined") return;
  const key = getStorageKeyForUser(userId);
  if (!key) return;
  window.localStorage.setItem(key, JSON.stringify(courses.slice(0, 25)));
}

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = (user as any)?.id || (user as any)?.sub || undefined;

  const [generatedCourses, setGeneratedCourses] = useState<GeneratedCourse[]>([]);
  const [prevUserId, setPrevUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return;
    if (userId !== prevUserId) {
      const nextCourses = readInitialCourses(userId);
      setGeneratedCourses(nextCourses);
      setPrevUserId(userId);
    }
  }, [userId, prevUserId, authLoading]);

  const addGeneratedCourse = (course: GeneratedCourse): GeneratedCourse => {
    const normalizedCourse = normalizeGeneratedCourse(course);
    const normalized: GeneratedCourse = {
      ...(normalizedCourse || course),
      id: course.id || `${toCourseId(course.title)}-${Date.now()}`,
      generated_at: course.generated_at || new Date().toISOString(),
    };

    setGeneratedCourses((prev) => {
      const next = [normalized, ...prev];
      persistCourses(next, userId);
      return next.slice(0, 25);
    });

    return normalized;
  };

  const resetCourses = () => {
    setGeneratedCourses([]);
    if (typeof window !== "undefined") {
      const key = getStorageKeyForUser(userId);
      if (key) {
        window.localStorage.removeItem(key);
      }
    }
  };

  const value = useMemo<CourseContextValue>(
    () => ({
      generatedCourses,
      latestGeneratedCourse: generatedCourses[0] || null,
      addGeneratedCourse,
      resetCourses,
    }),
    [generatedCourses]
  );

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

export function useCourses(): CourseContextValue {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error("useCourses must be used within a CourseProvider");
  }
  return context;
}
