export type Role = "doctor" | "assistant" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: Role;
}

export type SubscriptionStatus = "active" | "paused" | "cancelled";

export interface ClinicSubscription {
  tier1Price: number;
  tier2Price: number;
  tier3PlusPrice: number;
  status: SubscriptionStatus;
  monthlyTotal: number;
}

export interface Clinic {
  id: string;
  name: string;
  country?: string | null;
  city?: string | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
  doctorCount: number;
  subscription: ClinicSubscription | null;
}

export interface StaffMember {
  id: string;
  username: string;
  name: string;
  isActive: boolean;
}

export interface AssistantSummary extends StaffMember {
  doctors: StaffMember[];
}

export interface ClinicStaff {
  doctors: StaffMember[];
  assistants: AssistantSummary[];
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export type PatientHistorySource = "form" | "scan";

export interface PatientHistoryEntry {
  id: string;
  patientId: string;
  authorId: string;
  title: string;
  notes: string;
  source: PatientHistorySource;
  attachmentDataUrl?: string;
  createdAt: string;
}

export type AppointmentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

export interface ServiceLine {
  id: string;
  description: string;
  amount: number;
}

export interface AppointmentHistoryEntry {
  timestamp: string;
  actorId: string;
  action: string;
  detail?: string;
}

export interface Doctor {
  id: string;
  name: string;
  username: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patient: Patient | null;
  doctorId: string;
  doctor: Doctor | null;
  reason: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  doctorNote?: string;
  rejectionReason?: string;
  services: ServiceLine[];
  history: AppointmentHistoryEntry[];
}

export type InvoiceStatus = "unpaid" | "paid" | "cancelled";

export interface Invoice {
  id: string;
  appointmentId: string;
  patientId: string;
  patient: Patient | null;
  doctor: Doctor | null;
  appointmentDate: string | null;
  appointmentReason: string | null;
  services: ServiceLine[];
  total: number;
  status: InvoiceStatus;
  issuedBy: string;
  issuedByName: string | null;
  issuedAt: string;
  paidAt?: string;
}
