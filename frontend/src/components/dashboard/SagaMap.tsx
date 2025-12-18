import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Play, Lock, Sword, Video, HelpCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { getSagaProgress, type SagaNode } from "../../services/sagaService";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

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

export default function SagaMap() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<SagaNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Check if user has personalized saga, if not generate it
        const { data: student } = await supabase
          .from("students")
          .select("account_type, personalized_saga_created, learning_vibe")
          .eq("id", user.id)
          .single();

        // If personal account with saga vibe but no personalized saga, generate it
        if (student?.account_type === "personal" && 
            student?.learning_vibe === "saga" && 
            !student?.personalized_saga_created) {
          setGenerating(true);
          const { generatePersonalizedSaga } = await import("../../services/personalizationService");
          await generatePersonalizedSaga(user.id);
          setGenerating(false);
        }

        const sagaNodes = await getSagaProgress(user.id);
        if (mounted) {
          setNodes(sagaNodes);
        }
      } catch (e: any) {
        console.error("Failed to load saga progress:", e);
        if (mounted) {
          setError(e?.message || "Failed to load your journey");
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
  }, [user?.id]);

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
          Generating Your Personalized Journey
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          AI is crafting your unique learning path...
        </p>
      </div>
    );
  }

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

  if (nodes.length === 0) {
    return (
      <div className="text-sm text-slate-600 dark:text-slate-400 text-center py-8">
        No chapters available. Please contact support.
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

