import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Páginas pensadas para imprimir / guardar como PDF: misma sesión que el
// resto de la app, pero sin el encabezado ni las pestañas de AppShell.
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.rol === "EXPOSITOR") redirect("/mi-stand");

  return <>{children}</>;
}
