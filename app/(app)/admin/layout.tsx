import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session?.user.rol !== "ADMIN") redirect("/tablero");

  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
