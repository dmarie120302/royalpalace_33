"use client";

import { useState } from "react";
import type { MutationInput, Resource, Workspace } from "@/domain/types";

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers:
      options?.body instanceof FormData
        ? options.headers
        : { "Content-Type": "application/json", ...options?.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      result.error ||
        result.message ||
        "No se pudo completar la operación. Intenta de nuevo.",
    );
  return result as T;
}
export function useWorkspace(initialData: Workspace) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  function notify(message: string, error = false) {
    setNotice({ message, error });
  }
  async function refresh() {
    setRefreshing(true);
    try {
      const next = await api<Workspace>("/api/workspace");
      setData(next);
    } finally {
      setRefreshing(false);
    }
  }
  async function save(resource: Resource, input: MutationInput) {
    const result = await api<{ id: string }>(`/api/entities/${resource}`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    await refresh();
    notify("Cambios guardados.");
    return result.id;
  }
  async function archive(resource: Resource, id: string, archived: boolean) {
    await api(`/api/entities/${resource}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ archived }),
    });
    await refresh();
    notify(archived ? "Registro archivado." : "Registro recuperado.");
  }
  return {
    data,
    refreshing,
    refresh,
    save,
    archive,
    notice,
    notify,
    dismissNotice: () => setNotice(null),
  };
}
export type WorkspaceController = ReturnType<typeof useWorkspace>;
