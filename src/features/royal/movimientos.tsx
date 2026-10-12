"use client";
// Latest changes grouped by day, one week at a time (Panamá time).
import { useState } from "react";
import type { AuditEvent, Workspace } from "@/domain/types";
import { aDia, DIA, fmt, hoyDia } from "./model";
import type { RoyalProps } from "./views";

const TZ = "America/Panama";
const diaDe = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
const hora = (iso: string) =>
  new Intl.DateTimeFormat("es-PA", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
const titulo = (d: number) =>
  new Date(d * DIA).toLocaleDateString("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
const corta = (d: number) =>
  new Date(d * DIA).toLocaleDateString("es-PA", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

const ACCIONES: Record<string, { t: string; c: string }> = {
  created: { t: "Creó", c: "#2f855a" },
  updated: { t: "Editó", c: "#2b6cb0" },
  archived: { t: "Eliminó", c: "#b5472b" },
  restored: { t: "Recuperó", c: "#6b46c1" },
};
const TIPOS: Record<string, string> = {
  projects: "Obra",
  spaces: "Espacio",
  phases: "Fase",
  categories: "Categoría",
  contractors: "Contratista",
  work_items: "Trabajo",
  payments: "Pago",
  material_purchases: "Material",
  attachments: "Archivo",
  links: "Link",
};

function describir(data: Workspace, e: AuditEvent): string {
  const id = e.entity_id;
  switch (e.entity_type) {
    case "projects":
      return data.projects.find((x) => x.id === id)?.name || "";
    case "spaces":
      return data.spaces.find((x) => x.id === id)?.name || "";
    case "phases":
      return data.phases.find((x) => x.id === id)?.name || "";
    case "categories":
      return data.categories.find((x) => x.id === id)?.name || "";
    case "contractors":
      return data.contractors.find((x) => x.id === id)?.name || "";
    case "work_items":
      return data.works.find((x) => x.id === id)?.name || "";
    case "payments": {
      const p = data.payments.find((x) => x.id === id);
      if (!p) return "";
      const w = data.works.find((x) => x.id === p.work_item_id);
      return `${fmt(p.amount_cents / 100)} · ${p.description}${w ? ` · ${w.name}` : ""}`;
    }
    case "material_purchases": {
      const m = data.materials.find((x) => x.id === id);
      return m
        ? `${m.store} · ${m.description} · ${fmt(m.amount_cents / 100)}`
        : "";
    }
    case "attachments":
      return (
        data.attachments.find((x) => x.id === id)?.name || "archivo eliminado"
      );
    case "links":
      return (
        (data.links || []).find((x) => x.id === id)?.name || "link eliminado"
      );
    default:
      return "";
  }
}

export function Movimientos(props: RoyalProps) {
  const { data, project } = props;
  const [semana, setSemana] = useState(0);
  const [hoy] = useState(hoyDia);
  const dow = (new Date(hoy * DIA).getUTCDay() + 6) % 7; // lunes = 0
  const lunes = hoy - dow + semana * 7;
  const domingo = lunes + 6;
  const vistos = new Set<string>();
  const eventos = data.audit
    .filter((e) => e.project_id === project.id && TIPOS[e.entity_type])
    .map((e) => ({ ...e, dia: aDia(diaDe(e.created_at)) }))
    .filter((e) => e.dia >= lunes && e.dia <= domingo)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .filter((e) => {
      // A single save can touch the same record more than once in the same minute.
      const k = `${e.entity_type}:${e.entity_id}:${e.action}:${e.created_at.slice(0, 16)}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  const dias = Array.from({ length: 7 }, (_, i) => domingo - i).filter(
    (d) => d <= hoy,
  );
  return (
    <>
      <div className="semana-nav no-imprimir">
        <button className="sec" onClick={() => setSemana(semana - 1)}>
          ◀ Semana anterior
        </button>
        <b>
          {corta(lunes)} – {corta(domingo)}
        </b>
        <button
          className="sec"
          disabled={semana >= 0}
          onClick={() => setSemana(semana + 1)}
        >
          Semana siguiente ▶
        </button>
        {semana !== 0 && (
          <button className="sec" onClick={() => setSemana(0)}>
            Esta semana
          </button>
        )}
      </div>
      <p className="resumen-filtro">
        <b>{eventos.length}</b> movimiento(s) en esta semana
      </p>
      {dias.length === 0 ? (
        <p className="meta">Esta semana todavía no empieza.</p>
      ) : (
        dias.map((d) => {
          const delDia = eventos.filter((e) => e.dia === d);
          return (
            <div key={d} className="seccion mov-dia">
              <h3>
                {titulo(d)}
                {d === hoy ? " · hoy" : ""}
              </h3>
              {delDia.length ? (
                delDia.map((e) => {
                  const a = ACCIONES[e.action] || { t: e.action, c: "#6b7a75" };
                  const texto = describir(data, e);
                  return (
                    <div className="mov-item" key={e.id}>
                      <span className="mov-hora">{hora(e.created_at)}</span>
                      <span
                        className="mov-accion"
                        style={{ color: a.c, background: `${a.c}18` }}
                      >
                        {a.t}
                      </span>
                      <span>
                        <b>{TIPOS[e.entity_type]}</b>
                        {texto ? ` · ${texto}` : ""}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="meta">Sin movimientos.</p>
              )}
            </div>
          );
        })
      )}
      <p className="meta">
        Se muestran los movimientos de los últimos 4 meses.
      </p>
    </>
  );
}
