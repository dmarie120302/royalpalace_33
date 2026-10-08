"use client";
import { useEffect, useState } from "react";
import { browserClient } from "@/infrastructure/supabase/browser";
import { AuthCover } from "@/components/auth-cover";
import { isValidPin } from "@/domain/access";
export default function Account() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const access = hash.get("access_token");
        const refresh = hash.get("refresh_token");
        // Admin invitations can use a token fragment while password recovery
        // uses PKCE. Remove token fragments before creating the PKCE client.
        if (access && refresh)
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
        const db = browserClient();
        if (access && refresh) {
          const result = await db.auth.setSession({
            access_token: access,
            refresh_token: refresh,
          });
          if (result.error) throw result.error;
        }
        const result = await db.auth.getUser();
        if (result.error || !result.data.user)
          throw new Error("Invalid access link");
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled)
          setMessage(
            "Inicia sesión con tu usuario y código para cambiar tu código.",
          );
      }
    }
    void initialize();
    return () => {
      cancelled = true;
    };
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== form.get("confirm")) {
      setMessage("Los códigos deben coincidir.");
      setBusy(false);
      return;
    }
    if (!isValidPin(password)) {
      setMessage("El código debe tener exactamente 6 números.");
      setBusy(false);
      return;
    }
    try {
      const db = browserClient();
      const { error } = await db.auth.updateUser({ password });
      if (error) throw error;
      window.history.replaceState(null, "", "/account");
      window.location.assign("/");
    } catch {
      setMessage(
        "No se pudo actualizar el código. Inicia sesión e inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <AuthCover />
        <h1>Cambia tu código</h1>
        <p>Tu código debe tener 6 números.</p>
        <form onSubmit={submit}>
          <label htmlFor="password">Nuevo código</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
          />
          <label htmlFor="confirm">Repetir código</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
          />
          {message && (
            <p role="alert" className="form-error">
              {message}
            </p>
          )}
          <button className="button primary" disabled={busy || !ready}>
            {busy ? "Guardando…" : "Guardar código"}
          </button>
        </form>
      </section>
    </main>
  );
}
