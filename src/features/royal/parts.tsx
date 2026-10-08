// Visual pieces of ph33-royal-palace-v14.html rendered with React.
import type { ReactNode } from "react";
import { fmt, pct, type Item } from "./model";

export const ICONOS: Record<string, string> = {
  casa: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  comedor:
    '<path d="M7 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3"/><path d="M8 12v9"/><path d="M17 3c-1.5 1.5-1.5 5 0 7v11"/>',
  dormitorio:
    '<path d="M3 18V7"/><path d="M3 14h18v4"/><path d="M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/>',
  sala: '<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M2 12a2 2 0 0 1 4 0v3h12v-3a2 2 0 0 1 4 0v5H2z"/><path d="M5 20v-2M19 20v-2"/>',
  cocina:
    '<path d="M4 11h16v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/><path d="M8 11V8M16 11V8"/><path d="M9 4l2 2M15 4l-2 2"/>',
  bano: '<path d="M4 12h16v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M6 12V6a2 2 0 0 1 4 0"/><path d="M8 18l-1 2M16 18l1 2"/>',
  terraza:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  garaje:
    '<path d="M3 16l2-5h14l2 5v3H3z"/><circle cx="7" cy="17" r="1.5"/><circle cx="17" cy="17" r="1.5"/>',
  oficina:
    '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  lavanderia:
    '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M7 6.5h2"/>',
  jardin:
    '<path d="M12 21v-8"/><path d="M12 13c-4 0-6-3-6-6 4 0 6 2 6 6z"/><path d="M12 13c4 0 6-3 6-6-4 0-6 2-6 6z"/>',
  pasillo:
    '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><path d="M14 12h.01"/>',
  techo:
    '<path d="M2 12l10-8 10 8"/><path d="M4 11v9h16v-9"/><path d="M9 20v-4h6v4"/>',
  obra: '<path d="M2 20h20"/><path d="M5 20V10l7-5 7 5v10"/><path d="M9 20v-5h6v5"/>',
  acabados: '<path d="M4 20l4-4"/><path d="M14 4l6 6-8 8-6-6z"/>',
  instalacion: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  pintura:
    '<path d="M4 4h12v5H4z"/><path d="M16 6h3v4h-7v3"/><path d="M12 12v8"/>',
  limpieza: '<path d="M9 3l-3 9h12l-3-9z"/><path d="M12 12v9"/>',
  luz: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  aire: '<rect x="3" y="5" width="18" height="6" rx="2"/><path d="M6 14c0 2 1 3 2 3M11 14c0 2 1 3 2 3M16 14c0 2 1 3 2 3"/>',
  agua: '<path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"/>',
  herramienta:
    '<path d="M14 6a4 4 0 0 0 4 4l-8 8a2 2 0 0 1-3-3l8-8a4 4 0 0 0-1-1z"/>',
  pintar:
    '<path d="M4 4h12v5H4z"/><path d="M16 6h3v4h-7v3"/><path d="M12 12v8"/>',
  mueble:
    '<path d="M4 10h16v4H4z"/><path d="M6 14v6M18 14v6"/><path d="M4 10V6h16v4"/>',
  puerta:
    '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><path d="M14 12h.01"/>',
};
export const NOMBRES: Record<string, string> = {
  casa: "Casa",
  comedor: "Comedor",
  dormitorio: "Dormitorio",
  sala: "Sala",
  cocina: "Cocina",
  bano: "Baño",
  terraza: "Terraza / exterior",
  garaje: "Garaje",
  oficina: "Oficina",
  lavanderia: "Lavandería",
  jardin: "Jardín",
  pasillo: "Pasillo",
  techo: "Techo",
  obra: "Obra gruesa",
  acabados: "Acabados",
  instalacion: "Instalaciones",
  pintura: "Pintura",
  limpieza: "Limpieza final",
  luz: "Luces",
  aire: "Aire acondicionado",
  agua: "Agua / plomería",
  herramienta: "Herramientas",
  pintar: "Pintura",
  mueble: "Muebles",
  puerta: "Puertas y ventanas",
};
const ICONOS_TIT: Record<string, string> = {
  grafica: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  dinero:
    '<path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  caja: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  martillo: '<path d="M14.7 6.3a4 4 0 0 0 5 5L11 21l-4-4 9.7-9.7z"/>',
  calendario:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  personas:
    '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M17 11a3 3 0 1 0 0-6"/>',
  casa: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  capas: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  etiqueta:
    '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  tienda:
    '<path d="M3 9l2-5h14l2 5"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
};
const COLORES_TIT = [
  "#4a4fc4",
  "#2f855a",
  "#c05621",
  "#b83280",
  "#0e7490",
  "#6b46c1",
  "#b5472b",
  "#2b6cb0",
  "#8a6100",
  "#1e90c8",
];
export const PALETA = [
  "#5b4fd6",
  "#2b6cb0",
  "#1e90c8",
  "#6b46c1",
  "#2f855a",
  "#c05621",
  "#b83280",
  "#0e7490",
];

