import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { BookOpen, User, AlertTriangle, CheckCircle2, PlusCircle, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

type MentorStudentRow = {
  id: string;
  full_name: string;
  risk_score: number;
  last_login?: string | null;
};

type ClassHealthSlice = {
  name: string;
  value: number;
  color: string;
};

export default function MentorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isMentor, setIsMentor] = useState<boolean | null>(null);
  const [students, setStudents] = useState<MentorStudentRow[]>([]);
  const [health, setHealth] = useState<ClassHealthSlice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const { data: me, error: meError } = await supabase
          .from("students")
          .select("role")
          .eq("id", user.id)
          .single();
        if (meError || !me || me.role !== "mentor") {
          setIsMentor(false);
          setError("You are not authorized to view the mentor dashboard.");
          return;
        }
        setIsMentor(true);

        const { data: stuRows } = await supabase
          .from("students")
          .select("id, full_name, risk_score, last_login_at")
          .order("full_name", { ascending: true });

        const mapped: MentorStudentRow[] = (stuRows || []).map((s: any) => ({
          id: s.id,
          full_name: s.full_name,
          risk_score: s.risk_score ?? 0,
          last_login: s.last_login_at,
        }));
        setStudents(mapped);

        const struggling = mapped.filter((s) => s.risk_score > 70).length;
        const caution = mapped.filter((s) => s.risk_score > 30 && s.risk_score <= 70).length;
        const onTrack = mapped.length - struggling - caution;
        const h: ClassHealthSlice[] = [
          { name: "On Track", value: onTrack, color: "#22c55e" },
          { name: "Caution", value: caution, color: "#eab308" },
          { name: "Struggling", value: struggling, color: "#fb7185" },
        ];
        setHealth(h);
      } catch (e: any) {
        setError(e?.message || "Failed to load mentor data");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleAssign = async () => {
    if (!selectedStudentId || !selectedCourseId) return;
    setAssigning(true);
    try {
      await supabase.from("assignments").insert({
        mentor_id: user?.id,
        student_id: selectedStudentId,
        course_id: selectedCourseId,
        due_date: dueDate || null,
      });
      setAssignOpen(false);
      setSelectedStudentId(null);
      setSelectedCourseId(null);
      setDueDate("");
    } catch (e) {
      // silent fail for now
    } finally {
      setAssigning(false);
    }
  };

  const handleInsights = (s: MentorStudentRow) => {
    if (s.risk_score > 70) {
      setInsight(
        `${s.full_name} is struggling. Suggest assigning remedial fundamentals and shorter video sprints.`
      );
    } else if (s.risk_score > 30) {
      setInsight(
        `${s.full_name} shows medium risk. Recommend a mixed playlist: recap videos + targeted quizzes.`
      );
    } else {
      setInsight(
        `${s.full_name} is on track. Consider giving a project-style assignment to stretch them.`
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading mentor dashboard...</p>
      </div>
    );
  }

  if (!isMentor) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-rose-400">
            {error || "You do not have mentor permissions for this workspace."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-full bg-sky-600 hover:bg-sky-500 text-xs font-semibold"
          >
            Go to Student Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-sky-300 mb-1">MENTOR CONSOLE</p>
          <h1 className="text-2xl font-semibold">Class Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor cohort health, assign work, and get AI-assisted insights.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAssignOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-600 hover:bg-sky-500 text-xs font-semibold shadow-lg shadow-sky-500/30"
        >
          <PlusCircle className="w-4 h-4" />
          New Assignment
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-4 bg-slate-900/80 border border-white/10 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-300 mb-2">Class Health</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={health}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {health.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid rgba(148, 163, 184, 0.4)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  itemStyle={{ color: "#e5e7eb" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-400">
            {health.map((h) => (
              <div key={h.name} className="flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: h.color }}
                />
                <span>
                  {h.name}: {h.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-8 bg-slate-900/80 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-300">Students</p>
          </div>
          <div className="overflow-x-auto text-xs">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="py-2 pr-4 text-left font-normal">Name</th>
                  <th className="py-2 px-4 text-left font-normal">Risk</th>
                  <th className="py-2 px-4 text-left font-normal">Last Login</th>
                  <th className="py-2 px-4 text-left font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-900/70 hover:bg-slate-800/40"
                  >
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{s.full_name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1">
                        {s.risk_score > 70 ? (
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                        ) : s.risk_score > 30 ? (
                          <AlertTriangle className="w-3 h-3 text-amber-300" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        )}
                        <span>{s.risk_score}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-slate-400">
                      {s.last_login ? s.last_login : "—"}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleInsights(s)}
                          className="px-2 py-1 rounded-full bg-slate-800 text-[11px] text-slate-100 hover:bg-slate-700"
                        >
                          View AI Insights
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(s.id);
                            setAssignOpen(true);
                          }}
                          className="px-2 py-1 rounded-full bg-sky-600 text-[11px] hover:bg-sky-500"
                        >
                          Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {insight && (
        <div className="fixed bottom-4 left-4 max-w-sm bg-slate-900/90 border border-sky-500/40 rounded-xl p-3 text-xs text-slate-100 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <p>{insight}</p>
            <button
              type="button"
              onClick={() => setInsight(null)}
              className="text-slate-500 hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {assignOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Assign Course</p>
              <button
                type="button"
                onClick={() => setAssignOpen(false)}
                className="text-slate-500 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 text-slate-300">Student</label>
                <select
                  value={selectedStudentId || ""}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 text-xs"
                >
                  <option value="">Select a student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-slate-300">Course ID</label>
                <input
                  value={selectedCourseId || ""}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  placeholder="Paste or type a course id"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-300">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignOpen(false)}
                className="px-3 py-2 rounded-full text-xs text-slate-300 border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assigning || !selectedStudentId || !selectedCourseId}
                onClick={handleAssign}
                className="px-4 py-2 rounded-full bg-sky-600 hover:bg-sky-500 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {assigning ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


