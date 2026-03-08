import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useCourses, type GeneratedCourse } from "../context/CourseContext";

interface AICourseGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseGenerated?: (course?: GeneratedCourse) => void;
}

export default function AICourseGenerator({
  isOpen,
  onClose,
  onCourseGenerated,
}: AICourseGeneratorProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { themeColor } = useTheme();
  const { addGeneratedCourse } = useCourses();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter what you want to learn");
      return;
    }

    if (!isAuthenticated || !user) {
      setError("You must be logged in to generate courses");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // For now, use a default pace. In future this can
      // be driven by backend preferences or settings.
      const pace = "moderate";

      // Call backend API to generate course
      const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";
      const studentId = (user as any)?.userId || (user as any)?.id || (user as any)?.username;

      if (!studentId) {
        throw new Error("Unable to resolve authenticated user id for course generation.");
      }
      const response = await fetch(`${API_URL}/api/ai/generate-course`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          pace: pace,
          student_id: studentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || "Failed to generate course";

        // Handle Gemini API quota errors
        if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
          throw new Error("AI service quota exceeded. Please try again later or upgrade your plan.");
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("AI course response:", data);

      const course: GeneratedCourse | undefined = data?.course;
      const hasModules = Array.isArray(course?.modules) && course!.modules.length > 0;
      const hasChapters = !!course?.modules?.some(
        (module) => Array.isArray(module?.chapters) && module.chapters.length > 0
      );

      if (!course || !hasModules || !hasChapters) {
        throw new Error("Generated course is missing modules/chapters. Please try again.");
      }

      const savedCourse = addGeneratedCourse(course);
      console.debug("[AI Course] Stored generated course in CourseContext", {
        id: savedCourse.id,
        title: savedCourse.title,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setTopic("");
        setSuccess(false);
        onCourseGenerated?.(savedCourse);
        navigate("/overview");
      }, 2000);
    } catch (e: any) {
      setError(e?.message || "Failed to generate course. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-lg card p-6 md:p-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Generate AI Course
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Create a personalized learning path
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Course generated successfully! Redirecting...
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                What do you want to learn?
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Building a REST API with FastAPI, Learning React Hooks, Mastering Python Decorators..."
                rows={4}
                disabled={loading || success}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleGenerate}
                disabled={loading || success || !topic.trim()}
                className="flex-1 px-6 py-3 rounded-lg bg-primary text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Course
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

