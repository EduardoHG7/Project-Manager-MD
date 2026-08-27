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

## Stack

Next.js 14 (App Router) + TypeScript + Prisma + SQLite + NextAuth
(credenciales + roles). Sin CSS framework: los tokens de diseño están en
`app/globals.css`.

SQLite se eligió para que el sistema arranque sin infraestructura externa
(un único archivo `prisma/dev.db`). Para producción con más de una
instancia o mayor concurrencia, cambia `DATABASE_URL` a Postgres en
`.env` — el `schema.prisma` usa `env("DATABASE_URL")`, así que solo hay
que ajustar el `provider` del datasource a `postgresql` y correr
`prisma migrate dev` de nuevo.

Las fotos de evidencia se guardan en `public/uploads/`. Si despliegas en
una plataforma serverless (Vercel), ese disco no persiste entre
despliegues — usa un volumen persistente (Docker + VPS, Fly.io, Railway)
o cambia `guardarFoto` en `lib/actions.ts` para subir a un bucket
(Vercel Blob, S3, etc.).

## Primeros pasos

```bash
npm install
cp .env.example .env       # ajusta NEXTAUTH_SECRET
npx prisma migrate dev      # crea prisma/dev.db con el esquema
npm run db:seed             # carga el Panama Motor Show Oct 2026 real
npm run dev
```

Abre http://localhost:3000 — usuarios de acceso creados por el seed:

| Correo                     | Contraseña       | Rol         |
|-----------------------------|------------------|-------------|
| admin@motorshow.pa          | MotorShow2026!   | ADMIN       |
| supervisor@motorshow.pa     | MotorShow2026!   | SUPERVISOR  |
| lectura@motorshow.pa        | MotorShow2026!   | LECTURA     |

**Cambia esas contraseñas antes de usar el sistema en el evento real** —
son solo para arrancar. Un ADMIN puede crear nuevos usuarios directamente
en la base de datos (`npm run db:studio`) hasta que se agregue una
pantalla de gestión de usuarios.

Roles: `ADMIN` y `SUPERVISOR` pueden registrar mediciones, fotos,
incumplimientos y cambiar estados; `LECTURA` solo consulta.

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
