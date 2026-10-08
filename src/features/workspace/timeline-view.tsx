"use client";

import { useState } from "react";
import type { WorkItem } from "@/domain/types";
import { today } from "@/domain/finance";
import { Empty, Status, formatDate } from "@/components/ui";
import { matches, type ViewProps } from "./view-types";

const day = (date: string) =>
  new Date(`${date}T12:00:00Z`).getTime() / 86400000;
const dayText = (value: number) =>
  new Date(value * 86400000).toISOString().slice(0, 10);
export function TimelineView({ data, project, query }: ViewProps) {
  const [groupBy, setGroupBy] = useState<"none" | "phase" | "contractor">(
    "none",
  );
  const works = data.works.filter(
    (work) =>
      work.project_id === project.id &&
      !work.archived_at &&
      matches(query, work.name, work.description),
  );
  const dated = works
    .filter((work) => work.start_date && work.end_date)
    .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
  const undated = works.filter((work) => !work.start_date || !work.end_date);
  if (!works.length)
    return (
      <Empty
        title="Planifica las entregas de la obra"
        description="Los trabajos con fechas de inicio y entrega aparecerán en este cronograma."
      />
    );
  const min = Math.min(...dated.map((work) => day(work.start_date!)));
  const max = Math.max(...dated.map((work) => day(work.end_date!)));
  const span = Math.max(1, max - min + 1);
  const now = day(today());
  const groups: { label: string; color: string; items: WorkItem[] }[] =
    groupBy === "none"
      ? [{ label: "Trabajos", color: "#514ac8", items: dated }]
      : groupBy === "phase"
        ? [
            ...data.phases
              .filter((phase) => phase.project_id === project.id)
              .map((phase) => ({
                label: phase.name,
                color: phase.color,
                items: dated.filter((work) => work.phase_id === phase.id),
              })),
            {
              label: "Sin fase",
              color: "#737c90",
              items: dated.filter((work) => !work.phase_id),
            },
          ]
        : [
            ...data.contractors
              .filter((contractor) => contractor.project_id === project.id)
              .map((contractor) => ({
                label: contractor.name,
                color: contractor.color,
                items: dated.filter((work) =>
                  work.assignments.some(
                    (item) => item.contractor_id === contractor.id,
                  ),
                ),
              })),
            {
              label: "Sin contratista",
              color: "#737c90",
              items: dated.filter((work) => !work.assignments.length),
            },
          ];
  return (
    <>
      <div className="timeline-toolbar">
        <p>Fechas previstas y avance físico de cada trabajo.</p>
        <label>
          Agrupar por
          <select
            value={groupBy}
            onChange={(event) =>
              setGroupBy(event.target.value as typeof groupBy)
            }
          >
            <option value="none">Trabajo</option>
            <option value="phase">Fase</option>
            <option value="contractor">Contratista</option>
          </select>
        </label>
      </div>
      {dated.length ? (
        <section className="panel timeline-panel">
          <div className="timeline-scroll">
            <div className="timeline-chart">
              <div className="timeline-axis">
                <div>Trabajo / entrega</div>
                <div className="timeline-axis-dates">
                  {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                    <span key={fraction} style={{ left: `${fraction * 100}%` }}>
                      {new Intl.DateTimeFormat("es-PA", {
                        day: "2-digit",
                        month: "short",
                        timeZone: "UTC",
                      }).format(
                        new Date(
                          dayText(min + Math.round((span - 1) * fraction)) +
                            "T12:00:00Z",
                        ),
                      )}
                    </span>
                  ))}
                </div>
              </div>
              {groups
                .filter((group) => group.items.length)
                .map((group) => (
                  <div key={group.label} className="timeline-group">
                    {groupBy !== "none" && (
                      <h3 style={{ borderLeftColor: group.color }}>
                        {group.label}
                      </h3>
                    )}
                    {group.items.map((work) => {
                      const left = ((day(work.start_date!) - min) / span) * 100;
                      const width = Math.max(
                        0.7,
                        ((day(work.end_date!) - day(work.start_date!) + 1) /
                          span) *
                          100,
                      );
                      return (
                        <div className="timeline-row" key={work.id}>
                          <div className="timeline-row-label">
                            <strong>{work.name}</strong>
                            <span>
                              {formatDate(work.start_date)} —{" "}
                              {formatDate(work.end_date)}
                            </span>
                          </div>
                          <div className="timeline-track">
                            {now >= min && now <= max && (
                              <div
                                className="today-line"
                                style={{
                                  left: `${((now - min) / span) * 100}%`,
                                }}
                                title="Hoy"
                              />
                            )}
                            <div
                              className={`timeline-bar ${work.status}`}
                              style={{
                                left: `${left}%`,
                                width: `${width}%`,
                                borderColor: group.color,
                              }}
                              title={`${work.name}: ${work.progress}% ejecutado`}
                            >
                              <span
                                className="timeline-completed"
                                style={{
                                  width: `${work.progress}%`,
                                  backgroundColor: group.color,
                                }}
                              />
                              <b>{work.progress}%</b>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>
          <div className="timeline-legend">
            <span>
              <i className="timeline-legend-fill" />
              Avance físico
            </span>
            <span>
              <i className="timeline-legend-outline" />
              Plazo previsto
            </span>
            <span>
              <i className="timeline-legend-today" />
              Hoy
            </span>
          </div>
        </section>
      ) : (
        <Empty
          title="Faltan fechas por definir"
          description="Agrega inicio y entrega a los trabajos para construir el cronograma."
        />
      )}
      {undated.length > 0 && (
        <section className="panel undated-panel">
          <div className="section-heading">
            <h2>Sin rango de fechas</h2>
            <span className="muted">{undated.length} trabajos</span>
          </div>
          {undated.map((work) => (
            <div className="delivery-row" key={work.id}>
              <strong>{work.name}</strong>
              <Status value={work.status} />
            </div>
          ))}
        </section>
      )}
    </>
  );
}
