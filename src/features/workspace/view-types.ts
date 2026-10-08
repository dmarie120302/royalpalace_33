import type {
  MutationInput,
  Project,
  Resource,
  Workspace,
} from "@/domain/types";
export interface ViewProps {
  data: Workspace;
  project: Project;
  admin: boolean;
  query: string;
  edit: (resource: Resource, record?: MutationInput) => void;
  archive: (
    resource: Resource,
    id: string,
    name: string,
    archived?: boolean,
  ) => void;
  attachments: (
    type: "payment" | "material",
    id: string,
    title: string,
  ) => void;
  invite: (contractorId: string) => void;
}
export const matches = (
  query: string,
  ...parts: (string | undefined | null)[]
) =>
  !query.trim() ||
  parts
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("es")
    .includes(query.trim().toLocaleLowerCase("es"));
export const active = <T extends { archived_at: string | null }>(items: T[]) =>
  items.filter((item) => !item.archived_at);
