import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";
export function adminClient() {
  const config = supabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!config || !secret)
    throw new Error(
      "Las invitaciones requieren configurar la clave privada del servidor.",
    );
  return createClient(config.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
