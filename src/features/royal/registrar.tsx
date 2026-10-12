"use client";
// Page to register a payment or a material purchase with its receipt,
// showing the details of the selected work.
import { useState, type FormEvent } from "react";
import { toCents, today } from "@/domain/finance";
import { api } from "@/features/workspace/use-workspace";
import {
  aDia,
  estadoTrabajo,
  fechaCorta,
  fmt,
  totalPagado,
  type Partida,
} from "./model";
import { Barra, Chip, Chips } from "./parts";
import type { RoyalProps } from "./views";

const TIPOS = "image/jpeg,image/png,image/webp,application/pdf";

async function subir(
  files: File[],
  projectId: string,
  key: "payment_id" | "material_id",
  id: string,
) {
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024)
      throw new Error(`${file.name} excede el límite de 10 MB.`);
    if (!TIPOS.split(",").includes(file.type))
      throw new Error(`${file.name}: sube una imagen JPG, PNG, WebP o un PDF.`);
    const body = new FormData();
    body.set("file", file);
    body.set("project_id", projectId);
    body.set(key, id);
    await api("/api/attachments", { method: "POST", body });
  }
}

function DetalleTrabajo({ props, p }: { props: RoyalProps; p: Partida }) {
  const { r } = props;
  const pag = totalPagado(p);
  const est = estadoTrabajo(p);
  const f = r.fases.find((x) => x.id === p.faseId);
  const ultimos = p.pagos
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .slice(0, 5);
  return (
    <div className="card detalle-trabajo">
      <div className="fila">
        <h3 style={{ margin: 0 }}>{p.nombre}</h3>
        <span style={{ color: est.c, fontWeight: 600 }}>{est.t}</span>
      </div>
      <div style={{ margin: "6px 0" }}>
        {f && <Chip it={f} />}
        <Chips list={r.espacios} ids={p.espacioIds} />
        <Chips
          list={r.contratistas.map((c) => ({ ...c, letra: undefined }))}
          ids={p.contratistaIds}
        />
      </div>
      <div className="meta">
        {p.fechaInicio
          ? `📅 ${fechaCorta(aDia(p.fechaInicio))}${p.fechaFin ? " – " + fechaCorta(aDia(p.fechaFin)) : ""}`
          : "Sin fechas"}
        {" · "}Avance físico {p.avance}%
      </div>
      <div className="kpis" style={{ marginTop: 8 }}>
        <div className="kpi">
          <span>Presupuesto</span>
          <b>{fmt(p.presupuesto)}</b>
        </div>
        <div className="kpi">
          <span>Pagado</span>
          <b>{fmt(pag)}</b>
        </div>
        <div className="kpi">
          <span>Pendiente</span>
          <b>{fmt(p.presupuesto - pag)}</b>
        </div>
      </div>
      <Barra valor={pag} total={p.presupuesto} />
      <span className="lbl">Últimos pagos</span>
      {ultimos.length ? (
        <table>
          <tbody>
            {ultimos.map((x) => (
              <tr key={x.id}>
                <td>{x.fecha}</td>
                <td>{x.concepto}</td>
                <td className="num">{fmt(x.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="meta">Sin pagos todavía.</p>
      )}
    </div>
  );
}

function Archivos({
  files,
  onChange,
  label,
  inputKey,
}: {
  files: File[];
  onChange: (f: File[]) => void;
  label: string;
  inputKey: number;
}) {
  return (
    <>
      <label>
        {label}
        <input
          key={inputKey}
          type="file"
          accept={TIPOS}
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

export function Registrar(props: RoyalProps) {
  const { r, project, save, refresh, notify } = props;
  const [tipo, setTipo] = useState<"pago" | "material">("pago");
  const [trabajo, setTrabajo] = useState("");
  const [contratista, setContratista] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tienda, setTienda] = useState("");
  const [fecha, setFecha] = useState(today);
  const [files, setFiles] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState("");

  const p = r.partidas.find((x) => x.id === trabajo);
  const limpiar = () => {
    setMonto("");
    setDescripcion("");
    setCantidad("");
    setTienda("");
    setFiles([]);
    setInputKey((k) => k + 1);
    setFecha(today());
  };

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setHecho("");
    if (!p) return setError("Elige el trabajo.");
    if (!(Number(monto) > 0))
      return setError("Escribe un monto mayor que cero.");
    if (!fecha) return setError("Escribe la fecha.");
    if (!descripcion.trim()) return setError("Escribe la descripción.");
    setBusy(true);
    try {
      if (tipo === "pago") {
        // The payment goes to the contractor assigned to the work (the first
        // one if there are several); the form does not ask for it.
        const cobra = p.contratistaIds[0];
        if (!cobra)
          throw new Error(
            "Este trabajo no tiene contratista asignado. Asígnale uno en Trabajos → Editar.",
          );
        const id = await save("payments", {
          project_id: project.id,
          work_item_id: p.id,
          contractor_id: cobra,
          amount_cents: toCents(monto),
          date: fecha,
          description: descripcion.trim(),
          method: "transferencia",
        });
        if (files.length) {
          await subir(files, project.id, "payment_id", id);
          await refresh();
        }
        setHecho(`Pago de ${fmt(Number(monto))} registrado en "${p.nombre}".`);
      } else {
        if (!tienda.trim())
          throw new Error("Escribe dónde se compró (tienda).");
        const id = await save("material_purchases", {
          project_id: project.id,
          work_item_id: p.id,
          contractor_id: contratista || null,
          phase_id: p.faseId,
          phase_ids: p.faseId ? [p.faseId] : [],
          category_id: null,
          covered_by_payment_id: null,
          space_ids: p.espacioIds,
          amount_cents: toCents(monto),
          date: fecha,
          store: tienda.trim(),
          description: descripcion.trim(),
          quantity: cantidad.trim(),
        });
        if (files.length) {
          await subir(files, project.id, "material_id", id);
          await refresh();
        }
        setHecho(
          `Material de ${fmt(Number(monto))} registrado en "${p.nombre}".`,
        );
      }
      notify("Registro guardado.");
      limpiar();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  const asignados = p ? p.contratistaIds : [];
  const opcionesContratista = [
    ...r.contratistas.filter((c) => asignados.includes(c.id)),
    ...r.contratistas.filter((c) => !asignados.includes(c.id)),
  ];

  return (
    <div className="registrar">
      <div className="cr-grupo-btns" style={{ marginBottom: 12 }}>
        <button
          className={`cr-btn ${tipo === "pago" ? "act" : ""}`}
          onClick={() => {
            setTipo("pago");
            setError("");
            setHecho("");
          }}
        >
          Registrar pago
        </button>
        <button
          className={`cr-btn ${tipo === "material" ? "act" : ""}`}
          onClick={() => {
            setTipo("material");
            setError("");
            setHecho("");
          }}
        >
          Registrar material
        </button>
      </div>
      <div className="registrar-grid">
        <form className="card" onSubmit={guardar} noValidate>
          <h2>{tipo === "pago" ? "Nuevo pago" : "Nuevo material"}</h2>
          <Archivos
            files={files}
            onChange={setFiles}
            inputKey={inputKey}
            label={
              tipo === "pago"
                ? "Comprobante (foto o PDF, puedes elegir varios)"
                : "Factura (foto o archivo, puedes elegir varios)"
            }
          />
          <label>
            Trabajo
            <select
              style={{ width: "100%" }}
              value={trabajo}
              onChange={(e) => {
                setTrabajo(e.target.value);
                const w = r.partidas.find((x) => x.id === e.target.value);
                setContratista(
                  w?.contratistaIds.length === 1 ? w.contratistaIds[0] : "",
                );
              }}
            >
              <option value="">Selecciona el trabajo…</option>
              {r.partidas.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </label>
          {tipo === "material" && (
            <label>
              Encargado
              <select
                style={{ width: "100%" }}
                value={contratista}
                onChange={(e) => setContratista(e.target.value)}
              >
                <option value="">Sin encargado</option>
                {opcionesContratista.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {c.oficio ? ` · ${c.oficio}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {tipo === "pago" && p && !p.contratistaIds.length && (
            <p className="meta" style={{ color: "var(--warn)" }}>
              Este trabajo no tiene contratista asignado. Asígnale uno en
              Trabajos → Editar antes de registrar el pago.
            </p>
          )}
          <label>
            Monto ($)
            <input
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label>
            Descripción
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={
                tipo === "pago"
                  ? "Ej.: Adelanto 50% mano de obra"
                  : "Ej.: Cable 12 AWG"
              }
            />
          </label>
          {tipo === "material" && (
            <div className="fila-fechas">
              <div>
                <label>
                  Cantidad
                  <input
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    placeholder="Ej.: 3 rollos"
                  />
                </label>
              </div>
              <div>
                <label>
                  Dónde se compró (tienda)
                  <input
                    value={tienda}
                    onChange={(e) => setTienda(e.target.value)}
                    placeholder="Ej.: Novey"
                  />
                </label>
              </div>
            </div>
          )}
          <label>
            Fecha
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </label>
          {error && (
            <p
              role="alert"
              style={{ color: "var(--warn)", margin: "10px 0 0" }}
            >
              {error}
            </p>
          )}
          {hecho && (
            <output
              style={{
                display: "block",
                color: "#2f855a",
                margin: "10px 0 0",
                fontWeight: 600,
              }}
            >
              ✓ {hecho}
            </output>
          )}
          <div style={{ marginTop: 14 }}>
            <button type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy
                ? "Guardando…"
                : tipo === "pago"
                  ? "Guardar pago"
                  : "Guardar material"}
            </button>
          </div>
          {tipo === "material" && p && (
            <p className="meta">
              El material se asigna a la fase y espacios del trabajo elegido.
            </p>
          )}
        </form>
        <div>
          {p ? (
            <DetalleTrabajo props={props} p={p} />
          ) : (
            <div className="card">
              <p className="meta" style={{ margin: 0 }}>
                Elige un trabajo para ver sus detalles: fase, espacios,
                contratistas, presupuesto, pagado y pendiente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
