import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, BookOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";

interface AICourseGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseGenerated?: () => void;
}

export default function AICourseGenerator({
  isOpen,
  onClose,
  onCourseGenerated,
}: AICourseGeneratorProps) {
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter what you want to learn");
      return;
    }

    if (!user?.id) {
      setError("You must be logged in to generate courses");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Get user's learning preferences
      const { data: student } = await supabase
        .from("students")
        .select("preferred_pace")
        .eq("id", user.id)
        .single();

      const pace = student?.preferred_pace || "moderate";

      // Call backend API to generate course
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${API_URL}/api/ai/generate-course`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          pace: pace,
          student_id: user.id,
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

      const { course } = await response.json();

      // Save course to database
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .insert({
          title: course.title,
          description: course.description,
          difficulty: course.difficulty || "intermediate",
          thumbnail_url: course.thumbnail_url || null,
          total_modules: course.modules?.length || 0,
        })
        .select()
        .single();

      if (courseError) {
        throw new Error("Failed to save course: " + courseError.message);
      }

      // Enroll student in the course
      if (courseData) {
        await supabase.from("enrollments").insert({
          student_id: user.id,
          course_id: courseData.id,
          progress_pct: 0,
          is_current_focus: true,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setTopic("");
        setSuccess(false);
        onCourseGenerated?.();
      }, 2000);
    } catch (e: any) {
      setError(e?.message || "Failed to generate course. Please try again.");
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

