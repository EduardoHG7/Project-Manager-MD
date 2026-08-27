"use client";

import { useTransition } from "react";
import { actualizarEtapa } from "@/lib/actions";

const DISCIPLINAS = ["DISENO", "ESTRUCTURA", "GRAFICA", "ELECTRICO"] as const;
const LABEL: Record<string, string> = { DISENO: "Diseño", ESTRUCTURA: "Estructura", GRAFICA: "Gráfica", ELECTRICO: "Eléctrico" };
const ESTADO_ETAPA_LABEL: Record<string, string> = { PENDIENTE: "Pendiente", AHORA: "En curso", APROBADO: "Aprobado" };

type Etapa = { disciplina: string; estado: string; detalle: string | null };

export function EtapasEditor({ espacioId, etapas, canEdit }: { espacioId: string; etapas: Etapa[]; canEdit: boolean }) {
  const [isPending, startTransition] = useTransition();
  const byDisciplina = new Map(etapas.map((e) => [e.disciplina, e]));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", border: "1px solid var(--color-divider)" }}>
      {DISCIPLINAS.map((d, i) => {
        const e = byDisciplina.get(d);
        const estado = e?.estado || "PENDIENTE";
        const bg = estado === "APROBADO" ? "var(--color-neutral-900)" : estado === "AHORA" ? "var(--color-accent)" : "transparent";
        const color = estado === "PENDIENTE" ? "inherit" : "var(--color-bg)";
        return (
          <div
            key={d}
            style={{
              padding: "14px 16px",
              borderRight: i < 3 ? "1px solid var(--color-divider)" : undefined,
              background: bg,
              color,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <strong style={{ fontSize: 13 }}>{LABEL[d]}</strong>
            <span style={{ fontSize: 11.5, opacity: 0.85 }}>{e?.detalle || ESTADO_ETAPA_LABEL[estado]}</span>
            {canEdit && (
              <select
                className="input"
                style={{ marginTop: 4, background: "transparent", color, borderColor: "currentColor" }}
                value={estado}
                disabled={isPending}
                onChange={(ev) => startTransition(() => actualizarEtapa(espacioId, d, ev.target.value))}
              >
                {Object.entries(ESTADO_ETAPA_LABEL).map(([k, label]) => (
                  <option key={k} value={k} style={{ color: "#000" }}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}
