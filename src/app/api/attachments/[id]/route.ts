import { NextResponse } from "next/server";
import { attachmentLink, removeAttachment } from "@/application/attachments";
import { errorResponse, requireSameOrigin } from "@/application/errors";
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