function iconoTitulo(t: string) {
  t = t.toLowerCase();
  if (/cronograma|fecha/.test(t)) return ICONOS_TIT.calendario;
  if (
    /presupuesto|gasto|comparativo|resumen|por mes|por categor|por tienda/.test(
      t,
    )
  )
    return ICONOS_TIT.grafica;
  if (/pag/.test(t)) return ICONOS_TIT.dinero;
  if (/material/.test(t)) return ICONOS_TIT.caja;
  if (/trabajo/.test(t)) return ICONOS_TIT.martillo;
  if (/contratista/.test(t)) return ICONOS_TIT.personas;
  if (/espacio/.test(t)) return ICONOS_TIT.casa;
  if (/fase/.test(t)) return ICONOS_TIT.capas;
  if (/categor/.test(t)) return ICONOS_TIT.etiqueta;
  if (/tienda/.test(t)) return ICONOS_TIT.tienda;
  return ICONOS_TIT.lista;
}

export function SvgIcono({
  k,
  color,
  size = 20,
}: {
  k?: string;
  color?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color || "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONOS[k || "casa"] || ICONOS.casa }}
    />
  );
}

export function Icono({ it }: { it: Partial<Item> }) {
  if (it.icono)
    return (
      <span className="ico" style={{ background: `${it.color}22` }}>
        <SvgIcono k={it.icono} color={it.color} />
      </span>
    );
  if (it.letra)
    return (
      <span
        className="ico"
        style={{
          background: `${it.color}22`,
          color: it.color,
          fontWeight: 700,
        }}
      >
        {it.letra}
      </span>
    );
  if (it.color)
    return <span className="punto" style={{ background: it.color }} />;
  return null;
}

export function Chip({ it }: { it: Partial<Item> & { nombre: string } }) {
  const c = it.color || "#6b7a75";
  return (
    <span className="chip" style={{ color: c, borderColor: c }}>
      <Icono it={it} /> {it.nombre}
    </span>
  );
}

export function Chips({ list, ids }: { list: Item[]; ids: string[] }) {
  return (
    <>
      {ids
        .map((id) => list.find((x) => x.id === id))
        .filter((x): x is Item => !!x)
        .map((x) => (
          <Chip key={x.id} it={x} />
        ))}
    </>
  );
}

export function Barra({
  valor,
  total,
  tono,
  label = "Pagado",
}: {
  valor: number;
  total: number;
  tono?: string;
  label?: string;
}) {
  const p = pct(valor, total);
  const clase = tono || (p >= 100 ? "verde" : p === 0 ? "inicio" : "");
  return (
    <div className={`progreso ${clase}`}>
      <progress
        className="sr-only"
        aria-label={label}
        max={100}
        value={Math.round(p)}
      />
      <span style={{ width: `${p.toFixed(1)}%` }} />
      <b>{p.toFixed(0)}%</b>
    </div>
  );
}

/** Section title with the automatic color and icon of the HTML (by order). */
export function Titulo({
  n,
  children,
  as = "h3",
}: {
  n: number;
  children: string;
  as?: "h3" | "div";
}) {
  const col = COLORES_TIT[n % COLORES_TIT.length];
  const Tag = as;
  return (
    <Tag
      className={`tit${as === "div" ? " cr-sec" : ""}`}
      style={{ ["--tc" as string]: col }}
    >
      <span className="tit-ico" style={{ background: `${col}1f` }}>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke={col}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: iconoTitulo(children) }}
        />
      </span>
      {children}
    </Tag>
  );
}

export function Seccion({
  n,
  titulo,
  children,
  className = "",
}: {
  n: number;
  titulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`seccion ${className}`}>
      <Titulo n={n}>{titulo}</Titulo>
      {children}
    </div>
  );
}

export interface Dato {
  label: string;
  valor: number;
  valor2?: number;
  color: string;
  icono?: string;
  letra?: string;
}

