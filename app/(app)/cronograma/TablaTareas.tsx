"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  crearTareaProyecto,
  actualizarTareaProyecto,
  eliminarTareaProyecto,
  eliminarTareasProyectoMasivo,
  crearResponsable,
} from "@/lib/actions-cronograma";
import { TAREA_ESTADO_LABEL, TAREA_ESTADO_PILL, fmtFecha } from "@/lib/estados";

type Categoria = { id: string; nombre: string; orden: number };
type Responsable = { id: string; nombre: string; iniciales: string | null; area: string | null; usuarioId: string | null };
type Tarea = {
  id: string;
  categoriaId: string;
  responsableId: string | null;
  nombre: string;
  fechaInicio: string;
  duracionDias: number;
  fechaFin: string;
  progreso: number;
  estado: string;
  esHito: boolean;
  observaciones: string | null;
};

const NUEVO_RESPONSABLE = "__nuevo__";
const CAMPOS_VACIOS = {
  nombre: "",
  categoriaId: "",
  responsableId: "",
  fechaInicio: "",
  duracionDias: "5",
  esHito: false,
  observaciones: "",
};

type SortKey = "nombre" | "categoria" | "responsable" | "fechaInicio" | "fechaFin" | "progreso" | "estado";

export function TablaTareas({
  eventoId,
  canEdit,
  miResponsableId,
  categorias,
  responsables,
  tareas,
  onTareaCreada,
  onTareaActualizada,
  onTareasEliminadas,
  onResponsableCreado,
}: {
  eventoId: string;
  canEdit: boolean;
  miResponsableId: string | null;
  categorias: Categoria[];
  responsables: Responsable[];
  tareas: Tarea[];
  onTareaCreada: (t: Tarea) => void;
  onTareaActualizada: (id: string, cambios: Partial<Tarea>) => void;
  onTareasEliminadas: (ids: string[]) => void;
  onResponsableCreado: (r: Responsable) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [filtroResponsableId, setFiltroResponsableId] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("fechaInicio");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [isPendingEliminar, startEliminarTransition] = useTransition();

  const [formAbierto, setFormAbierto] = useState(false);
  const [campos, setCampos] = useState(CAMPOS_VACIOS);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPendingForm, startFormTransition] = useTransition();

  const [creandoResponsableEn, setCreandoResponsableEn] = useState<"form" | string | null>(null);
  const [nombreResponsableNuevo, setNombreResponsableNuevo] = useState("");
  const [isPendingResponsable, startResponsableTransition] = useTransition();

  const nombreCategoria = (id: string) => categorias.find((c) => c.id === id)?.nombre || "—";
  const nombreResponsable = (id: string | null) => (id ? responsables.find((r) => r.id === id)?.nombre || "—" : "—");

  const visibles = useMemo(() => {
    let filas = tareas;
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      filas = filas.filter((t) => t.nombre.toLowerCase().includes(q));
    }
    if (filtroResponsableId) filas = filas.filter((t) => t.responsableId === filtroResponsableId);
    if (filtroEstado) filas = filas.filter((t) => t.estado === filtroEstado);

    const dir = sortDir === "asc" ? 1 : -1;
    const valor = (t: Tarea): string | number => {
      switch (sortKey) {
        case "nombre":
          return t.nombre.toLowerCase();
        case "categoria":
          return nombreCategoria(t.categoriaId).toLowerCase();
        case "responsable":
          return nombreResponsable(t.responsableId).toLowerCase();
        case "fechaInicio":
          return t.fechaInicio;
        case "fechaFin":
          return t.fechaFin;
        case "progreso":
          return t.progreso;
        case "estado":
          return t.estado;
      }
    };
    return [...filas].sort((a, b) => {
      const va = valor(a);
      const vb = valor(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareas, busqueda, filtroResponsableId, filtroEstado, sortKey, sortDir, categorias, responsables]);

  function ordenarPor(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function puedeEditarTarea(t: Tarea) {
    return canEdit || (!!miResponsableId && t.responsableId === miResponsableId);
  }

  function guardarCampo(tarea: Tarea, cambios: Record<string, any>) {
    onTareaActualizada(tarea.id, cambios as Partial<Tarea>);
    startTransition(async () => {
      try {
        await actualizarTareaProyecto(tarea.id, cambios);
      } catch {
        // revertir si el servidor rechazó el cambio (ej. permiso insuficiente)
        onTareaActualizada(tarea.id, tarea);
      }
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
    setSeleccionados((prev) => (prev.size === visibles.length ? new Set() : new Set(visibles.map((t) => t.id))));
  }

  function eliminarUna(tarea: Tarea) {
    if (!confirm(`¿Eliminar la tarea "${tarea.nombre}"?`)) return;
    startEliminarTransition(async () => {
      await eliminarTareaProyecto(tarea.id);
      onTareasEliminadas([tarea.id]);
      setSeleccionados((prev) => {
        const next = new Set(prev);
        next.delete(tarea.id);
        return next;
      });
    });
  }

  function eliminarSeleccionadas() {
    const ids = Array.from(seleccionados);
    if (ids.length === 0) return;
    if (!confirm(`¿Eliminar las ${ids.length} tareas seleccionadas?`)) return;
    startEliminarTransition(async () => {
      await eliminarTareasProyectoMasivo(ids);
      onTareasEliminadas(ids);
      setSeleccionados(new Set());
    });
  }

  function crearResponsableInline(destino: "form" | string, nombre: string) {
    const n = nombre.trim();
    if (!n) return;
    startResponsableTransition(async () => {
      try {
        const creado = await crearResponsable(eventoId, { nombre: n });
        onResponsableCreado({ id: creado.id, nombre: creado.nombre, iniciales: creado.iniciales, area: creado.area, usuarioId: creado.usuarioId });
        if (destino === "form") setCampos((c) => ({ ...c, responsableId: creado.id }));
        else guardarCampo(tareas.find((t) => t.id === destino)!, { responsableId: creado.id });
        setCreandoResponsableEn(null);
        setNombreResponsableNuevo("");
      } catch {
        // silencioso: si falla, el select vuelve a "— Sin asignar —" en el próximo render
      }
    });
  }

  function agregarTarea() {
    setFormError(null);
    if (!campos.nombre.trim()) return setFormError("El nombre es obligatorio.");
    if (!campos.categoriaId) return setFormError("La categoría es obligatoria.");
    if (!campos.fechaInicio) return setFormError("La fecha de inicio es obligatoria.");
    startFormTransition(async () => {
      try {
        const nuevo = await crearTareaProyecto(eventoId, {
          categoriaId: campos.categoriaId,
          responsableId: campos.responsableId || null,
          nombre: campos.nombre,
          fechaInicio: campos.fechaInicio,
          duracionDias: Number(campos.duracionDias) || 1,
          esHito: campos.esHito,
          observaciones: campos.observaciones || null,
        });
        onTareaCreada({
          id: nuevo.id,
          categoriaId: nuevo.categoriaId,
          responsableId: nuevo.responsableId,
          nombre: nuevo.nombre,
          fechaInicio: new Date(nuevo.fechaInicio).toISOString().slice(0, 10),
          duracionDias: nuevo.duracionDias,
          fechaFin: new Date(nuevo.fechaFin).toISOString().slice(0, 10),
          progreso: nuevo.progreso,
          estado: nuevo.estado,
          esHito: nuevo.esHito,
          observaciones: nuevo.observaciones,
        });
        setCampos(CAMPOS_VACIOS);
        setFormAbierto(false);
      } catch (err: any) {
        setFormError(err?.message || "No se pudo agregar la tarea.");
      }
    });
  }

  function ThOrdenable({ label, sortk }: { label: string; sortk: SortKey }) {
    return (
      <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => ordenarPor(sortk)}>
        {label} {sortKey === sortk ? (sortDir === "asc" ? "▲" : "▼") : ""}
      </th>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="input"
          style={{ maxWidth: 220 }}
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select className="input" style={{ maxWidth: 180 }} value={filtroResponsableId} onChange={(e) => setFiltroResponsableId(e.target.value)}>
          <option value="">— Todos los responsables —</option>
          {responsables.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
        <select className="input" style={{ maxWidth: 180 }} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">— Todos los estados —</option>
          {Object.entries(TAREA_ESTADO_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setFormAbierto((v) => !v)}>
            {formAbierto ? "Cancelar" : "+ Agregar tarea"}
          </button>
        )}
      </div>

      {formAbierto && (
        <div className="card elev-sm" style={{ marginTop: 10, maxWidth: 640 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="field" style={{ flex: 2 }}>
              <label>Nombre</label>
              <input className="input" value={campos.nombre} onChange={(e) => setCampos({ ...campos, nombre: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Categoría</label>
              <select className="input" value={campos.categoriaId} onChange={(e) => setCampos({ ...campos, categoriaId: e.target.value })}>
                <option value="">— Elegir —</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Responsable</label>
              {creandoResponsableEn === "form" ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    className="input"
                    autoFocus
                    placeholder="Nombre del responsable"
                    value={nombreResponsableNuevo}
                    disabled={isPendingResponsable}
                    onChange={(e) => setNombreResponsableNuevo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") crearResponsableInline("form", nombreResponsableNuevo);
                    }}
                  />
                  <button className="btn btn-secondary" disabled={isPendingResponsable} onClick={() => crearResponsableInline("form", nombreResponsableNuevo)}>
                    Crear
                  </button>
                  <button className="btn-ghost" disabled={isPendingResponsable} onClick={() => setCreandoResponsableEn(null)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <select
                  className="input"
                  value={campos.responsableId}
                  onChange={(e) => {
                    if (e.target.value === NUEVO_RESPONSABLE) setCreandoResponsableEn("form");
                    else setCampos({ ...campos, responsableId: e.target.value });
                  }}
                >
                  <option value="">— Sin asignar —</option>
                  {responsables.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                  <option value={NUEVO_RESPONSABLE}>+ Nuevo responsable…</option>
                </select>
              )}
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Fecha de inicio</label>
              <input
                className="input"
                type="date"
                value={campos.fechaInicio}
                onChange={(e) => setCampos({ ...campos, fechaInicio: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Duración (días)</label>
              <input
                className="input"
                type="number"
                min={1}
                value={campos.duracionDias}
                onChange={(e) => setCampos({ ...campos, duracionDias: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>Observaciones</label>
            <textarea className="input" value={campos.observaciones} onChange={(e) => setCampos({ ...campos, observaciones: e.target.value })} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={campos.esHito} onChange={(e) => setCampos({ ...campos, esHito: e.target.checked })} />
            Es un hito
          </label>
          {formError && <p className="error-text">{formError}</p>}
          <button className="btn btn-primary" disabled={isPendingForm} onClick={agregarTarea}>
            {isPendingForm ? "Agregando…" : "Agregar"}
          </button>
        </div>
      )}

      {canEdit && seleccionados.size > 0 && (
        <div className="card elev-sm" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 13 }}>{seleccionados.size} seleccionadas</strong>
          <button className="btn-ghost" disabled={isPendingEliminar} onClick={eliminarSeleccionadas} style={{ color: "var(--color-accent)" }}>
            {isPendingEliminar ? "Eliminando…" : "Eliminar seleccionadas"}
          </button>
          <button className="btn-ghost" disabled={isPendingEliminar} onClick={() => setSeleccionados(new Set())}>
            Cancelar
          </button>
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
              <ThOrdenable label="Categoría" sortk="categoria" />
              <ThOrdenable label="Tarea" sortk="nombre" />
              <ThOrdenable label="Responsable" sortk="responsable" />
              <ThOrdenable label="Inicio" sortk="fechaInicio" />
              <th>Duración</th>
              <ThOrdenable label="Fin" sortk="fechaFin" />
              <ThOrdenable label="%" sortk="progreso" />
              <ThOrdenable label="Estado" sortk="estado" />
              <th>Observaciones</th>
              {canEdit && <th></th>}
            </tr>
          </thead>
          <tbody>
            {visibles.map((t) => {
              const editable = puedeEditarTarea(t);
              const soloProgresoYObs = editable && !canEdit;
              return (
                <tr key={t.id}>
                  {canEdit && (
                    <td>
                      <input type="checkbox" checked={seleccionados.has(t.id)} onChange={() => toggleSeleccion(t.id)} />
                    </td>
                  )}
                  <td>
                    {canEdit ? (
                      <select
                        className="input"
                        style={{ minWidth: 130 }}
                        value={t.categoriaId}
                        disabled={isPending}
                        onChange={(e) => guardarCampo(t, { categoriaId: e.target.value })}
                      >
                        {categorias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      nombreCategoria(t.categoriaId)
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      <input
                        className="input"
                        style={{ minWidth: 160 }}
                        defaultValue={t.nombre}
                        disabled={isPending}
                        onBlur={(e) => {
                          if (e.target.value !== t.nombre) guardarCampo(t, { nombre: e.target.value });
                        }}
                      />
                    ) : (
                      <>
                        {t.nombre} {t.esHito && <span className="pill pill-soft">Hito</span>}
                      </>
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      creandoResponsableEn === t.id ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <input
                            className="input"
                            autoFocus
                            style={{ minWidth: 100 }}
                            placeholder="Nombre"
                            value={nombreResponsableNuevo}
                            disabled={isPendingResponsable}
                            onChange={(e) => setNombreResponsableNuevo(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") crearResponsableInline(t.id, nombreResponsableNuevo);
                            }}
                          />
                          <button className="btn btn-secondary" disabled={isPendingResponsable} onClick={() => crearResponsableInline(t.id, nombreResponsableNuevo)}>
                            Crear
                          </button>
                        </div>
                      ) : (
                        <select
                          className="input"
                          style={{ minWidth: 130 }}
                          value={t.responsableId || ""}
                          disabled={isPending}
                          onChange={(e) => {
                            if (e.target.value === NUEVO_RESPONSABLE) setCreandoResponsableEn(t.id);
                            else guardarCampo(t, { responsableId: e.target.value || null });
                          }}
                        >
                          <option value="">— Sin asignar —</option>
                          {responsables.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}
                            </option>
                          ))}
                          <option value={NUEVO_RESPONSABLE}>+ Nuevo responsable…</option>
                        </select>
                      )
                    ) : (
                      nombreResponsable(t.responsableId)
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      <input
                        className="input"
                        type="date"
                        style={{ minWidth: 130 }}
                        defaultValue={t.fechaInicio}
                        disabled={isPending}
                        onBlur={(e) => {
                          if (e.target.value !== t.fechaInicio) guardarCampo(t, { fechaInicio: e.target.value });
                        }}
                      />
                    ) : (
                      fmtFecha(t.fechaInicio)
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      <input
                        className="input"
                        type="number"
                        min={1}
                        style={{ width: 70 }}
                        defaultValue={t.duracionDias}
                        disabled={isPending}
                        onBlur={(e) => {
                          const v = Number(e.target.value) || 1;
                          if (v !== t.duracionDias) guardarCampo(t, { duracionDias: v });
                        }}
                      />
                    ) : (
                      `${t.duracionDias} d`
                    )}
                  </td>
                  <td className="text-muted">{fmtFecha(t.fechaFin)}</td>
                  <td>
                    {editable ? (
                      <input
                        className="input"
                        type="number"
                        min={0}
                        max={100}
                        style={{ width: 60 }}
                        defaultValue={t.progreso}
                        disabled={isPending}
                        onBlur={(e) => {
                          const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                          if (v !== t.progreso) guardarCampo(t, { progreso: v });
                        }}
                      />
                    ) : (
                      `${t.progreso}%`
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      <select
                        className="input"
                        style={{ minWidth: 130 }}
                        value={t.estado}
                        disabled={isPending}
                        onChange={(e) => guardarCampo(t, { estado: e.target.value })}
                      >
                        {Object.entries(TAREA_ESTADO_LABEL).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`pill ${TAREA_ESTADO_PILL[t.estado]}`}>{TAREA_ESTADO_LABEL[t.estado] || t.estado}</span>
                    )}
                  </td>
                  <td>
                    {editable ? (
                      <input
                        className="input"
                        style={{ minWidth: 150 }}
                        defaultValue={t.observaciones || ""}
                        disabled={isPending}
                        onBlur={(e) => {
                          if (e.target.value !== (t.observaciones || "")) guardarCampo(t, { observaciones: e.target.value });
                        }}
                      />
                    ) : (
                      <span className="text-muted">{t.observaciones || "—"}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td>
                      <button className="btn-ghost" disabled={isPendingEliminar} onClick={() => eliminarUna(t)} style={{ color: "var(--color-accent)" }}>
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 11 : 9} className="text-muted">
                  {tareas.length === 0 ? "Todavía no hay tareas registradas." : "Ninguna tarea coincide con el filtro."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
