import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventoSeleccionado } from "@/lib/evento";
import { SinEvento } from "../_shared/SinEvento";
import { RendersClient } from "./RendersClient";

export const dynamic = "force-dynamic";

export default async function RendersPage() {
  const evento = await getEventoSeleccionado();
  const session = await getServerSession(authOptions);
  if (!evento) return <SinEvento esAdmin={session?.user.rol === "ADMIN"} />;
  const canEdit = session?.user.rol === "ADMIN" || session?.user.rol === "SUPERVISOR";

  const versiones = await prisma.versionEntrega.findMany({
    where: { espacio: { eventoId: evento.id } },
    include: { espacio: true, subidoPor: true, revisadoPor: true },
    orderBy: { fecha: "desc" },
  });

  const pendientes = versiones.filter((v) => v.estado === "PENDIENTE");
  const decididas = versiones.filter((v) => v.estado !== "PENDIENTE").slice(0, 30);

  const datos = (v: (typeof versiones)[number]) => ({
    id: v.id,
    espacioNumero: v.espacio.numero,
    espacioNombre: v.espacio.nombre,
    version: v.version,
    estado: v.estado,
    renderUrls: v.renderUrls,
    mapaUrl: v.mapaUrl,
    nota: v.nota,
    fecha: v.fecha.toISOString(),
    subidoPor: v.subidoPor?.nombre || v.autor || null,
    revisadoPor: v.revisadoPor?.nombre || null,
    revisadoEn: v.revisadoEn ? v.revisadoEn.toISOString() : null,
    comentario: v.comentario,
  });

  return (
    <RendersClient
      canEdit={canEdit}
      pendientes={pendientes.map(datos)}
      decididas={decididas.map(datos)}
    />
  );
}
