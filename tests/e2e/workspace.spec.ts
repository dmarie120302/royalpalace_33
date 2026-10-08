import { expect, test } from "@playwright/test";
import { login, origin, workspace } from "./helpers";

const enabled = process.env.E2E_BACKEND === "real";
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const contractorEmail = process.env.E2E_CONTRACTOR_EMAIL;
const contractorPassword = process.env.E2E_CONTRACTOR_PASSWORD;
const writesAllowed = process.env.E2E_ALLOW_WRITES === "1";

test.describe("backend real", () => {
  test.skip(
    !enabled || !adminEmail || !adminPassword,
    "Requiere Supabase configurado y credenciales de una cuenta de pruebas.",
  );

  test("entra con Auth real y conserva la sesión al recargar", async ({
    page,
    context,
  }) => {
    await login(page, adminEmail!, adminPassword!);
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Cada obra, en su lugar.",
        exact: true,
      }),
    ).toBeVisible();
    await workspace(context);
  });

  test("crea, persiste, edita y archiva una obra mediante la interfaz", async ({
    page,
    context,
  }) => {
    test.skip(
      !writesAllowed,
      "Las escrituras deben activarse expresamente en una base de pruebas.",
    );
    const projectName = `E2E temporal ${Date.now()} ${Math.random().toString(16).slice(2, 8)}`;
    let projectId: string | undefined;
    let archived = false;
    await login(page, adminEmail!, adminPassword!);
    try {
      await page
        .getByRole("button", { name: "Nueva obra", exact: true })
        .first()
        .click();
      const createDialog = page.getByRole("dialog", {
        name: "Nueva obra",
        exact: true,
      });
      await createDialog
        .getByLabel("Nombre de la obra", { exact: true })
        .fill(projectName);
      await createDialog
        .getByLabel("Presupuesto de la obra", { exact: true })
        .fill("1234.56");
      const saved = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/entities/projects") &&
          response.request().method() === "POST",
      );
      await createDialog
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click();
      const created = await saved;
      expect(created.status()).toBe(201);
      projectId = ((await created.json()) as { id: string }).id;
      await expect(createDialog).not.toBeVisible();
      await page.reload();
      const stored = (await workspace(context)).projects.find(
        (project) => project.id === projectId,
      );
      expect(stored).toMatchObject({
        name: projectName,
        budget_cents: 123456,
        archived_at: null,
      });
      await expect(
        page.getByRole("heading", { name: projectName, exact: true }),
      ).toBeVisible();

      await page
        .getByRole("button", { name: `Editar ${projectName}`, exact: true })
        .click();
      const editDialog = page.getByRole("dialog", {
        name: "Editar obra",
        exact: true,
      });
      await editDialog
        .getByLabel("Presupuesto de la obra", { exact: true })
        .fill("1500.01");
      await editDialog
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click();
      await expect(editDialog).not.toBeVisible();
      expect(
        (await workspace(context)).projects.find(
          (project) => project.id === projectId,
        )?.budget_cents,
      ).toBe(150001);

      await page
        .getByRole("button", { name: `Archivar ${projectName}`, exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Archivar registro", exact: true })
        .getByRole("button", { name: "Archivar", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: projectName, exact: true }),
      ).toHaveCount(0);
      archived = true;
      expect(
        (await workspace(context)).projects.find(
          (project) => project.id === projectId,
        )?.archived_at,
      ).toBeTruthy();
      await page
        .getByRole("button", { name: "Ver archivadas", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: projectName, exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: `Recuperar ${projectName}`, exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Recuperar registro", exact: true })
        .getByRole("button", { name: "Recuperar", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: projectName, exact: true }),
      ).toHaveCount(0);
      archived = false;
      expect(
        (await workspace(context)).projects.find(
          (project) => project.id === projectId,
        )?.archived_at,
      ).toBeNull();
    } finally {
      if (projectId && !archived) {
        const response = await context.request.patch(
          `/api/entities/projects/${projectId}`,
          { headers: { Origin: origin }, data: { archived: true } },
        );
        expect(
          response.ok(),
          "El registro temporal debe quedar archivado también si el flujo falla",
        ).toBe(true);
      }
    }
  });

  test("otra cuenta no puede leer ni archivar la obra privada de administración", async ({
    page,
    context,
    browser,
  }) => {
    test.skip(
      !writesAllowed || !contractorEmail || !contractorPassword,
      "Requiere dos cuentas diferentes y autorización de escrituras en la base de pruebas.",
    );
    expect(contractorEmail).not.toBe(adminEmail);
    await login(page, adminEmail!, adminPassword!);
    const name = `E2E aislamiento ${Date.now()} ${Math.random().toString(16).slice(2, 8)}`;
    const created = await context.request.post("/api/entities/projects", {
      headers: { Origin: origin },
      data: { name, budget_cents: 10000 },
    });
    expect(created.status()).toBe(201);
    const projectId = ((await created.json()) as { id: string }).id;
    const outsider = await browser.newContext({ baseURL: origin });
    try {
      const outsiderPage = await outsider.newPage();
      await login(outsiderPage, contractorEmail!, contractorPassword!);
      await expect(
        outsiderPage.getByRole("button", { name: "Nueva obra", exact: true }),
      ).toHaveCount(0);
      expect(
        (await workspace(outsider)).projects.some(
          (project) => project.id === projectId,
        ),
      ).toBe(false);
      const denied = await outsider.request.patch(
        `/api/entities/projects/${projectId}`,
        { headers: { Origin: origin }, data: { archived: true } },
      );
      expect([403, 404]).toContain(denied.status());
      const createDenied = await outsider.request.post(
        "/api/entities/projects",
        {
          headers: { Origin: origin },
          data: { name: "No autorizada", budget_cents: 100 },
        },
      );
      expect(createDenied.status()).toBe(403);
      expect(
        (await workspace(context)).projects.find(
          (project) => project.id === projectId,
        )?.archived_at,
      ).toBeNull();
    } finally {
      await outsider.close();
      const cleanup = await context.request.patch(
        `/api/entities/projects/${projectId}`,
        { headers: { Origin: origin }, data: { archived: true } },
      );
      expect(cleanup.ok()).toBe(true);
    }
  });
});
