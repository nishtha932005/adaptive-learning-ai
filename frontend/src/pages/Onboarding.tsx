import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Loader2 } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { themeColor } = useTheme();

  const [step, setStep] = useState<Step>(1);
  const [pythonSkillLevel, setPythonSkillLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [learningGoals, setLearningGoals] = useState<string[]>([]);
  const [preferredPace, setPreferredPace] = useState<"slow" | "moderate" | "fast">("moderate");
  const [interests, setInterests] = useState<string[]>([]);
  const [learningStyle, setLearningStyle] = useState<"visual" | "text" | "interactive">("interactive");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goalOptions = [
    { id: "web_dev", label: "Web Development", icon: "🌐" },
    { id: "data_science", label: "Data Science", icon: "📊" },
    { id: "automation", label: "Automation", icon: "⚙️" },
    { id: "machine_learning", label: "Machine Learning", icon: "🤖" },
    { id: "game_dev", label: "Game Development", icon: "🎮" },
  ];

  const interestOptions = [
    { id: "algorithms", label: "Algorithms & Problem Solving" },
    { id: "apis", label: "Building APIs" },
    { id: "databases", label: "Database Design" },
    { id: "testing", label: "Testing & Debugging" },
    { id: "optimization", label: "Code Optimization" },
  ];

  const toggleGoal = (goalId: string) => {
    setLearningGoals((prev) =>
      prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId]
    );
  };

  const toggleInterest = (interestId: string) => {
    setInterests((prev) =>
      prev.includes(interestId) ? prev.filter((i) => i !== interestId) : [...prev, interestId]
    );
  };

  const next = () => {
    if (step === 2 && learningGoals.length === 0) {
      setError("Please select at least one learning goal");
      return;
    }
    setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
    setError(null);
  };

  const back = () => {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (learningGoals.length === 0) {
      setError("Please select at least one learning goal");
      return;
    }

    setLoading(true);
    setGenerating(true);
    setError(null);

    try {
      // Step 1: Save student preferences
      const { error: updateError } = await supabase
        .from("students")
        .upsert({
          id: user.id,
          python_skill_level: pythonSkillLevel,
          learning_goals: learningGoals,
          preferred_pace: preferredPace,
          interests: interests,
          learning_style: learningStyle,
        }, { onConflict: 'id' });

      if (updateError) throw updateError;

      // Step 2: Call AI to generate personalized saga
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${API_URL}/api/ai/personalize-saga`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          python_skill_level: pythonSkillLevel,
          learning_goals: learningGoals,
          preferred_pace: preferredPace,
          interests: interests,
          learning_style: learningStyle,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate personalized journey");
      }

      const { chapters } = await response.json();

      // Step 3: Save personalized chapters to database
      const personalizedChapters = chapters.map((ch: any, index: number) => ({
        student_id: user.id,
        chapter_number: ch.chapter_number || index + 1,
        title: ch.title,
        subtitle: ch.subtitle,
        xp_reward: ch.xp_reward,
        estimated_time_minutes: ch.estimated_time_minutes,
        type: ch.type,
        course_id: null,
        action_url: ch.action_url,
        action_type: ch.action_type,
        action_params: ch.action_params || {},
      }));

      // Insert personalized chapters
      const { error: chaptersError } = await supabase
        .from("personalized_saga_chapters")
        .upsert(personalizedChapters, { onConflict: "student_id,chapter_number" });

      if (chaptersError) throw chaptersError;

      // Step 4: Initialize saga progress
      const { error: progressError } = await supabase.rpc("initialize_personalized_saga_progress", {
        student_uuid: user.id,
      });

      if (progressError) {
        console.warn("Progress initialization warning:", progressError);
        // Continue anyway - progress can be initialized later
      }

      // Step 5: Mark onboarding as completed
      const { error: completeError } = await supabase
        .from("students")
        .update({
          onboarding_completed: true,
          personalized_saga_created: true,
        })
        .eq("id", user.id);

      if (completeError) throw completeError;

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (e: any) {
      console.error("Onboarding error:", e);
      setError(e?.message || "Failed to complete setup. Please try again.");
      setGenerating(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl card p-6 md:p-8 shadow-lg"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-primary mb-1 uppercase">
              Welcome to Your Journey
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Personalize Your Python Learning Path
            </h1>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((s) => (
              <span
                key={s}
                className={`h-2 w-8 rounded-full transition-all ${step >= s ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                  }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        {generating && (
          <div className="mb-4 flex items-center gap-3 text-sm text-primary bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AI is crafting your personalized Python journey...</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-slate-600 dark:text-slate-400">
                What's your current Python skill level?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(["beginner", "intermediate", "advanced"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPythonSkillLevel(level)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${pythonSkillLevel === level
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
                      }`}
                  >
                    <div className="font-semibold text-slate-900 dark:text-white capitalize mb-1">
                      {level}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {level === "beginner" && "New to Python or programming"}
                      {level === "intermediate" && "Comfortable with basics, ready for more"}
                      {level === "advanced" && "Experienced, looking for deep challenges"}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-slate-600 dark:text-slate-400">
                What do you want to achieve with Python? (Select all that apply)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {goalOptions.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${learningGoals.includes(goal.id)
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{goal.icon}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {goal.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-slate-600 dark:text-slate-400">
                How fast do you want to learn?
              </p>
              <div className="space-y-3">
                {(["slow", "moderate", "fast"] as const).map((pace) => (
                  <button
                    key={pace}
                    type="button"
                    onClick={() => setPreferredPace(pace)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${preferredPace === pace
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
                      }`}
                  >
                    <div className="font-semibold text-slate-900 dark:text-white capitalize mb-1">
                      {pace === "slow" && "🐢 Slow & Steady"}
                      {pace === "moderate" && "⚡ Moderate Pace"}
                      {pace === "fast" && "🚀 Fast Track"}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {pace === "slow" && "Take your time, master each concept"}
                      {pace === "moderate" && "Balanced learning with practice"}
                      {pace === "fast" && "Intensive learning, quick progression"}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  How do you prefer to learn?
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(["visual", "text", "interactive"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setLearningStyle(style)}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${learningStyle === style
                          ? "border-primary bg-primary/10 shadow-md"
                          : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
                        }`}
                    >
                      <div className="font-semibold text-slate-900 dark:text-white capitalize text-sm">
                        {style === "visual" && "📹 Videos"}
                        {style === "text" && "📚 Reading"}
                        {style === "interactive" && "🎯 Practice"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 text-primary mb-4">
                <Brain className="w-6 h-6" />
                <p className="text-sm font-semibold">
                  AI will create your personalized Python journey based on your preferences!
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Skill Level:</strong> {pythonSkillLevel}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Goals:</strong> {learningGoals.join(", ")}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Pace:</strong> {preferredPace}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Learning Style:</strong> {learningStyle}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 1 || loading}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Back
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={next}
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-primary text-white text-sm font-semibold shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-6 py-2 rounded-lg bg-primary text-white text-sm font-semibold shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Your Journey...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Start My Python Journey</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
