import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isDelayed,
  paidForWork,
  projectSummary,
  toCents,
  today,
  workBudget,
} from "../../src/domain/finance";
import type {
  MaterialPurchase,
  Payment,
  Project,
  WorkItem,
  Workspace,
} from "../../src/domain/types";

const entity = { created_at: "2026-10-01T12:00:00Z", archived_at: null };

function project(id = "obra-a"): Project {
  return {
    ...entity,
    id,
    owner_id: "administrador",
    name: id,
    location: "Panamá",
    description: "",
    budget_cents: 100_000,
    start_date: null,
    end_date: null,
    status: "active",
  };
}

function work(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    ...entity,
    id: "trabajo-a",
    project_id: "obra-a",
    name: "Pintura",
    description: "",
    phase_id: null,
    budget_cents: 100_000,
    start_date: null,
    end_date: null,
    status: "pending",
    progress: 0,
    space_ids: [],
    assignments: [],
    ...overrides,
  };
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    ...entity,
    id: "pago-a",
    project_id: "obra-a",
    work_item_id: "trabajo-a",
    contractor_id: "contratista-a",
    amount_cents: 50_000,
    date: "2026-10-08",
    description: "Anticipo",
    method: "Transferencia",
    ...overrides,
  };
}

function material(overrides: Partial<MaterialPurchase> = {}): MaterialPurchase {
  return {
    ...entity,
    id: "material-a",
    project_id: "obra-a",
    work_item_id: "trabajo-a",
    contractor_id: null,
    phase_id: null,
    category_id: null,
    covered_by_payment_id: null,
    space_ids: [],
    amount_cents: 10_000,
    date: "2026-10-08",
    store: "Ferretería",
    description: "Pintura",
    quantity: "1",
    ...overrides,
  };
}

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    user: {
      id: "administrador",
      email: "test@example.invalid",
      name: "Administración",
    },
    projects: [project()],
    roles: { "obra-a": "admin" },
    spaces: [],
    phases: [],
    categories: [],
    contractors: [],
    works: [],
    payments: [],
    materials: [],
    attachments: [],
    audit: [],
    ...overrides,
  };
}

afterEach(() => vi.useRealTimers());

describe("montos en centavos", () => {
  it.each([
    ["0", 0],
    ["0.01", 1],
    ["0.10", 10],
    ["1.2", 120],
    ["29.90", 2990],
    ["  1000.05  ", 100005],
    ["9999999999.99", 999999999999],
  ])("convierte %s sin redondear decimales", (input, expected) => {
    expect(toCents(input)).toBe(expected);
  });

  it.each([
    "",
    "-0.01",
    "1.001",
    "1,25",
    "1e3",
    "NaN",
    "Infinity",
    "12abc",
    ".50",
    "10000000000.00",
    "9007199254740991",
  ])("rechaza %s", (input) => {
    expect(() => toCents(input)).toThrow();
  });

  it("suma diez pagos de diez centavos como un dólar exacto", () => {
    const data = workspace({
      payments: Array.from({ length: 10 }, (_, index) =>
        payment({ id: `pago-${index}`, amount_cents: toCents("0.10") }),
      ),
    });
    expect(paidForWork(data, "trabajo-a")).toBe(100);
  });
});

