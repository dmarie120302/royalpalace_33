"use client";

import { useEffect, useState } from "react";
import type { Resource, Workspace } from "@/domain/types";
import { Icon, type IconName } from "./icons";
import { ErrorBox, Modal } from "./ui";
import { api, useWorkspace } from "@/features/workspace/use-workspace";
import {
  EntityForm,
  type EditorTarget,
} from "@/features/workspace/entity-form";
import {
  AttachmentsModal,
  type AttachmentTarget,
} from "@/features/workspace/attachments-modal";
import {
  ProjectsView,
  ProjectOverview,
} from "@/features/workspace/projects-view";
import { WorksView } from "@/features/workspace/works-view";
import {
  PaymentsView,
  MaterialsView,
} from "@/features/workspace/movements-view";
import {
  CatalogsView,
  ContractorsView,
} from "@/features/workspace/catalogs-view";
import { TimelineView } from "@/features/workspace/timeline-view";
import { ReportsView } from "@/features/workspace/reports-view";
import type { ViewProps } from "@/features/workspace/view-types";

type View =
  | "overview"
  | "works"
  | "payments"
  | "materials"
  | "calendar"
  | "team"
  | "catalog"
  | "report";
const navigation: {
  id: View;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
}[] = [
  { id: "overview", label: "Resumen", icon: "overview" },
  { id: "works", label: "Trabajos", icon: "works" },
  { id: "payments", label: "Pagos", icon: "payments" },
  { id: "materials", label: "Materiales", icon: "materials" },
  { id: "calendar", label: "Cronograma", icon: "calendar" },
  { id: "team", label: "Contratistas", icon: "team", adminOnly: true },
  { id: "catalog", label: "Organización", icon: "catalog", adminOnly: true },
  { id: "report", label: "Reportes", icon: "report" },
];
const descriptions: Record<View, string> = {
  overview: "El avance y los números de esta obra, en un mismo lugar.",
  works: "Responsables, presupuestos y entregas de cada trabajo.",
  payments: "Pagos registrados a cada beneficiario y sus comprobantes.",
  materials: "Compras relacionadas con trabajos, espacios y pagos.",
  calendar: "Lo que está en marcha y lo que viene después.",
  team: "Las personas que hacen posible esta obra.",
  catalog: "Espacios, fases y categorías para organizar la obra.",
  report: "Resultados e historial para revisar y compartir.",
};
interface ArchiveTarget {
  resource: Resource;
  id: string;
  name: string;
  archived: boolean;
}

