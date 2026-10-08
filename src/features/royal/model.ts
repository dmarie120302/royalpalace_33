// Adapts the Supabase workspace of one project to the shape used by the
// PH 33 Royal Palace views (ph33-royal-palace-v14.html). Amounts are dollars.
import type { Project, Workspace } from "@/domain/types";
import { isAdditionalMaterial, today } from "@/domain/finance";
import { emailToUsername } from "@/domain/access";

export interface Item {
  id: string;
  nombre: string;
  color: string;
  icono?: string;
  letra?: string;
  detalle?: string;
}
export interface Fase extends Item {
  espacioIds: string[];
}
export interface Contratista extends Item {
  oficio: string;
  telefono: string;
  usuario: string;
  vinculado: boolean;
  userId: string | null;
}
export interface Pago {
  id: string;
  fecha: string;
  concepto: string;
  monto: number;
  comprobantes: number;
}
export interface Partida {
  id: string;
  nombre: string;
  presupuesto: number;
  faseId: string | null;
  espacioIds: string[];
  contratistaIds: string[];
  fechaInicio: string;
  fechaFin: string;
  avance: number;
  pagos: Pago[];
}
export interface Material {
  id: string;
  fecha: string;
  tienda: string;
  descripcion: string;
  cantidad: string;
  monto: number;
  categoriaId: string | null;
  faseId: string | null;
  partidaId: string | null;
  espacioIds: string[];
  contratistaIds: string[];
  incluidoEnPago: boolean;
  fotos: number;
}
export interface Royal {
  espacios: Item[];
  fases: Fase[];
  categorias: Item[];
  contratistas: Contratista[];
  partidas: Partida[];
  materiales: Material[];
}

// The database has no icon column; pick the HTML icon from the name.
const ICON_WORDS: [RegExp, string][] = [
  [/cocina/, "cocina"],
  [/ba[ñn]o/, "bano"],
  [/comedor/, "comedor"],
  [/dormitorio|cuarto|habitaci|rec[aá]mara/, "dormitorio"],
  [/sala|estar/, "sala"],
  [/terraza|balc|exterior/, "terraza"],
  [/garaje|estacionamiento/, "garaje"],
  [/oficina|estudio/, "oficina"],
  [/lavander/, "lavanderia"],
  [/jard/, "jardin"],
  [/pasillo|entrada|hall/, "pasillo"],
  [/techo|cielo/, "techo"],
  [/obra|demoli|estructura/, "obra"],
  [/acabado/, "acabados"],
  [/el[eé]ctric|instalaci/, "instalacion"],
  [/pintur/, "pintura"],
  [/limpieza/, "limpieza"],
  [/luz|luces|ilumina|l[aá]mpara/, "luz"],
  [/aire|a\/c|\bac\b|climatiza/, "aire"],
  [/agua|plomer|tuber/, "agua"],
  [/herramient/, "herramienta"],
  [/mueble|closet|gabinete/, "mueble"],
  [/puerta|ventana/, "puerta"],
];
export function iconFor(name: string): string {
  const lower = name.toLocaleLowerCase("es");
  return ICON_WORDS.find(([pattern]) => pattern.test(lower))?.[1] || "casa";
}

const dollars = (cents: number) => cents / 100;

export function buildRoyal(data: Workspace, project: Project): Royal {
  const mine = <T extends { project_id: string; archived_at: string | null }>(
    list: T[],
  ) => list.filter((x) => x.project_id === project.id && !x.archived_at);
  const attachmentCount = (key: "payment_id" | "material_id", id: string) =>
    data.attachments.filter((a) => a[key] === id && !a.archived_at).length;
  const catalog = (
    list: { id: string; name: string; color: string; icon?: string }[],
  ) =>
    list.map((c) => ({
      id: c.id,
      nombre: c.name,
      color: c.color,
      icono: c.icon && c.icon !== "casa" ? c.icon : iconFor(c.name),
    }));
  const payments = mine(data.payments);
  return {
    espacios: catalog(mine(data.spaces)),
    fases: mine(data.phases).map((f) => ({
      ...catalog([f])[0],
      espacioIds: f.space_ids,
    })),
    categorias: catalog(mine(data.categories)),
    contratistas: mine(data.contractors).map((c) => ({
      id: c.id,
      nombre: c.name,
      color: c.color,
      letra: (c.name || "?").charAt(0).toUpperCase(),
      detalle: c.trade,
      oficio: c.trade,
      telefono: c.phone,
      usuario: emailToUsername(c.email),
      vinculado: !!c.user_id,
      userId: c.user_id,
    })),
    partidas: mine(data.works).map((w) => ({
      id: w.id,
      nombre: w.name,
      presupuesto: dollars(w.budget_cents),
      faseId: w.phase_id,
      espacioIds: w.space_ids,
      contratistaIds: [...new Set(w.assignments.map((a) => a.contractor_id))],
      fechaInicio: w.start_date || "",
      fechaFin: w.end_date || "",
      avance: w.progress,
      pagos: payments
        .filter((p) => p.work_item_id === w.id)
        .map((p) => ({
          id: p.id,
          fecha: p.date,
          concepto: p.description,
          monto: dollars(p.amount_cents),
          comprobantes: attachmentCount("payment_id", p.id),
        })),
    })),
    materiales: mine(data.materials).map((m) => ({
      id: m.id,
      fecha: m.date,
      tienda: m.store,
      descripcion: m.description,
      cantidad: m.quantity,
      monto: dollars(m.amount_cents),
      categoriaId: m.category_id,
      faseId: m.phase_id,
      partidaId: m.work_item_id,
      espacioIds: m.space_ids,
      contratistaIds: m.contractor_id ? [m.contractor_id] : [],
      incluidoEnPago: !isAdditionalMaterial(data, m),
      fotos: attachmentCount("material_id", m.id),
    })),
  };
}

