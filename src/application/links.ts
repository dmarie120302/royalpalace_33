import { z } from "zod";
import { requireAdmin, authenticatedClient } from "./workspace";
import { AppError, dbError } from "./errors";
const url = z
  .string()
  .trim()
  .max(2000)
  .regex(
    /^https?:\/\/\S+$/,
    "Escribe un enlace que empiece por http:// o https://",
  );
const name = z.string().trim().min(1, "Escribe un nombre.").max(160);
const createSchema = z
  .object({
    project_id: z.uuid(),
    payment_id: z.uuid().nullable().default(null),
    material_id: z.uuid().nullable().default(null),
    name,
    url,
  })
  .strict()
  .refine(
    (v) => !!v.payment_id !== !!v.material_id,
    "Elige el pago o el material del enlace.",
  );
export async function createLink(input: unknown) {
  const data = createSchema.parse(input);
  const { db } = await requireAdmin(data.project_id);
  const insert = await db.from("links").insert(data).select("id").single();
  dbError(insert.error);
  return insert.data!.id as string;
}
async function adminLink(id: string) {
  const { db } = await authenticatedClient();
  const record = await db
    .from("links")
    .select("project_id")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  dbError(record.error);
  if (!record.data) throw new AppError("No se encontró el enlace.", 404);
  await requireAdmin(record.data.project_id);
  return db;
}
export async function updateLink(id: string, input: unknown) {
  const data = z.object({ name, url }).strict().parse(input);
  const db = await adminLink(id);
  const update = await db
    .from("links")
    .update(data)
    .eq("id", id)
    .select("id")
    .single();
  dbError(update.error);
}
export async function removeLink(id: string) {
  const db = await adminLink(id);
  const update = await db
    .from("links")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();
  dbError(update.error);
}
