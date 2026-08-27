import { prisma } from "@/lib/db";
import { getEventoActivo } from "@/lib/evento";
import { MapaClient, type EspacioMapa } from "./MapaClient";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const evento = await getEventoActivo();

  const espacios = await prisma.espacio.findMany({
    where: { eventoId: evento.id },
    include: {
      distribuidor: true,
      proveedor: true,
      incumplimientos: { where: { estado: { not: "CERRADA" } }, select: { id: true } },
    },
    orderBy: [{ fila: "asc" }, { numero: "asc" }],
  });

  const data: EspacioMapa[] = espacios.map((e) => ({
    id: e.id,
    numero: e.numero,
    nombre: e.nombre,
    categoria: e.categoria,
    fila: e.fila,
    medidas: e.medidas,
    estado: e.estado,
    x: e.x,
    y: e.y,
    distribuidor: e.distribuidor?.nombre || null,
    proveedor: e.proveedor?.nombre || null,
    tieneDesviacion: e.incumplimientos.length > 0,
  }));

  return (
    <MapaClient
      espacios={data}
      planoUrl={evento.planoUrl || "/plano/plano-general.png"}
      planoAncho={evento.planoAncho}
      planoAlto={evento.planoAlto}
    />
  );
}
