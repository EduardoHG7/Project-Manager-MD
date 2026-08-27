import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEventos, getEventoSeleccionado } from "@/lib/evento";
import { AppShell } from "./AppShell";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.rol === "EXPOSITOR") redirect("/mi-stand");

  const [eventos, eventoSeleccionado] = await Promise.all([getEventos(), getEventoSeleccionado()]);

  return (
    <AppShell
      userName={session.user.name || session.user.email || ""}
      rol={session.user.rol}
      eventos={eventos.map((e) => ({ id: e.id, nombre: e.nombre }))}
      eventoSeleccionadoId={eventoSeleccionado?.id ?? null}
    >
      {children}
    </AppShell>
  );
}
