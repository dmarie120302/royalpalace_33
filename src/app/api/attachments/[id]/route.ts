import { NextResponse } from "next/server";
import {
  attachmentLink,
  removeAttachment,
  renameAttachment,
  replaceAttachment,
} from "@/application/attachments";
import {
  AppError,
  errorResponse,
  requireSameOrigin,
} from "@/application/errors";
import { entityId } from "@/domain/validation";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const response = NextResponse.redirect(
      await attachmentLink(entityId.parse(id)),
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const { id } = await context.params;
    await removeAttachment(entityId.parse(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
// JSON {name} renames the file; multipart with "file" replaces its content.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const { id } = await context.params;
    const fileId = entityId.parse(id);
    if (
      (request.headers.get("content-type") || "").includes(
        "multipart/form-data",
      )
    ) {
      const length = Number(request.headers.get("content-length"));
      if (length > 11534336)
        throw new AppError("El archivo supera el máximo de 10 MB.", 413);
      await replaceAttachment(fileId, (await request.formData()).get("file"));
    } else {
      const body = (await request.json()) as { name?: unknown };
      await renameAttachment(fileId, String(body.name ?? ""));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
