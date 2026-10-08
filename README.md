# Obra Clara

Gestión de varias obras para administración y contratistas. La aplicación reemplaza la plantilla HTML de PH 33 Royal Palace por Next.js, TypeScript y Supabase: los registros se comparten mediante PostgreSQL, las cuentas usan Supabase Auth y los comprobantes se guardan en Storage privado.

## Desarrollo

Requiere Node.js 26 o una versión LTS compatible (22.12+ o 24); no requiere Docker ni Supabase local. Las versiones de las dependencias están fijadas en `package.json` y `package-lock.json`.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

La aplicación abre en <http://localhost:3100>. Sin URL y clave pública de Supabase muestra la configuración pendiente; no presenta obras inventadas ni almacena datos operativos en el navegador.

Completa `.env.local` con los valores del proyecto de Supabase:

| Variable                               | Uso                                                                                                |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto.                                                                                  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública `sb_publishable_…`; los permisos dependen de Auth y RLS.                             |
| `NEXT_PUBLIC_APP_NAME`                 | Nombre visible; inicialmente Obra Clara.                                                           |
| `NEXT_PUBLIC_SITE_URL`                 | URL exacta de la aplicación para los enlaces de acceso.                                            |
| `SUPABASE_SECRET_KEY`                  | Opcional, sólo en el servidor para invitaciones administrativas; nunca debe llevar `NEXT_PUBLIC_`. |

No guardes secretos, contraseñas ni sesiones de pruebas en Git. La clave secret omite RLS; el resto del acceso a datos utiliza la sesión del usuario y la clave publishable. [Claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

La base de datos requiere la migración en `supabase/migrations`. Sigue la [guía de operación](docs/operations.md) para conectar el backend, crear la primera cuenta y configurar invitaciones.

## Verificación

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

El E2E predeterminado verifica el estado sin backend conectado. Las pruebas con cuentas y escritura reales requieren activar el modo descrito en [pruebas](docs/testing.md). Un smoke sin backend no valida Auth, Storage ni RLS.

La [arquitectura](docs/architecture.md) explica módulos, reglas financieras y permisos. Los controles pendientes de validación operativa están en la [guía de pruebas](docs/testing.md).
