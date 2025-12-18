import React from "react";
import { useTheme } from "../context/ThemeContext";

export default function Settings() {
  const { isDark, themeColor, toggleDarkMode, setThemeColor } = useTheme();

  const colors: { id: "orange" | "green" | "blue" | "red"; label: string; className: string }[] = [
    { id: "orange", label: "Orange", className: "bg-orange-500" },
    { id: "blue", label: "Blue", className: "bg-blue-500" },
    { id: "green", label: "Green", className: "bg-green-500" },
    { id: "red", label: "Red", className: "bg-red-500" },
  ];

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-400 uppercase mb-1">
            Interface
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Appearance</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure global light/dark mode and your brand accent color.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Theme Mode */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
            Theme Mode
          </h2>
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 text-xs">
            <button
              type="button"
              onClick={() => !isDark && toggleDarkMode()}
              className={`px-4 py-2 rounded-md flex items-center gap-1 transition-all ${
                !isDark ? "bg-primary text-white shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>☀️</span>
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => isDark && toggleDarkMode()}
              className={`px-4 py-2 rounded-md flex items-center gap-1 transition-all ${
                isDark ? "bg-primary text-white shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>🌙</span>
              <span>Dark</span>
            </button>
          </div>
        </div>

        {/* Brand Color */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
            Brand Color
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
            Choose an accent color that will be applied throughout the interface.
          </p>
          <div className="flex items-center gap-3">
            {colors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setThemeColor(c.id)}
                className={`relative h-12 w-12 rounded-lg border-2 flex items-center justify-center transition-all ${
                  themeColor === c.id
                    ? "border-primary shadow-lg scale-105 ring-2 ring-primary/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:scale-105"
                }`}
              >
                <span className={`h-8 w-8 rounded ${c.className}`} />
                {themeColor === c.id && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary border-2 border-white dark:border-slate-800" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

