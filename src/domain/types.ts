export type Role = "admin" | "contractor";
export type ProjectStatus = "planning" | "active" | "paused" | "completed";
export type WorkStatus = "pending" | "in_progress" | "blocked" | "completed";
export type Resource =
  | "projects"
  | "spaces"
  | "phases"
  | "categories"
  | "contractors"
  | "work_items"
  | "payments"
  | "material_purchases";
export interface Entity {
  id: string;
  created_at: string;
  archived_at: string | null;
}
export interface Project extends Entity {
  owner_id: string;
  name: string;
  location: string;
  description: string;
  budget_cents: number;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
}
export interface Catalog extends Entity {
  project_id: string;
  name: string;
  color: string;
}
export interface Phase extends Catalog {
  space_ids: string[];
}
export interface Contractor extends Catalog {
  trade: string;
  phone: string;
  email: string;
  user_id: string | null;
}
export interface Assignment {
  work_item_id: string;
  contractor_id: string;
  allocation_cents: number;
}
export interface WorkItem extends Entity {
  project_id: string;
  name: string;
  description: string;
  phase_id: string | null;
  budget_cents: number;
  start_date: string | null;
  end_date: string | null;
  status: WorkStatus;
  progress: number;
  space_ids: string[];
  assignments: Assignment[];
}
export interface Payment extends Entity {
  project_id: string;
  work_item_id: string;
  contractor_id: string;
  amount_cents: number;
  date: string;
  description: string;
  method: string;
}
export interface MaterialPurchase extends Entity {
  project_id: string;
  work_item_id: string | null;
  contractor_id: string | null;
  phase_id: string | null;
  category_id: string | null;
  covered_by_payment_id: string | null;
  space_ids: string[];
  amount_cents: number;
  date: string;
  store: string;
  description: string;
  quantity: string;
}
export interface Attachment {
  id: string;
  project_id: string;
  payment_id: string | null;
  material_id: string | null;
  path: string;
  name: string;
  mime_type: string;
  size: number;
  created_at: string;
  archived_at: string | null;
}
export interface AuditEvent {
  id: string;
  project_id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  created_at: string;
}
export interface Workspace {
  user: { id: string; email: string; name: string; app_role?: Role };
  projects: Project[];
  roles: Record<string, Role>;
  spaces: Catalog[];
  phases: Phase[];
  categories: Catalog[];
  contractors: Contractor[];
  works: WorkItem[];
  payments: Payment[];
  materials: MaterialPurchase[];
  attachments: Attachment[];
  audit: AuditEvent[];
}
export type MutationInput = Record<string, unknown>;
