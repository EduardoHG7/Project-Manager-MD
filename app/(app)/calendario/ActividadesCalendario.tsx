"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearActividad, actualizarActividad, eliminarActividad } from "@/lib/actions";

type Actividad = {
  id: string;
  titulo: string;
  fecha: string; // ISO yyyy-mm-dd
  hora: string | null;
  tipo: string;
  descripcion: string | null;
  creadoPorNombre: string | null;
  color: string;
};

const CAMPOS_VACIOS = { titulo: "", fecha: "", hora: "", tipo: "REUNION", descripcion: "" };

function fmtFechaCorta(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
}

export function ActividadesCalendario({ eventoId, canEdit, actividades }: { eventoId: string; canEdit: boolean; actividades: Actividad[] }) {
  const router = useRouter();
  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [campos, setCampos] = useState(CAMPOS_VACIOS);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hoy = new Date().toISOString().slice(0, 10);
  const ordenadas = [...actividades].sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || "")));

  function abrirNuevo() {
    setEditandoId(null);
    setCampos(CAMPOS_VACIOS);
    setFormAbierto(true);
    setError(null);
  }

  function abrirEdicion(a: Actividad) {
    setEditandoId(a.id);
    setCampos({ titulo: a.titulo, fecha: a.fecha, hora: a.hora || "", tipo: a.tipo, descripcion: a.descripcion || "" });
    setFormAbierto(true);
    setError(null);
  }

  function guardar() {
    setError(null);
    startTransition(async () => {
      try {
        if (editandoId) {
          await actualizarActividad(editandoId, campos);
        } else {
          await crearActividad(eventoId, campos);
        }
        setFormAbierto(false);
        setEditandoId(null);
        setCampos(CAMPOS_VACIOS);
        router.refresh();
      } catch (err: any) {
        setError(err?.message || "No se pudo guardar.");
      }
    });
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar esta actividad?")) return;
    startTransition(async () => {
      await eliminarActividad(id);
      router.refresh();
    });
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h6 className="text-muted" style={{ margin: 0 }}>
          Reuniones y otras actividades
        </h6>
        {canEdit && !formAbierto && (
          <button className="btn btn-secondary" onClick={abrirNuevo}>
            + Agregar
          </button>
        )}
      </div>

      {formAbierto && (
        <div className="card elev-sm" style={{ marginTop: 10, maxWidth: 520 }}>
          <div className="field">
            <label>Título</label>
            <input
              className="input"
              value={campos.titulo}
              onChange={(e) => setCampos({ ...campos, titulo: e.target.value })}
              placeholder="Reunión con el cliente X, corte eléctrico, etc."
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Fecha</label>
              <input
                className="input"
                type="date"
                value={campos.fecha}
                onChange={(e) => setCampos({ ...campos, fecha: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Hora (opcional)</label>
              <input
                className="input"
                type="time"
                value={campos.hora}
                onChange={(e) => setCampos({ ...campos, hora: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Tipo</label>
              <select className="input" value={campos.tipo} onChange={(e) => setCampos({ ...campos, tipo: e.target.value })}>
                <option value="REUNION">Reunión</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Notas (opcional)</label>
            <textarea
              className="input"
              value={campos.descripcion}
              onChange={(e) => setCampos({ ...campos, descripcion: e.target.value })}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" disabled={isPending} onClick={guardar}>
              {isPending ? "Guardando…" : editandoId ? "Guardar cambios" : "Agregar"}
            </button>
            <button
              className="btn btn-secondary"
              disabled={isPending}
              onClick={() => {
                setFormAbierto(false);
                setEditandoId(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {ordenadas.length === 0 ? (
        <p className="text-muted" style={{ marginTop: 12 }}>Aún no hay reuniones ni actividades registradas.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {ordenadas.map((a) => {
            const pasada = a.fecha < hoy;
            return (
              <div
                key={a.id}
                className="card"
                style={{
                  opacity: pasada ? 0.6 : 1,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "flex-start",
                  borderLeft: `4px solid ${a.color}`,
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`pill ${a.tipo === "OTRO" ? "pill-ghost" : "pill-soft"}`}>
                      {a.tipo === "OTRO" ? "Otro" : "Reunión"}
                    </span>
                    <strong style={{ fontSize: 13.5 }}>{a.titulo}</strong>
                  </div>
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {fmtFechaCorta(a.fecha)}
                    {a.hora && ` · ${a.hora}`}
                    {pasada && " · ya pasó"}
                  </div>
                  {a.descripcion && <p style={{ margin: "6px 0 0", fontSize: 13 }}>{a.descripcion}</p>}
                  {a.creadoPorNombre && (
                    <span className="text-muted" style={{ fontSize: 11 }}>
                      Agendado por {a.creadoPorNombre}
                    </span>
                  )}
                </div>
                {canEdit && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => abrirEdicion(a)}>
                      Editar
                    </button>
                    <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => eliminar(a.id)}>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
