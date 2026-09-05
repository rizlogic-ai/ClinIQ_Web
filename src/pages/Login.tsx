import { useEffect, useState, type FormEvent } from "react";
import {
  ClipboardCheck,
  Receipt,
  CalendarCheck2,
  Lock,
  User,
  Smartphone,
  MessageCircle,
  Bot,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { guestApi, type GuestBookingResult, type PortalClinic } from "../lib/resources";

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
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
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
              <span>Patients book themselves, or your assistant books for them</span>
            </li>
            <li>
              <ClipboardCheck size={18} />
              <span>Doctors accept, reschedule and close out appointments</span>
            </li>
            <li>
              <MessageCircle size={18} />
              <span>Confirmations reach patients on WhatsApp automatically</span>
            </li>
            <li>
              <Receipt size={18} />
              <span>Fees become invoices, ready to print and collect</span>
            </li>
            <li>
              <Bot size={18} />
              <span>An AI colleague on hand for a quick second opinion</span>
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
  const [asGuest, setAsGuest] = useState(false);
  return asGuest ? (
    <GuestBooking onBack={() => setAsGuest(false)} />
  ) : (
    <PatientOtpLogin onGuest={() => setAsGuest(true)} />
  );
}

function PatientOtpLogin({ onGuest }: { onGuest: () => void }) {
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
          <div className="auth-alt">
            <span>Don't want to sign in?</span>
            <button type="button" className="link-btn" onClick={onGuest}>
              Book as a guest
            </button>
          </div>
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

function GuestBooking({ onBack }: { onBack: () => void }) {
  const [clinics, setClinics] = useState<PortalClinic[]>([]);
  const [clinicId, setClinicId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [name, setName] = useState("");
  const [dial, setDial] = useState("+92");
  const [local, setLocal] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<GuestBookingResult | null>(null);

  useEffect(() => {
    guestApi
      .listClinics()
      .then((list) => {
        setClinics(list);
        if (list.length === 1) setClinicId(list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load clinics"));
  }, []);

  const doctors = clinics.find((c) => c.id === clinicId)?.doctors ?? [];
  const phone = `${dial}${local.replace(/\D/g, "").replace(/^0+/, "")}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      setDone(await guestApi.book({ name, phone, doctorId, reason, date, time }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <>
        <h2>Request sent</h2>
        <p className="subtitle">The clinic will confirm your appointment shortly.</p>
        <div className="guest-summary">
          <div>
            <span className="field-label">Doctor</span>
            {done.doctor.name}
          </div>
          {done.clinic && (
            <div>
              <span className="field-label">Clinic</span>
              {done.clinic.name}
            </div>
          )}
          <div>
            <span className="field-label">When</span>
            {done.appointment.date} at {done.appointment.time}
          </div>
          <div>
            <span className="field-label">Reason</span>
            {done.appointment.reason}
          </div>
        </div>
        <p className="muted">
          Keep this to hand — without an account you can't check the status here, so the clinic
          will contact you on {phone}.
        </p>
        <button type="button" className="btn btn-ghost btn-block" onClick={onBack}>
          Back to sign in
        </button>
      </>
    );
  }

  return (
    <>
      <h2>Book as a guest</h2>
      <p className="subtitle">No account needed — the clinic will call you to confirm</p>

      <form onSubmit={submit} className="auth-form">
        <label>
          Your full name
          <div className="input-with-icon">
            <User size={16} />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayesha Khan" required />
          </div>
        </label>

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
                inputMode="tel"
                placeholder="300 1234567"
                required
              />
            </div>
          </div>
        </label>

        <label>
          Clinic
          <select
            value={clinicId}
            onChange={(e) => {
              setClinicId(e.target.value);
              setDoctorId("");
            }}
            required
          >
            <option value="">Select a clinic…</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.city ? ` — ${c.city}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label>
          Doctor
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required disabled={!clinicId}>
            <option value="">Select a doctor…</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Reason for visit
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Toothache, checkup"
            required
          />
        </label>

        <div className="form-row">
          <label>
            Date
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label>
            Time
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </label>
        </div>

        {error && <div className="error-banner">{error}</div>}
        <button type="submit" className="btn btn-primary btn-block" disabled={saving || !doctorId}>
          {saving ? "Sending…" : "Request appointment"}
        </button>
        <button type="button" className="link-btn" onClick={onBack}>
          Back to sign in
        </button>
      </form>
    </>
  );
}
