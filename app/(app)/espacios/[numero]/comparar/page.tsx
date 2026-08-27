import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventoActivo } from "@/lib/evento";
import { CompararClient } from "./CompararClient";

export const dynamic = "force-dynamic";

export default async function CompararPage({ params }: { params: { numero: string } }) {
  const evento = await getEventoActivo();
  const session = await getServerSession(authOptions);
  const canEdit = session?.user.rol === "ADMIN" || session?.user.rol === "SUPERVISOR";

  const espacio = await prisma.espacio.findUnique({
    where: { eventoId_numero: { eventoId: evento.id, numero: params.numero } },
    include: {
      pins: {
        include: { mediciones: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { numero: "asc" },
      },
    },
  });
  if (!espacio) notFound();

  return (
    <CompararClient
      espacioId={espacio.id}
      numero={espacio.numero}
      nombre={espacio.nombre}
      renderUrl={espacio.renderUrl}
      pins={espacio.pins.map((p) => ({
        id: p.id,
        numero: p.numero,
        x: p.x,
        y: p.y,
        elemento: p.elemento,
        nota: p.nota,
        resuelto: p.resuelto,
        medicion: p.mediciones[0]
          ? {
              especificacion: p.mediciones[0].especificacion,
              valorEsperado: p.mediciones[0].valorEsperado,
              valorMedido: p.mediciones[0].valorMedido,
              unidad: p.mediciones[0].unidad,
              conforme: p.mediciones[0].conforme,
            }
          : null,
      }))}
      canEdit={canEdit}
    />
  );
}
