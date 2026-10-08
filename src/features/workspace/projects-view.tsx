"use client";

import type { MutationInput, Project, Workspace } from "@/domain/types";
import { money, projectSummary } from "@/domain/finance";
import { Icon } from "@/components/icons";
import { Empty, Progress, Status, formatDate } from "@/components/ui";
import { matches, type ViewProps } from "./view-types";

export function ProjectsView({
  data,
  query,
  showArchived,
  canCreate,
  onSelect,
  onEdit,
  onArchive,
}: {
  data: Workspace;
  query: string;
  showArchived: boolean;
  canCreate: boolean;
  onSelect: (id: string) => void;
  onEdit: (record?: MutationInput) => void;
  onArchive: (project: Project) => void;
}) {
  const projects = data.projects
    .filter((project) =>
      showArchived ? !!project.archived_at : !project.archived_at,
    )
    .filter((project) =>
      matches(query, project.name, project.location, project.description),
    );
  if (!projects.length)
    return (
      <Empty
        title={
          query
            ? "No hay obras con esa búsqueda"
            : showArchived
              ? "No hay obras archivadas"
              : "Tu primera obra comienza aquí"
        }
        description={
          query
            ? "Prueba con otro nombre o ubicación."
            : showArchived
              ? "Las obras que archives aparecerán en esta vista."
              : "Define la obra, agrega a tus contratistas y organiza los trabajos. Todo quedará en un mismo lugar."
        }
        action={
          canCreate &&
          !showArchived &&
          !query && (
            <button className="button" onClick={() => onEdit()}>
              <Icon name="plus" />
              Nueva obra
            </button>
          )
        }
      />
    );
  return (
    <div className="project-list">
      {projects.map((project) => {
        const summary = projectSummary(data, project.id);
        const admin = data.roles[project.id] === "admin";
        return (
          <article className="project-card" key={project.id}>
            <div className="project-card-top">
              <div className="project-mark">
                <Icon name="works" size={25} />
              </div>
              <Status value={project.status} />
              {project.archived_at && <span className="tag">Archivada</span>}
            </div>
            <button
              className="project-open"
              disabled={!!project.archived_at}
              onClick={() => onSelect(project.id)}
            >
              <h2>{project.name}</h2>
              <p>{project.location || "Ubicación por definir"}</p>
            </button>
            <div className="project-facts">
              <div>
                <span>{admin ? "Presupuesto" : "Mis trabajos asignados"}</span>
                <strong>
                  {money(admin ? project.budget_cents : summary.committed)}
                </strong>
              </div>
              <div>
                <span>Gasto registrado</span>
                <strong>{money(summary.spent)}</strong>
              </div>
            </div>
            <Progress
              value={summary.physicalProgress}
              label="Avance físico promedio"
              tone="teal"
            />
            <div className="project-card-bottom">
              <span>
                {summary.works} {summary.works === 1 ? "trabajo" : "trabajos"}
                {summary.delayed ? (
                  <span className="danger-text">
                    {" "}
                    · {summary.delayed} atrasados
                  </span>
                ) : (
                  ""
                )}
              </span>
              <div className="row-actions">
                {admin && (
                  <>
                    <button
                      className="icon-button"
                      aria-label={`Editar ${project.name}`}
                      onClick={() => onEdit({ ...project })}
                    >
                      <Icon name="edit" size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${project.archived_at ? "Recuperar" : "Archivar"} ${project.name}`}
                      onClick={() => onArchive(project)}
                    >
                      <Icon name="archive" size={17} />
                    </button>
                  </>
                )}
                {!project.archived_at && (
                  <button
                    className="icon-button"
                    aria-label={`Abrir ${project.name}`}
                    onClick={() => onSelect(project.id)}
                  >
                    <Icon name="arrow" size={18} />
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
export function ProjectOverview(props: ViewProps) {
  const { data, project, admin, edit } = props;
  const summary = projectSummary(data, project.id);
  const workList = data.works.filter(
    (work) => work.project_id === project.id && !work.archived_at,
  );
  const dated = workList
    .filter((work) => work.end_date && work.status !== "completed")
    .sort((a, b) => (a.end_date || "").localeCompare(b.end_date || ""))
    .slice(0, 5);
  const recent = data.payments
    .filter(
      (payment) => payment.project_id === project.id && !payment.archived_at,
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  return (
    <>
      <div className="summary-strip">
        <div>
          <span>
            {admin ? "Presupuesto de la obra" : "Presupuesto de tus trabajos"}
          </span>
          <strong>
            {money(admin ? project.budget_cents : summary.committed)}
          </strong>
        </div>
        <div>
          <span>Gasto registrado</span>
          <strong>{money(summary.spent)}</strong>
          <small>Pagos + materiales adicionales</small>
        </div>
        <div>
          <span>Saldo del presupuesto</span>
          <strong
            className={
              summary.spent > (admin ? project.budget_cents : summary.committed)
                ? "danger-text"
                : ""
            }
          >
            {money(
              (admin ? project.budget_cents : summary.committed) -
                summary.spent,
            )}
          </strong>
        </div>
        <div>
          <span>Trabajos activos</span>
          <strong>{summary.works.toString().padStart(2, "0")}</strong>
          <small>
            {summary.delayed
              ? `${summary.delayed} con entrega vencida`
              : "Sin entregas vencidas"}
          </small>
        </div>
      </div>
      <div className="overview-grid">
        <section className="panel execution-panel">
          <div className="section-heading">
            <h2>Así va la obra</h2>
            <Status value={project.status} />
          </div>
          <Progress
            value={summary.physicalProgress}
            label="Avance físico promedio"
            tone="teal"
          />
          <p className="muted">
            Promedio de avance reportado en {summary.works} trabajos.
          </p>
          <div className="financial-line">
            <span>Pagado a contratistas</span>
            <strong>{money(summary.paid)}</strong>
          </div>
          <div className="financial-line">
            <span>Presupuesto de trabajos</span>
            <strong>{money(summary.committed)}</strong>
          </div>
          <div className="financial-line">
            <span>Materiales adicionales</span>
            <strong>{money(summary.materials)}</strong>
          </div>
          <div className="financial-line">
            <span>Pendiente de pagar en trabajos</span>
            <strong>{money(summary.pending)}</strong>
          </div>
          {summary.overpaid > 0 && (
            <p className="form-error">
              Los pagos exceden los presupuestos de trabajos en{" "}
              {money(summary.overpaid)}.
            </p>
          )}
          <div className="project-dates">
            <span>
              Inicio <b>{formatDate(project.start_date)}</b>
            </span>
            <span>
              Entrega <b>{formatDate(project.end_date)}</b>
            </span>
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Próximas entregas</h2>
            <Icon name="calendar" />
          </div>
          {dated.length ? (
            <div className="delivery-list">
              {dated.map((work) => (
                <div className="delivery-row" key={work.id}>
                  <div>
                    <strong>{work.name}</strong>
                    <span>{formatDate(work.end_date)}</span>
                  </div>
                  <Status value={work.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="compact-empty">
              <p>Aún no hay entregas programadas.</p>
              <span>Asigna fechas a tus trabajos para ver lo que sigue.</span>
            </div>
          )}
          {admin && (
            <button
              className="button secondary full-button"
              onClick={() => edit("work_items")}
            >
              <Icon name="plus" size={16} />
              Crear trabajo
            </button>
          )}
        </section>
        <section className="panel overview-payments">
          <div className="section-heading">
            <h2>Últimos pagos</h2>
            <span className="muted">Beneficiario real de cada pago</span>
          </div>
          {recent.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Contratista</th>
                    <th>Trabajo</th>
                    <th>Fecha</th>
                    <th className="numeric">Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        {data.contractors.find(
                          (c) => c.id === payment.contractor_id,
                        )?.name || "Contratista"}
                      </td>
                      <td>
                        {data.works.find((w) => w.id === payment.work_item_id)
                          ?.name || "Trabajo"}
                      </td>
                      <td>{formatDate(payment.date)}</td>
                      <td className="numeric">{money(payment.amount_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="compact-empty">
              <p>No hay pagos registrados.</p>
              <span>
                Al registrar un pago, podrás consultar su beneficiario y
                comprobantes aquí.
              </span>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
