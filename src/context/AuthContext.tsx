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
import { formatMoney } from "../lib/currencies";
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
  requestPatientOtp: (phone: string) => Promise<{ delivery: string; devCode?: string }>;
  verifyPatientOtp: (phone: string, code: string, name?: string) => Promise<{ needsName?: boolean }>;
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
    if (!raw) return;
    let parsed: LoginResponse;
    try {
      parsed = JSON.parse(raw) as LoginResponse;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    setAuthToken(parsed.token);
    setUser(parsed.user);
    if (parsed.user.role === "admin") return;
    api
      .get<{ user: AuthUser }>("/auth/me")
      .then((res) => {
        setUser(res.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: parsed.token, user: res.user }));
      })
      .catch(() => {});
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

  const requestPatientOtp = useCallback(async (phone: string) => {
    setLoading(true);
    setError(null);
    try {
      return await api.post<{ delivery: string; devCode?: string }>("/portal/request-otp", { phone });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the code");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyPatientOtp = useCallback(async (phone: string, code: string, name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<Partial<LoginResponse> & { needsName?: boolean }>(
        "/portal/verify-otp",
        { phone, code, ...(name ? { name } : {}) }
      );
      // First-time patient: the server needs a name before it can open an account.
      if (res.needsName || !res.token || !res.user) {
        return { needsName: true };
      }
      setAuthToken(res.token);
      setUser(res.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: res.token, user: res.user }));
      return {};
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify the code");
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
    () => ({ user, loading, error, login, loginAdmin, requestPatientOtp, verifyPatientOtp, logout }),
    [user, loading, error, login, loginAdmin, requestPatientOtp, verifyPatientOtp, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useMoney() {
  const { user } = useAuth();
  const currency = user?.currency ?? "USD";
  return useCallback((amount: number) => formatMoney(amount, currency), [currency]);
}
