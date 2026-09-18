import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventoSeleccionado } from "@/lib/evento";
import { SinEvento } from "../_shared/SinEvento";
import { CronogramaClient } from "./CronogramaClient";

export const dynamic = "force-dynamic";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function CronogramaPage() {
  const evento = await getEventoSeleccionado();
  const session = await getServerSession(authOptions);
  if (!evento) return <SinEvento esAdmin={session?.user.rol === "ADMIN"} />;
  const canEdit = session?.user.rol === "ADMIN" || session?.user.rol === "SUPERVISOR";
  const esAdmin = session?.user.rol === "ADMIN";

  const [categorias, responsables, tareas, miResponsable] = await Promise.all([
    prisma.categoriaProyecto.findMany({ where: { eventoId: evento.id }, orderBy: { orden: "asc" } }),
    prisma.responsable.findMany({ where: { eventoId: evento.id }, orderBy: { nombre: "asc" } }),
    prisma.tareaProyecto.findMany({ where: { eventoId: evento.id }, orderBy: [{ orden: "asc" }, { fechaInicio: "asc" }] }),
    session?.user?.id
      ? prisma.responsable.findFirst({ where: { eventoId: evento.id, usuarioId: session.user.id }, select: { id: true } })
      : null,
  ]);

  return (
    <main className="page">
      <h2>Cronograma</h2>
      <p className="text-muted">
        Plan de trabajo del evento por categoría. {canEdit && "Haz clic en cualquier celda para editarla."}
      </p>

      <CronogramaClient
        eventoId={evento.id}
        canEdit={canEdit}
        esAdmin={esAdmin}
        miResponsableId={miResponsable?.id ?? null}
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre, orden: c.orden }))}
        responsables={responsables.map((r) => ({
          id: r.id,
          nombre: r.nombre,
          iniciales: r.iniciales,
          area: r.area,
          usuarioId: r.usuarioId,
        }))}
        tareas={tareas.map((t) => ({
          id: t.id,
          categoriaId: t.categoriaId,
          responsableId: t.responsableId,
          nombre: t.nombre,
          fechaInicio: toISODate(t.fechaInicio),
          duracionDias: t.duracionDias,
          fechaFin: toISODate(t.fechaFin),
          progreso: t.progreso,
          estado: t.estado,
          esHito: t.esHito,
          observaciones: t.observaciones,
        }))}
      />
    </main>
  );
}
