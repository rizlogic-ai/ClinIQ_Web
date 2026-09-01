import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarPlus,
  ListChecks,
  Receipt,
  Users,
  CalendarDays,
  Clock3,
  DollarSign,
  RefreshCw,
  Ban,
  FileCheck2,
  CircleCheck,
  Inbox,
  FileText,
} from "lucide-react";
import { appointmentsApi, doctorsApi, invoicesApi, patientsApi } from "../lib/resources";
import type { Appointment, Doctor, Invoice, Patient } from "../types";
import { AppointmentCard } from "../components/AppointmentCard";
import { StatusBadge } from "../components/StatusBadge";
import { StatCard } from "../components/StatCard";
import { useToast } from "../components/ToastProvider";
import { useConfirm } from "../components/ConfirmProvider";
import { PatientHistoryModal } from "../components/PatientHistoryModal";

type Tab = "new" | "appointments" | "invoices";

const TABS: { key: Tab; label: string; icon: typeof CalendarPlus }[] = [
  { key: "new", label: "New appointment", icon: CalendarPlus },
  { key: "appointments", label: "Appointments", icon: ListChecks },
  { key: "invoices", label: "Invoices", icon: Receipt },
];

export function AssistantDashboard() {
  const [tab, setTab] = useState<Tab>("new");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  const bump = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    Promise.all([appointmentsApi.list(), invoicesApi.list(), patientsApi.list()])
      .then(([a, i, p]) => {
        setAppointments(a);
        setInvoices(i);
        setPatients(p);
      })
      .catch(() => {});
  }, [refreshTick]);

  const today = new Date().toISOString().slice(0, 10);
  const stats = useMemo(() => {
    const todayCount = appointments.filter((a) => a.date === today && a.status !== "cancelled" && a.status !== "rejected").length;
    const pending = appointments.filter((a) => a.status === "pending").length;
    const unpaidTotal = invoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + i.total, 0);
    return { todayCount, pending, unpaidTotal, patients: patients.length };
  }, [appointments, invoices, patients, today]);

  return (
    <div className="dashboard">
      <div className="stat-row">
        <StatCard icon={Users} label="Patients on file" value={stats.patients} tone="violet" />
        <StatCard icon={CalendarDays} label="Today's schedule" value={stats.todayCount} tone="blue" />
        <StatCard icon={Clock3} label="Awaiting doctor" value={stats.pending} tone="amber" />
        <StatCard icon={DollarSign} label="Unpaid invoices" value={`$${stats.unpaidTotal.toFixed(2)}`} tone="red" />
      </div>

      <div className="tab-bar">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? "tab-active" : ""}`}
              onClick={() => {
                setTab(t.key);
                bump();
              }}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "new" && (
        <NewAppointmentForm
          onCreated={() => {
            setTab("appointments");
            bump();
          }}
        />
      )}
      {tab === "appointments" && <AppointmentsPanel patients={patients} onChanged={bump} />}
      {tab === "invoices" && <InvoicesPanel onChanged={bump} />}
    </div>
  );
}

function NewAppointmentForm({ onCreated }: { onCreated: () => void }) {
  const toast = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [patientId, setPatientId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  useEffect(() => {
    patientsApi.list().then(setPatients).catch(() => {});
    doctorsApi
      .list()
      .then((list) => {
        setDoctors(list);
        if (list.length === 1) setDoctorId(list[0].id);
      })
      .catch((e) => {
        setDoctorsError(e instanceof Error ? e.message : "Failed to load your doctors");
      })
      .finally(() => setDoctorsLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!doctorId) {
      setError("Select a doctor");
      return;
    }
    if (!reason.trim() || !date || !time) {
      setError("Reason, date and time are required");
      return;
    }
    if (mode === "existing" && !patientId) {
      setError("Select a patient");
      return;
    }
    if (mode === "new" && (!newName.trim() || !newPhone.trim())) {
      setError("New patient name and phone are required");
      return;
    }

    setSubmitting(true);
    try {
      await appointmentsApi.create({
        doctorId,
        patientId: mode === "existing" ? patientId : undefined,
        newPatient:
          mode === "new"
            ? { name: newName.trim(), phone: newPhone.trim(), email: newEmail.trim() || undefined }
            : undefined,
        reason: reason.trim(),
        date,
        time,
      });
      toast.success("Appointment request created");
      if (doctors.length !== 1) setDoctorId("");
      setReason("");
      setDate("");
      setTime("");
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setPatientId("");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create appointment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <h2>Schedule an appointment</h2>

      {doctorsLoading ? null : doctorsError ? (
        <div className="error-banner">
          Couldn't load your doctors ({doctorsError}). Try refreshing, or sign out and back in.
        </div>
      ) : doctors.length === 0 ? (
        <div className="error-banner">
          You aren't assigned to any doctor yet. Ask a doctor to add you before booking.
        </div>
      ) : doctors.length === 1 ? (
        <div className="form-row">
          <label>
            Doctor
            <input value={doctors[0].name} disabled />
          </label>
        </div>
      ) : (
        <label>
          Doctor
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">Select a doctor…</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="segmented">
        <button
          type="button"
          className={mode === "existing" ? "segmented-active" : ""}
          onClick={() => setMode("existing")}
        >
          Existing patient
        </button>
        <button type="button" className={mode === "new" ? "segmented-active" : ""} onClick={() => setMode("new")}>
          New patient
        </button>
      </div>

      {mode === "existing" ? (
        <label>
          Patient
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">Select a patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.phone}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="form-row">
          <label>
            Full name
            <input value={newName} onChange={(e) => setNewName(e.target.value)} />
          </label>
          <label>
            Phone
            <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          </label>
          <label>
            Email (optional)
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </label>
        </div>
      )}

      <label>
        Reason for visit
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Follow-up consultation" />
      </label>

      <div className="form-row">
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Time
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <button
        className="btn btn-primary"
        type="submit"
        disabled={submitting || doctorsLoading || doctors.length === 0}
      >
        <CalendarPlus size={16} />
        {submitting ? "Creating…" : "Create appointment request"}
      </button>
    </form>
  );
}

function AppointmentsPanel({ onChanged }: { patients: Patient[]; onChanged: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Appointment | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setAppointments(await appointmentsApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCancel(appt: Appointment) {
    const ok = await confirm({
      title: "Cancel this appointment?",
      message: `${appt.patient?.name ?? "This patient"}'s visit on ${appt.date} at ${appt.time} will be cancelled.`,
      confirmLabel: "Cancel appointment",
      danger: true,
    });
    if (!ok) return;
    setBusyId(appt.id);
    try {
      await appointmentsApi.cancel(appt.id);
      toast.info("Appointment cancelled");
      await refresh();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel appointment");
    } finally {
      setBusyId(null);
    }
  }

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [appointments]
  );

  return (
    <div>
      <div className="filter-bar">
        <button className="btn btn-ghost refresh-btn" onClick={refresh}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>
      {loading && (
        <div className="card-grid">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      )}
      {!loading && sorted.length === 0 && (
        <div className="empty-state">
          <Inbox size={28} strokeWidth={1.5} />
          <p>No appointments yet — create one from the New appointment tab.</p>
        </div>
      )}
      {!loading && (
        <div className="card-grid">
          {sorted.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              actions={
                <>
                  {(appt.status === "pending" || appt.status === "accepted") && (
                    <button
                      className="btn btn-danger"
                      disabled={busyId === appt.id}
                      onClick={() => handleCancel(appt)}
                    >
                      <Ban size={15} />
                      Cancel appointment
                    </button>
                  )}
                  <button className="btn btn-ghost" onClick={() => setHistoryTarget(appt)}>
                    <FileText size={15} />
                    History
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}

      {historyTarget && (
        <PatientHistoryModal
          patientId={historyTarget.patientId}
          patientName={historyTarget.patient?.name ?? "Unknown patient"}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}

function InvoicesPanel({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [appts, invs] = await Promise.all([appointmentsApi.list(), invoicesApi.list()]);
      setAppointments(appts);
      setInvoices(invs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const invoicedAppointmentIds = new Set(invoices.map((i) => i.appointmentId));
  const readyToInvoice = appointments.filter(
    (a) => a.status === "completed" && !invoicedAppointmentIds.has(a.id)
  );

  async function handleIssue(appt: Appointment) {
    setBusyId(appt.id);
    try {
      await invoicesApi.create(appt.id);
      toast.success(`Invoice issued for ${appt.patient?.name ?? "patient"}`);
      await refresh();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to issue invoice");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePay(inv: Invoice) {
    setBusyId(inv.id);
    try {
      await invoicesApi.pay(inv.id);
      toast.success("Invoice marked as paid");
      await refresh();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark invoice paid");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="filter-bar">
        <button className="btn btn-ghost refresh-btn" onClick={refresh}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {loading && <div className="skeleton-card" />}

      {!loading && readyToInvoice.length > 0 && (
        <section className="section">
          <h2>
            <FileCheck2 size={17} />
            Ready to invoice
          </h2>
          <div className="card-grid">
            {readyToInvoice.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                actions={
                  <button
                    className="btn btn-primary"
                    disabled={busyId === appt.id}
                    onClick={() => handleIssue(appt)}
                  >
                    <Receipt size={15} />
                    Issue invoice
                  </button>
                }
              />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2>
          <Receipt size={17} />
          Invoices
        </h2>
        {!loading && invoices.length === 0 && (
          <div className="empty-state">
            <Inbox size={28} strokeWidth={1.5} />
            <p>No invoices issued yet.</p>
          </div>
        )}
        {invoices.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Issued</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.patient?.name ?? "—"}</td>
                    <td>{new Date(inv.issuedAt).toLocaleString()}</td>
                    <td>${inv.total.toFixed(2)}</td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td>
                      {inv.status === "unpaid" && (
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={busyId === inv.id}
                          onClick={() => handlePay(inv)}
                        >
                          <CircleCheck size={14} />
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
