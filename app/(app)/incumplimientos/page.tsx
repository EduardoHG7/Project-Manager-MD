import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventoActivo } from "@/lib/evento";
import { IncumplimientosClient } from "./IncumplimientosClient";

export const dynamic = "force-dynamic";

export default async function IncumplimientosPage() {
  const evento = await getEventoActivo();
  const session = await getServerSession(authOptions);
  const canEdit = session?.user.rol === "ADMIN" || session?.user.rol === "SUPERVISOR";

  const incumplimientos = await prisma.incumplimiento.findMany({
    where: { espacio: { eventoId: evento.id } },
    include: { espacio: true, proveedor: true },
    orderBy: [{ createdAt: "desc" }],
  });

  const unaSemanaAtras = new Date();
  unaSemanaAtras.setDate(unaSemanaAtras.getDate() - 7);

  const kpis = {
    criticas: incumplimientos.filter((i) => i.severidad === "CRITICA" && i.estado !== "CERRADA").length,
    mayores: incumplimientos.filter((i) => i.severidad === "MAYOR" && i.estado !== "CERRADA").length,
    menores: incumplimientos.filter((i) => i.severidad === "MENOR" && i.estado !== "CERRADA").length,
    cerradasSemana: incumplimientos.filter((i) => i.estado === "CERRADA" && i.cerradoEn && i.cerradoEn >= unaSemanaAtras).length,
  };

  return (
    <IncumplimientosClient
      canEdit={canEdit}
      kpis={kpis}
      items={incumplimientos.map((i) => ({
        id: i.id,
        severidad: i.severidad,
        espacioNumero: i.espacio.numero,
        espacioNombre: i.espacio.nombre,
        titulo: i.titulo,
        detalle: i.detalle,
        etapa: i.etapa,
        proveedor: i.proveedor?.nombre || null,
        fechaLimite: i.fechaLimite ? i.fechaLimite.toISOString() : null,
        estado: i.estado,
      }))}
    />
  );
}
