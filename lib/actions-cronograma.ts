"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calcularEstado, calcularFechaFin } from "@/lib/cronograma";

// Duplicadas verbatim de lib/actions.ts (no están exportadas ahí) para no
// tocar ese archivo más que en el punto donde se siembran las categorías.
async function requireEditor() {
  const session = await getServerSession(authOptions);
  const rol = session?.user?.rol;
  if (rol !== "ADMIN" && rol !== "SUPERVISOR") {
    throw new Error("No tienes permiso para hacer cambios. Se requiere rol Supervisor o Admin.");
  }
  return session!;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.rol !== "ADMIN") {
    throw new Error("No tienes permiso para hacer cambios. Se requiere rol Admin.");
  }
  return session;
}

// ADMIN y SUPERVISOR pueden editar cualquier tarea, igual que en el resto
// de la plataforma. Si no es ninguno de esos roles, solo puede escribir si
// está vinculado como el responsable de esa tarea, y únicamente en los
// campos progreso/observaciones/adjuntos.
const CAMPOS_PERMITIDOS_RESPONSABLE = new Set(["progreso", "observaciones", "adjuntos"]);

async function requireEdicionTarea(tareaId: string, campos: string[]) {
  const session = await getServerSession(authOptions);
  const rol = session?.user?.rol;
  if (rol === "ADMIN" || rol === "SUPERVISOR") return session!;

  const tarea = await prisma.tareaProyecto.findUnique({
    where: { id: tareaId },
    select: { responsable: { select: { usuarioId: true } } },
  });
  if (!tarea) throw new Error("La tarea no existe.");

  const esResponsablePropio = !!session?.user?.id && tarea.responsable?.usuarioId === session.user.id;
  const soloCamposPermitidos = campos.every((c) => CAMPOS_PERMITIDOS_RESPONSABLE.has(c));
  if (esResponsablePropio && soloCamposPermitidos) return session!;

  throw new Error(
    "No tienes permiso para hacer cambios en esta tarea. Se requiere rol Admin/Supervisor, o ser el " +
      "responsable asignado (y en ese caso solo puedes editar % de cumplimiento, observaciones y adjuntos)."
  );
}

// ── Categorías: mismo patrón upsert-por-nombre que crearEtapaInvitado ────

export async function crearCategoriaProyecto(eventoId: string, nombre: string) {
  await requireEditor();
  const n = nombre.trim();
  if (!n) throw new Error("El nombre de la categoría es obligatorio.");
  const ultima = await prisma.categoriaProyecto.findFirst({ where: { eventoId }, orderBy: { orden: "desc" } });
  const categoria = await prisma.categoriaProyecto.upsert({
    where: { eventoId_nombre: { eventoId, nombre: n } },
    update: {},
    create: { eventoId, nombre: n, orden: (ultima?.orden ?? -1) + 1 },
  });
  revalidatePath("/cronograma");
  return categoria;
}

export async function eliminarCategoriaProyecto(id: string) {
  await requireAdmin();
  const enUso = await prisma.tareaProyecto.count({ where: { categoriaId: id } });
  if (enUso > 0) {
    throw new Error(`No se puede eliminar: hay ${enUso} tarea(s) en esta categoría. Reasígnalas primero.`);
  }
  await prisma.categoriaProyecto.delete({ where: { id } });
  revalidatePath("/cronograma");
}

// ── Responsables ─────────────────────────────────────────────────────

type DatosResponsable = {
  nombre: string;
  iniciales?: string | null;
  area?: string | null;
  usuarioId?: string | null;
};

export async function crearResponsable(eventoId: string, data: DatosResponsable) {
  await requireEditor();
  const nombre = data.nombre?.trim();
  if (!nombre) throw new Error("El nombre del responsable es obligatorio.");
  const responsable = await prisma.responsable.create({
    data: {
      eventoId,
      nombre,
      iniciales: data.iniciales?.trim() || null,
      area: data.area?.trim() || null,
      usuarioId: data.usuarioId || null,
    },
  });
  revalidatePath("/cronograma");
  return responsable;
}

export async function actualizarResponsable(id: string, data: Partial<DatosResponsable>) {
  await requireEditor();
  const payload: Record<string, any> = {};
  if ("nombre" in data) {
    if (!data.nombre?.trim()) throw new Error("El nombre es obligatorio.");
    payload.nombre = data.nombre.trim();
  }
  if ("iniciales" in data) payload.iniciales = data.iniciales?.trim() || null;
  if ("area" in data) payload.area = data.area?.trim() || null;
  if ("usuarioId" in data) payload.usuarioId = data.usuarioId || null;
  await prisma.responsable.update({ where: { id }, data: payload });
  revalidatePath("/cronograma");
}

export async function eliminarResponsable(id: string) {
  await requireAdmin();
  await prisma.responsable.delete({ where: { id } });
  revalidatePath("/cronograma");
}

// ── Tareas ────────────────────────────────────────────────────────────

type DatosTarea = {
  categoriaId: string;
  responsableId?: string | null;
  nombre: string;
  fechaInicio: string; // ISO yyyy-mm-dd
  duracionDias: number;
  progreso?: number;
  estado?: string;
  esHito?: boolean;
  observaciones?: string | null;
};

