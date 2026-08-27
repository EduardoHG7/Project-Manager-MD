import Link from "next/link";
import { prisma } from "@/lib/db";
import { getEventoActivo } from "@/lib/evento";
import { ESTADO_LABEL, ESTADO_PILL } from "@/lib/estados";

export const dynamic = "force-dynamic";

export default async function EspaciosIndexPage() {
  const evento = await getEventoActivo();
  const espacios = await prisma.espacio.findMany({
    where: { eventoId: evento.id },
    include: { distribuidor: true, incumplimientos: { where: { estado: { not: "CERRADA" } }, select: { id: true } } },
    orderBy: [{ fila: "asc" }, { numero: "asc" }],
  });

  return (
    <main className="page">
      <h1>Ficha de stand</h1>
      <p className="text-muted">Selecciona un espacio para ver su ficha completa.</p>
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Expositor</th>
              <th>Grupo</th>
              <th>Medidas</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {espacios.map((e) => (
              <tr key={e.id}>
                <td style={{ fontWeight: 700 }}>{e.numero}</td>
                <td>{e.nombre}</td>
                <td className="text-muted">{e.distribuidor?.nombre || "—"}</td>
                <td className="text-muted">{e.medidas || "—"}</td>
                <td>
                  <span className={`pill ${e.incumplimientos.length ? "pill-red" : ESTADO_PILL[e.estado]}`}>
                    {e.incumplimientos.length ? "Desviación" : ESTADO_LABEL[e.estado]}
                  </span>
                </td>
                <td>
                  <Link href={`/espacios/${encodeURIComponent(e.numero)}`} className="btn-ghost">
                    Ver ficha →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
