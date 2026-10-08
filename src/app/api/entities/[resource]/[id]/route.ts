import { NextResponse } from "next/server";
import { z } from "zod";
import { archiveEntity } from "@/application/workspace";
import { errorResponse, requireSameOrigin } from "@/application/errors";
import { entityId, resourceFrom } from "@/domain/validation";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> },
) {
  try {
    requireSameOrigin(request);
    const { resource, id } = await context.params;
    const { archived } = z
      .object({ archived: z.boolean() })
      .strict()
      .parse(await request.json());
    await archiveEntity(resourceFrom(resource), entityId.parse(id), archived);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
