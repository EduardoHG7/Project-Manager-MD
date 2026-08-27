import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export async function getEventoActivo() {
  const evento = await prisma.evento.findFirst({
    where: { activo: true },
    orderBy: { createdAt: "desc" },
  });
  if (!evento) notFound();
  return evento;
}
