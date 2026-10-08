# Conexión y publicación

La aplicación se programa y verifica sin Docker ni Supabase local. La cuenta y el proyecto nuevo de Supabase los está preparando el responsable designado. El repositorio es `dmarie120302/royalpalace_33`. No enlazar proyectos existentes de otros productos ni aplicar migraciones mientras falte esa conexión.

## Proyecto independiente de Supabase

Cuando el proyecto nuevo esté disponible, confirma su organización y referencia. La migración inicial está en `supabase/migrations/20261008204006_initial_schema.sql`; incluye tablas, relaciones, funciones, RLS y el bucket privado de comprobantes. Aplica la migración mediante la integración GitHub de Supabase o el SQL Editor del proyecto elegido, de acuerdo con el flujo acordado. No necesita registros ficticios ni una base local para iniciar. [Migraciones de Supabase](https://supabase.com/docs/guides/deployment/database-migrations).

Para conectar el repositorio `royalpalace_33` en la integración GitHub de Supabase, usa working directory `.` y rama de producción `main`, con despliegue a producción habilitado. Mantén automatic branching desactivado según la configuración acordada para el plan gratuito. Esto define el flujo futuro; no significa que el enlace GitHub o un despliegue ya estén creados o verificados.

Obtén la URL y la clave publishable del Connect dialog del proyecto y completa `.env.local` con las variables de `.env.example`. La clave secret es opcional y habilita invitaciones y el alta inicial desde el servidor. Reinicia Next.js después de cambiar variables. [Claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

## Primera cuenta e invitaciones

1. Con la URL y clave secret guardadas en `.env.local` del proyecto nuevo, ejecuta `npm run setup:admin` en una terminal interactiva. El script pide correo y contraseña, oculta la contraseña al escribir y crea una cuenta confirmada con `app_metadata.app_role=admin`. La aplicación no ofrece alta pública. Crear una cuenta manualmente sin ese atributo no le concede la capacidad de crear obras. El script crea un usuario nuevo; no convierte una cuenta existente en administración.
2. Configura en Auth la Site URL y la lista de redirect URLs para el dominio elegido y las rutas de callback de la aplicación. Para desarrollo de Next.js utiliza `http://localhost:3100`; para el dominio público utiliza HTTPS. Los valores deben coincidir con `NEXT_PUBLIC_SITE_URL` y las rutas implementadas.
3. La cuenta administrativa entra con correo y contraseña y crea su primera obra. El propietario recibe administración sobre esa obra.
4. Crea el contratista dentro de la obra y registra su correo. La invitación debe dirigirse a ese correo exacto y su cuenta debe usar `app_metadata.app_role=contractor`; cuando la cuenta entra, el sistema reclama sus asignaciones autorizadas.
5. Usa un proveedor SMTP propio para correos operativos y verifica que una invitación llega a una dirección real y abre el dominio correcto. Sin `SUPABASE_SECRET_KEY`, crea o invita esa cuenta manualmente desde Supabase; las demás funciones de datos siguen usando la clave publishable.

Estos pasos escriben en el proyecto seleccionado y sólo se realizan cuando el responsable entregue su configuración. La clave secret queda en el entorno del servidor. Nunca se usa como contraseña de un usuario ni se copia a campos del navegador. [Invitaciones](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Publicación de Next.js

El hosting debe ejecutar Node.js compatible con `package.json`, instalar con `npm ci` y compilar con `npm run build`. Configura por entorno las variables indicadas en `.env.example`. Las variables `NEXT_PUBLIC_` se incorporan al bundle durante la compilación: cambiar de proyecto Supabase o de dominio requiere una nueva compilación.

Antes de publicar revisa `npm audit`, las actualizaciones estables y los avisos del proveedor. Una auditoría de dependencias sin hallazgos sólo evalúa paquetes conocidos; no sustituye los controles de permisos y archivos.

Con el backend entregado, valida la [matriz de aceptación](testing.md) antes de introducir datos operativos. Comprueba acceso administrativo, acceso de un contratista, importes y descarga de comprobantes desde el dominio público. Un build local o un smoke con configuración pendiente no prueba ese recorrido.

Los registros y comprobantes requieren respaldos acordes al uso. Conserva respaldo de PostgreSQL y archivos de Storage y comprueba su recuperación antes de depender exclusivamente de la plataforma.

## Estado de seguridad de las versiones

La base usa Next.js 16.4.0, estable al 8 de octubre de 2026. El proveedor anunció una actualización de seguridad para el 14 de octubre; al publicar, comprueba el aviso y actualiza a la versión corregida cuando esté disponible. El anuncio todavía no detalla las versiones afectadas. [Aviso oficial](https://nextjs.org/blog/upcoming-nextjs-security-update-october-2026).
