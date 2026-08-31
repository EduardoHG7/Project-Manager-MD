import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventoSeleccionado } from "@/lib/evento";
import { ESTADO_FILL } from "@/lib/estados";
import { SinEvento } from "../_shared/SinEvento";
import { EditarCronograma } from "./EditarCronograma";

export const dynamic = "force-dynamic";

function toISO(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function diffDias(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function addDias(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default async function CalendarioPage() {
  const evento = await getEventoSeleccionado();
  const session = await getServerSession(authOptions);
  if (!evento) {
    return <SinEvento esAdmin={session?.user.rol === "ADMIN"} />;
  }
  const canEdit = session?.user.rol === "ADMIN" || session?.user.rol === "SUPERVISOR";

  const inicio = evento.montajeInicio || evento.fechaInicio;
  const fin = evento.desmontajeFin || evento.fechaFin;
  const totalDias = Math.max(1, diffDias(inicio, fin) + 1);

  const espacios = await prisma.espacio.findMany({
    where: {
      eventoId: evento.id,
      OR: [{ fabricacionInicio: { not: null } }, { montajeInicio: { not: null } }, { atrasadoMotivo: { not: null } }],
    },
    include: { distribuidor: true, proveedor: true },
    orderBy: { numero: "asc" },
  });

  const hoy = new Date();

  function pct(d: Date) {
    return Math.min(100, Math.max(0, (diffDias(inicio, d) / totalDias) * 100));
  }
  function segment(desde: Date | null, hasta: Date | null) {
    if (!desde || !hasta) return null;
    const left = pct(desde);
    const width = Math.max(0.5, pct(hasta) - left);
    return { left, width };
  }

  const dias = Array.from({ length: totalDias }, (_, i) => addDias(inicio, i));
  const milestone = (d: Date) => {
    if (evento.montajeInicio && diffDias(evento.montajeInicio, d) === 0) return "Inicia montaje";
    if (evento.montajeFin && diffDias(evento.montajeFin, d) === 0) return "Cierre montaje";
    if (diffDias(evento.fechaInicio, d) === 0) return "Apertura";
    if (evento.pausaInicio && diffDias(evento.pausaInicio, d) === 0) return "Pausa";
    if (evento.pausaFin && diffDias(addDias(evento.pausaFin, 1), d) === 0) return "Reapertura";
    if (diffDias(evento.fechaFin, d) === 0) return "Cierre";
    if (evento.desmontajeInicio && diffDias(evento.desmontajeInicio, d) === 0) return "Desmontaje";
    return "";
  };

  return (
    <main className="page">
      <h6 className="text-muted">Calendario de montaje</h6>
      <h2 style={{ margin: 0 }}>
        {inicio.toLocaleDateString("es-PA", { day: "2-digit", month: "short" })} –{" "}
        {fin.toLocaleDateString("es-PA", { day: "2-digit", month: "short" })}
      </h2>
      {evento.horariosNota && (
        <p className="text-muted" style={{ fontSize: 13, marginTop: 4, whiteSpace: "pre-wrap" }}>
          {evento.horariosNota}
        </p>
      )}

      {canEdit && (
        <EditarCronograma
          evento={{
            id: evento.id,
            fechaInicio: toISO(evento.fechaInicio)!,
            fechaFin: toISO(evento.fechaFin)!,
            montajeInicio: toISO(evento.montajeInicio),
            montajeFin: toISO(evento.montajeFin),
            pausaInicio: toISO(evento.pausaInicio),
            pausaFin: toISO(evento.pausaFin),
            desmontajeInicio: toISO(evento.desmontajeInicio),
            desmontajeFin: toISO(evento.desmontajeFin),
            horariosNota: evento.horariosNota,
          }}
        />
      )}

      <div style={{ display: "flex", gap: 16, margin: "16px 0", fontSize: 12 }}>
        {[
          ["En fabricación", "EN_FABRICACION"],
          ["Montaje", "MONTADO"],
          ["Verificación", "VERIFICADO"],
        ].map(([label, k]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className={ESTADO_FILL[k]} style={{ display: "block", width: 22, height: 12 }} />
            {label}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "block", width: 22, height: 12, background: "var(--color-accent)" }} />
          Atrasado
        </div>
      </div>

      <div className="table-wrap">
        <div style={{ minWidth: 720 }}>
          <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${totalDias}, 1fr)` }}>
            <div />
            {dias.map((d, i) => (
              <div
                key={i}
                style={{
                  padding: "7px 2px",
                  borderRight: "1px solid var(--color-divider)",
                  textAlign: "center",
                  fontSize: 11,
                  background: diffDias(hoy, d) === 0 ? "var(--color-accent)" : undefined,
                  color: diffDias(hoy, d) === 0 ? "#fff" : undefined,
                }}
              >
                {d.getDate()}
              </div>
            ))}
            <div style={{ fontSize: 10, color: "var(--color-text)", padding: "6px 0" }} />
            {dias.map((d, i) => {
              const label = milestone(d);
              return (
                <div
                  key={i}
                  style={{
                    padding: "8px 4px",
                    borderRight: "1px solid var(--color-divider)",
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    textAlign: "center",
                    background: label ? "var(--color-neutral-900)" : undefined,
                    color: label ? "var(--color-bg)" : undefined,
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {espacios.map((e) => {
            const fab = segment(e.fabricacionInicio, e.fabricacionFin);
            const mon = segment(e.montajeInicio, e.montajeFin);
            const ver = segment(e.verificacionInicio, e.verificacionFin);
            const atrasoDesde = e.montajeFin || e.fabricacionFin || e.fabricacionInicio;
            const atraso = e.atrasadoMotivo && atrasoDesde ? segment(atrasoDesde, addDias(atrasoDesde, 2)) : null;
            return (
              <div key={e.id} style={{ display: "grid", gridTemplateColumns: `160px repeat(${totalDias}, 1fr)`, borderTop: "1px solid var(--color-divider)" }}>
                <div style={{ padding: "10px 8px", fontSize: 12.5 }}>
                  <strong>{e.numero}</strong> {e.nombre}
                  <div className="text-muted" style={{ fontSize: 10.5 }}>
                    {e.proveedor?.nombre}
                  </div>
                </div>
                <div style={{ gridColumn: `2 / span ${totalDias}`, position: "relative", minHeight: 40 }}>
                  {fab && (
                    <div className={`${ESTADO_FILL.EN_FABRICACION}`} style={barStyle(fab)}>
                      Fabricación
                    </div>
                  )}
                  {mon && (
                    <div className={`${ESTADO_FILL.MONTADO}`} style={barStyle(mon)}>
                      Montaje
                    </div>
                  )}
                  {ver && (
                    <div className={`${ESTADO_FILL.VERIFICADO}`} style={barStyle(ver)}>
                      Verif.
                    </div>
                  )}
                  {atraso && (
                    <div style={{ ...barStyle(atraso), background: "var(--color-accent)", color: "#fff" }}>{e.atrasadoMotivo}</div>
                  )}
                </div>
              </div>
            );
          })}
          {espacios.length === 0 && <p className="text-muted" style={{ marginTop: 16 }}>Aún no hay fechas de fabricación/montaje registradas.</p>}
        </div>
      </div>
    </main>
  );
}

function barStyle(seg: { left: number; width: number }): React.CSSProperties {
  return {
    position: "absolute",
    top: 8,
    bottom: 8,
    left: `${seg.left}%`,
    width: `${seg.width}%`,
    display: "flex",
    alignItems: "center",
    padding: "0 8px",
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    overflow: "hidden",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
  };
}
