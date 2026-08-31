type Actividad = {
  id: string;
  titulo: string;
  fecha: string; // ISO yyyy-mm-dd
  hora: string | null;
  tipo: string;
  color: string;
};

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function construirSemanas(anio: number, mes: number): (Date | null)[][] {
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  const celdas: (Date | null)[] = [];
  for (let i = 0; i < primerDia.getDay(); i++) celdas.push(null);
  for (let d = 1; d <= ultimoDia.getDate(); d++) celdas.push(new Date(anio, mes, d));
  while (celdas.length % 7 !== 0) celdas.push(null);
  const semanas: (Date | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
}

export function VistaCalendario({
  inicio,
  fin,
  hoy,
  milestone,
  actividades,
}: {
  inicio: Date;
  fin: Date;
  hoy: Date;
  milestone: (d: Date) => string;
  actividades: Actividad[];
}) {
  const actividadesPorDia = new Map<string, Actividad[]>();
  for (const a of actividades) {
    if (!actividadesPorDia.has(a.fecha)) actividadesPorDia.set(a.fecha, []);
    actividadesPorDia.get(a.fecha)!.push(a);
  }
  const hoyISO = toISODate(hoy);

  const meses: { anio: number; mes: number }[] = [];
  {
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const finMes = new Date(fin.getFullYear(), fin.getMonth(), 1);
    while (cursor <= finMes) {
      meses.push({ anio: cursor.getFullYear(), mes: cursor.getMonth() });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {meses.map(({ anio, mes }) => {
        const semanas = construirSemanas(anio, mes);
        const nombreMes = new Date(anio, mes, 1).toLocaleDateString("es-PA", { month: "long", year: "numeric" });
        return (
          <div key={`${anio}-${mes}`} className="card elev-sm">
            <h6 style={{ margin: "0 0 10px", textTransform: "capitalize" }}>{nombreMes}</h6>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "var(--color-divider)" }}>
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="text-muted" style={{ background: "var(--color-bg)", padding: "4px 6px", fontSize: 10.5, fontWeight: 700, textAlign: "center" }}>
                  {d}
                </div>
              ))}
              {semanas.map((semana, wi) =>
                semana.map((d, di) => {
                  if (!d) return <div key={`${wi}-${di}`} style={{ background: "var(--color-bg)", minHeight: 74 }} />;
                  const iso = toISODate(d);
                  const label = milestone(d);
                  const acts = actividadesPorDia.get(iso) || [];
                  const esHoy = iso === hoyISO;
                  return (
                    <div
                      key={`${wi}-${di}`}
                      style={{
                        background: "var(--color-bg)",
                        minHeight: 74,
                        padding: 4,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: esHoy ? 800 : 400,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: esHoy ? "var(--color-accent)" : undefined,
                          color: esHoy ? "#fff" : "var(--color-text)",
                        }}
                      >
                        {d.getDate()}
                      </span>
                      {label && (
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 800,
                            letterSpacing: "0.03em",
                            textTransform: "uppercase",
                            textAlign: "center",
                            padding: "2px 3px",
                            background: "var(--color-neutral-900)",
                            color: "var(--color-bg)",
                          }}
                        >
                          {label}
                        </span>
                      )}
                      {acts.map((a) => (
                        <span
                          key={a.id}
                          title={`${a.titulo}${a.hora ? " · " + a.hora : ""}`}
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            textAlign: "left",
                            padding: "2px 4px",
                            borderRadius: 3,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            background: a.color,
                            color: "#fff",
                            borderLeft: a.tipo === "OTRO" ? "3px solid rgba(255,255,255,.6)" : undefined,
                          }}
                        >
                          {a.titulo}
                        </span>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
