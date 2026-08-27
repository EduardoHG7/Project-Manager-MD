import { prisma } from "@/lib/db";
import { UsuariosClient } from "./UsuariosClient";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const usuarios = await prisma.usuario.findMany({
    where: { rol: { in: ["ADMIN", "SUPERVISOR", "LECTURA"] } },
    orderBy: [{ rol: "asc" }, { nombre: "asc" }],
  });

  return (
    <main className="page">
      <h1>Usuarios de operación</h1>
      <p className="text-muted">
        Personal interno que puede ver el sistema, registrar avances y aprobar renders. Los accesos de
        expositores se crean desde el Directorio.
      </p>
      <UsuariosClient
        usuarios={usuarios.map((u) => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: u.rol,
          activo: u.activo,
        }))}
      />
    </main>
  );
}
