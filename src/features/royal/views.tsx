"use client";
// Views of ph33-royal-palace-v14.html, fed by the project's Supabase data.
import { useEffect, useRef, useState } from "react";
import type { ViewProps } from "@/features/workspace/view-types";
import {
  aDia,
  csvMovimientos,
  descargar,
  DIA,
  estadoTrabajo,
  fechaCorta,
  fechaLarga,
  fmt,
  hoyDia,
  materialesPropios,
  nombreDe,
  nombres,
  pct,
  sumaMat,
  sumarPor,
  totalPagado,
  type Contratista,
  type Item,
  type Material,
  type Partida,
  type Royal,
} from "./model";
import {
  Barra,
  Chip,
  Chips,
  Columnas,
  Icono,
  PALETA,
  Pie,
  Seccion,
  SvgIcono,
  Titulo,
} from "./parts";

export type RoyalProps = ViewProps & { r: Royal };
// Contractor chips in lists show a color dot, as in the HTML.
const sinLetra = (list: Contratista[]) =>
  list.map((c) => ({ ...c, letra: undefined }));

const record = <T extends { id: string }>(list: T[], id: string) => ({
  ...list.find((x) => x.id === id),
});
const hoyTxt = () => new Date().toISOString().slice(0, 10);

/* ---------- Trabajos ---------- */
function DetallePagos({
  p,
  admin,
  props,
}: {
  p: Partida;
  admin: boolean;
  props: RoyalProps;
}) {
  const filas = p.pagos.slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  return (
    <>
      <table>
        <tbody>
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th className="num">Monto</th>
            <th>Comprobante</th>
            {admin && (
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            )}
          </tr>
          {filas.length ? (
            filas.map((x) => (
              <tr key={x.id}>
                <td>{x.fecha}</td>
                <td>{x.concepto}</td>
                <td className="num">{fmt(x.monto)}</td>
                <td>
                  {x.comprobantes ? (
                    <button
                      className="sec mini"
                      aria-label={`Comprobantes del pago ${x.concepto}`}
                      onClick={() =>
                        props.attachments(
                          "payment",
                          x.id,
                          `${x.fecha} · ${x.concepto}`,
                        )
                      }
                    >
                      📎 {x.comprobantes}
                    </button>
                  ) : (
                    <span className="meta">—</span>
                  )}
                </td>
                {admin && (
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      className="peligro mini"
                      aria-label={`Archivar pago ${x.concepto}`}
                      onClick={() =>
                        props.archive("payments", x.id, x.concepto)
                      }
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={admin ? 5 : 4} className="meta">
                Sin pagos registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {admin && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => props.edit("payments", { work_item_id: p.id })}
          >
            + Registrar pago
          </button>
        </div>
      )}
    </>
  );
}

export function Trabajos(props: RoyalProps) {
  const { r, admin } = props;
  if (!r.partidas.length)
    return (
      <p className="meta">
        Aún no hay trabajos. Crea uno con &quot;+ Nuevo trabajo&quot;.
      </p>
    );
  return (
    <>
      {r.partidas.map((p) => {
        const pag = totalPagado(p);
        const excede = p.presupuesto > 0 && pag > p.presupuesto;
        const f = r.fases.find((x) => x.id === p.faseId);
        const est = estadoTrabajo(p);
        const tieneEtiquetas =
          !!f || p.espacioIds.length || p.contratistaIds.length;
        return (
          <section className="card" key={p.id}>
            <div className="fila">
              <div>
                <h2>{p.nombre}</h2>
                <div>
                  {tieneEtiquetas ? (
                    <>
                      {f && <Chip it={f} />}
                      <Chips list={r.espacios} ids={p.espacioIds} />
                      <Chips
                        list={sinLetra(r.contratistas)}
                        ids={p.contratistaIds}
                      />
                    </>
                  ) : (
                    <span className="meta">
                      Sin fase, espacio ni contratista
                    </span>
                  )}
                </div>
              </div>
              <div className="meta" style={{ textAlign: "right" }}>
                Presupuesto <b>{fmt(p.presupuesto)}</b>
                <br />
                Pagado <b>{fmt(pag)}</b> · Pendiente{" "}
                <b>{fmt(p.presupuesto - pag)}</b>
              </div>
            </div>
            <div className="fila" style={{ marginTop: 4 }}>
              <span className="meta">
                {p.fechaInicio
                  ? `📅 ${fechaCorta(aDia(p.fechaInicio))}${p.fechaFin ? " – " + fechaCorta(aDia(p.fechaFin)) : ""}`
                  : "Sin fechas"}
              </span>
              <span
                className="estado"
                style={{ color: est.c, borderColor: est.c, margin: 0 }}
              >
                {est.t}
              </span>
            </div>
            <Barra
              valor={pag}
              total={p.presupuesto}
              tono={excede ? "alerta" : ""}
            />
            <div className="fila">
              <span className="meta">
                {p.pagos.length} pago(s)
                {excede && (
                  <>
                    {" · "}
                    <b style={{ color: "var(--warn)" }}>
                      excede el presupuesto
                    </b>
                  </>
                )}
              </span>
              {admin && (
                <span style={{ display: "flex", gap: 6 }}>
                  <button
                    className="sec"
                    aria-label={`Editar ${p.nombre}`}
                    onClick={() =>
                      props.edit("work_items", record(props.data.works, p.id))
                    }
                  >
                    Editar
                  </button>
                  <button
                    className="peligro"
                    aria-label={`Archivar ${p.nombre}`}
                    onClick={() => props.archive("work_items", p.id, p.nombre)}
                  >
                    Eliminar
                  </button>
                </span>
              )}
            </div>
            <DetallePagos p={p} admin={admin} props={props} />
          </section>
        );
      })}
    </>
  );
}

/* ---------- Tarjetas (espacios, fases, contratistas) ---------- */
function Acciones({
  props,
  resource,
  list,
  it,
}: {
  props: RoyalProps;
  resource: "spaces" | "phases" | "categories" | "contractors";
  list: { id: string }[];
  it: Item;
}) {
  if (!props.admin) return null;
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <button
        className="sec mini"
        aria-label={`Editar ${it.nombre}`}
        onClick={() => props.edit(resource, record(list, it.id))}
      >
        ✎
      </button>
      <button
        className="peligro mini"
        aria-label={`Archivar ${it.nombre}`}
        onClick={() => props.archive(resource, it.id, it.nombre)}
      >
        ×
      </button>
    </span>
  );
}

export function Espacios(props: RoyalProps) {
  const { r } = props;
  if (!r.espacios.length)
    return (
      <p className="meta">
        Aún no hay espacios. Crea uno con &quot;+ Nuevo espacio&quot; (ej.
        Comedor, Dormitorio).
      </p>
    );
  return (
    <div className="grid-esp">
      {r.espacios.map((e) => {
        const ts = r.partidas.filter((p) => p.espacioIds.includes(e.id));
        const ms = r.materiales.filter((m) => m.espacioIds.includes(e.id));
        const pag = ts.reduce((a, p) => a + totalPagado(p), 0);
        const pres = ts.reduce((a, p) => a + (+p.presupuesto || 0), 0);
        return (
          <div
            className="card esp-card"
            key={e.id}
            style={{ borderTop: `5px solid ${e.color}` }}
          >
            <div className="fila">
              <span className="ico big" style={{ background: `${e.color}22` }}>
                <SvgIcono k={e.icono} color={e.color} />
              </span>
              <Acciones
                props={props}
                resource="spaces"
                list={props.data.spaces}
                it={e}
              />
            </div>
            <h2 style={{ marginTop: 8 }}>{e.nombre}</h2>
            <div className="meta">
              {ts.length} trabajo(s) · {ms.length} material(es) vinculados
            </div>
            <div className="meta">
              Pagado <b>{fmt(pag)}</b> de {fmt(pres)}
            </div>
            <div className="meta">
              Materiales propios <b>{fmt(sumaMat(ms))}</b>
            </div>
            <Barra valor={pag} total={pres} />
          </div>
        );
      })}
    </div>
  );
}

export function Contratistas(props: RoyalProps) {
  const { r } = props;
  if (!r.contratistas.length)
    return (
      <p className="meta">
        Aún no hay contratistas. Crea uno con &quot;+ Nuevo contratista&quot;
        para asignarle trabajos y su código de acceso.
      </p>
    );
  return (
    <div className="grid-esp">
      {r.contratistas.map((c) => {
        const ts = r.partidas.filter((p) => p.contratistaIds.includes(c.id));
        const ms = r.materiales.filter((m) => m.contratistaIds.includes(c.id));
        const pag = ts.reduce((a, p) => a + totalPagado(p), 0);
        const pres = ts.reduce((a, p) => a + (+p.presupuesto || 0), 0);
        return (
          <div
            className="card esp-card"
            key={c.id}
            style={{ borderTop: `5px solid ${c.color}` }}
          >
            <div className="fila">
              <span
                className="ico big"
                style={{
                  background: `${c.color}22`,
                  color: c.color,
                  fontWeight: 700,
                  fontSize: "1.1rem",
                }}
              >
                {c.letra}
              </span>
              <Acciones
                props={props}
                resource="contractors"
                list={props.data.contractors}
                it={c}
              />
            </div>
            <h2 style={{ marginTop: 8 }}>{c.nombre}</h2>
            <div className="meta">
              {c.oficio}
              {c.telefono && (
                <>
                  {" · "}
                  <a href={`tel:${c.telefono}`} style={{ color: "inherit" }}>
                    {c.telefono}
                  </a>
                </>
              )}
            </div>
            <div className="meta">
              Usuario: <b>{c.usuario || "—"}</b>
              {" · "}Código de acceso:{" "}
              <b>{c.vinculado ? "••••••" : "sin asignar"}</b>
            </div>
            <div className="meta" style={{ marginTop: 6 }}>
              {ts.length} trabajo(s) · {ms.length} material(es) vinculados
            </div>
            <div className="meta">
              Pagado <b>{fmt(pag)}</b> de {fmt(pres)}
            </div>
            <div className="meta">
              Materiales propios que usa <b>{fmt(sumaMat(ms))}</b>
            </div>
            <Barra valor={pag} total={pres} />
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Reportes ---------- */
function generarReporte(
  r: Royal,
  nombreObra: string,
  T: Partida[],
  M: Material[],
  sub: string,
) {
  const esc = (s: unknown) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  const pagos = T.flatMap((p) =>
    p.pagos.map((x) => ({ ...x, partida: p })),
  ).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const pres = T.reduce((a, p) => a + (+p.presupuesto || 0), 0);
  const pag = pagos.reduce((a, x) => a + (+x.monto || 0), 0);
  const mat = sumaMat(M);
  const filasT = T.map(
    (p) =>
      `<tr><td>${esc(p.nombre)}</td><td>${esc(p.fechaInicio || "—")}${p.fechaFin ? " a " + esc(p.fechaFin) : ""}</td><td>${esc(nombreDe(r.fases, p.faseId, "Sin fase"))}</td><td>${esc(nombres(r.espacios, p.espacioIds))}</td><td>${esc(nombres(r.contratistas, p.contratistaIds))}</td><td class="n">${fmt(p.presupuesto)}</td><td class="n">${fmt(totalPagado(p))}</td><td class="n">${fmt((+p.presupuesto || 0) - totalPagado(p))}</td></tr>`,
  ).join("");
  const filasP = pagos
    .map(
      (x) =>
        `<tr><td>${esc(x.fecha)}</td><td>${esc(x.partida.nombre)}</td><td>${esc(x.concepto)}</td><td class="n">${fmt(x.monto)}</td></tr>`,
    )
    .join("");
  const filasM = M.slice()
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
    .map(
      (m) =>
        `<tr><td>${esc(m.fecha)}</td><td>${esc(nombreDe(r.categorias, m.categoriaId, "Sin categoría"))}</td><td>${esc(m.tienda)}</td><td>${esc(m.descripcion)}${m.cantidad ? " (" + esc(m.cantidad) + ")" : ""}</td><td>${esc(nombreDe(r.fases, m.faseId, "Sin fase"))}</td><td>${esc(nombres(r.espacios, m.espacioIds))}</td><td>${esc(nombres(r.contratistas, m.contratistaIds))}</td><td class="n">${fmt(m.monto)}${m.incluidoEnPago ? " *" : ""}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte ${esc(nombreObra)}</title>
<style>
body{font-family:system-ui,sans-serif;color:#1d2b27;margin:24px;max-width:1000px}
h1{color:#4a4fc4;margin:0}
h2{color:#4a4fc4;font-size:1.05rem;margin-top:26px;border-bottom:2px solid #dde3e0;padding-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:.85rem;margin-top:8px}
td,th{border-bottom:1px solid #dde3e0;padding:6px;text-align:left;vertical-align:top}
th{background:#f1f3f7}
.n{text-align:right;white-space:nowrap}
.kpis{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0}
.kpi{border:1px solid #dde3e0;border-radius:8px;padding:8px 12px}
.kpi b{display:block;font-size:1.1rem}
.meta{color:#6b7a75;font-size:.85rem}
</style></head><body>
<h1>${esc(nombreObra)}</h1>
<p class="meta">Reporte generado el ${new Date().toLocaleDateString("es-PA")} · ${esc(sub)}</p>
<div class="kpis">
  <div class="kpi"><span class="meta">Presupuesto de trabajos</span><b>${fmt(pres)}</b></div>
  <div class="kpi"><span class="meta">Pagado a contratistas</span><b>${fmt(pag)}</b></div>
  <div class="kpi"><span class="meta">Materiales propios</span><b>${fmt(mat)}</b></div>
  <div class="kpi"><span class="meta">Gasto total real</span><b>${fmt(pag + mat)}</b></div>
</div>
<h2>Trabajos</h2>
<table><tr><th>Trabajo</th><th>Fechas</th><th>Fase</th><th>Espacios</th><th>Contratistas</th><th class="n">Presupuesto</th><th class="n">Pagado</th><th class="n">Pendiente</th></tr>${filasT || '<tr><td colspan="8" class="meta">Sin trabajos</td></tr>'}</table>
<h2>Pagos a contratistas</h2>
<table><tr><th>Fecha</th><th>Trabajo</th><th>Descripción</th><th class="n">Monto</th></tr>${filasP || '<tr><td colspan="4" class="meta">Sin pagos</td></tr>'}</table>
<h2>Materiales comprados</h2>
<table><tr><th>Fecha</th><th>Categoría</th><th>Tienda</th><th>Qué compré</th><th>Fase</th><th>Espacios</th><th>Contratistas</th><th class="n">Monto</th></tr>${filasM || '<tr><td colspan="8" class="meta">Sin materiales</td></tr>'}</table>
<p class="meta">* incluido en pago a contratista (no suma al total).</p>
</body></html>`;
}

function BotonesReporte({
  props,
  T,
  M,
  sub,
}: {
  props: RoyalProps;
  T: Partida[];
  M: Material[];
  sub: string;
}) {
  const slug = props.project.name.toLowerCase().replace(/\s+/g, "-");
  return (
    <>
      <button
        className="sec"
        onClick={() =>
          descargar(
            generarReporte(props.r, props.project.name, T, M, sub),
            `reporte-${slug}-${hoyTxt()}.html`,
          )
        }
      >
        Descargar reporte
      </button>
      <button
        className="sec"
        onClick={() =>
          descargar(
            csvMovimientos(props.r, T, M),
            `movimientos-${slug}-${hoyTxt()}.csv`,
            "text/csv",
          )
        }
      >
        Descargar Excel (CSV)
      </button>
      <button className="sec" onClick={() => window.print()}>
        Imprimir / PDF
      </button>
    </>
  );
}

/* ---------- Análisis ---------- */
export function Analisis(props: RoyalProps) {
  const { r } = props;
  const [fEsp, setEsp] = useState("todos");
  const [fCon, setCon] = useState("todos");
  const [fCat, setCat] = useState("todos");
  const cumple = (x: { espacioIds: string[]; contratistaIds: string[] }) => {
    const okE =
      fEsp === "todos" ||
      (fEsp === "ninguno"
        ? x.espacioIds.length === 0
        : x.espacioIds.includes(fEsp));
    const okC =
      fCon === "todos" ||
      (fCon === "ninguno"
        ? x.contratistaIds.length === 0
        : x.contratistaIds.includes(fCon));
    return okE && okC;
  };
  const T = r.partidas.filter(cumple);
  const M = r.materiales.filter(
    (m) =>
      cumple(m) &&
      (fCat === "todos" ||
        (fCat === "ninguno" ? !m.categoriaId : m.categoriaId === fCat)),
  );
  const nombreFiltro = (tipo: "esp" | "con" | "cat") => {
    if (tipo === "cat")
      return fCat === "todos"
        ? "Todas"
        : fCat === "ninguno"
          ? "Sin categoría"
          : nombreDe(r.categorias, fCat, "Todas");
    const v = tipo === "esp" ? fEsp : fCon;
    if (v === "todos") return "Todos";
    if (v === "ninguno")
      return tipo === "esp" ? "Sin espacio" : "Sin contratista";
    return nombreDe(tipo === "esp" ? r.espacios : r.contratistas, v, "Todos");
  };
  const sub = `Espacio: ${nombreFiltro("esp")} · Contratista: ${nombreFiltro("con")} · Categoría: ${nombreFiltro("cat")}`;
  const activo = fEsp !== "todos" || fCon !== "todos" || fCat !== "todos";
  const filtros = (
    <>
      <div className="filtros no-imprimir">
        <div className="campo">
          <span>Espacio</span>
          <select
            aria-label="Espacio"
            value={fEsp}
            onChange={(e) => setEsp(e.target.value)}
          >
            <option value="todos">Todos los espacios</option>
            <option value="ninguno">Sin espacio</option>
            {r.espacios.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <span>Contratista</span>
          <select
            aria-label="Contratista"
            value={fCon}
            onChange={(e) => setCon(e.target.value)}
          >
            <option value="todos">Todos los contratistas</option>
            <option value="ninguno">Sin contratista</option>
            {r.contratistas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <span>Categoría (solo materiales)</span>
          <select
            aria-label="Categoría (solo materiales)"
            value={fCat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="todos">Todas las categorías</option>
            <option value="ninguno">Sin categoría</option>
            {r.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        {activo && (
          <button
            className="sec"
            onClick={() => {
              setEsp("todos");
              setCon("todos");
              setCat("todos");
            }}
          >
            Limpiar filtros
          </button>
        )}
        <BotonesReporte props={props} T={T} M={M} sub={sub} />
      </div>
      <p className="resumen-filtro">
        Mostrando: <b>{nombreFiltro("esp")}</b> · <b>{nombreFiltro("con")}</b> ·{" "}
        <b>{nombreFiltro("cat")}</b>{" "}
        <span className="meta">
          ({T.length} trabajo(s), {M.length} material(es))
        </span>
      </p>
    </>
  );
  if (!T.length && !M.length)
    return (
      <>
        {filtros}
        <p className="meta">
          No hay registros que coincidan con estos filtros.
        </p>
      </>
    );
  const Mp = materialesPropios(M);
  const cons =
    fCon === "todos"
      ? r.contratistas
      : r.contratistas.filter((c) => c.id === fCon);
  const pagos = T.flatMap((p) => p.pagos.map((x) => ({ ...x, partida: p })));
  const pres = T.reduce((a, p) => a + (+p.presupuesto || 0), 0);
  const pag = pagos.reduce((a, x) => a + (+x.monto || 0), 0);
  const matTotal = sumaMat(M);
  const prom = pagos.length ? pag / pagos.length : 0;
  const sinColor = "#8a9893";

  const sEsp = sumarPor(T, (p) => p.espacioIds, totalPagado);
  const listaEsp = [
    ...r.espacios.map((e) => ({
      k: e.id,
      label: e.nombre,
      icono: e.icono,
      color: e.color,
    })),
    { k: "ninguno", label: "Sin espacio", color: sinColor },
  ];
  const sCon = sumarPor(T, (p) => p.contratistaIds, totalPagado);
  const listaCon = [
    ...r.contratistas.map((c) => ({
      k: c.id,
      label: c.nombre,
      letra: c.letra,
      color: c.color,
    })),
    { k: "ninguno", label: "Sin contratista", color: sinColor },
  ];
  const sCat = sumarPor(
    Mp,
    (m) => (m.categoriaId ? [m.categoriaId] : []),
    (m) => +m.monto || 0,
  );
  const listaCat = [
    ...r.categorias.map((c) => ({
      k: c.id,
      label: c.nombre,
      icono: c.icono,
      color: c.color,
    })),
    { k: "ninguno", label: "Sin categoría", color: sinColor },
  ];
  const gTienda: Record<string, { label: string; valor: number }> = {};
  Mp.forEach((m) => {
    const t = m.tienda.trim().replace(/\s+/g, " ");
    const k = t.toLowerCase() || "—";
    gTienda[k] = gTienda[k] || { label: t || "Sin tienda", valor: 0 };
    gTienda[k].valor += +m.monto || 0;
  });
  const sMatEsp = sumarPor(
    Mp,
    (m) => m.espacioIds,
    (m) => +m.monto || 0,
  );
  const espacioBase =
    fEsp === "todos" ? r.espacios : r.espacios.filter((e) => e.id === fEsp);
  const sPresCon = sumarPor(
    T,
    (p) => p.contratistaIds,
    totalPagado,
    (p) => +p.presupuesto || 0,
  );
  const meses: Record<string, number> = {};
  pagos.forEach((x) => {
    const m = x.fecha.slice(0, 7);
    meses[m] = (meses[m] || 0) + (+x.monto || 0);
  });
  Mp.forEach((m) => {
    const k = (m.fecha || "").slice(0, 7);
    if (k) meses[k] = (meses[k] || 0) + (+m.monto || 0);
  });
  const recientes = pagos
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .slice(0, 8);
  const matRecientes = Mp.slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .slice(0, 8);
  let n = 0;
  return (
    <>
      {filtros}
      <div className="kpis">
        <div className="kpi">
          <span>Presupuesto de trabajos</span>
          <b>{fmt(pres)}</b>
        </div>
        <div className="kpi">
          <span>Pagado a contratistas</span>
          <b>{fmt(pag)}</b>
        </div>
        <div className="kpi">
          <span>Materiales propios</span>
          <b>{fmt(matTotal)}</b>
        </div>
        <div className="kpi">
          <span>Gasto total real</span>
          <b>{fmt(pag + matTotal)}</b>
        </div>
        <div className="kpi">
          <span>Pendiente por pagar</span>
          <b>{fmt(pres - pag)}</b>
        </div>
        <div className="kpi">
          <span>Promedio por pago</span>
          <b>{fmt(prom)}</b>
        </div>
      </div>
      {fCon === "todos" && (
        <Seccion n={n++} titulo="Gasto pagado por contratista">
          <Pie
            datos={listaCon
              .map((c) => ({ ...c, valor: sCon[c.k]?.valor || 0 }))
              .sort((a, b) => b.valor - a.valor)}
          />
        </Seccion>
      )}
      <Seccion n={n++} titulo="Presupuesto vs. pagado por contratista">
        <div className="meta" style={{ marginBottom: 6 }}>
          <span className="punto" style={{ background: "#cfd9d4" }} />{" "}
          Presupuesto &nbsp;
          <span className="punto" style={{ background: "#4a4fc4" }} /> Pagado
          (el color indica el contratista)
        </div>
        <Columnas
          dobles
          items={cons.map((c) => ({
            label: c.nombre,
            valor: sPresCon[c.id]?.valor || 0,
            valor2: sPresCon[c.id]?.valor2 || 0,
            color: c.color,
          }))}
        />
      </Seccion>
      <Seccion n={n++} titulo="Materiales por categoría">
        {Mp.length ? (
          <>
            <div className="pie-wrap">
              <Pie
                datos={listaCat
                  .map((c) => ({ ...c, valor: sCat[c.k]?.valor || 0 }))
                  .sort((a, b) => b.valor - a.valor)}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <Columnas
                dobles={false}
                items={listaCat
                  .filter((c) => (sCat[c.k]?.valor || 0) > 0)
                  .map((c) => ({
                    label: c.label,
                    valor: sCat[c.k].valor,
                    color: c.color,
                  }))}
              />
            </div>
          </>
        ) : (
          <p className="meta">Sin compras propias registradas.</p>
        )}
      </Seccion>
      {fEsp === "todos" && (
        <Seccion n={n++} titulo="Gasto pagado por espacio">
          <Pie
            datos={listaEsp
              .map((e) => ({ ...e, valor: sEsp[e.k]?.valor || 0 }))
              .sort((a, b) => b.valor - a.valor)}
          />
        </Seccion>
      )}
      <Seccion
        n={n++}
        titulo="Gasto total por espacio (pagos + materiales propios)"
      >
        <Columnas
          dobles={false}
          items={espacioBase.map((e) => ({
            label: e.nombre,
            valor: (sEsp[e.id]?.valor || 0) + (sMatEsp[e.id]?.valor || 0),
            color: e.color,
          }))}
        />
      </Seccion>
      <Seccion n={n++} titulo="Materiales propios por tienda">
        {Mp.length ? (
          <Pie
            datos={Object.values(gTienda)
              .sort((a, b) => b.valor - a.valor)
              .map((t, i) => ({ ...t, color: PALETA[i % PALETA.length] }))}
          />
        ) : (
          <p className="meta">Sin compras propias registradas.</p>
        )}
      </Seccion>
      <Seccion n={n++} titulo="Presupuesto vs. pagado por trabajo">
        <div className="meta" style={{ marginBottom: 6 }}>
          <span className="punto" style={{ background: "#cfd9d4" }} />{" "}
          Presupuesto &nbsp;
          <span className="punto" style={{ background: "#4a4fc4" }} /> Pagado
          (el color indica el primer espacio)
        </div>
        <Columnas
          dobles
          items={T.map((p) => ({
            label: p.nombre,
            valor: totalPagado(p),
            valor2: +p.presupuesto || 0,
            color:
              r.espacios.find((e) => e.id === p.espacioIds[0])?.color ||
              "#4a4fc4",
          }))}
        />
      </Seccion>
      <Seccion n={n++} titulo="Gasto por mes">
        <Columnas
          dobles={false}
          items={Object.keys(meses)
            .sort()
            .map((m) => {
              const [y, mo] = m.split("-");
              return {
                label: new Date(+y, +mo - 1, 1).toLocaleDateString("es-PA", {
                  month: "short",
                  year: "2-digit",
                }),
                valor: meses[m],
                color: "#4a4fc4",
              };
            })}
        />
      </Seccion>
      <Seccion n={n++} titulo="Pagos recientes">
        {recientes.length ? (
          <table>
            <tbody>
              <tr>
                <th>Fecha</th>
                <th>Trabajo</th>
                <th>Descripción</th>
                <th className="num">Monto</th>
              </tr>
              {recientes.map((x) => (
                <tr key={x.id}>
                  <td>{x.fecha}</td>
                  <td>{x.partida.nombre}</td>
                  <td>{x.concepto}</td>
                  <td className="num">{fmt(x.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="meta">Sin pagos registrados</p>
        )}
      </Seccion>
      <Seccion n={n++} titulo="Materiales recientes">
        {matRecientes.length ? (
          <table>
            <tbody>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Tienda</th>
                <th>Qué compré</th>
                <th className="num">Monto</th>
              </tr>
              {matRecientes.map((m) => (
                <tr key={m.id}>
                  <td>{m.fecha}</td>
                  <td>
                    {nombreDe(r.categorias, m.categoriaId, "Sin categoría")}
                  </td>
                  <td>{m.tienda}</td>
                  <td>{m.descripcion}</td>
                  <td className="num">{fmt(m.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="meta">Sin compras propias registradas</p>
        )}
      </Seccion>
    </>
  );
}

/* ---------- Fases ---------- */
function TablaTrabajos({ r, T }: { r: Royal; T: Partida[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <tbody>
          <tr>
            <th>Trabajo</th>
            <th>Espacios</th>
            <th>Contratistas</th>
            <th className="num">Presupuesto</th>
            <th className="num">Pagado</th>
            <th className="num">Pendiente</th>
          </tr>
          {T.map((p) => (
            <tr key={p.id}>
              <td>{p.nombre}</td>
              <td>
                {p.espacioIds.length ? (
                  <Chips list={r.espacios} ids={p.espacioIds} />
                ) : (
                  "—"
                )}
              </td>
              <td>
                {p.contratistaIds.length ? (
                  <Chips
                    list={sinLetra(r.contratistas)}
                    ids={p.contratistaIds}
                  />
                ) : (
                  "—"
                )}
              </td>
              <td className="num">{fmt(p.presupuesto)}</td>
              <td className="num">{fmt(totalPagado(p))}</td>
              <td className="num">
                {fmt((+p.presupuesto || 0) - totalPagado(p))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaMateriales({
  r,
  M,
  conContratistas,
}: {
  r: Royal;
  M: Material[];
  conContratistas: boolean;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <tbody>
          <tr>
            <th>Fecha</th>
            <th>Categoría</th>
            <th>Tienda</th>
            <th>Qué compré</th>
            <th>Espacios</th>
            {conContratistas && <th>Contratistas</th>}
            <th className="num">Monto</th>
          </tr>
          {M.map((m) => {
            const c = r.categorias.find((x) => x.id === m.categoriaId);
            return (
              <tr key={m.id}>
                <td>{m.fecha}</td>
                <td>{c ? <Chip it={c} /> : "—"}</td>
                <td>{m.tienda}</td>
                <td>
                  {m.descripcion}
                  {m.cantidad && <span className="meta"> ({m.cantidad})</span>}
                </td>
                <td>
                  {m.espacioIds.length ? (
                    <Chips list={r.espacios} ids={m.espacioIds} />
                  ) : (
                    "—"
                  )}
                </td>
                {conContratistas && (
                  <td>
                    {m.contratistaIds.length ? (
                      <Chips
                        list={sinLetra(r.contratistas)}
                        ids={m.contratistaIds}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                )}
                <td className="num">
                  {fmt(m.monto)}
                  {m.incluidoEnPago && <span className="badge">incluido</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Fases(props: RoyalProps) {
  const { r } = props;
  const tarjetas = r.fases.length ? (
    <div className="grid-esp">
      {r.fases.map((f) => {
        const ts = r.partidas.filter((p) => p.faseId === f.id);
        const ms = r.materiales.filter((m) => m.faseId === f.id);
        const total = ts.reduce((a, p) => a + totalPagado(p), 0) + sumaMat(ms);
        return (
          <div
            className="card esp-card"
            key={f.id}
            style={{ borderTop: `5px solid ${f.color}` }}
          >
            <div className="fila">
              <span className="ico big" style={{ background: `${f.color}22` }}>
                <SvgIcono k={f.icono} color={f.color} />
              </span>
              <Acciones
                props={props}
                resource="phases"
                list={props.data.phases}
                it={f}
              />
            </div>
            <h2 style={{ marginTop: 8 }}>{f.nombre}</h2>
            <div className="meta">
              {ts.length} trabajo(s) · {ms.length} material(es)
            </div>
            <div className="meta">
              Gasto real <b>{fmt(total)}</b>
            </div>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
              }}
            >
              {f.espacioIds.length ? (
                <Chips list={r.espacios} ids={f.espacioIds} />
              ) : (
                <span className="meta">Sin espacios asignados</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <p className="meta">
      Aún no hay fases. Crea una con &quot;+ Nueva fase&quot; (ej. Obra gruesa,
      Acabados, Pintura).
    </p>
  );
  if (!r.partidas.length && !r.materiales.length) return tarjetas;
  const grupos = [
    ...r.fases.map((f) => ({
      id: f.id as string | null,
      nombre: f.nombre,
      color: f.color,
      icono: f.icono,
    })),
    { id: null, nombre: "Sin fase", color: "#8a9893", icono: undefined },
  ];
  const datos = grupos
    .map((g) => {
      const T = r.partidas.filter((p) => (p.faseId || null) === g.id);
      const M = r.materiales.filter((m) => (m.faseId || null) === g.id);
      const pres = T.reduce((a, p) => a + (+p.presupuesto || 0), 0);
      const pag = T.reduce((a, p) => a + totalPagado(p), 0);
      const mat = sumaMat(M);
      return { ...g, T, M, pres, pag, mat, total: pag + mat };
    })
    .filter((d) => d.T.length || d.M.length);
  const granTotal = datos.reduce((a, d) => a + d.total, 0);
  let n = 0;
  return (
    <>
      {tarjetas}
      <div className="filtros no-imprimir">
        <BotonesReporte
          props={props}
          T={r.partidas}
          M={r.materiales}
          sub="Todas las fases"
        />
      </div>
      <div className="kpis">
        <div className="kpi">
          <span>Gasto real total</span>
          <b>{fmt(granTotal)}</b>
        </div>
        <div className="kpi">
          <span>Fases con movimientos</span>
          <b>{datos.length}</b>
        </div>
      </div>
      <Seccion n={n++} titulo="Gasto real por fase">
        <Pie
          datos={datos.map((d) => ({
            label: d.nombre,
            valor: d.total,
            color: d.color,
            icono: d.icono,
          }))}
        />
      </Seccion>
      <Seccion n={n++} titulo="Comparativo por fase">
        <Columnas
          dobles={false}
          items={datos.map((d) => ({
            label: d.nombre,
            valor: d.total,
            color: d.color,
          }))}
        />
      </Seccion>
      <Seccion n={n++} titulo="Resumen">
        <div style={{ overflowX: "auto" }}>
          <table>
            <tbody>
              <tr>
                <th>Fase</th>
                <th className="num">Trabajos</th>
                <th className="num">Materiales</th>
                <th className="num">Presupuesto</th>
                <th className="num">Pagado</th>
                <th className="num">Materiales propios</th>
                <th className="num">Total real</th>
                <th className="num">%</th>
              </tr>
              {datos.map((d) => (
                <tr key={d.id || "sin"}>
                  <td>
                    <Chip
                      it={{ nombre: d.nombre, color: d.color, icono: d.icono }}
                    />
                  </td>
                  <td className="num">{d.T.length}</td>
                  <td className="num">{d.M.length}</td>
                  <td className="num">{fmt(d.pres)}</td>
                  <td className="num">{fmt(d.pag)}</td>
                  <td className="num">{fmt(d.mat)}</td>
                  <td className="num">
                    <b>{fmt(d.total)}</b>
                  </td>
                  <td className="num">{pct(d.total, granTotal).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>
      {datos.map((d) => (
        <div key={d.id || "sin"}>
          <div className="fase-bloque" style={{ borderColor: d.color }}>
            <h3 className="tit" style={{ ["--tc" as string]: d.color }}>
              {d.icono && <SvgIcono k={d.icono} color={d.color} />} {d.nombre}
            </h3>
            <div className="meta">
              Gasto real <b>{fmt(d.total)}</b> · {d.T.length} trabajo(s) ·{" "}
              {d.M.length} material(es)
            </div>
          </div>
          <Seccion n={n++} titulo="Trabajos">
            {d.T.length ? (
              <TablaTrabajos r={r} T={d.T} />
            ) : (
              <p className="meta">Sin trabajos en esta fase.</p>
            )}
          </Seccion>
          <Seccion n={n++} titulo="Materiales">
            {d.M.length ? (
              <TablaMateriales r={r} M={d.M} conContratistas />
            ) : (
              <p className="meta">Sin materiales en esta fase.</p>
            )}
          </Seccion>
        </div>
      ))}
    </>
  );
}

/* ---------- Materiales ---------- */
export function Materiales(props: RoyalProps) {
  const { r, admin } = props;
  const cabecera = r.categorias.length ? (
    <div className="strip">
      {r.categorias.map((c) => (
        <span
          className="chip"
          key={c.id}
          style={{ color: c.color, borderColor: c.color }}
        >
          <Icono it={c} /> {c.nombre}
          {admin && (
            <span style={{ display: "inline-flex", gap: 3, marginLeft: 4 }}>
              <button
                className="sec mini"
                aria-label={`Editar ${c.nombre}`}
                onClick={() =>
                  props.edit("categories", record(props.data.categories, c.id))
                }
              >
                ✎
              </button>
              <button
                className="peligro mini"
                aria-label={`Archivar ${c.nombre}`}
                onClick={() => props.archive("categories", c.id, c.nombre)}
              >
                ×
              </button>
            </span>
          )}
        </span>
      ))}
    </div>
  ) : (
    <p className="meta" style={{ margin: "0 0 12px" }}>
      Aún no hay categorías. Crea una con &quot;+ Nueva categoría&quot; (ej.
      Luces, AC, Plomería).
    </p>
  );
  if (!r.materiales.length)
    return (
      <>
        {cabecera}
        <p className="meta">
          Aún no hay materiales. Registra una compra con &quot;+ Nuevo
          material&quot;.
        </p>
      </>
    );
  const orden = r.materiales
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  return (
    <>
      {cabecera}
      <p className="resumen-filtro">
        Compras propias sumadas: <b>{fmt(sumaMat(r.materiales))}</b>{" "}
        <span className="meta">
          (los marcados como &quot;incluido en pago&quot; no se suman)
        </span>
      </p>
      <table>
        <tbody>
          <tr>
            <th>Fecha</th>
            <th>Tienda</th>
            <th>Qué compré / para dónde</th>
            <th className="num">Monto</th>
            <th>Fotos</th>
            {admin && (
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            )}
          </tr>
          {orden.map((m) => {
            const f = r.fases.find((x) => x.id === m.faseId);
            const c = r.categorias.find((x) => x.id === m.categoriaId);
            const t = r.partidas.find((x) => x.id === m.partidaId);
            const hay =
              c || f || m.espacioIds.length || m.contratistaIds.length || t;
            return (
              <tr key={m.id}>
                <td>{m.fecha}</td>
                <td>
                  <b>{m.tienda}</b>
                </td>
                <td>
                  {m.descripcion}
                  {m.cantidad && <span className="meta"> ({m.cantidad})</span>}
                  {m.incluidoEnPago && (
                    <span className="badge">
                      incluido en pago a contratista
                    </span>
                  )}
                  <div>
                    {hay ? (
                      <>
                        {c && <Chip it={c} />}
                        {f && <Chip it={f} />}
                        <Chips list={r.espacios} ids={m.espacioIds} />
                        <Chips
                          list={sinLetra(r.contratistas)}
                          ids={m.contratistaIds}
                        />
                        {t && <span className="meta">{t.nombre}</span>}
                      </>
                    ) : (
                      <span className="meta">
                        Sin categoría, fase, espacio ni contratista
                      </span>
                    )}
                  </div>
                </td>
                <td className="num">{fmt(m.monto)}</td>
                <td>
                  {m.fotos ? (
                    <button
                      className="sec mini"
                      aria-label={`Comprobantes de ${m.descripcion}`}
                      onClick={() =>
                        props.attachments(
                          "material",
                          m.id,
                          `${m.fecha} · ${m.tienda} · ${m.descripcion}`,
                        )
                      }
                    >
                      📎 {m.fotos}
                    </button>
                  ) : (
                    <span className="meta">—</span>
                  )}
                </td>
                {admin && (
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      className="sec mini"
                      aria-label={`Editar ${m.descripcion}`}
                      onClick={() =>
                        props.edit(
                          "material_purchases",
                          record(props.data.materials, m.id),
                        )
                      }
                    >
                      ✎
                    </button>{" "}
                    <button
                      className="peligro mini"
                      aria-label={`Archivar ${m.descripcion}`}
                      onClick={() =>
                        props.archive("material_purchases", m.id, m.descripcion)
                      }
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

/* ---------- Cronograma ---------- */
type Zoom = "dia" | "semana" | "mes";
type Sec = "contratista" | "espacio" | "fase";
const PX: Record<Zoom, number> = { dia: 30, semana: 22, mes: 14 };
const TITULOS_SEC: Record<Sec, string> = {
  contratista: "Por contratista",
  espacio: "Por espacio",
  fase: "Por fase",
};

function rangoCron(lista: Partida[]) {
  const hoy = hoyDia();
  let mn = hoy - 7,
    mx = hoy + 30;
  lista.forEach((p) => {
    const a = aDia(p.fechaInicio);
    const b = p.fechaFin ? aDia(p.fechaFin) : a;
    mn = Math.min(mn, a);
    mx = Math.max(mx, b);
  });
  return { r0: mn - 2, r1: mx + 3 };
}

interface Grupo {
  nombre: string;
  color: string;
  icono?: string;
  letra?: string;
  items: Partida[];
}
function gruposPor(r: Royal, tipo: Sec, lista: Partida[]): Grupo[] {
  const sin = "#8a9893";
  if (tipo === "contratista") {
    const out: Grupo[] = r.contratistas.map((c: Contratista) => ({
      nombre: c.nombre,
      color: c.color,
      letra: c.letra,
      items: lista.filter((p) => p.contratistaIds.includes(c.id)),
    }));
    out.push({
      nombre: "Sin contratista",
      color: sin,
      items: lista.filter((p) => !p.contratistaIds.length),
    });
    return out.filter((g) => g.items.length);
  }
  if (tipo === "espacio") {
    const out: Grupo[] = r.espacios.map((e) => ({
      nombre: e.nombre,
      color: e.color,
      icono: e.icono,
      items: lista.filter((p) => p.espacioIds.includes(e.id)),
    }));
    out.push({
      nombre: "Sin espacio",
      color: sin,
      items: lista.filter((p) => !p.espacioIds.length),
    });
    return out.filter((g) => g.items.length);
  }
  const out: Grupo[] = r.fases.map((f) => ({
    nombre: f.nombre,
    color: f.color,
    icono: f.icono,
    items: lista.filter((p) => p.faseId === f.id),
  }));
  out.push({
    nombre: "Sin fase",
    color: sin,
    items: lista.filter((p) => !p.faseId),
  });
  return out.filter((g) => g.items.length);
}

function CuerpoCron({
  r,
  datados,
  secciones,
  zoom,
  onVer,
  wrapRef,
}: {
  r: Royal;
  datados: Partida[];
  secciones: Sec[];
  zoom: Zoom;
  onVer: (p: Partida) => void;
  wrapRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { r0, r1 } = rangoCron(datados);
  const dias = r1 - r0 + 1;
  const px = PX[zoom];
  const W = dias * px;
  const hoy = hoyDia();
  const capas = [];
  for (let d = r0; d <= r1; d++) {
    const dow = new Date(d * DIA).getUTCDay();
    const left = `calc(var(--lbl) + ${(d - r0) * px}px)`;
    if (d === hoy)
      capas.push(
        <div key={d} className="cr-col hoy" style={{ left, width: px }} />,
      );
    else if (dow === 0 || dow === 6)
      capas.push(
        <div key={d} className="cr-col fds" style={{ left, width: px }} />,
      );
  }
  const meses: { k: string; n: number; d0: number; nombre: string }[] = [];
  for (let d = r0; d <= r1; d++) {
    const dt = new Date(d * DIA);
    const k = dt.getUTCFullYear() + "-" + dt.getUTCMonth();
    if (!meses.length || meses[meses.length - 1].k !== k)
      meses.push({
        k,
        n: 0,
        d0: d,
        nombre: dt.toLocaleDateString("es-PA", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }),
      });
    meses[meses.length - 1].n++;
  }
  const filaDias = [];
  for (let d = r0; d <= r1; d++) {
    const dt = new Date(d * DIA);
    const dow = dt.getUTCDay();
    if (zoom === "dia") {
      filaDias.push(
        <div
          key={d}
          className={`cr-dia${dow === 0 || dow === 6 ? " fds" : ""}${d === hoy ? " hoy" : ""}`}
          style={{ left: (d - r0) * px, width: px }}
        >
          <b>{dt.getUTCDate()}</b>
          <small>
            {dt.toLocaleDateString("es-PA", {
              weekday: "narrow",
              timeZone: "UTC",
            })}
          </small>
        </div>,
      );
    } else if (zoom === "semana" && (dow === 1 || d === r0)) {
      const w = Math.min(7, r1 - d + 1);
      filaDias.push(
        <div
          key={d}
          className={`cr-dia sem${d <= hoy && hoy < d + w ? " hoy" : ""}`}
          style={{ left: (d - r0) * px, width: w * px }}
        >
          <b>{dt.getUTCDate()}</b>{" "}
          <small>
            {dt.toLocaleDateString("es-PA", {
              month: "short",
              timeZone: "UTC",
            })}
          </small>
        </div>,
      );
    }
  }
  const altoDias = zoom === "dia" ? 70 : zoom === "semana" ? 44 : 22;
  const fila = (
    key: string,
    lbl: React.ReactNode,
    cuerpo: React.ReactNode,
    clase = "",
  ) => (
    <div key={key} className={`cr-row ${clase}`} style={{ height: px }}>
      {lbl}
      <div
        className="cr-tl"
        style={{ width: W, height: px, backgroundSize: `${px}px ${px}px` }}
      >
        {cuerpo}
      </div>
    </div>
  );
  const cuadrados = (p: Partida, color: string) => {
    const ini = aDia(p.fechaInicio);
    const fin = p.fechaFin ? aDia(p.fechaFin) : ini;
    const total = fin - ini + 1;
    const pagados = Math.round(
      (pct(totalPagado(p), p.presupuesto) / 100) * total,
    );
    const est = estadoTrabajo(p);
    return Array.from({ length: Math.max(0, total) }, (_, i) => {
      const d = ini + i;
      const pagado = i < pagados;
      return (
        <button
          key={i}
          type="button"
          className="cr-cuad"
          tabIndex={-1}
          onClick={() => onVer(p)}
          title={`${p.nombre} · ${fechaLarga(d)} · ${est.t} · ${pagado ? "pagado" : "pendiente"}`}
          style={{
            left: (d - r0) * px + 2,
            top: 2,
            width: px - 4,
            height: px - 4,
            background: color,
            opacity: pagado ? 1 : 0.32,
          }}
        >
          {px >= 26 ? new Date(d * DIA).getUTCDate() : ""}
        </button>
      );
    });
  };
  return (
    <div className="cr-wrap" ref={wrapRef} data-r0={r0}>
      <div className="cr-inner">
        {capas}
        <div className="cr-head">
          <div className="cr-row" style={{ height: 22 }}>
            <div className="cr-lbl" style={{ height: 22 }}>
              Mes
            </div>
            <div className="cr-tl" style={{ width: W, height: 22 }}>
              {meses.map((m) => (
                <div
                  key={m.k}
                  className="cr-mes"
                  style={{ left: (m.d0 - r0) * px, width: m.n * px }}
                >
                  {m.n * px >= 150
                    ? m.nombre
                    : m.nombre.split(" ")[0].slice(0, 3)}
                </div>
              ))}
            </div>
          </div>
          <div
            className="cr-row"
            style={{
              height: altoDias - 22,
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div className="cr-lbl" style={{ height: altoDias - 22 }}>
              {zoom === "dia" ? "Día" : zoom === "semana" ? "Semana" : ""}
            </div>
            <div className="cr-tl" style={{ width: W, height: altoDias - 22 }}>
              {zoom === "mes" ? null : filaDias}
            </div>
          </div>
        </div>
        {secciones.map((sec, si) => {
          const grupos = gruposPor(r, sec, datados);
          return (
            <div key={sec}>
              <Titulo n={si} as="div">
                {TITULOS_SEC[sec]}
              </Titulo>
              {!grupos.length &&
                fila(
                  "vacio",
                  <div className="cr-lbl" style={{ height: px }}>
                    —
                  </div>,
                  null,
                )}
              {grupos.map((g) => (
                <div key={g.nombre}>
                  {fila(
                    "g",
                    <div className="cr-lbl" style={{ height: px }}>
                      <Icono
                        it={{ icono: g.icono, letra: g.letra, color: g.color }}
                      />
                      <span className="t">
                        <b>{g.nombre}</b>{" "}
                        <span className="meta">({g.items.length})</span>
                      </span>
                    </div>,
                    null,
                    "cr-grupo",
                  )}
                  {g.items
                    .slice()
                    .sort((a, b) => aDia(a.fechaInicio) - aDia(b.fechaInicio))
                    .map((p) =>
                      fila(
                        p.id,
                        <button
                          type="button"
                          className="cr-lbl cr-trab-lbl"
                          style={{ height: px, paddingLeft: 18 }}
                          onClick={() => onVer(p)}
                        >
                          <span className="t">{p.nombre}</span>
                        </button>,
                        cuadrados(p, g.color),
                      ),
                    )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VerTrabajo({
  p,
  r,
  admin,
  onClose,
  onEdit,
}: {
  p: Partida;
  r: Royal;
  admin: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const pag = totalPagado(p),
    pres = +p.presupuesto || 0;
  const est = estadoTrabajo(p);
  return (
    <div className="modal-r abierto">
      <dialog open aria-label={p.nombre}>
        <h3 style={{ marginTop: 0 }}>{p.nombre}</h3>
        <span className="estado" style={{ color: est.c, borderColor: est.c }}>
          {est.t}
        </span>
        <div style={{ margin: "10px 0" }}>
          <Chips list={r.espacios} ids={p.espacioIds} />
          <Chips list={sinLetra(r.contratistas)} ids={p.contratistaIds} />
        </div>
        <Barra valor={pag} total={pres} />
        <div className="meta">
          Presupuesto {fmt(pres)} · Pagado {fmt(pag)} ·{" "}
          {admin ? "Pendiente" : "Te falta"} {fmt(pres - pag)}
        </div>
        <div className="fila-fechas" style={{ marginTop: 12 }}>
          <div>
            <span className="lbl">Inicio</span>
            <div>{p.fechaInicio ? fechaLarga(aDia(p.fechaInicio)) : "—"}</div>
          </div>
          <div>
            <span className="lbl">Fin</span>
            <div>
              {p.fechaFin
                ? fechaLarga(aDia(p.fechaFin))
                : p.fechaInicio
                  ? "Mismo día"
                  : "—"}
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button className="sec" onClick={onClose}>
            Cerrar
          </button>
          {admin && (
            <button className="sec" onClick={onEdit}>
              Editar trabajo
            </button>
          )}
        </div>
      </dialog>
    </div>
  );
}

export function Cronograma(
  props: RoyalProps & { lista?: Partida[]; soloFase?: boolean },
) {
  const { r, admin } = props;
  const lista = props.lista || r.partidas;
  const [zoom, setZoom] = useState<Zoom>(() =>
    typeof window !== "undefined" && window.innerWidth >= 900
      ? "dia"
      : "semana",
  );
  const [sec, setSec] = useState<Record<Sec, boolean>>({
    contratista: true,
    espacio: true,
    fase: true,
  });
  const [ver, setVer] = useState<Partida | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const datados = lista.filter((p) => p.fechaInicio);
  const centrarHoy = () => {
    const w = wrapRef.current;
    if (!w) return;
    const r0 = +(w.dataset.r0 || 0);
    const px = PX[zoom];
    const x = (hoyDia() - r0) * px + px / 2;
    w.scrollLeft = Math.max(0, x - w.clientWidth / 2);
  };
  useEffect(centrarHoy, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!lista.length)
    return (
      <p className="meta">
        {props.soloFase
          ? "Aún no tienes trabajos asignados."
          : "Crea trabajos con fechas para verlos en el cronograma."}
      </p>
    );
  const secciones: Sec[] = props.soloFase
    ? ["fase"]
    : (["contratista", "espacio", "fase"] as Sec[]).filter((s) => sec[s]);
  const botonZoom = (z: Zoom, t: string) => (
    <button
      className={`cr-btn ${zoom === z ? "act" : ""}`}
      onClick={() => setZoom(z)}
    >
      {t}
    </button>
  );
  const controles = (
    <>
      <div className="cr-controles no-imprimir">
        <div className="cr-grupo-btns">
          {botonZoom("dia", "Día")}
          {botonZoom("semana", "Semana")}
          {botonZoom("mes", "Mes")}
        </div>
        <button className="cr-btn" onClick={centrarHoy}>
          Ir a hoy
        </button>
        {admin && !props.soloFase && (
          <div className="cr-grupo-btns">
            {(["contratista", "espacio", "fase"] as Sec[]).map((s) => (
              <button
                key={s}
                className={`cr-btn ${sec[s] ? "act" : "off"}`}
                onClick={() => {
                  const next = { ...sec, [s]: !sec[s] };
                  if (!Object.values(next).some(Boolean)) next[s] = true;
                  setSec(next);
                }}
              >
                {TITULOS_SEC[s]}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="cr-leyenda">
        <span>
          <i className="cr-sq" style={{ background: "#4a4fc4" }} /> Día con
          avance pagado
        </span>
        <span>
          <i
            className="cr-sq"
            style={{ background: "#4a4fc4", opacity: 0.32 }}
          />{" "}
          Día pendiente
        </span>
        <span>
          <i
            className="cr-sq"
            style={{ background: "#fde8e6", border: "1px solid #e0443a" }}
          />{" "}
          Hoy
        </span>
        <span>Toca un cuadrito o un nombre para ver el detalle.</span>
      </div>
    </>
  );
  const sinFecha = lista.filter((p) => !p.fechaInicio);
  return (
    <>
      {controles}
      {datados.length ? (
        <CuerpoCron
          r={r}
          datados={datados}
          secciones={secciones}
          zoom={zoom}
          onVer={setVer}
          wrapRef={wrapRef}
        />
      ) : (
        <p className="meta">
          {props.soloFase
            ? "Tus trabajos todavía no tienen fechas."
            : "Ningún trabajo tiene fecha de inicio todavía."}
        </p>
      )}
      {!props.soloFase && sinFecha.length > 0 && (
        <Seccion
          n={secciones.length}
          titulo="Sin fechas"
          className="cr-sinfecha"
        >
          <p className="meta">
            Estos trabajos aún no aparecen en el cronograma. Las fechas se
            escriben al crear o editar el trabajo.
          </p>
          {sinFecha.map((p) => (
            <span className="tag-s" key={p.id}>
              {p.nombre}
            </span>
          ))}
        </Seccion>
      )}
      {ver && (
        <VerTrabajo
          p={ver}
          r={r}
          admin={admin}
          onClose={() => setVer(null)}
          onEdit={() => {
            setVer(null);
            props.edit("work_items", record(props.data.works, ver.id));
          }}
        />
      )}
    </>
  );
}

/* ---------- Vista del contratista ---------- */
export function VistaContratista(props: RoyalProps & { c: Contratista }) {
  const { r, c } = props;
  const T = r.partidas.filter((p) => p.contratistaIds.includes(c.id));
  const M = r.materiales.filter((m) => m.contratistaIds.includes(c.id));
  const pres = T.reduce((a, p) => a + (+p.presupuesto || 0), 0);
  const pag = T.reduce((a, p) => a + totalPagado(p), 0);
  const ids = [
    ...new Set([
      ...T.map((p) => p.faseId || null),
      ...M.map((m) => m.faseId || null),
    ]),
  ];
  const grupos = [
    ...r.fases
      .filter((f) => ids.includes(f.id))
      .map((f) => ({
        id: f.id as string | null,
        nombre: f.nombre,
        color: f.color,
        icono: f.icono,
      })),
    ...(ids.includes(null)
      ? [{ id: null, nombre: "Sin fase", color: "#8a9893", icono: undefined }]
      : []),
  ];
  let n = 1;
  return (
    <>
      <div className="saludo">
        <h2>
          {c.nombre}
          {c.oficio ? " · " + c.oficio : ""}
        </h2>
        <div className="meta">Tu avance de pagos</div>
        <Barra valor={pag} total={pres} />
        <div className="meta">
          Pagado {fmt(pag)} de {fmt(pres)} · Te faltan {fmt(pres - pag)}
        </div>
      </div>
      <div className="resumen-c">
        <div className="kpi">
          <span>Presupuesto de tus trabajos</span>
          <b>{fmt(pres)}</b>
        </div>
        <div className="kpi">
          <span>Ya pagado</span>
          <b>{fmt(pag)}</b>
        </div>
        <div className="kpi">
          <span>Te falta por pagar</span>
          <b>{fmt(pres - pag)}</b>
        </div>
        <div className="kpi">
          <span>Materiales comprados para ti</span>
          <b>{fmt(sumaMat(M))}</b>
        </div>
      </div>
      <Seccion n={0} titulo="Mi cronograma">
        <Cronograma {...props} lista={T} soloFase />
      </Seccion>
      <p className="meta">
        Si un trabajo o material se comparte con otro contratista, aparece el
        monto completo.
      </p>
      <div className="fila no-imprimir" style={{ margin: "10px 0" }}>
        <BotonesReporte
          props={props}
          T={T}
          M={M}
          sub={`Contratista: ${c.nombre}`}
        />
      </div>
      {grupos.length ? (
        grupos.map((g) => {
          const Tg = T.filter((p) => (p.faseId || null) === g.id);
          const Mg = M.filter((m) => (m.faseId || null) === g.id);
          const presG = Tg.reduce((a, p) => a + (+p.presupuesto || 0), 0);
          const pagG = Tg.reduce((a, p) => a + totalPagado(p), 0);
          return (
            <div key={g.id || "sin"}>
              <div className="fase-bloque" style={{ borderColor: g.color }}>
                <h3 className="tit" style={{ ["--tc" as string]: g.color }}>
                  {g.icono && <SvgIcono k={g.icono} color={g.color} />}{" "}
                  {g.nombre}
                </h3>
                <div className="meta">
                  Pagado {fmt(pagG)} de {fmt(presG)} · Te faltan{" "}
                  {fmt(presG - pagG)} · Materiales {fmt(sumaMat(Mg))}
                </div>
                {presG > 0 && <Barra valor={pagG} total={presG} />}
              </div>
              <Seccion n={n++} titulo="Trabajos">
                {Tg.length ? (
                  Tg.map((p) => {
                    const pg = totalPagado(p);
                    return (
                      <details className="trab" key={p.id}>
                        <summary>
                          <b>{p.nombre}</b>
                          <div>
                            {p.espacioIds.length ? (
                              <Chips list={r.espacios} ids={p.espacioIds} />
                            ) : (
                              <span className="meta">Sin espacio asignado</span>
                            )}
                          </div>
                          <Barra
                            valor={pg}
                            total={p.presupuesto}
                            tono={pg > (+p.presupuesto || 0) ? "alerta" : ""}
                          />
                          <span className="meta">
                            Presupuesto {fmt(p.presupuesto)} · Pagado {fmt(pg)}{" "}
                            · Te falta {fmt((+p.presupuesto || 0) - pg)}
                          </span>
                        </summary>
                        <DetallePagos p={p} admin={false} props={props} />
                      </details>
                    );
                  })
                ) : (
                  <p className="meta">Sin trabajos en esta fase.</p>
                )}
              </Seccion>
              <Seccion n={n++} titulo="Materiales">
                {Mg.length ? (
                  <TablaMateriales r={r} M={Mg} conContratistas={false} />
                ) : (
                  <p className="meta">Sin materiales en esta fase.</p>
                )}
              </Seccion>
            </div>
          );
        })
      ) : (
        <p className="meta">Aún no tienes trabajos ni materiales asignados.</p>
      )}
    </>
  );
}
