import { NextResponse } from "next/server";
import { loadWorkspace } from "@/application/workspace";
import { errorResponse } from "@/application/errors";
export async function GET() {
  try {
    return NextResponse.json(await loadWorkspace(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
