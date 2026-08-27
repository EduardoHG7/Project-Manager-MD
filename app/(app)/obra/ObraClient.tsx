"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { actualizarVisitaEstado } from "@/lib/actions";
import { MedicionForm } from "../_shared/MedicionForm";

type Visita = {
  id: string;
  hora: string;
  tarea: string;
  estado: string;
  espacioId: string;
  espacioNumero: string;
  espacioNombre: string;
};

const ESTADO_LABEL: Record<string, string> = { PENDIENTE: "Pendiente", EN_CURSO: "En curso", CERRADO: "Cerrado" };
const ESTADO_PILL: Record<string, string> = { PENDIENTE: "pill-ghost", EN_CURSO: "pill-red", CERRADO: "pill-ink" };

export function ObraClient({
  canEdit,
  kpis,
  visitas,
  espaciosActivos,
}: {
  canEdit: boolean;
  kpis: { inspeccionadas: number; totalVisitas: number; fueraDeTolerancia: number; fotosSubidas: number };
  visitas: Visita[];
  espaciosActivos: { id: string; numero: string; nombre: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [espacioSel, setEspacioSel] = useState<string>(espaciosActivos[0]?.id || "");

  return (
    <main className="page">
      <h6 className="text-muted">Modo obra · uso en piso durante montaje</h6>
      <h2 style={{ margin: 0 }}>Ruta de inspección de hoy</h2>
      <p className="text-muted" style={{ maxWidth: "62ch" }}>
        Cada punto del checklist exige una foto y una medida antes de poder marcarse conforme. Si la medida sale de
        tolerancia, el sistema abre automáticamente un reporte de incumplimiento.
      </p>

      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 16, maxWidth: 640 }}>
        <div className="kpi">
          <span className="text-muted" style={{ fontSize: 12 }}>
            Visitas cerradas hoy
          </span>
          <span className="kpi-n">
            {kpis.inspeccionadas} / {kpis.totalVisitas}
          </span>
        </div>
        <div className="kpi">
          <span className="text-muted" style={{ fontSize: 12 }}>
            Puntos fuera de tolerancia
          </span>
          <span className="kpi-n">{kpis.fueraDeTolerancia}</span>
        </div>
        <div className="kpi">
          <span className="text-muted" style={{ fontSize: 12 }}>
            Fotos de evidencia subidas
          </span>
          <span className="kpi-n">{kpis.fotosSubidas}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 28, marginTop: 28, alignItems: "start" }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Espacio</th>
                <th>Tarea</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visitas.map((v) => (
                <tr key={v.id}>
                  <td>{v.hora}</td>
                  <td style={{ fontWeight: 700 }}>
                    {v.espacioNumero} · {v.espacioNombre}
                  </td>
                  <td>{v.tarea}</td>
                  <td>
                    {canEdit ? (
                      <select
                        className="input"
                        style={{ width: "auto" }}
                        defaultValue={v.estado}
                        disabled={isPending}
                        onChange={(e) => startTransition(() => actualizarVisitaEstado(v.id, e.target.value))}
                      >
                        {Object.entries(ESTADO_LABEL).map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`pill ${ESTADO_PILL[v.estado]}`}>{ESTADO_LABEL[v.estado]}</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/espacios/${encodeURIComponent(v.espacioNumero)}`} className="btn-ghost">
                      Ficha →
                    </Link>
                  </td>
                </tr>
              ))}
              {visitas.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No hay visitas programadas para hoy.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <div>
            <h6 className="text-muted">Registrar verificación en piso</h6>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Espacio</label>
              <select className="input" value={espacioSel} onChange={(e) => setEspacioSel(e.target.value)}>
                {espaciosActivos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.numero} · {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            {espacioSel && <MedicionForm key={espacioSel} espacioId={espacioSel} />}
          </div>
        )}
      </div>
    </main>
  );
}
