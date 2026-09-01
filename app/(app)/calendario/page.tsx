import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEventoSeleccionado } from "@/lib/evento";
import { ESTADO_FILL } from "@/lib/estados";
import { SinEvento } from "../_shared/SinEvento";
import { EditarCronograma } from "./EditarCronograma";
import { ActividadesCalendario } from "./ActividadesCalendario";
import { VistaCalendario } from "./VistaCalendario";

// Colores para distinguir cada reunión/actividad entre sí (se asignan por orden).
const PALETA_ACTIVIDADES = [
  "#0f766e",
  "#4338ca",
  "#b45309",
  "#be185d",
  "#0e7490",
  "#4d7c0f",
  "#9333ea",
  "#475569",
  "#c2410c",
  "#0369a1",
];

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

  const espacios = await prisma.espacio.findMany({
    where: {
      eventoId: evento.id,
      OR: [{ fabricacionInicio: { not: null } }, { montajeInicio: { not: null } }, { atrasadoMotivo: { not: null } }],
    },
    include: { distribuidor: true, proveedor: true },
    orderBy: { numero: "asc" },
  });

  const actividadesDb = await prisma.eventoActividad.findMany({
    where: { eventoId: evento.id },
    include: { creadoPor: true },
    orderBy: { fecha: "asc" },
  });
  const actividades = actividadesDb.map((a, i) => ({
    id: a.id,
    titulo: a.titulo,
    fecha: toISO(a.fecha)!,
    hora: a.hora,
    tipo: a.tipo,
    descripcion: a.descripcion,
    creadoPorNombre: a.creadoPor?.nombre ?? null,
    color: PALETA_ACTIVIDADES[i % PALETA_ACTIVIDADES.length],
  }));

  // El calendario mensual cubre desde la fecha más temprana hasta la más tardía
  // entre las fechas fijas del evento (montaje, apertura, pausa, desmontaje) y
  // las reuniones/actividades registradas, para que todo aparezca ahí.
  const fechasClave = [
    evento.montajeInicio,
    evento.montajeFin,
    evento.fechaInicio,
    evento.fechaFin,
    evento.pausaInicio,
    evento.pausaFin,
    evento.desmontajeInicio,
    evento.desmontajeFin,
    ...actividadesDb.map((a) => a.fecha),
  ].filter((d): d is Date => d != null);
  const inicio = new Date(Math.min(...fechasClave.map((d) => d.getTime())));
  const fin = new Date(Math.max(...fechasClave.map((d) => d.getTime())));

  // El Gantt de progreso por stand usa solo el rango del evento (sin las
  // reuniones), para no diluir las barras en meses sin montaje.
  const progresoInicio = evento.montajeInicio || evento.fechaInicio;
  const progresoFin = evento.desmontajeFin || evento.fechaFin;
  const progresoTotalDias = Math.max(1, diffDias(progresoInicio, progresoFin) + 1);

  const hoy = new Date();

  function pct(d: Date) {
    return Math.min(100, Math.max(0, (diffDias(progresoInicio, d) / progresoTotalDias) * 100));
  }
  function segment(desde: Date | null, hasta: Date | null) {
    if (!desde || !hasta) return null;
    const left = pct(desde);
    const width = Math.max(0.5, pct(hasta) - left);
    return { left, width };
  }

  const diasProgreso = Array.from({ length: progresoTotalDias }, (_, i) => addDias(progresoInicio, i));

  // A diferencia de marcar solo el día exacto en que empieza/termina cada
  // etapa (montaje, apertura, pausa, desmontaje), esto etiqueta TODOS los
  // días dentro del rango, para que la etapa se vea completa en el
  // calendario y no solo su primer/último día.
  function enRango(d: Date, inicio: Date | null | undefined, fin: Date | null | undefined) {
    if (!inicio || !fin) return false;
    return diffDias(inicio, d) >= 0 && diffDias(d, fin) >= 0;
  }

  const milestone = (d: Date): string => {
    const montajeFin = evento.montajeFin || evento.montajeInicio;
    if (enRango(d, evento.montajeInicio, montajeFin)) {
      if (diffDias(evento.montajeInicio!, d) === 0) return "Inicia montaje";
      if (diffDias(montajeFin!, d) === 0) return "Cierre montaje";
      return "Montaje";
    }

    const desmontajeFin = evento.desmontajeFin || evento.desmontajeInicio;
    if (enRango(d, evento.desmontajeInicio, desmontajeFin)) {
      const esInicio = diffDias(evento.desmontajeInicio!, d) === 0;
      const esFin = diffDias(desmontajeFin!, d) === 0;
      if (esInicio && esFin) return "Desmontaje";
      if (esInicio) return "Inicia desmontaje";
      if (esFin) return "Cierra desmontaje";
      return "Desmontaje";
    }

    if (enRango(d, evento.pausaInicio, evento.pausaFin)) return "Pausa";

    const bloques: { inicio: Date; fin: Date; labelInicio: string }[] =
      evento.pausaInicio && evento.pausaFin
        ? [
            { inicio: evento.fechaInicio, fin: addDias(evento.pausaInicio, -1), labelInicio: "Apertura" },
            { inicio: addDias(evento.pausaFin, 1), fin: evento.fechaFin, labelInicio: "Reapertura" },
          ]
        : [{ inicio: evento.fechaInicio, fin: evento.fechaFin, labelInicio: "Apertura" }];

    for (const b of bloques) {
      if (enRango(d, b.inicio, b.fin)) {
        if (diffDias(b.inicio, d) === 0) return b.labelInicio;
        if (diffDias(evento.fechaFin, d) === 0) return "Cierre";
        return "Abierto";
      }
    }

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

      <VistaCalendario inicio={inicio} fin={fin} hoy={hoy} milestone={milestone} actividades={actividades} />

      <h6 className="text-muted" style={{ marginTop: 28 }}>
        Progreso de montaje por stand
      </h6>
      <div style={{ display: "flex", gap: 16, margin: "8px 0 16px", fontSize: 12 }}>
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
        <div style={{ minWidth: Math.max(720, 160 + progresoTotalDias * 34) }}>
          <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${progresoTotalDias}, minmax(34px, 1fr))` }}>
            <div />
            {diasProgreso.map((d, i) => (
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
            {diasProgreso.map((d, i) => {
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
              <div key={e.id} style={{ display: "grid", gridTemplateColumns: `160px repeat(${progresoTotalDias}, minmax(34px, 1fr))`, borderTop: "1px solid var(--color-divider)" }}>
                <div style={{ padding: "10px 8px", fontSize: 12.5 }}>
                  <strong>{e.numero}</strong> {e.nombre}
                  <div className="text-muted" style={{ fontSize: 10.5 }}>
                    {e.proveedor?.nombre}
                  </div>
                </div>
                <div style={{ gridColumn: `2 / span ${progresoTotalDias}`, position: "relative", minHeight: 40 }}>
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

      <ActividadesCalendario eventoId={evento.id} canEdit={canEdit} actividades={actividades} />
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
