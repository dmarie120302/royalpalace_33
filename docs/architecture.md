# Arquitectura y reglas del negocio

## Capas

| Carpeta                       | Responsabilidad                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/domain`                  | Tipos, validación de entradas y cálculos financieros sin dependencia de React o Supabase.         |
| `src/application`             | Carga del espacio de trabajo, autenticación y autorización por obra; coordinación de operaciones. |
| `src/infrastructure/supabase` | Clientes de navegador, servidor y administración, con manejo de cookies y configuración.          |
| `src/app`                     | Rutas de Next.js, páginas y API.                                                                  |
| `src/features/workspace`      | Flujos de interfaz de obras, trabajos, pagos, materiales y catálogos.                             |
| `src/components`              | Componentes visuales reutilizables.                                                               |
| `supabase/migrations`         | Esquema, integridad de relaciones, funciones transaccionales, RLS y políticas de Storage.         |
| `tests`                       | Pruebas de reglas de negocio y flujos del navegador.                                              |

La interfaz llama a la API de Next.js. La API valida entradas estrictas, identifica al usuario con Supabase Auth y exige administración para modificar una obra. Las escrituras compuestas utilizan funciones de PostgreSQL para que el trabajo y sus relaciones se guarden juntos. Los clientes de datos normales conservan la sesión del usuario y quedan sujetos a RLS; el cliente con clave secret se reserva para gestionar invitaciones.

## Datos por obra

Una obra tiene propietario, estado, presupuesto y fechas. Espacios, fases, categorías y contratistas pertenecen a una obra. Los trabajos admiten varios espacios y asignaciones de contratistas; cada asignación establece un importe explícito. Los pagos identifican un trabajo y un contratista beneficiario. Las compras de materiales pueden relacionarse con esos catálogos y con un pago que ya cubre su importe. Los comprobantes tienen metadatos en la base y contenido en un bucket privado.

Las referencias deben pertenecer a la misma obra. Esa condición se exige en la base de datos, además de la autorización en la API. Ocultar un botón sólo mejora la interfaz: RLS y las funciones de escritura son la barrera de acceso.

## Importes y avance

- Todos los importes se almacenan como enteros en centavos. La entrada decimal admite hasta dos decimales, sin notación exponencial ni separadores ambiguos.
- Cada pago tiene un único beneficiario. Los importes asignados a varios contratistas no pueden superar el presupuesto del trabajo.
- Gasto real de la obra = pagos vigentes + compras de materiales vigentes que no estén cubiertas por un pago vigente. La relación de cobertura se conserva al archivar un pago; la compra vuelve a sumar durante el archivo y deja de sumar por separado al recuperar ese pago.
- Presupuesto comprometido = suma histórica de presupuestos de trabajos, incluidos los archivados; es distinto del presupuesto general de la obra. Archivar un trabajo no elimina su compromiso financiero ni sus pagos.
- Saldo pendiente = suma de los saldos positivos de cada trabajo. Excedente = suma de los importes pagados por encima del presupuesto de cada trabajo. El exceso de un trabajo no compensa la deuda de otro.
- El avance físico se captura explícitamente de 0 a 100 y no cambia al registrar pagos. El avance global es el promedio simple de los trabajos vigentes; no se pondera por costo.
- Un trabajo terminado necesita 100% de avance. Un trabajo con fecha final anterior al día actual de Panamá y estado distinto de terminado se considera atrasado.
- El archivo conserva el registro y permite recuperación; no equivale a borrar definitivamente datos o comprobantes.

## Cuentas y roles

La capacidad de crear obras se aprovisiona en `app_metadata.app_role` de Supabase Auth mediante un proceso administrativo de servidor: `admin` puede crear obras, `contractor` no. El navegador no puede otorgarse ese atributo. Dentro de cada obra, el propietario y los miembros con rol `admin` pueden gestionarla. Un contratista ve los registros autorizados por su asignación y no modifica presupuestos, pagos o catálogos. El acceso del contratista se vincula a su cuenta individual de Auth; el PIN compartido de la plantilla no se utiliza.

Cambiar un identificador de obra, contratista o pago en una petición debe seguir respetando los permisos en la base. Las respuestas con datos autenticados no deben almacenarse en caché pública. [Integración SSR de Supabase con Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Alcance inicial

La plantilla no contenía datos operativos que migrar. El sistema inicia vacío y las obras se crean mediante administración. No importa datos guardados previamente en `localStorage`; esa necesidad requeriría un importador validado. Tampoco debe interpretarse el registro de un pago como una integración bancaria ni el porcentaje capturado como una certificación automática de ejecución.
