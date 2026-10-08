import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { projectSummary } from "../../src/domain/finance";
import { login, origin, workspace } from "./helpers";

const enabled =
  process.env.E2E_BACKEND === "real" && process.env.E2E_ALLOW_WRITES === "1";
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const contractorEmail = process.env.E2E_CONTRACTOR_EMAIL;
const contractorPassword = process.env.E2E_CONTRACTOR_PASSWORD;
const receipt = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
  "base64",
);

async function save(page: Page, dialog: Locator, resource: string) {
  const result = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/entities/${resource}`) &&
      response.request().method() === "POST",
  );
  await dialog
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  const response = await result;
  expect(response.status()).toBe(201);
  const { id } = (await response.json()) as { id: string };
  await expect(dialog).not.toBeVisible();
  return id;
}

async function section(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).first().click();
}

test.describe("ciclo de una obra con backend real", () => {
  test.skip(
    !enabled || !adminEmail || !adminPassword,
    "Requiere backend aislado y autorización de escrituras.",
  );

  test("organiza, asigna, registra pagos y materiales, adjunta y exporta sin duplicar gastos", async ({
    page,
    context,
    browser,
  }, testInfo) => {
    test.setTimeout(180_000);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    const names = {
      project: `E2E ciclo ${suffix}`,
      space: `Sala ${suffix}`,
      phase: `Terminaciones ${suffix}`,
      category: `Pinturas ${suffix}`,
      contractor: `Contratista ${suffix}`,
      work: `Pintura ${suffix}`,
      material: `Pintura cubierta ${suffix}`,
      extra: `Brochas ${suffix}`,
    };
    let projectId: string | undefined;
    await login(page, adminEmail!, adminPassword!);
    try {
      await page
        .getByRole("button", { name: "Nueva obra", exact: true })
        .first()
        .click();
      const projectDialog = page.getByRole("dialog", {
        name: "Nueva obra",
        exact: true,
      });
      await projectDialog
        .getByLabel("Nombre de la obra", { exact: true })
        .fill(names.project);
      await projectDialog
        .getByLabel("Presupuesto de la obra", { exact: true })
        .fill("5000.00");
      projectId = await save(page, projectDialog, "projects");
      await page
        .getByRole("button", { name: `Abrir ${names.project}`, exact: true })
        .click();

      await section(page, "Organización");
      await page
        .getByRole("button", { name: "Nuevo espacio", exact: true })
        .click();
      const spaceDialog = page.getByRole("dialog", {
        name: "Nuevo espacio",
        exact: true,
      });
      await spaceDialog.getByLabel(/^Nombre/).fill(names.space);
      const spaceId = await save(page, spaceDialog, "spaces");
      await page.getByRole("tab", { name: "Fases", exact: true }).click();
      await page
        .getByRole("button", { name: "Nueva fase", exact: true })
        .click();
      const phaseDialog = page.getByRole("dialog", {
        name: "Nueva fase",
        exact: true,
      });
      await phaseDialog.getByLabel(/^Nombre/).fill(names.phase);
      await phaseDialog
        .getByRole("checkbox", { name: names.space, exact: true })
        .check();
      const phaseId = await save(page, phaseDialog, "phases");
      await page.getByRole("tab", { name: "Categorías", exact: true }).click();
      await page
        .getByRole("button", { name: "Nueva categoría", exact: true })
        .click();
      const categoryDialog = page.getByRole("dialog", {
        name: "Nueva categoría",
        exact: true,
      });
      await categoryDialog.getByLabel(/^Nombre/).fill(names.category);
      const categoryId = await save(page, categoryDialog, "categories");

      await section(page, "Contratistas");
      await page
        .getByRole("button", { name: "Nuevo contratista", exact: true })
        .first()
        .click();
      const contractorDialog = page.getByRole("dialog", {
        name: "Nuevo contratista",
        exact: true,
      });
      await contractorDialog.getByLabel(/^Nombre/).fill(names.contractor);
      await contractorDialog
        .getByLabel("Oficio / especialidad", { exact: true })
        .fill("Pintura");
      if (contractorEmail)
        await contractorDialog
          .getByLabel("Correo para invitar al portal", { exact: true })
          .fill(contractorEmail);
      const contractorId = await save(page, contractorDialog, "contractors");

      await section(page, "Trabajos");
      await page
        .getByRole("button", { name: "Nuevo trabajo", exact: true })
        .first()
        .click();
      const workDialog = page.getByRole("dialog", {
        name: "Nuevo trabajo",
        exact: true,
      });
      await workDialog
        .getByLabel("Nombre del trabajo", { exact: true })
        .fill(names.work);
      await workDialog
        .getByLabel("Presupuesto del trabajo", { exact: true })
        .fill("1000.00");
      await workDialog
        .getByLabel("Estado", { exact: true })
        .selectOption("in_progress");
      await workDialog
        .getByLabel("Fecha de inicio", { exact: true })
        .fill("2026-10-01");
      await workDialog
        .getByLabel("Fecha de entrega", { exact: true })
        .fill("2026-10-07");
      await workDialog
        .getByLabel("Fase", { exact: true })
        .selectOption(phaseId);
      await workDialog.getByLabel(/^Avance físico/).fill("25");
      await workDialog
        .getByRole("checkbox", { name: names.space, exact: true })
        .check();
      await workDialog
        .getByRole("checkbox", { name: names.contractor, exact: true })
        .check();
      await workDialog
        .getByLabel(`Monto asignado a ${names.contractor}`, { exact: true })
        .fill("750.00");
      const workId = await save(page, workDialog, "work_items");
      await expect(
        page.getByRole("progressbar", { name: "Avance físico", exact: true }),
      ).toHaveAttribute("aria-valuenow", "25");
      await page
        .getByRole("button", { name: `Editar ${names.work}`, exact: true })
        .click();
      const editWorkDialog = page.getByRole("dialog", {
        name: "Editar trabajo",
        exact: true,
      });
      await editWorkDialog.getByLabel(/^Avance físico/).fill("50");
      await save(page, editWorkDialog, "work_items");

      await page
        .getByRole("button", { name: "Registrar pago", exact: true })
        .first()
        .click();
      const paymentDialog = page.getByRole("dialog", {
        name: "Nuevo pago",
        exact: true,
      });
      await paymentDialog
        .getByLabel("Trabajo", { exact: true })
        .selectOption(workId);
      await paymentDialog
        .getByLabel(/^Beneficiario/)
        .selectOption(contractorId);
      await paymentDialog
        .getByLabel("Monto pagado", { exact: true })
        .fill("300.01");
      await paymentDialog
        .getByLabel("Descripción", { exact: true })
        .fill(`Anticipo ${suffix}`);
      const paymentId = await save(page, paymentDialog, "payments");
      const afterPayment = await workspace(context);
      expect(
        afterPayment.works.find((work) => work.id === workId),
      ).toMatchObject({
        progress: 50,
        phase_id: phaseId,
        space_ids: [spaceId],
        assignments: [
          {
            work_item_id: workId,
            contractor_id: contractorId,
            allocation_cents: 75000,
          },
        ],
      });
      expect(
        afterPayment.payments.find((payment) => payment.id === paymentId)
          ?.amount_cents,
      ).toBe(30001);

      await section(page, "Pagos");
      await page.getByRole("button", { name: /^Editar pago / }).click();
      const editPaymentDialog = page.getByRole("dialog", {
        name: "Editar pago",
        exact: true,
      });
      await editPaymentDialog
        .getByLabel("Monto pagado", { exact: true })
        .fill("320.01");
      await save(page, editPaymentDialog, "payments");
      await page
        .getByRole("button", { name: /^Comprobantes del pago / })
        .click();
      const receiptDialog = page.getByRole("dialog", {
        name: /^Comprobantes del pago/,
      });
      const uploaded = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/attachments") &&
          response.request().method() === "POST",
      );
      await receiptDialog
        .locator('input[type="file"]')
        .setInputFiles({
          name: "comprobante-test.png",
          mimeType: "image/png",
          buffer: receipt,
        });
      const uploadResponse = await uploaded;
      expect(uploadResponse.status()).toBe(201);
      const attachmentId = ((await uploadResponse.json()) as { id: string }).id;
      await expect(
        receiptDialog.getByRole("link", { name: /comprobante-test\.png/ }),
      ).toBeVisible();
      const downloaded = await context.request.get(
        `/api/attachments/${attachmentId}`,
      );
      expect(downloaded.ok()).toBe(true);
      expect(await downloaded.body()).toEqual(receipt);
      await receiptDialog
        .getByRole("button", { name: "Cerrar", exact: true })
        .last()
        .click();

      await section(page, "Materiales");
      await page
        .getByRole("button", { name: "Nueva compra", exact: true })
        .first()
        .click();
      const materialDialog = page.getByRole("dialog", {
        name: "Nueva compra de materiales",
        exact: true,
      });
      await materialDialog
        .getByLabel("Qué compraste", { exact: true })
        .fill(names.material);
      await materialDialog
        .getByLabel("Tienda / proveedor", { exact: true })
        .fill("Proveedor de pruebas");
      await materialDialog
        .getByLabel("Monto de la compra", { exact: true })
        .fill("150.00");
      await materialDialog
        .getByLabel("Trabajo", { exact: true })
        .selectOption(workId);
      await materialDialog
        .getByLabel("Contratista", { exact: true })
        .selectOption(contractorId);
      await materialDialog
        .getByLabel("Fase", { exact: true })
        .selectOption(phaseId);
      await materialDialog
        .getByLabel("Categoría", { exact: true })
        .selectOption(categoryId);
      await materialDialog
        .getByRole("checkbox", { name: names.space, exact: true })
        .check();
      await materialDialog
        .getByLabel(/^¿Esta compra ya está incluida/)
        .selectOption(paymentId);
      const materialId = await save(page, materialDialog, "material_purchases");
      await page
        .getByRole("button", { name: "Nueva compra", exact: true })
        .first()
        .click();
      const extraDialog = page.getByRole("dialog", {
        name: "Nueva compra de materiales",
        exact: true,
      });
      await extraDialog
        .getByLabel("Qué compraste", { exact: true })
        .fill(names.extra);
      await extraDialog
        .getByLabel("Tienda / proveedor", { exact: true })
        .fill("Proveedor de pruebas");
      await extraDialog
        .getByLabel("Monto de la compra", { exact: true })
        .fill("50.50");
      const extraId = await save(page, extraDialog, "material_purchases");
      expect(projectSummary(await workspace(context), projectId)).toMatchObject(
        { paid: 32001, materials: 5050, spent: 37051, physicalProgress: 50 },
      );
      await page
        .getByRole("button", { name: `Editar ${names.extra}`, exact: true })
        .click();
      const editExtraDialog = page.getByRole("dialog", {
        name: "Editar compra de materiales",
        exact: true,
      });
      await editExtraDialog
        .getByLabel("Monto de la compra", { exact: true })
        .fill("60.50");
      await save(page, editExtraDialog, "material_purchases");
      expect(
        (await workspace(context)).materials.find(
          (material) => material.id === extraId,
        )?.amount_cents,
      ).toBe(6050);

      await section(page, "Cronograma");
      await expect(page.getByText(names.work, { exact: true })).toBeVisible();
      await page
        .getByLabel("Agrupar por", { exact: true })
        .selectOption("phase");
      await expect(
        page.getByRole("heading", { name: names.phase, exact: true }),
      ).toBeVisible();
      await section(page, "Reportes");
      await page.screenshot({
        path: testInfo.outputPath("reportes.png"),
        fullPage: true,
      });
      const downloadPromise = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Exportar movimientos CSV", exact: true })
        .click();
      const csv = await downloadPromise;
      expect(csv.suggestedFilename()).toMatch(/-movimientos\.csv$/);
      const csvPath = await csv.path();
      expect(csvPath).toBeTruthy();
      const content = await readFile(csvPath!, "utf8");
      expect(content).toContain('"320.01"');
      expect(content).toContain('"60.50"');
      expect(content).toContain(`"${paymentId}"`);
      expect(content).toContain(`"${materialId}"`);
      expect(content).toContain(names.contractor);

      if (contractorEmail && contractorPassword) {
        const contractorContext = await browser.newContext({ baseURL: origin });
        try {
          const contractorPage = await contractorContext.newPage();
          await login(contractorPage, contractorEmail, contractorPassword);
          const visible = await workspace(contractorContext);
          expect(
            visible.projects.some((project) => project.id === projectId),
          ).toBe(true);
          expect(visible.works.some((work) => work.id === workId)).toBe(true);
          expect(
            visible.payments.some((payment) => payment.id === paymentId),
          ).toBe(true);
          expect(
            visible.materials.some((material) => material.id === extraId),
          ).toBe(false);
          await contractorPage
            .getByRole("button", {
              name: `Abrir ${names.project}`,
              exact: true,
            })
            .click();
          await expect(
            contractorPage.getByRole("button", {
              name: "Organización",
              exact: true,
            }),
          ).toHaveCount(0);
          await expect(
            contractorPage.getByRole("button", {
              name: "Registrar pago",
              exact: true,
            }),
          ).toHaveCount(0);
          const contractorDownload = await contractorContext.request.get(
            `/api/attachments/${attachmentId}`,
          );
          expect(contractorDownload.ok()).toBe(true);
          expect(await contractorDownload.body()).toEqual(receipt);
          const denied = await contractorContext.request.patch(
            `/api/entities/payments/${paymentId}`,
            { headers: { Origin: origin }, data: { archived: true } },
          );
          expect(denied.status()).toBe(403);
        } finally {
          await contractorContext.close();
        }
      }

      await section(page, "Pagos");
      await page.getByRole("button", { name: /^Archivar pago / }).click();
      await page
        .getByRole("dialog", { name: "Archivar registro", exact: true })
        .getByRole("button", { name: "Archivar", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: /^Archivar pago / }),
      ).toHaveCount(0);
      const afterArchive = await workspace(context);
      expect(
        afterArchive.materials.find((material) => material.id === materialId)
          ?.covered_by_payment_id,
      ).toBe(paymentId);
      expect(projectSummary(afterArchive, projectId)).toMatchObject({
        paid: 0,
        materials: 21050,
        spent: 21050,
      });
      await section(page, "Organización");
      await page.getByRole("tab", { name: "Archivados", exact: true }).click();
      await page
        .getByRole("button", {
          name: `Recuperar Anticipo ${suffix}`,
          exact: true,
        })
        .click();
      await page
        .getByRole("dialog", { name: "Recuperar registro", exact: true })
        .getByRole("button", { name: "Recuperar", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: `Recuperar Anticipo ${suffix}`,
          exact: true,
        }),
      ).toHaveCount(0);
      const afterRestore = await workspace(context);
      expect(
        afterRestore.payments.find((payment) => payment.id === paymentId)
          ?.archived_at,
      ).toBeNull();
      expect(projectSummary(afterRestore, projectId)).toMatchObject({
        paid: 32001,
        materials: 6050,
        spent: 38051,
      });
    } finally {
      if (projectId) {
        const cleanup = await context.request.patch(
          `/api/entities/projects/${projectId}`,
          { headers: { Origin: origin }, data: { archived: true } },
        );
        expect(
          cleanup.ok(),
          "La obra temporal debe quedar archivada al finalizar",
        ).toBe(true);
      }
    }
  });
});
