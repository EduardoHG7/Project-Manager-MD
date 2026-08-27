import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "./AppShell";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const evento = await prisma.evento.findFirst({ where: { activo: true }, orderBy: { createdAt: "desc" } });

  return (
    <AppShell userName={session.user.name || session.user.email || ""} rol={session.user.rol} eventoNombre={evento?.nombre}>
      {children}
    </AppShell>
  );
}
