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
// puede subir en nombre de cualquier espacio, indicando espacioId en el formData.
async function resolverEspacioParaSubida(formData: FormData) {
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
    const espacioId = String(formData.get("espacioId") || "");
    if (!espacioId) throw new Error("Falta el espacio.");
    return { session: session!, espacioId };
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

export async function subirVersion(formData: FormData) {
  const { session, espacioId } = await resolverEspacioParaSubida(formData);

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

  const numeroAnterior = ultima ? parseInt(ultima.version.replace(/\D/g, ""), 10) || 0 : 0;
  const version = `v${numeroAnterior + 1}`;

  const renders = formData.getAll("render").filter((f): f is File => f instanceof File && f.size > 0);
  if (renders.length === 0) {
    throw new Error("Debes adjuntar al menos una imagen o PDF del render.");
  }
  const renderUrls: string[] = [];
  for (const render of renders) {
    renderUrls.push(await guardarArchivo(render, "renders"));
  }

  let mapaUrl: string | undefined;
  const mapa = formData.get("mapa");
  if (mapa instanceof File && mapa.size > 0) {
    mapaUrl = await guardarArchivo(mapa, "renders");
  }

  const nota = String(formData.get("nota") || "").trim() || undefined;

  await prisma.versionEntrega.create({
    data: {
      espacioId,
      version,
      estado: "PENDIENTE",
      renderUrls,
      mapaUrl,
      nota,
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
