"use client";
import { useState } from "react";
import Link from "next/link";
import { browserClient } from "@/infrastructure/supabase/browser";
import { supabaseConfig } from "@/infrastructure/supabase/config";
import { AuthCover } from "@/components/auth-cover";
import { loginEmail } from "@/domain/access";
export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const { error } = await browserClient().auth.signInWithPassword({
        email: loginEmail(String(form.get("username"))),
        password: String(form.get("code")),
      });
      if (error) throw error;
      window.location.assign("/");
    } catch {
      setError("No se pudo entrar. Revisa el usuario y el código.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <AuthCover />
        <h1>Ingresa a tu cuenta</h1>
        <p>Escribe tu usuario y tu código.</p>
        {!supabaseConfig() ? (
          <>
            <p>La conexión del proyecto está pendiente.</p>
            <Link href="/setup">Ver configuración</Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
            <label htmlFor="code">Código</label>
            <input
              id="code"
              name="code"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              required
            />
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy} type="submit">
              {busy ? "Un momento…" : "Entrar"}
            </button>
          </form>
        )}
        <p className="auth-note">
          ¿Olvidaste tu código? Pide a administración que te asigne uno nuevo.
        </p>
      </section>
    </main>
  );
}
