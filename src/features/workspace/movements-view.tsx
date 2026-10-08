"use client";

import { money, isAdditionalMaterial } from "@/domain/finance";
import { Icon } from "@/components/icons";
import { Empty, formatDate } from "@/components/ui";
import { matches, type ViewProps } from "./view-types";

export function PaymentsView({
  data,
  project,
  query,
  admin,
  edit,
  archive,
  attachments,
}: ViewProps) {
  const payments = data.payments
    .filter(
      (payment) => payment.project_id === project.id && !payment.archived_at,
    )
    .filter((payment) =>
      matches(
        query,
        payment.description,
        payment.method,
        data.contractors.find((c) => c.id === payment.contractor_id)?.name,
        data.works.find((w) => w.id === payment.work_item_id)?.name,
      ),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!payments.length)
    return (
      <Empty
        title={
          query
            ? "No hay pagos con esa búsqueda"
            : "Los pagos, con nombre y respaldo"
        }
        description="Registra cuánto recibió cada contratista y adjunta el comprobante. Primero crea y asigna un trabajo."
        action={
          admin &&
          !query && (
            <button className="button" onClick={() => edit("payments")}>
              <Icon name="plus" />
              Registrar pago
            </button>
          )
        }
      />
    );
  return (
    <section className="panel list-panel">
      <div className="list-summary">
        <strong>
          {money(
            payments.reduce((sum, payment) => sum + payment.amount_cents, 0),
          )}
        </strong>
        <span>
          en {payments.length} pagos {query && "de esta búsqueda"}
        </span>
      </div>
      <div className="table-wrap">
        <table className="movements-table">
          <thead>
            <tr>
              <th>Beneficiario / trabajo</th>
              <th>Fecha y medio</th>
              <th>Descripción</th>
              <th className="numeric">Monto</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <strong>
                    {data.contractors.find(
                      (item) => item.id === payment.contractor_id,
                    )?.name || "Contratista"}
                  </strong>
                  <span className="cell-sub">
                    {data.works.find((item) => item.id === payment.work_item_id)
                      ?.name || "Trabajo"}
                  </span>
                </td>
                <td>
                  {formatDate(payment.date)}
                  <span className="cell-sub">{payment.method}</span>
                </td>
                <td>{payment.description || "—"}</td>
                <td className="numeric money-cell">
                  {money(payment.amount_cents)}
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="attachment-button"
                      onClick={() =>
                        attachments(
                          "payment",
                          payment.id,
                          `Comprobantes del pago · ${money(payment.amount_cents)}`,
                        )
                      }
                      aria-label={`Comprobantes del pago ${money(payment.amount_cents)}`}
                    >
                      <Icon name="file" size={17} />
                      <span>
                        {
                          data.attachments.filter(
                            (item) =>
                              !item.archived_at &&
                              item.payment_id === payment.id,
                          ).length
                        }
                      </span>
                    </button>
                    {admin && (
                      <>
                        <button
                          className="icon-button"
                          aria-label={`Editar pago ${money(payment.amount_cents)}`}
                          onClick={() => edit("payments", { ...payment })}
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Archivar pago ${money(payment.amount_cents)}`}
                          onClick={() =>
                            archive(
                              "payments",
                              payment.id,
                              `Pago de ${money(payment.amount_cents)}`,
                            )
                          }
                        >
                          <Icon name="archive" size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export function MaterialsView({
  data,
  project,
  query,
  admin,
  edit,
  archive,
  attachments,
}: ViewProps) {
  const materials = data.materials
    .filter(
      (material) => material.project_id === project.id && !material.archived_at,
    )
    .filter((material) =>
      matches(
        query,
        material.description,
        material.store,
        material.quantity,
        data.categories.find((item) => item.id === material.category_id)?.name,
      ),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!materials.length)
    return (
      <Empty
        title={
          query
            ? "No hay materiales con esa búsqueda"
            : "Cada compra tiene su lugar"
        }
        description="Relaciona materiales con trabajos, espacios y pagos para conocer el gasto sin contar una compra dos veces."
        action={
          admin &&
          !query && (
            <button
              className="button"
              onClick={() => edit("material_purchases")}
            >
              <Icon name="plus" />
              Nueva compra
            </button>
          )
        }
      />
    );
  return (
    <>
      <div className="materials-info">
        <span>
          Gasto adicional{" "}
          <strong>
            {money(
              materials
                .filter((item) => isAdditionalMaterial(data, item))
                .reduce((sum, item) => sum + item.amount_cents, 0),
            )}
          </strong>
        </span>
        <p>Las compras incluidas en un pago no se suman nuevamente al gasto.</p>
      </div>
      <div className="materials-list">
        {materials.map((material) => (
          <article className="panel material-card" key={material.id}>
            <div className="material-card-icon">
              <Icon name="materials" size={24} />
            </div>
            <div className="material-content">
              <h2>{material.description}</h2>
              <p>
                {material.store}
                {material.quantity && ` · ${material.quantity}`}
                <span> · {formatDate(material.date)}</span>
              </p>
              <div className="work-tags">
                {material.category_id && (
                  <span className="tag">
                    {data.categories.find(
                      (item) => item.id === material.category_id,
                    )?.name || "Categoría"}
                  </span>
                )}
                {material.phase_id && (
                  <span className="tag">
                    {data.phases.find((item) => item.id === material.phase_id)
                      ?.name || "Fase"}
                  </span>
                )}
                {material.space_ids.map((id) => (
                  <span className="tag" key={id}>
                    {data.spaces.find((item) => item.id === id)?.name ||
                      "Espacio"}
                  </span>
                ))}
                {material.covered_by_payment_id && (
                  <span
                    className={`tag${isAdditionalMaterial(data, material) ? " danger" : " teal"}`}
                  >
                    {isAdditionalMaterial(data, material)
                      ? "Pago archivado: gasto adicional"
                      : "Incluido en pago"}
                  </span>
                )}
              </div>
              {(material.work_item_id || material.contractor_id) && (
                <p className="material-linked">
                  {material.work_item_id &&
                    data.works.find((item) => item.id === material.work_item_id)
                      ?.name}
                  {material.work_item_id && material.contractor_id && " · "}
                  {material.contractor_id &&
                    data.contractors.find(
                      (item) => item.id === material.contractor_id,
                    )?.name}
                </p>
              )}
            </div>
            <div className="material-money">
              <strong>{money(material.amount_cents)}</strong>
              <div className="row-actions">
                <button
                  className="attachment-button"
                  aria-label={`Comprobantes de ${material.description}`}
                  onClick={() =>
                    attachments(
                      "material",
                      material.id,
                      `Comprobantes · ${material.description}`,
                    )
                  }
                >
                  <Icon name="file" size={17} />
                  <span>
                    {
                      data.attachments.filter(
                        (item) =>
                          !item.archived_at && item.material_id === material.id,
                      ).length
                    }
                  </span>
                </button>
                {admin && (
                  <>
                    <button
                      className="icon-button"
                      aria-label={`Editar ${material.description}`}
                      onClick={() =>
                        edit("material_purchases", { ...material })
                      }
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Archivar ${material.description}`}
                      onClick={() =>
                        archive(
                          "material_purchases",
                          material.id,
                          material.description,
                        )
                      }
                    >
                      <Icon name="archive" size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
