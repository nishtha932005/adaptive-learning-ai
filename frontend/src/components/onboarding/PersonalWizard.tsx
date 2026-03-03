import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Loader2, Sparkles, Target, Zap, ArrowRight, ArrowLeft, Mail } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

interface PersonalWizardProps {
  onComplete: () => void;
  initialStep?: Step;
  initialEmail?: string;
  initialMessage?: string | null;
}

export default function PersonalWizard({
  onComplete,
  initialStep = 1,
  initialEmail = "",
  initialMessage = null,
}: PersonalWizardProps) {
  const { user, signUp, confirmSignUp, resendSignUpCode } = useAuth();
  const { themeColor } = useTheme();
  const [step, setStep] = useState<Step>(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialMessage);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  // Form state
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [goal, setGoal] = useState("");
  const [vibe, setVibe] = useState<"saga" | "bootcamp" | "academic" | null>(null);
  const [pace, setPace] = useState<"blitz" | "moderate" | "deep" | null>(null);
  const [verificationCode, setVerificationCode] = useState("");

  const next = async () => {
    setError(null);
    setSuccessMessage(null);

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

      if (!user) {
        setLoading(true);
        const { error: signUpError } = await signUp(email, password, fullName);

        if (signUpError) {
          const message = signUpError.message || "Failed to create account";

          if (message.toLowerCase().includes("already exists")) {
            const { error: resendError } = await resendSignUpCode(email);
            if (!resendError) {
              setSuccessMessage(
                "Account exists but is not verified. Verification code sent to your email."
              );
              setLoading(false);
              setStep(4);
              return;
            }
          }

          setError(message);
          setLoading(false);
          return;
        }
        setSuccessMessage("Account created. Complete your setup and verify your email.");
        setLoading(false);
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

    if (step === 4 && !isVerified) {
      setError("Please verify your email before completing setup.");
      return;
    }

    // Move to next step or complete
    if (step < 4) {
      setStep((s) => (s + 1) as Step);
    } else {
      onComplete();
    }
  };

  const back = () => {
    setError(null);
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
    }
  };

  const handleVerifyCode = async () => {
    const normalizedEmail = email.trim();
    const normalizedCode = verificationCode.trim();

    if (!normalizedEmail) {
      setError("Please enter your email address");
      return;
    }
    if (!normalizedCode) {
      setError("Please enter the verification code");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { error: confirmError } = await confirmSignUp(normalizedEmail, normalizedCode);
    if (confirmError) {
      setError(confirmError.message || "Failed to verify code");
      setLoading(false);
      return;
    }

    setIsVerified(true);
    setSuccessMessage("Account verified successfully.");
    setLoading(false);
  };

  const handleResendCode = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError(null);
    const { error: resendError } = await resendSignUpCode(normalizedEmail);
    if (resendError) {
      setError(resendError.message || "Failed to resend verification code");
      setLoading(false);
      return;
    }

    setSuccessMessage("Verification code sent. Check your email.");
    setLoading(false);
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
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full transition-all ${step >= s ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                  }`}
              />
            ))}
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-2">
            {successMessage}
          </div>
        )}

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

          {/* Step 4: Verify Email */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Verify Your Email
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Enter the verification code sent to your email before completing setup.
                </p>
              </div>

              <div className="space-y-4">
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
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    placeholder="Enter verification code"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={loading || isVerified}
                    className="flex-1 px-6 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerified ? "Verified" : "Verify Code"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="flex-1 px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Step {step} of 4
          </div>
          <button
            onClick={next}
            disabled={
              loading ||
              (step === 1 && (!goal || !goal.trim() || (!user && (!email?.trim() || !password || password.length < 6 || !fullName?.trim())))) ||
              (step === 2 && !vibe) ||
              (step === 3 && !pace) ||
              (step === 4 && !isVerified)
            }
            className="px-6 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up...
              </>
            ) : step === 4 ? (
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

