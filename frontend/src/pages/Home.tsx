import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, PlayCircle, Trophy, Clock, CheckCircle2 } from "lucide-react";
import { getDashboardData, type DashboardData, supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

interface HomeProps {
  onLaunchTutor?: () => void;
}

export default function Home({ onLaunchTutor }: HomeProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizCount, setQuizCount] = useState<number>(0);
  const [avgQuizScore, setAvgQuizScore] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) {
        if (mounted) {
          setError("No authenticated user found");
          setLoading(false);
        }
        return;
      }

      try {
        const result = await getDashboardData(user.id);
        if (mounted) {
          setData(result);
        }

        const { data: quizRows, error: quizError } = await supabase
          .from("assessment_results")
          .select("score")
          .eq("student_id", user.id);
        if (!quizError && quizRows && mounted) {
          const count = quizRows.length;
          setQuizCount(count);
          if (count > 0) {
            const total = quizRows.reduce(
              (sum: number, row: any) => sum + (row.score ?? 0),
              0
            );
            setAvgQuizScore(Math.round(total / count));
          } else {
            setAvgQuizScore(null);
          }
        }
      } catch (e: any) {
        console.error("Failed to load dashboard data", e);
        if (mounted) {
          setError(
            e?.message || "Unable to load your profile. Please try refreshing the page."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const student = data?.student;
  const courses = data?.courses ?? [];
  const primaryCourse = courses[0];
  const otherCourses = courses.slice(1);

  const riskScore = student?.risk_score ?? 0;
  let riskColor = "#22c55e";
  let riskLabel = "On Track";
  let riskTextClass = "text-emerald-400";

  if (riskScore > 70) {
    riskColor = "#fb7185";
    riskLabel = "Struggle Detected";
    riskTextClass = "text-rose-400";
  } else if (riskScore > 30) {
    riskColor = "#eab308";
    riskLabel = "Caution";
    riskTextClass = "text-amber-300";
  }

  const circleStyle: React.CSSProperties = {
    backgroundImage: `conic-gradient(${riskColor} ${riskScore}%, rgba(15,23,42,0.4) ${riskScore}% 100%)`,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-8 grid grid-cols-12 gap-6"
    >
      {error && (
        <div className="col-span-12 text-xs text-rose-400 bg-rose-950/40 border border-rose-700 rounded-lg px-4 py-2">
          {error}
        </div>
      )}
      {/* Widget A: Welcome Header */}
      <section className="col-span-12 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300 dark:text-gray-300">
              Welcome back,
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {student?.full_name ?? "Student"}
            </h1>
            <p className="text-sm text-slate-400 dark:text-gray-400 mt-1">
              You are on a {student?.study_streak_days ?? 0}-day streak! 🔥
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 dark:text-gray-400">
            <span>Cyber-Academia Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Widget B: Current Focus Hero */}
      <section className="col-span-12 md:col-span-8 row-span-2 animate-fade-in">
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl h-full flex flex-col justify-between"
        >
          {primaryCourse && (
            <div
              className="absolute inset-0 opacity-40 bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(to top, rgba(15,23,42,0.9), rgba(15,23,42,0.2)), url(${primaryCourse.thumbnail_url})`,
              }}
            />
          )}
          <div className="relative z-10 p-6 md:p-8 space-y-4">
            <p className="text-xs font-semibold tracking-wide text-primary">
              CURRENT FOCUS
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold max-w-xl">
              {primaryCourse?.title ?? "Choose a course to begin your journey"}
            </h2>
            <p className="text-sm text-slate-200/90 max-w-xl">
              Continue where you left off and let the AI tutor adapt each lesson
              to your current understanding.
            </p>

            {primaryCourse && (
              <div className="mt-4 space-y-2 max-w-md">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Progress</span>
                  <span>{primaryCourse.progress_pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${primaryCourse.progress_pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="relative z-10 p-6 md:p-8 flex items-center justify-between">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AI-Powered Adaptive Path</span>
            </div>
            <button
              type="button"
              onClick={() => primaryCourse ? navigate(`/dashboard/course/${primaryCourse.id}`) : navigate("/dashboard/study")}
              className="relative inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg overflow-hidden"
            >
              <span className="pointer-events-none absolute inset-0 opacity-30">
                <span className="absolute inset-y-0 left-0 w-1/3 bg-white/25 -skew-x-12 animate-shimmer" />
              </span>
              <PlayCircle className="w-4 h-4" />
              Resume Learning
            </button>
          </div>
        </motion.div>
      </section>

      {/* Widget C: AI Risk Analysis */}
      <section className="col-span-12 md:col-span-4 animate-fade-in">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-between h-full transition-transform duration-300 hover:scale-[1.02]">
          <div className="w-full mb-4">
            <p className="text-xs font-semibold tracking-wide text-gray-400 mb-2">
              AI RISK ANALYSIS
            </p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-36 w-36 rounded-full flex items-center justify-center">
              <div className="absolute inset-0 rounded-full" style={circleStyle} />
              <div className="relative h-24 w-24 rounded-full bg-slate-950 flex flex-col items-center justify-center border border-white/10">
                <span className="text-2xl font-semibold">
                  {riskScore || "—"}
                </span>
                <span className="text-xs text-gray-400 mt-1">Risk Score</span>
              </div>
            </div>
            <p className={`text-sm font-medium ${riskTextClass}`}>
              {riskScore
                ? riskLabel
                : "Risk model is warming up. Data will appear soon."}
            </p>
            <p className="text-xs text-gray-400 text-center max-w-xs">
              The system continuously monitors engagement, performance, and overdue
              work to adjust your learning path.
            </p>
          </div>
        </div>
      </section>

      {/* Widget D: Quick Courses */}
      <section className="col-span-12 md:col-span-4 animate-fade-in">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 h-full transition-transform duration-300 hover:scale-[1.02]">
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-wide text-gray-400 mb-1">
              QUICK COURSES
            </p>
            <h2 className="text-sm font-semibold text-white">
              Jump back into learning
            </h2>
          </div>
          <div className="space-y-2">
            {otherCourses.length === 0 && (
              <p className="text-sm text-gray-400">
                Enroll in more courses to see them here.
              </p>
            )}
            {otherCourses.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => navigate(`/dashboard/course/${course.id}`)}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2 bg-slate-900/40 hover:bg-white/5 hover:scale-[1.02] transition-transform text-left"
              >
                <div
                  className="h-10 w-10 rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${course.thumbnail_url})` }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-100">
                    {course.title}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {course.difficulty} • {course.progress_pct}% complete
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Widget E: Gamification + Quiz Stats */}
      <section className="col-span-12 md:col-span-4 animate-fade-in">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 h-full transition-transform duration-300 hover:scale-[1.02]">
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-wide text-gray-400 mb-1">
              GAMIFICATION
            </p>
            <h2 className="text-sm font-semibold text-white">
              Your Learning Stats
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center gap-3 rounded-xl bg-slate-900/40 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total XP</p>
                <p className="font-semibold">
                  {student?.xp_points ?? 0} pts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-900/40 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-sky-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Hours Studied</p>
                <p className="font-semibold">
                  {student?.hours_studied ?? 0} hrs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-900/40 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Modules Finished</p>
                <p className="font-semibold">
                  {student?.modules_finished ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-white/5 pt-4">
            <p className="text-xs font-semibold tracking-wide text-gray-400 mb-2">
              QUIZ ACTIVITY
            </p>
            <div className="flex items-center justify-between text-xs text-gray-300">
              <div>
                <p className="text-[11px] text-gray-400">Quizzes Completed</p>
                <p className="text-sm font-semibold text-white">{quizCount}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Average Score</p>
                <p className="text-sm font-semibold text-white">
                  {avgQuizScore != null ? `${avgQuizScore}%` : "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/dashboard/study")}
                className="ml-4 inline-flex items-center gap-1 rounded-full bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                <PlayCircle className="w-3 h-3" />
                Quiz Me
              </button>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}


