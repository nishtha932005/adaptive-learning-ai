import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Mail, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const message = searchParams.get("message");
    if (message) {
      setSuccessMessage(message);
      // Clear message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message || "Invalid login credentials");
      setLoading(false);
    } else {
      // Successful login - redirect to dashboard
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Aurora background blobs */}
      <div className="pointer-events-none fixed -top-40 -left-32 h-80 w-80 bg-violet-600/20 blur-[100px] rounded-full" />
      <div className="pointer-events-none fixed bottom-[-80px] right-[-80px] h-80 w-80 bg-blue-600/20 blur-[100px] rounded-full" />

      <div className="relative z-10 w-full max-w-md">
        {/* Glass Card */}
        <div className="dark:bg-slate-900/50 bg-white/60 backdrop-blur-xl border dark:border-white/10 border-slate-200 shadow-2xl rounded-2xl p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold dark:text-white text-slate-900 mb-2">
              Access Portal
            </h1>
            <p className="text-sm dark:text-gray-400 text-slate-600">
              Sign in to continue your adaptive learning journey
            </p>
          </div>

          {successMessage && (
            <div className="mb-6 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-700 rounded-lg px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-6 text-xs text-rose-400 bg-rose-950/40 border border-rose-700 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold dark:text-gray-300 text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-gray-400 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="student@adaptive-learning.dev"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border dark:border-white/10 border-slate-300 dark:bg-slate-950/60 bg-white/60 dark:text-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold dark:text-gray-300 text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-gray-400 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border dark:border-white/10 border-slate-300 dark:bg-slate-950/60 bg-white/60 dark:text-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/20 transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Access Portal"
              )}
            </button>
          </form>

          {/* Secondary Link */}
          <div className="mt-6 text-center text-sm">
            <span className="dark:text-gray-400 text-slate-600">New student? </span>
            <Link
              to="/signup"
              className="font-semibold dark:text-violet-400 text-violet-600 hover:underline"
            >
              Enroll Here
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs dark:text-gray-500 text-slate-500">
          Secured by Supabase Auth • Demo Mode
        </div>
      </div>
    </div>
  );
}

