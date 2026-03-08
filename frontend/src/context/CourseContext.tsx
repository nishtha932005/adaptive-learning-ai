import React, { createContext, useContext, useMemo, useState } from "react";

const GENERATED_COURSES_STORAGE_KEY = "ai_generated_courses_v1";

export interface GeneratedChapter {
  title: string;
  lessons: string[];
}

export interface GeneratedModule {
  title: string;
  chapters: GeneratedChapter[];
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
}

const CourseContext = createContext<CourseContextValue | undefined>(undefined);

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

function readInitialCourses(): GeneratedCourse[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(GENERATED_COURSES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCourses(courses: GeneratedCourse[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GENERATED_COURSES_STORAGE_KEY, JSON.stringify(courses.slice(0, 25)));
}

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [generatedCourses, setGeneratedCourses] = useState<GeneratedCourse[]>(readInitialCourses);

  const addGeneratedCourse = (course: GeneratedCourse): GeneratedCourse => {
    const normalized: GeneratedCourse = {
      ...course,
      id: course.id || `${toCourseId(course.title)}-${Date.now()}`,
      generated_at: course.generated_at || new Date().toISOString(),
    };

    setGeneratedCourses((prev) => {
      const next = [normalized, ...prev];
      persistCourses(next);
      return next.slice(0, 25);
    });

    return normalized;
  };

  const value = useMemo<CourseContextValue>(
    () => ({
      generatedCourses,
      latestGeneratedCourse: generatedCourses[0] || null,
      addGeneratedCourse,
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
