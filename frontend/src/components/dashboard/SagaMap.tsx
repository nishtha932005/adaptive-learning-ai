import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Play, Lock, Sword, Video, HelpCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import type { SagaNode } from "../../services/sagaService";
import { useAuth } from "../../context/AuthContext";
import { useCourses } from "../../context/CourseContext";

const ONBOARDING_GOAL_STORAGE_KEY = "onboarding_learning_goal";
const AUTO_GENERATE_TIMEOUT_MS = 15000;

function SagaItem({ 
  node, 
  index, 
  totalNodes 
}: { 
  node: SagaNode; 
  index: number;
  totalNodes: number;
}) {
  const navigate = useNavigate();
  const { themeColor } = useTheme();

  const getNodeIcon = () => {
    if (node.status === "completed") {
      return <CheckCircle2 className="w-5 h-5" />;
    }
    if (node.status === "active") {
      if (node.type === "boss_fight") return <Sword className="w-5 h-5" />;
      return <Play className="w-5 h-5" />;
    }
    return <Lock className="w-4 h-4" />;
  };

  const getTypeIcon = () => {
    switch (node.type) {
      case "video":
        return <Video className="w-3 h-3" />;
      case "quiz":
        return <HelpCircle className="w-3 h-3" />;
      case "boss_fight":
        return <Sword className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const handleClick = () => {
    // Allow clicking on active and completed nodes
    if (node.status === "locked") {
      return;
    }

    const courseId = node.action_params?.courseId;
    const moduleIndex = node.action_params?.moduleIndex;
    if (node.action_type === "course" && courseId !== undefined && moduleIndex !== undefined) {
      navigate(`/dashboard/courses/${courseId}/module/${moduleIndex}`);
      return;
    }

    // Navigate to LessonViewer with chapter details
    const params = new URLSearchParams({
      type: node.type === "quiz" ? "quiz" : node.type === "boss_fight" ? "video" : "video",
      topic: node.subtitle || node.title,
      xp: String(node.xp_reward),
      time: String(node.estimated_time_minutes),
    });

    // Add action params if they exist
    if (node.action_params) {
      Object.entries(node.action_params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, String(value));
        }
      });
    }

    // Navigate to lesson viewer with chapter ID
    navigate(`/dashboard/lesson/${node.id}?${params.toString()}`);
  };

  const isClickable = node.status !== "locked";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="flex gap-6 relative pb-12 last:pb-0"
    >
      {/* Vertical Line Connector */}
      {index < totalNodes - 1 && (
        <div className="absolute left-[18px] top-[36px] w-0.5 h-full">
          {node.status === "locked" ? (
            <div className="h-full w-full bg-slate-200 dark:bg-slate-700" />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(to bottom, rgb(34, 197, 94) 0%, rgb(var(--primary-r), var(--primary-g), var(--primary-b)) 50%, rgb(203, 213, 225) 100%)`,
              }}
            />
          )}
        </div>
      )}

      {/* Node Circle */}
      <div className="relative z-10 flex-shrink-0">
        {node.status === "active" ? (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-9 w-9 rounded-full bg-primary border-4 border-white dark:border-slate-800 shadow-lg flex items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-9 w-9 rounded-full bg-primary/20 absolute -inset-2"
            />
            <span className="text-white relative z-10">{getNodeIcon()}</span>
          </motion.div>
        ) : node.status === "completed" ? (
          <div className="h-9 w-9 rounded-full bg-emerald-500 border-2 border-emerald-400 dark:border-emerald-300 shadow-md flex items-center justify-center">
            <span className="text-white">{getNodeIcon()}</span>
          </div>
        ) : (
          <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
            <span className="text-slate-500 dark:text-slate-400">{getNodeIcon()}</span>
          </div>
        )}
      </div>

      {/* Card */}
      <motion.div
        onClick={handleClick}
        whileHover={isClickable ? { scale: 1.02, x: 4 } : {}}
        whileTap={isClickable ? { scale: 0.98 } : {}}
        className={`flex-1 card p-4 transition-all ${
          isClickable
            ? "cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-95"
            : "opacity-60 cursor-not-allowed"
        } ${
          node.status === "active" 
            ? "border-l-4 border-l-primary ring-2 ring-primary/20" 
            : node.status === "completed"
            ? "border-l-4 border-l-emerald-500"
            : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Chapter {node.chapter_number}
              </span>
              <span className="text-slate-400 dark:text-slate-500">{getTypeIcon()}</span>
            </div>
            <h3
              className={`text-base font-bold mb-1 ${
                node.status === "locked"
                  ? "text-slate-400 dark:text-slate-500"
                  : "text-slate-900 dark:text-white"
              }`}
            >
              {node.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              {node.subtitle}
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold">
                ✨ {node.xp_reward} XP
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                ⏱️ {node.estimated_time_minutes}m
              </span>
            </div>
          </div>
          <div className="text-xs text-right">
            {node.status === "locked" && (
              <div className="text-slate-400 dark:text-slate-500">
                <div className="font-medium">Locked</div>
                <div className="text-[10px]">Complete previous chapters</div>
              </div>
            )}
            {node.status === "completed" && (
              <div className="text-emerald-600 dark:text-emerald-400">
                <div className="font-medium">Completed</div>
                <div className="text-[10px]">Click to review</div>
              </div>
            )}
            {node.status === "active" && (
              <div className="text-primary">
                <div className="font-medium">Active</div>
                <div className="text-[10px]">Click to start</div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SagaMap({ onOpenGenerator }: { onOpenGenerator?: () => void }) {
  const { user } = useAuth();
  const { latestGeneratedCourse, addGeneratedCourse } = useCourses();
  const [nodes, setNodes] = useState<SagaNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoGenerateChecked, setAutoGenerateChecked] = useState(false);
  const cognitoUserId = (user as any)?.sub as string | undefined;

  const mapCourseToNodes = (course: any): SagaNode[] => {
    if (!course?.modules?.length) return [];

    return course.modules.map((module: any, index: number) => {
      const chapterCount = Array.isArray(module?.chapters) ? module.chapters.length : 0;
      return {
        id: `generated-${course.id || "course"}-module-${index + 1}`,
        chapter_number: index + 1,
        title: module?.title || `Module ${index + 1}`,
        subtitle: `${chapterCount} chapter${chapterCount === 1 ? "" : "s"}`,
        xp_reward: 400 + index * 50,
        estimated_time_minutes: Math.max(10, chapterCount * 10),
        type: "video",
        prerequisite_chapter_id:
          index > 0 ? `generated-${course.id || "course"}-module-${index}` : null,
        course_id: course.id || "generated-course",
        action_url: null,
        action_type: "course",
        action_params: {
          source: "course-context",
          courseId: course.id || "generated-course",
          moduleIndex: index,
          moduleTitle: module?.title || `Module ${index + 1}`,
        },
        status: index === 0 ? "active" : "locked",
        completed_at: null,
        xp_earned: 0,
        time_spent_minutes: 0,
      } as SagaNode;
    });
  };

  const resolveLearningGoal = (): string => {
    const userAny = user as any;
    const fromUser =
      userAny?.learningGoal ||
      userAny?.learning_goal ||
      userAny?.attributes?.learningGoal ||
      userAny?.attributes?.learning_goal ||
      userAny?.attributes?.["custom:learning_goal"] ||
      "";

    if (typeof fromUser === "string" && fromUser.trim()) {
      return fromUser.trim();
    }

    if (typeof window === "undefined") return "";

    const userScopedId =
      userAny?.sub || userAny?.userId || userAny?.id || userAny?.username || userAny?.signInDetails?.loginId;

    if (userScopedId) {
      const scopedGoal = window.localStorage.getItem(
        `${ONBOARDING_GOAL_STORAGE_KEY}_${userScopedId}`
      );
      if (scopedGoal?.trim()) return scopedGoal.trim();
    }

    return (window.localStorage.getItem(ONBOARDING_GOAL_STORAGE_KEY) || "").trim();
  };

  const handleGenerateFromGoal = async (topic: string, signal?: AbortSignal) => {
    const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";
    const studentId =
      (user as any)?.sub || (user as any)?.userId || (user as any)?.id || (user as any)?.username;

    const response = await fetch(`${API_URL}/api/ai/generate-course`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        topic,
        pace: "blitz",
        student_id: studentId || "anonymous-student",
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload?.detail || "Failed to generate course from your learning goal.");
    }

    const payload = await response.json();
    const generatedCourse = payload?.course;
    const hasModules = Array.isArray(generatedCourse?.modules) && generatedCourse.modules.length > 0;
    if (!hasModules) {
      throw new Error("Generated course is missing modules.");
    }

    return addGeneratedCourse(generatedCourse);
  };

  useEffect(() => {
    const loadRoadmap = async () => {
      setLoading(true);
      setError(null);

      // Branch 1: existing generated course is the source of truth.
      if (latestGeneratedCourse?.modules?.length) {
        const generatedNodes = mapCourseToNodes(latestGeneratedCourse);
        setNodes(generatedNodes);
        setLoading(false);
        setAutoGenerateChecked(true);

        console.debug("[Overview] CourseContext roadmap loaded", {
          userId: cognitoUserId,
          modules: generatedNodes.length,
          courseId: latestGeneratedCourse?.id,
        });
        return;
      }

      // Branch 2: no generated course yet, try auto-generation from user's learning goal.
      const learningGoal = resolveLearningGoal();
      if (learningGoal) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), AUTO_GENERATE_TIMEOUT_MS);

        try {
          const createdCourse = await handleGenerateFromGoal(learningGoal, controller.signal);
          const generatedNodes = mapCourseToNodes(createdCourse);
          setNodes(generatedNodes);
          setAutoGenerateChecked(true);
          setLoading(false);

          console.debug("[Overview] Auto-generated roadmap from learning goal", {
            userId: cognitoUserId,
            learningGoal,
            modules: generatedNodes.length,
            courseId: createdCourse?.id,
          });
          return;
        } catch (e: any) {
          const isAbort = e?.name === "AbortError";
          console.error("[Overview] Failed to auto-generate roadmap", {
            reason: isAbort ? "timeout" : "request-error",
            error: e,
          });

          // Fall back to CTA state instead of blocking Overview with an error.
          setError(null);
        } finally {
          window.clearTimeout(timeoutId);
        }
      }

      // Branch 3: no existing course and no learning goal available.
      setNodes([]);
      setAutoGenerateChecked(true);
      setLoading(false);
    };

    void loadRoadmap();
  }, [addGeneratedCourse, cognitoUserId, latestGeneratedCourse, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
          Loading your journey...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg px-4 py-2">
        {error}
      </div>
    );
  }

  if (nodes.length === 0 && autoGenerateChecked) {
    return (
      <div className="text-center py-8">
        <button
          type="button"
          onClick={onOpenGenerator}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold shadow-sm hover:shadow-md"
        >
          Generate Course to start your roadmap
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          Your Journey
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Follow your path through the learning saga
        </p>
      </div>
      <div className="relative">
        {nodes.map((node, index) => (
          <SagaItem key={node.id} node={node} index={index} totalNodes={nodes.length} />
        ))}
      </div>
    </div>
  );
}

