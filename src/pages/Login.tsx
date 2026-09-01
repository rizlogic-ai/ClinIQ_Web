import { useState, type FormEvent } from "react";
import { Stethoscope, ClipboardCheck, Receipt, CalendarCheck2, Lock, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login, loginAdmin, loading, error } = useAuth();
  const [mode, setMode] = useState<"staff" | "admin">("staff");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (mode === "admin") {
        await loginAdmin(username, password);
      } else {
        await login(username, password);
      }
    } catch {
      // error is surfaced via auth context
    }
  }

  function fillDemo(role: "doctor" | "assistant") {
    setUsername(role);
    setPassword("password123");
  }

  return (
    <div className="auth-screen">
      <div className="auth-layout">
        <div className="auth-hero">
          <div className="brand-mark brand-mark-lg">
            <Stethoscope size={26} strokeWidth={2.25} />
          </div>
          <h1>Doctor-app</h1>
          <p>Run appointments and billing for the whole practice from one clean workspace.</p>

          <ul className="hero-feature-list">
            <li>
              <CalendarCheck2 size={18} />
              <span>Assistants schedule visits and keep the calendar moving</span>
            </li>
            <li>
              <ClipboardCheck size={18} />
              <span>Doctors accept, reschedule and close out appointments</span>
            </li>
            <li>
              <Receipt size={18} />
              <span>Fees turn into invoices automatically, ready to collect</span>
            </li>
          </ul>
        </div>

        <div className="auth-card">
          <div className="segmented">
            <button
              type="button"
              className={mode === "staff" ? "segmented-active" : ""}
              onClick={() => setMode("staff")}
            >
              Staff
            </button>
            <button
              type="button"
              className={mode === "admin" ? "segmented-active" : ""}
              onClick={() => setMode("admin")}
            >
              Admin
            </button>
          </div>
          <h2>Sign in</h2>
          <p className="subtitle">
            {mode === "admin"
              ? "Enter your admin credentials"
              : "Enter your workspace credentials"}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Username
              <div className="input-with-icon">
                <User size={16} />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  placeholder={mode === "admin" ? "admin username" : "doctor or assistant"}
                />
              </div>
            </label>
            <label>
              Password
              <div className="input-with-icon">
                <Lock size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </label>
            {error && <div className="error-banner">{error}</div>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {mode === "staff" && (
            <div className="demo-hint">
              <span>Demo accounts:</span>
              <button type="button" className="link-btn" onClick={() => fillDemo("doctor")}>
                doctor
              </button>
              <button type="button" className="link-btn" onClick={() => fillDemo("assistant")}>
                assistant
              </button>
              <span>(password: password123)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
