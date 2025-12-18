import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, User, Loader2, Rocket, Building2, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import PersonalWizard from "../components/onboarding/PersonalWizard";

type SignupMode = "select" | "personal" | "organizational";

export default function Signup() {
  const [mode, setMode] = useState<SignupMode>("select");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [orgInfo, setOrgInfo] = useState<{ id: string; name: string } | null>(null);
  const { signUp } = useAuth();
  const { themeColor } = useTheme();
  const navigate = useNavigate();

  const verifyClassCode = async (code: string) => {
    setVerifyingCode(true);
    setError(null);
    try {
      const { data, error: verifyError } = await supabase.rpc("verify_class_code", {
        code: code.toUpperCase().trim(),
      });

      if (verifyError || !data || data.length === 0) {
        setError("Invalid class code. Please check and try again.");
        setVerifyingCode(false);
        return false;
      }

      setOrgInfo({ id: data[0].id, name: data[0].name });
      setVerifyingCode(false);
      return true;
    } catch (e: any) {
      setError("Failed to verify class code. Please try again.");
      setVerifyingCode(false);
      return false;
    }
  };

  const handleClassCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await verifyClassCode(classCode);
    if (isValid) {
      setMode("organizational");
    }
  };

  const handleOrganizationalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgInfo) {
      setError("Please verify your class code first");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Sign up with Supabase
      const { error: signUpError, data } = await signUp(email, password, fullName);

      if (signUpError) {
        setError(signUpError.message || "Signup failed");
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Join organization
        const { error: joinError } = await supabase.rpc("join_organization", {
          student_uuid: data.user.id,
          org_uuid: orgInfo.id,
        });

        if (joinError) {
          console.error("Failed to join organization:", joinError);
          setError("Account created but failed to join organization. Please contact support.");
          setLoading(false);
          return;
        }

        // Update student with class code
        await supabase
          .from("students")
          .update({ class_code: classCode.toUpperCase().trim() })
          .eq("id", data.user.id);

        // Redirect to login
        navigate("/login?message=Account created successfully. Please sign in.");
      }
    } catch (e: any) {
      setError(e?.message || "Signup failed");
      setLoading(false);
    }
  };

  if (mode === "personal") {
    return (
      <PersonalWizard
        onComplete={async () => {
          // Check if user is signed in, if so go to dashboard, otherwise login
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            navigate("/dashboard");
          } else {
            navigate("/login?message=Account created! Please sign in to continue.");
          }
        }}
      />
    );
  }

  if (mode === "select") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Choose Your Learning Path
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Select how you want to start your learning journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Independent Learner Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setMode("personal")}
              className="card p-8 cursor-pointer hover:shadow-lg transition-all group"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Rocket className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Independent Learner
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  I want to master skills at my own pace using AI.
                </p>
                <div className="flex items-center gap-2 text-primary font-semibold text-sm mt-4">
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>

            {/* Join Classroom Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-8 cursor-pointer hover:shadow-lg transition-all group"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Join a Classroom
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  I have a Class Code from my Mentor.
                </p>
                <form onSubmit={handleClassCodeSubmit} className="w-full mt-4 space-y-3">
                  <input
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    placeholder="Enter Class Code"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {error && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={verifyingCode || !classCode}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-4 py-2 rounded-lg bg-primary text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {verifyingCode ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <span>Verify Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Organizational signup form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md card p-8"
      >
        <div className="mb-6">
          <button
            onClick={() => {
              setMode("select");
              setError(null);
              setOrgInfo(null);
            }}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary mb-4"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Join {orgInfo?.name}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Complete your registration to join the classroom
          </p>
        </div>

        {error && (
          <div className="mb-4 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleOrganizationalSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Your full name"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="student@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 rounded-lg bg-primary text-white font-semibold text-sm shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Join Classroom"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
