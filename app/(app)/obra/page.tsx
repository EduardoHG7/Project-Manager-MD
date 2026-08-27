import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventoSeleccionado } from "@/lib/evento";
import { ObraClient } from "./ObraClient";
import { SinEvento } from "../_shared/SinEvento";

export const dynamic = "force-dynamic";

function inicioDelDia(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function finDelDia(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default async function ObraPage() {
  const evento = await getEventoSeleccionado();
  const session = await getServerSession(authOptions);
  if (!evento) return <SinEvento esAdmin={session?.user.rol === "ADMIN"} />;
  const canEdit = session?.user.rol === "ADMIN" || session?.user.rol === "SUPERVISOR";

  const hoy = new Date();
  const desde = inicioDelDia(hoy);
  const hasta = finDelDia(hoy);

  const visitas = await prisma.visitaProgramada.findMany({
    where: { espacio: { eventoId: evento.id }, fecha: { gte: desde, lte: hasta } },
    include: { espacio: true },
    orderBy: { orden: "asc" },
  });

  const mediciones = await prisma.medicion.findMany({
    where: { espacio: { eventoId: evento.id }, createdAt: { gte: desde, lte: hasta } },
  });
  const fueraDeTolerancia = mediciones.filter((m) => m.conforme === false).length;
  const fotosSubidas = mediciones.reduce((acc, m) => acc + (JSON.parse(m.fotos || "[]") as string[]).length, 0);

  const espaciosActivos = await prisma.espacio.findMany({
    where: { eventoId: evento.id, estado: { in: ["EN_FABRICACION", "MONTADO"] } },
    select: { id: true, numero: true, nombre: true },
    orderBy: { numero: "asc" },
  });

  return (
    <ObraClient
      canEdit={canEdit}
      kpis={{
        inspeccionadas: visitas.filter((v) => v.estado === "CERRADO").length,
        totalVisitas: visitas.length,
        fueraDeTolerancia,
        fotosSubidas,
      }}
      visitas={visitas.map((v) => ({
        id: v.id,
        hora: v.hora,
        tarea: v.tarea,
        estado: v.estado,
        espacioId: v.espacioId,
        espacioNumero: v.espacio.numero,
        espacioNombre: v.espacio.nombre,
      }))}
      espaciosActivos={espaciosActivos}
    />
  );
}
