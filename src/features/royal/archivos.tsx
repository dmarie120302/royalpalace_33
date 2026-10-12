"use client";
// Files and links of the project: filters, rename, replace, delete and add.
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { api } from "@/features/workspace/use-workspace";
import { fmt, type Royal } from "./model";
import { Chip } from "./parts";
import type { RoyalProps } from "./views";

interface Contexto {
  origen: "Pago" | "Material";
  detalle: string;
  fechaMov: string;
  faseIds: string[];
  espacioIds: string[];
  contratistaIds: string[];
  trabajoId: string | null;
  materialId: string | null;
}

function contexto(
  r: Royal,
  pagoId: string | null,
  materialId: string | null,
): Contexto | null {
  if (pagoId) {
    for (const p of r.partidas) {
      const x = p.pagos.find((y) => y.id === pagoId);
      if (x)
        return {
          origen: "Pago",
          detalle: `${p.nombre} · ${x.concepto} · ${fmt(x.monto)}`,
          fechaMov: x.fecha,
          faseIds: p.faseId ? [p.faseId] : [],
          espacioIds: p.espacioIds,
          contratistaIds: [x.contratistaId],
          trabajoId: p.id,
          materialId: null,
        };
    }
    return null;
  }
  const m = r.materiales.find((y) => y.id === materialId);
  if (!m) return null;
  return {
    origen: "Material",
    detalle: `${m.tienda} · ${m.descripcion} · ${fmt(m.monto)}`,
    fechaMov: m.fecha,
    faseIds: m.faseIds,
    espacioIds: m.espacioIds,
    contratistaIds: m.contratistaIds,
    trabajoId: m.partidaId,
    materialId: m.id,
  };
}

