import Link from "next/link";
import { AuthCover } from "@/components/auth-cover";
export default function Setup() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <AuthCover />
        <h1>Conecta tu proyecto</h1>
        <p>
          La aplicación está preparada para un proyecto independiente de
          Supabase. Configura su conexión para comenzar.
        </p>
        <ol>
          <li>
            Aplica las migraciones de <code>supabase/migrations</code> en tu
            proyecto nuevo.
          </li>
          <li>
            Crea el primer administrador con el comando npm run setup:admin
            después de configurar las variables.
          </li>
          <li>
            Configura estas variables en <code>.env.local</code> o en el
            alojamiento de la web:
          </li>
        </ol>
        <pre>
          NEXT_PUBLIC_SUPABASE_URL={"\n"}NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
          {"\n"}NEXT_PUBLIC_SITE_URL={"\n"}SUPABASE_SECRET_KEY=
        </pre>
        <p>
          La clave privada se utiliza exclusivamente en el servidor para invitar
          contratistas. Reinicia la aplicación después de configurar las
          variables.
        </p>
        <Link className="button primary" href="/login">
          Ir al acceso
        </Link>
      </section>
    </main>
  );
}
