import { describe, expect, it } from "vitest";
import {
  aDia,
  diasHabiles,
  esFinDeSemana,
} from "../../src/features/royal/model";

describe("cronograma sin fines de semana", () => {
  it("reconoce sábados y domingos", () => {
    expect(esFinDeSemana(aDia("2026-10-10"))).toBe(true); // sábado
    expect(esFinDeSemana(aDia("2026-10-11"))).toBe(true); // domingo
    expect(esFinDeSemana(aDia("2026-10-12"))).toBe(false); // lunes
  });
  it("cuenta solo días hábiles", () => {
    expect(diasHabiles(aDia("2026-10-05"), aDia("2026-10-11"))).toBe(5);
    expect(diasHabiles(aDia("2026-10-10"), aDia("2026-10-11"))).toBe(0);
    expect(diasHabiles(aDia("2026-10-01"), aDia("2026-10-31"))).toBe(22);
  });
});

import { buildRoyal } from "../../src/features/royal/model";
import type { Project, Workspace } from "../../src/domain/types";

describe("orden de las fases", () => {
  it("respeta el orden en que se crearon, sin importar el orden guardado", () => {
    const project = { id: "p", archived_at: null } as Project;
    const fase = (id: string, name: string, created_at: string) => ({
      id,
      name,
      color: "#000000",
      icon: "casa",
      project_id: "p",
      created_at,
      archived_at: null,
      space_ids: [],
    });
    const data = {
      spaces: [],
      phases: [
        fase("c", "FASE 3", "2026-10-08T23:11:05Z"),
        fase("e", "FASE 5", "2026-10-08T23:11:47Z"),
        fase("a", "FASE 1", "2026-10-08T23:10:28Z"),
        fase("d", "FASE 4", "2026-10-08T23:11:27Z"),
        fase("b", "FASE 2", "2026-10-08T23:10:43Z"),
      ],
      categories: [],
      contractors: [],
      works: [],
      payments: [],
      materials: [],
      attachments: [],
      links: [],
    } as unknown as Workspace;
    expect(buildRoyal(data, project).fases.map((f) => f.nombre)).toEqual([
      "FASE 1",
      "FASE 2",
      "FASE 3",
      "FASE 4",
      "FASE 5",
    ]);
  });
});
