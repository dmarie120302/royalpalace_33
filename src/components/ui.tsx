"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./icons";

export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Cerrar"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
  wide = false,
  hint,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
  hint?: string;
}) {
  return (
    <label className={`form-field${wide ? " full" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-symbol">
        <Icon name="works" size={30} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Progress({
  value,
  label,
  tone = "purple",
}: {
  value: number;
  label?: string;
  tone?: "purple" | "teal";
}) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div className={`progress ${tone}`}>
      {label && (
        <div className="progress-line">
          <span>{label}</span>
        </div>
      )}
      <div className={`progreso${safe >= 100 ? " verde" : ""}`}>
        <progress
          className="progress-track"
          aria-label={label || "Avance"}
          max={100}
          value={safe}
        >
          {safe}%
        </progress>
        <b aria-hidden="true">{Math.round(safe)}%</b>
      </div>
    </div>
  );
}
export function Status({ value }: { value: string }) {
  const names: Record<string, string> = {
    planning: "En planificación",
    active: "En ejecución",
    paused: "Pausada",
    completed: "Completado",
    pending: "Pendiente",
    in_progress: "En ejecución",
    blocked: "Bloqueado",
  };
  return (
    <span className={`status status-${value}`}>
      <i />
      {names[value] || value}
    </span>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}
export const formatDate = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat("es-PA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T12:00:00Z`))
    : "Sin fecha";
