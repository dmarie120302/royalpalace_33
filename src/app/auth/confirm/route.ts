import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { serverClient } from "@/infrastructure/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (token_hash && type && ["invite", "recovery", "email"].includes(type)) {
    const db = await serverClient();
    const { error } = await db.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    });
    if (!error)
      return NextResponse.redirect(
        new URL(type === "email" ? "/" : "/account", url.origin),
      );
  }
  return NextResponse.redirect(new URL("/login", url.origin));
}