export function AppWorkspace({ initialData }: { initialData: Workspace }) {
  const controller = useWorkspace(initialData);
  const {
    data,
    notice,
    refreshing,
    refresh,
    save,
    archive,
    notify,
    dismissNotice,
  } = controller;
  const [projectId, setProjectId] = useState<string | null>(null);
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [attachmentTarget, setAttachmentTarget] =
    useState<AttachmentTarget | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(
    null,
  );
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [currentDate] = useState(() =>
    new Intl.DateTimeFormat("es-PA", {
      day: "numeric",
      month: "long",
      timeZone: "America/Panama",
    }).format(new Date()),
  );
  const name = process.env.NEXT_PUBLIC_APP_NAME || "Obra Clara";
  const project = data.projects.find(
    (item) => item.id === projectId && !item.archived_at,
  );
  const admin = !!project && data.roles[project.id] === "admin";
  const canCreate = data.user.app_role === "admin";
  const activeProjects = data.projects.filter((item) => !item.archived_at);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(dismissNotice, notice.error ? 12000 : 6000);
    return () => window.clearTimeout(timer);
  }, [notice, dismissNotice]);
  const selectProject = (id: string | null) => {
    setProjectId(id);
    setView("overview");
    setQuery("");
    setShowArchived(false);
  };
  const selectView = (next: View) => {
    setView(next);
    setQuery("");
  };
  const askArchive = (
    resource: Resource,
    id: string,
    title: string,
    archived = true,
  ) => {
    setArchiveError("");
    setArchiveTarget({ resource, id, name: title, archived });
  };
  async function confirmArchive() {
    if (!archiveTarget) return;
    setArchiveBusy(true);
    setArchiveError("");
    try {
      await archive(
        archiveTarget.resource,
        archiveTarget.id,
        archiveTarget.archived,
      );
      if (
        archiveTarget.resource === "projects" &&
        archiveTarget.id === projectId &&
        archiveTarget.archived
      )
        selectProject(null);
      setArchiveTarget(null);
    } catch (cause) {
      setArchiveError(
        cause instanceof Error
          ? cause.message
          : "No se pudo completar la operación.",
      );
    } finally {
      setArchiveBusy(false);
    }
  }
  async function invite(contractorId: string) {
    if (!project || inviteBusy) return;
    setInviteBusy(true);
    try {
      const result = await api<{ message: string }>("/api/invitations", {
        method: "POST",
        body: JSON.stringify({
          project_id: project.id,
          contractor_id: contractorId,
        }),
      });
      await refresh();
      notify(result.message || "Invitación enviada.");
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "No se pudo enviar la invitación.",
        true,
      );
    } finally {
      setInviteBusy(false);
    }
  }
  const props: ViewProps | null = project
    ? {
        data,
        project,
        admin,
        query,
        edit: (resource, record) => setEditor({ resource, record }),
        archive: askArchive,
        attachments: (type, id, title) =>
          setAttachmentTarget({ type, id, title }),
        invite,
      }
    : null;
  const currentModule = navigation.find((item) => item.id === view)!;
  const primary: { label: string; resource: Resource } | null = !project
    ? canCreate
      ? { label: "Nueva obra", resource: "projects" }
      : null
    : !admin
      ? null
      : view === "works"
        ? { label: "Nuevo trabajo", resource: "work_items" }
        : view === "payments"
          ? { label: "Registrar pago", resource: "payments" }
          : view === "materials"
            ? { label: "Nueva compra", resource: "material_purchases" }
            : view === "team"
              ? { label: "Nuevo contratista", resource: "contractors" }
              : null;
  return (
    <div className="app-shell">
      <aside className="sidebar no-print">
        <button
          className="brand"
          onClick={() => selectProject(null)}
          aria-label={`${name}, todas las obras`}
        >
          <span className="brand-symbol">
            <span />
            <span />
            <span />
          </span>
          <span>{name}</span>
        </button>
        <button
          className={`all-projects-button${!project ? " selected" : ""}`}
          onClick={() => selectProject(null)}
        >
          <Icon name="overview" />
          Todas las obras<span>{activeProjects.length}</span>
        </button>
        <div className="sidebar-project">
          <label htmlFor="project-switcher">Obra actual</label>
          <select
            id="project-switcher"
            value={project?.id || ""}
            onChange={(event) => selectProject(event.target.value || null)}
          >
            <option value="">Selecciona una obra</option>
            {activeProjects.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        {project && (
          <nav className="workspace-nav" aria-label="Secciones de la obra">
            {navigation
              .filter((item) => !item.adminOnly || admin)
              .map((item) => (
                <button
                  className={view === item.id ? "selected" : ""}
                  key={item.id}
                  onClick={() => selectView(item.id)}
                  aria-current={view === item.id ? "page" : undefined}
                >
                  <Icon name={item.icon} size={19} />
                  <span>{item.label}</span>
                </button>
              ))}
          </nav>
        )}
        <div className="sidebar-footer">
          <div className="user-block">
            <span className="user-avatar">
              {(data.user.name || data.user.email).charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{data.user.name || "Mi cuenta"}</strong>
              <span>
                {project
                  ? admin
                    ? "Administración"
                    : "Contratista"
                  : "Gestión de obras"}
              </span>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button className="logout-link" type="submit">
              <Icon name="logout" size={17} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="workspace-main">
        <header className="topbar no-print">
          <div className="breadcrumbs">
            <button onClick={() => selectProject(null)}>Mis obras</button>
            {project && (
              <>
                <span>/</span>
                <strong>{project.name}</strong>
              </>
            )}
          </div>
          <div className="topbar-actions">
            <button
              className={`icon-button${refreshing ? " refreshing" : ""}`}
              disabled={refreshing}
              aria-label="Actualizar información"
              onClick={() =>
                refresh().catch((cause) =>
                  notify(
                    cause instanceof Error
                      ? cause.message
                      : "No se pudo actualizar la información.",
                    true,
                  ),
                )
              }
            >
              <Icon name="refresh" size={19} />
            </button>
            <span className="topbar-date">{currentDate}</span>
          </div>
        </header>
        <div className="workspace-content">
          <div
            className={`page-heading${!project ? " portfolio-heading" : ""}`}
          >
            <div>
              <h1>
                {project ? currentModule.label : "Cada obra, en su lugar."}
              </h1>
              <p>
                {project
                  ? descriptions[view]
                  : "Organiza los trabajos, cuida el presupuesto y mantén a tu equipo al día."}
              </p>
            </div>
            <div className="page-actions">
              {project && admin && view === "overview" && (
                <button
                  className="button secondary"
                  aria-label={`Editar ${project.name}`}
                  onClick={() =>
                    setEditor({ resource: "projects", record: { ...project } })
                  }
                >
                  <Icon name="edit" size={17} />
                  Editar obra
                </button>
              )}
              {primary && (
                <button
                  className="button"
                  onClick={() => setEditor({ resource: primary.resource })}
                >
                  <Icon name="plus" size={18} />
                  {primary.label}
                </button>
              )}
            </div>
          </div>
          {(!project ||
            [
              "works",
              "payments",
              "materials",
              "team",
              "catalog",
              "calendar",
            ].includes(view)) && (
            <div className="filter-bar no-print">
              <label className="search-field">
                <Icon name="search" size={18} />
                <input
                  type="search"
                  aria-label={
                    project
                      ? `Buscar en ${currentModule.label.toLowerCase()}`
                      : "Buscar obras"
                  }
                  placeholder={
                    project
                      ? `Buscar en ${currentModule.label.toLowerCase()}…`
                      : "Buscar obra o ubicación…"
                  }
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              {!project && (
                <div className="portfolio-filters">
                  <span>
                    {activeProjects.length}{" "}
                    {activeProjects.length === 1
                      ? "obra activa"
                      : "obras activas"}
                  </span>
                  <button
                    className="text-button"
                    onClick={() => setShowArchived(!showArchived)}
                  >
                    <Icon name="archive" size={16} />
                    {showArchived ? "Ver activas" : "Ver archivadas"}
                  </button>
                </div>
              )}
            </div>
          )}
          {!project ? (
            <ProjectsView
              canCreate={canCreate}
              data={data}
              query={query}
              showArchived={showArchived}
              onSelect={selectProject}
              onEdit={(record) => setEditor({ resource: "projects", record })}
              onArchive={(item) =>
                askArchive("projects", item.id, item.name, !item.archived_at)
              }
            />
          ) : (
            props &&
            (view === "overview" ? (
              <ProjectOverview {...props} />
            ) : view === "works" ? (
              <WorksView {...props} />
            ) : view === "payments" ? (
              <PaymentsView {...props} />
            ) : view === "materials" ? (
              <MaterialsView {...props} />
            ) : view === "calendar" ? (
              <TimelineView {...props} />
            ) : view === "team" && admin ? (
              <ContractorsView {...props} />
            ) : view === "catalog" && admin ? (
              <CatalogsView {...props} />
            ) : (
              <ReportsView {...props} />
            ))
          )}
          <footer className="content-footer no-print">
            <span>{name}</span>
            <span>
              {project ? project.name : "Un espacio para cada proyecto"}
            </span>
          </footer>
        </div>
      </main>
      {notice && (
        <output
          className={`toast${notice.error ? " error" : ""}`}
          aria-live={notice.error ? "assertive" : "polite"}
        >
          <Icon name={notice.error ? "close" : "check"} size={19} />
          <span>{notice.message}</span>
          <button
            className="icon-button"
            aria-label="Cerrar aviso"
            onClick={dismissNotice}
          >
            <Icon name="close" size={16} />
          </button>
        </output>
      )}
      {inviteBusy && (
        <output className="operation-status">Enviando invitación…</output>
      )}
      {editor && (
        <EntityForm
          key={`${editor.resource}-${editor.record?.id || "new"}`}
          target={editor}
          projectId={project?.id || null}
          data={data}
          onSave={save}
          onClose={() => setEditor(null)}
        />
      )}
      {attachmentTarget && project && (
        <AttachmentsModal
          target={attachmentTarget}
          data={data}
          projectId={project.id}
          admin={admin}
          refresh={refresh}
          onClose={() => setAttachmentTarget(null)}
        />
      )}
      {archiveTarget && (
        <Modal
          title={
            archiveTarget.archived ? "Archivar registro" : "Recuperar registro"
          }
          busy={archiveBusy}
          onClose={() => setArchiveTarget(null)}
        >
          <p className="confirm-text">
            {archiveTarget.archived ? (
              <>
                Se archivará <strong>{archiveTarget.name}</strong>. Su historial
                se conservará y podrás recuperarlo más adelante.
              </>
            ) : (
              <>
                Se recuperará <strong>{archiveTarget.name}</strong> y volverá a
                aparecer entre los registros activos.
              </>
            )}
          </p>
          {archiveError && <ErrorBox message={archiveError} />}
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={archiveBusy}
              onClick={() => setArchiveTarget(null)}
            >
              Cancelar
            </button>
            <button
              className={`button${archiveTarget.archived ? " danger-button" : ""}`}
              disabled={archiveBusy}
              onClick={confirmArchive}
            >
              {archiveBusy
                ? "Procesando…"
                : archiveTarget.archived
                  ? "Archivar"
                  : "Recuperar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
