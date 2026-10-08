import { expect, test } from "@playwright/test";

test.describe("configuración pendiente", () => {
  test.skip(
    process.env.E2E_BACKEND === "real",
    "Este grupo comprueba el inicio sin backend configurado.",
  );

  test("explica cómo conectar Supabase sin mostrar datos operativos inventados", async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page).toHaveURL(/\/setup(?:\?|$)/);
    await expect(
      page.getByRole("heading", { name: "Conecta tu proyecto", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("NEXT_PUBLIC_SUPABASE_URL", { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page
        .getByText("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", { exact: false })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nueva obra", exact: true }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("setup.png"),
      fullPage: true,
    });
  });

  test("rechaza una escritura sin origen válido antes de tocar la base", async ({
    request,
  }) => {
    const response = await request.post("/api/entities/projects", {
      data: { name: "Entrada inválida", budget_cents: 0 },
    });
    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({
      error: "Origen de solicitud inválido.",
    });
  });
});
