"use client";
// Forms of ph33-royal-palace-v14.html (modal, pickers, icon grid and palette),
// saving through the existing API.
import { useState, type FormEvent, type ReactNode } from "react";
import type { MutationInput, Resource, Workspace } from "@/domain/types";
import { toCents, today } from "@/domain/finance";
import {
  emailToUsername,
  isValidPin,
  isValidUsername,
  usernameToEmail,
} from "@/domain/access";
import { api } from "@/features/workspace/use-workspace";
import type { Item, Royal } from "./model";
import { Chip, Icono, ICONOS, NOMBRES, PALETA, SvgIcono } from "./parts";

const COLOR_DEFECTO = "#5b4fd6";
const str = (v: unknown) => (v == null ? "" : String(v));
const dinero = (cents: unknown) =>
  typeof cents === "number" ? (cents / 100).toFixed(2) : "";

function Picker({
  items,
  sel,
  multi,
  vacio,
  onChange,
  label,
}: {
  items: Item[];
  sel: string[];
  multi: boolean;
  vacio: string;
  onChange: (ids: string[]) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const elegidos = items.filter((i) => sel.includes(i.id));
  return (
    <details
      className="picker"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary aria-label={label}>
        {elegidos.length ? (
          elegidos.map((i) => <Chip key={i.id} it={i} />)
        ) : (
          <span className="meta">{vacio}</span>
        )}
      </summary>
      <div className="picker-lista">
        {!multi && (
          <label className="pi">
            <input
              type="radio"
              checked={!sel.length}
              onChange={() => {
                onChange([]);
                setOpen(false);
              }}
            />
            <span className="meta">{vacio}</span>
          </label>
        )}
        {items.length ? (
          items.map((i) => (
            <label className="pi" key={i.id}>
              <input
                type={multi ? "checkbox" : "radio"}
                checked={sel.includes(i.id)}
                onChange={(e) => {
                  if (multi)
                    onChange(
                      e.target.checked
                        ? [...sel, i.id]
                        : sel.filter((x) => x !== i.id),
                    );
                  else {
                    onChange([i.id]);
                    setOpen(false);
                  }
                }}
              />
              <Icono it={i} /> <span>{i.nombre}</span>{" "}
              {i.detalle && <span className="meta">{i.detalle}</span>}
            </label>
          ))
        ) : (
          <p className="meta">Aún no hay opciones. Créalas en su pestaña.</p>
        )}
      </div>
    </details>
  );
}

function Paleta({
  color,
  onChange,
}: {
  color: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="paleta">
      {PALETA.map((col) => (
        <button
          type="button"
          key={col}
          aria-label={`Color ${col}`}
          className={`swatch ${color === col ? "sel" : ""}`}
          style={{ background: col }}
          onClick={() => onChange(col)}
        />
      ))}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}

function Modal({
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
              flexWrap: "wrap",
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

async function subir(
  files: File[],
  projectId: string,
  key: "payment_id" | "material_id",
  id: string,
) {
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024)
      throw new Error(`${file.name} excede el límite de 10 MB.`);
    if (
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        file.type,
      )
    )
      throw new Error("Adjunta una imagen JPG, PNG, WebP o un PDF.");
    const body = new FormData();
    body.set("file", file);
    body.set("project_id", projectId);
    body.set(key, id);
    await api("/api/attachments", { method: "POST", body });
  }
}

function Fotos({
  files,
  onChange,
  label,
}: {
  files: File[];
  onChange: (f: File[]) => void;
  label: string;
}) {
  return (
    <>
      <label>
        {label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={(e) => onChange(Array.from(e.target.files || []))}
        />
      </label>
      {files.length > 0 && (
        <div className="prev-grid">
          {files.map((f) =>
            f.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.name} src={URL.createObjectURL(f)} alt={f.name} />
            ) : (
              <span key={f.name} className="meta">
                📄 {f.name}
              </span>
            ),
          )}
        </div>
      )}
    </>
  );
}

