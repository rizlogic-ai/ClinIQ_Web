import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Plus,
  Users,
  Stethoscope,
  DollarSign,
  UserPlus,
  ClipboardList,
  Inbox,
  Pencil,
  Trash2,
} from "lucide-react";
import { adminApi } from "../lib/resources";
import type { AssistantSummary, Clinic, ClinicStaff, StaffMember, SubscriptionStatus } from "../types";
import { Modal } from "../components/Modal";
import { StatCard } from "../components/StatCard";
import { useToast } from "../components/ToastProvider";
import { useConfirm } from "../components/ConfirmProvider";
import { COUNTRIES } from "../lib/countries";
import { CURRENCIES, defaultTierPricing, formatMoney } from "../lib/currencies";

export function AdminDashboard() {
  const toast = useToast();
  const confirm = useConfirm();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [staff, setStaff] = useState<ClinicStaff | null>(null);
  const [staffLoading, setStaffLoading] = useState(false);

  const [showNewClinic, setShowNewClinic] = useState(false);
  const [showEditClinic, setShowEditClinic] = useState(false);
  const [showEditSub, setShowEditSub] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [showAddAssistant, setShowAddAssistant] = useState(false);
  const [editDoctor, setEditDoctor] = useState<StaffMember | null>(null);
  const [editAssistant, setEditAssistant] = useState<AssistantSummary | null>(null);

  async function refreshClinics(preferId?: string) {
    setLoading(true);
    try {
      const list = await adminApi.listClinics();
      setClinics(list);
      setSelectedId((prev) => preferId ?? prev ?? (list[0] ? list[0].id : null));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load clinics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshClinics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshStaff(clinicId: string) {
    setStaffLoading(true);
    try {
      setStaff(await adminApi.listStaff(clinicId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load clinic staff");
    } finally {
      setStaffLoading(false);
    }
  }

  useEffect(() => {
    if (selectedId) {
      refreshStaff(selectedId);
    } else {
      setStaff(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function handleDeleteClinic(clinic: Clinic) {
    const ok = await confirm({
      title: `Delete ${clinic.name}?`,
      message:
        "If this clinic has any doctors or assistants on record, it will be deactivated instead of deleted so their history is preserved.",
      confirmLabel: "Delete clinic",
      danger: true,
    });
    if (!ok) return;
    try {
      const result = await adminApi.deleteClinic(clinic.id);
      if (result.deleted) {
        toast.success(`${clinic.name} deleted`);
        setSelectedId((prev) => (prev === clinic.id ? null : prev));
        refreshClinics();
      } else {
        toast.info(`${clinic.name} has staff on record — deactivated instead of deleted`);
        refreshClinics(clinic.id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete clinic");
    }
  }

  async function handleDeleteStaff(person: StaffMember, kind: "doctor" | "assistant") {
    const ok = await confirm({
      title: `Delete ${person.name}?`,
      message:
        "If they have any appointment, invoice or history records, they'll be deactivated instead of deleted so that data is preserved.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok || !selectedId) return;
    try {
      const result = await adminApi.deleteStaff(person.id);
      if (result.deleted) {
        toast.success(`${person.name} deleted`);
      } else {
        toast.info(`${person.name} has records on file — deactivated instead of deleted`);
      }
      refreshStaff(selectedId);
      refreshClinics(selectedId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to delete ${kind}`);
    }
  }

  const selectedClinic = clinics.find((c) => c.id === selectedId) ?? null;

  const totals = useMemo(() => {
    const doctorCount = clinics.reduce((s, c) => s + c.doctorCount, 0);
    const active = clinics.filter((c) => c.subscription?.status === "active");
    const monthlyRevenue = active.reduce((s, c) => s + (c.subscription?.monthlyTotal ?? 0), 0);
    const currencies = new Set(active.map((c) => c.currency));
    const revenueLabel =
      currencies.size <= 1
        ? formatMoney(monthlyRevenue, [...currencies][0] ?? "USD")
        : `${monthlyRevenue.toFixed(2)} (mixed currencies)`;
    return { clinicCount: clinics.length, doctorCount, revenueLabel };
  }, [clinics]);

  return (
    <div className="dashboard">
      <div className="section-eyebrow">Overview</div>
      <div className="stat-row">
        <StatCard icon={Building2} label="Clinics" value={totals.clinicCount} tone="violet" />
        <StatCard icon={Stethoscope} label="Doctors across clinics" value={totals.doctorCount} tone="blue" />
        <StatCard
          icon={DollarSign}
          label="Active monthly revenue"
          value={totals.revenueLabel}
          tone="green"
        />
      </div>

      <div className="admin-layout">
        <div className="card admin-clinic-list">
          <div className="admin-panel-header">
            <h2>Clinics</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewClinic(true)}>
              <Plus size={14} />
              New
            </button>
          </div>
          {loading && <div className="skeleton-card" />}
          {!loading && clinics.length === 0 && (
            <div className="empty-state">
              <Inbox size={24} strokeWidth={1.5} />
              <p>No clinics yet — create the first one.</p>
            </div>
          )}
          <ul className="clinic-list">
            {clinics.map((c) => (
              <li key={c.id}>
                <button
                  className={`clinic-list-item ${c.id === selectedId ? "clinic-list-item-active" : ""}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <span className="clinic-list-name">{c.name}</span>
                  {(c.city || c.country) && (
                    <span className="muted">{[c.city, c.country].filter(Boolean).join(", ")}</span>
                  )}
                  <span className="muted">
                    {c.doctorCount} doctor{c.doctorCount === 1 ? "" : "s"}
                  </span>
                  {!c.isActive && (
                    <span className="badge badge-sub-cancelled">
                      <span className="badge-dot" />
                      Inactive
                    </span>
                  )}
                  {c.subscription && (
                    <span className={`badge badge-sub-${c.subscription.status}`}>
                      <span className="badge-dot" />
                      {c.subscription.status}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="admin-detail">
          {!selectedClinic && (
            <div className="empty-state">
              <ClipboardList size={28} strokeWidth={1.5} />
              <p>Select a clinic to manage its doctors, assistants and subscription.</p>
            </div>
          )}

          {selectedClinic && (
            <>
              <div className="card">
                <div className="admin-panel-header">
                  <div>
                    <h2>
                      {selectedClinic.name}
                      {!selectedClinic.isActive && (
                        <span className="badge badge-sub-cancelled" style={{ marginLeft: "0.5rem" }}>
                          <span className="badge-dot" />
                          Inactive
                        </span>
                      )}
                    </h2>
                    {(selectedClinic.city || selectedClinic.country) && (
                      <p className="muted" style={{ margin: "0.15rem 0 0" }}>
                        {[selectedClinic.city, selectedClinic.country].filter(Boolean).join(", ")}
                        {" · "}
                        {selectedClinic.currency}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowEditClinic(true)}>
                      <Pencil size={13} />
                      Edit
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowEditSub(true)}>
                      Subscription
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteClinic(selectedClinic)}
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>
                {selectedClinic.subscription ? (
                  <div className="subscription-summary">
                    <div>
                      <div className="muted">1st doctor</div>
                      <div className="stat-value">
                        {formatMoney(selectedClinic.subscription.tier1Price, selectedClinic.currency)}
                      </div>
                    </div>
                    <div>
                      <div className="muted">2nd doctor</div>
                      <div className="stat-value">
                        {formatMoney(selectedClinic.subscription.tier2Price, selectedClinic.currency)}
                      </div>
                    </div>
                    <div>
                      <div className="muted">3rd+ doctor (each)</div>
                      <div className="stat-value">
                        {formatMoney(selectedClinic.subscription.tier3PlusPrice, selectedClinic.currency)}
                      </div>
                    </div>
                    <div>
                      <div className="muted">Doctors</div>
                      <div className="stat-value">{selectedClinic.doctorCount}</div>
                    </div>
                    <div>
                      <div className="muted">Monthly total</div>
                      <div className="stat-value">
                        {formatMoney(selectedClinic.subscription.monthlyTotal, selectedClinic.currency)}
                      </div>
                    </div>
                    <span className={`badge badge-sub-${selectedClinic.subscription.status}`}>
                      <span className="badge-dot" />
                      {selectedClinic.subscription.status}
                    </span>
                  </div>
                ) : (
                  <p className="muted">No subscription on file.</p>
                )}
              </div>

              <section>
                <div className="admin-panel-header">
                  <h2>
                    <Stethoscope size={16} />
                    Doctors
                  </h2>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAddDoctor(true)}>
                    <Plus size={14} />
                    Add doctor
                  </button>
                </div>
                {staffLoading && <div className="skeleton-card" />}
                {!staffLoading && staff && staff.doctors.length === 0 && (
                  <div className="empty-state">
                    <p>No doctors in this clinic yet.</p>
                  </div>
                )}
                {!staffLoading && staff && staff.doctors.length > 0 && (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Username</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {staff.doctors.map((d) => (
                          <tr key={d.id}>
                            <td>{d.name}</td>
                            <td>{d.username}</td>
                            <td>
                              <span className={`badge badge-sub-${d.isActive ? "active" : "cancelled"}`}>
                                <span className="badge-dot" />
                                {d.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "0.4rem" }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditDoctor(d)}>
                                  <Pencil size={13} />
                                  Edit
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleDeleteStaff(d, "doctor")}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <div className="admin-panel-header">
                  <h2>
                    <Users size={16} />
                    Assistants
                  </h2>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowAddAssistant(true)}
                    disabled={!staff || staff.doctors.length === 0}
                    title={staff && staff.doctors.length === 0 ? "Add a doctor first" : undefined}
                  >
                    <UserPlus size={14} />
                    Add assistant
                  </button>
                </div>
                {staffLoading && <div className="skeleton-card" />}
                {!staffLoading && staff && staff.assistants.length === 0 && (
                  <div className="empty-state">
                    <p>No assistants in this clinic yet.</p>
                  </div>
                )}
                {!staffLoading && staff && staff.assistants.length > 0 && (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Username</th>
                          <th>Works for</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {staff.assistants.map((a) => (
                          <tr key={a.id}>
                            <td>{a.name}</td>
                            <td>{a.username}</td>
                            <td>{a.doctors.map((d) => d.name).join(", ") || "—"}</td>
                            <td>
                              <span className={`badge badge-sub-${a.isActive ? "active" : "cancelled"}`}>
                                <span className="badge-dot" />
                                {a.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "0.4rem" }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditAssistant(a)}>
                                  <Pencil size={13} />
                                  Edit
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleDeleteStaff(a, "assistant")}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {showNewClinic && (
        <NewClinicModal
          onClose={() => setShowNewClinic(false)}
          onCreated={(clinic) => {
            setShowNewClinic(false);
            toast.success(`${clinic.name} created`);
            refreshClinics(clinic.id);
          }}
        />
      )}

      {showEditClinic && selectedClinic && (
        <EditClinicModal
          clinic={selectedClinic}
          onClose={() => setShowEditClinic(false)}
          onSaved={(clinic) => {
            setShowEditClinic(false);
            setClinics((prev) => prev.map((c) => (c.id === clinic.id ? clinic : c)));
            toast.success("Clinic updated");
          }}
        />
      )}

      {showEditSub && selectedClinic && (
        <EditSubscriptionModal
          clinic={selectedClinic}
          onClose={() => setShowEditSub(false)}
          onSaved={(clinic) => {
            setShowEditSub(false);
            setClinics((prev) => prev.map((c) => (c.id === clinic.id ? clinic : c)));
            toast.success("Subscription updated");
          }}
        />
      )}

      {showAddDoctor && selectedClinic && (
        <AddDoctorModal
          clinicId={selectedClinic.id}
          onClose={() => setShowAddDoctor(false)}
          onCreated={() => {
            setShowAddDoctor(false);
            toast.success("Doctor added");
            refreshClinics(selectedClinic.id);
            refreshStaff(selectedClinic.id);
          }}
        />
      )}

      {showAddAssistant && selectedClinic && staff && (
        <AddAssistantModal
          clinicId={selectedClinic.id}
          doctors={staff.doctors}
          onClose={() => setShowAddAssistant(false)}
          onCreated={() => {
            setShowAddAssistant(false);
            toast.success("Assistant added");
            refreshStaff(selectedClinic.id);
          }}
        />
      )}

      {editDoctor && selectedClinic && (
        <EditStaffModal
          staff={editDoctor}
          title={`Edit doctor — ${editDoctor.name}`}
          onClose={() => setEditDoctor(null)}
          onSaved={() => {
            setEditDoctor(null);
            toast.success("Doctor updated");
            refreshStaff(selectedClinic.id);
          }}
        />
      )}

      {editAssistant && selectedClinic && staff && (
        <EditAssistantModal
          assistant={editAssistant}
          doctors={staff.doctors}
          onClose={() => setEditAssistant(null)}
          onSaved={() => {
            setEditAssistant(null);
            toast.success("Assistant updated");
            refreshStaff(selectedClinic.id);
          }}
        />
      )}
    </div>
  );
}

function NewClinicModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (clinic: Clinic) => void;
}) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [tier1, setTier1] = useState(String(defaultTierPricing("USD").tier1Price));
  const [tier2, setTier2] = useState(String(defaultTierPricing("USD").tier2Price));
  const [tier3, setTier3] = useState(String(defaultTierPricing("USD").tier3PlusPrice));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCurrencyChange(next: string) {
    setCurrency(next);
    const defaults = defaultTierPricing(next);
    setTier1(String(defaults.tier1Price));
    setTier2(String(defaults.tier2Price));
    setTier3(String(defaults.tier3PlusPrice));
  }

  async function submit() {
    if (!name.trim()) {
      setError("Clinic name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const clinic = await adminApi.createClinic({
        name: name.trim(),
        country: country || undefined,
        city: city.trim() || undefined,
        currency,
        tier1Price: Number(tier1) || 0,
        tier2Price: Number(tier2) || 0,
        tier3PlusPrice: Number(tier3) || 0,
      });
      onCreated(clinic);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create clinic");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New clinic" onClose={onClose}>
      <label>
        Clinic name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <div className="form-row">
        <label>
          Country
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Select a country…</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          City
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Karachi" />
        </label>
      </div>
      <label>
        Currency
        <select value={currency} onChange={(e) => handleCurrencyChange(e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Per-doctor subscription pricing — these are just starting suggestions, edit them freely now or
        anytime later.
      </p>
      <div className="form-row">
        <label>
          1st doctor / month
          <input type="number" min="0" step="0.01" value={tier1} onChange={(e) => setTier1(e.target.value)} />
        </label>
        <label>
          2nd doctor / month
          <input type="number" min="0" step="0.01" value={tier2} onChange={(e) => setTier2(e.target.value)} />
        </label>
        <label>
          3rd+ doctor (each) / month
          <input type="number" min="0" step="0.01" value={tier3} onChange={(e) => setTier3(e.target.value)} />
        </label>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={submitting} onClick={submit}>
          Create clinic
        </button>
      </div>
    </Modal>
  );
}

function EditSubscriptionModal({
  clinic,
  onClose,
  onSaved,
}: {
  clinic: Clinic;
  onClose: () => void;
  onSaved: (clinic: Clinic) => void;
}) {
  const [tier1, setTier1] = useState(String(clinic.subscription?.tier1Price ?? 0));
  const [tier2, setTier2] = useState(String(clinic.subscription?.tier2Price ?? 0));
  const [tier3, setTier3] = useState(String(clinic.subscription?.tier3PlusPrice ?? 0));
  const [status, setStatus] = useState<SubscriptionStatus>(clinic.subscription?.status ?? "active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await adminApi.updateSubscription(clinic.id, {
        tier1Price: Number(tier1) || 0,
        tier2Price: Number(tier2) || 0,
        tier3PlusPrice: Number(tier3) || 0,
        status,
      });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update subscription");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Subscription — ${clinic.name}`} onClose={onClose}>
      <p className="muted" style={{ margin: 0 }}>
        Billed per doctor, in {clinic.currency}. Fully editable anytime as your pricing changes.
      </p>
      <div className="form-row">
        <label>
          1st doctor / month
          <input type="number" min="0" step="0.01" value={tier1} onChange={(e) => setTier1(e.target.value)} autoFocus />
        </label>
        <label>
          2nd doctor / month
          <input type="number" min="0" step="0.01" value={tier2} onChange={(e) => setTier2(e.target.value)} />
        </label>
        <label>
          3rd+ doctor (each) / month
          <input type="number" min="0" step="0.01" value={tier3} onChange={(e) => setTier3(e.target.value)} />
        </label>
      </div>
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>
      {error && <div className="error-banner">{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={submitting} onClick={submit}>
          Save changes
        </button>
      </div>
    </Modal>
  );
}

function EditClinicModal({
  clinic,
  onClose,
  onSaved,
}: {
  clinic: Clinic;
  onClose: () => void;
  onSaved: (clinic: Clinic) => void;
}) {
  const [name, setName] = useState(clinic.name);
  const [country, setCountry] = useState(clinic.country ?? "");
  const [city, setCity] = useState(clinic.city ?? "");
  const [currency, setCurrency] = useState(clinic.currency);
  const [isActive, setIsActive] = useState(clinic.isActive);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Clinic name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await adminApi.updateClinic(clinic.id, {
        name: name.trim(),
        country: country || undefined,
        city: city.trim() || undefined,
        currency,
        isActive,
      });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update clinic");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit clinic — ${clinic.name}`} onClose={onClose}>
      <label>
        Clinic name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <div className="form-row">
        <label>
          Country
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Select a country…</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          City
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
      </div>
      <label>
        Currency
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="checkbox-row">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Clinic is active
      </label>
      {error && <div className="error-banner">{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={submitting} onClick={submit}>
          Save changes
        </button>
      </div>
    </Modal>
  );
}

function AddDoctorModal({
  clinicId,
  onClose,
  onCreated,
}: {
  clinicId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!username.trim() || !password || !name.trim()) {
      setError("All fields are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.createDoctor(clinicId, {
        username: username.trim(),
        password,
        name: name.trim(),
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add doctor");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add doctor" onClose={onClose}>
      <label>
        Full name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label>
        Username
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label>
        Temporary password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <div className="error-banner">{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={submitting} onClick={submit}>
          Add doctor
        </button>
      </div>
    </Modal>
  );
}

function AddAssistantModal({
  clinicId,
  doctors,
  onClose,
  onCreated,
}: {
  clinicId: string;
  doctors: StaffMember[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  // With exactly one doctor in the clinic, assume the assistant works for them.
  const [doctorIds, setDoctorIds] = useState<string[]>(
    doctors.length === 1 ? [doctors[0].id] : []
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDoctor(id: string) {
    setDoctorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (!username.trim() || !password || !name.trim()) {
      setError("All fields are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.createAssistant(clinicId, {
        username: username.trim(),
        password,
        name: name.trim(),
        doctorIds,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add assistant");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add assistant" onClose={onClose}>
      <label>
        Full name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label>
        Username
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label>
        Temporary password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <div>
        <span className="field-label">Assign to doctors</span>
        <div className="checkbox-list">
          {doctors.map((d) => (
            <label key={d.id} className="checkbox-row">
              <input
                type="checkbox"
                checked={doctorIds.includes(d.id)}
                onChange={() => toggleDoctor(d.id)}
              />
              {d.name}
            </label>
          ))}
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={submitting} onClick={submit}>
          Add assistant
        </button>
      </div>
    </Modal>
  );
}

function EditStaffModal({
  staff,
  title,
  onClose,
  onSaved,
}: {
  staff: StaffMember;
  title: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(staff.name);
  const [username, setUsername] = useState(staff.username);
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(staff.isActive);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !username.trim()) {
      setError("Name and username are required");
      return;
    }
    if (password && password.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.updateStaff(staff.id, {
        name: name.trim(),
        username: username.trim(),
        password: password || undefined,
        isActive,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save changes");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <label>
        Full name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label>
        Username
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label>
        New password (optional)
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank to keep current password"
        />
      </label>
      <label className="checkbox-row">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>
      {error && <div className="error-banner">{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={submitting} onClick={submit}>
          Save changes
        </button>
      </div>
    </Modal>
  );
}

function EditAssistantModal({
  assistant,
  doctors,
  onClose,
  onSaved,
}: {
  assistant: AssistantSummary;
  doctors: StaffMember[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(assistant.name);
  const [username, setUsername] = useState(assistant.username);
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(assistant.isActive);
  const [doctorIds, setDoctorIds] = useState<string[]>(assistant.doctors.map((d) => d.id));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDoctor(id: string) {
    setDoctorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (!name.trim() || !username.trim()) {
      setError("Name and username are required");
      return;
    }
    if (password && password.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.updateStaff(assistant.id, {
        name: name.trim(),
        username: username.trim(),
        password: password || undefined,
        isActive,
      });
      await adminApi.updateAssistantDoctors(assistant.id, doctorIds);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save changes");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit assistant — ${assistant.name}`} onClose={onClose}>
      <label>
        Full name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label>
        Username
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label>
        New password (optional)
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank to keep current password"
        />
      </label>
      <label className="checkbox-row">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>
      <div>
        <span className="field-label">Assigned doctors</span>
        <div className="checkbox-list">
          {doctors.map((d) => (
            <label key={d.id} className="checkbox-row">
              <input
                type="checkbox"
                checked={doctorIds.includes(d.id)}
                onChange={() => toggleDoctor(d.id)}
              />
              {d.name}
            </label>
          ))}
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={submitting} onClick={submit}>
          Save changes
        </button>
      </div>
    </Modal>
  );
}
