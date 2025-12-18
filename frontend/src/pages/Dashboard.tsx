import React, { useEffect, useMemo, useState } from "react";
import { Clock, Target, CheckCircle2, Sparkles, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getDashboardData, type DashboardData } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import { FloatCard } from "../components/FloatCard";
import { Clickable } from "../components/Clickable";
import SagaMap from "../components/dashboard/SagaMap";
import BootcampView from "../components/dashboard/BootcampView";
import AcademicView from "../components/dashboard/AcademicView";
import StudentAnalytics from "../components/dashboard/StudentAnalytics";
import AssignmentsFeed from "../components/dashboard/AssignmentsFeed";
import AICourseGenerator from "../components/AICourseGenerator";
import { getActiveChapter } from "../services/sagaService";

type QuestKey = "quiz" | "watch" | "study";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questDone, setQuestDone] = useState<Record<QuestKey, boolean>>({
    quiz: false,
    watch: false,
    study: false,
  });
  const [sparkQuest, setSparkQuest] = useState<QuestKey | null>(null);
  const [manualCredits, setManualCredits] = useState(0);
  const [studentStatus, setStudentStatus] = useState<any>(null);

  // Fetch Python Backend Status
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/student/status')
      .then(res => res.json())
      .then(data => setStudentStatus(data))
      .catch(err => console.error("Failed to fetch student status:", err));
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const result = await getDashboardData(user.id);
        if (mounted) setData(result);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Unable to load dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const student = data?.student;
  const courses = data?.courses ?? [];
  const primaryCourse = courses[0];
  const [activeQuest, setActiveQuest] = useState<any>(null);
  const [accountType, setAccountType] = useState<"personal" | "organizational" | null>(null);
  const [learningVibe, setLearningVibe] = useState<"saga" | "bootcamp" | "academic" | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);

  // Fetch user account type and preferences, generate personalized content if needed
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) {
        // Set defaults if no user
        setAccountType("personal");
        setLearningVibe("saga");
        return;
      }

      try {
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("account_type, learning_vibe, organization_id, personalized_saga_created")
          .eq("id", user.id)
          .maybeSingle();

        if (studentError) {
          console.error("Error fetching student data:", studentError);
          // Set defaults on error
          if (mounted) {
            setAccountType("personal");
            setLearningVibe("saga");
          }
          return;
        }

        if (mounted) {
          if (studentData) {
            const accountType = studentData.account_type || "personal";
            const learningVibe = studentData.learning_vibe || "saga";

            setAccountType(accountType);
            setLearningVibe(learningVibe);

            if (studentData.organizations) {
              setOrgName((studentData.organizations as any).name);
            }

            // If account is organizational, fetch org name separately to avoid FK issues
            if (accountType === "organizational" && studentData.organization_id) {
              supabase
                .from("organizations")
                .select("name")
                .eq("id", studentData.organization_id)
                .single()
                .then(({ data: orgData }) => {
                  if (orgData) setOrgName(orgData.name);
                })
                .catch(err => console.error("Failed to fetch org name:", err));
            }

            // Generate personalized saga if personal account and not yet generated
            if (accountType === "personal" && !studentData.personalized_saga_created && learningVibe === "saga") {
              try {
                // Import and call the personalization service
                const { generatePersonalizedSaga } = await import("../services/personalizationService");
                await generatePersonalizedSaga(user.id);
              } catch (sagaError) {
                console.error("Failed to generate personalized saga:", sagaError);
                // Don't block - continue with default saga
              }
            }
          } else {
            // No student data found, set defaults
            setAccountType("personal");
            setLearningVibe("saga");
          }
        }
      } catch (e) {
        console.error("Failed to load user preferences:", e);
        // Set defaults on error
        if (mounted) {
          setAccountType("personal");
          setLearningVibe("saga");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Fetch active quest from saga (only for saga vibe)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id || learningVibe !== "saga") return;
      try {
        const active = await getActiveChapter(user.id);
        if (mounted) setActiveQuest(active);
      } catch (e) {
        console.error("Failed to load active quest:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id, learningVibe]);

  const [secondsToday, setSecondsToday] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setSecondsToday((s) => s + 7), 3000);
    return () => window.clearInterval(id);
  }, []);
  const timeLabel = useMemo(() => {
    const mins = Math.floor(secondsToday / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs <= 0 && remMins <= 0) return "Just started";
    if (hrs <= 0) return `${remMins}m today`;
    return `${hrs}h ${remMins}m today`;
  }, [secondsToday]);

  const handleQuestToggle = (key: QuestKey) => {
    setQuestDone((prev) => ({ ...prev, [key]: !prev[key] }));
    setSparkQuest(key);
    window.setTimeout(() => setSparkQuest(null), 700);
  };

  return (
    <div className="p-8 grid grid-cols-12 gap-8">
      {error && (
        <div className="col-span-12 text-xs text-rose-400 bg-rose-950/40 border border-rose-700 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <header className="col-span-12 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
              Learning Journey
            </p>
            {accountType === "organizational" && orgName && (
              <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {orgName}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white">
            {student?.full_name ? `${student.full_name}'s Path` : "Your Learning Path"}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {accountType === "organizational"
              ? "Follow your assigned courses and complete your learning objectives."
              : learningVibe === "saga"
                ? "Follow your adaptive path, complete quests, and keep your streak blazing."
                : learningVibe === "bootcamp"
                  ? "Fast-track your learning with focused, high-intensity courses."
                  : "Deep dive into comprehensive, theory-rich learning materials."}
          </p>
        </div>
        {accountType === "personal" && (
          <button
            onClick={() => setShowGenerator(true)}
            className="px-4 py-2 rounded-lg bg-primary text-white font-semibold text-sm flex items-center gap-2 hover:shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Generate Course
          </button>
        )}
      </header>

      {/* Main Content Area - Conditional Rendering */}
      <section className="col-span-12 lg:col-span-8">
        <FloatCard className="px-6 py-6 md:px-8 md:py-8 h-full">
          {accountType === "organizational" ? (
            <AssignmentsFeed onStart={() => setManualCredits(c => c + 5)} />
          ) : (
            <>
              {learningVibe === "saga" && <SagaMap />}
              {learningVibe === "bootcamp" && <BootcampView courses={courses} />}
              {learningVibe === "academic" && <AcademicView courses={courses} />}
              {!learningVibe && (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                  <p className="text-sm">Loading your learning view...</p>
                </div>
              )}
            </>
          )}
        </FloatCard>
      </section>

      {/* Right: HUD & Analytics */}
      <section className="col-span-12 lg:col-span-4 space-y-6">

        {/* Student Analytics (New Request) */}
        <div className="h-96">
          <StudentAnalytics
            studiedCredits={studentStatus?.studied_credits || (Object.values(questDone).filter(Boolean).length * 10) + manualCredits}
            totalClicks={studentStatus?.total_clicks || 0}
            predictedResult={studentStatus?.predicted_final_result || 0}
          />
        </div>

        {/* Current Quest */}
        {activeQuest && (
          <FloatCard className="overflow-hidden border-l-4 border-l-primary">
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Current Quest
                </p>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {activeQuest.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {activeQuest.subtitle}
              </p>
              <div className="flex items-center gap-4 text-xs mb-4">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold">
                  ✨ {activeQuest.xp_reward} XP
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  ⏱️ {activeQuest.estimated_time_minutes}m
                </span>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{timeLabel}</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>
                      Streak: {student?.study_streak_days ?? 0} day
                      {(student?.study_streak_days ?? 0) === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </FloatCard>
        )}

        {/* Quest Log */}
        <FloatCard>
          <div className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">Daily Quest Log</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Complete these to boost streak and earn bonus XP.
                </p>
              </div>
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-2">
              {[
                { key: "quiz" as QuestKey, label: "Complete 1 adaptive quiz" },
                { key: "watch" as QuestKey, label: "Watch 10 minutes of content" },
                { key: "study" as QuestKey, label: "Spend 20+ minutes in Study Room" },
              ].map((quest) => {
                const done = questDone[quest.key];
                const highlight = sparkQuest === quest.key;
                return (
                  <Clickable
                    key={quest.key}
                    as="button"
                    onClick={() => handleQuestToggle(quest.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all border ${done
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-5 w-5 rounded flex items-center justify-center border-2 ${done
                          ? "bg-emerald-500 border-emerald-600 text-white"
                          : "border-slate-300 dark:border-slate-600"
                          }`}
                      >
                        {done && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <span className={`text-xs ${done ? "text-emerald-700 dark:text-emerald-300" : "text-slate-700 dark:text-slate-300"}`}>{quest.label}</span>
                    </div>
                    {highlight && (
                      <span className="relative inline-flex h-5 w-10 overflow-hidden rounded-full border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
                        <span className="absolute inset-y-0 left-[-40%] w-1/2 bg-gradient-to-r from-transparent via-amber-300 to-transparent animate-shimmer" />
                      </span>
                    )}
                  </Clickable>
                );
              })}
            </div>
          </div>
        </FloatCard>
      </section>

      {/* AI Course Generator Modal */}
      {accountType === "personal" && (
        <AICourseGenerator
          isOpen={showGenerator}
          onClose={() => setShowGenerator(false)}
          onCourseGenerated={() => {
            // Refresh dashboard data
            if (user?.id) {
              getDashboardData(user.id).then(setData).catch(console.error);
            }
          }}
        />
      )}
    </div>
  );
}


