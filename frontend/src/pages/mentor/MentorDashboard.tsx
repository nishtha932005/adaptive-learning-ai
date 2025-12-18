import React, { useEffect, useState } from "react";
import {
    Users,
    TrendingDown,
    AlertTriangle,
    Search,
    Plus,
    BookOpen,
    Calendar
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { orgService, TeacherStudent, Organization } from "../../services/orgService";
import { supabase } from "../../lib/supabase";
import { motion } from "framer-motion";

export default function MentorDashboard() {
    const { user } = useAuth();
    const [students, setStudents] = useState<TeacherStudent[]>([]);
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Assignment Manager State
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        if (!user) return;
        loadDashboard();
    }, [user]);

    useEffect(() => {
        if (selectedOrgId) {
            loadStudents(selectedOrgId);
        }
    }, [selectedOrgId]);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const myOrgs = await orgService.getMyOrganizations(user!.id);
            setOrgs(myOrgs || []);

            if (myOrgs && myOrgs.length > 0) {
                setSelectedOrgId(myOrgs[0].id);
            }

            // Load available courses for assignment
            const { data: allCourses } = await supabase.from("courses").select("id, title");
            setCourses(allCourses || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadStudents = async (orgId: string) => {
        const data = await orgService.getOrgStudents(orgId);
        setStudents(data);
    };

    const handleAssign = async () => {
        if (!selectedOrgId || !selectedCourse) return;
        setAssigning(true);
        try {
            const count = await orgService.assignCourseToOrg(selectedOrgId, selectedCourse, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()); // Due in 7 days
            alert(`Course Assigned to ${count} Students`);
        } catch (e) {
            alert("Failed to assign course");
        } finally {
            setAssigning(false);
        }
    };

    const getRiskColor = (score: number) => {
        if (score > 80) return "text-red-600 bg-red-50 dark:bg-red-900/20";
        if (score > 50) return "text-orange-600 bg-orange-50 dark:bg-orange-900/20";
        return "text-slate-600 dark:text-slate-300";
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Mentor Dashboard</h1>
                    <p className="text-slate-500 dark:text-slate-400">Overview for {orgs.find(o => o.id === selectedOrgId)?.name || "Class"}</p>
                </div>
                <div className="flex gap-4">
                    <select
                        className="px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 font-medium"
                        value={selectedOrgId || ""}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                    >
                        {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                        <Plus className="w-4 h-4" /> New Class
                    </button>
                </div>
            </header>

            {/* Widget A: Class Health */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <HealthCard
                    title="Total Students"
                    value={students.length}
                    trend="+2 this week"
                    icon={<Users className="text-orange-600 w-5 h-5" />}
                />
                <HealthCard
                    title="Avg Completion"
                    value="68%"
                    trend="⬆ 4% this week"
                    icon={<TrendingDown className="text-emerald-600 w-5 h-5" />}
                />
                <HealthCard
                    title="At-Risk Students"
                    value={students.filter(s => (s.risk_score || 0) > 80).length}
                    trend="Needs Attention"
                    icon={<AlertTriangle className="text-red-500 w-5 h-5" />}
                    critical
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Widget B: The Watchlist */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Student Watchlist</h3>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                className="pl-9 pr-4 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 w-64 focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Student Name</th>
                                    <th className="px-6 py-3">Current Focus</th>
                                    <th className="px-6 py-3">Last Active</th>
                                    <th className="px-6 py-3">Risk Score</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {students.map((student) => {
                                    const risk = student.risk_score || 0;
                                    return (
                                        <tr key={student.id} className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${risk > 80 ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                        {student.full_name.charAt(0)}
                                                    </div>
                                                    {student.full_name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{student.current_course || "None"}</td>
                                            <td className="px-6 py-4 text-slate-500">{new Date(student.last_active || Date.now()).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getRiskColor(risk)}`}>
                                                    {risk}/100
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button className="text-orange-600 hover:text-orange-700 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                                    View Insights
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Widget C: Assignment Manager */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-orange-600" />
                            Assignment Manager
                        </h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Course</label>
                            <select
                                className="w-full px-4 py-2.5 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                                value={selectedCourse}
                                onChange={(e) => setSelectedCourse(e.target.value)}
                            >
                                <option value="">-- Choose a Course --</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>

                        <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg flex gap-3 text-orange-800 dark:text-orange-200 text-sm">
                            <Calendar className="w-5 h-5 flex-shrink-0" />
                            <p>Assigning to <strong>{students.length} students</strong> in {orgs.find(o => o.id === selectedOrgId)?.name}. Due in 7 days.</p>
                        </div>

                        <button
                            onClick={handleAssign}
                            disabled={!selectedCourse || assigning || students.length === 0}
                            className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold hover:opacity-90 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                        >
                            {assigning ? "Assigning..." : "Assign to Class"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HealthCard({ title, value, trend, icon, critical }: any) {
    return (
        <div className={`p-6 rounded-xl border ${critical ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'} shadow-sm`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">{icon}</div>
                {critical && <span className="bg-red-100 text-red-600 text-[10px] uppercase font-bold px-2 py-1 rounded-full">Alert</span>}
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{value}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{title}</div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">{trend}</div>
        </div>
    );
}
