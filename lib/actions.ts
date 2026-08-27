"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { evaluarConformidad, generarIncumplimientoSiAplica } from "@/lib/tolerancia";

async function requireEditor() {
  const session = await getServerSession(authOptions);
  const rol = session?.user?.rol;
  if (rol !== "ADMIN" && rol !== "SUPERVISOR") {
    throw new Error("No tienes permiso para hacer cambios. Se requiere rol Supervisor o Admin.");
  }
  return session!;
}

async function guardarFoto(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const nombre = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, nombre), bytes);
  return `/uploads/${nombre}`;
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
    fotos.push(await guardarFoto(archivo));
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
