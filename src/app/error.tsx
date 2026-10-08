"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>No pudimos cargar tus obras</h1>
        <p>
          Revisa la conexión e inténtalo de nuevo. Si es el primer acceso,
          comprueba que las migraciones estén aplicadas.
        </p>
        <button className="button primary" onClick={reset}>
          Intentar de nuevo
        </button>
      </section>
    </main>
  );
}
