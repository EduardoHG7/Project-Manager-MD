import { prisma } from "@/lib/db";
import { ProveedoresClient } from "./ProveedoresClient";

export const dynamic = "force-dynamic";

export default async function AdminProveedoresPage() {
  const proveedores = await prisma.proveedorConstructor.findMany({
    include: { _count: { select: { espacios: true } } },
    orderBy: { nombre: "asc" },
  });

  return (
    <main className="page">
      <h1>Proveedores constructores</h1>
      <p className="text-muted">Empresas responsables de construir y montar los stands.</p>
      <ProveedoresClient
        proveedores={proveedores.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          contacto: p.contacto,
          telefono: p.telefono,
          stands: p._count.espacios,
        }))}
      />
    </main>
  );
}
