"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Sync React state with the class on <html>
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);

    const root = document.documentElement;
    if (nextTheme === "dark") {
      root.classList.remove("light");
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="p-2.5 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-850/50 transition-colors flex items-center justify-center text-slate-600 dark:text-slate-300 border border-outline-variant/10 dark:border-slate-800"
      title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
    >
      <span className="material-symbols-outlined text-lg">
        {theme === "light" ? "dark_mode" : "light_mode"}
      </span>
    </button>
  );
}
