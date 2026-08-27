import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventoSeleccionado } from "@/lib/evento";
import { SinEvento } from "../_shared/SinEvento";
import { DirectorioClient } from "./DirectorioClient";

export const dynamic = "force-dynamic";

export default async function DirectorioPage() {
  const evento = await getEventoSeleccionado();
  const session = await getServerSession(authOptions);
  if (!evento) return <SinEvento esAdmin={session?.user.rol === "ADMIN"} />;
  const canEdit = session?.user.rol === "ADMIN";

  const espacios = await prisma.espacio.findMany({
    where: { eventoId: evento.id },
    include: {
      distribuidor: true,
      proveedor: true,
      incumplimientos: { where: { estado: { not: "CERRADA" } }, select: { id: true } },
    },
    orderBy: [{ categoria: "asc" }, { fila: "asc" }, { numero: "asc" }],
  });

  const distribuidores = await prisma.distribuidor.findMany({
    include: { _count: { select: { espacios: true } } },
    orderBy: { nombre: "asc" },
  });

  const proveedores = await prisma.proveedorConstructor.findMany({
    include: { _count: { select: { espacios: true } } },
    orderBy: { nombre: "asc" },
  });

  return (
    <main className="page">
      <h2>Directorio</h2>
      <p className="text-muted">
        Expositores, grupos representantes y proveedores de montaje.
        {canEdit && " Haz clic en cualquier celda para editarla."}
      </p>

      <DirectorioClient
        canEdit={canEdit}
        espacios={espacios.map((e) => ({
          id: e.id,
          numero: e.numero,
          nombre: e.nombre,
          categoria: e.categoria,
          medidas: e.medidas,
          areaM2: e.areaM2,
          alturaMaxCm: e.alturaMaxCm,
          estado: e.estado,
          distribuidorId: e.distribuidorId,
          proveedorId: e.proveedorId,
          tieneDesviacion: e.incumplimientos.length > 0,
        }))}
        distribuidores={distribuidores.map((d) => ({ id: d.id, nombre: d.nombre }))}
        proveedores={proveedores.map((p) => ({ id: p.id, nombre: p.nombre }))}
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 28, marginTop: 32 }}>
        <section>
          <h6 className="text-muted">Grupos / distribuidores</h6>
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th style={{ textAlign: "right" }}>Stands</th>
              </tr>
            </thead>
            <tbody>
              {distribuidores.map((d) => (
                <tr key={d.id}>
                  <td>{d.nombre}</td>
                  <td style={{ textAlign: "right" }}>{d._count.espacios}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <h6 className="text-muted">Proveedores constructores</h6>
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th style={{ textAlign: "right" }}>Stands</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td className="text-muted">
                    {p.contacto || "—"} {p.telefono ? `· ${p.telefono}` : ""}
                  </td>
                  <td style={{ textAlign: "right" }}>{p._count.espacios}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
