# Pruebas y aceptación

## Comprobaciones rápidas

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Las pruebas unitarias verifican importes exactos en centavos, materiales cubiertos por pagos sin doble conteo, aislamiento de resúmenes por obra, exclusión de movimientos archivados, conservación del presupuesto histórico de trabajos archivados, saldos y excedentes independientes por trabajo, avance físico independiente de pagos y fechas según Panamá. La validación comprueba entradas monetarias y fechas inválidas, asignaciones repetidas o superiores al presupuesto, avance fuera de rango, recursos desconocidos y campos de privilegios no permitidos.

## Navegador sin backend

```sh
npx playwright install chromium
npm run test:e2e
```

Playwright inicia una instancia de Next.js con las variables de Supabase vacías y comprueba la pantalla de conexión en tamaños de escritorio y celular. También verifica el rechazo de una escritura sin origen válido. No hay interceptores de API ni respuestas simuladas de Supabase. Los casos que requieren backend se omiten explícitamente.

El puerto 3100 debe estar libre. Si utilizas un servidor propio, configura `E2E_USE_EXISTING_SERVER=1` y `E2E_BASE_URL` con su URL; en ese modo debes asegurar que su configuración coincida con la suite elegida.

## Auth y datos reales en un entorno de pruebas

Requiere el esquema aplicado y una cuenta de Auth confirmada. Exporta en la sesión de terminal `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD` usando tu gestor de secretos. Las credenciales no pertenecen a archivos versionados. El modo real utiliza las variables del proceso para el servidor; no basta con ponerlas únicamente en `.env.local`.

```sh
E2E_BACKEND=real npm run test:e2e
```

Ese comando comprueba login y persistencia de sesión. Para crear una obra temporal, editarla y archivarla, habilita las escrituras únicamente contra un proyecto de pruebas autorizado después de recibir la configuración del nuevo Supabase:

```sh
E2E_BACKEND=real E2E_ALLOW_WRITES=1 npm run test:e2e
```

La prueba usa un nombre único con prefijo `E2E temporal`, confirma la persistencia del presupuesto y archiva el registro al terminar. El ciclo completo añade catálogos, asignaciones, pagos y compras, carga y descarga un comprobante privado, exporta CSV y comprueba el efecto de archivar y recuperar un pago sobre los materiales cubiertos. Para comprobar aislamiento entre cuentas, exporta además `E2E_CONTRACTOR_EMAIL` y `E2E_CONTRACTOR_PASSWORD` de una segunda cuenta. El caso de aislamiento crea una obra privada sin asignarla, verifica que esa cuenta no la puede ver ni archivar ni crear otra obra, y la archiva al terminar. No crea usuarios ni envía invitaciones.

Estos casos escriben en el backend seleccionado; no ejecutes el modo con escrituras contra obras operativas. El archivo conserva los registros de prueba. Las capturas y trazas de errores pueden contener datos o sesiones: quedan ignoradas por Git y deben tratarse como privadas.

## Base de datos y RLS

Las pruebas de políticas deben ejecutarse con el rol `authenticated` y el JWT del usuario correspondiente. Consultar como `postgres` o con clave secret omite RLS y no demuestra el aislamiento. Las pruebas SQL preparadas en `supabase/tests/database/access_and_finance_test.sql` usan pgTAP y una transacción con rollback. Se conservarán para ejecutarlas mediante un runner apropiado cuando esté autorizado el backend nuevo; no se instala ni arranca Supabase local para este trabajo. [Pruebas de base de datos](https://supabase.com/docs/guides/database/testing), [pruebas de RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

La aceptación requiere comprobar al menos:

| Caso                                                      | Resultado esperado                                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Usuario anónimo                                           | No consulta datos ni descarga comprobantes privados.                                         |
| Propietario de obra A                                     | Lee y modifica registros de A.                                                               |
| Administración miembro de A                               | Gestiona A según su rol.                                                                     |
| Usuario de obra B                                         | No consulta ni modifica A, incluso enviando sus UUID manualmente.                            |
| Contratista asignado a un trabajo de A                    | Sólo consulta trabajos y movimientos autorizados; no cambia importes, catálogos ni permisos. |
| Contratista sin obras                                     | No crea obras ni se asigna el rol de administración.                                         |
| Otro contratista de la misma obra                         | No consulta pagos y comprobantes del primero sin asignación autorizada.                      |
| Cambio de `owner_id`, membresía o `user_id` desde cliente | Rechazado.                                                                                   |
| Referencia cruzada A → B                                  | Rechazada en la base, además de la validación de API.                                        |
| Pago que cubre materiales                                 | No suma dos veces y mantiene una relación válida al editar o archivar.                       |
| Archivo/recuperación                                      | Conserva integridad, revierte su efecto en los resúmenes y respeta permisos.                 |
| Comprobante válido                                        | Se carga, puede descargarse por el usuario autorizado y no se expone públicamente.           |
| Archivo no permitido o demasiado grande                   | Se rechaza con un mensaje visible.                                                           |
| Invitación a correo real                                  | Llega, abre el dominio previsto y vincula sólo las asignaciones de ese correo.               |

## Límites de la evidencia

En la verificación del 8 de octubre de 2026, TypeScript, lint y build pasaron; `npm audit` reportó cero vulnerabilidades conocidas. El smoke de navegador pasó cuatro casos entre escritorio y celular, sin desbordamiento horizontal; ocho casos de backend se omitieron porque la conexión del proyecto nuevo sigue pendiente. La última ejecución unitaria pasó los 54 casos de las dos suites, incluidos los casos finales de archivo y saldos por trabajo.

El archivo pgTAP declara 65 comprobaciones preparadas, pendientes de ejecución. No se ejecutaron migraciones, pruebas SQL ni flujos reales de Auth, RLS, Storage o invitaciones. Estos resultados no acreditan un despliegue ni aceptación en producción.

Las pruebas unitarias prueban reglas en memoria. El smoke sin configuración prueba la página inicial y un rechazo de API. Un build prueba compilación. Para declarar la plataforma operativa hacen falta resultados de Auth, PostgreSQL, RLS, Storage y correo contra el backend seleccionado, además de repetir el recorrido desde el dominio público. Los casos omitidos por falta de entorno siguen pendientes.
