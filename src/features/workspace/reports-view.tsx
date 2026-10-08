"use client";

import type { Workspace } from "@/domain/types";
import {
  money,
  projectSummary,
  workBudget,
  isAdditionalMaterial,
} from "@/domain/finance";
import { Icon } from "@/components/icons";
import { Empty, formatDate } from "@/components/ui";
import { type ViewProps } from "./view-types";

function csvCell(value: string | number) {
  let cell = String(value);
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replaceAll('"', '""')}"`;
}
function downloadCSV(rows: (string | number)[][], filename: string) {
  const blob = new Blob(
    ["\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
export function exportMovements(
  data: Workspace,
  projectId: string,
  name: string,
) {
  const lookup = <T extends { id: string; name: string }>(
    items: T[],
    id: string | null,
  ) => items.find((item) => item.id === id)?.name || "";
  const rows: (string | number)[][] = [
    [
      "Tipo",
      "Fecha",
      "Trabajo",
      "Contratista",
      "Descripción",
      "Proveedor / medio",
      "Categoría",
      "Fase",
      "Espacios",
      "Monto USD",
      "Pago vinculado",
      "Contabilización",
      "ID",
    ],
  ];
  data.payments
    .filter((item) => item.project_id === projectId && !item.archived_at)
    .forEach((payment) =>
      rows.push([
        "Pago",
        payment.date,
        lookup(data.works, payment.work_item_id),
        lookup(data.contractors, payment.contractor_id),
        payment.description,
        payment.method,
        "",
        "",
        "",
        (payment.amount_cents / 100).toFixed(2),
        "",
        "Pago",
        payment.id,
      ]),
    );
  data.materials
    .filter((item) => item.project_id === projectId && !item.archived_at)
    .forEach((material) =>
      rows.push([
        "Material",
        material.date,
        lookup(data.works, material.work_item_id),
        lookup(data.contractors, material.contractor_id),
        material.description,
        material.store,
        lookup(data.categories, material.category_id),
        lookup(data.phases, material.phase_id),
        material.space_ids.map((id) => lookup(data.spaces, id)).join(" / "),
        (material.amount_cents / 100).toFixed(2),
        material.covered_by_payment_id || "",
        isAdditionalMaterial(data, material)
          ? "Gasto adicional"
          : "Incluido en pago",
        material.id,
      ]),
    );
  downloadCSV(rows, `${name.replace(/[^a-zA-Z0-9_-]/g, "-")}-movimientos.csv`);
}
export function ReportsView({ data, project, admin }: ViewProps) {
  const summary = projectSummary(data, project.id);
  const works = data.works.filter(
    (item) => item.project_id === project.id && !item.archived_at,
  );
  const payments = data.payments.filter(
    (item) => item.project_id === project.id && !item.archived_at,
  );
  const materials = data.materials.filter(
    (item) => item.project_id === project.id && !item.archived_at,
  );
  const contractors = data.contractors.filter(
    (item) =>
      item.project_id === project.id &&
      (!item.archived_at ||
        payments.some((payment) => payment.contractor_id === item.id) ||
        works.some((work) =>
          work.assignments.some(
            (assignment) => assignment.contractor_id === item.id,
          ),
        )),
  );
  const months: Record<string, { paid: number; materials: number }> = {};
  payments.forEach((item) => {
    const key = item.date.slice(0, 7);
    months[key] ||= { paid: 0, materials: 0 };
    months[key].paid += item.amount_cents;
  });
  materials
    .filter((item) => isAdditionalMaterial(data, item))
    .forEach((item) => {
      const key = item.date.slice(0, 7);
      months[key] ||= { paid: 0, materials: 0 };
      months[key].materials += item.amount_cents;
    });
  const audit = data.audit
    .filter((item) => item.project_id === project.id)
    .slice(0, 20);
  const verbs: Record<string, string> = {
    create: "Creación",
    update: "Actualización",
    archive: "Archivo",
    restore: "Recuperación",
    insert: "Creación",
    invite: "Invitación",
    upload: "Archivo adjunto",
    delete_attachment: "Comprobante eliminado",
    delete: "Eliminación",
  };
  const nouns: Record<string, string> = {
    projects: "Obra",
    work_items: "Trabajo",
    payments: "Pago",
    material_purchases: "Compra de materiales",
    contractors: "Contratista",
    spaces: "Espacio",
    phases: "Fase",
    categories: "Categoría",
    attachments: "Comprobante",
  };
  return (
    <>
      <div className="report-actions no-print">
        <p>
          Información de <strong>{project.name}</strong> para compartir y
          revisar.
        </p>
        <div>
          <button
            className="button secondary"
            onClick={() => exportMovements(data, project.id, project.name)}
          >
            <Icon name="report" size={17} />
            Exportar movimientos CSV
          </button>
          <button className="button" onClick={() => window.print()}>
            <Icon name="file" size={17} />
            Imprimir / PDF
          </button>
        </div>
      </div>
      <div className="print-heading">
        <h1>{project.name}</h1>
        <p>Reporte de obra · {project.location}</p>
      </div>
      <div className="summary-strip report-summary">
        <div>
          <span>
            {admin ? "Presupuesto de la obra" : "Presupuesto de tus trabajos"}
          </span>
          <strong>
            {money(admin ? project.budget_cents : summary.committed)}
          </strong>
        </div>
        <div>
          <span>Pagos a contratistas</span>
          <strong>{money(summary.paid)}</strong>
        </div>
        <div>
          <span>Materiales adicionales</span>
          <strong>{money(summary.materials)}</strong>
        </div>
        <div>
          <span>Gasto total registrado</span>
          <strong>{money(summary.spent)}</strong>
        </div>
      </div>
      <section className="panel report-panel">
        <div className="section-heading">
          <h2>Presupuesto y pagos por contratista</h2>
        </div>
        {contractors.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contratista</th>
                  <th className="numeric">Asignado</th>
                  <th className="numeric">Pagado</th>
                  <th className="numeric">Por pagar</th>
                  <th className="numeric">Excedente</th>
                </tr>
              </thead>
              <tbody>
                {contractors.map((contractor) => {
                  const assigned = works.reduce(
                    (sum, work) =>
                      sum +
                      (work.assignments.find(
                        (item) => item.contractor_id === contractor.id,
                      )?.allocation_cents || 0),
                    0,
                  );
                  const paid = payments
                    .filter((item) => item.contractor_id === contractor.id)
                    .reduce((sum, item) => sum + item.amount_cents, 0);
                  return (
                    <tr key={contractor.id}>
                      <td>
                        {contractor.name}
                        {contractor.archived_at && (
                          <span className="cell-sub">Archivado</span>
                        )}
                      </td>
                      <td className="numeric">{money(assigned)}</td>
                      <td className="numeric">{money(paid)}</td>
                      <td className="numeric">
                        {money(Math.max(0, assigned - paid))}
                      </td>
                      <td
                        className={`numeric${paid > assigned ? " danger-text" : ""}`}
                      >
                        {money(Math.max(0, paid - assigned))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="compact-empty">
            <p>No hay contratistas en esta obra.</p>
          </div>
        )}
        <p className="report-note">
          Los pagos corresponden a quien los recibió. El presupuesto asignado se
          define en cada trabajo.
        </p>
      </section>
      <section className="panel report-panel">
        <div className="section-heading">
          <h2>Gasto por mes</h2>
        </div>
        {Object.keys(months).length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th className="numeric">Pagos</th>
                  <th className="numeric">Materiales adicionales</th>
                  <th className="numeric">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(months)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([month, amounts]) => (
                    <tr key={month}>
                      <td>
                        {new Intl.DateTimeFormat("es-PA", {
                          month: "long",
                          year: "numeric",
                          timeZone: "UTC",
                        }).format(new Date(`${month}-01T12:00:00Z`))}
                      </td>
                      <td className="numeric">{money(amounts.paid)}</td>
                      <td className="numeric">{money(amounts.materials)}</td>
                      <td className="numeric">
                        <strong>
                          {money(amounts.paid + amounts.materials)}
                        </strong>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="compact-empty">
            <p>Aún no hay movimientos financieros.</p>
          </div>
        )}
      </section>
      <section className="panel report-panel">
        <div className="section-heading">
          <h2>Estado de los trabajos</h2>
          <span className="muted">Avance físico separado de pagos</span>
        </div>
        {works.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Trabajo</th>
                  <th>Entrega</th>
                  <th className="numeric">Presupuesto</th>
                  <th className="numeric">Pagado</th>
                  <th className="numeric">Avance físico</th>
                </tr>
              </thead>
              <tbody>
                {works.map((work) => (
                  <tr key={work.id}>
                    <td>{work.name}</td>
                    <td>{formatDate(work.end_date)}</td>
                    <td className="numeric">{money(workBudget(data, work))}</td>
                    <td className="numeric">
                      {money(
                        payments
                          .filter((item) => item.work_item_id === work.id)
                          .reduce((sum, item) => sum + item.amount_cents, 0),
                      )}
                    </td>
                    <td className="numeric">{work.progress}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="El reporte comienza con tus trabajos"
            description="Agrega trabajos y registra movimientos para consultar los resultados de la obra."
          />
        )}
      </section>
      {admin && audit.length > 0 && (
        <section className="panel report-panel">
          <div className="section-heading">
            <h2>Historial reciente</h2>
            <span className="muted">Últimos {audit.length} cambios</span>
          </div>
          <div className="audit-list">
            {audit.map((event) => (
              <div className="audit-row" key={event.id}>
                <span>
                  <strong>{verbs[event.action] || event.action}</strong> ·{" "}
                  {nouns[event.entity_type] || event.entity_type}
                </span>
                <time dateTime={event.created_at}>
                  {new Intl.DateTimeFormat("es-PA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "America/Panama",
                  }).format(new Date(event.created_at))}
                </time>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
