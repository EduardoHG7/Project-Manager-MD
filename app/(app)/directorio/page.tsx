import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventoSeleccionado } from "@/lib/evento";
import { ESTADO_LABEL, ESTADO_PILL } from "@/lib/estados";
import { SinEvento } from "../_shared/SinEvento";

export const dynamic = "force-dynamic";

export default async function DirectorioPage() {
  const evento = await getEventoSeleccionado();
  if (!evento) {
    const session = await getServerSession(authOptions);
    return <SinEvento esAdmin={session?.user.rol === "ADMIN"} />;
  }

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
      <p className="text-muted">Expositores, grupos representantes y proveedores de montaje.</p>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Expositor</th>
              <th>Grupo / representante</th>
              <th>Medidas</th>
              <th>m²</th>
              <th>Proveedor de stand</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {espacios.map((e) => (
              <tr key={e.id}>
                <td style={{ fontWeight: 700 }}>{e.numero}</td>
                <td>
                  <Link href={`/espacios/${encodeURIComponent(e.numero)}`} style={{ color: "inherit" }}>
                    {e.nombre}
                  </Link>
                </td>
                <td className="text-muted">{e.distribuidor?.nombre || "—"}</td>
                <td>{e.medidas || "—"}</td>
                <td>{e.areaM2 ?? "—"}</td>
                <td>{e.proveedor?.nombre || "—"}</td>
                <td>
                  <span className={`pill ${e.incumplimientos.length ? "pill-red" : ESTADO_PILL[e.estado]}`}>
                    {e.incumplimientos.length ? "Desviación" : ESTADO_LABEL[e.estado]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
