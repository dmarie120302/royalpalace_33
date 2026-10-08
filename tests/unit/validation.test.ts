import { describe, expect, it } from "vitest";
import { resourceFrom, schemas } from "../../src/domain/validation";

const project_id = "7dd61550-5ad3-4f23-962e-721aa6109eef";
const work_item_id = "d0d00bac-e68d-47b2-8615-a6a287cbe7cf";
const contractor_id = "d0402829-aab4-4d0d-ae70-bf4036efc33d";
const work = {
  project_id,
  name: "Pintura",
  budget_cents: 10_000,
  status: "in_progress",
  progress: 20,
};
const payment = {
  project_id,
  work_item_id,
  contractor_id,
  amount_cents: 2_500,
  date: "2026-10-08",
  description: "Anticipo",
};

describe("datos financieros recibidos por la API", () => {
  it.each([
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    1_000_000_000_000,
  ])("rechaza pagos inválidos en centavos: %s", (amount_cents) => {
    expect(
      schemas.payments.safeParse({ ...payment, amount_cents }).success,
    ).toBe(false);
  });

  it("no acepta un propietario ni un usuario privilegiado enviado por el navegador", () => {
    expect(
      schemas.projects.safeParse({
        name: "Obra",
        budget_cents: 0,
        owner_id: project_id,
      }).success,
    ).toBe(false);
    expect(
      schemas.contractors.safeParse({
        project_id,
        name: "Contratista",
        user_id: contractor_id,
      }).success,
    ).toBe(false);
    expect(
      schemas.payments.safeParse({
        ...payment,
        archived_at: "2026-10-08T00:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("rechaza fechas imposibles y rangos de obra invertidos", () => {
    expect(
      schemas.payments.safeParse({ ...payment, date: "2026-02-30" }).success,
    ).toBe(false);
    expect(
      schemas.projects.safeParse({
        name: "Obra",
        budget_cents: 0,
        start_date: "2026-10-09",
        end_date: "2026-10-08",
      }).success,
    ).toBe(false);
    expect(
      schemas.work_items.safeParse({
        ...work,
        start_date: "2026-10-09",
        end_date: "2026-10-08",
      }).success,
    ).toBe(false);
  });
});

describe("asignaciones y avance de trabajos", () => {
  it("acepta un reparto explícito hasta el presupuesto exacto", () => {
    const assignments = [{ contractor_id, allocation_cents: 10_000 }];
    expect(
      schemas.work_items.parse({ ...work, assignments }).assignments,
    ).toEqual(assignments);
  });

  it("rechaza repartir más del presupuesto o repetir un contratista", () => {
    expect(
      schemas.work_items.safeParse({
        ...work,
        assignments: [{ contractor_id, allocation_cents: 10_001 }],
      }).success,
    ).toBe(false);
    expect(
      schemas.work_items.safeParse({
        ...work,
        assignments: [
          { contractor_id, allocation_cents: 5_000 },
          { contractor_id, allocation_cents: 5_000 },
        ],
      }).success,
    ).toBe(false);
  });

  it("impide terminar un trabajo con menos de 100% de avance", () => {
    expect(
      schemas.work_items.safeParse({
        ...work,
        status: "completed",
        progress: 99,
      }).success,
    ).toBe(false);
    expect(
      schemas.work_items.safeParse({
        ...work,
        status: "completed",
        progress: 100,
      }).success,
    ).toBe(true);
  });

  it.each([-1, 101, 20.5])(
    "rechaza un avance físico fuera de rango: %s",
    (progress) => {
      expect(schemas.work_items.safeParse({ ...work, progress }).success).toBe(
        false,
      );
    },
  );

  it("rechaza espacios duplicados para no repetir relaciones", () => {
    expect(
      schemas.work_items.safeParse({
        ...work,
        space_ids: [project_id, project_id],
      }).success,
    ).toBe(false);
  });
});

describe("recursos permitidos", () => {
  it.each([
    "profiles",
    "project_members",
    "audit_events",
    "__proto__",
    "constructor",
  ])("rechaza el recurso %s", (resource) => {
    expect(() => resourceFrom(resource)).toThrow("Recurso desconocido.");
  });

  it("admite un recurso declarado explícitamente", () => {
    expect(resourceFrom("material_purchases")).toBe("material_purchases");
  });
});
