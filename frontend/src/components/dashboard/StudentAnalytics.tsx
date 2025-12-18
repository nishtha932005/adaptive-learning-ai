import React, { useEffect, useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { MousePointer, PieChart as PieIcon, BookOpen, Circle, Zap, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

interface StudentAnalyticsProps {
    studiedCredits?: number;
    totalClicks?: number;
    predictedResult?: number;
}

const TOTAL_CREDITS_GOAL = 100;

export default function StudentAnalytics({ studiedCredits = 0, totalClicks = 0, predictedResult = 0 }: StudentAnalyticsProps) {
    // Note: We use the props directly now, served from the Python backend which aligns with the dataset.

    const data = [
        { name: 'Studied Credits', value: studiedCredits, color: '#6366f1' },
        { name: 'Remaining', value: Math.max(0, TOTAL_CREDITS_GOAL - studiedCredits), color: '#e2e8f0' },
    ];

    // Insight Logic aligned to Dataset Fields: studied_credits, final_result, total_clicks
    const insights = useMemo(() => {
        const list = [];

        // 1. Studied Credits Analysis
        if (studiedCredits > 0) {
            list.push({
                icon: TrendingUp,
                color: "text-indigo-500",
                text: `Studied Credits: You have accumulated ${studiedCredits} credits, putting you in the top tier.`
            });
        }

        // 2. Final Result Prediction (Dataset Field: final_result)
        if (predictedResult > 0) {
            list.push({
                icon: CheckCircle2,
                color: "text-emerald-600",
                text: `Final Result Prediction: Based on your activity, you are projected to score ${predictedResult}/100.`
            });
        }

        // 3. Total Clicks Analysis (Dataset Field: total_clicks)
        if (totalClicks > 50) {
            list.push({
                icon: MousePointer,
                color: "text-amber-500",
                text: `Total Clicks: High interaction detected (${totalClicks} clicks). Correlation with result is positive.`
            });
        } else if (totalClicks > 0) {
            list.push({
                icon: MousePointer,
                color: "text-slate-400",
                text: `Total Clicks: ${totalClicks} interactions recorded. Keep engaging to boost prediction.`
            });
        }

        return list;
    }, [studiedCredits, totalClicks]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm h-full flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 z-10">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-indigo-500" />
                    Progress Monitoring
                </h3>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">

                {/* Left: Visualization (4 cols) */}
                <div className="md:col-span-5 relative h-48 md:h-56 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">{studiedCredits}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Credits</span>
                    </div>
                </div>

                {/* Middle: Stats Grid (3 cols) */}
                <div className="md:col-span-3 flex flex-col gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Total Credits</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">{studiedCredits}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Engagement</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">{totalClicks.toLocaleString()}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Goal</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">{TOTAL_CREDITS_GOAL}</div>
                    </div>
                </div>

                {/* Right: AI Insights (4 cols) */}
                <div className="md:col-span-4 h-full flex flex-col justify-center">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Zap className="w-3 h-3" />
                        Live Insights
                    </h4>
                    <div className="space-y-3">
                        {insights.map((insight, i) => (
                            <div key={i} className="flex gap-3 items-start animate-fade-in">
                                <insight.icon className={`w-4 h-4 mt-0.5 shrink-0 ${insight.color}`} />
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-snug">
                                    {insight.text}
                                </p>
                            </div>
                        ))}
                        {insights.length === 0 && (
                            <p className="text-xs text-slate-400 italic">Gathering data...</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
