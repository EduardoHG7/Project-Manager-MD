"use client";

import { useMemo, useState } from "react";
import { TAREA_ESTADO_FILL, TAREA_ESTADO_LABEL } from "@/lib/estados";

type Categoria = { id: string; nombre: string; orden: number };
type Tarea = {
  id: string;
  categoriaId: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  progreso: number;
  estado: string;
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function diffDias(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function addDias(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function lunesDeSemana(d: Date) {
  const dia = d.getUTCDay();
  return addDias(d, -((dia + 6) % 7));
}

export function GanttTareas({ categorias, tareas }: { categorias: Categoria[]; tareas: Tarea[] }) {
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());

  const timeline = useMemo(() => {
    if (tareas.length === 0) return null;
    const inicios = tareas.map((t) => new Date(t.fechaInicio + "T00:00:00Z"));
    const fines = tareas.map((t) => new Date(t.fechaFin + "T00:00:00Z"));
    const inicio = lunesDeSemana(new Date(Math.min(...inicios.map((d) => d.getTime()))));
    const finBruto = new Date(Math.max(...fines.map((d) => d.getTime())));
    const finSemana = addDias(lunesDeSemana(finBruto), 6);
    const totalDias = diffDias(inicio, finSemana) + 1;
    const semanas: Date[] = [];
    for (let d = inicio; diffDias(d, finSemana) >= 0; d = addDias(d, 7)) semanas.push(d);

    function pct(d: Date) {
      return Math.min(100, Math.max(0, (diffDias(inicio, d) / totalDias) * 100));
    }
    function segment(desde: Date, hasta: Date) {
      const left = pct(desde);
      const width = Math.max(0.6, pct(addDias(hasta, 1)) - left);
      return { left, width };
    }

    const meses: { label: string; span: number }[] = [];
    for (const s of semanas) {
      const label = `${MESES[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
      const ultimo = meses[meses.length - 1];
      if (ultimo && ultimo.label === label) ultimo.span++;
      else meses.push({ label, span: 1 });
    }

    return { inicio, semanas, meses, segment };
  }, [tareas]);

  if (!timeline) return <p className="text-muted" style={{ marginTop: 16 }}>Todavía no hay tareas registradas.</p>;

  const hoy = new Date();
  const hoyISO = hoy.toISOString().slice(0, 10);

  const grupos = categorias
    .map((c) => ({ categoria: c, tareas: tareas.filter((t) => t.categoriaId === c.id) }))
    .filter((g) => g.tareas.length > 0);

  function toggle(id: string) {
    setColapsadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const cols = `260px repeat(${timeline.semanas.length}, minmax(30px, 1fr))`;
  const anchoMin = Math.max(760, 260 + timeline.semanas.length * 32);

  return (
    <div className="table-wrap" style={{ marginTop: 16 }}>
      <div style={{ minWidth: anchoMin }}>
        <div style={{ display: "grid", gridTemplateColumns: cols }}>
          <div />
          {timeline.meses.map((m, i) => (
            <div
              key={i}
              style={{
                gridColumn: `span ${m.span}`,
                padding: "6px 4px",
                borderRight: "1px solid var(--color-divider)",
                borderBottom: "1px solid var(--color-divider-strong)",
                textAlign: "center",
                fontSize: 10.5,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {m.label}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: cols }}>
          <div />
          {timeline.semanas.map((s, i) => {
            const esHoy = diffDias(s, hoy) >= 0 && diffDias(hoy, addDias(s, 6)) >= 0;
            return (
              <div
                key={i}
                style={{
                  padding: "5px 2px",
                  borderRight: "1px solid var(--color-divider)",
                  borderBottom: "1px solid var(--color-divider-strong)",
                  textAlign: "center",
                  fontSize: 10,
                  background: esHoy ? "var(--color-accent)" : undefined,
                  color: esHoy ? "#fff" : undefined,
                }}
              >
                {s.getUTCDate()}
              </div>
            );
          })}
        </div>

        {grupos.map(({ categoria, tareas: tareasCategoria }) => {
          const colapsada = colapsadas.has(categoria.id);
          return (
            <div key={categoria.id}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: cols,
                  background: "var(--color-surface)",
                  borderTop: "1px solid var(--color-divider-strong)",
                  cursor: "pointer",
                }}
                onClick={() => toggle(categoria.id)}
              >
                <div style={{ padding: "8px 8px", fontSize: 12.5, fontWeight: 800, gridColumn: `1 / -1` }}>
                  {colapsada ? "▸" : "▾"} {categoria.nombre} ({tareasCategoria.length})
                </div>
              </div>
              {!colapsada &&
                tareasCategoria.map((t) => {
                  const seg = timeline.segment(new Date(t.fechaInicio + "T00:00:00Z"), new Date(t.fechaFin + "T00:00:00Z"));
                  return (
                    <div key={t.id} style={{ display: "grid", gridTemplateColumns: cols, borderTop: "1px solid var(--color-divider)" }}>
                      <div style={{ padding: "8px 8px", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.nombre}>
                        {t.nombre}
                      </div>
                      <div style={{ gridColumn: `2 / -1`, position: "relative", minHeight: 30 }}>
                        <div
                          className={TAREA_ESTADO_FILL[t.estado]}
                          title={`${t.nombre} — ${TAREA_ESTADO_LABEL[t.estado] || t.estado} (${t.progreso}%)`}
                          style={{
                            position: "absolute",
                            top: 5,
                            bottom: 5,
                            left: `${seg.left}%`,
                            width: `${seg.width}%`,
                            display: "flex",
                            alignItems: "center",
                            padding: "0 6px",
                            fontSize: 10,
                            fontWeight: 700,
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            boxSizing: "border-box",
                          }}
                        >
                          {t.progreso}%
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
