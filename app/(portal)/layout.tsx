import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PortalShell } from "./PortalShell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.rol !== "EXPOSITOR") redirect("/tablero");

  return <PortalShell userName={session.user.name || ""}>{children}</PortalShell>;
}
