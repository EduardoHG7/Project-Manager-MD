import { prisma } from "@/lib/db";
import { UsuariosClient } from "./UsuariosClient";

export const dynamic = "force-dynamic";

const ORDEN_ROL: Record<string, number> = { ADMIN: 0, SUPERVISOR: 1, LECTURA: 2 };

export default async function AdminUsuariosPage() {
  const usuariosDb = await prisma.usuario.findMany({
    where: { rol: { in: ["ADMIN", "SUPERVISOR", "LECTURA"] } },
    orderBy: { nombre: "asc" },
  });

  const usuarios = [...usuariosDb].sort((a, b) => {
    const rol = (ORDEN_ROL[a.rol] ?? 99) - (ORDEN_ROL[b.rol] ?? 99);
    if (rol !== 0) return rol;
    if (a.activo !== b.activo) return a.activo ? -1 : 1;
    return a.nombre.localeCompare(b.nombre);
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
