"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { evaluarConformidad, generarIncumplimientoSiAplica } from "@/lib/tolerancia";
import { guardarArchivo } from "@/lib/upload";
import { EVENTO_COOKIE } from "@/lib/evento";

export async function seleccionarEvento(eventoId: string) {
  cookies().set(EVENTO_COOKIE, eventoId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

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

// Expositor solo puede subir para su propio espacio; operación (admin/supervisor)
// puede subir en nombre de cualquier espacio, indicando espacioId explícitamente.
async function resolverEspacioParaSubida(espacioIdInput?: string) {
  const session = await getServerSession(authOptions);
  const rol = session?.user?.rol;

  if (rol === "EXPOSITOR") {
    const usuario = await prisma.usuario.findUnique({ where: { id: session!.user.id } });
    if (!usuario?.espacioId) {
      throw new Error("Tu usuario no tiene un espacio asignado. Contacta al organizador.");
    }
    return { session: session!, espacioId: usuario.espacioId };
  }

  if (rol === "ADMIN" || rol === "SUPERVISOR") {
    if (!espacioIdInput) throw new Error("Falta el espacio.");
    return { session: session!, espacioId: espacioIdInput };
  }

  throw new Error("No autorizado.");
}

function generarContrasena(): string {
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return out;
}

function slugificar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function actualizarEstadoEspacio(espacioId: string, estado: string) {
  await requireEditor();
  await prisma.espacio.update({ where: { id: espacioId }, data: { estado } });
  revalidatePath("/tablero");
  revalidatePath("/mapa");
  revalidatePath("/directorio");
}

export async function actualizarEspacio(espacioId: string, data: Record<string, any>) {
  await requireEditor();
  const camposTexto = ["medidas", "puntosLuz", "pisoTarima"];
  const camposNumericos = ["areaM2", "autosEnPiso", "cargaElectricaKw"];
  const camposRelacion = ["proveedorId", "distribuidorId"];
  const camposFecha = ["montajeInicio", "montajeFin", "ultimaEntrega"];
  const camposBooleanos = ["usaRigging"];

  const payload: Record<string, any> = {};
  for (const k of camposTexto) {
    if (k in data) payload[k] = data[k] || null;
  }
  for (const k of camposNumericos) {
    if (k in data) payload[k] = data[k] === "" || data[k] === null ? null : Number(data[k]);
  }
  for (const k of camposRelacion) {
    if (k in data) payload[k] = data[k] || null;
  }
  for (const k of camposFecha) {
    if (k in data) payload[k] = data[k] ? new Date(data[k]) : null;
  }
  for (const k of camposBooleanos) {
    if (k in data) payload[k] = data[k] === "" || data[k] === null ? null : data[k] === true || data[k] === "true";
  }
  if ("alturaMaxCm" in data) {
    const n = Number(data.alturaMaxCm);
    if (data.alturaMaxCm !== "" && !Number.isNaN(n)) payload.alturaMaxCm = n;
  }

  await prisma.espacio.update({ where: { id: espacioId }, data: payload });
  revalidatePath("/espacios");
  revalidatePath("/directorio");
  revalidatePath("/tablero");
  revalidatePath("/mapa");
  revalidatePath("/calendario");
}

// Admin puede asignar cualquier supervisor (o quitar la asignación).
// Supervisor solo puede asignarse a sí mismo o quitar su propia asignación,
// nunca tocar la asignación de otro supervisor.
export async function asignarSupervisorEspacio(espacioId: string, supervisorId: string | null) {
  const session = await requireEditor();
  if (session.user.rol === "SUPERVISOR") {
    const espacio = await prisma.espacio.findUnique({ where: { id: espacioId }, select: { supervisorId: true } });
    if (supervisorId !== null && supervisorId !== session.user.id) {
      throw new Error("Como supervisor, solo puedes asignarte a ti mismo.");
    }
    if (supervisorId === null && espacio?.supervisorId && espacio.supervisorId !== session.user.id) {
      throw new Error("Solo puedes quitar tu propia asignación.");
    }
  }
  await prisma.espacio.update({ where: { id: espacioId }, data: { supervisorId } });
  revalidatePath("/espacios");
  revalidatePath("/directorio");
  revalidatePath("/tablero");
}

// Asigna (o quita) un supervisor a varios stands de una sola vez, para no
// tener que entrar espacio por espacio. Mismo criterio de permisos que la
// versión individual: un Supervisor solo puede tocar su propia asignación.
export async function asignarSupervisorMasivo(espacioIds: string[], supervisorId: string | null) {
  const session = await requireEditor();
  if (espacioIds.length === 0) return;

  if (session.user.rol === "SUPERVISOR") {
    if (supervisorId !== null && supervisorId !== session.user.id) {
      throw new Error("Como supervisor, solo puedes asignarte a ti mismo.");
    }
    const espacios = await prisma.espacio.findMany({
      where: { id: { in: espacioIds } },
      select: { supervisorId: true },
    });
    const ajeno = espacios.some((e) => supervisorId === null && e.supervisorId && e.supervisorId !== session.user.id);
    if (ajeno) throw new Error("Algunos de los stands seleccionados están asignados a otro supervisor.");
  }

  await prisma.espacio.updateMany({ where: { id: { in: espacioIds } }, data: { supervisorId } });
  revalidatePath("/espacios");
  revalidatePath("/directorio");
  revalidatePath("/tablero");
}

// Cambia el número del stand. Como la Ficha de stand vive en /espacios/[numero],
// quien llama esto debe redirigir a la nueva URL si la operación tiene éxito.
export async function actualizarNumeroEspacio(espacioId: string, nuevoNumero: string) {
  await requireEditor();
  const n = nuevoNumero.trim();
  if (!n) throw new Error("El número no puede quedar vacío.");

  const actual = await prisma.espacio.findUnique({ where: { id: espacioId }, select: { eventoId: true, numero: true } });
  if (!actual) throw new Error("Espacio no encontrado.");
  if (n === actual.numero) return n;

  const existe = await prisma.espacio.findUnique({ where: { eventoId_numero: { eventoId: actual.eventoId, numero: n } } });
  if (existe) throw new Error(`Ya existe un espacio con el número "${n}".`);

  await prisma.espacio.update({ where: { id: espacioId }, data: { numero: n } });
  revalidatePath("/espacios");
  revalidatePath("/directorio");
  revalidatePath("/mapa");
  revalidatePath("/tablero");
  revalidatePath("/calendario");
  return n;
}

export async function actualizarEtapa(espacioId: string, disciplina: string, estado: string, detalle?: string) {
  await requireEditor();
  await prisma.espacioEtapa.upsert({
    where: { espacioId_disciplina: { espacioId, disciplina } },
    update: { estado, detalle, fecha: new Date() },
    create: { espacioId, disciplina, estado, detalle, fecha: new Date() },
  });
  revalidatePath("/tablero");
  revalidatePath("/espacios");
}

export async function guardarMaterial(
  espacioId: string,
  data: { id?: string; elemento: string; material?: string; color?: string; estado: string }
) {
  await requireEditor();
  if (data.id) {
    await prisma.materialEspecificacion.update({
      where: { id: data.id },
      data: { elemento: data.elemento, material: data.material, color: data.color, estado: data.estado },
    });
  } else {
    await prisma.materialEspecificacion.create({
      data: {
        espacioId,
        elemento: data.elemento,
        material: data.material,
        color: data.color,
        estado: data.estado,
      },
    });
  }
  revalidatePath("/espacios");
}

export async function actualizarContactoEspacio(
  espacioId: string,
  data: { personaContacto?: string; telefonoContacto?: string; correoContacto?: string }
) {
  await requireEditor();
  await prisma.espacio.update({
    where: { id: espacioId },
    data: {
      personaContacto: data.personaContacto?.trim() || null,
      telefonoContacto: data.telefonoContacto?.trim() || null,
      correoContacto: data.correoContacto?.trim() || null,
    },
  });
  revalidatePath("/espacios");
}

export async function agregarComentarioEspacio(espacioId: string, texto: string) {
  const session = await requireEditor();
  const t = texto.trim();
  if (!t) throw new Error("El comentario no puede estar vacío.");
  await prisma.comentarioEspacio.create({
    data: { espacioId, texto: t, autorId: session.user.id, autor: session.user.name || undefined },
  });
  revalidatePath("/espacios");
}

export async function agregarPin(
  espacioId: string,
  data: { x: number; y: number; elemento: string; nota?: string }
) {
  await requireEditor();
  const count = await prisma.pin.count({ where: { espacioId } });
  await prisma.pin.create({
    data: { espacioId, numero: count + 1, x: data.x, y: data.y, elemento: data.elemento, nota: data.nota },
  });
  revalidatePath(`/espacios`);
}

export async function marcarPinResuelto(pinId: string, resuelto: boolean, fixNota?: string) {
  await requireEditor();
  await prisma.pin.update({ where: { id: pinId }, data: { resuelto, fixNota } });
  revalidatePath("/espacios");
}

export async function registrarMedicion(formData: FormData) {
  const session = await requireEditor();

  const espacioId = String(formData.get("espacioId"));
  const pinId = (formData.get("pinId") as string) || undefined;
  const titulo = String(formData.get("titulo"));
  const especificacion = String(formData.get("especificacion") || "");
  const valorEsperadoRaw = formData.get("valorEsperado");
  const valorMedidoRaw = formData.get("valorMedido");
  const unidad = String(formData.get("unidad") || "cm");
  const toleranciaMas = Number(formData.get("toleranciaMas") || 0);
  const toleranciaMenos = Number(formData.get("toleranciaMenos") || 0);

  const valorEsperado = valorEsperadoRaw ? Number(valorEsperadoRaw) : null;
  const valorMedido = valorMedidoRaw ? Number(valorMedidoRaw) : null;

  const fotos: string[] = [];
  const archivos = formData.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  for (const archivo of archivos) {
    fotos.push(await guardarArchivo(archivo, "evidencia"));
  }

  const conforme = evaluarConformidad(valorEsperado, valorMedido, toleranciaMas, toleranciaMenos);

  const medicion = await prisma.medicion.create({
    data: {
      espacioId,
      pinId,
      titulo,
      especificacion,
      valorEsperado,
      valorMedido,
      unidad,
      toleranciaMas,
      toleranciaMenos,
      conforme,
      fotos: JSON.stringify(fotos),
      registradoPorId: session.user.id,
    },
  });

  if (conforme === false) {
    await generarIncumplimientoSiAplica(medicion.id);
  }

  revalidatePath("/obra");
  revalidatePath("/incumplimientos");
  revalidatePath("/tablero");
  revalidatePath("/espacios");
  return medicion.id;
}

export async function cambiarEstadoIncumplimiento(id: string, estado: string) {
  const session = await requireEditor();
  await prisma.incumplimiento.update({
    where: { id },
    data: {
      estado,
      cerradoPorId: estado === "CERRADA" ? session.user.id : null,
      cerradoEn: estado === "CERRADA" ? new Date() : null,
    },
  });
  revalidatePath("/incumplimientos");
  revalidatePath("/tablero");
  revalidatePath("/mapa");
}

export async function actualizarVisitaEstado(id: string, estado: string) {
  await requireEditor();
  await prisma.visitaProgramada.update({ where: { id }, data: { estado } });
  revalidatePath("/obra");
}

export async function crearVisita(data: { espacioId: string; fecha: string; hora: string; tarea: string }) {
  await requireEditor();
  const count = await prisma.visitaProgramada.count();
  await prisma.visitaProgramada.create({
    data: {
      espacioId: data.espacioId,
      fecha: new Date(data.fecha),
      hora: data.hora,
      tarea: data.tarea,
      orden: count,
    },
  });
  revalidatePath("/obra");
}

// ── Admin: eventos ─────────────────────────────────────────────────

function parseFechaOpcional(v: FormDataEntryValue | null): Date | null {
  const s = v ? String(v) : "";
  return s ? new Date(s) : null;
}

export async function crearEvento(formData: FormData) {
  await requireAdmin();
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) throw new Error("El nombre del evento es obligatorio.");

  let planoUrl: string | null = null;
  const plano = formData.get("plano");
  if (plano instanceof File && plano.size > 0) {
    planoUrl = await guardarArchivo(plano, "planos");
  }

  const evento = await prisma.evento.create({
    data: {
      nombre,
      recinto: String(formData.get("recinto") || "") || null,
      fechaInicio: new Date(String(formData.get("fechaInicio"))),
      fechaFin: new Date(String(formData.get("fechaFin"))),
      montajeInicio: parseFechaOpcional(formData.get("montajeInicio")),
      montajeFin: parseFechaOpcional(formData.get("montajeFin")),
      desmontajeInicio: parseFechaOpcional(formData.get("desmontajeInicio")),
      desmontajeFin: parseFechaOpcional(formData.get("desmontajeFin")),
      pausaInicio: parseFechaOpcional(formData.get("pausaInicio")),
      pausaFin: parseFechaOpcional(formData.get("pausaFin")),
      horariosNota: String(formData.get("horariosNota") || "").trim() || null,
      planoUrl,
    },
  });

  cookies().set(EVENTO_COOKIE, evento.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
  redirect(`/admin/eventos/${evento.id}`);
}

export async function actualizarEvento(id: string, formData: FormData) {
  await requireAdmin();
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) throw new Error("El nombre del evento es obligatorio.");

  const data: Record<string, unknown> = {
    nombre,
    recinto: String(formData.get("recinto") || "") || null,
    fechaInicio: new Date(String(formData.get("fechaInicio"))),
    fechaFin: new Date(String(formData.get("fechaFin"))),
    montajeInicio: parseFechaOpcional(formData.get("montajeInicio")),
    montajeFin: parseFechaOpcional(formData.get("montajeFin")),
    desmontajeInicio: parseFechaOpcional(formData.get("desmontajeInicio")),
    desmontajeFin: parseFechaOpcional(formData.get("desmontajeFin")),
    pausaInicio: parseFechaOpcional(formData.get("pausaInicio")),
    pausaFin: parseFechaOpcional(formData.get("pausaFin")),
    horariosNota: String(formData.get("horariosNota") || "").trim() || null,
  };

  const plano = formData.get("plano");
  if (plano instanceof File && plano.size > 0) {
    data.planoUrl = await guardarArchivo(plano, "planos");
  }

  await prisma.evento.update({ where: { id }, data });
  revalidatePath("/", "layout");
  revalidatePath(`/admin/eventos/${id}`);
}

export async function archivarEvento(id: string, activo: boolean) {
  await requireAdmin();
  await prisma.evento.update({ where: { id }, data: { activo } });
  revalidatePath("/", "layout");
}

// Solo las fechas del cronograma: a diferencia de actualizarEvento (nombre,
// recinto, plano), esto lo puede ajustar Supervisor además de Admin — son
// quienes coordinan el montaje en el día a día.
export async function actualizarCronograma(
  id: string,
  data: {
    fechaInicio: string;
    fechaFin: string;
    montajeInicio?: string | null;
    montajeFin?: string | null;
    pausaInicio?: string | null;
    pausaFin?: string | null;
    desmontajeInicio?: string | null;
    desmontajeFin?: string | null;
    horariosNota?: string | null;
  }
) {
  await requireEditor();
  const fecha = (v: string | null | undefined) => (v ? new Date(v) : null);

  await prisma.evento.update({
    where: { id },
    data: {
      fechaInicio: new Date(data.fechaInicio),
      fechaFin: new Date(data.fechaFin),
      montajeInicio: fecha(data.montajeInicio),
      montajeFin: fecha(data.montajeFin),
      pausaInicio: fecha(data.pausaInicio),
      pausaFin: fecha(data.pausaFin),
      desmontajeInicio: fecha(data.desmontajeInicio),
      desmontajeFin: fecha(data.desmontajeFin),
      horariosNota: data.horariosNota?.trim() || null,
    },
  });
  revalidatePath("/calendario");
  revalidatePath("/", "layout");
}

// Reuniones y otras actividades sueltas (no son fechas fijas del evento).
export async function crearActividad(
  eventoId: string,
  data: { titulo: string; fecha: string; hora?: string; tipo?: string; descripcion?: string }
) {
  const session = await requireEditor();
  if (!data.titulo?.trim()) throw new Error("Falta el título.");
  if (!data.fecha) throw new Error("Falta la fecha.");
  await prisma.eventoActividad.create({
    data: {
      eventoId,
      titulo: data.titulo.trim(),
      fecha: new Date(data.fecha),
      hora: data.hora?.trim() || null,
      tipo: data.tipo === "OTRO" ? "OTRO" : "REUNION",
      descripcion: data.descripcion?.trim() || null,
      creadoPorId: session.user.id,
    },
  });
  revalidatePath("/calendario");
}

export async function actualizarActividad(
  id: string,
  data: { titulo: string; fecha: string; hora?: string; tipo?: string; descripcion?: string }
) {
  await requireEditor();
  if (!data.titulo?.trim()) throw new Error("Falta el título.");
  if (!data.fecha) throw new Error("Falta la fecha.");
  await prisma.eventoActividad.update({
    where: { id },
    data: {
      titulo: data.titulo.trim(),
      fecha: new Date(data.fecha),
      hora: data.hora?.trim() || null,
      tipo: data.tipo === "OTRO" ? "OTRO" : "REUNION",
      descripcion: data.descripcion?.trim() || null,
    },
  });
  revalidatePath("/calendario");
}

export async function eliminarActividad(id: string) {
  await requireEditor();
  await prisma.eventoActividad.delete({ where: { id } });
  revalidatePath("/calendario");
}

// ── Admin: espacios (clic en el plano) ───────────────────────────────

// Los campos opcionales aceptan string|number para poner un valor, null
// para borrarlo explícitamente, o simplemente omitirse (undefined) para
// dejarlo como está en la base de datos.
type DatosEspacio = {
  numero: string;
  nombre: string;
  categoria: string;
  fila?: string | null;
  medidas?: string | null;
  areaM2?: number | null;
  alturaMaxCm?: number;
  personaContacto?: string | null;
  telefonoContacto?: string | null;
  correoContacto?: string | null;
  distribuidorId?: string | null;
  proveedorId?: string | null;
};

// Campos opcionales: si el llamador no los manda (undefined), no se tocan
// en la base de datos — así una edición parcial (ej. desde Directorio) no
// borra datos que se cargaron desde otra pantalla (ej. el editor de plano).
function limpiarDatosEspacio(data: DatosEspacio) {
  const out: {
    numero: string;
    nombre: string;
    categoria: string;
    alturaMaxCm: number;
    fila?: string | null;
    medidas?: string | null;
    areaM2?: number | null;
    personaContacto?: string | null;
    telefonoContacto?: string | null;
    correoContacto?: string | null;
    distribuidorId?: string | null;
    proveedorId?: string | null;
  } = {
    numero: data.numero.trim(),
    nombre: data.nombre.trim(),
    categoria: data.categoria,
    alturaMaxCm: data.alturaMaxCm ?? 550,
  };
  if (data.fila !== undefined) out.fila = data.fila?.trim() || null;
  if (data.medidas !== undefined) out.medidas = data.medidas?.trim() || null;
  if (data.areaM2 !== undefined) out.areaM2 = data.areaM2;
  if (data.personaContacto !== undefined) out.personaContacto = data.personaContacto?.trim() || null;
  if (data.telefonoContacto !== undefined) out.telefonoContacto = data.telefonoContacto?.trim() || null;
  if (data.correoContacto !== undefined) out.correoContacto = data.correoContacto?.trim() || null;
  if (data.distribuidorId !== undefined) out.distribuidorId = data.distribuidorId || null;
  if (data.proveedorId !== undefined) out.proveedorId = data.proveedorId || null;
  return out;
}

export async function crearEspacio(eventoId: string, x: number | null, y: number | null, data: DatosEspacio) {
  await requireAdmin();
  if (!data.numero.trim() || !data.nombre.trim()) {
    throw new Error("Número y nombre son obligatorios.");
  }
  try {
    await prisma.espacio.create({
      data: { eventoId, x, y, ...limpiarDatosEspacio(data) },
    });
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error(`Ya existe un espacio con el número "${data.numero}" en este evento.`);
    throw err;
  }
  revalidatePath("/mapa");
  revalidatePath("/tablero");
  revalidatePath("/directorio");
  revalidatePath("/espacios");
}

export async function actualizarEspacioAdmin(id: string, data: DatosEspacio) {
  await requireAdmin();
  if (!data.numero.trim() || !data.nombre.trim()) {
    throw new Error("Número y nombre son obligatorios.");
  }
  try {
    await prisma.espacio.update({ where: { id }, data: limpiarDatosEspacio(data) });
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error(`Ya existe un espacio con el número "${data.numero}" en este evento.`);
    throw err;
  }
  revalidatePath("/mapa");
  revalidatePath("/tablero");
  revalidatePath("/directorio");
  revalidatePath("/espacios");
}

export async function reposicionarEspacio(id: string, x: number, y: number) {
  await requireAdmin();
  await prisma.espacio.update({ where: { id }, data: { x, y } });
  revalidatePath("/mapa");
}

export async function eliminarEspacio(id: string) {
  await requireAdmin();
  await prisma.espacio.delete({ where: { id } });
  revalidatePath("/mapa");
  revalidatePath("/tablero");
  revalidatePath("/directorio");
  revalidatePath("/espacios");
}

export async function eliminarEspaciosMasivo(ids: string[]) {
  await requireAdmin();
  if (ids.length === 0) return;
  await prisma.espacio.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/mapa");
  revalidatePath("/tablero");
  revalidatePath("/directorio");
  revalidatePath("/espacios");
}

// ── Admin: distribuidores y proveedores ──────────────────────────────

export async function crearDistribuidor(nombre: string) {
  // Admin y Supervisor pueden registrar un nuevo grupo/representante al vuelo
  // (por ejemplo, desde la Ficha de stand); solo Admin puede eliminarlos.
  await requireEditor();
  const n = nombre.trim();
  if (!n) throw new Error("El nombre es obligatorio.");
  const distribuidor = await prisma.distribuidor.upsert({ where: { nombre: n }, update: {}, create: { nombre: n } });
  revalidatePath("/admin/distribuidores");
  revalidatePath("/espacios");
  revalidatePath("/directorio");
  return distribuidor;
}

export async function eliminarDistribuidor(id: string) {
  await requireAdmin();
  await prisma.distribuidor.delete({ where: { id } });
  revalidatePath("/admin/distribuidores");
}

export async function crearProveedor(data: { nombre: string; contacto?: string; telefono?: string }) {
  await requireAdmin();
  const nombre = data.nombre.trim();
  if (!nombre) throw new Error("El nombre es obligatorio.");
  await prisma.proveedorConstructor.upsert({
    where: { nombre },
    update: { contacto: data.contacto || null, telefono: data.telefono || null },
    create: { nombre, contacto: data.contacto || null, telefono: data.telefono || null },
  });
  revalidatePath("/admin/proveedores");
}

export async function eliminarProveedor(id: string) {
  await requireAdmin();
  await prisma.proveedorConstructor.delete({ where: { id } });
  revalidatePath("/admin/proveedores");
}

// ── Admin: usuarios de operación (ADMIN / SUPERVISOR / LECTURA) ──────

export async function crearUsuarioOperacion(data: { nombre: string; email: string; rol: string }) {
  await requireAdmin();
  const nombre = data.nombre.trim();
  const email = data.email.trim().toLowerCase();
  if (!nombre || !email) throw new Error("Nombre y usuario son obligatorios.");
  if (!["ADMIN", "SUPERVISOR", "LECTURA"].includes(data.rol)) throw new Error("Rol inválido.");

  const contrasena = generarContrasena();
  const passwordHash = await bcrypt.hash(contrasena, 10);
  try {
    await prisma.usuario.create({ data: { nombre, email, passwordHash, rol: data.rol } });
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error(`Ya existe un usuario con "${email}".`);
    throw err;
  }
  revalidatePath("/admin/usuarios");
  return { email, contrasena };
}

export async function activarUsuario(id: string, activo: boolean) {
  await requireAdmin();
  await prisma.usuario.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/usuarios");
  revalidatePath("/directorio");
}

// ── Usuarios expositor: uno por espacio, creado desde el Directorio ──

export async function crearUsuarioExpositor(espacioId: string) {
  await requireAdmin();
  const espacio = await prisma.espacio.findUniqueOrThrow({ where: { id: espacioId } });

  const base = slugificar(`${espacio.nombre}-${espacio.numero}`) || `expositor-${espacio.numero}`;
  let email = base;
  let intento = 1;
  while (await prisma.usuario.findUnique({ where: { email } })) {
    intento += 1;
    email = `${base}-${intento}`;
  }

  const contrasena = generarContrasena();
  const passwordHash = await bcrypt.hash(contrasena, 10);
  await prisma.usuario.create({
    data: {
      nombre: `${espacio.nombre} (expositor)`,
      email,
      passwordHash,
      rol: "EXPOSITOR",
      espacioId: espacio.id,
    },
  });

  revalidatePath("/directorio");
  return { email, contrasena };
}

export async function regenerarContrasenaUsuario(id: string) {
  await requireAdmin();
  const contrasena = generarContrasena();
  const passwordHash = await bcrypt.hash(contrasena, 10);
  const usuario = await prisma.usuario.update({ where: { id }, data: { passwordHash } });
  revalidatePath("/directorio");
  revalidatePath("/admin/usuarios");
  return { email: usuario.email, contrasena };
}

// ── Flujo de renders: subir (expositor) / aprobar-rechazar (operación) ─

export async function subirVersion(data: { espacioId?: string; renderUrls: string[]; mapaUrl?: string; nota?: string }) {
  const { session, espacioId } = await resolverEspacioParaSubida(data.espacioId);

  const ultima = await prisma.versionEntrega.findFirst({
    where: { espacioId },
    orderBy: { fecha: "desc" },
  });
  if (ultima && ultima.estado !== "RECHAZADA") {
    throw new Error(
      ultima.estado === "APROBADA"
        ? "Este espacio ya tiene un render aprobado. No se pueden subir más versiones."
        : "Ya hay una versión en revisión. Espera a que se apruebe o se rechace antes de subir otra."
    );
  }
  if (data.renderUrls.length === 0) {
    throw new Error("Debes adjuntar al menos una imagen o PDF del render.");
  }

  const numeroAnterior = ultima ? parseInt(ultima.version.replace(/\D/g, ""), 10) || 0 : 0;
  const version = `v${numeroAnterior + 1}`;

  await prisma.versionEntrega.create({
    data: {
      espacioId,
      version,
      estado: "PENDIENTE",
      renderUrls: data.renderUrls,
      mapaUrl: data.mapaUrl,
      nota: data.nota?.trim() || undefined,
      autor: session.user.name || undefined,
      subidoPorId: session.user.id,
    },
  });

  await prisma.espacio.update({ where: { id: espacioId }, data: { estado: "EN_REVISION" } });

  revalidatePath("/mi-stand");
  revalidatePath("/renders");
  revalidatePath("/tablero");
  revalidatePath("/mapa");
  revalidatePath("/directorio");
  revalidatePath("/espacios");
}

export async function decidirVersion(versionId: string, estado: "APROBADA" | "RECHAZADA", comentario?: string) {
  const session = await requireEditor();
  if (estado === "RECHAZADA" && !comentario?.trim()) {
    throw new Error("Indica el motivo del rechazo para que el expositor sepa qué corregir.");
  }

  const version = await prisma.versionEntrega.update({
    where: { id: versionId },
    data: {
      estado,
      comentario: comentario?.trim() || null,
      revisadoPorId: session.user.id,
      revisadoEn: new Date(),
    },
  });

  if (estado === "APROBADA") {
    await prisma.espacio.update({
      where: { id: version.espacioId },
      data: { estado: "APROBADO", renderUrl: version.renderUrls[0] ?? undefined },
    });
  }

  revalidatePath("/renders");
  revalidatePath("/mi-stand");
  revalidatePath("/tablero");
  revalidatePath("/mapa");
  revalidatePath("/directorio");
  revalidatePath("/espacios");
}

// Solo Admin puede eliminar un render subido (duplicado, subido por error,
// etc.). Al borrar, el estado del stand se recalcula según la versión más
// reciente que quede (o vuelve a SIN_RENDER si no queda ninguna).
export async function eliminarVersion(versionId: string) {
  await requireAdmin();
  const version = await prisma.versionEntrega.findUnique({ where: { id: versionId } });
  if (!version) throw new Error("Versión no encontrada.");

  await prisma.versionEntrega.delete({ where: { id: versionId } });

  const restante = await prisma.versionEntrega.findFirst({
    where: { espacioId: version.espacioId },
    orderBy: { fecha: "desc" },
  });

  if (!restante) {
    await prisma.espacio.update({ where: { id: version.espacioId }, data: { estado: "SIN_RENDER", renderUrl: null } });
  } else if (restante.estado === "APROBADA") {
    await prisma.espacio.update({
      where: { id: version.espacioId },
      data: { estado: "APROBADO", renderUrl: restante.renderUrls[0] ?? null },
    });
  } else if (restante.estado === "PENDIENTE") {
    await prisma.espacio.update({ where: { id: version.espacioId }, data: { estado: "EN_REVISION" } });
  }

  revalidatePath("/renders");
  revalidatePath("/mi-stand");
  revalidatePath("/tablero");
  revalidatePath("/mapa");
  revalidatePath("/directorio");
  revalidatePath("/espacios");
}

// ── CRM de invitados ──────────────────────────────────────────────

export async function crearEtapaInvitado(eventoId: string, nombre: string) {
  await requireEditor();
  const n = nombre.trim();
  if (!n) throw new Error("El nombre de la etapa es obligatorio.");
  const ultima = await prisma.etapaInvitado.findFirst({ where: { eventoId }, orderBy: { orden: "desc" } });
  const etapa = await prisma.etapaInvitado.upsert({
    where: { eventoId_nombre: { eventoId, nombre: n } },
    update: {},
    create: { eventoId, nombre: n, orden: (ultima?.orden ?? -1) + 1 },
  });
  revalidatePath("/invitados");
  return etapa;
}

export async function eliminarEtapaInvitado(id: string) {
  await requireAdmin();
  await prisma.etapaInvitado.delete({ where: { id } });
  revalidatePath("/invitados");
}

type DatosInvitado = {
  nombre: string;
  empresa?: string | null;
  telefono?: string | null;
  correo?: string | null;
  notas?: string | null;
  etapaId?: string | null;
};

export async function crearInvitado(eventoId: string, data: DatosInvitado) {
  await requireEditor();
  const nombre = data.nombre?.trim();
  if (!nombre) throw new Error("El nombre es obligatorio.");
  const invitado = await prisma.invitado.create({
    data: {
      eventoId,
      nombre,
      empresa: data.empresa?.trim() || null,
      telefono: data.telefono?.trim() || null,
      correo: data.correo?.trim() || null,
      notas: data.notas?.trim() || null,
      etapaId: data.etapaId || null,
    },
  });
  revalidatePath("/invitados");
  return invitado;
}

export async function actualizarInvitado(id: string, data: Partial<DatosInvitado>) {
  await requireEditor();
  const payload: Record<string, any> = {};
  if ("nombre" in data) {
    if (!data.nombre?.trim()) throw new Error("El nombre es obligatorio.");
    payload.nombre = data.nombre.trim();
  }
  if ("empresa" in data) payload.empresa = data.empresa?.trim() || null;
  if ("telefono" in data) payload.telefono = data.telefono?.trim() || null;
  if ("correo" in data) payload.correo = data.correo?.trim() || null;
  if ("notas" in data) payload.notas = data.notas?.trim() || null;
  if ("etapaId" in data) payload.etapaId = data.etapaId || null;

  await prisma.invitado.update({ where: { id }, data: payload });
  revalidatePath("/invitados");
}

export async function eliminarInvitado(id: string) {
  await requireEditor();
  await prisma.invitado.delete({ where: { id } });
  revalidatePath("/invitados");
}

export async function eliminarInvitadosMasivo(ids: string[]) {
  await requireEditor();
  if (ids.length === 0) return;
  await prisma.invitado.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/invitados");
}

export async function asignarEtapaInvitadosMasivo(ids: string[], etapaId: string | null) {
  await requireEditor();
  if (ids.length === 0) return;
  await prisma.invitado.updateMany({ where: { id: { in: ids } }, data: { etapaId } });
  revalidatePath("/invitados");
}

// Importación masiva desde Excel: el navegador ya parseó el archivo y
// manda las filas como JSON (nombre es la única columna obligatoria).
export async function importarInvitadosExcel(
  eventoId: string,
  filas: {
    nombre: string;
    empresa?: string;
    telefono?: string;
    correo?: string;
    notas?: string;
    etapaNombre?: string;
  }[]
) {
  await requireEditor();
  const validas = filas
    .map((f) => ({
      nombre: f.nombre?.trim() || "",
      empresa: f.empresa?.trim() || null,
      telefono: f.telefono?.trim() || null,
      correo: f.correo?.trim() || null,
      notas: f.notas?.trim() || null,
      etapaNombre: f.etapaNombre?.trim() || null,
    }))
    .filter((f) => f.nombre);

  if (validas.length === 0) throw new Error("No se encontró ninguna fila con nombre válido en el archivo.");

  // Si el archivo trae una columna de estatus/confirmación, cada valor distinto
  // se convierte en una etapa de seguimiento (reutilizando las que ya existan).
  const nombresEtapa = Array.from(new Set(validas.map((f) => f.etapaNombre).filter((n): n is string => !!n)));
  const etapaIdPorNombre = new Map<string, string>();
  if (nombresEtapa.length > 0) {
    const existentes = await prisma.etapaInvitado.findMany({ where: { eventoId, nombre: { in: nombresEtapa } } });
    for (const e of existentes) etapaIdPorNombre.set(e.nombre, e.id);
    const faltantes = nombresEtapa.filter((n) => !etapaIdPorNombre.has(n));
    if (faltantes.length > 0) {
      const ultima = await prisma.etapaInvitado.findFirst({ where: { eventoId }, orderBy: { orden: "desc" } });
      let orden = (ultima?.orden ?? -1) + 1;
      for (const n of faltantes) {
        const etapa = await prisma.etapaInvitado.create({ data: { eventoId, nombre: n, orden: orden++ } });
        etapaIdPorNombre.set(n, etapa.id);
      }
    }
  }

  const creados = await prisma.$transaction(
    validas.map((f) =>
      prisma.invitado.create({
        data: {
          eventoId,
          nombre: f.nombre,
          empresa: f.empresa,
          telefono: f.telefono,
          correo: f.correo,
          notas: f.notas,
          etapaId: f.etapaNombre ? etapaIdPorNombre.get(f.etapaNombre) ?? null : null,
        },
      })
    )
  );
  revalidatePath("/invitados");
  return {
    invitados: creados,
    etapas: nombresEtapa.map((n) => ({ id: etapaIdPorNombre.get(n)!, nombre: n })),
  };
}
