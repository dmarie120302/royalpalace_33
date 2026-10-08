import { redirect } from "next/navigation";
import { supabaseConfig } from "@/infrastructure/supabase/config";
import { serverClient } from "@/infrastructure/supabase/server";
import { loadWorkspace } from "@/application/workspace";
import { AppWorkspace } from "@/components/app-workspace";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (!supabaseConfig()) redirect("/setup");
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  return <AppWorkspace initialData={await loadWorkspace()} />;
}
