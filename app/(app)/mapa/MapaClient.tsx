"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ESTADO_LABEL, ESTADO_FILL } from "@/lib/estados";

export type EspacioMapa = {
  id: string;
  numero: string;
  nombre: string;
  categoria: string;
  fila: string | null;
  medidas: string | null;
  estado: string;
  x: number | null;
  y: number | null;
  distribuidor: string | null;
  proveedor: string | null;
  tieneDesviacion: boolean;
};

type Filtro = "todos" | "pend" | "obra" | "desv";

function matchesFiltro(e: EspacioMapa, f: Filtro) {
  if (f === "todos") return true;
  if (f === "desv") return e.tieneDesviacion;
  if (f === "pend") return e.estado === "SIN_RENDER" || e.estado === "EN_REVISION";
  if (f === "obra") return e.estado === "EN_FABRICACION" || e.estado === "MONTADO";
  return true;
}

export function MapaClient({
  espacios,
  planoUrl,
}: {
  espacios: EspacioMapa[];
  planoUrl: string | null;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [modo, setModo] = useState<"plan" | "grid">("plan");
  const [sel, setSel] = useState<string>(espacios[0]?.numero || "");

  const seleccionado = espacios.find((e) => e.numero === sel) || espacios[0];

  const filas = useMemo(() => {
    const map = new Map<string, EspacioMapa[]>();
    espacios.forEach((e) => {
      const key = e.fila || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [espacios]);

  const legendCounts: Record<string, number> = {};
  espacios.forEach((e) => (legendCounts[e.estado] = (legendCounts[e.estado] || 0) + 1));
  const desvCount = espacios.filter((e) => e.tieneDesviacion).length;

  return (
    <main className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="stat-toggle">
          {(
            [
              ["todos", "Todos"],
              ["pend", "Pendiente aprobación"],
              ["obra", "En obra"],
              ["desv", "Con desviación"],
            ] as [Filtro, string][]
          ).map(([k, label]) => (
            <button key={k} className={filtro === k ? "active" : ""} onClick={() => setFiltro(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="stat-toggle">
          <button className={modo === "plan" ? "active" : ""} onClick={() => setModo("plan")}>
            Plano real
          </button>
          <button className={modo === "grid" ? "active" : ""} onClick={() => setModo("grid")}>
            Retícula de control
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 28, marginTop: 20, alignItems: "start" }}>
        <div>
          {modo === "plan" && !planoUrl ? (
            <div className="card elev-sm text-muted" style={{ padding: 40, textAlign: "center" }}>
              Este evento todavía no tiene un plano cargado. Súbelo desde Admin → Eventos.
            </div>
          ) : modo === "plan" ? (
            <div className="card elev-sm" style={{ position: "relative", padding: 0, overflow: "hidden" }}>
              <div style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={planoUrl!} alt="Plano general" style={{ width: "100%", display: "block" }} />
                {espacios
                  .filter((e) => e.x != null && e.y != null)
                  .map((e) => {
                    const on = seleccionado?.numero === e.numero;
                    const dim = matchesFiltro(e, filtro) ? 1 : 0.22;
                    const sz = on ? 30 : 24;
                    return (
                      <button
                        key={e.id}
                        className={`hotspot ${ESTADO_FILL[e.estado]}`}
                        title={`${e.numero} · ${e.nombre} — ${e.tieneDesviacion ? "Desviación abierta" : ESTADO_LABEL[e.estado]}`}
                        onClick={() => setSel(e.numero)}
                        style={{
                          left: `${e.x}%`,
                          top: `${e.y}%`,
                          width: sz,
                          height: sz,
                          fontSize: on ? 13 : 11,
                          opacity: dim,
                          zIndex: on ? 3 : 1,
                          outline: e.tieneDesviacion ? "2px solid var(--color-accent)" : undefined,
                          outlineOffset: e.tieneDesviacion ? -2 : undefined,
                          boxShadow: on ? "0 0 0 3px var(--color-accent)" : undefined,
                        }}
                      >
                        {e.numero}
                      </button>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {filas.map(([fila, items]) => (
                <div key={fila}>
                  <h6 className="text-muted">Fila {fila}</h6>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 2 }}>
                    {items.map((e) => {
                      const on = seleccionado?.numero === e.numero;
                      const dim = matchesFiltro(e, filtro) ? 1 : 0.24;
                      return (
                        <button
                          key={e.id}
                          className={`grid-cell ${ESTADO_FILL[e.estado]}`}
                          onClick={() => setSel(e.numero)}
                          style={{
                            opacity: dim,
                            outline: e.tieneDesviacion ? "2px solid var(--color-accent)" : undefined,
                            outlineOffset: e.tieneDesviacion ? -2 : undefined,
                            boxShadow: on ? "0 0 0 3px var(--color-accent)" : undefined,
                          }}
                        >
                          <strong>{e.numero}</strong>
                          <span style={{ fontSize: 11.5 }}>{e.nombre}</span>
                          <span style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "auto", fontWeight: 700 }}>
                            {e.tieneDesviacion ? "Desviación" : ESTADO_LABEL[e.estado]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 18 }}>
            {Object.entries(ESTADO_LABEL).map(([k, label]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <span className={ESTADO_FILL[k]} style={{ display: "block", width: 22, height: 14 }} />
                {label} ({legendCounts[k] || 0})
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <span
                style={{
                  display: "block",
                  width: 22,
                  height: 14,
                  background: "var(--color-bg)",
                  outline: "2px solid var(--color-accent)",
                  outlineOffset: -2,
                }}
              />
              Desviación abierta ({desvCount})
            </div>
          </div>
        </div>

        {seleccionado && (
          <aside className="card elev-sm">
            <h6 className="text-muted">Espacio {seleccionado.numero}</h6>
            <h3 style={{ margin: 0 }}>{seleccionado.nombre}</h3>
            <span
              className={`pill ${seleccionado.tieneDesviacion ? "pill-red" : "pill-soft"}`}
              style={{ alignSelf: "flex-start", marginTop: 6 }}
            >
              {seleccionado.tieneDesviacion ? "Desviación abierta" : ESTADO_LABEL[seleccionado.estado]}
            </span>
            <table className="table" style={{ marginTop: 10 }}>
              <tbody>
                <tr>
                  <td className="text-muted">Medidas</td>
                  <td style={{ textAlign: "right" }}>{seleccionado.medidas || "—"}</td>
                </tr>
                <tr>
                  <td className="text-muted">Grupo</td>
                  <td style={{ textAlign: "right" }}>{seleccionado.distribuidor || "—"}</td>
                </tr>
                <tr>
                  <td className="text-muted">Proveedor</td>
                  <td style={{ textAlign: "right" }}>{seleccionado.proveedor || "—"}</td>
                </tr>
              </tbody>
            </table>
            <Link href={`/espacios/${encodeURIComponent(seleccionado.numero)}`} className="btn btn-primary" style={{ marginTop: 8 }}>
              Ver ficha de stand
            </Link>
          </aside>
        )}
      </div>
    </main>
  );
}
