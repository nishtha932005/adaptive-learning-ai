import React from "react";
import { CheckCircle2, Clock, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { DashboardCourse } from "../../lib/supabase";

interface BootcampViewProps {
  courses: DashboardCourse[];
}

export default function BootcampView({ courses }: BootcampViewProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      {courses.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <p className="text-sm">No courses assigned yet</p>
        </div>
      ) : (
        courses.map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(`/dashboard/course/${course.id}`)}
            className="card p-4 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-primary"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                    {course.title}
                  </h3>
                  {course.progress_pct === 100 && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                  <span>{course.total_modules} modules</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {course.difficulty}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${course.progress_pct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-10 text-right">
                  {course.progress_pct}%
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dashboard/course/${course.id}`);
                  }}
                  className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}



