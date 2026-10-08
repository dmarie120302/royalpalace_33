"use client";
import { useState } from "react";
import Link from "next/link";
import { browserClient } from "@/infrastructure/supabase/browser";
import { supabaseConfig } from "@/infrastructure/supabase/config";
import { AuthCover } from "@/components/auth-cover";
export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const db = browserClient();
      const email = String(form.get("email"));
      if (reset) {
        const { error } = await db.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/account`,
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await db.auth.signInWithPassword({
          email,
          password: String(form.get("password")),
        });
        if (error) throw error;
        window.location.assign("/");
      }
    } catch {
      setError(
        reset
          ? "No se pudo solicitar el enlace. Inténtalo de nuevo."
          : "No se pudo entrar. Revisa el correo y la contraseña.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <AuthCover />
        <h1>{reset ? "Recupera tu acceso" : "Ingresa a tu cuenta"}</h1>
        <p>
          {reset
            ? "Te enviaremos un enlace para crear una nueva contraseña."
            : "Entra con tu correo y contraseña."}
        </p>
        {!supabaseConfig() ? (
          <>
            <p>La conexión del proyecto está pendiente.</p>
            <Link href="/setup">Ver configuración</Link>
          </>
        ) : sent ? (
          <output>
            <p>Si la cuenta existe, recibirás un enlace en tu correo.</p>
            <button
              className="button primary"
              onClick={() => {
                setReset(false);
                setSent(false);
              }}
            >
              Volver al acceso
            </button>
          </output>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            {!reset && (
              <>
                <label htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy} type="submit">
              {busy ? "Un momento…" : reset ? "Enviar enlace" : "Entrar"}
            </button>
            <button
              className="button quiet"
              type="button"
              disabled={busy}
              onClick={() => {
                setReset(!reset);
                setError("");
              }}
            >
              {reset ? "Volver al acceso" : "Olvidé mi contraseña"}
            </button>
          </form>
        )}
        <p className="auth-note">
          Administración y contratistas acceden con su propia cuenta.
        </p>
      </section>
    </main>
  );
}
