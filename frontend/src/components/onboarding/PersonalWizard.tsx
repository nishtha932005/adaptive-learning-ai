import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../context/ThemeContext";
import { Loader2, Sparkles, Target, Zap, BookOpen, ArrowRight, ArrowLeft } from "lucide-react";

type Step = 1 | 2 | 3;

interface PersonalWizardProps {
  onComplete: () => void;
}

export default function PersonalWizard({ onComplete }: PersonalWizardProps) {
  const { user, signUp } = useAuth();
  const { themeColor } = useTheme();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [goal, setGoal] = useState("");
  const [vibe, setVibe] = useState<"saga" | "bootcamp" | "academic" | null>(null);
  const [pace, setPace] = useState<"blitz" | "moderate" | "deep" | null>(null);

  const next = () => {
    setError(null);

    // Step 1 validation
    if (step === 1) {
      if (!goal || !goal.trim()) {
        setError("Please tell us what you're building");
        return;
      }
      // Only check email/password/fullName if user is not logged in
      if (!user) {
        if (!email || !email.trim()) {
          setError("Please enter your email address");
          return;
        }
        if (!password || password.length < 6) {
          setError("Please enter a password (minimum 6 characters)");
          return;
        }
        if (!fullName || !fullName.trim()) {
          setError("Please enter your full name");
          return;
        }
      }
    }

    // Step 2 validation
    if (step === 2 && !vibe) {
      setError("Please select your preferred learning style");
      return;
    }

    // Step 3 validation
    if (step === 3 && !pace) {
      setError("Please select your learning pace");
      return;
    }

    // Move to next step or complete
    if (step < 3) {
      setStep((s) => (s + 1) as Step);
    } else {
      handleComplete();
    }
  };

  const back = () => {
    setError(null);
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
    }
  };

  const handleComplete = async () => {
    // Validate wizard steps
    if (!goal || !goal.trim()) {
      setError("Please tell us what you're building");
      return;
    }
    if (!vibe) {
      setError("Please select your preferred learning style");
      return;
    }
    if (!pace) {
      setError("Please select your learning pace");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create account if not logged in
      let userId = user?.id;
      let needsEmailConfirmation = false;

      if (!userId) {
        // Validate required fields before signup (only if not logged in)
        if (!email || !email.trim()) {
          setError("Please enter your email address");
          setLoading(false);
          return;
        }
        if (!password || password.length < 6) {
          setError("Please enter a password (minimum 6 characters)");
          setLoading(false);
          return;
        }
        if (!fullName || !fullName.trim()) {
          setError("Please enter your full name");
          setLoading(false);
          return;
        }

        const { error: signUpError, data: signUpData } = await signUp(email, password, fullName);

        if (signUpError) {
          setError(signUpError.message || "Failed to create account");
          setLoading(false);
          return;
        }

        // Check if email confirmation is required
        if (signUpData?.user && !signUpData.user.email_confirmed_at) {
          needsEmailConfirmation = true;
          userId = signUpData.user.id;
        } else if (signUpData?.user) {
          userId = signUpData.user.id;
        }
      }

      if (!userId) {
        setError("Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      // Ensure we have an active session before proceeding
      let session = null;
      if (!user) {
        // Wait for session to be established after signup
        for (let i = 0; i < 10; i++) {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            session = currentSession;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!session) {
          // If no session but we have userId, try to get user
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) {
            setError("Please check your email to verify your account, then sign in.");
            setLoading(false);
            return;
          }
        }
      } else {
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        session = currentSession;
      }

      // Wait for student record to be created by trigger (check with retries)
      let studentExists = false;
      for (let i = 0; i < 15; i++) {
        try {
          // Ensure we have a valid session before querying
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession && !user) {
            // No session yet, wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          const { data: studentCheck, error: checkError } = await supabase
            .from("students")
            .select("id")
            .eq("id", userId)
            .maybeSingle();

          if (studentCheck && !checkError) {
            studentExists = true;
            break;
          }

          // Handle various error codes
          if (checkError) {
            const errorMsg = checkError.message || checkError.code || "";
            console.log(`Attempt ${i + 1}: ${errorMsg}`);

            // If we get auth errors (401, 406), wait for session to establish
            if (checkError.code === "PGRST301" ||
              errorMsg.includes("401") ||
              errorMsg.includes("406") ||
              errorMsg.includes("row-level security") ||
              errorMsg.includes("RLS")) {
              await new Promise(resolve => setTimeout(resolve, 1500));
              continue;
            }
          }
        } catch (e: any) {
          console.log(`Attempt ${i + 1} error:`, e?.message || e);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // If student record doesn't exist after waiting, try to create it
      // But only if we have a valid session
      if (!studentExists && session) {
        // Get user email and name from auth if not provided in form
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userEmail = email || authUser?.email || "";
        const userName = fullName || authUser?.user_metadata?.full_name || authUser?.email?.split("@")[0] || "User";

        const { error: createError, data: createdData } = await supabase
          .from("students")
          .insert({
            id: userId,
            email: userEmail,
            full_name: userName,
            account_type: "personal",
            onboarding_completed: false,
          })
          .select()
          .single();

        if (createError) {
          // Check if it's a duplicate key error (record was created by trigger)
          if (createError.code === "23505" || createError.message?.includes("duplicate")) {
            // Record exists now, continue
            studentExists = true;
          } else {
            // If it's an RLS error, the trigger should have created it
            // Try one more time to check
            await new Promise(resolve => setTimeout(resolve, 2000));
            const { data: finalCheck } = await supabase
              .from("students")
              .select("id")
              .eq("id", userId)
              .maybeSingle();

            if (!finalCheck) {
              console.error("Student record creation failed:", createError);
              // Don't throw - continue anyway, the trigger might create it later
              // Or the user might need to verify email first
              if (needsEmailConfirmation) {
                setError("Account created! Please check your email to verify, then sign in to complete setup.");
                setLoading(false);
                return;
              }
            } else {
              studentExists = true;
            }
          }
        } else if (createdData) {
          studentExists = true;
        }
      } else if (!studentExists && !session) {
        // No session and no student record - user needs to verify email
        setError("Please check your email to verify your account, then sign in to complete setup.");
        setLoading(false);
        return;
      }

      // Step 2: Save learning preferences (Skipped - now stored directly in students table)
      // The learning_preferences table was deprecated in favor of storing preferences on the student record directly.


      // Step 3: Update student account
      const { error: updateError } = await supabase
        .from("students")
        .update({
          account_type: "personal",
          learning_goal: goal,
          learning_vibe: vibe,
          learning_pace: pace,
          onboarding_completed: true,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Update error:", updateError);
        // Don't throw - try to continue anyway
        // The update might fail if columns don't exist yet, but preferences are saved
      }

      // Step 4: Generate personalized saga if vibe is "saga"
      if (vibe === "saga") {
        try {
          const { generatePersonalizedSaga } = await import("../../services/personalizationService");
          await generatePersonalizedSaga(userId);
        } catch (sagaError: any) {
          console.error("Failed to generate personalized saga:", sagaError);
          // Don't block completion - saga can be generated later on dashboard
        }
      }

      // If email confirmation is needed, show message and redirect to login
      if (needsEmailConfirmation) {
        setLoading(false);
        setError(null);
        alert("Account created! Please check your email to verify your account, then sign in.");
        setTimeout(() => {
          onComplete();
        }, 100);
        return;
      }

      // Check if user is signed in
      const { data: { session: finalSession } } = await supabase.auth.getSession();

      setLoading(false);

      if (finalSession?.user) {
        // User is signed in, navigate to dashboard
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      } else {
        // Not signed in, redirect to login with success message
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    } catch (e: any) {
      console.error("Setup error:", e);
      setError(e?.message || "Failed to complete setup. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl card p-8 md:p-10"
      >
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={back}
            disabled={step === 1}
            className="text-sm text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full transition-all ${step >= s ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                  }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: The Goal */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  What are you building?
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Tell us your learning goal to personalize your journey
                </p>
              </div>

              {!user && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Your name"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your@email.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Your Learning Goal
                </label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., Building a Full Stack App, Passing Python Certification Exam, Learning Machine Learning..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </motion.div>
          )}

          {/* Step 2: The Vibe */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Choose Your Learning Vibe
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Select the style that matches how you learn best
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setVibe("saga")}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${vibe === "saga"
                      ? "border-primary bg-primary/10 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
                    }`}
                >
                  <div className="text-3xl mb-3">🎮</div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">The Saga</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Gamified RPG map with XP, streaks, and epic quests
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setVibe("bootcamp")}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${vibe === "bootcamp"
                      ? "border-primary bg-primary/10 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
                    }`}
                >
                  <div className="text-3xl mb-3">⚡</div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">The Bootcamp</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Fast-paced checklist view, no fluff, maximum efficiency
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setVibe("academic")}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${vibe === "academic"
                      ? "border-primary bg-primary/10 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
                    }`}
                >
                  <div className="text-3xl mb-3">📚</div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">The Academic</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Theory-heavy, textbook-style cards with deep dives
                  </p>
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: The Pace */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  How much time do you have?
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This helps us tailor the content depth
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setPace("blitz")}
                  className={`w-full p-6 rounded-xl border-2 transition-all text-left ${pace === "blitz"
                      ? "border-primary bg-primary/10 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">Blitz Mode</h3>
                    <span className="text-xs text-slate-500">15-30 min/day</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Quick summaries and key concepts only
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPace("moderate")}
                  className={`w-full p-6 rounded-xl border-2 transition-all text-left ${pace === "moderate"
                      ? "border-primary bg-primary/10 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">Moderate Pace</h3>
                    <span className="text-xs text-slate-500">1-2 hours/day</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Balanced learning with practice exercises
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPace("deep")}
                  className={`w-full p-6 rounded-xl border-2 transition-all text-left ${pace === "deep"
                      ? "border-primary bg-primary/10 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">Deep Dive</h3>
                    <span className="text-xs text-slate-500">2+ hours/day</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Detailed modules with quizzes and projects
                  </p>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Step {step} of 3
          </div>
          <button
            onClick={next}
            disabled={
              loading ||
              (step === 1 && (!goal || !goal.trim() || (!user && (!email?.trim() || !password || password.length < 6 || !fullName?.trim())))) ||
              (step === 2 && !vibe) ||
              (step === 3 && !pace)
            }
            className="px-6 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up...
              </>
            ) : step === 3 ? (
              <>
                <span>Complete Setup</span>
                <Sparkles className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

