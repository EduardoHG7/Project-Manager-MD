"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { actualizarEspacioAdmin, actualizarEstadoEspacio, asignarSupervisorEspacio, asignarSupervisorMasivo } from "@/lib/actions";
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
  supervisorId: string | null;
  tieneDesviacion: boolean;
  usuario: { id: string; email: string; activo: boolean } | null;
};

type Opcion = { id: string; nombre: string };

export function DirectorioClient({
  canEdit,
  espacios,
  distribuidores,
  proveedores,
  supervisores,
}: {
  canEdit: boolean;
  espacios: Espacio[];
  distribuidores: Opcion[];
  proveedores: Opcion[];
  supervisores: Opcion[];
}) {
  const [filas, setFilas] = useState(espacios);
  const [isPending, startTransition] = useTransition();

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [supervisorMasivo, setSupervisorMasivo] = useState("");
  const [isPendingMasivo, startMasivoTransition] = useTransition();
  const [errorMasivo, setErrorMasivo] = useState<string | null>(null);

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

  function guardarSupervisor(espacio: Espacio, supervisorId: string | null) {
    actualizarLocal(espacio.id, { supervisorId });
    startTransition(() => asignarSupervisorEspacio(espacio.id, supervisorId));
  }

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSeleccionTodos() {
    setSeleccionados((prev) => (prev.size === filas.length ? new Set() : new Set(filas.map((f) => f.id))));
  }

  function aplicarSupervisorMasivo() {
    setErrorMasivo(null);
    const ids = Array.from(seleccionados);
    const supervisorId = supervisorMasivo || null;
    startMasivoTransition(async () => {
      try {
        await asignarSupervisorMasivo(ids, supervisorId);
        setFilas((prev) => prev.map((f) => (seleccionados.has(f.id) ? { ...f, supervisorId } : f)));
        setSeleccionados(new Set());
        setSupervisorMasivo("");
      } catch (err: any) {
        setErrorMasivo(err?.message || "No se pudo asignar el supervisor.");
      }
    });
  }

  return (
    <div style={{ marginTop: 16 }}>
      {canEdit && seleccionados.size > 0 && (
        <div className="card elev-sm" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 13 }}>{seleccionados.size} seleccionados</strong>
          <select
            className="input"
            style={{ maxWidth: 220 }}
            value={supervisorMasivo}
            disabled={isPendingMasivo}
            onChange={(e) => setSupervisorMasivo(e.target.value)}
          >
            <option value="">— Quitar asignación —</option>
            {supervisores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" disabled={isPendingMasivo} onClick={aplicarSupervisorMasivo}>
            {isPendingMasivo ? "Asignando…" : "Asignar supervisor"}
          </button>
          <button className="btn-ghost" disabled={isPendingMasivo} onClick={() => setSeleccionados(new Set())}>
            Cancelar
          </button>
          {errorMasivo && <p className="error-text" style={{ fontSize: 12, margin: 0 }}>{errorMasivo}</p>}
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {canEdit && (
                <th style={{ width: 28 }}>
                  <input
                    type="checkbox"
                    checked={filas.length > 0 && seleccionados.size === filas.length}
                    onChange={toggleSeleccionTodos}
                  />
                </th>
              )}
              <th>#</th>
              <th>Expositor</th>
              <th>Grupo / representante</th>
              <th>Medidas</th>
              <th>m²</th>
              <th>Proveedor de stand</th>
              <th>Estado</th>
              <th>Supervisor</th>
              {canEdit && <th>Acceso expositor</th>}
            </tr>
          </thead>
          <tbody>
            {filas.map((e) => (
              <tr key={e.id}>
                {canEdit && (
                  <td>
                    <input type="checkbox" checked={seleccionados.has(e.id)} onChange={() => toggleSeleccion(e.id)} />
                  </td>
                )}
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
                <td>
                  {canEdit ? (
                    <select
                      className="input"
                      style={{ minWidth: 130 }}
                      value={e.supervisorId || ""}
                      disabled={isPending}
                      onChange={(ev) => guardarSupervisor(e, ev.target.value || null)}
                    >
                      <option value="">— Sin asignar —</option>
                      {supervisores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-muted">{supervisores.find((s) => s.id === e.supervisorId)?.nombre || "—"}</span>
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
    </div>
  );
}
