import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventoSeleccionado } from "@/lib/evento";
import { SinEvento } from "../_shared/SinEvento";
import { InvitadosClient } from "./InvitadosClient";

export const dynamic = "force-dynamic";

export default async function InvitadosPage() {
  const evento = await getEventoSeleccionado();
  const session = await getServerSession(authOptions);
  if (!evento) return <SinEvento esAdmin={session?.user.rol === "ADMIN"} />;
  const canEdit = session?.user.rol === "ADMIN" || session?.user.rol === "SUPERVISOR";
  const esAdmin = session?.user.rol === "ADMIN";

  const [invitados, etapas] = await Promise.all([
    prisma.invitado.findMany({
      where: { eventoId: evento.id },
      include: { etapa: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.etapaInvitado.findMany({
      where: { eventoId: evento.id },
      orderBy: { orden: "asc" },
    }),
  ]);

  return (
    <main className="page">
      <h2>Invitados</h2>
      <p className="text-muted">
        Lista de invitados y su etapa de seguimiento. {canEdit && "Haz clic en cualquier celda para editarla."}
      </p>

      <InvitadosClient
        eventoId={evento.id}
        canEdit={canEdit}
        esAdmin={esAdmin}
        etapas={etapas.map((e) => ({ id: e.id, nombre: e.nombre }))}
        invitados={invitados.map((i) => ({
          id: i.id,
          nombre: i.nombre,
          empresa: i.empresa,
          telefono: i.telefono,
          correo: i.correo,
          notas: i.notas,
          etapaId: i.etapaId,
        }))}
      />
    </main>
  );
}
