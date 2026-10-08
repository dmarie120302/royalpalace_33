"use client";

import { useState } from "react";
import type { Catalog, Resource } from "@/domain/types";
import { money } from "@/domain/finance";
import { Icon } from "@/components/icons";
import { Empty, Progress } from "@/components/ui";
import { matches, type ViewProps } from "./view-types";

export function ContractorsView({
  data,
  project,
  query,
  admin,
  edit,
  archive,
  invite,
}: ViewProps) {
  const contractors = data.contractors.filter(
    (item) =>
      item.project_id === project.id &&
      !item.archived_at &&
      matches(query, item.name, item.trade, item.email),
  );
  if (!contractors.length)
    return (
      <Empty
        title={
          query
            ? "No hay contratistas con esa búsqueda"
            : "Un equipo para esta obra"
        }
        description="Agrega contratistas, asigna sus trabajos e invítalos a consultar su cronograma y pagos."
        action={
          admin &&
          !query && (
            <button className="button" onClick={() => edit("contractors")}>
              <Icon name="plus" />
              Nuevo contratista
            </button>
          )
        }
      />
    );
  return (
    <div className="contractors-grid">
      {contractors.map((contractor) => {
        const works = data.works.filter(
          (work) =>
            work.project_id === project.id &&
            !work.archived_at &&
            work.assignments.some(
              (item) => item.contractor_id === contractor.id,
            ),
        );
        const allocated = works.reduce(
          (sum, work) =>
            sum +
            (work.assignments.find(
              (item) => item.contractor_id === contractor.id,
            )?.allocation_cents || 0),
          0,
        );
        const paid = data.payments
          .filter(
            (payment) =>
              payment.contractor_id === contractor.id && !payment.archived_at,
          )
          .reduce((sum, payment) => sum + payment.amount_cents, 0);
        return (
          <article className="panel contractor-card" key={contractor.id}>
            <div className="contractor-header">
              <div className="avatar" style={{ background: contractor.color }}>
                {contractor.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2>{contractor.name}</h2>
                <p>{contractor.trade || "Oficio por definir"}</p>
              </div>
              {admin && (
                <div className="row-actions">
                  <button
                    className="icon-button"
                    aria-label={`Editar ${contractor.name}`}
                    onClick={() => edit("contractors", { ...contractor })}
                  >
                    <Icon name="edit" size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Archivar ${contractor.name}`}
                    onClick={() =>
                      archive("contractors", contractor.id, contractor.name)
                    }
                  >
                    <Icon name="archive" size={17} />
                  </button>
                </div>
              )}
            </div>
            <div className="contractor-contact">
              <span>{contractor.email || "Sin correo electrónico"}</span>
              <span>{contractor.phone || "Sin teléfono"}</span>
            </div>
            <div className="contractor-finances">
              <div>
                <span>Asignado</span>
                <strong>{money(allocated)}</strong>
              </div>
              <div>
                <span>Pagado</span>
                <strong>{money(paid)}</strong>
              </div>
              <div>
                <span>Trabajos</span>
                <strong>{works.length}</strong>
              </div>
            </div>
            <div className="contractor-access">
              <span className={`tag${contractor.user_id ? " teal" : ""}`}>
                {contractor.user_id
                  ? "Acceso vinculado"
                  : "Sin acceso vinculado"}
              </span>
              {admin && (
                <button
                  className="text-button"
                  disabled={!contractor.email}
                  onClick={() => invite(contractor.id)}
                >
                  {contractor.user_id ? "Reenviar acceso" : "Invitar al portal"}
                  <Icon name="arrow" size={15} />
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
export function CatalogsView(props: ViewProps) {
  const { data, project, admin, edit, query, archive } = props;
  const [tab, setTab] = useState<
    "spaces" | "phases" | "categories" | "archived"
  >("spaces");
  const tabs = [
    { id: "spaces", name: "Espacios" },
    { id: "phases", name: "Fases" },
    { id: "categories", name: "Categorías" },
    { id: "archived", name: "Archivados" },
  ] as const;
  const singular = {
    spaces: "espacio",
    phases: "fase",
    categories: "categoría",
  };
  const records: Catalog[] =
    tab === "spaces"
      ? data.spaces
      : tab === "phases"
        ? data.phases
        : tab === "categories"
          ? data.categories
          : [];
  const visible = records.filter(
    (item) =>
      item.project_id === project.id &&
      !item.archived_at &&
      matches(query, item.name),
  );
  return (
    <>
      <div className="catalog-toolbar">
        <div
          className="segmented"
          role="tablist"
          aria-label="Organización de la obra"
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        {admin && tab !== "archived" && (
          <button className="button secondary" onClick={() => edit(tab)}>
            <Icon name="plus" size={17} />
            {tab === "spaces" ? "Nuevo" : "Nueva"} {singular[tab]}
          </button>
        )}
      </div>
      {tab === "archived" ? (
        <ArchivedView {...props} />
      ) : !visible.length ? (
        <Empty
          title={
            query
              ? "No hay resultados"
              : `Organiza tus ${tabs.find((item) => item.id === tab)?.name.toLowerCase()}`
          }
          description={
            tab === "spaces"
              ? "Define los ambientes o zonas en los que se ejecutarán los trabajos."
              : tab === "phases"
                ? "Agrupa trabajos por etapas para entender el avance de la obra."
                : "Clasifica las compras para consultar en qué se utilizan los materiales."
          }
        />
      ) : (
        <div className="catalog-grid">
          {visible.map((item) => {
            const works = data.works.filter(
              (work) =>
                work.project_id === project.id &&
                !work.archived_at &&
                (tab === "phases"
                  ? work.phase_id === item.id
                  : tab === "spaces"
                    ? work.space_ids.includes(item.id)
                    : false),
            );
            const materials = data.materials.filter(
              (material) =>
                material.project_id === project.id &&
                !material.archived_at &&
                (tab === "phases"
                  ? material.phase_id === item.id
                  : tab === "spaces"
                    ? material.space_ids.includes(item.id)
                    : material.category_id === item.id),
            );
            return (
              <article className="panel catalog-card" key={item.id}>
                <div className="catalog-heading">
                  <span
                    className="catalog-dot"
                    style={{ background: item.color }}
                  />
                  <h2>{item.name}</h2>
                  {admin && (
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        aria-label={`Editar ${item.name}`}
                        onClick={() => edit(tab, { ...item })}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Archivar ${item.name}`}
                        onClick={() => archive(tab, item.id, item.name)}
                      >
                        <Icon name="archive" size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="muted">
                  {tab !== "categories" && `${works.length} trabajos · `}
                  {materials.length} compras de materiales
                </p>
                {tab === "phases" && (
                  <Progress
                    value={
                      works.length
                        ? works.reduce((sum, work) => sum + work.progress, 0) /
                          works.length
                        : 0
                    }
                    label="Avance físico promedio"
                    tone="teal"
                  />
                )}
                {tab === "categories" && (
                  <div className="catalog-amount">
                    <span>Compras registradas</span>
                    <strong>
                      {money(
                        materials.reduce(
                          (sum, material) => sum + material.amount_cents,
                          0,
                        ),
                      )}
                    </strong>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
function ArchivedView({ data, project, query, archive, admin }: ViewProps) {
  const groups: {
    resource: Resource;
    label: string;
    records: {
      id: string;
      project_id: string;
      archived_at: string | null;
      name?: string;
      description?: string;
      amount_cents?: number;
    }[];
  }[] = [
    { resource: "work_items", label: "Trabajo", records: data.works },
    { resource: "payments", label: "Pago", records: data.payments },
    {
      resource: "material_purchases",
      label: "Material",
      records: data.materials,
    },
    {
      resource: "contractors",
      label: "Contratista",
      records: data.contractors,
    },
    { resource: "spaces", label: "Espacio", records: data.spaces },
    { resource: "phases", label: "Fase", records: data.phases },
    { resource: "categories", label: "Categoría", records: data.categories },
  ];
  const rows = groups
    .flatMap((group) =>
      group.records
        .filter((item) => item.project_id === project.id && item.archived_at)
        .map((item) => ({
          ...item,
          resource: group.resource,
          label: group.label,
          title:
            item.name ||
            item.description ||
            (item.amount_cents
              ? `Pago de ${money(item.amount_cents)}`
              : group.label),
        })),
    )
    .filter((item) => matches(query, item.title, item.label));
  return !rows.length ? (
    <Empty
      title="No hay registros archivados"
      description="Los registros archivados conservan su historial y pueden recuperarse."
    />
  ) : (
    <section className="panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Registro</th>
              <th>Tipo</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.label}</td>
                <td className="numeric">
                  {admin && (
                    <button
                      className="text-button"
                      aria-label={`Recuperar ${item.title}`}
                      onClick={() =>
                        archive(item.resource, item.id, item.title, false)
                      }
                    >
                      Recuperar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
