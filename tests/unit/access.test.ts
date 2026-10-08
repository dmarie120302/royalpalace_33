import { describe, expect, it } from "vitest";
import {
  emailToUsername,
  isValidPin,
  isValidUsername,
  loginEmail,
  usernameToEmail,
} from "../../src/domain/access";

describe("acceso por usuario y código", () => {
  it("convierte el usuario en la dirección interna y viceversa", () => {
    expect(usernameToEmail(" Carlos ")).toBe("carlos@royalpalace33.vercel.app");
    expect(emailToUsername("carlos@royalpalace33.vercel.app")).toBe("carlos");
    expect(emailToUsername("otra@ejemplo.com")).toBe("otra@ejemplo.com");
    expect(usernameToEmail("")).toBe("");
  });
  it("permite entrar con usuario o con un correo heredado", () => {
    expect(loginEmail("admin")).toBe("admin@royalpalace33.vercel.app");
    expect(loginEmail("Persona@Ejemplo.com")).toBe("persona@ejemplo.com");
  });
  it("valida usuarios y PIN de 6 números", () => {
    expect(isValidUsername("carlos.p")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("con espacio")).toBe(false);
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("1234")).toBe(false);
    expect(isValidPin("12345a")).toBe(false);
  });
});
