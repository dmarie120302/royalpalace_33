"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Workspace } from "@/domain/types";
import { Modal, ErrorBox } from "@/components/ui";
import { Icon } from "@/components/icons";
import { api } from "./use-workspace";
export interface AttachmentTarget {
  type: "payment" | "material";
  id: string;
  title: string;
}
export function AttachmentsModal({
  target,
  data,
  projectId,
  admin,
  refresh,
  onClose,
}: {
  target: AttachmentTarget;
  data: Workspace;
  projectId: string;
  admin: boolean;
  refresh: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const files = data.attachments.filter(
    (item) =>
      !item.archived_at &&
      (target.type === "payment"
        ? item.payment_id === target.id
        : item.material_id === target.id),
  );
  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(list)) {
        if (file.size > 10 * 1024 * 1024)
          throw new Error(`${file.name} excede el límite de 10 MB.`);
        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
          ].includes(file.type)
        )
          throw new Error("Adjunta una imagen JPG, PNG, WebP o un PDF.");
        const body = new FormData();
        body.set("file", file);
        body.set("project_id", projectId);
        body.set(
          target.type === "payment" ? "payment_id" : "material_id",
          target.id,
        );
        await api("/api/attachments", { method: "POST", body });
      }
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo adjuntar el comprobante.",
      );
      await refresh().catch(() => undefined);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/attachments/${id}`, { method: "DELETE" });
      await refresh();
      setDeletingId(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo eliminar el archivo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={target.title} busy={busy} onClose={onClose}>
      <div className="attachment-list">
        {files.length ? (
          files.map((file) => (
            <div className="attachment-row" key={file.id}>
              <div className="attachment-file-icon">
                <Icon name="file" />
              </div>
              <Link
                href={`/api/attachments/${file.id}`}
                target="_blank"
                rel="noopener noreferrer"
                prefetch={false}
              >
                <strong>{file.name}</strong>
                <span>{(file.size / 1024).toFixed(0)} KB · Abrir archivo</span>
              </Link>
              {admin && (
                <button
                  className="icon-button"
                  disabled={busy}
                  aria-label={`Eliminar ${file.name}`}
                  onClick={() => setDeletingId(file.id)}
                >
                  <Icon name="close" size={18} />
                </button>
              )}
              {deletingId === file.id && (
                <div className="inline-confirm">
                  <span>¿Eliminar este comprobante?</span>
                  <button
                    type="button"
                    className="text-button danger-text"
                    disabled={busy}
                    onClick={() => remove(file.id)}
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    onClick={() => setDeletingId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="compact-empty">
            <p>Aún no hay comprobantes.</p>
            <span>
              {admin
                ? "Adjunta el recibo o constancia de esta operación."
                : "Los comprobantes aparecerán cuando la administración los adjunte."}
            </span>
          </div>
        )}
      </div>
      {admin && (
        <label className={`upload-zone${busy ? " disabled" : ""}`}>
          <Icon name="plus" size={24} />
          <strong>
            {busy ? "Procesando archivos…" : "Adjuntar comprobantes"}
          </strong>
          <span>JPG, PNG, WebP o PDF · máximo 10 MB por archivo</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            disabled={busy}
            onChange={(event) => upload(event.target.files)}
          />
        </label>
      )}
      {error && <ErrorBox message={error} />}
      <div className="modal-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
