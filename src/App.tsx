import { Stethoscope, LogOut, ClipboardList, ShieldCheck } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/ToastProvider";
import { ConfirmProvider } from "./components/ConfirmProvider";
import { Login } from "./pages/Login";
import { DoctorDashboard } from "./pages/DoctorDashboard";
import { AssistantDashboard } from "./pages/AssistantDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";

const ROLE_LABELS = { doctor: "Doctor", assistant: "Assistant", admin: "Admin" } as const;

function Shell() {
  const { user, logout } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            <Stethoscope size={20} strokeWidth={2.25} />
          </div>
          <div>
            <div className="app-title">Doctor-app</div>
            <div className="muted">
              {user.role === "admin" ? "Platform administration" : "Appointment & billing management"}
            </div>
          </div>
        </div>
        <div className="header-right">
          <span className={`role-chip role-chip-${user.role}`}>
            {user.role === "admin" ? <ShieldCheck size={14} /> : <ClipboardList size={14} />}
            {ROLE_LABELS[user.role]}
          </span>
          <span className="user-chip">{user.name}</span>
          <button className="btn btn-ghost icon-only-btn" onClick={logout} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main className="app-main">
        {user.role === "admin" ? (
          <AdminDashboard />
        ) : user.role === "doctor" ? (
          <DoctorDashboard />
        ) : (
          <AssistantDashboard />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Shell />
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
