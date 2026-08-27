"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { actualizarEspacioAdmin, actualizarEstadoEspacio } from "@/lib/actions";
import { ESTADOS, ESTADO_LABEL, ESTADO_PILL } from "@/lib/estados";
import { AccesoExpositor } from "./AccesoExpositor";

type Espacio = {
  id: string;
  numero: string;
  nombre: string;
  categoria: string;
  medidas: string | null;
  areaM2: number | null;
  alturaMaxCm: number;
  estado: string;
  distribuidorId: string | null;
  proveedorId: string | null;
  tieneDesviacion: boolean;
  usuario: { id: string; email: string; activo: boolean } | null;
};

type Opcion = { id: string; nombre: string };

export function DirectorioClient({
  canEdit,
  espacios,
  distribuidores,
  proveedores,
}: {
  canEdit: boolean;
  espacios: Espacio[];
  distribuidores: Opcion[];
  proveedores: Opcion[];
}) {
  const [filas, setFilas] = useState(espacios);
  const [isPending, startTransition] = useTransition();

  function actualizarLocal(id: string, cambios: Partial<Espacio>) {
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, ...cambios } : f)));
  }

  function guardarCampo(espacio: Espacio, cambios: Partial<Espacio>) {
    actualizarLocal(espacio.id, cambios);
    const actualizado = { ...espacio, ...cambios };
    startTransition(() =>
      actualizarEspacioAdmin(espacio.id, {
        numero: actualizado.numero,
        nombre: actualizado.nombre,
        categoria: actualizado.categoria,
        medidas: actualizado.medidas || undefined,
        areaM2: actualizado.areaM2 ?? undefined,
        alturaMaxCm: actualizado.alturaMaxCm,
        distribuidorId: actualizado.distribuidorId || undefined,
        proveedorId: actualizado.proveedorId || undefined,
      })
    );
  }

  function guardarEstado(espacio: Espacio, estado: string) {
    actualizarLocal(espacio.id, { estado });
    startTransition(() => actualizarEstadoEspacio(espacio.id, estado));
  }

  return (
    <div className="table-wrap" style={{ marginTop: 16 }}>
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Expositor</th>
            <th>Grupo / representante</th>
            <th>Medidas</th>
            <th>m²</th>
            <th>Proveedor de stand</th>
            <th>Estado</th>
            {canEdit && <th>Acceso expositor</th>}
          </tr>
        </thead>
        <tbody>
          {filas.map((e) => (
            <tr key={e.id}>
              <td style={{ fontWeight: 700 }}>{e.numero}</td>
              <td>
                {canEdit ? (
                  <input
                    className="input"
                    style={{ minWidth: 140 }}
                    defaultValue={e.nombre}
                    disabled={isPending}
                    onBlur={(ev) => {
                      if (ev.target.value !== e.nombre) guardarCampo(e, { nombre: ev.target.value });
                    }}
                  />
                ) : (
                  <Link href={`/espacios/${encodeURIComponent(e.numero)}`} style={{ color: "inherit" }}>
                    {e.nombre}
                  </Link>
                )}
              </td>
              <td>
                {canEdit ? (
                  <select
                    className="input"
                    style={{ minWidth: 140 }}
                    value={e.distribuidorId || ""}
                    disabled={isPending}
                    onChange={(ev) => guardarCampo(e, { distribuidorId: ev.target.value || null })}
                  >
                    <option value="">— Sin asignar —</option>
                    {distribuidores.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-muted">{distribuidores.find((d) => d.id === e.distribuidorId)?.nombre || "—"}</span>
                )}
              </td>
              <td>
                {canEdit ? (
                  <input
                    className="input"
                    style={{ width: 90 }}
                    defaultValue={e.medidas || ""}
                    disabled={isPending}
                    onBlur={(ev) => {
                      if (ev.target.value !== (e.medidas || "")) guardarCampo(e, { medidas: ev.target.value });
                    }}
                  />
                ) : (
                  e.medidas || "—"
                )}
              </td>
              <td>
                {canEdit ? (
                  <input
                    className="input"
                    style={{ width: 70 }}
                    type="number"
                    defaultValue={e.areaM2 ?? ""}
                    disabled={isPending}
                    onBlur={(ev) => {
                      const v = ev.target.value ? Number(ev.target.value) : null;
                      if (v !== e.areaM2) guardarCampo(e, { areaM2: v });
                    }}
                  />
                ) : (
                  e.areaM2 ?? "—"
                )}
              </td>
              <td>
                {canEdit ? (
                  <select
                    className="input"
                    style={{ minWidth: 140 }}
                    value={e.proveedorId || ""}
                    disabled={isPending}
                    onChange={(ev) => guardarCampo(e, { proveedorId: ev.target.value || null })}
                  >
                    <option value="">— Sin asignar —</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  proveedores.find((p) => p.id === e.proveedorId)?.nombre || "—"
                )}
              </td>
              <td>
                {canEdit ? (
                  <select
                    className="input"
                    style={{ minWidth: 130 }}
                    value={e.estado}
                    disabled={isPending}
                    onChange={(ev) => guardarEstado(e, ev.target.value)}
                  >
                    {ESTADOS.map((k) => (
                      <option key={k} value={k}>
                        {ESTADO_LABEL[k]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`pill ${e.tieneDesviacion ? "pill-red" : ESTADO_PILL[e.estado]}`}>
                    {e.tieneDesviacion ? "Desviación" : ESTADO_LABEL[e.estado]}
                  </span>
                )}
              </td>
              {canEdit && (
                <td>
                  <AccesoExpositor espacioId={e.id} usuario={e.usuario} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
