import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, setAuthToken } from "../lib/api";
import type { AuthUser } from "../types";

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  loginAdmin: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "doctor-app-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LoginResponse;
        setAuthToken(parsed.token);
        setUser(parsed.user);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<LoginResponse>("/auth/login", { username, password });
      setAuthToken(res.token);
      setUser(res.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginAdmin = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{
        token: string;
        admin: { id: string; name: string; username: string };
      }>("/admin/login", { username, password });
      const authUser: AuthUser = {
        id: res.admin.id,
        name: res.admin.name,
        username: res.admin.username,
        role: "admin",
      };
      setAuthToken(res.token);
      setUser(authUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: res.token, user: authUser }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, login, loginAdmin, logout }),
    [user, loading, error, login, loginAdmin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
