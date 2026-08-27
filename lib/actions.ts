"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
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

export async function actualizarEstadoEspacio(espacioId: string, estado: string) {
  await requireEditor();
  await prisma.espacio.update({ where: { id: espacioId }, data: { estado } });
  revalidatePath("/tablero");
  revalidatePath("/mapa");
  revalidatePath("/directorio");
}

export async function actualizarEspacio(espacioId: string, data: Record<string, any>) {
  await requireEditor();
  const permitido = [
    "medidas",
    "areaM2",
    "alturaMaxCm",
    "autosEnPiso",
    "cargaElectricaKw",
    "puntosLuz",
    "pisoTarima",
  ];
  const payload: Record<string, any> = {};
  for (const k of permitido) {
    if (k in data) payload[k] = data[k];
  }
  await prisma.espacio.update({ where: { id: espacioId }, data: payload });
  revalidatePath(`/espacios`);
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

export async function agregarVersion(
  espacioId: string,
  data: { version: string; estado: string; nota?: string; autor?: string }
) {
  const session = await requireEditor();
  await prisma.versionEntrega.create({
    data: {
      espacioId,
      version: data.version,
      estado: data.estado,
      nota: data.nota,
      autor: data.autor || session.user.name || session.user.email || undefined,
    },
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

// ── Admin: espacios (clic en el plano) ───────────────────────────────

type DatosEspacio = {
  numero: string;
  nombre: string;
  categoria: string;
  fila?: string;
  medidas?: string;
  areaM2?: number;
  alturaMaxCm?: number;
  distribuidorId?: string;
  proveedorId?: string;
};

function limpiarDatosEspacio(data: DatosEspacio) {
  return {
    numero: data.numero.trim(),
    nombre: data.nombre.trim(),
    categoria: data.categoria,
    fila: data.fila?.trim() || null,
    medidas: data.medidas?.trim() || null,
    areaM2: data.areaM2 ?? null,
    alturaMaxCm: data.alturaMaxCm ?? 550,
    distribuidorId: data.distribuidorId || null,
    proveedorId: data.proveedorId || null,
  };
}

export async function crearEspacio(eventoId: string, x: number, y: number, data: DatosEspacio) {
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

// ── Admin: distribuidores y proveedores ──────────────────────────────

export async function crearDistribuidor(nombre: string) {
  await requireAdmin();
  const n = nombre.trim();
  if (!n) throw new Error("El nombre es obligatorio.");
  await prisma.distribuidor.upsert({ where: { nombre: n }, update: {}, create: { nombre: n } });
  revalidatePath("/admin/distribuidores");
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
