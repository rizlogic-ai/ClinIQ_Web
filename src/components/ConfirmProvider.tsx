import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const settle = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="modal-overlay" onClick={() => settle(false)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-icon ${pending.danger ? "confirm-icon-danger" : ""}`}>
              <AlertTriangle size={22} />
            </div>
            <h3>{pending.title}</h3>
            <p className="muted">{pending.message}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => settle(false)}>
                Cancel
              </button>
              <button
                className={pending.danger ? "btn btn-danger" : "btn btn-primary"}
                onClick={() => settle(true)}
                autoFocus
              >
                {pending.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
