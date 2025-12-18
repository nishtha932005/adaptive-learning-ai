import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeColor = "orange" | "green" | "blue" | "red";

type ThemeContextValue = {
  isDark: boolean;
  themeColor: ThemeColor;
  toggleDarkMode: () => void;
  setThemeColor: (color: ThemeColor) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [themeColor, setThemeColorState] = useState<ThemeColor>("orange");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedMode = window.localStorage.getItem("theme-mode");
    const storedColor = window.localStorage.getItem("theme-color");

    const darkEnabled = storedMode === "dark";
    setIsDark(darkEnabled);
    if (darkEnabled) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    if (storedColor === "green" || storedColor === "blue" || storedColor === "red") {
      setThemeColorState(storedColor as ThemeColor);
      document.documentElement.setAttribute("data-theme", storedColor);
    } else {
      setThemeColorState("orange");
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        window.localStorage.setItem("theme-mode", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        window.localStorage.setItem("theme-mode", "light");
      }
      return next;
    });
  };

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    if (color === "orange") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", color);
    }
    window.localStorage.setItem("theme-color", color);
  };

  return (
    <ThemeContext.Provider value={{ isDark, themeColor, toggleDarkMode, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

