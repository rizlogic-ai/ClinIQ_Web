import type { ReactNode } from "react";
import { CalendarDays, FileText, MessageSquareText, AlertCircle, Receipt, Stethoscope, ShieldAlert } from "lucide-react";
import type { Appointment } from "../types";
import { StatusBadge } from "./StatusBadge";
import { useMoney } from "../context/AuthContext";

export function AppointmentCard({
  appointment,
  actions,
}: {
  appointment: Appointment;
  actions?: ReactNode;
}) {
  const money = useMoney();
  const feeTotal = appointment.services.reduce((sum, s) => sum + s.amount, 0);
  const initials = (appointment.patient?.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="card appointment-card">
      <div className="appointment-card-header">
        <div className="patient-identity">
          <div className="avatar">{initials}</div>
          <div>
            <div className="patient-name">{appointment.patient?.name ?? "Unknown patient"}</div>
            <div className="muted">{appointment.patient?.phone}</div>
            {appointment.bookedByPatient && !appointment.patient?.phoneVerified && (
              <span className="badge badge-unverified" title="Booked by a guest — number not verified">
                <ShieldAlert size={11} />
                Unverified number
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="appointment-meta">
        {appointment.doctor && (
          <div className="meta-row">
            <Stethoscope size={15} className="meta-icon" />
            <span>{appointment.doctor.name}</span>
          </div>
        )}
        <div className="meta-row">
          <CalendarDays size={15} className="meta-icon" />
          <span>
            {appointment.date} at {appointment.time}
          </span>
        </div>
        <div className="meta-row">
          <FileText size={15} className="meta-icon" />
          <span>{appointment.reason}</span>
        </div>
        {appointment.doctorNote && (
          <div className="meta-row">
            <MessageSquareText size={15} className="meta-icon" />
            <span>{appointment.doctorNote}</span>
          </div>
        )}
        {appointment.rejectionReason && (
          <div className="meta-row meta-row-danger">
            <AlertCircle size={15} className="meta-icon" />
            <span>{appointment.rejectionReason}</span>
          </div>
        )}
        {appointment.services.length > 0 && (
          <div className="services-list">
            <div className="meta-row">
              <Receipt size={15} className="meta-icon" />
              <span className="muted">Services</span>
            </div>
            <ul>
              {appointment.services.map((s) => (
                <li key={s.id}>
                  <span>{s.description}</span>
                  <span>{money(s.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="fee-total">
              <span>Total</span>
              <span>{money(feeTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {actions && <div className="appointment-actions">{actions}</div>}
    </div>
  );
}