const kb = (n: number) =>
  n >= 1048576
    ? `${(n / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;
const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

function Ventana({
  titulo,
  error,
  busy,
  onClose,
  onSubmit,
  children,
}: {
  titulo: string;
  error: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-r abierto">
      <dialog open aria-label={titulo}>
        <form onSubmit={onSubmit} noValidate>
          <h3 style={{ marginTop: 0 }}>{titulo}</h3>
          {children}
          {error && (
            <p
              role="alert"
              style={{ color: "var(--warn)", margin: "10px 0 0" }}
            >
              {error}
            </p>
          )}
          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="sec"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </button>
            <button type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

type Edicion =
  | { tipo: "renombrar"; id: string; nombre: string }
  | { tipo: "link"; id?: string; nombre: string; url: string; destino: string }
  | { tipo: "subir"; destino: string };

export function Archivos(props: RoyalProps) {
  const { r, admin, project, refresh, notify } = props;
  const [fFase, setFase] = useState("todos");
  const [fCon, setCon] = useState("todos");
  const [fEsp, setEsp] = useState("todos");
  const [fTra, setTra] = useState("todos");
  const [fMat, setMat] = useState("todos");
  const [fTipo, setTipo] = useState("todos");
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const reemplazo = useRef<HTMLInputElement>(null);
  const [reemplazarId, setReemplazarId] = useState("");

  const destinos = [
    ...r.partidas.flatMap((p) =>
      p.pagos.map((x) => ({
        valor: `pago:${x.id}`,
        texto: `Pago · ${p.nombre} · ${x.fecha} · ${x.concepto} · ${fmt(x.monto)}`,
      })),
    ),
    ...r.materiales.map((m) => ({
      valor: `material:${m.id}`,
      texto: `Material · ${m.fecha} · ${m.tienda} · ${m.descripcion} · ${fmt(m.monto)}`,
    })),
  ];

  const items = [
    ...r.archivos.map((a) => ({
      clase: "archivo" as const,
      id: a.id,
      nombre: a.nombre,
      fecha: a.fecha,
      tipo: a.tipo,
      tamano: a.tamano,
      url: `/api/attachments/${a.id}`,
      ctx: contexto(r, a.pagoId, a.materialId),
      pagoId: a.pagoId,
      materialId: a.materialId,
    })),
    ...r.enlaces.map((l) => ({
      clase: "link" as const,
      id: l.id,
      nombre: l.nombre,
      fecha: l.fecha,
      tipo: "link",
      tamano: 0,
      url: l.url,
      ctx: contexto(r, l.pagoId, l.materialId),
      pagoId: l.pagoId,
      materialId: l.materialId,
    })),
  ]
    .filter((a) => a.ctx)
    .filter((a) => {
      const c = a.ctx!;
      const en = (v: string, ids: string[]) =>
        v === "todos" || (v === "ninguno" ? !ids.length : ids.includes(v));
      const tipoOk =
        fTipo === "todos" ||
        (fTipo === "pagos" && c.origen === "Pago") ||
        (fTipo === "materiales" && c.origen === "Material") ||
        (fTipo === "imagenes" && a.tipo.startsWith("image/")) ||
        (fTipo === "pdf" && a.tipo === "application/pdf") ||
        (fTipo === "links" && a.clase === "link");
      return (
        tipoOk &&
        en(fFase, c.faseIds) &&
        en(fCon, c.contratistaIds) &&
        en(fEsp, c.espacioIds) &&
        (fTra === "todos" || c.trabajoId === fTra) &&
        (fMat === "todos" || c.materialId === fMat)
      );
    })
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const activo = [fFase, fCon, fEsp, fTra, fMat, fTipo].some(
    (v) => v !== "todos",
  );

  async function correr(accion: () => Promise<void>, ok: string) {
    setBusy(true);
    setError("");
    try {
      await accion();
      await refresh();
      notify(ok);
      setEdicion(null);
      setFiles([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edicion) return;
    if (edicion.tipo === "renombrar")
      return correr(
        () =>
          api(`/api/attachments/${edicion.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name: edicion.nombre }),
          }).then(() => undefined),
        "Nombre actualizado.",
      );
    if (edicion.tipo === "link") {
      if (!edicion.id && !edicion.destino)
        return setError("Elige a qué pago o material pertenece.");
      const [clase, id] = edicion.destino.split(":");
      return correr(
        () =>
          (edicion.id
            ? api(`/api/links/${edicion.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                  name: edicion.nombre,
                  url: edicion.url.trim(),
                }),
              })
            : api("/api/links", {
                method: "POST",
                body: JSON.stringify({
                  project_id: project.id,
                  [clase === "pago" ? "payment_id" : "material_id"]: id,
                  name: edicion.nombre,
                  url: edicion.url.trim(),
                }),
              })
          ).then(() => undefined),
        edicion.id ? "Enlace actualizado." : "Enlace agregado.",
      );
    }
    if (!edicion.destino)
      return setError("Elige a qué pago o material pertenece.");
    if (!files.length) return setError("Elige uno o más archivos.");
    const [clase, id] = edicion.destino.split(":");
    return correr(async () => {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024)
          throw new Error(`${file.name} excede el límite de 10 MB.`);
        const body = new FormData();
        body.set("file", file);
        body.set("project_id", project.id);
        body.set(clase === "pago" ? "payment_id" : "material_id", id);
        await api("/api/attachments", { method: "POST", body });
      }
    }, "Archivos subidos.");
  }

  async function reemplazar(file: File | undefined) {
    if (!file || !reemplazarId) return;
    const body = new FormData();
    body.set("file", file);
    setBusy(true);
    try {
      await api(`/api/attachments/${reemplazarId}`, { method: "PATCH", body });
      await refresh();
      notify(
        "Archivo reemplazado. Se actualizó en todos los lugares donde aparece.",
      );
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "No se pudo reemplazar.",
        true,
      );
    } finally {
      setBusy(false);
      setReemplazarId("");
      if (reemplazo.current) reemplazo.current.value = "";
    }
  }

  async function borrar(clase: "archivo" | "link", id: string, nombre: string) {
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return;
    setBusy(true);
    try {
      await api(
        clase === "archivo" ? `/api/attachments/${id}` : `/api/links/${id}`,
        {
          method: "DELETE",
        },
      );
      await refresh();
      notify(clase === "archivo" ? "Archivo eliminado." : "Enlace eliminado.");
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "No se pudo eliminar.",
        true,
      );
    } finally {
      setBusy(false);
    }
  }

  const sel = (
    label: string,
    value: string,
    set: (v: string) => void,
    opciones: { v: string; t: string }[],
  ) => (
    <div className="campo">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => set(e.target.value)}
      >
        {opciones.map((o) => (
          <option key={o.v} value={o.v}>
            {o.t}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <div className="filtros no-imprimir">
        {sel("Tipo", fTipo, setTipo, [
          { v: "todos", t: "Todo" },
          { v: "pagos", t: "Comprobantes de pagos" },
          { v: "materiales", t: "Fotos de materiales" },
          { v: "imagenes", t: "Solo imágenes" },
          { v: "pdf", t: "Solo PDF" },
          { v: "links", t: "Solo links" },
        ])}
        {sel("Fase", fFase, setFase, [
          { v: "todos", t: "Todas las fases" },
          { v: "ninguno", t: "Sin fase" },
          ...r.fases.map((x) => ({ v: x.id, t: x.nombre })),
        ])}
        {sel("Contratista", fCon, setCon, [
          { v: "todos", t: "Todos los contratistas" },
          { v: "ninguno", t: "Sin contratista" },
          ...r.contratistas.map((x) => ({ v: x.id, t: x.nombre })),
        ])}
        {sel("Espacio", fEsp, setEsp, [
          { v: "todos", t: "Todos los espacios" },
          { v: "ninguno", t: "Sin espacio" },
          ...r.espacios.map((x) => ({ v: x.id, t: x.nombre })),
        ])}
        {sel("Trabajo", fTra, setTra, [
          { v: "todos", t: "Todos los trabajos" },
          ...r.partidas.map((x) => ({ v: x.id, t: x.nombre })),
        ])}
        {sel("Material", fMat, setMat, [
          { v: "todos", t: "Todos los materiales" },
          ...r.materiales.map((x) => ({
            v: x.id,
            t: `${x.tienda} · ${x.descripcion}`,
          })),
        ])}
        {activo && (
          <button
            className="sec"
            onClick={() => {
              setFase("todos");
              setCon("todos");
              setEsp("todos");
              setTra("todos");
              setMat("todos");
              setTipo("todos");
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>
      {admin && (
        <div
          className="fila no-imprimir"
          style={{ justifyContent: "flex-start", marginBottom: 12 }}
        >
          <button
            onClick={() => {
              setError("");
              setFiles([]);
              setEdicion({ tipo: "subir", destino: "" });
            }}
          >
            + Subir archivo
          </button>
          <button
            onClick={() => {
              setError("");
              setEdicion({ tipo: "link", nombre: "", url: "", destino: "" });
            }}
          >
            + Agregar link
          </button>
        </div>
      )}
      <p className="resumen-filtro">
        <b>{items.length}</b> elemento(s)
      </p>
      <input
        ref={reemplazo}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => reemplazar(e.target.files?.[0])}
      />
      {items.length ? (
        <div className="grid-archivos">
          {items.map((a) => {
            const c = a.ctx!;
            return (
              <div key={`${a.clase}-${a.id}`} className="card archivo">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="archivo-abrir"
                >
                  {a.clase === "link" ? (
                    <span className="archivo-doc">🔗 {host(a.url)}</span>
                  ) : a.tipo.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.nombre} loading="lazy" />
                  ) : (
                    <span className="archivo-doc">📄 PDF</span>
                  )}
                  <b className="archivo-nombre">{a.nombre}</b>
                </a>
                <span className="meta">
                  {c.origen} · {c.fechaMov}
                </span>
                <span className="meta">{c.detalle}</span>
                <div>
                  {r.fases
                    .filter((x) => c.faseIds.includes(x.id))
                    .map((x) => (
                      <Chip key={x.id} it={x} />
                    ))}
                  {r.espacios
                    .filter((x) => c.espacioIds.includes(x.id))
                    .map((x) => (
                      <Chip key={x.id} it={x} />
                    ))}
                  {r.contratistas
                    .filter((x) => c.contratistaIds.includes(x.id))
                    .map((x) => (
                      <Chip key={x.id} it={{ ...x, letra: undefined }} />
                    ))}
                </div>
                <span className="meta">
                  {a.clase === "link"
                    ? `Agregado ${a.fecha}`
                    : `Subido ${a.fecha} · ${kb(a.tamano)}`}
                </span>
                {admin && (
                  <div className="archivo-acciones">
                    {a.clase === "archivo" ? (
                      <>
                        <button
                          className="sec mini"
                          disabled={busy}
                          onClick={() => {
                            setError("");
                            setEdicion({
                              tipo: "renombrar",
                              id: a.id,
                              nombre: a.nombre,
                            });
                          }}
                        >
                          ✎ Nombre
                        </button>
                        <button
                          className="sec mini"
                          disabled={busy}
                          onClick={() => {
                            setReemplazarId(a.id);
                            reemplazo.current?.click();
                          }}
                        >
                          ⟳ Reemplazar
                        </button>
                      </>
                    ) : (
                      <button
                        className="sec mini"
                        disabled={busy}
                        onClick={() => {
                          setError("");
                          setEdicion({
                            tipo: "link",
                            id: a.id,
                            nombre: a.nombre,
                            url: a.url,
                            destino: a.pagoId
                              ? `pago:${a.pagoId}`
                              : `material:${a.materialId}`,
                          });
                        }}
                      >
                        ✎ Editar
                      </button>
                    )}
                    <button
                      className="peligro mini"
                      disabled={busy}
                      aria-label={`Eliminar ${a.nombre}`}
                      onClick={() => borrar(a.clase, a.id, a.nombre)}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="meta">
          {activo
            ? "No hay archivos con estos filtros."
            : "Aún no hay archivos ni links."}
        </p>
      )}
      {edicion && (
        <Ventana
          titulo={
            edicion.tipo === "renombrar"
              ? "Cambiar nombre del archivo"
              : edicion.tipo === "link"
                ? edicion.id
                  ? "Editar link"
                  : "Agregar link"
                : "Subir archivo"
          }
          error={error}
          busy={busy}
          onClose={() => setEdicion(null)}
          onSubmit={guardar}
        >
          {edicion.tipo !== "renombrar" &&
            !(edicion.tipo === "link" && edicion.id) && (
              <label>
                ¿De qué pago o material es?
                <select
                  style={{ width: "100%" }}
                  value={edicion.destino}
                  onChange={(e) =>
                    setEdicion({ ...edicion, destino: e.target.value })
                  }
                >
                  <option value="">Selecciona…</option>
                  {destinos.map((d) => (
                    <option key={d.valor} value={d.valor}>
                      {d.texto}
                    </option>
                  ))}
                </select>
              </label>
            )}
          {edicion.tipo !== "subir" && (
            <label>
              Nombre
              <input
                value={edicion.nombre}
                onChange={(e) =>
                  setEdicion({ ...edicion, nombre: e.target.value })
                }
                placeholder={
                  edicion.tipo === "link" ? "Ej.: Cotización en Drive" : ""
                }
              />
            </label>
          )}
          {edicion.tipo === "link" && (
            <label>
              Enlace
              <input
                value={edicion.url}
                inputMode="url"
                onChange={(e) =>
                  setEdicion({ ...edicion, url: e.target.value })
                }
                placeholder="https://"
              />
            </label>
          )}
          {edicion.tipo === "subir" && (
            <label>
              Archivos (fotos o PDF, hasta 10 MB cada uno)
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </label>
          )}
        </Ventana>
      )}
    </>
  );
}
