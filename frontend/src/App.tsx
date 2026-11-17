
import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import Analytics from "./pages/Analytics";
import Bonds from "./pages/Bonds";
import Curves from "./pages/Curves";
import Portfolios from "./pages/Portfolios";
import Calculator from "./pages/Calculator";

type Theme = "dark" | "light";

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive
      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
  }`;

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("bondlab-theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("bondlab-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
              <span className="text-lg font-bold">B</span>
            </div>
            <div>
              <div className="text-lg font-bold tracking-wide text-[var(--text-primary)]">
                BondLab
              </div>
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Fixed Income Analytics
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/analytics" className={link}>Analytics</NavLink>
            <NavLink to="/bonds" className={link}>Bonds</NavLink>
            <NavLink to="/curves" className={link}>Yield Curves</NavLink>
            <NavLink to="/portfolios" className={link}>Portfolios</NavLink>
            <NavLink to="/calculator" className={link}>Calculator</NavLink>
          </nav>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-primary)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-7">
        <Routes>
          <Route path="/" element={<Navigate to="/analytics" replace />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/bonds" element={<Bonds />} />
          <Route path="/curves" element={<Curves />} />
          <Route path="/portfolios" element={<Portfolios />} />
          <Route path="/calculator" element={<Calculator />} />
        </Routes>
      </main>
    </div>
  );
}
