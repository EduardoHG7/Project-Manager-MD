"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calcularEstado, calcularFechaFin, NOMBRES_CATEGORIAS_DEFECTO } from "@/lib/cronograma";

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

// Para eventos creados antes de que existiera este módulo (no pasaron por
// el seed automático de crearEvento): carga las categorías por defecto que
// todavía falten, sin duplicar las que ya existan.
export async function sembrarCategoriasDefectoProyecto(eventoId: string) {
  await requireEditor();
  const existentes = await prisma.categoriaProyecto.findMany({ where: { eventoId }, select: { nombre: true, orden: true } });
  const nombresExistentes = new Set(existentes.map((c) => c.nombre));
  const faltantes = NOMBRES_CATEGORIAS_DEFECTO.filter((n) => !nombresExistentes.has(n));
  if (faltantes.length === 0) return [];

  let orden = Math.max(-1, ...existentes.map((c) => c.orden)) + 1;
  const creadas = await prisma.$transaction(
    faltantes.map((nombre) => prisma.categoriaProyecto.create({ data: { eventoId, nombre, orden: orden++ } }))
  );
  revalidatePath("/cronograma");
  return creadas;
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

  // El estado se recalcula solo (progreso/fechas cambiaron). Si en cambio
  // el usuario edita el estado directamente (sin tocar progreso/fechas en
  // el mismo guardado), se respeta como una anulación manual — hasta el
  // próximo cambio de progreso o fechas, que lo vuelve a calcular.
  const ESTADOS_VALIDOS = new Set(["NO_INICIADA", "EN_CURSO", "COMPLETADA", "ATRASADA"]);
  if ("estado" in data && !fechaCambio && !("progreso" in data)) {
    if (!ESTADOS_VALIDOS.has(data.estado || "")) throw new Error("Estado inválido.");
    registrar("estado", actual.estado, data.estado);
    payload.estado = data.estado;
  } else {
    const fechaFinFinal = fechaCambio ? payload.fechaFin : actual.fechaFin;
    const estadoNuevo = calcularEstado({ progreso, fechaFin: fechaFinFinal });
    if (estadoNuevo !== actual.estado) {
      registrar("estado", actual.estado, estadoNuevo);
      payload.estado = estadoNuevo;
    }
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

// ── Carga inicial desde el cronograma histórico en Excel (una sola vez) ──
// Datos tal cual venían en "Cronograma_de_actividades_PMS2025.xlsx" (hoja
// "2026"), con el año 2026 confirmado por el usuario para las fechas
// "día-mes" sin año. Progreso mapeado desde la columna "Estado" del Excel
// (no traía porcentaje): COMPLETO=100, EN CURSO=50, ATRASADO=0.

type TareaSemilla = {
  categoria: string;
  nombre: string;
  responsable: string | null;
  fechaInicio: string; // ISO yyyy-mm-dd
  duracionDias: number;
  progreso: number;
  observaciones: string | null;
};

const TAREAS_INICIALES: TareaSemilla[] = [
  { categoria: "Local", nombre: "Aprobación de Adenda", responsable: "PV", fechaInicio: "2026-05-12", duracionDias: 5, progreso: 100, observaciones: null },
  { categoria: "Local", nombre: "Firma de contrato", responsable: "FT", fechaInicio: "2026-10-01", duracionDias: 5, progreso: 100, observaciones: null },
  { categoria: "Local", nombre: "1er Pago PCC", responsable: "NM", fechaInicio: "2026-05-15", duracionDias: 5, progreso: 100, observaciones: null },
  { categoria: "Local", nombre: "2do Pago PCC", responsable: "NM", fechaInicio: "2026-06-02", duracionDias: 5, progreso: 100, observaciones: null },
  { categoria: "Local", nombre: "3er Pago PCC", responsable: "NM", fechaInicio: "2026-07-07", duracionDias: 5, progreso: 100, observaciones: null },
  { categoria: "Local", nombre: "4to Pago PCC", responsable: "NM", fechaInicio: "2026-08-04", duracionDias: 5, progreso: 100, observaciones: null },
  { categoria: "Local", nombre: "5to Pago PCC", responsable: "NM", fechaInicio: "2026-09-01", duracionDias: 5, progreso: 100, observaciones: null },
  {
    categoria: "Local",
    nombre: "Póliza de seguro (ASSA) (Cubre las instalaciones del PCC, público y expositores. R. C Legal y incendio)",
    responsable: "NM",
    fechaInicio: "2026-08-04",
    duracionDias: 5,
    progreso: 100,
    observaciones:
      "sept-15: PCC confirma recepción de la póliza con los ajustes que solicitaron.\nSept-04: Póliza entregada a PCC, en espera de su revisión\nagos-18: Esta semana Nurys debe recibir la cotización.",
  },
  { categoria: "Local", nombre: "Reunión Técnica - ADAP y Expositores", responsable: "PV", fechaInicio: "2026-09-01", duracionDias: 5, progreso: 100, observaciones: null },
  { categoria: "Presupuesto", nombre: "Elaborar y aprobar presupuesto", responsable: "COMITÉ", fechaInicio: "2026-07-07", duracionDias: 12, progreso: 100, observaciones: null },
  { categoria: "Reglamento", nombre: "Revisión y actualización", responsable: "PV", fechaInicio: "2026-07-28", duracionDias: 5, progreso: 100, observaciones: null },
  { categoria: "Reglamento", nombre: "Enviar reglamento y manual del participante", responsable: "PV", fechaInicio: "2026-08-04", duracionDias: 12, progreso: 100, observaciones: null },
  { categoria: "Planos", nombre: "Evaluación de opciones de planos", responsable: "PV", fechaInicio: "2026-06-16", duracionDias: 26, progreso: 100, observaciones: null },
  { categoria: "Planos", nombre: "Aprobación de plano final", responsable: "COMITÉ", fechaInicio: "2026-07-14", duracionDias: 5, progreso: 100, observaciones: null },
  { categoria: "Propuesta y Stands", nombre: "Enviar propuesta a los miembros", responsable: "PV", fechaInicio: "2026-07-21", duracionDias: 5, progreso: 100, observaciones: null },
  { categoria: "Propuesta y Stands", nombre: "Enviar propuesta a los bancos", responsable: "PV", fechaInicio: "2026-07-28", duracionDias: 5, progreso: 100, observaciones: null },
  { categoria: "Propuesta y Stands", nombre: "Sorteo de espacios para autos", responsable: "PV", fechaInicio: "2026-07-21", duracionDias: 5, progreso: 100, observaciones: null },
  { categoria: "Propuesta y Stands", nombre: "Sorteo de espacios para bancos", responsable: "PV", fechaInicio: "2026-07-25", duracionDias: 5, progreso: 100, observaciones: null },
  {
    categoria: "Propuesta y Stands",
    nombre: "Entrega de contratos autos y bancos",
    responsable: "NM",
    fechaInicio: "2026-08-04",
    duracionDias: 5,
    progreso: 50,
    observaciones:
      "sept -22: Se tiene pendiente, por revisión de depto legal de los expositores, los contratos de Scotiabank, Davivienda, B.General, BAC y Banistmo.\nagos-18: Entregados por mensajería. Se esta a espera de listado del mensajero. Se sugiere hacer check de recibido con los expositores.",
  },
  {
    categoria: "Propuesta y Stands",
    nombre: "Aprobación de diseños de stands",
    responsable: "PV",
    fechaInicio: "2026-09-01",
    duracionDias: 14,
    progreso: 50,
    observaciones:
      "Sept-22:\nRenders de autos y motos --> 28 aprobados, 11 están en evaluación o se le ha pedido ajustes y 2 estan pendientes de recepción (Infiniti y Kawasaki).\nRenders de bancos y otros --> 11 aprobados, 4 están en evaluación o se le ha pedido ajustes y 18 están pendientes de recepción.",
  },
  { categoria: "Publicidad", nombre: "Reunión creativa para definir la ruta", responsable: "COMITÉ", fechaInicio: "2026-07-07", duracionDias: 5, progreso: 100, observaciones: "agost-19: Se agendo cita para el jueves 21 de agosto" },
  {
    categoria: "Publicidad",
    nombre: "Aprobación de artes y plan de medios",
    responsable: "COMITÉ",
    fechaInicio: "2026-08-21",
    duracionDias: 14,
    progreso: 100,
    observaciones: "10 de sept.: Se aprobo el plan de medios y esta pendiente el arte adicional para destacar el premio de $10K.",
  },
  {
    categoria: "Publicidad",
    nombre: "Aprobación de todas cuñas y materiales publicitarios",
    responsable: "COMITÉ",
    fechaInicio: "2026-08-21",
    duracionDias: 14,
    progreso: 50,
    observaciones: "sept-22: El día de hoy se recibió la resolución de la JCJ para incluirlo a incluirse en la cuña.\nPendiente por la agencia, que envíe la cuña.",
  },
  { categoria: "Publicidad", nombre: "Lanzamiento de la campaña oficial de publicidad", responsable: "PV", fechaInicio: "2026-09-22", duracionDias: 4, progreso: 0, observaciones: null },
  { categoria: "Publicidad", nombre: "Seguimiento y monitoreo de cobertura", responsable: "AGENCIA", fechaInicio: "2026-09-29", duracionDias: 12, progreso: 0, observaciones: null },
  { categoria: "Publicidad", nombre: "Reunión de cierre", responsable: "AGENCIA", fechaInicio: "2026-10-20", duracionDias: 5, progreso: 0, observaciones: null },
  { categoria: "Proveedores", nombre: "Contratación de Asistente de Proyecto", responsable: "PV", fechaInicio: "2026-07-28", duracionDias: 12, progreso: 100, observaciones: null },
  {
    categoria: "Proveedores",
    nombre: "Contratación y coordinación personal de limpieza",
    responsable: "NM",
    fechaInicio: "2026-08-29",
    duracionDias: 2,
    progreso: 100,
    observaciones: "El proveedor se llama Moises quien coordina el personal, y no se emite un contrato formal.",
  },
  { categoria: "Proveedores", nombre: "Contratación Agencia de Seguridad Privada", responsable: "PV", fechaInicio: "2026-08-04", duracionDias: 16, progreso: 100, observaciones: "Pendiente formalizar contrato con el proveedor." },
  {
    categoria: "Proveedores",
    nombre: "Organización, limpieza y confección de banners",
    responsable: "MS",
    fechaInicio: "2026-08-19",
    duracionDias: 5,
    progreso: 50,
    observaciones:
      "sept-16: Se environ artes nuevos para impresión de banners y se le aprobó al proveedor la cotización para proceder.\nsept - 05: Se realizó la limpieza de los banners existentes con otro proveedor, el Sr. Moises.\nsept - 10: Se envió a reparar 9 banners y se deben confeccionar 7 nuevos.\nagost-19: Javier Navarro se llevará los banners, limpiarlos y organizarlos para guardarlos.",
  },
  { categoria: "Proveedores", nombre: "Coordinación de instalación de Banners con logos", responsable: "PV", fechaInicio: "2026-08-18", duracionDias: 5, progreso: 50, observaciones: "sept - 10: Se esta cotizando con un nuevo proveedor." },
  {
    categoria: "Proveedores",
    nombre: "Contratación Passline (taquilla, sorteo)",
    responsable: "PV; MS",
    fechaInicio: "2026-07-07",
    duracionDias: 12,
    progreso: 100,
    observaciones: "sept-09: Se está en revisión de la propuesta enviada por Passline.\nsept-08: Se está a espera de la propuesta de Passline para formalizar.",
  },
  {
    categoria: "Proveedores",
    nombre: "Decoración de la entrada y señalización del evento",
    responsable: "PV",
    fechaInicio: "2026-09-15",
    duracionDias: 5,
    progreso: 50,
    observaciones: "sept-22: Se hizo visita a PCC para definir el diseño de la entrada, el pasado miércoles 17 de sept. Se está cotizando las pantallas que irían a cada costa del arco.",
  },
  { categoria: "Proveedores", nombre: "Capacitación con Shriners", responsable: "PV", fechaInicio: "2026-09-15", duracionDias: 5, progreso: 0, observaciones: null },
  {
    categoria: "Proveedores",
    nombre: "Compra de gafetes y cordones",
    responsable: "NM; MS",
    fechaInicio: "2026-07-28",
    duracionDias: 5,
    progreso: 50,
    observaciones: "sept 10: Se esta recopilando el listado de personal para enviar al proveedor, la fecha límite es del 12 de septiembre.",
  },
  {
    categoria: "Permisos",
    nombre: "Policia",
    responsable: "NM",
    fechaInicio: "2026-08-29",
    duracionDias: 5,
    progreso: 100,
    observaciones: "agos-28: Entregado, esperando respuesta de la entidad.\nagos-18: La solicitud debe realizarse 1 mes antes del evento, 29 de agosto.",
  },
  {
    categoria: "Permisos",
    nombre: "Sinaproc",
    responsable: "NM",
    fechaInicio: "2026-08-29",
    duracionDias: 5,
    progreso: 100,
    observaciones:
      "sept-15: Se recibió confirmación de Sinaproc, el permiso esta listo. Se enviará a retirar mañana.\nagos-28: Entregado, esperando respuesta de la entidad.\nagos-18: La solicitud debe realizarse 1 mes antes del evento, 29 de agosto.",
  },
  {
    categoria: "Permisos",
    nombre: "Bomberos",
    responsable: "NM",
    fechaInicio: "2026-08-29",
    duracionDias: 5,
    progreso: 50,
    observaciones: "agos-26: Entregado, esperando respuesta de la entidad.\nagos-18: La solicitud debe realizarse 1 mes antes del evento, 29 de agosto.",
  },
  { categoria: "Eventos", nombre: "Contratación de productor", responsable: "COMITÉ", fechaInicio: "2026-07-14", duracionDias: 5, progreso: 100, observaciones: null },
  { categoria: "Eventos", nombre: "Definir formato de inauguración", responsable: "COMITÉ", fechaInicio: "2026-07-07", duracionDias: 5, progreso: 100, observaciones: "sept-10: Se esta enviando comunicación a los expositores el día de hoy." },
  {
    categoria: "Eventos",
    nombre: "Presentación / Discurso",
    responsable: "COMITÉ",
    fechaInicio: "2026-09-15",
    duracionDias: 12,
    progreso: 50,
    observaciones: "sept-10: Esta pendiente la entrega por parte de Roots del borrador de la presentación.",
  },
  {
    categoria: "Eventos",
    nombre: "Invitaciones (modelo y distribución)",
    responsable: "COMITÉ",
    fechaInicio: "2026-09-15",
    duracionDias: 5,
    progreso: 50,
    observaciones:
      "sept-22: La impresión de las invitaciones físicas esta en marcha. Se solicitó ajustes en el arte de las invitaciones digitales. Y se tiene listado de invitados.\nSept-10: Se esta trabajando la lista de invitados y el arte de las invitaciones.",
  },
  { categoria: "Eventos", nombre: "Alimentos y Bebidas de inauguración", responsable: "COMITÉ", fechaInicio: "2026-09-01", duracionDias: 11, progreso: 0, observaciones: null },
  {
    categoria: "Eventos",
    nombre: "Concierto",
    responsable: "COMITÉ",
    fechaInicio: "2026-06-30",
    duracionDias: 5,
    progreso: 50,
    observaciones: "sept-10: Se esta evaluando hacerla después de la feria, sujeto a sobrecumplir meta. Hay que definir los criterios.",
  },
  { categoria: "Eventos", nombre: "Alimentos y Bebidas de clausura", responsable: "COMITÉ", fechaInicio: "2026-09-22", duracionDias: 5, progreso: 0, observaciones: null },
  {
    categoria: "Eventos",
    nombre: "Transporte",
    responsable: "COMITÉ",
    fechaInicio: "2026-08-18",
    duracionDias: 5,
    progreso: 50,
    observaciones: "sept-15: No fue aprobada la propuesta de Mi Bus.\nsept-10: Comité esta evaluando propuesta de MiBus. Se esta contactando a Uber para solicitar propuesta.",
  },
  { categoria: "Eventos", nombre: "Fotógrafo", responsable: "PV", fechaInicio: "2026-08-29", duracionDias: 5, progreso: 100, observaciones: "sept-10: Fotógrafo confirmado para la inauguración." },
  { categoria: "Eventos", nombre: "Reserva de hotel para Presidente de ADAP", responsable: "PV", fechaInicio: "2026-09-10", duracionDias: 10, progreso: 0, observaciones: null },
  { categoria: "Feria", nombre: "Marcación/Montaje/Evento/Desmontaje", responsable: "PV", fechaInicio: "2026-10-06", duracionDias: 5, progreso: 0, observaciones: null },
  { categoria: "Cobros", nombre: "Cobro de Stands para las marcas y bancos", responsable: null, fechaInicio: "2026-08-20", duracionDias: 26, progreso: 50, observaciones: "sept- 22: Se esta en proceso de cobro." },
];

export async function sembrarTareasIniciales(eventoId: string) {
  await requireEditor();

  const categoriasExistentes = await prisma.categoriaProyecto.findMany({ where: { eventoId } });
  const categoriaPorNombre = new Map(categoriasExistentes.map((c) => [c.nombre, c]));
  let orden = Math.max(-1, ...categoriasExistentes.map((c) => c.orden), -1) + 1;
  for (const nombre of Array.from(new Set(TAREAS_INICIALES.map((t) => t.categoria)))) {
    if (!categoriaPorNombre.has(nombre)) {
      categoriaPorNombre.set(nombre, await prisma.categoriaProyecto.create({ data: { eventoId, nombre, orden: orden++ } }));
    }
  }

  const responsablesExistentes = await prisma.responsable.findMany({ where: { eventoId } });
  const responsablePorNombre = new Map(responsablesExistentes.map((r) => [r.nombre, r]));
  const nombresResponsables = Array.from(new Set(TAREAS_INICIALES.map((t) => t.responsable).filter((r): r is string => !!r)));
  for (const nombre of nombresResponsables) {
    if (!responsablePorNombre.has(nombre)) {
      responsablePorNombre.set(nombre, await prisma.responsable.create({ data: { eventoId, nombre } }));
    }
  }

  const tareasExistentes = await prisma.tareaProyecto.findMany({ where: { eventoId }, select: { categoriaId: true, nombre: true } });
  const yaExiste = new Set(tareasExistentes.map((t) => `${t.categoriaId}::${t.nombre}`));

  const aCrear = TAREAS_INICIALES.flatMap((t) => {
    const categoria = categoriaPorNombre.get(t.categoria)!;
    if (yaExiste.has(`${categoria.id}::${t.nombre}`)) return [];
    const fechaInicio = new Date(t.fechaInicio);
    const fechaFin = calcularFechaFin(fechaInicio, t.duracionDias);
    return [
      {
        eventoId,
        categoriaId: categoria.id,
        responsableId: t.responsable ? responsablePorNombre.get(t.responsable)!.id : null,
        nombre: t.nombre,
        fechaInicio,
        duracionDias: t.duracionDias,
        fechaFin,
        progreso: t.progreso,
        estado: calcularEstado({ progreso: t.progreso, fechaFin }),
        observaciones: t.observaciones,
      },
    ];
  });

  if (aCrear.length > 0) await prisma.tareaProyecto.createMany({ data: aCrear });
  revalidatePath("/cronograma");

  const [categorias, responsables, tareas] = await Promise.all([
    prisma.categoriaProyecto.findMany({ where: { eventoId }, orderBy: { orden: "asc" } }),
    prisma.responsable.findMany({ where: { eventoId }, orderBy: { nombre: "asc" } }),
    prisma.tareaProyecto.findMany({ where: { eventoId }, orderBy: [{ orden: "asc" }, { fechaInicio: "asc" }] }),
  ]);
  return { categorias, responsables, tareas };
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
