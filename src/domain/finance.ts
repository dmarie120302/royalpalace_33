import type { Workspace, WorkItem, MaterialPurchase } from "./types";
export const money = (cents: number) =>
  new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export function toCents(value: string): number {
  const text = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text))
    throw new Error("Escribe un monto positivo con hasta dos decimales.");
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 999999999999)
    throw new Error("El monto está fuera del rango permitido.");
  return cents;
}
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Panama",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const paidForWork = (data: Workspace, id: string) =>
  data.payments
    .filter((p) => p.work_item_id === id && !p.archived_at)
    .reduce((sum, p) => sum + p.amount_cents, 0);
export const workBudget = (data: Workspace, work: WorkItem) =>
  data.roles[work.project_id] === "contractor"
    ? work.assignments
        .filter((a) =>
          data.contractors.some(
            (c) => c.id === a.contractor_id && c.user_id === data.user.id,
          ),
        )
        .reduce((sum, a) => sum + a.allocation_cents, 0)
    : work.budget_cents;
export const isAdditionalMaterial = (
  data: Workspace,
  material: MaterialPurchase,
) =>
  !material.covered_by_payment_id ||
  !data.payments.some(
    (p) => p.id === material.covered_by_payment_id && !p.archived_at,
  );
export function projectSummary(data: Workspace, projectId: string) {
  const history = data.works.filter((w) => w.project_id === projectId);
  const works = history.filter((w) => !w.archived_at);
  const paid = data.payments
    .filter((p) => p.project_id === projectId && !p.archived_at)
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const materials = data.materials
    .filter(
      (m) =>
        m.project_id === projectId &&
        !m.archived_at &&
        isAdditionalMaterial(data, m),
    )
    .reduce((sum, m) => sum + m.amount_cents, 0);
  const committed = history.reduce((sum, w) => sum + workBudget(data, w), 0);
  const pending = history.reduce(
    (sum, w) =>
      sum + Math.max(0, workBudget(data, w) - paidForWork(data, w.id)),
    0,
  );
  const overpaid = history.reduce(
    (sum, w) =>
      sum + Math.max(0, paidForWork(data, w.id) - workBudget(data, w)),
    0,
  );
  const physicalProgress = works.length
    ? Math.round(works.reduce((sum, w) => sum + w.progress, 0) / works.length)
    : 0;
  return {
    works: works.length,
    committed,
    paid,
    materials,
    spent: paid + materials,
    pending,
    overpaid,
    physicalProgress,
    delayed: works.filter(isDelayed).length,
  };
}
export const isDelayed = (work: WorkItem) =>
  !!work.end_date && work.end_date < today() && work.status !== "completed";