export interface RoyalFormProps {
  resource: Resource;
  record: MutationInput;
  data: Workspace;
  r: Royal;
  projectId: string;
  onSave: (resource: Resource, input: MutationInput) => Promise<string>;
  refresh: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
  onClose: () => void;
}

export const ROYAL_FORMS: Resource[] = [
  "spaces",
  "phases",
  "categories",
  "contractors",
  "work_items",
  "payments",
  "material_purchases",
];

export function RoyalForm(props: RoyalFormProps) {
  const { resource, record, data, r, projectId, onSave, onClose } = props;
  const id = str(record.id) || undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Shared fields
  const [nombre, setNombre] = useState(str(record.name));
  const [color, setColor] = useState(str(record.color) || COLOR_DEFECTO);
  const [icono, setIcono] = useState(str(record.icon) || "casa");
  const [espacios, setEspacios] = useState<string[]>(
    Array.isArray(record.space_ids) ? (record.space_ids as string[]) : [],
  );
  const [fase, setFase] = useState<string[]>(
    record.phase_id ? [str(record.phase_id)] : [],
  );
  // Work
  const work = data.works.find((w) => w.id === id);
  const [inicio, setInicio] = useState(str(record.start_date));
  const [fin, setFin] = useState(str(record.end_date));
  const [presupuesto, setPresupuesto] = useState(dinero(record.budget_cents));
  const [contratistas, setContratistas] = useState<string[]>(
    work ? work.assignments.map((a) => a.contractor_id) : [],
  );
  // Contractor
  const [oficio, setOficio] = useState(str(record.trade));
  const [telefono, setTelefono] = useState(str(record.phone));
  const [usuario, setUsuario] = useState(emailToUsername(str(record.email)));
  const [codigo, setCodigo] = useState("");
  // Payment / material
  const [fecha, setFecha] = useState(str(record.date) || today());
  const [monto, setMonto] = useState(dinero(record.amount_cents));
  const [concepto, setConcepto] = useState(str(record.description));
  const [beneficiario, setBeneficiario] = useState(str(record.contractor_id));
  const [tienda, setTienda] = useState(str(record.store));
  const [cantidad, setCantidad] = useState(str(record.quantity));
  const [categoria, setCategoria] = useState<string[]>(
    record.category_id ? [str(record.category_id)] : [],
  );
  const [trabajo, setTrabajo] = useState(str(record.work_item_id));
  const [quien, setQuien] = useState<string[]>(
    record.contractor_id ? [str(record.contractor_id)] : [],
  );
  const [incluido, setIncluido] = useState(!!record.covered_by_payment_id);
  const [pagoCubre, setPagoCubre] = useState(str(record.covered_by_payment_id));
  const [files, setFiles] = useState<File[]>([]);

  const titulo = (() => {
    const pre = id ? "Editar" : "Nuevo";
    const preF = id ? "Editar" : "Nueva";
    if (resource === "spaces")
      return `${preF === "Nueva" ? "Nuevo" : "Editar"} espacio`;
    if (resource === "phases") return `${preF} fase`;
    if (resource === "categories") return `${preF} categoría`;
    if (resource === "contractors") return `${pre} contratista`;
    if (resource === "work_items") return `${pre} trabajo`;
    if (resource === "material_purchases") return `${pre} material`;
    const w = r.partidas.find((p) => p.id === str(record.work_item_id));
    return `${id ? "Editar pago" : "Registrar pago"}${w ? " · " + w.nombre : ""}`;
  })();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const input: MutationInput = id
        ? { id, project_id: projectId }
        : { project_id: projectId };
      if (["spaces", "phases", "categories"].includes(resource)) {
        if (!nombre.trim()) throw new Error("Escribe el nombre.");
        Object.assign(input, { name: nombre.trim(), color, icon: icono });
        if (resource === "phases") input.space_ids = espacios;
        await onSave(resource, input);
      } else if (resource === "contractors") {
        if (!nombre.trim())
          throw new Error("Escribe el nombre del contratista.");
        const u = usuario.trim().toLowerCase();
        if (u && !u.includes("@") && !isValidUsername(u))
          throw new Error(
            "El usuario debe tener de 3 a 30 letras minúsculas, números, puntos o guiones, sin espacios.",
          );
        if (codigo && !isValidPin(codigo))
          throw new Error(
            "El código de acceso debe tener exactamente 6 números.",
          );
        if (codigo && !u)
          throw new Error("Escribe el usuario para poder asignar el código.");
        Object.assign(input, {
          name: nombre.trim(),
          trade: oficio.trim(),
          phone: telefono.trim(),
          email: u.includes("@") ? u : usernameToEmail(u),
          color,
        });
        const saved = await onSave(resource, input);
        if (codigo) {
          try {
            const res = await api<{ message: string }>("/api/invitations", {
              method: "POST",
              body: JSON.stringify({
                project_id: projectId,
                contractor_id: saved,
                pin: codigo,
              }),
            });
            await props.refresh();
            props.notify(res.message || "Acceso guardado.");
          } catch (cause) {
            props.notify(
              "El contratista se guardó, pero no se pudo asignar el código: " +
                (cause instanceof Error ? cause.message : "error desconocido"),
              true,
            );
          }
        }
      } else if (resource === "work_items") {
        if (!nombre.trim()) throw new Error("Escribe el nombre del trabajo.");
        const budget = toCents(presupuesto || "0");
        const prev = new Map(
          work?.assignments.map((a) => [a.contractor_id, a.allocation_cents]),
        );
        Object.assign(input, {
          name: nombre.trim(),
          description: work?.description || "",
          phase_id: fase[0] || null,
          budget_cents: budget,
          start_date: inicio || null,
          end_date: fin || null,
          status: work?.status || "pending",
          progress: work?.progress ?? 0,
          space_ids: espacios,
          assignments: contratistas.map((c) => ({
            contractor_id: c,
            allocation_cents: prev.get(c) ?? 0,
          })),
        });
        await onSave(resource, input);
      } else if (resource === "payments") {
        const workId = str(record.work_item_id);
        const asignados =
          r.partidas.find((p) => p.id === workId)?.contratistaIds || [];
        const quienCobra =
          beneficiario || (asignados.length === 1 ? asignados[0] : "");
        if (!fecha) throw new Error("Escribe la fecha.");
        if (!(Number(monto) > 0))
          throw new Error("Escribe un monto mayor que cero.");
        if (!concepto.trim()) throw new Error("Escribe la descripción.");
        if (!quienCobra)
          throw new Error(
            asignados.length
              ? "Elige a qué contratista se le pagó."
              : "Asigna primero un contratista a este trabajo (Editar trabajo).",
          );
        Object.assign(input, {
          work_item_id: workId,
          contractor_id: quienCobra,
          amount_cents: toCents(monto),
          date: fecha,
          description: concepto.trim(),
          method: str(record.method) || "transferencia",
        });
        const saved = await onSave(resource, input);
        if (files.length) {
          await subir(files, projectId, "payment_id", saved);
          await props.refresh();
        }
      } else if (resource === "material_purchases") {
        if (
          !fecha ||
          !tienda.trim() ||
          !concepto.trim() ||
          !(Number(monto) > 0)
        )
          throw new Error("Completa fecha, tienda, qué compraste y monto.");
        if (incluido && !pagoCubre)
          throw new Error(
            "Elige el pago al contratista que ya incluye este material.",
          );
        Object.assign(input, {
          date: fecha,
          store: tienda.trim(),
          description: concepto.trim(),
          quantity: cantidad.trim(),
          amount_cents: toCents(monto),
          category_id: categoria[0] || null,
          phase_id: fase[0] || null,
          work_item_id: trabajo || null,
          space_ids: espacios,
          contractor_id: quien[0] || null,
          covered_by_payment_id: incluido ? pagoCubre : null,
        });
        const saved = await onSave(resource, input);
        if (files.length) {
          await subir(files, projectId, "material_id", saved);
          await props.refresh();
        }
      }
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  const modal = (children: ReactNode) => (
    <Modal
      titulo={titulo}
      error={error}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {children}
    </Modal>
  );

  if (["spaces", "phases", "categories"].includes(resource)) {
    const ejemplo =
      resource === "phases"
        ? "Ej.: Obra gruesa"
        : resource === "categories"
          ? "Ej.: Luces"
          : "Ej.: Comedor";
    return modal(
      <>
        <Campo label="Nombre">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={ejemplo}
          />
        </Campo>
        {resource === "phases" && (
          <>
            <span className="lbl">Espacios involucrados</span>
            <Picker
              label="Espacios involucrados"
              items={r.espacios}
              sel={espacios}
              multi
              vacio="Ningún espacio"
              onChange={setEspacios}
            />
          </>
        )}
        <span className="lbl">Icono</span>
        <div className="grid-iconos">
          {Object.keys(ICONOS).map((k) => (
            <button
              type="button"
              key={k}
              className={`icono-btn ${icono === k ? "sel" : ""}`}
              title={NOMBRES[k] || k}
              aria-label={NOMBRES[k] || k}
              onClick={() => setIcono(k)}
            >
              <SvgIcono k={k} color={color} />
            </button>
          ))}
        </div>
        <span className="lbl">Color</span>
        <Paleta color={color} onChange={setColor} />
      </>,
    );
  }

  if (resource === "contractors") {
    const linked = !!data.contractors.find((c) => c.id === id)?.user_id;
    return modal(
      <>
        <Campo label="Nombre">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej.: Juan Pérez"
          />
        </Campo>
        <Campo label="Oficio">
          <input
            value={oficio}
            onChange={(e) => setOficio(e.target.value)}
            placeholder="Ej.: Electricista, Albañil"
          />
        </Campo>
        <Campo label="Teléfono (opcional)">
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+507 6000-0000"
          />
        </Campo>
        <Campo label="Usuario (para entrar a la app)">
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Ej.: juan"
            autoCapitalize="none"
            disabled={linked}
          />
        </Campo>
        <Campo
          label={
            linked
              ? "Nuevo código de acceso (opcional)"
              : "Código de acceso (su contraseña para entrar)"
          }
        >
          <input
            value={codigo}
            onChange={(e) =>
              setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            placeholder="6 números"
            autoComplete="new-password"
          />
        </Campo>
        <p className="meta">
          Cada contratista debe tener su propio usuario. El código tiene 6
          números.
        </p>
        <span className="lbl">Color</span>
        <Paleta color={color} onChange={setColor} />
      </>,
    );
  }

  if (resource === "work_items") {
    return modal(
      <>
        <Campo label="Nombre del trabajo">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej.: Electricidad"
          />
        </Campo>
        <Campo label="Fecha de inicio">
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </Campo>
        <Campo label="Fecha de fin">
          <input
            type="date"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
          />
        </Campo>
        <span className="lbl">Fase</span>
        <Picker
          label="Fase"
          items={r.fases}
          sel={fase}
          multi={false}
          vacio="Sin fase"
          onChange={setFase}
        />
        <span className="lbl">Espacios (puedes elegir varios)</span>
        <Picker
          label="Espacios"
          items={r.espacios}
          sel={espacios}
          multi
          vacio="Seleccionar…"
          onChange={setEspacios}
        />
        <span className="lbl">Contratistas (puedes elegir varios)</span>
        <Picker
          label="Contratistas"
          items={r.contratistas}
          sel={contratistas}
          multi
          vacio="Seleccionar…"
          onChange={setContratistas}
        />
        <Campo label="Presupuesto ($)">
          <input
            inputMode="decimal"
            value={presupuesto}
            onChange={(e) => setPresupuesto(e.target.value)}
            placeholder="0.00"
          />
        </Campo>
      </>,
    );
  }

  if (resource === "payments") {
    const workId = str(record.work_item_id);
    const asignados = r.contratistas.filter((c) =>
      r.partidas.find((p) => p.id === workId)?.contratistaIds.includes(c.id),
    );
    return modal(
      <>
        <div className="fila-fechas" style={{ marginTop: 6 }}>
          <div>
            <Campo label="Fecha">
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </Campo>
          </div>
          <div>
            <Campo label="Monto ($)">
              <input
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
              />
            </Campo>
          </div>
        </div>
        <Campo label="Descripción">
          <input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej.: Materiales ($275) y mano de obra ($200) – cuarto principal"
          />
        </Campo>
        {asignados.length > 1 && (
          <Campo label="¿A quién se le pagó?">
            <select
              style={{ width: "100%" }}
              value={beneficiario}
              onChange={(e) => setBeneficiario(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {asignados.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}
        {!id && (
          <Fotos
            files={files}
            onChange={setFiles}
            label="Comprobantes (puedes elegir varias fotos)"
          />
        )}
      </>,
    );
  }

  // material_purchases
  const pagosDelTrabajo = data.payments.filter(
    (p) =>
      !p.archived_at &&
      p.project_id === projectId &&
      (!trabajo || p.work_item_id === trabajo) &&
      (!quien[0] || p.contractor_id === quien[0]),
  );
  return modal(
    <>
      <div className="fila-fechas">
        <div>
          <Campo label="Fecha">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Campo>
        </div>
        <div>
          <Campo label="Monto ($)">
            <input
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </Campo>
        </div>
      </div>
      <Campo label="Dónde lo compré (tienda)">
        <input
          value={tienda}
          onChange={(e) => setTienda(e.target.value)}
          placeholder="Ej.: Home Depot, Ferretería Central"
        />
      </Campo>
      <Campo label="Qué compré">
        <input
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Ej.: Cable 12 AWG, 100 m"
        />
      </Campo>
      <Campo label="Cantidad (opcional)">
        <input
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="Ej.: 3 rollos"
        />
      </Campo>
      <span className="lbl">Categoría</span>
      <Picker
        label="Categoría"
        items={r.categorias}
        sel={categoria}
        multi={false}
        vacio="Sin categoría"
        onChange={setCategoria}
      />
      <span className="lbl">Fase</span>
      <Picker
        label="Fase"
        items={r.fases}
        sel={fase}
        multi={false}
        vacio="Sin fase"
        onChange={setFase}
      />
      <span className="lbl">Para qué espacios (puedes elegir varios)</span>
      <Picker
        label="Para qué espacios"
        items={r.espacios}
        sel={espacios}
        multi
        vacio="Seleccionar…"
        onChange={setEspacios}
      />
      <Campo label="Para qué trabajo (opcional)">
        <select
          style={{ width: "100%" }}
          value={trabajo}
          onChange={(e) => setTrabajo(e.target.value)}
        >
          <option value="">— Ninguno —</option>
          {r.partidas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </Campo>
      <span className="lbl">Quién lo va a usar</span>
      <Picker
        label="Quién lo va a usar"
        items={r.contratistas}
        sel={quien}
        multi={false}
        vacio="Nadie en particular"
        onChange={setQuien}
      />
      <label
        className="chk"
        style={{
          marginTop: 10,
          color: "var(--txt)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <input
          type="checkbox"
          checked={incluido}
          onChange={(e) => setIncluido(e.target.checked)}
          style={{ width: "auto", margin: 0 }}
        />
        Ya está incluido en un pago al contratista (no sumar)
      </label>
      {incluido && (
        <Campo label="¿En qué pago está incluido?">
          <select
            style={{ width: "100%" }}
            value={pagoCubre}
            onChange={(e) => {
              setPagoCubre(e.target.value);
              const pago = data.payments.find((p) => p.id === e.target.value);
              if (pago) {
                setQuien([pago.contractor_id]);
                setTrabajo(pago.work_item_id);
              }
            }}
          >
            <option value="">Selecciona el pago…</option>
            {pagosDelTrabajo.map((p) => (
              <option key={p.id} value={p.id}>
                {p.date} · {p.description} · $
                {(p.amount_cents / 100).toFixed(2)}
              </option>
            ))}
          </select>
        </Campo>
      )}
      {!id && (
        <Fotos
          files={files}
          onChange={setFiles}
          label="Fotos del recibo o producto (puedes elegir varias)"
        />
      )}
    </>,
  );
}
