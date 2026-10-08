import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/application/workspace";
import {
  AppError,
  dbError,
  errorResponse,
  requireSameOrigin,
} from "@/application/errors";
import { PIN_PATTERN } from "@/domain/access";
import { adminClient } from "@/infrastructure/supabase/admin";
// Creates the contractor's account with a username and 6-digit code, or replaces
// the code of the account already linked to that contractor. No email is sent.
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { project_id, contractor_id, pin } = z
      .object({
        project_id: z.uuid(),
        contractor_id: z.uuid(),
        pin: z.string().regex(PIN_PATTERN),
      })
      .strict()
      .parse(await request.json());
    const { db } = await requireAdmin(project_id);
    const contractor = await db
      .from("contractors")
      .select("email,user_id")
      .eq("project_id", project_id)
      .eq("id", contractor_id)
      .is("archived_at", null)
      .single();
    dbError(contractor.error);
    if (!contractor.data?.email)
      throw new AppError("Registra primero el usuario del contratista.");
    const admin = adminClient();
    if (contractor.data.user_id) {
      const target = await admin.auth.admin.getUserById(
        contractor.data.user_id,
      );
      if (
        target.error ||
        target.data.user?.email !== contractor.data.email ||
        target.data.user?.app_metadata?.app_role !== "contractor"
      )
        throw new AppError(
          "No se puede cambiar el código de esta cuenta desde aquí.",
          403,
        );
      const updated = await admin.auth.admin.updateUserById(
        contractor.data.user_id,
        { password: pin },
      );
      if (updated.error)
        throw new AppError("No se pudo cambiar el código.", 400);
      return NextResponse.json({
        ok: true,
        message: "Código actualizado. Compártelo solo con el contratista.",
      });
    }
    const created = await admin.auth.admin.createUser({
      email: contractor.data.email,
      password: pin,
      email_confirm: true,
      app_metadata: { app_role: "contractor" },
    });
    if (created.error)
      throw new AppError(
        "No se pudo crear el acceso. Si ese usuario ya existe, elige otro nombre de usuario.",
        400,
      );
    return NextResponse.json({
      ok: true,
      message:
        "Acceso creado. El contratista entra con su usuario y el código que asignaste.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
