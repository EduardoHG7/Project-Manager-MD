"use client";

import { useMemo, useState, useTransition } from "react";
import {
  crearInvitado,
  actualizarInvitado,
  eliminarInvitado,
  eliminarInvitadosMasivo,
  asignarEtapaInvitadosMasivo,
  crearEtapaInvitado,
  eliminarEtapaInvitado,
} from "@/lib/actions";
import { ImportarExcel } from "./ImportarExcel";

type Etapa = { id: string; nombre: string };
type Invitado = {
  id: string;
  nombre: string;
  empresa: string | null;
  telefono: string | null;
  correo: string | null;
  notas: string | null;
  etapaId: string | null;
};

const CAMPOS_VACIOS = { nombre: "", empresa: "", telefono: "", correo: "", notas: "" };

export function InvitadosClient({
  eventoId,
  canEdit,
  esAdmin,
  etapas,
  invitados,
}: {
  eventoId: string;
  canEdit: boolean;
  esAdmin: boolean;
  etapas: Etapa[];
  invitados: Invitado[];
}) {
  const [filas, setFilas] = useState(invitados);
  const [etapasState, setEtapasState] = useState(etapas);
  const [isPending, startTransition] = useTransition();

  const [filtroEtapa, setFiltroEtapa] = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const [formAbierto, setFormAbierto] = useState(false);
  const [campos, setCampos] = useState(CAMPOS_VACIOS);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPendingForm, startFormTransition] = useTransition();

  const [nuevaEtapaAbierta, setNuevaEtapaAbierta] = useState(false);
  const [nombreEtapa, setNombreEtapa] = useState("");
  const [etapaError, setEtapaError] = useState<string | null>(null);
  const [isPendingEtapa, startEtapaTransition] = useTransition();

  const [supervisorMasivo, setSupervisorMasivo] = useState("");
  const [errorMasivo, setErrorMasivo] = useState<string | null>(null);
  const [isPendingMasivo, startMasivoTransition] = useTransition();

  const visibles = useMemo(
    () => (filtroEtapa === null ? filas : filas.filter((f) => f.etapaId === filtroEtapa)),
    [filas, filtroEtapa]
  );

  function actualizarLocal(id: string, cambios: Partial<Invitado>) {
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, ...cambios } : f)));
  }

  function guardarCampo(invitado: Invitado, cambios: Partial<Invitado>) {
    actualizarLocal(invitado.id, cambios);
    startTransition(() => actualizarInvitado(invitado.id, cambios));
  }

  function eliminarUno(invitado: Invitado) {
    if (!confirm(`¿Eliminar a ${invitado.nombre}?`)) return;
    startTransition(async () => {
      await eliminarInvitado(invitado.id);
      setFilas((prev) => prev.filter((f) => f.id !== invitado.id));
      setSeleccionados((prev) => {
        const next = new Set(prev);
        next.delete(invitado.id);
        return next;
      });
    });
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
    setSeleccionados((prev) => (prev.size === visibles.length ? new Set() : new Set(visibles.map((f) => f.id))));
  }

  function agregarInvitado() {
    setFormError(null);
    if (!campos.nombre.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    startFormTransition(async () => {
      try {
        const nuevo = await crearInvitado(eventoId, campos);
        setFilas((prev) => [
          {
            id: nuevo.id,
            nombre: nuevo.nombre,
            empresa: nuevo.empresa,
            telefono: nuevo.telefono,
            correo: nuevo.correo,
            notas: nuevo.notas,
            etapaId: nuevo.etapaId,
          },
          ...prev,
        ]);
        setCampos(CAMPOS_VACIOS);
        setFormAbierto(false);
      } catch (err: any) {
        setFormError(err?.message || "No se pudo agregar el invitado.");
      }
    });
  }

  function crearEtapa() {
    setEtapaError(null);
    const n = nombreEtapa.trim();
    if (!n) return;
    startEtapaTransition(async () => {
      try {
        const creada = await crearEtapaInvitado(eventoId, n);
        setEtapasState((prev) => [...prev, { id: creada.id, nombre: creada.nombre }]);
        setNombreEtapa("");
        setNuevaEtapaAbierta(false);
      } catch (err: any) {
        setEtapaError(err?.message || "No se pudo crear la etapa.");
      }
    });
  }

  function borrarEtapa(etapa: Etapa) {
    if (!confirm(`¿Eliminar la etapa "${etapa.nombre}"? Los invitados en esta etapa quedarán sin etapa.`)) return;
    startEtapaTransition(async () => {
      await eliminarEtapaInvitado(etapa.id);
      setEtapasState((prev) => prev.filter((e) => e.id !== etapa.id));
      setFilas((prev) => prev.map((f) => (f.etapaId === etapa.id ? { ...f, etapaId: null } : f)));
      if (filtroEtapa === etapa.id) setFiltroEtapa(null);
    });
  }

  function aplicarEtapaMasiva() {
    setErrorMasivo(null);
    const ids = Array.from(seleccionados);
    const etapaId = supervisorMasivo || null;
    startMasivoTransition(async () => {
      try {
        await asignarEtapaInvitadosMasivo(ids, etapaId);
        setFilas((prev) => prev.map((f) => (seleccionados.has(f.id) ? { ...f, etapaId } : f)));
        setSeleccionados(new Set());
        setSupervisorMasivo("");
      } catch (err: any) {
        setErrorMasivo(err?.message || "No se pudo asignar la etapa.");
      }
    });
  }

  function eliminarSeleccionados() {
    const ids = Array.from(seleccionados);
    if (ids.length === 0) return;
    if (!confirm(`¿Eliminar los ${ids.length} invitados seleccionados?`)) return;
    startMasivoTransition(async () => {
      await eliminarInvitadosMasivo(ids);
      setFilas((prev) => prev.filter((f) => !seleccionados.has(f.id)));
      setSeleccionados(new Set());
    });
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className={`btn ${filtroEtapa === null ? "btn-primary" : "btn-secondary"}`} onClick={() => setFiltroEtapa(null)}>
          Todos ({filas.length})
        </button>
        {etapasState.map((et) => (
          <div key={et.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <button
              className={`btn ${filtroEtapa === et.id ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFiltroEtapa(et.id)}
            >
              {et.nombre} ({filas.filter((f) => f.etapaId === et.id).length})
            </button>
            {esAdmin && (
              <button className="btn-ghost" style={{ fontSize: 11 }} disabled={isPendingEtapa} onClick={() => borrarEtapa(et)}>
                ×
              </button>
            )}
          </div>
        ))}
        {canEdit &&
          (nuevaEtapaAbierta ? (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                className="input"
                autoFocus
                style={{ width: 160 }}
                placeholder="Nombre de la etapa"
                value={nombreEtapa}
                disabled={isPendingEtapa}
                onChange={(e) => setNombreEtapa(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") crearEtapa();
                }}
              />
              <button className="btn btn-secondary" disabled={isPendingEtapa} onClick={crearEtapa}>
                Crear
              </button>
              <button
                className="btn-ghost"
                disabled={isPendingEtapa}
                onClick={() => {
                  setNuevaEtapaAbierta(false);
                  setNombreEtapa("");
                  setEtapaError(null);
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button className="btn-ghost" onClick={() => setNuevaEtapaAbierta(true)}>
              + Nueva etapa
            </button>
          ))}
      </div>
      {etapaError && <p className="error-text" style={{ fontSize: 12, marginTop: 4 }}>{etapaError}</p>}

      {canEdit && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn btn-primary" onClick={() => setFormAbierto((v) => !v)}>
            {formAbierto ? "Cancelar" : "+ Agregar invitado"}
          </button>
          <ImportarExcel
            eventoId={eventoId}
            onImported={(resultado) => {
              setFilas((prev) => [
                ...resultado.invitados.map((n) => ({
                  id: n.id,
                  nombre: n.nombre,
                  empresa: n.empresa,
                  telefono: n.telefono,
                  correo: n.correo,
                  notas: n.notas,
                  etapaId: n.etapaId,
                })),
                ...prev,
              ]);
              setEtapasState((prev) => {
                const existentes = new Set(prev.map((e) => e.id));
                return [...prev, ...resultado.etapas.filter((e) => !existentes.has(e.id))];
              });
            }}
          />
        </div>
      )}

      {formAbierto && (
        <div className="card elev-sm" style={{ marginTop: 10, maxWidth: 560 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Nombre</label>
              <input className="input" value={campos.nombre} onChange={(e) => setCampos({ ...campos, nombre: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Empresa</label>
              <input className="input" value={campos.empresa} onChange={(e) => setCampos({ ...campos, empresa: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Teléfono</label>
              <input className="input" value={campos.telefono} onChange={(e) => setCampos({ ...campos, telefono: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Correo</label>
              <input className="input" value={campos.correo} onChange={(e) => setCampos({ ...campos, correo: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Notas</label>
            <textarea className="input" value={campos.notas} onChange={(e) => setCampos({ ...campos, notas: e.target.value })} />
          </div>
          {formError && <p className="error-text">{formError}</p>}
          <button className="btn btn-primary" disabled={isPendingForm} onClick={agregarInvitado}>
            {isPendingForm ? "Agregando…" : "Agregar"}
          </button>
        </div>
      )}

      {canEdit && seleccionados.size > 0 && (
        <div className="card elev-sm" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 13 }}>{seleccionados.size} seleccionados</strong>
          <select
            className="input"
            style={{ maxWidth: 220 }}
            value={supervisorMasivo}
            disabled={isPendingMasivo}
            onChange={(e) => setSupervisorMasivo(e.target.value)}
          >
            <option value="">— Quitar etapa —</option>
            {etapasState.map((et) => (
              <option key={et.id} value={et.id}>
                {et.nombre}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" disabled={isPendingMasivo} onClick={aplicarEtapaMasiva}>
            {isPendingMasivo ? "Asignando…" : "Asignar etapa"}
          </button>
          <button className="btn-ghost" disabled={isPendingMasivo} onClick={eliminarSeleccionados} style={{ color: "var(--color-accent)" }}>
            Eliminar seleccionados
          </button>
          <button className="btn-ghost" disabled={isPendingMasivo} onClick={() => setSeleccionados(new Set())}>
            Cancelar
          </button>
          {errorMasivo && <p className="error-text" style={{ fontSize: 12, margin: 0 }}>{errorMasivo}</p>}
        </div>
      )}

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              {canEdit && (
                <th style={{ width: 28 }}>
                  <input
                    type="checkbox"
                    checked={visibles.length > 0 && seleccionados.size === visibles.length}
                    onChange={toggleSeleccionTodos}
                  />
                </th>
              )}
              <th>Nombre</th>
              <th>Empresa</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Notas</th>
              <th>Etapa</th>
              {canEdit && <th></th>}
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={f.id}>
                {canEdit && (
                  <td>
                    <input type="checkbox" checked={seleccionados.has(f.id)} onChange={() => toggleSeleccion(f.id)} />
                  </td>
                )}
                <td>
                  {canEdit ? (
                    <input
                      className="input"
                      style={{ minWidth: 140 }}
                      defaultValue={f.nombre}
                      disabled={isPending}
                      onBlur={(e) => {
                        if (e.target.value !== f.nombre) guardarCampo(f, { nombre: e.target.value });
                      }}
                    />
                  ) : (
                    f.nombre
                  )}
                </td>
                <td>
                  {canEdit ? (
                    <input
                      className="input"
                      style={{ minWidth: 130 }}
                      defaultValue={f.empresa || ""}
                      disabled={isPending}
                      onBlur={(e) => {
                        if (e.target.value !== (f.empresa || "")) guardarCampo(f, { empresa: e.target.value });
                      }}
                    />
                  ) : (
                    f.empresa || "—"
                  )}
                </td>
                <td>
                  {canEdit ? (
                    <input
                      className="input"
                      style={{ width: 110 }}
                      defaultValue={f.telefono || ""}
                      disabled={isPending}
                      onBlur={(e) => {
                        if (e.target.value !== (f.telefono || "")) guardarCampo(f, { telefono: e.target.value });
                      }}
                    />
                  ) : (
                    f.telefono || "—"
                  )}
                </td>
                <td>
                  {canEdit ? (
                    <input
                      className="input"
                      style={{ minWidth: 150 }}
                      defaultValue={f.correo || ""}
                      disabled={isPending}
                      onBlur={(e) => {
                        if (e.target.value !== (f.correo || "")) guardarCampo(f, { correo: e.target.value });
                      }}
                    />
                  ) : f.correo ? (
                    <a href={`mailto:${f.correo}`}>{f.correo}</a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {canEdit ? (
                    <input
                      className="input"
                      style={{ minWidth: 160 }}
                      defaultValue={f.notas || ""}
                      disabled={isPending}
                      onBlur={(e) => {
                        if (e.target.value !== (f.notas || "")) guardarCampo(f, { notas: e.target.value });
                      }}
                    />
                  ) : (
                    <span className="text-muted">{f.notas || "—"}</span>
                  )}
                </td>
                <td>
                  {canEdit ? (
                    <select
                      className="input"
                      style={{ minWidth: 140 }}
                      value={f.etapaId || ""}
                      disabled={isPending}
                      onChange={(e) => guardarCampo(f, { etapaId: e.target.value || null })}
                    >
                      <option value="">— Sin etapa —</option>
                      {etapasState.map((et) => (
                        <option key={et.id} value={et.id}>
                          {et.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="pill pill-soft">{etapasState.find((et) => et.id === f.etapaId)?.nombre || "Sin etapa"}</span>
                  )}
                </td>
                {canEdit && (
                  <td>
                    <button className="btn-ghost" disabled={isPending} onClick={() => eliminarUno(f)} style={{ color: "var(--color-accent)" }}>
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 8 : 6} className="text-muted">
                  {filas.length === 0 ? "Todavía no hay invitados registrados." : "Ningún invitado en esta etapa."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
