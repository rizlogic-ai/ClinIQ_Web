import { useEffect, useRef, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { patientHistoryApi } from "../lib/resources";
import type { PatientHistoryEntry } from "../types";
import { Modal } from "./Modal";
import { useToast } from "./ToastProvider";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function PatientHistoryModal({
  patientId,
  patientName,
  onClose,
}: {
  patientId: string;
  patientName: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [entries, setEntries] = useState<PatientHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"form" | "scan">("form");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | undefined>();
  const [ocrRunning, setOcrRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLoading(true);
    try {
      setEntries(await patientHistoryApi.list(patientId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  function resetForm() {
    setTitle("");
    setNotes("");
    setAttachmentDataUrl(undefined);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Image is too large (max 5MB)");
      return;
    }

    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    setAttachmentDataUrl(dataUrl);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));

    setOcrRunning(true);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(dataUrl);
      await worker.terminate();
      setNotes((prev) => prev || data.text.trim());
    } catch {
      toast.error("Couldn't read text from the image automatically — you can still type notes manually.");
    } finally {
      setOcrRunning(false);
    }
  }

  async function submit() {
    if (!title.trim() || !notes.trim()) {
      setError("Title and notes are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await patientHistoryApi.create(patientId, {
        title: title.trim(),
        notes: notes.trim(),
        source: mode,
        attachmentDataUrl: mode === "scan" ? attachmentDataUrl : undefined,
      });
      toast.success("History entry saved");
      resetForm();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save history entry");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Patient history — ${patientName}`} onClose={onClose}>
      <div className="segmented">
        <button
          type="button"
          className={mode === "form" ? "segmented-active" : ""}
          onClick={() => {
            setMode("form");
            resetForm();
          }}
        >
          Type notes
        </button>
        <button
          type="button"
          className={mode === "scan" ? "segmented-active" : ""}
          onClick={() => {
            setMode("scan");
            resetForm();
          }}
        >
          Scan document
        </button>
      </div>

      <label>
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Follow-up visit notes"
        />
      </label>

      {mode === "scan" && (
        <label>
          Document photo
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      )}

      {ocrRunning && <p className="muted">Reading text from the image…</p>}

      {attachmentDataUrl && mode === "scan" && (
        <img
          src={attachmentDataUrl}
          alt="Scanned document"
          style={{ maxHeight: 140, borderRadius: 8, border: "1px solid var(--border-soft)" }}
        />
      )}

      <label>
        Notes
        <textarea
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={mode === "scan" ? "Extracted text will appear here — edit as needed" : "Notes"}
        />
      </label>

      {error && <div className="error-banner">{error}</div>}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
        <button className="btn btn-primary" disabled={submitting || ocrRunning} onClick={submit}>
          <Plus size={15} />
          Add entry
        </button>
      </div>

      <div className="section">
        <h2>
          <FileText size={16} />
          Past entries
        </h2>
        {loading && <div className="skeleton-card" />}
        {!loading && entries.length === 0 && (
          <div className="empty-state">
            <p>No history recorded yet.</p>
          </div>
        )}
        {!loading && entries.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {entries.map((entry) => (
              <li key={entry.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                  <strong>{entry.title}</strong>
                  <span className="muted">{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ whiteSpace: "pre-wrap", marginBottom: entry.attachmentDataUrl ? "0.5rem" : 0 }}>
                  {entry.notes}
                </p>
                {entry.attachmentDataUrl && (
                  <img
                    src={entry.attachmentDataUrl}
                    alt="Attachment"
                    style={{ maxHeight: 100, borderRadius: 8, border: "1px solid var(--border-soft)" }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
