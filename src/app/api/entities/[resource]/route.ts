import { NextResponse } from "next/server";
import { saveEntity } from "@/application/workspace";
import { errorResponse, requireSameOrigin } from "@/application/errors";
import { resourceFrom } from "@/domain/validation";
export async function POST(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  try {
    requireSameOrigin(request);
    const { resource } = await context.params;
    const id = await saveEntity(resourceFrom(resource), await request.json());
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
