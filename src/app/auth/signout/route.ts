import { NextResponse } from "next/server";
import { serverClient } from "@/infrastructure/supabase/server";
import { errorResponse, requireSameOrigin } from "@/application/errors";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const db = await serverClient();
    await db.auth.signOut();
    return NextResponse.redirect(new URL("/login", request.url), 303);
  } catch (error) {
    return errorResponse(error);
  }
}
