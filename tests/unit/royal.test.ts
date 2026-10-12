import { describe, expect, it } from "vitest";
import { aDia, diasHabiles, esFinDeSemana } from "../../src/features/royal/model";

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
