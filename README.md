# Supervisión de montaje

Sistema real (no mockup) para supervisar el montaje de stands en ferias y
eventos — nacido para el **Panama Motor Show Oct 2026**, pero reutilizable
para cualquier feria futura.

Reemplaza el mockup estático original por una aplicación con base de datos,
login con roles, subida de fotos y una regla central: **toda medición fuera
de tolerancia abre un incumplimiento automáticamente**, sin que nadie tenga
que acordarse de reportarlo.

## Pantallas

- **Tablero** — KPIs en vivo por estado, incumplimientos que requieren
  atención, progreso por disciplina, resumen por grupo/distribuidor.
- **Mapa** — plano real del recinto con los espacios ubicados por
  coordenadas, filtros y vista de retícula por fila.
- **Ficha de stand** — especificaciones, progreso por disciplina
  (Diseño/Estructura/Gráfica/Eléctrico), checklist de materiales y
  acabados, historial de versiones de diseño.
- **Comparar** — pines sobre el render aprobado, tabla de desviaciones
  (aprobado vs. medido en obra).
- **Obra** — ruta de inspección del día y formulario de verificación en
  piso: exige foto + medida, y si la medida cae fuera de tolerancia abre el
  incumplimiento solo.
- **Calendario** — Gantt de fabricación/montaje/verificación por stand,
  con hitos del evento.
- **Incumplimientos** — reporte filtrable con flujo de cierre
  (abierta → en corrección → cerrada).
- **Directorio** — expositores, grupos representantes y proveedores
  constructores.
- **Admin** (solo rol ADMIN) — crear eventos nuevos (nombre, recinto,
  fechas, plano del recinto), ubicar espacios haciendo clic sobre el plano,
  y mantener el catálogo de distribuidores y proveedores constructores.
  Pensado para que el equipo cargue la próxima feria sin tocar código: el
  selector de evento en el encabezado cambia entre todas las que existan.

## Stack

Next.js 14 (App Router) + TypeScript + Prisma + Postgres + NextAuth
(credenciales + roles). Sin CSS framework: los tokens de diseño están en
`app/globals.css`.

Las fotos de evidencia suben a **Vercel Blob** cuando `BLOB_READ_WRITE_TOKEN`
está configurado (producción); sin esa variable caen a `public/uploads/`
en disco, que solo sirve para desarrollo local o un servidor con disco
propio — nunca en una plataforma serverless.

## Desplegar en Vercel

1. En vercel.com/new, importa este repositorio.
2. En el proyecto → **Storage**, agrega **Vercel Postgres** y **Vercel
   Blob**. Vercel inyecta `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`
   y `BLOB_READ_WRITE_TOKEN` solo con conectarlas — no hay que copiar nada
   a mano.
3. En **Settings → Environment Variables**, agrega `NEXTAUTH_SECRET` (genera
   uno con `openssl rand -base64 32`) y `NEXTAUTH_URL` (la URL pública del
   deploy, ej. `https://tu-proyecto.vercel.app`).
4. Cada `git push` a `main` hace deploy y corre `prisma migrate deploy`
   automáticamente como parte del build (ver `package.json`).
5. La base de datos arranca vacía. Para cargar el Panama Motor Show Oct
   2026 real, hay un workflow de GitHub Actions listo
   (`.github/workflows/seed.yml`) que corre el seed contra producción sin
   necesitar nada instalado localmente:
   1. En Vercel, Settings → Environment Variables, copia los valores de
      `POSTGRES_PRISMA_URL` y `POSTGRES_URL_NON_POOLING`.
   2. En GitHub, Settings → Secrets and variables → Actions, crea esos
      dos secrets con esos valores (mismos nombres).
   3. En la pestaña **Actions** del repo, corre manualmente el workflow
      "Sembrar datos del Panama Motor Show" (botón "Run workflow").

   Es seguro volver a correrlo — el seed usa `upsert` y no duplica datos.

## Primeros pasos (desarrollo local)

Necesitas un Postgres accesible — el más simple es usar el mismo de
Vercel: crea el proyecto ahí primero (ver arriba), conecta la integración
Postgres, y trae las variables con `vercel env pull .env.local`. También
sirve cualquier Postgres propio (Docker, Neon, Supabase) puesto en
`POSTGRES_PRISMA_URL` y `POSTGRES_URL_NON_POOLING` (puede ser la misma
URL en ambas si no usas connection pooling).

```bash
npm install
cp .env.example .env.local   # o `vercel env pull .env.local`
npx prisma migrate dev        # aplica el esquema
npm run db:seed               # carga el Panama Motor Show Oct 2026 real
npm run dev
```

Abre http://localhost:3000 — usuarios de acceso creados por el seed:

| Usuario                     | Contraseña       | Rol         |
|-----------------------------|------------------|-------------|
| eherrera                    | MotorShow2026!   | ADMIN       |
| supervisor@motorshow.pa     | MotorShow2026!   | SUPERVISOR  |
| lectura@motorshow.pa        | MotorShow2026!   | LECTURA     |

**Cambia esas contraseñas antes de usar el sistema en el evento real** —
son solo para arrancar. Un ADMIN puede crear nuevos usuarios directamente
en la base de datos (`npm run db:studio`) hasta que se agregue una
pantalla de gestión de usuarios.

Roles: `ADMIN` y `SUPERVISOR` pueden registrar mediciones, fotos,
incumplimientos y cambiar estados; `LECTURA` solo consulta. Solo `ADMIN`
puede crear/editar eventos, espacios, distribuidores y proveedores desde
**Admin**.

## Cargar un evento nuevo (sin tocar código)

Con sesión de `ADMIN`, desde **Admin → Eventos**:

1. Crea el evento: nombre, recinto, fechas de apertura/montaje/desmontaje
   y sube la imagen del plano del recinto.
2. Entra a **Cargar espacios en el plano**, pulsa **+ Agregar espacio**,
   haz clic en el punto del plano donde va cada stand y llena su ficha
   (número, nombre, medidas, grupo, proveedor). Se puede reposicionar o
   borrar cualquier espacio después.
3. El selector de evento en el encabezado (arriba a la izquierda) cambia
   entre todas las ferias cargadas — cada quien puede estar viendo una
   distinta.

Los grupos/distribuidores y proveedores constructores son compartidos
entre eventos (**Admin → Distribuidores / Proveedores**): se cargan una
vez y quedan disponibles para asignar en cualquier evento futuro.

## Datos de ejemplo

El seed (`prisma/seed.ts`) carga el plano real del Panama Motor Show Oct
2026 (63 espacios entre stands automotrices y módulos financieros), sus
proveedores/distribuidores reales, y un caso de referencia completo (el
stand 22, KIA) con historial de versiones, checklist de materiales, pines
de comparación render-vs-obra y su render 3D real. El resto de los
espacios arrancan con checklist vacío, listo para llenarse durante el
montaje real.

Es seguro volver a correr `npm run db:seed`: usa `upsert`/verificaciones
de existencia, así que no duplica datos.
