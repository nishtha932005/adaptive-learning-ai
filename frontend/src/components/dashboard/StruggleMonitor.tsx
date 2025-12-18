import React from "react";
import { Gauge, TrendingUp, AlertTriangle, Brain, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface StruggleMonitorProps {
    understanding: number; // 0-100 (Session specific)
    learningRate: number;  // % increase per period
    struggleLevel: number; // 0-100 (calculated based on errors/friction)
    isRealTime?: boolean;
}

export default function StruggleMonitor({ understanding, learningRate, struggleLevel, isRealTime = true }: StruggleMonitorProps) {
    // Determine status based on understanding
    const getStatus = (score: number) => {
        if (score >= 80) return { label: "Synapse Mastery", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 };
        if (score >= 50) return { label: "Neural Growth", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: TrendingUp };
        return { label: "Cognitive Friction", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: AlertTriangle };
    };

    const status = getStatus(understanding);

    // Circumference for SVG
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const understandingOffset = circumference - (understanding / 100) * circumference;
    const struggleOffset = circumference - (struggleLevel / 100) * circumference;

    return (
        <div className="w-full bg-white dark:bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-4 shadow-xl relative overflow-hidden">
            {/* Background Pulse for "Real-time" feel */}
            {isRealTime && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Live Analysis</span>
                </div>
            )}

            <div className="flex flex-col gap-4">
                {/* Top Header */}
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-500/20">
                        <Brain className="w-3.5 h-3.5 text-violet-500" />
                    </div>
                    <div>
                        <h3 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">Session Intelligence</h3>
                        <p className="text-[9px] text-slate-500 font-medium">Topic-specific cognitive load</p>
                    </div>
                </div>

                {/* Meters Container */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Understanding Gauge */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="relative w-16 h-16">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                                <motion.circle
                                    initial={{ strokeDashoffset: circumference }}
                                    animate={{ strokeDashoffset: circumference - (understanding / 100) * (2 * Math.PI * 28) }}
                                    cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent"
                                    strokeDasharray={2 * Math.PI * 28} strokeLinecap="round" className={status.color}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-xs font-bold ${status.color}`}>{Math.round(understanding)}%</span>
                            </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Understanding</span>
                    </div>

                    {/* Struggle Gauge */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="relative w-16 h-16">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                                <motion.circle
                                    initial={{ strokeDashoffset: circumference }}
                                    animate={{ strokeDashoffset: circumference - (struggleLevel / 100) * (2 * Math.PI * 28) }}
                                    cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent"
                                    strokeDasharray={2 * Math.PI * 28} strokeLinecap="round" className="text-rose-500"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-bold text-rose-500">{Math.round(struggleLevel)}%</span>
                            </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Struggle</span>
                    </div>
                </div>

                {/* Learning Rate & AI Insight */}
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">Learning Rate</span>
                        <span className={`text-[10px] font-bold flex items-center gap-0.5 ${learningRate >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {learningRate >= 0 ? '+' : ''}{learningRate.toFixed(1)}% / min
                        </span>
                    </div>

                    <div className="flex gap-2 items-start">
                        <div className={`mt-0.5 p-0.5 rounded-full ${status.bg} ${status.color}`}>
                            <status.icon className="w-2.5 h-2.5" />
                        </div>
                        <p className="text-[9px] leading-relaxed text-slate-600 dark:text-slate-300 font-medium italic">
                            "{understanding >= 80
                                ? "Optimal neural pathways detected. Ready for advanced boss fights."
                                : struggleLevel > 50
                                    ? "Detected cognitive friction. Try switching to Socratic Mode for clarity."
                                    : "Session baseline established. Accuracy is trending upward."}"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
