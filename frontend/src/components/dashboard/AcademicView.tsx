import React from "react";
import { BookOpen, Clock, Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { DashboardCourse } from "../../lib/supabase";

interface AcademicViewProps {
  courses: DashboardCourse[];
}

export default function AcademicView({ courses }: AcademicViewProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.length === 0 ? (
        <div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No courses assigned yet</p>
        </div>
      ) : (
        courses.map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => navigate(`/dashboard/course/${course.id}`)}
            className="card p-6 cursor-pointer hover:shadow-lg transition-all group"
          >
            <div className="mb-4">
              <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg mb-4 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-primary opacity-50" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
                {course.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                Comprehensive course covering all essential concepts and theories
              </p>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {course.total_modules} Modules
                </span>
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {course.difficulty}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${course.progress_pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Progress</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {course.progress_pct}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-600 dark:text-slate-400">Continue Learning</span>
              <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}



