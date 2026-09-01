import { Clock, CheckCircle2, XCircle, BadgeCheck, Ban } from "lucide-react";
import type { AppointmentStatus, InvoiceStatus } from "../types";

const APPT_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};

const INVOICE_LABELS: Record<InvoiceStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  cancelled: "Cancelled",
};

const ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  accepted: CheckCircle2,
  completed: BadgeCheck,
  rejected: XCircle,
  cancelled: Ban,
  unpaid: Clock,
  paid: BadgeCheck,
};

export function StatusBadge({ status }: { status: AppointmentStatus | InvoiceStatus }) {
  const label = APPT_LABELS[status as AppointmentStatus] ?? INVOICE_LABELS[status as InvoiceStatus];
  const Icon = ICONS[status];
  return (
    <span className={`badge badge-${status}`}>
      <Icon size={12} strokeWidth={2.5} />
      {label}
    </span>
  );
}
