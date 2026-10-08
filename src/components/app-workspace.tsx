"use client";

import { useEffect, useState } from "react";
import type { Resource, Workspace } from "@/domain/types";
import { Icon } from "./icons";
import { isValidPin } from "@/domain/access";
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
import { ProjectsView } from "@/features/workspace/projects-view";
import { buildRoyal, fmt, pct, totalPagado } from "@/features/royal/model";
import {
  Analisis,
  Contratistas,
  Cronograma,
  Espacios,
  Fases,
  Materiales,
  Trabajos,
  VistaContratista,
} from "@/features/royal/views";
import { RoyalForm, ROYAL_FORMS } from "@/features/royal/forms";
import "@/features/royal/royal.css";
import type { ViewProps } from "@/features/workspace/view-types";

type View =
  | "trabajos"
  | "fases"
  | "analisis"
  | "cronograma"
  | "materiales"
  | "espacios"
  | "contratistas";
// Same tabs, order and buttons as ph33-royal-palace-v14.html.
const navigation: { id: View; label: string }[] = [
  { id: "trabajos", label: "Trabajos" },
  { id: "fases", label: "Fases" },
  { id: "analisis", label: "Análisis" },
  { id: "cronograma", label: "Cronograma" },
  { id: "materiales", label: "Materiales" },
  { id: "espacios", label: "Espacios" },
  { id: "contratistas", label: "Contratistas" },
];
const newButtons: Record<View, { label: string; resource: Resource }[]> = {
  trabajos: [{ label: "+ Nuevo trabajo", resource: "work_items" }],
  fases: [{ label: "+ Nueva fase", resource: "phases" }],
  analisis: [],
  cronograma: [],
  materiales: [
    { label: "+ Nuevo material", resource: "material_purchases" },
    { label: "+ Nueva categoría", resource: "categories" },
  ],
  espacios: [{ label: "+ Nuevo espacio", resource: "spaces" }],
  contratistas: [{ label: "+ Nuevo contratista", resource: "contractors" }],
};
interface ArchiveTarget {
  resource: Resource;
  id: string;
  name: string;
  archived: boolean;
}

