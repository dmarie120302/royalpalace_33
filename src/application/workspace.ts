import { serverClient } from "@/infrastructure/supabase/server";
import { AppError, dbError } from "./errors";
import type {
  Assignment,
  AuditEvent,
  Attachment,
  Catalog,
  Contractor,
  MaterialPurchase,
  Phase,
  Project,
  Resource,
  Role,
  WorkItem,
  Workspace,
} from "@/domain/types";
import { schemas } from "@/domain/validation";
export async function authenticatedClient() {
  const db = await serverClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new AppError("Inicia sesión para continuar.", 401);
  return { db, user };
}
export async function loadWorkspace(): Promise<Workspace> {
  const { db, user } = await authenticatedClient();
  const claim = await db.rpc("claim_contractor_access");
  dbError(claim.error);
  const tables = [
    "projects",
    "project_members",
    "spaces",
    "phases",
    "categories",
    "contractors",
    "work_items",
    "work_spaces",
    "phase_spaces",
    "work_assignments",
    "payments",
    "material_purchases",
    "material_spaces",
    "attachments",
    "audit_events",
  ] as const;
  // The API caps each response. Read all authorized pages so financial totals
  // remain accurate after a project grows beyond the first 1,000 movements.
  const bridgeKeys: Record<string, string[]> = {
    project_members: ["project_id", "user_id"],
    work_spaces: ["project_id", "work_item_id", "space_id"],
    phase_spaces: ["project_id", "phase_id", "space_id"],
    work_assignments: ["project_id", "work_item_id", "contractor_id"],
    material_spaces: ["project_id", "material_id", "space_id"],
  };
  const results = await Promise.all(
    tables.map(async (table) => {
      if (table === "audit_events")
        return db
          .from(table)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
      const records = [];
      const pageSize = 1000;
      for (let offset = 0; ; offset += pageSize) {
        let query = db.from(table).select("*");
        for (const key of bridgeKeys[table] || ["id"])
          query = query.order(key, { ascending: true });
        const result = await query.range(offset, offset + pageSize - 1);
        dbError(result.error);
        const page = result.data || [];
        records.push(...page);
        if (page.length < pageSize) break;
      }
      return { data: records, error: null };
    }),
  );
  results.forEach((result) => dbError(result.error));
  const rows = Object.fromEntries(
    tables.map((table, i) => [table, results[i].data || []]),
  );
  const projects = rows.projects as Project[];
  const roles: Record<string, Role> = {};
  projects.forEach((p) => {
    if (p.owner_id === user.id) roles[p.id] = "admin";
  });
  for (const m of rows.project_members as {
    project_id: string;
    user_id: string;
    role: Role;
    archived_at: string | null;
  }[]) {
    if (m.user_id === user.id && !m.archived_at) roles[m.project_id] = m.role;
  }
  const ws = rows.work_spaces.filter((x) => !x.archived_at) as {
    work_item_id: string;
    space_id: string;
  }[];
  const ps = rows.phase_spaces.filter((x) => !x.archived_at) as {
    phase_id: string;
    space_id: string;
  }[];
  const ms = rows.material_spaces.filter((x) => !x.archived_at) as {
    material_id: string;
    space_id: string;
  }[];
  const assignments = rows.work_assignments.filter(
    (x) => !x.archived_at,
  ) as Assignment[];
  const works = (rows.work_items as WorkItem[]).map((w) => ({
    ...w,
    space_ids: ws.filter((x) => x.work_item_id === w.id).map((x) => x.space_id),
    assignments: assignments.filter((a) => a.work_item_id === w.id),
  }));
  const phases = (rows.phases as Phase[]).map((p) => ({
    ...p,
    space_ids: ps.filter((x) => x.phase_id === p.id).map((x) => x.space_id),
  }));
  const materials = (rows.material_purchases as MaterialPurchase[]).map(
    (m) => ({
      ...m,
      space_ids: ms
        .filter((x) => x.material_id === m.id)
        .map((x) => x.space_id),
    }),
  );
  return {
    user: {
      id: user.id,
      email: user.email || "",
      name:
        (typeof user.user_metadata?.full_name === "string" &&
          user.user_metadata.full_name.slice(0, 120)) ||
        user.email?.split("@")[0] ||
        "Usuario",
      app_role:
        user.app_metadata?.app_role === "admin" ? "admin" : "contractor",
    },
    projects,
    roles,
    spaces: rows.spaces as Catalog[],
    phases,
    categories: rows.categories as Catalog[],
    contractors: rows.contractors as Contractor[],
    works,
    payments: rows.payments as Workspace["payments"],
    materials,
    attachments: rows.attachments.filter((x) => !x.archived_at) as Attachment[],
    audit: rows.audit_events as AuditEvent[],
  };
}
export async function requireAdmin(projectId: string, allowArchived = false) {
  const { db, user } = await authenticatedClient();
  const p = await db
    .from("projects")
    .select("owner_id,archived_at")
    .eq("id", projectId)
    .maybeSingle();
  dbError(p.error);
  if (!p.data || (!allowArchived && p.data.archived_at))
    throw new AppError("No se encontró esta obra.", 404);
  if (p.data.owner_id === user.id) return { db, user };
  const m = await db
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();
  dbError(m.error);
  if (m.data?.role !== "admin")
    throw new AppError("Solo administración puede modificar esta obra.", 403);
  return { db, user };
}
export async function saveEntity(resource: Resource, input: unknown) {
  const data = schemas[resource].parse(input);
  const { db } = await authenticatedClient();
  if (resource !== "projects")
    await requireAdmin((data as { project_id: string }).project_id);
  else if (data.id) await requireAdmin(data.id);
  const result = await db.rpc("save_entity", {
    p_resource: resource,
    p_data: data,
  });
  dbError(result.error);
  return result.data as string;
}
export async function archiveEntity(
  resource: Resource,
  id: string,
  archived: boolean,
) {
  const { db } = await authenticatedClient();
  const result = await db
    .from(resource)
    .select(resource === "projects" ? "id" : "project_id")
    .eq("id", id)
    .maybeSingle();
  dbError(result.error);
  if (!result.data) throw new AppError("No se encontró el registro.", 404);
  const projectId =
    resource === "projects"
      ? id
      : (result.data as unknown as { project_id: string }).project_id;
  await requireAdmin(projectId, resource === "projects" && !archived);
  const update = await db
    .from(resource)
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id")
    .single();
  dbError(update.error);
}
