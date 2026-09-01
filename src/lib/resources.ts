import { api } from "./api";
import type {
  Appointment,
  Clinic,
  ClinicStaff,
  Doctor,
  Invoice,
  Patient,
  PatientHistoryEntry,
  StaffMember,
} from "../types";

export const patientsApi = {
  list: () => api.get<{ patients: Patient[] }>("/patients").then((r) => r.patients),
  create: (data: { name: string; phone: string; email?: string; notes?: string }) =>
    api.post<{ patient: Patient }>("/patients", data).then((r) => r.patient),
};

export const patientHistoryApi = {
  list: (patientId: string) =>
    api.get<{ entries: PatientHistoryEntry[] }>(`/patients/${patientId}/history`).then((r) => r.entries),
  create: (
    patientId: string,
    data: { title: string; notes: string; source: "form" | "scan"; attachmentDataUrl?: string }
  ) =>
    api
      .post<{ entry: PatientHistoryEntry }>(`/patients/${patientId}/history`, data)
      .then((r) => r.entry),
};

export const doctorsApi = {
  list: () => api.get<{ doctors: Doctor[] }>("/doctors").then((r) => r.doctors),
};

export const appointmentsApi = {
  list: () =>
    api.get<{ appointments: Appointment[] }>("/appointments").then((r) => r.appointments),
  create: (data: {
    doctorId: string;
    patientId?: string;
    newPatient?: { name: string; phone: string; email?: string };
    reason: string;
    date: string;
    time: string;
  }) => api.post<{ appointment: Appointment }>("/appointments", data).then((r) => r.appointment),
  accept: (id: string) =>
    api.patch<{ appointment: Appointment }>(`/appointments/${id}/accept`).then((r) => r.appointment),
  reject: (id: string, reason: string) =>
    api
      .patch<{ appointment: Appointment }>(`/appointments/${id}/reject`, { reason })
      .then((r) => r.appointment),
  reschedule: (id: string, data: { date: string; time: string; note?: string }) =>
    api
      .patch<{ appointment: Appointment }>(`/appointments/${id}/reschedule`, data)
      .then((r) => r.appointment),
  complete: (id: string, services: { description: string; amount: number }[]) =>
    api
      .patch<{ appointment: Appointment }>(`/appointments/${id}/complete`, { services })
      .then((r) => r.appointment),
  cancel: (id: string) =>
    api.patch<{ appointment: Appointment }>(`/appointments/${id}/cancel`).then((r) => r.appointment),
};

export const invoicesApi = {
  list: () => api.get<{ invoices: Invoice[] }>("/invoices").then((r) => r.invoices),
  create: (appointmentId: string) =>
    api.post<{ invoice: Invoice }>("/invoices", { appointmentId }).then((r) => r.invoice),
  pay: (id: string) => api.patch<{ invoice: Invoice }>(`/invoices/${id}/pay`).then((r) => r.invoice),
};

export const adminApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string; admin: { id: string; name: string; username: string } }>(
      "/admin/login",
      { username, password }
    ),
  listClinics: () => api.get<{ clinics: Clinic[] }>("/admin/clinics").then((r) => r.clinics),
  createClinic: (data: {
    name: string;
    country?: string;
    city?: string;
    currency: string;
    tier1Price: number;
    tier2Price: number;
    tier3PlusPrice: number;
  }) => api.post<{ clinic: Clinic }>("/admin/clinics", data).then((r) => r.clinic),
  updateClinic: (
    clinicId: string,
    data: { name?: string; country?: string; city?: string; currency?: string; isActive?: boolean }
  ) => api.patch<{ clinic: Clinic }>(`/admin/clinics/${clinicId}`, data).then((r) => r.clinic),
  deleteClinic: (clinicId: string) =>
    api.delete<{ deleted: boolean; deactivated?: boolean; clinic?: Clinic }>(
      `/admin/clinics/${clinicId}`
    ),
  updateSubscription: (
    clinicId: string,
    data: {
      tier1Price?: number;
      tier2Price?: number;
      tier3PlusPrice?: number;
      status?: string;
    }
  ) =>
    api
      .patch<{ clinic: Clinic }>(`/admin/clinics/${clinicId}/subscription`, data)
      .then((r) => r.clinic),
  listStaff: (clinicId: string) =>
    api.get<ClinicStaff>(`/admin/clinics/${clinicId}/staff`),
  createDoctor: (clinicId: string, data: { username: string; password: string; name: string }) =>
    api
      .post<{ doctor: { id: string; username: string; name: string } }>(
        `/admin/clinics/${clinicId}/doctors`,
        data
      )
      .then((r) => r.doctor),
  createAssistant: (
    clinicId: string,
    data: { username: string; password: string; name: string; doctorIds?: string[] }
  ) =>
    api
      .post<{ assistant: { id: string; username: string; name: string } }>(
        `/admin/clinics/${clinicId}/assistants`,
        data
      )
      .then((r) => r.assistant),
  updateStaff: (
    id: string,
    data: { name?: string; username?: string; password?: string; isActive?: boolean }
  ) =>
    api
      .patch<{ staff: { id: string; username: string; name: string; role: string; isActive: boolean } }>(
        `/admin/staff/${id}`,
        data
      )
      .then((r) => r.staff),
  deleteStaff: (id: string) =>
    api.delete<{
      deleted: boolean;
      deactivated?: boolean;
      staff?: { id: string; username: string; name: string; role: string; isActive: boolean };
    }>(`/admin/staff/${id}`),
  updateAssistantDoctors: (id: string, doctorIds: string[]) =>
    api
      .patch<{ doctors: StaffMember[] }>(`/admin/staff/${id}/doctors`, { doctorIds })
      .then((r) => r.doctors),
};
