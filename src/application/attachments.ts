import { z } from "zod";
import { requireAdmin, authenticatedClient } from "./workspace";
import { AppError, dbError } from "./errors";
const metadataSchema = z
  .object({
    project_id: z.uuid(),
    payment_id: z.uuid().nullable(),
    material_id: z.uuid().nullable(),
  })
  .refine(
    (v) => !!v.payment_id !== !!v.material_id,
    "Selecciona el pago o compra del comprobante.",
  );
const formats = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
} as const;
function validHeader(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg")
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  const text = new TextDecoder().decode(bytes.slice(0, 12));
  if (type === "image/webp")
    return text.slice(0, 4) === "RIFF" && text.slice(8, 12) === "WEBP";
  return type === "application/pdf" && text.startsWith("%PDF-");
}
export async function uploadAttachment(form: FormData) {
  const meta = metadataSchema.parse({
    project_id: form.get("project_id"),
    payment_id: form.get("payment_id") || null,
    material_id: form.get("material_id") || null,
  });
  const { db } = await requireAdmin(meta.project_id);
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    !file.size ||
    file.size > 10485760 ||
    !Object.hasOwn(formats, file.type)
  )
    throw new AppError("Sube una imagen JPG, PNG, WebP o PDF de hasta 10 MB.");
  if (
    !validHeader(
      file.type,
      new Uint8Array(await file.slice(0, 12).arrayBuffer()),
    )
  )
    throw new AppError("El contenido del archivo no coincide con su formato.");
  const type = meta.payment_id ? "payment" : "material";
  const entityId = meta.payment_id || meta.material_id;
  const path = `${meta.project_id}/${type}/${entityId}/${crypto.randomUUID()}.${formats[file.type as keyof typeof formats]}`;
  const upload = await db.storage
    .from("receipts")
    .upload(path, file, { contentType: file.type, upsert: false });
  dbError(upload.error);
  const insert = await db
    .from("attachments")
    .insert({
      ...meta,
      path,
      name: file.name.slice(0, 160),
      mime_type: file.type,
      size: file.size,
    })
    .select("id")
    .single();
  if (insert.error) {
    await db.storage.from("receipts").remove([path]);
    dbError(insert.error);
  }
  return insert.data!.id as string;
}
export async function attachmentLink(id: string) {
  const { db } = await authenticatedClient();
  const record = await db
    .from("attachments")
    .select("path,name")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  dbError(record.error);
  if (!record.data) throw new AppError("No se encontró el comprobante.", 404);
  const signed = await db.storage
    .from("receipts")
    .createSignedUrl(record.data.path, 60, { download: record.data.name });
  dbError(signed.error);
  return signed.data!.signedUrl;
}
export async function removeAttachment(id: string) {
  const { db } = await authenticatedClient();
  const record = await db
    .from("attachments")
    .select("project_id")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  dbError(record.error);
  if (!record.data) throw new AppError("No se encontró el comprobante.", 404);
  await requireAdmin(record.data.project_id);
  const update = await db
    .from("attachments")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();
  dbError(update.error);
}
async function adminAttachment(id: string) {
  const { db } = await authenticatedClient();
  const record = await db
    .from("attachments")
    .select("id,project_id,payment_id,material_id,path")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  dbError(record.error);
  if (!record.data) throw new AppError("No se encontró el archivo.", 404);
  await requireAdmin(record.data.project_id);
  return { db, record: record.data };
}
export async function renameAttachment(id: string, name: string) {
  const clean = z
    .string()
    .trim()
    .min(1, "Escribe un nombre.")
    .max(160)
    .parse(name);
  const { db } = await adminAttachment(id);
  const update = await db
    .from("attachments")
    .update({ name: clean })
    .eq("id", id)
    .select("id")
    .single();
  dbError(update.error);
}
/** Replaces the content of a file; every view that shows it uses the new one. */
export async function replaceAttachment(id: string, file: unknown) {
  const { db, record } = await adminAttachment(id);
  if (
    !(file instanceof File) ||
    !file.size ||
    file.size > 10485760 ||
    !Object.hasOwn(formats, file.type)
  )
    throw new AppError("Sube una imagen JPG, PNG, WebP o PDF de hasta 10 MB.");
  if (
    !validHeader(
      file.type,
      new Uint8Array(await file.slice(0, 12).arrayBuffer()),
    )
  )
    throw new AppError("El contenido del archivo no coincide con su formato.");
  const type = record.payment_id ? "payment" : "material";
  const entityId = record.payment_id || record.material_id;
  const path = `${record.project_id}/${type}/${entityId}/${crypto.randomUUID()}.${formats[file.type as keyof typeof formats]}`;
  const upload = await db.storage
    .from("receipts")
    .upload(path, file, { contentType: file.type, upsert: false });
  dbError(upload.error);
  const update = await db
    .from("attachments")
    .update({
      path,
      name: file.name.slice(0, 160),
      mime_type: file.type,
      size: file.size,
    })
    .eq("id", id)
    .select("id")
    .single();
  if (update.error) {
    await db.storage.from("receipts").remove([path]);
    dbError(update.error);
  }
  await db.storage.from("receipts").remove([record.path]);
}
