import { useEffect, useMemo, useState } from "react";
import {
  Check,
  X,
  Clock3,
  CheckCircle2,
  BadgeCheck,
  Wallet,
  RefreshCw,
  CalendarClock,
  Plus,
  Trash2,
  Inbox,
  FileText,
} from "lucide-react";
import { appointmentsApi } from "../lib/resources";
import type { Appointment, AppointmentStatus } from "../types";
import { AppointmentCard } from "../components/AppointmentCard";
import { Modal } from "../components/Modal";
import { StatCard } from "../components/StatCard";
import { useToast } from "../components/ToastProvider";
import { PatientHistoryModal } from "../components/PatientHistoryModal";

const FILTERS: { key: AppointmentStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

interface ServiceDraft {
  description: string;
  amount: string;
}

export function DoctorDashboard() {
  const toast = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<AppointmentStatus | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<Appointment | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");

  const [completeTarget, setCompleteTarget] = useState<Appointment | null>(null);
  const [services, setServices] = useState<ServiceDraft[]>([{ description: "", amount: "" }]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Appointment | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const list = await appointmentsApi.list();
      setAppointments(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? appointments : appointments.filter((a) => a.status === filter)),
    [appointments, filter]
  );

  const stats = useMemo(() => {
    const pending = appointments.filter((a) => a.status === "pending").length;
    const accepted = appointments.filter((a) => a.status === "accepted").length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    const revenue = appointments
      .filter((a) => a.status === "completed")
      .reduce((sum, a) => sum + a.services.reduce((s, x) => s + x.amount, 0), 0);
    return { pending, accepted, completed, revenue };
  }, [appointments]);

  async function handleAccept(appt: Appointment) {
    setBusyId(appt.id);
    try {
      await appointmentsApi.accept(appt.id);
      toast.success(`Accepted ${appt.patient?.name ?? "appointment"}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to accept appointment");
    } finally {
      setBusyId(null);
    }
  }

  function openReject(appt: Appointment) {
    setRejectTarget(appt);
    setRejectReason("");
  }

  async function submitReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    setBusyId(rejectTarget.id);
    try {
      await appointmentsApi.reject(rejectTarget.id, rejectReason.trim());
      toast.info(`Rejected ${rejectTarget.patient?.name ?? "appointment"}`);
      setRejectTarget(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject appointment");
    } finally {
      setBusyId(null);
    }
  }

  function openReschedule(appt: Appointment) {
    setRescheduleTarget(appt);
    setRescheduleDate(appt.date);
    setRescheduleTime(appt.time);
    setRescheduleNote("");
  }

  async function submitReschedule() {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;
    setBusyId(rescheduleTarget.id);
    try {
      await appointmentsApi.reschedule(rescheduleTarget.id, {
        date: rescheduleDate,
        time: rescheduleTime,
        note: rescheduleNote.trim() || undefined,
      });
      toast.success("Appointment rescheduled");
      setRescheduleTarget(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reschedule appointment");
    } finally {
      setBusyId(null);
    }
  }

  function openComplete(appt: Appointment) {
    setCompleteTarget(appt);
    setServices([{ description: "", amount: "" }]);
  }

  function updateService(idx: number, field: keyof ServiceDraft, value: string) {
    setServices((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function addServiceRow() {
    setServices((prev) => [...prev, { description: "", amount: "" }]);
  }

  function removeServiceRow(idx: number) {
    setServices((prev) => prev.filter((_, i) => i !== idx));
  }

  const completeTotal = services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  async function submitComplete() {
    if (!completeTarget) return;
    const cleaned = services
      .map((s) => ({ description: s.description.trim(), amount: Number(s.amount) }))
      .filter((s) => s.description && !Number.isNaN(s.amount) && s.amount >= 0);
    if (cleaned.length === 0) {
      toast.error("Add at least one valid service with an amount");
      return;
    }
    setBusyId(completeTarget.id);
    try {
      await appointmentsApi.complete(completeTarget.id, cleaned);
      toast.success("Appointment completed and fee recorded");
      setCompleteTarget(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to complete appointment");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="dashboard">
      <div className="stat-row">
        <StatCard icon={Clock3} label="Pending review" value={stats.pending} tone="amber" />
        <StatCard icon={CheckCircle2} label="Accepted, upcoming" value={stats.accepted} tone="blue" />
        <StatCard icon={BadgeCheck} label="Completed" value={stats.completed} tone="green" />
        <StatCard icon={Wallet} label="Fees recorded" value={`$${stats.revenue.toFixed(2)}`} tone="violet" />
      </div>

      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? "chip-active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <button className="btn btn-ghost refresh-btn" onClick={refresh}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="card-grid">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}
      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <Inbox size={28} strokeWidth={1.5} />
          <p>No appointments in this view.</p>
        </div>
      )}

      {!loading && (
        <div className="card-grid">
          {filtered.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              actions={
                <>
                  {appt.status === "pending" && (
                    <>
                      <button
                        className="btn btn-primary"
                        disabled={busyId === appt.id}
                        onClick={() => handleAccept(appt)}
                      >
                        <Check size={15} />
                        Accept
                      </button>
                      <button
                        className="btn btn-danger"
                        disabled={busyId === appt.id}
                        onClick={() => openReject(appt)}
                      >
                        <X size={15} />
                        Reject
                      </button>
                      <button className="btn btn-ghost" onClick={() => openReschedule(appt)}>
                        <CalendarClock size={15} />
                        Modify time
                      </button>
                    </>
                  )}
                  {appt.status === "accepted" && (
                    <>
                      <button className="btn btn-primary" onClick={() => openComplete(appt)}>
                        <BadgeCheck size={15} />
                        Complete &amp; add fee
                      </button>
                      <button className="btn btn-ghost" onClick={() => openReschedule(appt)}>
                        <CalendarClock size={15} />
                        Reschedule
                      </button>
                    </>
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

      {rejectTarget && (
        <Modal title={`Reject appointment — ${rejectTarget.patient?.name}`} onClose={() => setRejectTarget(null)}>
          <label>
            Reason
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              autoFocus
            />
          </label>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setRejectTarget(null)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              disabled={!rejectReason.trim() || busyId === rejectTarget.id}
              onClick={submitReject}
            >
              Reject appointment
            </button>
          </div>
        </Modal>
      )}

      {rescheduleTarget && (
        <Modal
          title={`Reschedule — ${rescheduleTarget.patient?.name}`}
          onClose={() => setRescheduleTarget(null)}
        >
          <label>
            Date
            <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
          </label>
          <label>
            Time
            <input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
          </label>
          <label>
            Note (optional)
            <textarea value={rescheduleNote} onChange={(e) => setRescheduleNote(e.target.value)} rows={2} />
          </label>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setRescheduleTarget(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!rescheduleDate || !rescheduleTime || busyId === rescheduleTarget.id}
              onClick={submitReschedule}
            >
              Save changes
            </button>
          </div>
        </Modal>
      )}

      {completeTarget && (
        <Modal
          title={`Complete appointment — ${completeTarget.patient?.name}`}
          onClose={() => setCompleteTarget(null)}
        >
          <p className="muted">Add the services performed and the fee for each.</p>
          {services.map((s, idx) => (
            <div className="service-row" key={idx}>
              <input
                placeholder="Service description"
                value={s.description}
                onChange={(e) => updateService(idx, "description", e.target.value)}
              />
              <input
                placeholder="Amount"
                type="number"
                min="0"
                step="0.01"
                value={s.amount}
                onChange={(e) => updateService(idx, "amount", e.target.value)}
              />
              {services.length > 1 && (
                <button className="icon-btn" onClick={() => removeServiceRow(idx)} aria-label="Remove">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addServiceRow}>
            <Plus size={14} />
            Add another service
          </button>
          {completeTotal > 0 && (
            <div className="fee-total fee-total-modal">
              <span>Total</span>
              <span>${completeTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setCompleteTarget(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={busyId === completeTarget.id} onClick={submitComplete}>
              Mark completed
            </button>
          </div>
        </Modal>
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
