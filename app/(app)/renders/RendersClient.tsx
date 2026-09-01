"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { decidirVersion, eliminarVersion } from "@/lib/actions";
import { VERSION_ESTADO_LABEL, VERSION_ESTADO_PILL, fmtFechaHora } from "@/lib/estados";
import { GaleriaArchivos } from "@/components/GaleriaArchivos";

type VersionItem = {
  id: string;
  espacioNumero: string;
  espacioNombre: string;
  version: string;
  estado: string;
  renderUrls: string[];
  mapaUrl: string | null;
  nota: string | null;
  fecha: string;
  subidoPor: string | null;
  revisadoPor: string | null;
  revisadoEn: string | null;
  comentario: string | null;
};

function TarjetaPendiente({ v, canEdit, esAdmin }: { v: VersionItem; canEdit: boolean; esAdmin: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rechazando, setRechazando] = useState(false);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);

  function eliminar() {
    if (!confirm(`¿Eliminar la versión ${v.version} de ${v.espacioNumero} · ${v.espacioNombre}? El expositor podrá subir otra.`)) return;
    startTransition(async () => {
      await eliminarVersion(v.id);
      router.refresh();
    });
  }

  return (
    <div className="card elev-sm">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <Link href={`/espacios/${encodeURIComponent(v.espacioNumero)}`} style={{ fontWeight: 800, color: "inherit" }}>
            {v.espacioNumero} · {v.espacioNombre}
          </Link>
          <div className="text-muted" style={{ fontSize: 11.5 }}>
            {v.version} · subido por {v.subidoPor || "—"} · {fmtFechaHora(v.fecha)}
          </div>
        </div>
        <span className={`pill ${VERSION_ESTADO_PILL[v.estado]}`}>{VERSION_ESTADO_LABEL[v.estado]}</span>
      </div>

      <GaleriaArchivos renderUrls={v.renderUrls} mapaUrl={v.mapaUrl} />
      {v.nota && <p style={{ fontSize: 13, margin: "6px 0 0" }}>{v.nota}</p>}

      {canEdit && (
        <div style={{ marginTop: 10 }}>
          {!rechazando ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await decidirVersion(v.id, "APROBADA");
                    router.refresh();
                  })
                }
              >
                Aprobar
              </button>
              <button className="btn btn-secondary" disabled={isPending} onClick={() => setRechazando(true)}>
                Rechazar
              </button>
              {esAdmin && (
                <button className="btn-ghost" disabled={isPending} onClick={eliminar} style={{ marginLeft: "auto" }}>
                  Eliminar
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                className="input"
                placeholder="Motivo del rechazo (obligatorio, el expositor lo verá)"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
              {error && <p className="error-text">{error}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  style={{ color: "var(--color-accent)" }}
                  disabled={isPending}
                  onClick={() => {
                    if (!comentario.trim()) {
                      setError("Indica el motivo del rechazo.");
                      return;
                    }
                    setError(null);
                    startTransition(async () => {
                      await decidirVersion(v.id, "RECHAZADA", comentario);
                      router.refresh();
                    });
                  }}
                >
                  Confirmar rechazo
                </button>
                <button className="btn-ghost" onClick={() => setRechazando(false)} disabled={isPending}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilaDecidida({ v, esAdmin }: { v: VersionItem; esAdmin: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function eliminar() {
    if (!confirm(`¿Eliminar la versión ${v.version} de ${v.espacioNumero} · ${v.espacioNombre}?`)) return;
    startTransition(async () => {
      await eliminarVersion(v.id);
      router.refresh();
    });
  }

  return (
    <tr>
      <td>
        <Link href={`/espacios/${encodeURIComponent(v.espacioNumero)}`} style={{ color: "inherit" }}>
          {v.espacioNumero} · {v.espacioNombre}
        </Link>
      </td>
      <td>{v.version}</td>
      <td>
        <span className={`pill ${VERSION_ESTADO_PILL[v.estado]}`}>{VERSION_ESTADO_LABEL[v.estado]}</span>
      </td>
      <td>{v.revisadoPor || "—"}</td>
      <td className="text-muted">{fmtFechaHora(v.revisadoEn)}</td>
      <td className="text-muted">{v.comentario || "—"}</td>
      {esAdmin && (
        <td>
          <button className="btn-ghost" disabled={isPending} onClick={eliminar}>
            Eliminar
          </button>
        </td>
      )}
    </tr>
  );
}

export function RendersClient({
  canEdit,
  esAdmin,
  pendientes,
  decididas,
}: {
  canEdit: boolean;
  esAdmin: boolean;
  pendientes: VersionItem[];
  decididas: VersionItem[];
}) {
  return (
    <main className="page">
      <h6 style={{ color: "var(--color-accent)" }}>Revisión de renders</h6>
      <h2 style={{ margin: 0 }}>{pendientes.length} en espera de aprobación</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
        {pendientes.length === 0 && <p className="text-muted">No hay renders pendientes de revisión.</p>}
        {pendientes.map((v) => (
          <TarjetaPendiente key={v.id} v={v} canEdit={canEdit} esAdmin={esAdmin} />
        ))}
      </div>

      <h6 className="text-muted" style={{ marginTop: 32 }}>
        Historial de decisiones
      </h6>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Espacio</th>
              <th>Versión</th>
              <th>Estado</th>
              <th>Decidido por</th>
              <th>Cuándo</th>
              <th>Comentario</th>
              {esAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {decididas.map((v) => (
              <FilaDecidida key={v.id} v={v} esAdmin={esAdmin} />
            ))}
            {decididas.length === 0 && (
              <tr>
                <td colSpan={esAdmin ? 7 : 6} className="text-muted">
                  Todavía no hay decisiones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