describe("resumen financiero de cada obra", () => {
  it("cuenta una compra cubierta por un pago una sola vez", () => {
    const data = workspace({
      works: [work()],
      payments: [payment()],
      materials: [
        material({ covered_by_payment_id: "pago-a", amount_cents: 20_000 }),
        material({ id: "material-b", amount_cents: 8_550 }),
      ],
    });
    expect(projectSummary(data, "obra-a")).toMatchObject({
      committed: 100_000,
      paid: 50_000,
      materials: 8_550,
      spent: 58_550,
      pending: 50_000,
      overpaid: 0,
    });
  });

  it("incluye la compra si su pago se archiva y evita duplicarla al recuperarlo", () => {
    const data = workspace({
      works: [work()],
      payments: [payment({ archived_at: "2026-10-08T12:00:00Z" })],
      materials: [
        material({ covered_by_payment_id: "pago-a", amount_cents: 20_000 }),
      ],
    });
    expect(projectSummary(data, "obra-a")).toMatchObject({
      paid: 0,
      materials: 20_000,
      spent: 20_000,
    });
    const restored = workspace({ ...data, payments: [payment()] });
    expect(projectSummary(restored, "obra-a")).toMatchObject({
      paid: 50_000,
      materials: 0,
      spent: 50_000,
    });
  });

  it("no omite una compra si el pago vinculado no existe en los datos autorizados", () => {
    const data = workspace({
      materials: [material({ covered_by_payment_id: "pago-no-disponible" })],
    });
    expect(projectSummary(data, "obra-a")).toMatchObject({
      paid: 0,
      materials: 10_000,
      spent: 10_000,
    });
  });

  it("aísla cada obra y excluye movimientos archivados conservando el presupuesto histórico", () => {
    const archived_at = "2026-10-08T10:00:00Z";
    const data = workspace({
      projects: [project(), project("obra-b")],
      works: [
        work(),
        work({ id: "trabajo-b", project_id: "obra-b", budget_cents: 200_000 }),
        work({ id: "trabajo-archivado", archived_at, budget_cents: 800_000 }),
      ],
      payments: [
        payment(),
        payment({
          id: "pago-b",
          project_id: "obra-b",
          work_item_id: "trabajo-b",
          amount_cents: 200_000,
        }),
        payment({ id: "pago-archivado", archived_at, amount_cents: 700_000 }),
      ],
      materials: [
        material(),
        material({
          id: "material-b",
          project_id: "obra-b",
          amount_cents: 900_000,
        }),
        material({
          id: "material-archivado",
          archived_at,
          amount_cents: 400_000,
        }),
      ],
    });
    expect(projectSummary(data, "obra-a")).toMatchObject({
      works: 1,
      committed: 900_000,
      paid: 50_000,
      materials: 10_000,
      spent: 60_000,
    });
    expect(paidForWork(data, "trabajo-a")).toBe(50_000);
  });

  it("expone un excedente sin producir un saldo pendiente negativo", () => {
    const data = workspace({
      works: [work({ budget_cents: 10_000 })],
      payments: [payment({ amount_cents: 12_501 })],
    });
    expect(projectSummary(data, "obra-a")).toMatchObject({
      pending: 0,
      overpaid: 2_501,
      spent: 12_501,
    });
  });

  it("no compensa la deuda de un trabajo con el exceso pagado en otro", () => {
    const data = workspace({
      works: [
        work({ id: "trabajo-a", budget_cents: 10_000 }),
        work({ id: "trabajo-b", budget_cents: 20_000 }),
      ],
      payments: [
        payment({ amount_cents: 15_000 }),
        payment({
          id: "pago-b",
          work_item_id: "trabajo-b",
          amount_cents: 5_000,
        }),
      ],
    });
    expect(projectSummary(data, "obra-a")).toMatchObject({
      committed: 30_000,
      paid: 20_000,
      pending: 15_000,
      overpaid: 5_000,
    });
  });

  it("archivar y recuperar un trabajo conserva sus finanzas y cambia sólo su participación física", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T15:00:00Z"));
    const archivedWork = work({
      id: "trabajo-archivado",
      budget_cents: 60_000,
      progress: 90,
      end_date: "2026-10-07",
      status: "in_progress",
      archived_at: "2026-10-08T10:00:00Z",
    });
    const data = workspace({
      works: [
        work({ budget_cents: 40_000, progress: 25, end_date: "2026-10-07" }),
        archivedWork,
      ],
      payments: [
        payment({ amount_cents: 10_000 }),
        payment({
          id: "pago-archivado-trabajo",
          work_item_id: archivedWork.id,
          amount_cents: 60_000,
        }),
      ],
    });
    expect(projectSummary(data, "obra-a")).toMatchObject({
      works: 1,
      committed: 100_000,
      paid: 70_000,
      pending: 30_000,
      overpaid: 0,
      physicalProgress: 25,
      delayed: 1,
    });
    const restored = workspace({
      ...data,
      works: [data.works[0], { ...archivedWork, archived_at: null }],
    });
    expect(projectSummary(restored, "obra-a")).toMatchObject({
      works: 2,
      committed: 100_000,
      paid: 70_000,
      pending: 30_000,
      overpaid: 0,
      physicalProgress: 58,
      delayed: 2,
    });
  });

  it("mantiene el avance físico separado del dinero pagado", () => {
    const works = [
      work({ id: "trabajo-1", progress: 20 }),
      work({ id: "trabajo-2", progress: 80 }),
    ];
    const withoutPayments = projectSummary(workspace({ works }), "obra-a");
    const withPayments = projectSummary(
      workspace({
        works,
        payments: [
          payment({ work_item_id: "trabajo-1", amount_cents: 200_000 }),
        ],
      }),
      "obra-a",
    );
    expect(withoutPayments.physicalProgress).toBe(50);
    expect(withPayments.physicalProgress).toBe(50);
    expect(withoutPayments.paid).not.toBe(withPayments.paid);
  });

  it("muestra al contratista su asignación en un trabajo compartido", () => {
    const sharedWork = work({
      assignments: [
        {
          work_item_id: "trabajo-a",
          contractor_id: "contratista-a",
          allocation_cents: 40_000,
        },
        {
          work_item_id: "trabajo-a",
          contractor_id: "contratista-b",
          allocation_cents: 60_000,
        },
      ],
    });
    const data = workspace({
      user: {
        id: "usuario-contratista",
        email: "contratista@example.invalid",
        name: "Contratista",
      },
      roles: { "obra-a": "contractor" },
      contractors: [
        {
          ...entity,
          id: "contratista-a",
          project_id: "obra-a",
          name: "Contratista A",
          color: "#514ac8",
          trade: "Pintura",
          phone: "",
          email: "contratista@example.invalid",
          user_id: "usuario-contratista",
        },
      ],
      works: [sharedWork],
      payments: [payment({ amount_cents: 30_000 })],
    });
    expect(workBudget(data, sharedWork)).toBe(40_000);
    expect(projectSummary(data, "obra-a")).toMatchObject({
      committed: 40_000,
      paid: 30_000,
      pending: 10_000,
    });
  });

  it("no atribuye el presupuesto global a un contratista sin asignación propia", () => {
    const data = workspace({ roles: { "obra-a": "contractor" } });
    expect(workBudget(data, work())).toBe(0);
  });

  it("devuelve un resumen vacío para una obra sin movimientos", () => {
    expect(projectSummary(workspace(), "obra-a")).toEqual({
      works: 0,
      committed: 0,
      paid: 0,
      materials: 0,
      spent: 0,
      pending: 0,
      overpaid: 0,
      physicalProgress: 0,
      delayed: 0,
    });
  });
});

