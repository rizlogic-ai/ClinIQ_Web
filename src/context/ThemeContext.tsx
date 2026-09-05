import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemePreference;
  /** What's actually on screen once "system" is resolved. */
  resolved: "light" | "dark";
  setTheme: (t: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Each person on a shared clinic machine keeps their own choice, so the key
// is scoped to the signed-in user; the signed-out key themes the login screen.
const keyFor = (userId?: string) => (userId ? `cliniq-theme:${userId}` : "cliniq-theme:guest");

function read(userId?: string): ThemePreference {
  try {
    const v = localStorage.getItem(keyFor(userId));
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // private browsing or blocked storage — fall through to the default
  }
  return "system";
}

const prefersDark = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemePreference>(() => read());
  const [systemDark, setSystemDark] = useState(prefersDark);

  // Follow the OS while the preference is "system".
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Signing in (or out) swaps to that person's saved preference.
  useEffect(() => {
    setThemeState(read(user?.id));
  }, [user?.id]);

  const resolved: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("sys-dark", theme === "system" && systemDark);
  }, [theme, systemDark]);

  const setTheme = useCallback(
    (t: ThemePreference) => {
      setThemeState(t);
      try {
        localStorage.setItem(keyFor(user?.id), t);
      } catch {
        // preference just won't survive a reload
      }
    },
    [user?.id]
  );

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