export const fmt = (n: number) =>
  "$" +
  (Number(n) || 0).toLocaleString("es-PA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const pct = (p: number, t: number) =>
  t > 0 ? Math.min(100, (p / t) * 100) : 0;
export const totalPagado = (p: Partida) =>
  p.pagos.reduce((a, x) => a + (+x.monto || 0), 0);
export const materialesPropios = (list: Material[]) =>
  list.filter((m) => !m.incluidoEnPago);
export const sumaMat = (list: Material[]) =>
  materialesPropios(list).reduce((a, m) => a + (+m.monto || 0), 0);

export const DIA = 86400000;
export const aDia = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DIA);
};
/** Today in Panamá, as whole days since epoch. */
export const hoyDia = () => aDia(today());
export const fechaLarga = (d: number) =>
  new Date(d * DIA).toLocaleDateString("es-PA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
export const fechaCorta = (d: number) =>
  new Date(d * DIA).toLocaleDateString("es-PA", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export function estadoTrabajo(p: Partida) {
  const pag = totalPagado(p),
    pres = +p.presupuesto || 0;
  if (pres > 0 && pag >= pres) return { t: "Pagado", c: "#2f855a" };
  if (!p.fechaInicio) return { t: "Sin fecha", c: "#8a9893" };
  const hoy = hoyDia(),
    ini = aDia(p.fechaInicio),
    fin = p.fechaFin ? aDia(p.fechaFin) : ini;
  if (hoy < ini) return { t: "Pendiente", c: "#6b7a75" };
  if (hoy > fin) return { t: "Atrasado", c: "#b5472b" };
  return { t: "En curso", c: "#4a4fc4" };
}

export const nombreDe = (list: Item[], id: string | null, vacio: string) =>
  list.find((x) => x.id === id)?.nombre || vacio;
export const nombres = (list: Item[], ids: string[]) =>
  ids
    .map((id) => list.find((x) => x.id === id)?.nombre)
    .filter(Boolean)
    .join(", ") || "—";

/** Splits an amount equally between the given ids ("ninguno" when empty). */
export function sumarPor<T>(
  items: T[],
  idsDe: (it: T) => string[],
  montoDe: (it: T) => number,
  valor2De?: (it: T) => number,
) {
  const out: Record<string, { valor: number; valor2: number }> = {};
  items.forEach((it) => {
    const ids = idsDe(it) || [];
    const lista = ids.length ? ids : ["ninguno"];
    const m = montoDe(it) / lista.length;
    const p = valor2De ? valor2De(it) / lista.length : 0;
    lista.forEach((k) => {
      out[k] = out[k] || { valor: 0, valor2: 0 };
      out[k].valor += m;
      out[k].valor2 += p;
    });
  });
  return out;
}

export function csvMovimientos(r: Royal, T: Partida[], M: Material[]) {
  const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const filas: unknown[][] = [
    [
      "Tipo",
      "Fecha",
      "Trabajo / material",
      "Descripción",
      "Tienda",
      "Categoría",
      "Fase",
      "Espacios",
      "Contratistas",
      "Monto",
      "Incluido en pago",
    ],
  ];
  T.forEach((p) =>
    p.pagos.forEach((x) =>
      filas.push([
        "Pago",
        x.fecha,
        p.nombre,
        x.concepto,
        "",
        "",
        nombreDe(r.fases, p.faseId, "Sin fase"),
        nombres(r.espacios, p.espacioIds),
        nombres(r.contratistas, p.contratistaIds),
        x.monto,
        "",
      ]),
    ),
  );
  M.forEach((m) =>
    filas.push([
      "Material",
      m.fecha,
      m.descripcion + (m.cantidad ? " (" + m.cantidad + ")" : ""),
      "",
      m.tienda,
      nombreDe(r.categorias, m.categoriaId, "Sin categoría"),
      nombreDe(r.fases, m.faseId, "Sin fase"),
      nombres(r.espacios, m.espacioIds),
      nombres(r.contratistas, m.contratistaIds),
      m.monto,
      m.incluidoEnPago ? "Sí" : "No",
    ]),
  );
  return "﻿" + filas.map((f) => f.map(celda).join(";")).join("\r\n");
}

export function descargar(
  contenido: string,
  nombre: string,
  tipo = "text/html",
) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([contenido], { type: tipo + ";charset=utf-8" }),
  );
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}
