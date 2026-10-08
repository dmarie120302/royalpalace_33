import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/application/workspace";
import {
  AppError,
  dbError,
  errorResponse,
  requireSameOrigin,
} from "@/application/errors";
import { adminClient } from "@/infrastructure/supabase/admin";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { project_id, contractor_id } = z
      .object({ project_id: z.uuid(), contractor_id: z.uuid() })
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
      throw new AppError("Registra primero el correo del contratista.");
    if (contractor.data.user_id)
      throw new AppError("Este contratista ya tiene acceso.");
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const admin = adminClient();
    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(
      contractor.data.email,
      { redirectTo: `${origin}/account` },
    );
    if (error)
      throw new AppError(
        "No se pudo enviar la invitación. Si ya tiene una cuenta, pídele que entre con ese correo.",
        400,
      );
    if (invited.user) {
      const assigned = await admin.auth.admin.updateUserById(invited.user.id, {
        app_metadata: { app_role: "contractor" },
      });
      if (assigned.error)
        throw new AppError(
          "La invitación fue enviada, pero no se pudo completar la configuración de acceso. Contacta con administración.",
          500,
        );
    }
    return NextResponse.json({
      ok: true,
      message:
        "Invitación enviada. El contratista recibirá un enlace por correo.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
