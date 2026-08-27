import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventoSeleccionado } from "@/lib/evento";
import { ESTADO_LABEL, ESTADO_PILL, fmtFecha } from "@/lib/estados";
import { EstadoSelector } from "./EstadoSelector";
import { EtapasEditor } from "./EtapasEditor";
import { MaterialesEditor } from "./MaterialesEditor";
import { VersionesForm } from "./VersionesForm";

export const dynamic = "force-dynamic";

export default async function FichaStandPage({ params }: { params: { numero: string } }) {
  const evento = await getEventoSeleccionado();
  if (!evento) notFound();
  const session = await getServerSession(authOptions);
  const canEdit = session?.user.rol === "ADMIN" || session?.user.rol === "SUPERVISOR";

  const espacio = await prisma.espacio.findUnique({
    where: { eventoId_numero: { eventoId: evento.id, numero: params.numero } },
    include: {
      distribuidor: true,
      proveedor: true,
      etapas: { orderBy: { orden: "asc" } },
      versiones: { orderBy: { fecha: "desc" } },
      materiales: { orderBy: { orden: "asc" } },
      pins: true,
      incumplimientos: { where: { estado: { not: "CERRADA" } } },
    },
  });
  if (!espacio) notFound();

  return (
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h6 className="text-muted">
            Espacio {espacio.numero} · {espacio.fila ? `Hall ${espacio.fila}` : espacio.categoria}
          </h6>
          <h2 style={{ margin: 0 }}>{espacio.nombre}</h2>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className={`pill ${espacio.incumplimientos.length ? "pill-red" : ESTADO_PILL[espacio.estado]}`}>
            {espacio.incumplimientos.length ? "Desviación abierta" : ESTADO_LABEL[espacio.estado]}
          </span>
          {canEdit && <EstadoSelector espacioId={espacio.id} estadoActual={espacio.estado} />}
          <Link href={`/espacios/${encodeURIComponent(espacio.numero)}/comparar`} className="btn btn-secondary">
            Comparar render vs. obra
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 32, marginTop: 24 }}>
        <section>
          <h6 className="text-muted">Progreso por disciplina</h6>
          <EtapasEditor espacioId={espacio.id} etapas={espacio.etapas} canEdit={canEdit} />

          <h6 className="text-muted" style={{ marginTop: 28 }}>
            Materiales y acabados
          </h6>
          <MaterialesEditor espacioId={espacio.id} materiales={espacio.materiales} canEdit={canEdit} />

          <h6 className="text-muted" style={{ marginTop: 28 }}>
            Historial de versiones
          </h6>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {espacio.versiones.length === 0 && <p className="text-muted">Aún no hay versiones registradas.</p>}
            {espacio.versiones.map((v) => (
              <div key={v.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{v.version}</strong>
                  <span className="pill pill-soft">{v.estado}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    {fmtFecha(v.fecha)}
                  </span>
                </div>
                {v.nota && <p style={{ margin: 0, fontSize: 13.5 }}>{v.nota}</p>}
                {v.autor && <span className="text-muted" style={{ fontSize: 11 }}>{v.autor}</span>}
              </div>
            ))}
          </div>
          {canEdit && <VersionesForm espacioId={espacio.id} />}
        </section>

        <aside>
          <h6 className="text-muted">Especificaciones</h6>
          <table className="table">
            <tbody>
              <tr>
                <td className="text-muted">Medidas en planta</td>
                <td style={{ textAlign: "right" }}>{espacio.medidas || "—"}</td>
              </tr>
              <tr>
                <td className="text-muted">Área</td>
                <td style={{ textAlign: "right" }}>{espacio.areaM2 ? `${espacio.areaM2} m²` : "—"}</td>
              </tr>
              <tr>
                <td className="text-muted">Altura máx. permitida</td>
                <td style={{ textAlign: "right" }}>{espacio.alturaMaxCm} cm</td>
              </tr>
              <tr>
                <td className="text-muted">Autos en piso</td>
                <td style={{ textAlign: "right" }}>{espacio.autosEnPiso ?? "—"}</td>
              </tr>
              <tr>
                <td className="text-muted">Carga eléctrica</td>
                <td style={{ textAlign: "right" }}>{espacio.cargaElectricaKw ? `${espacio.cargaElectricaKw} kW` : "—"}</td>
              </tr>
              <tr>
                <td className="text-muted">Puntos de luz</td>
                <td style={{ textAlign: "right" }}>{espacio.puntosLuz || "—"}</td>
              </tr>
              <tr>
                <td className="text-muted">Proveedor</td>
                <td style={{ textAlign: "right" }}>{espacio.proveedor?.nombre || "—"}</td>
              </tr>
              <tr>
                <td className="text-muted">Grupo</td>
                <td style={{ textAlign: "right" }}>{espacio.distribuidor?.nombre || "—"}</td>
              </tr>
              <tr>
                <td className="text-muted">Montaje</td>
                <td style={{ textAlign: "right" }}>
                  {fmtFecha(espacio.montajeInicio)} – {fmtFecha(espacio.montajeFin)}
                </td>
              </tr>
              <tr>
                <td className="text-muted">Última entrega</td>
                <td style={{ textAlign: "right" }}>{fmtFecha(espacio.ultimaEntrega)}</td>
              </tr>
            </tbody>
          </table>

          {espacio.incumplimientos.length > 0 && (
            <>
              <h6 className="text-muted" style={{ marginTop: 24 }}>
                Incumplimientos abiertos
              </h6>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {espacio.incumplimientos.map((i) => (
                  <div key={i.id} className="card" style={{ borderLeft: "3px solid var(--color-accent)" }}>
                    <strong style={{ fontSize: 13 }}>{i.titulo}</strong>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {i.detalle}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/incumplimientos" className="btn-ghost" style={{ marginTop: 8 }}>
                Ver en incumplimientos →
              </Link>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
