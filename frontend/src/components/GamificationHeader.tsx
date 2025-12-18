import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { DashboardStudent } from "../lib/supabase";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function GamificationHeader({
  student,
}: {
  student?: DashboardStudent | null;
}) {
  const xp = student?.xp_points ?? 0;
  const streak = student?.study_streak_days ?? 0;

  // Simple level model for MVP polish
  const { level, current, target, pct } = useMemo(() => {
    const level = Math.max(1, Math.floor(xp / 500) + 1);
    const base = (level - 1) * 500;
    const target = 500 + (level - 1) * 250;
    const current = xp - base;
    const pct = clamp((current / target) * 100, 0, 100);
    return { level, current, target, pct };
  }, [xp]);

  const dailyFocus = clamp(
    Math.round(((student?.modules_finished ?? 0) % 10) * 10),
    0,
    100
  );

  return (
    <div className="px-8 pt-8">
      <div className="card p-5 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/20" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* XP Bar */}
          <div className="md:col-span-7">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-slate-300">XP</p>
                <p className="text-sm text-slate-400">
                  Level <span className="text-white font-semibold">{level}</span>{" "}
                  <span className="text-slate-500">
                    ({current}/{target} XP)
                  </span>
                </p>
              </div>
              <span className="text-xs text-slate-400">{Math.round(pct)}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>

          {/* Streak */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="h-11 w-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400 dark:border-amber-500 flex items-center justify-center"
              >
                <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </motion.div>
              <div>
                <p className="text-xs font-semibold text-slate-300">Streak</p>
                <p className="text-sm text-white font-semibold">
                  {streak} Day{streak === 1 ? "" : "s"} 🔥
                </p>
              </div>
            </div>
          </div>

          {/* Daily Goal */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-start md:justify-end gap-3">
              <div
                className="h-12 w-12 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center"
                style={{
                  backgroundImage: `conic-gradient(rgb(var(--primary-r), var(--primary-g), var(--primary-b)) ${dailyFocus}%, rgb(226, 232, 240) ${dailyFocus}% 100%)`,
                }}
              >
                <div className="h-9 w-9 rounded-full bg-background flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-slate-900 dark:text-white">{dailyFocus}%</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-300">Daily Focus</p>
                <p className="text-[11px] text-slate-400">Today’s goal</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


