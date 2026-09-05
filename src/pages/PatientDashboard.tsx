import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarPlus, CalendarDays, Clock, Stethoscope, MapPin } from "lucide-react";
import { portalApi, type PortalClinic } from "../lib/resources";
import type { Appointment } from "../types";
import { Modal } from "../components/Modal";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/ToastProvider";

export function PatientDashboard() {
  const toast = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAppointments(await portalApi.listAppointments());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your appointments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const upcoming = appointments.filter(
      (a) => a.status === "accepted" || a.status === "pending"
    ).length;
    const awaiting = appointments.filter((a) => a.status === "pending").length;
    const past = appointments.filter((a) => a.status === "completed").length;
    return { upcoming, awaiting, past };
  }, [appointments]);

  return (
    <div className="dashboard">
      <div className="section-eyebrow">Your care</div>
      <div className="stat-row">
        <StatCard icon={CalendarDays} label="Upcoming visits" value={stats.upcoming} tone="blue" />
        <StatCard icon={Clock} label="Awaiting confirmation" value={stats.awaiting} tone="amber" />
        <StatCard icon={Stethoscope} label="Past visits" value={stats.past} tone="green" />
      </div>

      <div className="section">
        <div className="filter-bar">
          <h2>My appointments</h2>
          <button className="btn btn-primary" onClick={() => setBooking(true)}>
            <CalendarPlus size={15} />
            Book appointment
          </button>
        </div>

        {loading && <div className="muted">Loading…</div>}
        {error && <div className="error-banner">{error}</div>}
        {!loading && !error && appointments.length === 0 && (
          <div className="empty-state">
            <p>You have no appointments yet.</p>
            <button className="btn btn-primary" onClick={() => setBooking(true)}>
              <CalendarPlus size={15} />
              Book your first appointment
            </button>
          </div>
        )}

        <div className="card-grid">
          {appointments.map((a) => (
            <div key={a.id} className="card appointment-card">
              <div className="appointment-card-header">
                <div>
                  <div className="patient-name">{a.doctor?.name ?? "Doctor"}</div>
                  <div className="muted">{a.reason}</div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="appointment-meta">
                <span>
                  <CalendarDays size={14} />
                  {a.date} at {a.time}
                </span>
              </div>
              {a.status === "pending" && (
                <p className="muted">
                  Waiting for the doctor to confirm. We'll message you when they do.
                </p>
              )}
              {a.status === "rejected" && a.rejectionReason && (
                <p className="muted">Declined: {a.rejectionReason}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {booking && (
        <BookingModal
          onClose={() => setBooking(false)}
          onBooked={() => {
            setBooking(false);
            toast.success("Request sent — you'll get a WhatsApp once the doctor confirms");
            load();
          }}
        />
      )}
    </div>
  );
}

function BookingModal({ onClose, onBooked }: { onClose: () => void; onBooked: () => void }) {
  const toast = useToast();
  const [clinics, setClinics] = useState<PortalClinic[]>([]);
  const [clinicId, setClinicId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    portalApi
      .listClinics()
      .then((list) => {
        setClinics(list);
        if (list.length === 1) {
          setClinicId(list[0].id);
          if (list[0].doctors.length === 1) setDoctorId(list[0].doctors[0].id);
        }
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Could not load clinics"));
  }, []);

  const doctors = clinics.find((c) => c.id === clinicId)?.doctors ?? [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await portalApi.book({ doctorId, reason, date, time });
      onBooked();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not book that slot");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Book an appointment" onClose={onClose}>
      {loadError && <div className="error-banner">{loadError}</div>}
      <form onSubmit={submit}>
        <label>
          <span className="field-label">Clinic</span>
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
          <span className="field-label">Doctor</span>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            required
            disabled={!clinicId}
          >
            <option value="">Select a doctor…</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">Reason for visit</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Toothache, follow-up, general checkup"
            required
          />
        </label>

        <div className="form-row">
          <label>
            <span className="field-label">Date</span>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label>
            <span className="field-label">Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </label>
        </div>

        <p className="muted">
          <MapPin size={13} /> Your request goes to the doctor for confirmation. You'll get a
          WhatsApp message as soon as it's confirmed.
        </p>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !doctorId}>
            {saving ? "Sending…" : "Request appointment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
