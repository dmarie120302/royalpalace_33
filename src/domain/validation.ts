import { z } from "zod";
import type { Resource } from "./types";
const id = z.uuid();
const optionalId = id.nullable().default(null);
const cents = z.number().int().min(0).max(999999999999);
const positiveCents = cents.min(1);
const date = z.iso.date().nullable().default(null);
const text = z.string().trim().max(2000).default("");
const name = z.string().trim().min(1, "Escribe un nombre.").max(160);
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .default("#514ac8");
const base = { id: id.optional() };
const scoped = { ...base, project_id: id };
const spaceIds = z
  .array(id)
  .max(100)
  .refine((v) => new Set(v).size === v.length, "Hay espacios repetidos.")
  .default([]);
const catalog = { ...scoped, name, color };
const datesValid = (v: {
  start_date: string | null;
  end_date: string | null;
}) => !v.start_date || !v.end_date || v.end_date >= v.start_date;
export const schemas = {
  projects: z
    .object({
      ...base,
      name,
      location: z.string().trim().max(300).default(""),
      description: text,
      budget_cents: cents,
      start_date: date,
      end_date: date,
      status: z
        .enum(["planning", "active", "paused", "completed"])
        .default("planning"),
    })
    .strict()
    .refine(datesValid, "La fecha final debe ser posterior al inicio."),
  spaces: z.object(catalog).strict(),
  phases: z.object({ ...catalog, space_ids: spaceIds }).strict(),
  categories: z.object(catalog).strict(),
  contractors: z
    .object({
      ...catalog,
      trade: z.string().trim().max(120).default(""),
      phone: z.string().trim().max(40).default(""),
      email: z.union([z.email(), z.literal("")]).default(""),
    })
    .strict(),
  work_items: z
    .object({
      ...scoped,
      name,
      description: text,
      phase_id: optionalId,
      budget_cents: cents,
      start_date: date,
      end_date: date,
      status: z.enum(["pending", "in_progress", "blocked", "completed"]),
      progress: z.number().int().min(0).max(100),
      space_ids: spaceIds,
      assignments: z
        .array(
          z.object({ contractor_id: id, allocation_cents: cents }).strict(),
        )
        .max(100)
        .default([]),
    })
    .strict()
    .refine(datesValid, "La fecha final debe ser posterior al inicio.")
    .refine(
      (v) =>
        v.assignments.reduce((s, a) => s + a.allocation_cents, 0) <=
        v.budget_cents,
      "Las asignaciones superan el presupuesto.",
    )
    .refine(
      (v) =>
        new Set(v.assignments.map((a) => a.contractor_id)).size ===
        v.assignments.length,
      "Hay contratistas repetidos.",
    )
    .refine(
      (v) => v.status !== "completed" || v.progress === 100,
      "Un trabajo terminado debe tener avance del 100%.",
    ),
  payments: z
    .object({
      ...scoped,
      work_item_id: id,
      contractor_id: id,
      amount_cents: positiveCents,
      date: z.iso.date(),
      description: name,
      method: z.string().trim().min(1).max(60).default("transferencia"),
    })
    .strict(),
  material_purchases: z
    .object({
      ...scoped,
      work_item_id: optionalId,
      contractor_id: optionalId,
      phase_id: optionalId,
      category_id: optionalId,
      covered_by_payment_id: optionalId,
      space_ids: spaceIds,
      amount_cents: positiveCents,
      date: z.iso.date(),
      store: z.string().trim().min(1).max(160),
      description: name,
      quantity: z.string().trim().max(120).default(""),
    })
    .strict(),
};
export function resourceFrom(value: string): Resource {
  if (!Object.hasOwn(schemas, value)) throw new Error("Recurso desconocido.");
  return value as Resource;
}
export const entityId = id;
