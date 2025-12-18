import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  CheckCircle2,
  Lock,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Home,
} from "lucide-react";
import ConfettiExplosion from "react-confetti-explosion";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Course, Module, Lesson } from "../types";
import { getCourseById } from "../services/courseService";

type ToastState = {
  message: string;
  visible: boolean;
};

export default function CoursePlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [isExploding, setIsExploding] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    message: "",
    visible: false,
  });
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const courseId = id || "advanced-neural-networks";
        const data = await getCourseById(courseId);
        setCourse(data);
        setModules(data.modules);
        if (data.modules.length > 0) {
          setActiveModuleId(data.modules[0].id);
          if (data.modules[0].lessons.length > 0) {
            setActiveLessonId(data.modules[0].lessons[0].id);
          }
        }
      } catch (e: any) {
        setError(e?.message || "Unable to load course");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Simple watch-time tracker: counts seconds while video is "playing".
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setWatchSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const activeModule = useMemo(() => {
    if (!modules.length) return null;
    if (!activeModuleId) return modules[0];
    return modules.find((m) => m.id === activeModuleId) ?? modules[0];
  }, [modules, activeModuleId]);

  const activeLesson = useMemo(() => {
    if (!activeModule) return null;
    if (!activeLessonId) return activeModule.lessons[0];
    return (
      activeModule.lessons.find((l) => l.id === activeLessonId) ??
      activeModule.lessons[0]
    );
  }, [activeModule, activeLessonId]);

  const allLessons: { module: Module; lesson: Lesson }[] = useMemo(
    () =>
      modules.flatMap((m) => m.lessons.map((lesson) => ({ module: m, lesson }))),
    [modules]
  );

  const currentIndex = allLessons.findIndex(
    (item) => item.lesson.id === activeLesson?.id
  );

  const goToLesson = (moduleId: string, lesson: Lesson) => {
    if (lesson.isLocked) return;
    setActiveModuleId(moduleId);
    setActiveLessonId(lesson.id);
  };

  const goPrev = () => {
    if (currentIndex <= 0 || currentIndex === -1) return;
    const prev = allLessons[currentIndex - 1];
    goToLesson(prev.module.id, prev.lesson);
  };

  const goNext = () => {
    if (currentIndex === -1 || currentIndex >= allLessons.length - 1) return;
    const next = allLessons[currentIndex + 1];
    goToLesson(next.module.id, next.lesson);
  };

  const handleMarkComplete = async () => {
    if (!activeLesson || !activeModule || !course) return;

    const [mm, ss = "0"] = activeLesson.duration.split(":");
    const expectedSeconds = parseInt(mm, 10) * 60 + parseInt(ss, 10);
    const ratio =
      expectedSeconds > 0 ? watchSeconds / expectedSeconds : Number.POSITIVE_INFINITY;

    if (ratio < 0.7) {
      setToast({
        message: "⏱️ Watch at least 70% of the lesson before marking complete.",
        visible: true,
      });
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500);
      return;
    }

    setModules((prev) =>
      prev.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((lesson) =>
          lesson.id === activeLesson.id
            ? { ...lesson, isCompleted: true, isLocked: false }
            : lesson
        ),
      }))
    );

    const xpEarned = 50;
    const timeSpentMinutes = Math.floor(watchSeconds / 60);
    
    setIsExploding(true);
    setToast({ message: `🎉 +${xpEarned} XP Earned!`, visible: true });
    setTimeout(() => {
      setIsExploding(false);
      setToast((t) => ({ ...t, visible: false }));
    }, 2500);

    // Update lesson progress and saga
    if (user?.id) {
      try {
        // Update lesson_progress
        await supabase.from("lesson_progress").upsert(
          {
            student_id: user.id,
            course_id: course.id,
            lesson_id: activeLesson.id,
            watched_seconds: watchSeconds,
            is_completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "student_id,course_id,lesson_id" }
        );

        // Update saga progress
        const { updateSagaFromActivity } = await import("../services/sagaService");
        await updateSagaFromActivity(user.id, "lesson", xpEarned, timeSpentMinutes);
      } catch (err) {
        console.error("Error updating progress:", err);
        // Continue even if saga update fails
      }
    }
  };

  const isFirst = currentIndex <= 0;
  const isLast = currentIndex === -1 || currentIndex >= allLessons.length - 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <span className="text-sm text-slate-400">Loading course...</span>
      </div>
    );
  }

  if (error || !course || !activeModule || !activeLesson) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-rose-400">
            {error || "Course not found or not configured yet."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard/courses")}
            className="px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-xs font-semibold"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white transition-colors relative">
      {/* Toast */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="px-4 py-3 rounded-xl bg-slate-900/90 border border-violet-500/40 shadow-xl text-sm">
            {toast.message}
          </div>
        </div>
      )}

      {/* Confetti */}
      {isExploding && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-40">
          <ConfettiExplosion force={0.6} duration={2500} particleCount={180} />
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-200" />
            </button>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Home className="w-3 h-3" />
                <span
                  onClick={() => navigate("/dashboard")}
                  className="cursor-pointer hover:text-slate-200"
                >
                  Dashboard
                </span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-300">{course.title}</span>
                <span className="text-slate-600">/</span>
                <span className="text-violet-300">{activeLesson.title}</span>
              </div>
              <h1 className="text-lg font-semibold">{course.title}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="lg:col-span-3 bg-slate-900/80 border border-white/10 rounded-2xl p-4 lg:p-5 backdrop-blur-xl shadow-2xl">
          <h2 className="text-sm font-semibold text-slate-100 mb-3">
            Course Outline
          </h2>
          <div className="space-y-3">
            {modules.map((module) => (
              <div key={module.id} className="border border-white/5 rounded-xl">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-200 bg-slate-900/80 rounded-t-xl"
                  onClick={() => setActiveModuleId(module.id)}
                >
                  <span className="truncate">{module.title}</span>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      activeModuleId === module.id ? "rotate-90" : ""
                    }`}
                  />
                </button>
                <div className="bg-slate-950/60 rounded-b-xl border-t border-white/5">
                  {module.lessons.map((lesson) => {
                    const isActive =
                      activeLessonId === lesson.id && activeModuleId === module.id;
                    const isLocked = lesson.isLocked;
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => goToLesson(module.id, lesson)}
                        disabled={isLocked}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-all ${
                          isActive
                            ? "bg-violet-500/20 border-l-2 border-violet-400"
                            : "border-l-2 border-transparent"
                        } ${
                          isLocked
                            ? "text-slate-500 cursor-not-allowed"
                            : "text-slate-200 hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="w-4 h-4 flex items-center justify-center">
                          {lesson.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isLocked ? (
                            <Lock className="w-4 h-4 text-slate-500" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-violet-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`truncate ${
                              isLocked ? "text-slate-500" : "text-slate-100"
                            }`}
                          >
                            {lesson.title}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {lesson.duration}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Stage */}
        <main className="lg:col-span-9 space-y-5">
          {/* Video Area */}
          <section className="bg-slate-900/80 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={activeLesson.videoUrl}
                title={activeLesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>

          {/* Controls */}
          <section className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={isFirst}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-slate-900 border border-white/10 text-xs text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={isLast}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-slate-900 border border-white/10 text-xs text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {!activeLesson.isCompleted && !activeLesson.isLocked && (
              <button
                type="button"
                onClick={handleMarkComplete}
                className="relative inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-sm font-semibold shadow-2xl shadow-violet-500/40 transition-transform hover:scale-105"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark as Complete
              </button>
            )}
          </section>

          {/* Lesson Text */}
          <section className="bg-slate-900/80 rounded-2xl border border-white/10 shadow-xl p-6 space-y-4 text-sm leading-relaxed">
            <h2 className="text-base font-semibold text-slate-100">
              {activeLesson.title}
            </h2>
            <p className="text-slate-300 text-sm">
              This lesson is part of{" "}
              <span className="font-semibold">{activeModule.title}</span> in the{" "}
              <span className="font-semibold">{course.title}</span>{" "}
              track. Watch the video above, then review the key concepts and try to
              connect them to problems you&apos;ve solved before.
            </p>
            <p className="text-slate-400 text-xs">
              Pro tip: take notes on intuition, not just formulas. The adaptive AI
              tutor will use your progress here to personalize future study sessions
              in the Quantum Study Room.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

