import type { Invoice } from "../types";
import { useMoney } from "../context/AuthContext";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const money = useMoney();
  return (
    <div className="invoice-doc">
      <div className="invoice-doc-header">
        <div>
          <h2>Invoice</h2>
          <div className="muted">#{invoice.id.slice(0, 8).toUpperCase()}</div>
        </div>
        <span className={`badge badge-${invoice.status}`}>{invoice.status}</span>
      </div>

      <div className="invoice-doc-grid">
        <div>
          <div className="invoice-doc-label">Bill to</div>
          <div className="invoice-doc-value">{invoice.patient?.name ?? "Unknown patient"}</div>
          {invoice.patient?.phone && <div className="muted">{invoice.patient.phone}</div>}
        </div>
        <div>
          <div className="invoice-doc-label">Invoice date</div>
          <div className="invoice-doc-value">{formatDate(invoice.issuedAt)}</div>
        </div>
        <div>
          <div className="invoice-doc-label">Attending doctor</div>
          <div className="invoice-doc-value">{invoice.doctor?.name ?? "—"}</div>
        </div>
        <div>
          <div className="invoice-doc-label">Reason for visit</div>
          <div className="invoice-doc-value">{invoice.appointmentReason ?? "—"}</div>
          {invoice.appointmentDate && <div className="muted">{invoice.appointmentDate}</div>}
        </div>
      </div>

      <table className="table invoice-doc-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style={{ textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.services.map((s) => (
            <tr key={s.id}>
              <td>{s.description}</td>
              <td style={{ textAlign: "right" }}>{money(s.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ fontWeight: 700 }}>Total</td>
            <td style={{ textAlign: "right", fontWeight: 700 }}>{money(invoice.total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="invoice-doc-status">
        {invoice.status === "paid" && invoice.paidAt ? (
          <span>Paid in full on {formatDate(invoice.paidAt)}</span>
        ) : invoice.status === "unpaid" ? (
          <span>Payment due upon receipt</span>
        ) : (
          <span>This invoice has been cancelled</span>
        )}
      </div>

      <div className="invoice-doc-signoff">
        <div className="invoice-doc-signature">
          <div className="invoice-doc-signature-line" />
          <div className="muted">Assistant signature — {invoice.issuedByName ?? "—"}</div>
        </div>
        <div className="invoice-doc-signature">
          <div className="invoice-doc-signature-line" />
          <div className="muted">Date — {formatDate(invoice.issuedAt)}</div>
        </div>
      </div>
    </div>
  );
}
