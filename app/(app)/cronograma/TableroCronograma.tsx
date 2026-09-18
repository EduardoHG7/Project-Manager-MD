"use client";

import { useMemo } from "react";
import { progresoPonderado } from "@/lib/cronograma";
import { TAREA_ESTADO_LABEL, TAREA_ESTADO_PILL, fmtFecha } from "@/lib/estados";

type Categoria = { id: string; nombre: string; orden: number };
type Responsable = { id: string; nombre: string };
type Tarea = {
  id: string;
  categoriaId: string;
  responsableId: string | null;
  nombre: string;
  fechaFin: string;
  duracionDias: number;
  progreso: number;
  estado: string;
};

function diasHasta(fechaISO: string): number {
  const hoy = new Date();
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const fin = new Date(fechaISO + "T00:00:00Z").getTime();
  return Math.round((fin - hoyUTC) / 86400000);
}

function BarraProgreso({ pct }: { pct: number }) {
  return (
    <div style={{ flex: 1, height: 8, background: "var(--color-neutral-200)", borderRadius: 4, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: pct >= 100 ? "#1f8a4d" : pct > 0 ? "#2f6fb0" : "var(--color-neutral-400)",
        }}
      />
    </div>
  );
}

export function TableroCronograma({
  categorias,
  responsables,
  tareas,
}: {
  categorias: Categoria[];
  responsables: Responsable[];
  tareas: Tarea[];
}) {
  const datos = useMemo(() => {
    const avanceGlobal = progresoPonderado(tareas);
    const completadas = tareas.filter((t) => t.estado === "COMPLETADA").length;

    const porCategoria = categorias
      .map((c) => {
        const propias = tareas.filter((t) => t.categoriaId === c.id);
        return { id: c.id, nombre: c.nombre, avance: progresoPonderado(propias), count: propias.length };
      })
      .filter((c) => c.count > 0);

    const porResponsable = responsables
      .map((r) => {
        const propias = tareas.filter((t) => t.responsableId === r.id);
        return { id: r.id, nombre: r.nombre, avance: progresoPonderado(propias), count: propias.length };
      })
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);

    const atrasadas = tareas
      .filter((t) => t.estado === "ATRASADA")
      .map((t) => ({ ...t, diasAtraso: -diasHasta(t.fechaFin) }))
      .sort((a, b) => b.diasAtraso - a.diasAtraso);

    const proximos = tareas
      .filter((t) => t.estado !== "COMPLETADA" && t.estado !== "ATRASADA")
      .map((t) => ({ ...t, diasRestantes: diasHasta(t.fechaFin) }))
      .filter((t) => t.diasRestantes >= 0 && t.diasRestantes <= 14)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);

    return { avanceGlobal, completadas, porCategoria, porResponsable, atrasadas, proximos };
  }, [categorias, responsables, tareas]);

  const nombreCategoria = (id: string) => categorias.find((c) => c.id === id)?.nombre || "—";
  const nombreResponsable = (id: string | null) => (id ? responsables.find((r) => r.id === id)?.nombre || "—" : "—");

  if (tareas.length === 0) {
    return <p className="text-muted" style={{ marginTop: 16 }}>Todavía no hay tareas registradas.</p>;
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="kpi">
          <span className="text-muted" style={{ fontSize: 12 }}>Avance general</span>
          <strong style={{ fontSize: 28 }}>{datos.avanceGlobal}%</strong>
        </div>
        <div className="kpi">
          <span className="text-muted" style={{ fontSize: 12 }}>Tareas completadas</span>
          <strong style={{ fontSize: 28 }}>
            {datos.completadas}/{tareas.length}
          </strong>
        </div>
        <div className="kpi">
          <span className="text-muted" style={{ fontSize: 12 }}>Atrasadas</span>
          <strong style={{ fontSize: 28, color: datos.atrasadas.length > 0 ? "var(--color-accent)" : undefined }}>
            {datos.atrasadas.length}
          </strong>
        </div>
        <div className="kpi">
          <span className="text-muted" style={{ fontSize: 12 }}>Vencen en 14 días</span>
          <strong style={{ fontSize: 28 }}>{datos.proximos.length}</strong>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 24 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h6 className="text-muted">Avance por categoría</h6>
          {datos.porCategoria.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0", fontSize: 12.5 }}>
              <span style={{ width: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</span>
              <BarraProgreso pct={c.avance} />
              <span style={{ width: 40, textAlign: "right" }}>{c.avance}%</span>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <h6 className="text-muted">Avance por responsable</h6>
          {datos.porResponsable.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0", fontSize: 12.5 }}>
              <span style={{ width: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nombre}</span>
              <BarraProgreso pct={r.avance} />
              <span style={{ width: 40, textAlign: "right" }}>{r.avance}%</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 28 }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <h6 className="text-muted">Tareas atrasadas</h6>
          {datos.atrasadas.length === 0 && <p className="text-muted" style={{ fontSize: 12.5 }}>Ninguna — al día.</p>}
          <table className="table">
            <tbody>
              {datos.atrasadas.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontSize: 12.5 }}>{t.nombre}</td>
                  <td className="text-muted" style={{ fontSize: 11.5 }}>{nombreCategoria(t.categoriaId)}</td>
                  <td className="text-muted" style={{ fontSize: 11.5 }}>{nombreResponsable(t.responsableId)}</td>
                  <td>
                    <span className={`pill ${TAREA_ESTADO_PILL.ATRASADA}`}>{t.diasAtraso}d atraso</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1, minWidth: 320 }}>
          <h6 className="text-muted">Próximos vencimientos (14 días)</h6>
          {datos.proximos.length === 0 && <p className="text-muted" style={{ fontSize: 12.5 }}>Nada próximo a vencer.</p>}
          <table className="table">
            <tbody>
              {datos.proximos.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontSize: 12.5 }}>{t.nombre}</td>
                  <td className="text-muted" style={{ fontSize: 11.5 }}>{nombreCategoria(t.categoriaId)}</td>
                  <td className="text-muted" style={{ fontSize: 11.5 }}>{fmtFecha(t.fechaFin)}</td>
                  <td>
                    <span className={`pill ${t.diasRestantes <= 7 ? "pill-red" : "pill-soft"}`}>
                      {t.diasRestantes === 0 ? "Hoy" : `en ${t.diasRestantes}d`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
