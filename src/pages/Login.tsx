import { useState, type FormEvent } from "react";
import { ClipboardCheck, Receipt, CalendarCheck2, Lock, User, Smartphone } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

type Mode = "staff" | "admin" | "patient";

export function Login() {
  const { login, loginAdmin, loading, error } = useAuth();
  const [mode, setMode] = useState<Mode>("staff");
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
            <Logo size={26} variant="mark" />
          </div>
          <h1>ClinIQ</h1>
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
            <button
              type="button"
              className={mode === "patient" ? "segmented-active" : ""}
              onClick={() => setMode("patient")}
            >
              Patient
            </button>
          </div>

          {mode === "patient" ? (
            <PatientLogin />
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const DIAL_CODES = [
  { code: "+92", label: "🇵🇰 +92" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+966", label: "🇸🇦 +966" },
  { code: "+91", label: "🇮🇳 +91" },
];

function PatientLogin() {
  const { requestPatientOtp, verifyPatientOtp, loading, error } = useAuth();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [dial, setDial] = useState("+92");
  const [local, setLocal] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const phone = `${dial}${local.replace(/\D/g, "").replace(/^0+/, "")}`;

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    try {
      const res = await requestPatientOtp(phone);
      setStep("code");
      setNotice(
        res.devCode
          ? `Messaging isn't configured yet — your code is ${res.devCode}`
          : `We sent a 6-digit code to ${phone}`
      );
    } catch {
      // surfaced via context
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    try {
      const res = await verifyPatientOtp(phone, code, needsName ? name : undefined);
      if (res.needsName) {
        setNeedsName(true);
        setNotice("Almost there — what name should the clinic see?");
      }
    } catch {
      // surfaced via context
    }
  }

  return (
    <>
      <h2>{step === "phone" ? "Book an appointment" : "Enter your code"}</h2>
      <p className="subtitle">
        {step === "phone"
          ? "We'll text you a code — no password needed"
          : `Sent to ${phone}`}
      </p>

      {step === "phone" ? (
        <form onSubmit={sendCode} className="auth-form">
          <label>
            Mobile number
            <div className="phone-input">
              <select value={dial} onChange={(e) => setDial(e.target.value)}>
                {DIAL_CODES.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.label}
                  </option>
                ))}
              </select>
              <div className="input-with-icon">
                <Smartphone size={16} />
                <input
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  autoFocus
                  inputMode="tel"
                  placeholder="300 1234567"
                />
              </div>
            </div>
          </label>
          {error && <div className="error-banner">{error}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading || !local}>
            {loading ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="auth-form">
          <label>
            6-digit code
            <div className="input-with-icon">
              <Lock size={16} />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                inputMode="numeric"
                placeholder="123456"
              />
            </div>
          </label>
          {needsName && (
            <label>
              Your full name
              <div className="input-with-icon">
                <User size={16} />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ayesha Khan"
                />
              </div>
            </label>
          )}
          {notice && <div className="info-banner">{notice}</div>}
          {error && <div className="error-banner">{error}</div>}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || code.length < 6 || (needsName && !name.trim())}
          >
            {loading ? "Verifying…" : needsName ? "Create my account" : "Verify"}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setStep("phone");
              setCode("");
              setNeedsName(false);
              setNotice(null);
            }}
          >
            Use a different number
          </button>
        </form>
      )}
      {step === "phone" && notice && <div className="info-banner">{notice}</div>}
    </>
  );
}
