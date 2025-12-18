import React from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Sparkles, TrendingUp, Zap, ArrowRight } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="pointer-events-none fixed -top-40 -left-32 h-96 w-96 bg-violet-600/20 blur-[120px] rounded-full animate-pulse" />
      <div className="pointer-events-none fixed top-1/2 right-[-100px] h-96 w-96 bg-cyan-600/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="pointer-events-none fixed bottom-[-100px] left-1/3 h-96 w-96 bg-blue-600/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold">Adaptive Learning</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/20 hover:scale-[1.02] transition-all"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Powered by Gemini AI & Machine Learning</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Learning That
            <span className="block bg-gradient-to-r from-violet-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Adapts to You
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Experience personalized education that detects your struggles in real-time
            and automatically adjusts content difficulty using advanced AI.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate("/signup")}
              className="group px-8 py-4 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-950 font-bold text-lg shadow-2xl shadow-violet-500/30 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              Start Learning Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-4 rounded-xl bg-slate-800/50 backdrop-blur border border-white/10 text-white font-semibold text-lg hover:bg-slate-800/70 transition-all"
            >
              Watch Demo
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-32">
          <div className="group bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-8 hover:border-violet-500/30 transition-all hover:scale-[1.02]">
            <div className="h-14 w-14 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
              <Brain className="w-7 h-7 text-violet-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI-Powered Tutor</h3>
            <p className="text-gray-400 text-sm">
              Gemini AI generates personalized explanations based on your learning style and current understanding level.
            </p>
          </div>

          <div className="group bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-8 hover:border-cyan-500/30 transition-all hover:scale-[1.02]">
            <div className="h-14 w-14 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
              <TrendingUp className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Real-Time Analytics</h3>
            <p className="text-gray-400 text-sm">
              ML algorithms detect struggle patterns and automatically adjust course difficulty before you fall behind.
            </p>
          </div>

          <div className="group bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-8 hover:border-blue-500/30 transition-all hover:scale-[1.02]">
            <div className="h-14 w-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
              <Zap className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Adaptive Content</h3>
            <p className="text-gray-400 text-sm">
              Dynamic lesson plans that evolve with your progress, keeping you in the optimal learning zone every step.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold mb-12">Proven Results</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                3.5x
              </div>
              <p className="text-gray-400">Faster Learning Speed</p>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
                92%
              </div>
              <p className="text-gray-400">Student Retention Rate</p>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-2">
                85%
              </div>
              <p className="text-gray-400">Improved Test Scores</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="relative z-10 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Ready to transform your learning?</h3>
            <p className="text-gray-400">Join thousands of students already learning smarter.</p>
          </div>
          <button
            onClick={() => navigate("/signup")}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-950 font-bold shadow-xl shadow-violet-500/20 hover:scale-[1.02] transition-all whitespace-nowrap"
          >
            Start Free Today
          </button>
        </div>
      </div>
    </div>
  );
}

