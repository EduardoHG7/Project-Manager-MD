import { prisma } from "@/lib/db";
import { DistribuidoresClient } from "./DistribuidoresClient";

export const dynamic = "force-dynamic";

export default async function AdminDistribuidoresPage() {
  const distribuidores = await prisma.distribuidor.findMany({
    include: { _count: { select: { espacios: true } } },
    orderBy: { nombre: "asc" },
  });

  return (
    <main className="page">
      <h1>Distribuidores</h1>
      <p className="text-muted">Grupos que representan una marca frente al organizador (ej. un distribuidor automotriz).</p>
      <DistribuidoresClient
        distribuidores={distribuidores.map((d) => ({ id: d.id, nombre: d.nombre, stands: d._count.espacios }))}
      />
    </main>
  );
}