export function AppWorkspace({ initialData }: { initialData: Workspace }) {
  const controller = useWorkspace(initialData);
  const { data, notice, refresh, save, archive, notify, dismissNotice } =
    controller;
  const [projectId, setProjectId] = useState<string | null>(() => {
    const open = initialData.projects.filter((item) => !item.archived_at);
    return open.length === 1 ? open[0].id : null;
  });
  const [view, setView] = useState<View>("trabajos");
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
  const [accessTarget, setAccessTarget] = useState<{
    id: string;
    name: string;
    linked: boolean;
  } | null>(null);
  const [accessError, setAccessError] = useState("");

  const name = process.env.NEXT_PUBLIC_APP_NAME || "RoyalPalace33";
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
    setView("trabajos");
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
  function invite(contractorId: string) {
    const contractor = data.contractors.find(
      (item) => item.id === contractorId,
    );
    if (!contractor) return;
    setAccessError("");
    setAccessTarget({
      id: contractor.id,
      name: contractor.name,
      linked: !!contractor.user_id,
    });
  }
  async function saveAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !accessTarget || inviteBusy) return;
    const form = new FormData(event.currentTarget);
    const pin = String(form.get("pin"));
    if (!isValidPin(pin)) {
      setAccessError("El código debe tener exactamente 6 números.");
      return;
    }
    if (pin !== form.get("pin_confirm")) {
      setAccessError("Los códigos deben coincidir.");
      return;
    }
    setInviteBusy(true);
    setAccessError("");
    try {
      const result = await api<{ message: string }>("/api/invitations", {
        method: "POST",
        body: JSON.stringify({
          project_id: project.id,
          contractor_id: accessTarget.id,
          pin,
        }),
      });
      setAccessTarget(null);
      await refresh();
      notify(result.message || "Acceso guardado.");
    } catch (cause) {
      setAccessError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar el acceso.",
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
        query: "",
        edit: (resource, record) => setEditor({ resource, record }),
        archive: askArchive,
        attachments: (type, id, title) =>
          setAttachmentTarget({ type, id, title }),
        invite,
      }
    : null;
  const royal = project ? buildRoyal(data, project) : null;
  const me =
    royal && !admin
      ? royal.contratistas.find((c) => c.userId === data.user.id)
      : undefined;
  const pres = royal
    ? royal.partidas.reduce((a, p) => a + (+p.presupuesto || 0), 0)
    : 0;
  const pag = royal
    ? royal.partidas.reduce((a, p) => a + totalPagado(p), 0)
    : 0;
  const royalProps = props && royal ? { ...props, r: royal } : null;
  return (
    <div className="app-shell">
      <header className="app-header no-print">
        <div className="fila">
          <p className="app-title">
            {project ? (me ? `Hola, ${me.nombre}` : project.name) : name}
          </p>
          <div className="header-actions">
            {activeProjects.length > 1 || !project ? (
              <>
                <label className="sr-only" htmlFor="project-switcher">
                  Obra actual
                </label>
                <select
                  id="project-switcher"
                  value={project?.id || ""}
                  onChange={(event) =>
                    selectProject(event.target.value || null)
                  }
                >
                  <option value="">
                    Todas las obras ({activeProjects.length})
                  </option>
                  {activeProjects.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <form action="/auth/signout" method="post">
              <button className="header-button" type="submit">
                Salir
              </button>
            </form>
          </div>
        </div>
        {project && admin && (
          <>
            <div className="resumen">
              <div>
                Presupuesto total<b>{fmt(pres)}</b>
              </div>
              <div>
                Pagado<b>{fmt(pag)}</b>
              </div>
              <div>
                Pendiente<b>{fmt(pres - pag)}</b>
              </div>
            </div>
            <div className="barra" aria-hidden="true">
              <span style={{ width: `${pct(pag, pres)}%` }} />
            </div>
          </>
        )}
      </header>
      {project && admin && (
        <nav className="menu no-print" aria-label="Secciones de la obra">
          <div className="menu-in">
            <div className="tabs">
              {navigation.map((item) => (
                <button
                  className={`tab${view === item.id ? " act" : ""}`}
                  key={item.id}
                  onClick={() => selectView(item.id)}
                  aria-current={view === item.id ? "page" : undefined}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="acciones">
              {newButtons[view].map((item) => (
                <button
                  className="nuevo"
                  key={item.resource}
                  onClick={() => setEditor({ resource: item.resource })}
                >
                  {item.label}
                </button>
              ))}
              {view === "trabajos" && (
                <button
                  className="nuevo sec"
                  aria-label={`Editar ${project.name}`}
                  onClick={() =>
                    setEditor({ resource: "projects", record: { ...project } })
                  }
                >
                  Editar obra
                </button>
              )}
            </div>
          </div>
        </nav>
      )}
      <main className="workspace-main">
        {!project ? (
          <div className="workspace-content">
            <div className="page-heading portfolio-heading">
              <div>
                <h1>Cada obra, en su lugar.</h1>
                <p>
                  Organiza los trabajos, cuida el presupuesto y mantén a tu
                  equipo al día.
                </p>
              </div>
              <div className="page-actions">
                {canCreate && (
                  <button
                    className="button"
                    onClick={() => setEditor({ resource: "projects" })}
                  >
                    <Icon name="plus" size={18} />
                    Nueva obra
                  </button>
                )}
              </div>
            </div>
            <div className="filter-bar no-print">
              <label className="search-field">
                <Icon name="search" size={18} />
                <input
                  type="search"
                  aria-label="Buscar obras"
                  placeholder="Buscar obra o ubicación…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
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
            </div>
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
          </div>
        ) : (
          royalProps && (
            <div className="royal" id="lista">
              {!admin ? (
                me ? (
                  <VistaContratista {...royalProps} c={me} />
                ) : (
                  <p className="meta">
                    Tu cuenta todavía no está vinculada a un contratista de esta
                    obra.
                  </p>
                )
              ) : view === "trabajos" ? (
                <Trabajos {...royalProps} />
              ) : view === "fases" ? (
                <Fases {...royalProps} />
              ) : view === "analisis" ? (
                <Analisis {...royalProps} />
              ) : view === "cronograma" ? (
                <Cronograma {...royalProps} />
              ) : view === "materiales" ? (
                <Materiales {...royalProps} />
              ) : view === "espacios" ? (
                <Espacios {...royalProps} />
              ) : (
                <Contratistas {...royalProps} />
              )}
            </div>
          )
        )}
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
      {accessTarget && (
        <Modal
          title={accessTarget.linked ? "Cambiar código" : "Crear acceso"}
          busy={inviteBusy}
          onClose={() => setAccessTarget(null)}
        >
          <form className="entity-form" onSubmit={saveAccess}>
            <p className="confirm-text">
              Código de 6 números para <strong>{accessTarget.name}</strong>.
              Compártelo solo con esa persona.
            </p>
            <div className="form-grid">
              <label className="form-field">
                <span>Código</span>
                <input
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label className="form-field">
                <span>Repetir código</span>
                <input
                  name="pin_confirm"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="new-password"
                  required
                />
              </label>
            </div>
            {accessError && <ErrorBox message={accessError} />}
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                disabled={inviteBusy}
                onClick={() => setAccessTarget(null)}
              >
                Cancelar
              </button>
              <button className="button" type="submit" disabled={inviteBusy}>
                {inviteBusy ? "Guardando…" : "Guardar código"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {editor && project && royal && ROYAL_FORMS.includes(editor.resource) && (
        <div className="royal">
          <RoyalForm
            key={`${editor.resource}-${editor.record?.id || "new"}`}
            resource={editor.resource}
            record={editor.record || {}}
            data={data}
            r={royal}
            projectId={project.id}
            onSave={save}
            refresh={refresh}
            notify={notify}
            onClose={() => setEditor(null)}
          />
        </div>
      )}
      {editor &&
        !(project && royal && ROYAL_FORMS.includes(editor.resource)) && (
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
