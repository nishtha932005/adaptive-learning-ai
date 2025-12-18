import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { orgService, Assignment } from "../../services/orgService";
import { BookOpen, Calendar, Clock, AlertCircle } from "lucide-react";

export default function AssignmentsFeed({ onStart }: { onStart?: () => void }) {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        loadAssignments();
    }, [user]);

    const loadAssignments = async () => {
        try {
            const data = await orgService.getStudentAssignments(user!.id);
            setAssignments(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-8 text-slate-500">Loading assignments...</div>;

    if (assignments.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <p>No assignments yet.</p>
                <p className="text-xs">Your mentor hasn't assigned any courses.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    Your Assignments
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Mandatory courses assigned by your class mentor
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map((assignment) => (
                    <div key={assignment.id} className="card p-4 border-l-4 border-l-orange-500 hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-2 right-2 flex gap-2">
                            <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                Mandatory
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${assignment.status === 'completed'
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                                }`}>
                                {assignment.status.replace('_', ' ')}
                            </span>
                        </div>

                        <h3 className="font-bold text-slate-900 dark:text-white mt-4 mb-2 pr-8 truncate">
                            {assignment.course?.title || "Untitled Course"}
                        </h3>

                        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                            {assignment.due_date && (
                                <div className="flex items-center gap-2 text-rose-500 font-medium">
                                    <Calendar className="w-3 h-3" />
                                    Due: {new Date(assignment.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                <span>Assigned {new Date(assignment.assigned_at!).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => onStart?.()}
                            className="mt-4 w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
                        >
                            Start Assignment
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
