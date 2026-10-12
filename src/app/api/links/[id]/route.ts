import { NextResponse } from "next/server";
import { removeLink, updateLink } from "@/application/links";
import { errorResponse, requireSameOrigin } from "@/application/errors";
import { entityId } from "@/domain/validation";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const { id } = await context.params;
    await updateLink(entityId.parse(id), await request.json());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const { id } = await context.params;
    await removeLink(entityId.parse(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
