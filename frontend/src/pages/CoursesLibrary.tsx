import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, Clock, Loader2, Sparkles } from "lucide-react";
import { getAllCourses } from "../services/courseService";
import { useTheme } from "../context/ThemeContext";
import type { Course } from "../types";

export default function CoursesLibrary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { themeColor } = useTheme();
  const highlightParam = searchParams.get("highlight");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getAllCourses();
        setCourses(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const timeCapsules = useMemo(() => {
    const map: Record<string, string> = {};
    courses.forEach((course) => {
      const hours = Math.floor(Math.random() * (50 - 2 + 1)) + 2;
      const minsOptions = [0, 15, 30, 45];
      const mins = minsOptions[Math.floor(Math.random() * minsOptions.length)];
      map[course.id] = `${hours}h ${mins}m`;
    });
    return map;
  }, [courses]);

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-primary mb-1">
            COURSE LIBRARY
          </p>
          <h1 className="text-2xl font-semibold text-white">
            All Learning Paths
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse curated, AI-optimized courses and jump into any lesson.
          </p>
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading courses...
        </div>
      )}

      {error && (
        <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-700 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course) => {
            const isHighlighted = highlightParam && 
              (course.title.toLowerCase().includes(highlightParam.toLowerCase()) ||
               course.id.toLowerCase().includes(highlightParam.toLowerCase()));
            return (
            <button
              key={course.id}
              type="button"
              onClick={() => navigate(`/dashboard/course/${course.id}`)}
              className={`group text-left card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] ${
                isHighlighted ? "ring-2 ring-primary shadow-lg" : ""
              }`}
            >
              <div
                className="h-32 bg-cover bg-center relative"
                style={{ backgroundImage: `url(${course.thumbnail})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent group-hover:from-slate-950/90 group-hover:via-blue-900/40 group-hover:to-slate-900/60 transition-all" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-slate-100">
                  <BookOpen className="w-3 h-3" />
                  <span>{course.total_modules} modules</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-white line-clamp-2">
                    {course.title}
                  </h2>
                  <span className="px-2 py-1 rounded-full bg-slate-900 text-[10px] text-primary border border-primary/60">
                    {"Advanced"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-3 min-h-[3rem]">
                  {course.description ||
                    "An advanced, AI-tuned curriculum designed to push your understanding to the next level."}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="rounded-full px-2 py-0.5 bg-slate-900/80 border border-white/10">
                      {timeCapsules[course.id] || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-primary">
                    <Sparkles className="w-3 h-3" />
                    <span>AI Assisted</span>
                  </div>
                </div>
              </div>
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