describe("cronograma y fecha de Panamá", () => {
  it("no cambia de día a medianoche UTC mientras en Panamá aún es el día anterior", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T03:30:00Z"));
    expect(today()).toBe("2026-10-08");
    expect(isDelayed(work({ end_date: "2026-10-08" }))).toBe(false);
  });

  it("marca fechas vencidas pendientes y excluye trabajos completados", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T15:00:00Z"));
    expect(
      isDelayed(
        work({ end_date: "2026-10-07", status: "in_progress", progress: 75 }),
      ),
    ).toBe(true);
    expect(
      isDelayed(
        work({ end_date: "2026-10-07", status: "completed", progress: 100 }),
      ),
    ).toBe(false);
    expect(isDelayed(work({ end_date: "2026-10-08" }))).toBe(false);
    expect(isDelayed(work({ end_date: null }))).toBe(false);
  });

  it("los anticipos pagados no eliminan un atraso físico", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T15:00:00Z"));
    const data = workspace({
      works: [
        work({ end_date: "2026-10-07", progress: 25, status: "in_progress" }),
      ],
      payments: [payment({ amount_cents: 100_000 })],
    });
    expect(projectSummary(data, "obra-a")).toMatchObject({
      pending: 0,
      physicalProgress: 25,
      delayed: 1,
    });
  });
});
