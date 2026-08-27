import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { Evento } from "@prisma/client";

const COOKIE = "eventoId";

export async function getEventos() {
  return prisma.evento.findMany({ orderBy: { createdAt: "desc" } });
}

/**
 * El evento que este visitante está viendo. Se recuerda por cookie (no hay
 * "el" evento activo global: cada quien puede estar viendo una feria
 * distinta, por ejemplo un admin armando la próxima mientras el equipo de
 * obra sigue viendo la actual). Si la cookie no apunta a nada válido, cae
 * al evento más reciente. Devuelve null si todavía no existe ningún
 * evento — cada pantalla decide cómo mostrar ese estado vacío.
 */
export async function getEventoSeleccionado(): Promise<Evento | null> {
  const cookieStore = cookies();
  const id = cookieStore.get(COOKIE)?.value;

  if (id) {
    const evento = await prisma.evento.findUnique({ where: { id } });
    if (evento) return evento;
  }

  return prisma.evento.findFirst({ orderBy: { createdAt: "desc" } });
}

export { COOKIE as EVENTO_COOKIE };
