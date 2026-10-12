import { NextResponse } from "next/server";
import { createLink } from "@/application/links";
import { errorResponse, requireSameOrigin } from "@/application/errors";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const id = await createLink(await request.json());
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