export function Pie({ datos }: { datos: Dato[] }) {
  const pos = datos.filter((d) => d.valor > 0);
  const total = pos.reduce((a, d) => a + d.valor, 0);
  if (!total) return <p className="meta">Sin gastos registrados todavía.</p>;
  const C = 100,
    R = 96,
    r = 56;
  const punto = (t: number) =>
    [C + R * Math.cos(t), C + R * Math.sin(t)].map((v) => v.toFixed(2));
  const inicios = pos.reduce<number[]>(
    (acc, d, i) =>
      i === 0
        ? [-Math.PI / 2]
        : [...acc, acc[i - 1] + (pos[i - 1].valor / total) * 2 * Math.PI],
    [],
  );
  const partes = pos.map((d, i) => {
    if (pos.length === 1)
      return <circle key={i} cx={C} cy={C} r={R} fill={d.color} />;
    const frac = d.valor / total;
    const a1 = inicios[i];
    const a2 = a1 + frac * 2 * Math.PI;
    const [x1, y1] = punto(a1),
      [x2, y2] = punto(a2);
    return (
      <path
        key={i}
        d={`M${C} ${C}L${x1} ${y1}A${R} ${R} 0 ${frac > 0.5 ? 1 : 0} 1 ${x2} ${y2}Z`}
        fill={d.color}
        stroke="#fff"
        strokeWidth="2"
      >
        <title>{`${d.label}: ${fmt(d.valor)} (${(frac * 100).toFixed(1)}%)`}</title>
      </path>
    );
  });
  return (
    <div className="pie-wrap">
      <svg viewBox="0 0 200 200" className="pie" aria-label="Gráfica circular">
        {partes}
        <circle cx={C} cy={C} r={r} fill="#fff" />
        <text x={C} y={C - 2} textAnchor="middle" fontSize="11" fill="#6b7a75">
          Total
        </text>
        <text
          x={C}
          y={C + 14}
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill="#1d2b27"
        >
          {fmt(total)}
        </text>
      </svg>
      <div className="leyenda">
        {pos.map((d, i) => (
          <div className="leyenda-item" key={i}>
            {d.icono || d.letra ? (
              <Icono it={{ icono: d.icono, letra: d.letra, color: d.color }} />
            ) : (
              <span className="punto" style={{ background: d.color }} />
            )}
            <span>{d.label}</span>
            <b>{fmt(d.valor)}</b>
            <span className="meta">
              {((d.valor / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const corto = (s: string) => (s.length > 9 ? s.slice(0, 8) + "…" : s);
const kf = (n: number) =>
  Math.abs(n) >= 1000
    ? (n / 1000).toFixed(1).replace(".0", "") + "k"
    : String(Math.round(n));

export function Columnas({
  items,
  dobles,
}: {
  items: Dato[];
  dobles: boolean;
}) {
  if (!items.length) return <p className="meta">Sin datos</p>;
  const H = 230,
    base = 190,
    top = 24,
    slot = 78;
  const W = Math.max(340, items.length * slot + 20);
  const max = Math.max(1, ...items.flatMap((i) => [i.valor, i.valor2 || 0]));
  const bw = dobles ? 22 : 36;
  const barra = (v: number, x: number, color: string, titulo: string) => {
    const h = (v / max) * (base - top),
      y = base - h;
    return (
      <>
        <rect x={x} y={y} width={bw} height={h} rx="4" fill={color}>
          <title>{titulo}</title>
        </rect>
        <text
          x={x + bw / 2}
          y={y - 4}
          textAnchor="middle"
          fontSize="10"
          fill="#1d2b27"
        >
          {v ? kf(v) : ""}
        </text>
      </>
    );
  };
  return (
    <div className="svg-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        aria-label="Gráfica de columnas"
      >
        <line x1="0" y1={base} x2={W} y2={base} stroke="#dde3e0" />
        {items.map((it, i) => {
          const cx = 10 + i * slot + slot / 2;
          return (
            <g key={i}>
              {dobles ? (
                <>
                  {barra(
                    it.valor2 || 0,
                    cx - bw - 2,
                    "#cfd9d4",
                    `Presupuesto: ${fmt(it.valor2 || 0)}`,
                  )}
                  {barra(
                    it.valor,
                    cx + 2,
                    it.color,
                    `Pagado: ${fmt(it.valor)}`,
                  )}
                </>
              ) : (
                barra(
                  it.valor,
                  cx - bw / 2,
                  it.color,
                  `${it.label}: ${fmt(it.valor)}`,
                )
              )}
              <text
                x={cx}
                y={base + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7a75"
              >
                {corto(it.label)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
