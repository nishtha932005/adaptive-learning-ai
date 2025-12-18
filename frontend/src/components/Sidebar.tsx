import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, BookOpen, BarChart2, Settings, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const navItems: { path: string; label: string; icon: React.ReactNode }[] = [
  { path: "/dashboard", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
  { path: "/dashboard/courses", label: "Courses", icon: <BookOpen className="w-4 h-4" /> },
  { path: "/dashboard/study", label: "Study Room", icon: <BarChart2 className="w-4 h-4" /> },
  { path: "/dashboard/settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

export default function Sidebar() {
  const { isDark, toggleDarkMode } = useTheme();
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-card border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col shadow-sm">
      <div className="px-5 py-5 border-b border-slate-200/60 dark:border-slate-800">
        <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
          Adaptive Learning
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-300">AI Tutor Console</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isStudyRoom = item.path === "/dashboard/study";
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className="relative w-full text-left"
            >
              {/* Active primary bar */}
              <span
                className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-primary transition-opacity ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />

              <div
                className={`ml-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-l-4 ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                } ${isStudyRoom ? "font-semibold" : ""}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-200/60 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <span>Demo Mode</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? (
              <>
                <Sun className="w-3 h-3 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3 h-3 text-primary" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