export async function crearTareaProyecto(eventoId: string, data: DatosTarea) {
  await requireEditor();
  const nombre = data.nombre?.trim();
  if (!nombre) throw new Error("El nombre de la tarea es obligatorio.");
  if (!data.categoriaId) throw new Error("La categoría es obligatoria.");
  if (!data.fechaInicio) throw new Error("La fecha de inicio es obligatoria.");

  const fechaInicio = new Date(data.fechaInicio);
  const duracionDias = Math.max(1, data.duracionDias || 1);
  const fechaFin = calcularFechaFin(fechaInicio, duracionDias);
  const progreso = Math.min(100, Math.max(0, data.progreso ?? 0));
  const estado = calcularEstado({ progreso, fechaFin });

  const tarea = await prisma.tareaProyecto.create({
    data: {
      eventoId,
      categoriaId: data.categoriaId,
      responsableId: data.responsableId || null,
      nombre,
      fechaInicio,
      duracionDias,
      fechaFin,
      progreso,
      estado,
      esHito: data.esHito ?? false,
      observaciones: data.observaciones?.trim() || null,
    },
  });
  revalidatePath("/cronograma");
  return tarea;
}

export async function actualizarTareaProyecto(id: string, data: Partial<DatosTarea>) {
  const session = await requireEdicionTarea(id, Object.keys(data));

  const actual = await prisma.tareaProyecto.findUnique({ where: { id } });
  if (!actual) throw new Error("La tarea no existe.");

  const payload: Record<string, any> = {};
  const cambios: { campo: string; anterior: string | null; nuevo: string | null }[] = [];

  function registrar(campo: string, anterior: unknown, nuevo: unknown) {
    if (String(anterior ?? "") === String(nuevo ?? "")) return;
    cambios.push({ campo, anterior: anterior == null ? null : String(anterior), nuevo: nuevo == null ? null : String(nuevo) });
  }

  if ("nombre" in data) {
    if (!data.nombre?.trim()) throw new Error("El nombre es obligatorio.");
    registrar("nombre", actual.nombre, data.nombre.trim());
    payload.nombre = data.nombre.trim();
  }
  if ("categoriaId" in data) {
    registrar("categoriaId", actual.categoriaId, data.categoriaId);
    payload.categoriaId = data.categoriaId;
  }
  if ("responsableId" in data) {
    registrar("responsableId", actual.responsableId, data.responsableId || null);
    payload.responsableId = data.responsableId || null;
  }
  if ("observaciones" in data) {
    registrar("observaciones", actual.observaciones, data.observaciones?.trim() || null);
    payload.observaciones = data.observaciones?.trim() || null;
  }
  if ("esHito" in data) {
    registrar("esHito", actual.esHito, data.esHito);
    payload.esHito = !!data.esHito;
  }

  // Si cambia inicio/duración/progreso, se recalculan fechaFin y estado en
  // el servidor — nunca se aceptan directo desde el cliente.
  const fechaInicio = "fechaInicio" in data && data.fechaInicio ? new Date(data.fechaInicio) : actual.fechaInicio;
  const duracionDias = "duracionDias" in data && data.duracionDias ? Math.max(1, data.duracionDias) : actual.duracionDias;
  const progreso = "progreso" in data && data.progreso !== undefined ? Math.min(100, Math.max(0, data.progreso)) : actual.progreso;

  const fechaCambio = "fechaInicio" in data || "duracionDias" in data;
  if (fechaCambio) {
    registrar("fechaInicio", actual.fechaInicio.toISOString().slice(0, 10), fechaInicio.toISOString().slice(0, 10));
    registrar("duracionDias", actual.duracionDias, duracionDias);
    payload.fechaInicio = fechaInicio;
    payload.duracionDias = duracionDias;
    payload.fechaFin = calcularFechaFin(fechaInicio, duracionDias);
  }
  if ("progreso" in data) {
    registrar("progreso", actual.progreso, progreso);
    payload.progreso = progreso;
  }

  const fechaFinFinal = fechaCambio ? payload.fechaFin : actual.fechaFin;
  const estadoNuevo = calcularEstado({ progreso, fechaFin: fechaFinFinal });
  if (estadoNuevo !== actual.estado) {
    registrar("estado", actual.estado, estadoNuevo);
    payload.estado = estadoNuevo;
  }

  await prisma.$transaction([
    prisma.tareaProyecto.update({ where: { id }, data: payload }),
    ...cambios.map((c) =>
      prisma.tareaProyectoLog.create({
        data: { tareaId: id, usuarioId: session?.user?.id || null, campo: c.campo, valorAnterior: c.anterior, valorNuevo: c.nuevo },
      })
    ),
  ]);
  revalidatePath("/cronograma");
}

export async function eliminarTareaProyecto(id: string) {
  await requireEditor();
  await prisma.tareaProyecto.delete({ where: { id } });
  revalidatePath("/cronograma");
}

export async function eliminarTareasProyectoMasivo(ids: string[]) {
  await requireEditor();
  if (ids.length === 0) return;
  await prisma.tareaProyecto.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/cronograma");
}

export async function reordenarTareasProyecto(ids: string[]) {
  await requireEditor();
  await prisma.$transaction(ids.map((id, orden) => prisma.tareaProyecto.update({ where: { id }, data: { orden } })));
  revalidatePath("/cronograma");
}

// ── Historial ─────────────────────────────────────────────────────────

export async function obtenerHistorialTarea(tareaId: string) {
  await getServerSession(authOptions); // cualquier sesión válida puede consultar (misma pantalla ya es solo-logueados)
  return prisma.tareaProyectoLog.findMany({
    where: { tareaId },
    include: { usuario: { select: { nombre: true } } },
    orderBy: { fecha: "desc" },
  });
}
