"use client";

import { useState, type FormEvent } from "react";
import type { MutationInput, Resource, Workspace } from "@/domain/types";
import { money, toCents, today } from "@/domain/finance";
import { ErrorBox, Field, Modal } from "@/components/ui";

export interface EditorTarget {
  resource: Resource;
  record?: MutationInput;
}
const titles: Record<Resource, string> = {
  projects: "obra",
  work_items: "trabajo",
  payments: "pago",
  material_purchases: "compra de materiales",
  contractors: "contratista",
  spaces: "espacio",
  phases: "fase",
  categories: "categoría",
};
const asString = (value: unknown) => (typeof value === "string" ? value : "");
const asArray = (value: unknown) =>
  Array.isArray(value) ? (value as string[]) : [];
const amountText = (value: unknown) =>
  typeof value === "number" ? (value / 100).toFixed(2) : "";

function Multiple({
  name,
  options,
  selected,
  onChange,
}: {
  name: string;
  options: { id: string; name: string; archived_at: string | null }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const visible = options.filter(
    (item) => !item.archived_at || selected.includes(item.id),
  );
  return (
    <fieldset className="multiple-field full">
      <legend>{name}</legend>
      <div className="checkbox-options">
        {visible.length ? (
          visible.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, item.id]
                      : selected.filter((id) => id !== item.id),
                  )
                }
              />
              <span>
                {item.name}
                {item.archived_at ? " (archivado)" : ""}
              </span>
            </label>
          ))
        ) : (
          <p className="muted">
            Aún no hay opciones. Puedes crearlas en Organización.
          </p>
        )}
      </div>
    </fieldset>
  );
}
export function EntityForm({
  target,
  projectId,
  data,
  onSave,
  onClose,
}: {
  target: EditorTarget;
  projectId: string | null;
  data: Workspace;
  onSave: (resource: Resource, input: MutationInput) => Promise<string>;
  onClose: () => void;
}) {
  const { resource, record = {} } = target;
  const [values, setValues] = useState<Record<string, string>>(() => ({
    name: asString(record.name),
    description: asString(record.description),
    location: asString(record.location),
    budget: amountText(record.budget_cents) || "0.00",
    amount: amountText(record.amount_cents),
    start_date: asString(record.start_date),
    end_date: asString(record.end_date),
    date: asString(record.date) || today(),
    status:
      asString(record.status) ||
      (resource === "projects" ? "planning" : "pending"),
    progress: String(record.progress ?? 0),
    phase_id: asString(record.phase_id),
    contractor_id: asString(record.contractor_id),
    work_item_id: asString(record.work_item_id),
    category_id: asString(record.category_id),
    covered_by_payment_id: asString(record.covered_by_payment_id),
    color: asString(record.color) || "#514ac8",
    trade: asString(record.trade),
    phone: asString(record.phone),
    email: asString(record.email),
    method: asString(record.method) || "Transferencia",
    store: asString(record.store),
    quantity: asString(record.quantity),
  }));
  const [spaces, setSpaces] = useState(asArray(record.space_ids));
  const existingAssignments = Array.isArray(record.assignments)
    ? (record.assignments as {
        contractor_id: string;
        allocation_cents: number;
      }[])
    : [];
  const [assignments, setAssignments] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      existingAssignments.map((item) => [
        item.contractor_id,
        amountText(item.allocation_cents),
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const local = <T extends { project_id: string }>(items: T[]) =>
    items.filter((item) => item.project_id === projectId);
  const works = local(data.works).filter(
    (item) => !item.archived_at || item.id === values.work_item_id,
  );
  const selectedWork = works.find((item) => item.id === values.work_item_id);
  const contractors = local(data.contractors).filter(
    (item) =>
      !item.archived_at ||
      item.id === values.contractor_id ||
      item.id in assignments,
  );
  const paymentContractors = contractors.filter((item) =>
    selectedWork?.assignments.some(
      (assignment) => assignment.contractor_id === item.id,
    ),
  );
  const change = (key: string, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  function input(
    key: string,
    options: {
      required?: boolean;
      type?: string;
      placeholder?: string;
      maxLength?: number;
    } = {},
  ) {
    return (
      <input
        name={key}
        value={values[key]}
        onChange={(event) => change(key, event.target.value)}
        type={options.type || "text"}
        required={options.required}
        placeholder={options.placeholder}
        maxLength={options.maxLength || 160}
        {...(options.type === "email" ? { autoComplete: "email" } : {})}
      />
    );
  }
  function amount(key: "budget" | "amount") {
    return (
      <div className="amount-input">
        <span>$</span>
        <input
          name={key}
          inputMode="decimal"
          value={values[key]}
          onChange={(event) => change(key, event.target.value)}
          required
          placeholder="0.00"
        />
      </div>
    );
  }
  function select(
    key: string,
    options: { id: string; name: string }[],
    blank?: string,
  ) {
    return (
      <select
        name={key}
        value={values[key]}
        required={!blank}
        onChange={(event) => {
          change(key, event.target.value);
          if (key === "covered_by_payment_id" && event.target.value) {
            const payment = data.payments.find(
              (item) => item.id === event.target.value,
            );
            if (payment) {
              change("work_item_id", payment.work_item_id);
              change("contractor_id", payment.contractor_id);
            }
          }
          if (key === "contractor_id" && resource === "material_purchases")
            change("covered_by_payment_id", "");
          if (
            key === "status" &&
            resource === "work_items" &&
            event.target.value === "completed"
          )
            change("progress", "100");
          if (key === "work_item_id") {
            change("contractor_id", "");
            change("covered_by_payment_id", "");
          }
        }}
      >
        <option value="">{blank || "Selecciona una opción"}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const input: MutationInput = record.id ? { id: record.id } : {};
      if (resource !== "projects") input.project_id = projectId;
      if (
        [
          "projects",
          "work_items",
          "contractors",
          "spaces",
          "phases",
          "categories",
        ].includes(resource)
      ) {
        if (!values.name.trim())
          throw new Error("Escribe un nombre para este registro.");
        input.name = values.name.trim();
      }
      if (["projects", "work_items"].includes(resource)) {
        if (
          values.start_date &&
          values.end_date &&
          values.end_date < values.start_date
        )
          throw new Error(
            "La fecha de fin debe ser igual o posterior al inicio.",
          );
        Object.assign(input, {
          description: values.description.trim(),
          budget_cents: toCents(values.budget),
          start_date: values.start_date || null,
          end_date: values.end_date || null,
          status: values.status,
        });
      }
      if (resource === "projects") input.location = values.location.trim();
      if (resource === "work_items") {
        const progress = Number(values.progress);
        if (!Number.isInteger(progress) || progress < 0 || progress > 100)
          throw new Error(
            "El avance físico debe ser un número entero entre 0 y 100.",
          );
        if (values.status === "completed" && progress !== 100)
          throw new Error(
            "Un trabajo completado debe tener un avance físico de 100%.",
          );
        const split = Object.entries(assignments).map(
          ([contractor_id, allocation]) => ({
            contractor_id,
            allocation_cents: toCents(allocation),
          }),
        );
        if (
          split.reduce((sum, item) => sum + item.allocation_cents, 0) >
          Number(input.budget_cents)
        )
          throw new Error(
            "La suma asignada a contratistas excede el presupuesto del trabajo.",
          );
        Object.assign(input, {
          progress,
          phase_id: values.phase_id || null,
          space_ids: spaces,
          assignments: split,
        });
      }
      if (["payments", "material_purchases"].includes(resource)) {
        const cents = toCents(values.amount);
        if (cents <= 0) throw new Error("El monto debe ser mayor que cero.");
        Object.assign(input, {
          amount_cents: cents,
          date: values.date,
          description: values.description.trim(),
        });
      }
      if (resource === "payments")
        Object.assign(input, {
          work_item_id: values.work_item_id,
          contractor_id: values.contractor_id,
          method: values.method.trim(),
        });
      if (resource === "material_purchases")
        Object.assign(input, {
          work_item_id: values.work_item_id || null,
          contractor_id: values.contractor_id || null,
          phase_id: values.phase_id || null,
          category_id: values.category_id || null,
          covered_by_payment_id: values.covered_by_payment_id || null,
          space_ids: spaces,
          store: values.store.trim(),
          quantity: values.quantity.trim(),
        });
      if (["spaces", "phases", "categories", "contractors"].includes(resource))
        input.color = values.color;
      if (resource === "phases") input.space_ids = spaces;
      if (resource === "contractors")
        Object.assign(input, {
          trade: values.trade.trim(),
          phone: values.phone.trim(),
          email: values.email.trim().toLowerCase(),
        });
      await onSave(resource, input);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar el registro.",
      );
    } finally {
      setBusy(false);
    }
  }
  const descriptions = (
    <Field label="Descripción" wide>
      <textarea
        name="description"
        rows={3}
        required={resource === "payments"}
        maxLength={resource === "payments" ? 160 : 2000}
        value={values.description}
        onChange={(event) => change("description", event.target.value)}
      />
    </Field>
  );
  const dates = (
    <>
      <Field label="Fecha de inicio">
        {input("start_date", { type: "date" })}
      </Field>
      <Field label="Fecha de entrega">
        {input("end_date", { type: "date" })}
      </Field>
    </>
  );
  const phaseField = (
    <Field label="Fase">
      {select(
        "phase_id",
        local(data.phases).filter(
          (item) => !item.archived_at || item.id === values.phase_id,
        ),
        "Sin fase",
      )}
    </Field>
  );
  return (
    <Modal
      title={`${record.id ? "Editar" : resource === "phases" || resource === "categories" || resource === "projects" || resource === "material_purchases" ? "Nueva" : "Nuevo"} ${titles[resource]}`}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit} className="entity-form">
        <div className="form-grid">
          {!["payments", "material_purchases"].includes(resource) && (
            <Field
              label={`Nombre ${resource === "projects" ? "de la obra" : resource === "work_items" ? "del trabajo" : ""}`}
              wide
            >
              {input("name", {
                required: true,
                placeholder:
                  resource === "projects" ? "Nombre del proyecto" : "Nombre",
                maxLength: 160,
              })}
            </Field>
          )}
          {resource === "projects" && (
            <>
              <Field label="Ubicación" wide>
                {input("location", {
                  placeholder: "Dirección o referencia",
                  maxLength: 300,
                })}
              </Field>
              {descriptions}
              <Field label="Presupuesto de la obra">{amount("budget")}</Field>
              <Field label="Estado">
                {select("status", [
                  { id: "planning", name: "En planificación" },
                  { id: "active", name: "En ejecución" },
                  { id: "paused", name: "Pausada" },
                  { id: "completed", name: "Completada" },
                ])}
              </Field>
              {dates}
            </>
          )}
          {resource === "work_items" && (
            <>
              {descriptions}
              <Field label="Presupuesto del trabajo">{amount("budget")}</Field>
              <Field label="Estado">
                {select("status", [
                  { id: "pending", name: "Pendiente" },
                  { id: "in_progress", name: "En ejecución" },
                  { id: "blocked", name: "Bloqueado" },
                  { id: "completed", name: "Completado" },
                ])}
              </Field>
              {dates}
              {phaseField}
              <Field
                label="Avance físico (%)"
                hint="Trabajo ejecutado, independiente de los pagos."
              >
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  required
                  value={values.progress}
                  onChange={(event) => change("progress", event.target.value)}
                />
              </Field>
              <Multiple
                name="Espacios"
                options={local(data.spaces)}
                selected={spaces}
                onChange={setSpaces}
              />
              <fieldset className="multiple-field full">
                <legend>Contratistas y monto asignado</legend>
                <p className="muted">
                  Reparte el presupuesto según lo acordado con cada contratista.
                </p>
                {contractors.length ? (
                  contractors.map((contractor) => (
                    <div className="assignment-row" key={contractor.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={contractor.id in assignments}
                          onChange={(event) =>
                            setAssignments((previous) => {
                              const next = { ...previous };
                              if (event.target.checked)
                                next[contractor.id] = "0.00";
                              else delete next[contractor.id];
                              return next;
                            })
                          }
                        />
                        {contractor.name}
                      </label>
                      {contractor.id in assignments && (
                        <div className="amount-input">
                          <span>$</span>
                          <input
                            required
                            inputMode="decimal"
                            aria-label={`Monto asignado a ${contractor.name}`}
                            value={assignments[contractor.id]}
                            onChange={(event) =>
                              setAssignments((previous) => ({
                                ...previous,
                                [contractor.id]: event.target.value,
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    Agrega contratistas para asignar este trabajo.
                  </p>
                )}
              </fieldset>
            </>
          )}
          {resource === "payments" && (
            <>
              <Field label="Trabajo" wide>
                {select("work_item_id", works)}
              </Field>
              <Field
                label="Beneficiario"
                wide
                hint="Elige el contratista que recibió este pago."
              >
                {select("contractor_id", paymentContractors)}
              </Field>
              {selectedWork && !paymentContractors.length && (
                <p className="form-error full">
                  Asigna un contratista al trabajo antes de registrar el pago.
                </p>
              )}
              <Field label="Monto pagado">{amount("amount")}</Field>
              <Field label="Fecha del pago">
                {input("date", { type: "date", required: true })}
              </Field>
              <Field label="Medio de pago" wide>
                {input("method", { required: true, maxLength: 60 })}
              </Field>
              {descriptions}
            </>
          )}
          {resource === "material_purchases" && (
            <>
              <Field label="Qué compraste" wide>
                {input("description", {
                  required: true,
                  placeholder: "Material o producto",
                })}
              </Field>
              <Field label="Tienda / proveedor">
                {input("store", { required: true })}
              </Field>
              <Field label="Cantidad">
                {input("quantity", {
                  placeholder: "Ej. 3 rollos de 100 m",
                  maxLength: 120,
                })}
              </Field>
              <Field label="Monto de la compra">{amount("amount")}</Field>
              <Field label="Fecha">
                {input("date", { type: "date", required: true })}
              </Field>
              <Field label="Trabajo">
                {select("work_item_id", works, "Sin trabajo")}
              </Field>
              <Field label="Contratista">
                {select("contractor_id", contractors, "Sin contratista")}
              </Field>
              {phaseField}
              <Field label="Categoría">
                {select(
                  "category_id",
                  local(data.categories).filter(
                    (item) =>
                      !item.archived_at || item.id === values.category_id,
                  ),
                  "Sin categoría",
                )}
              </Field>
              <Multiple
                name="Espacios"
                options={local(data.spaces)}
                selected={spaces}
                onChange={setSpaces}
              />
              <Field
                label="¿Esta compra ya está incluida en un pago?"
                wide
                hint="Las compras vinculadas a un pago se contabilizan una sola vez."
              >
                {select(
                  "covered_by_payment_id",
                  local(data.payments)
                    .filter(
                      (item) =>
                        (!item.archived_at ||
                          item.id === record.covered_by_payment_id) &&
                        (!values.work_item_id ||
                          item.work_item_id === values.work_item_id) &&
                        (!values.contractor_id ||
                          item.contractor_id === values.contractor_id),
                    )
                    .map((item) => ({
                      id: item.id,
                      name: `${item.date} · ${money(item.amount_cents)} · ${data.contractors.find((c) => c.id === item.contractor_id)?.name || "Contratista"}${item.archived_at ? " (pago archivado, vínculo histórico)" : ""}`,
                    })),
                  "No, es un gasto adicional",
                )}
              </Field>
            </>
          )}
          {resource === "contractors" && (
            <>
              <Field label="Oficio / especialidad">
                {input("trade", {
                  placeholder: "Ej. Electricidad",
                  maxLength: 120,
                })}
              </Field>
              <Field label="Teléfono">
                {input("phone", { type: "tel", maxLength: 40 })}
              </Field>
              <Field label="Correo para invitar al portal" wide>
                {input("email", { type: "email" })}
              </Field>
            </>
          )}
          {["spaces", "phases", "categories", "contractors"].includes(
            resource,
          ) && (
            <Field label="Color de identificación">
              <input
                className="color-input"
                type="color"
                value={values.color}
                onChange={(event) => change("color", event.target.value)}
              />
            </Field>
          )}
          {resource === "phases" && (
            <Multiple
              name="Espacios de esta fase"
              options={local(data.spaces)}
              selected={spaces}
              onChange={setSpaces}
            />
          )}
        </div>
        {error && <ErrorBox message={error} />}
        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="button" type="submit" disabled={busy}>
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
