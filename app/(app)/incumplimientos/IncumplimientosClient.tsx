"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { cambiarEstadoIncumplimiento } from "@/lib/actions";
import { SEVERIDAD_LABEL, SEVERIDAD_PILL, INCUMP_ESTADO_LABEL, INCUMP_ESTADO_PILL, fmtFecha } from "@/lib/estados";

type Item = {
  id: string;
  severidad: string;
  espacioNumero: string;
  espacioNombre: string;
  titulo: string;
  detalle: string | null;
  etapa: string | null;
  proveedor: string | null;
  fechaLimite: string | null;
  estado: string;
};

type Filtro = "todos" | "abiertas" | "criticas" | "cerradas";

export function IncumplimientosClient({
  canEdit,
  kpis,
  items,
}: {
  canEdit: boolean;
  kpis: { criticas: number; mayores: number; menores: number; cerradasSemana: number };
  items: Item[];
}) {
  const [filtro, setFiltro] = useState<Filtro>("abiertas");
  const [isPending, startTransition] = useTransition();

  const filtrados = useMemo(() => {
    return items.filter((i) => {
      if (filtro === "todos") return true;
      if (filtro === "abiertas") return i.estado !== "CERRADA";
      if (filtro === "criticas") return i.severidad === "CRITICA";
      if (filtro === "cerradas") return i.estado === "CERRADA";
      return true;
    });
  }, [items, filtro]);

  return (
    <main className="page">
      <h6 style={{ color: "var(--color-accent)" }}>Reporte de incumplimientos</h6>
      <h2 style={{ margin: 0 }}>Desviaciones registradas en obra</h2>

      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 16 }}>
        <div className="kpi" style={{ background: "var(--color-accent)", color: "#fff" }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>Críticas abiertas</span>
          <span className="kpi-n">{kpis.criticas}</span>
          <span style={{ fontSize: 11, opacity: 0.85 }}>Bloquean apertura</span>
        </div>
        <div className="kpi">
          <span className="text-muted" style={{ fontSize: 12 }}>
            Mayores abiertas
          </span>
          <span className="kpi-n">{kpis.mayores}</span>
        </div>
        <div className="kpi">
          <span className="text-muted" style={{ fontSize: 12 }}>
            Menores abiertas
          </span>
          <span className="kpi-n">{kpis.menores}</span>
        </div>
        <div className="kpi" style={{ background: "var(--color-neutral-900)", color: "var(--color-bg)" }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>Cerradas esta semana</span>
          <span className="kpi-n">{kpis.cerradasSemana}</span>
        </div>
      </div>

      <div className="stat-toggle" style={{ marginTop: 20 }}>
        {(
          [
            ["abiertas", "Abiertas"],
            ["criticas", "Críticas"],
            ["cerradas", "Cerradas"],
            ["todos", "Todos"],
          ] as [Filtro, string][]
        ).map(([k, label]) => (
          <button key={k} className={filtro === k ? "active" : ""} onClick={() => setFiltro(k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Severidad</th>
              <th>Espacio</th>
              <th>Hallazgo</th>
              <th>Etapa</th>
              <th>Responsable</th>
              <th>Límite</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((i) => (
              <tr key={i.id}>
                <td>
                  <span className={`pill ${SEVERIDAD_PILL[i.severidad]}`}>{SEVERIDAD_LABEL[i.severidad]}</span>
                </td>
                <td>
                  <Link href={`/espacios/${encodeURIComponent(i.espacioNumero)}`} style={{ fontWeight: 700, color: "inherit" }}>
                    {i.espacioNumero} · {i.espacioNombre}
                  </Link>
                </td>
                <td style={{ maxWidth: 320 }}>
                  <strong style={{ display: "block" }}>{i.titulo}</strong>
                  {i.detalle && (
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {i.detalle}
                    </span>
                  )}
                </td>
                <td>{i.etapa || "—"}</td>
                <td>{i.proveedor || "—"}</td>
                <td className="text-muted">{fmtFecha(i.fechaLimite)}</td>
                <td>
                  {canEdit ? (
                    <select
                      className="input"
                      style={{ width: "auto" }}
                      defaultValue={i.estado}
                      disabled={isPending}
                      onChange={(e) => startTransition(() => cambiarEstadoIncumplimiento(i.id, e.target.value))}
                    >
                      {Object.entries(INCUMP_ESTADO_LABEL).map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`pill ${INCUMP_ESTADO_PILL[i.estado]}`}>{INCUMP_ESTADO_LABEL[i.estado]}</span>
                  )}
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted">
                  Nada que mostrar con este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
