"use client";

import { money, paidForWork, isDelayed, workBudget } from "@/domain/finance";
import { Icon } from "@/components/icons";
import { Empty, Progress, Status, formatDate } from "@/components/ui";
import { matches, type ViewProps } from "./view-types";
export function WorksView({
  data,
  project,
  admin,
  query,
  edit,
  archive,
}: ViewProps) {
  const works = data.works
    .filter((work) => work.project_id === project.id && !work.archived_at)
    .filter((work) =>
      matches(
        query,
        work.name,
        work.description,
        ...work.assignments.map(
          (item) =>
            data.contractors.find(
              (contractor) => contractor.id === item.contractor_id,
            )?.name,
        ),
      ),
    );
  if (!works.length)
    return (
      <Empty
        title={
          query
            ? "No hay trabajos con esa búsqueda"
            : "Organiza lo que hay que hacer"
        }
        description="Cada trabajo tiene presupuesto, contratistas, fechas y un avance físico propio."
        action={
          admin &&
          !query && (
            <button className="button" onClick={() => edit("work_items")}>
              <Icon name="plus" />
              Nuevo trabajo
            </button>
          )
        }
      />
    );
  return (
    <div className="works-list">
      {works.map((work) => {
        const paid = paidForWork(data, work.id);
        const budget = workBudget(data, work);
        const phase = data.phases.find((item) => item.id === work.phase_id);
        return (
          <article className="work-card" key={work.id}>
            <div className="work-card-heading">
              <div>
                <div className="work-title">
                  <h2>{work.name}</h2>
                  {isDelayed(work) && (
                    <span className="tag danger">Entrega vencida</span>
                  )}
                </div>
                <div className="work-tags">
                  {phase && (
                    <span
                      className="tag"
                      style={{ borderLeft: `3px solid ${phase.color}` }}
                    >
                      {phase.name}
                    </span>
                  )}
                  {work.space_ids.map((id) => (
                    <span className="tag" key={id}>
                      {data.spaces.find((space) => space.id === id)?.name ||
                        "Espacio"}
                    </span>
                  ))}
                </div>
              </div>
              <div className="work-actions">
                <Status value={work.status} />
                {admin && (
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Editar ${work.name}`}
                      onClick={() => edit("work_items", { ...work })}
                    >
                      <Icon name="edit" size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Archivar ${work.name}`}
                      onClick={() => archive("work_items", work.id, work.name)}
                    >
                      <Icon name="archive" size={17} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {work.description && (
              <p className="work-description">{work.description}</p>
            )}
            <div className="work-body">
              <div className="work-money">
                <div>
                  <span>Presupuesto</span>
                  <strong>{money(budget)}</strong>
                </div>
                <div>
                  <span>Pagado</span>
                  <strong className={paid > budget ? "danger-text" : ""}>
                    {money(paid)}
                  </strong>
                </div>
                <div>
                  <span>Por pagar</span>
                  <strong>{money(Math.max(0, budget - paid))}</strong>
                </div>
              </div>
              <div className="work-progress">
                <Progress
                  value={work.progress}
                  label="Avance físico"
                  tone="teal"
                />
                <Progress
                  value={budget > 0 ? (paid / budget) * 100 : 0}
                  label="Presupuesto pagado"
                />
                {paid > budget && (
                  <small className="danger-text">
                    Excedente pagado: {money(paid - budget)}
                  </small>
                )}
              </div>
            </div>
            <div className="work-footer">
              <div className="assignment-chips">
                {work.assignments.length ? (
                  work.assignments.map((assignment) => {
                    const contractor = data.contractors.find(
                      (item) => item.id === assignment.contractor_id,
                    );
                    return (
                      <span
                        className="contractor-chip"
                        key={assignment.contractor_id}
                      >
                        <i
                          style={{
                            backgroundColor: contractor?.color || "#514ac8",
                          }}
                        >
                          {contractor?.name.charAt(0) || "C"}
                        </i>
                        <span>
                          {contractor?.name || "Contratista"}
                          <small>
                            {money(assignment.allocation_cents)} asignados
                          </small>
                        </span>
                      </span>
                    );
                  })
                ) : (
                  <span className="muted">Sin contratistas asignados</span>
                )}
              </div>
              <span className="date-range">
                <Icon name="calendar" size={15} />
                {formatDate(work.start_date)} — {formatDate(work.end_date)}
              </span>
            </div>
            {admin && work.assignments.length > 0 && (
              <button
                className="text-button work-pay-button"
                onClick={() => edit("payments", { work_item_id: work.id })}
              >
                <Icon name="plus" size={16} />
                Registrar pago
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
