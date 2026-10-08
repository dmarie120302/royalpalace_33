import { expect, type BrowserContext, type Page } from "@playwright/test";
import type { Workspace } from "../../src/domain/types";

export const origin = new URL(
  process.env.E2E_BASE_URL || "http://127.0.0.1:3100",
).origin;

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Usuario", { exact: true }).fill(email);
  await page.getByLabel("Código", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cada obra, en su lugar.", exact: true }),
  ).toBeVisible();
}

export async function workspace(context: BrowserContext): Promise<Workspace> {
  const response = await context.request.get("/api/workspace");
  expect(response.ok()).toBe(true);
  return (await response.json()) as Workspace;
}
